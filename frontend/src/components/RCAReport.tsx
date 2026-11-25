import { useState, useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, ChevronDown, Calendar, Shield, Loader2, Layers, Package } from 'lucide-react';
import { useAnalysis } from '../contexts/AnalysisContext';
import { useAgentMemory } from '../hooks/useAgentMemory';
import { useEffectiveSession } from '../hooks/useEffectiveSession';
import { getRCAStages, getRCADag, downloadFullBundleZip } from '../services/api';
import { getRcaCache, setRcaStagesCache } from '../services/rcaCache';
import { exportAsPdf, exportAsDoc, exportAsOdt } from '../utils/exportUtils';
import { prepareRcaMarkdownForRender, splitAfterHeading } from '../utils/rcaMarkdown';
import { stripTableSections } from './RCADetailTables';
import RCACausalDagDiagram from './RCACausalDagDiagram';
import TierProgressionPanel from './TierProgressionPanel';
import TierIntroModal from './TierIntroModal';
import { RCAReportDisclaimer } from './banners';
import AIGeneratedBadge from './AIGeneratedBadge';
import type { CausalDag } from '../types';
import { STAGE_TAB_DEFS, type RcaStageId } from '@/content/rcaStages';

/** Strip the legacy plaintext header block written by the orchestrator into rca_summary.txt.
 *  Lines like "ROOT CAUSE ANALYSIS REPORT", "===...===", and "User Reported Issue: …"
 *  followed by a separator are decorative artifacts not needed in the UI. */
function stripLegacyHeader(text: string): string {
  return text
    // Remove "ROOT CAUSE ANALYSIS REPORT (…)" title line
    .replace(/^ROOT CAUSE ANALYSIS REPORT[^\n]*\n/m, '')
    // Remove any line that is purely = signs (80-char separator)
    .replace(/^={20,}\n/gm, '')
    // Remove "User Reported Issue:\n  …\n\n" block (indented, followed by blank line)
    .replace(/^User Reported Issue:\n(?:  [^\n]*\n)*\n?/m, '')
    .trimStart();
}

interface StageEntry { stage: RcaStageId; text: string }

/** Shared ReactMarkdown renderers — hoisted so the report body can be split
 *  into two markdown blocks (before/after the causal DAG diagram) without
 *  duplicating the custom element styling. */
const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-slate-800 mb-6">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-slate-800 mt-10 mb-4 pb-2 border-b border-slate-100">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-800 mt-6 mb-2">{children}</h3>
  ),
  strong: ({ children }) => (
    <strong className="text-brand-red font-semibold">{children}</strong>
  ),
  li: ({ children }) => (
    <li className="text-slate-600 leading-relaxed flex items-start gap-2">
      <span className="text-brand-red mt-1.5 text-xs">●</span>
      <span>{children}</span>
    </li>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 list-none pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-3 list-decimal pl-5">{children}</ol>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
      <table className="w-full text-left text-[12.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 font-semibold text-slate-600 uppercase tracking-wide text-[10.5px] whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-slate-700 leading-relaxed">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      {children}
    </tr>
  ),
};

export default function RCAReport() {
  const { isRunning, startDeepening, sessionId } = useAnalysis();
  const { effectiveSession: reportSession } = useEffectiveSession();
  const { latestSession } = useAgentMemory(isRunning, reportSession);
  const reportSessionRef = useRef(reportSession);
  reportSessionRef.current = reportSession;

  const originalSessionRef = useRef<string | null>(reportSession);
  const cachedStages = getRcaCache(reportSession)?.stages ?? [];
  const [stageReports, setStageReports] = useState<StageEntry[]>(cachedStages);
  const [activeStageIdx, setActiveStageIdx] = useState(
    cachedStages.length > 0 ? cachedStages.length - 1 : 0,
  );
  const [loading, setLoading] = useState(cachedStages.length === 0);
  const [causalDag, setCausalDag] = useState<CausalDag | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [fullBundleDownloading, setFullBundleDownloading] = useState(false);
  const [fullBundleError, setFullBundleError] = useState('');
  const prevRunningRef = useRef(isRunning);
  // Track how many stages were loaded last time so we only auto-advance when
  // a genuinely new deepening stage appears — not on every useAgentMemory refresh.
  const prevStagesCountRef = useRef(0);
  // Keep latestSession accessible in promise callbacks without listing it as a
  // useEffect dependency (which would reset the active tab on every poll).
  const latestSessionRef = useRef(latestSession);
  latestSessionRef.current = latestSession;

  // Fetch all available stage files from the backend.
  const loadStages = (cancelled: { value: boolean }) => {
    const cached = getRcaCache(reportSessionRef.current);
    if (cached?.stages.length) {
      setStageReports(cached.stages);
      if (prevStagesCountRef.current === 0) {
        setActiveStageIdx(cached.stages.length - 1);
      }
      prevStagesCountRef.current = cached.stages.length;
      setLoading(false);
    } else {
      setLoading(true);
    }

    getRCAStages(reportSessionRef.current)
      .then(stages => {
        if (cancelled.value) return;
        const session = latestSessionRef.current;
        if (stages.length > 0) {
          setStageReports(stages);
          setRcaStagesCache(reportSessionRef.current, stages);
          // Auto-advance to the newest stage only when the count has grown.
          // This preserves the user's manually selected tab on re-fetches.
          if (stages.length > prevStagesCountRef.current) {
            setActiveStageIdx(stages.length - 1);
          }
          prevStagesCountRef.current = stages.length;
        } else if (session?.results?.rca_summary) {
          const cleaned = stripLegacyHeader(session.results.rca_summary);
          const fallback = [{ stage: 'Tier_1' as const, text: cleaned }];
          setStageReports(fallback);
          setRcaStagesCache(reportSessionRef.current, fallback);
          if (prevStagesCountRef.current === 0) setActiveStageIdx(0);
          prevStagesCountRef.current = 1;
        } else if (!cached?.stages.length) {
          setStageReports([]);
          prevStagesCountRef.current = 0;
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled.value) return;
        const session = latestSessionRef.current;
        const existingCache = getRcaCache(reportSessionRef.current);
        if (existingCache?.stages.length) {
          setStageReports(existingCache.stages);
          if (prevStagesCountRef.current === 0) {
            setActiveStageIdx(existingCache.stages.length - 1);
          }
          prevStagesCountRef.current = existingCache.stages.length;
        } else if (session?.results?.rca_summary) {
          const fallback = [{ stage: 'Tier_1' as const, text: session.results.rca_summary }];
          setStageReports(fallback);
          setRcaStagesCache(reportSessionRef.current, fallback);
          if (prevStagesCountRef.current === 0) setActiveStageIdx(0);
          prevStagesCountRef.current = 1;
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    prevRunningRef.current = isRunning;

    if (isRunning) {
      setStageReports([]);
      setActiveStageIdx(0);
      prevStagesCountRef.current = 0;
      setLoading(false);
      return;
    }

    const cancelled = { value: false };
    loadStages(cancelled);
    return () => { cancelled.value = true; };
  // latestSession is intentionally read via ref — including it here would cause
  // loadStages to re-run on every useAgentMemory poll and reset the active tab.
  // reportSession is included so switching sessions triggers a refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, reportSession]);

  // Fetch the causal DAG for whichever stage tab is currently active. Best-effort —
  // null just means no diagram section is rendered (older sessions, or generation failure).
  const activeStage = stageReports[activeStageIdx]?.stage;
  useEffect(() => {
    if (isRunning || !activeStage) {
      setCausalDag(null);
      return;
    }
    let cancelled = false;
    getRCADag(activeStage, reportSession).then(dag => {
      if (!cancelled) setCausalDag(dag);
    });
    return () => { cancelled = true; };
  }, [isRunning, activeStage, reportSession]);

  if (isRunning) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-400">
          <Loader2 className="w-16 h-16 mx-auto mb-4 opacity-30 animate-spin text-brand-red" />
          <p className="text-lg font-medium">Analysis in progress</p>
          <p className="text-sm">The RCA report will be available once the analysis is complete.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-400">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-slate-300" />
          <p className="text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (stageReports.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-slate-400">
          <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No RCA report available</p>
          <p className="text-sm">Run an analysis first to generate a Root Cause Analysis report.</p>
        </div>
      </div>
    );
  }

  const activeRcaText = stageReports[activeStageIdx]?.text ?? '';
  const createdDate = latestSession
    ? new Date(latestSession.created_at).toLocaleDateString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'numeric', day: 'numeric', year: 'numeric',
      });

  const strippedRcaText = prepareRcaMarkdownForRender(stripTableSections(activeRcaText));
  const { before: rcaTextBeforeDag, after: rcaTextAfterDag } = splitAfterHeading(strippedRcaText, 'Executive Summary');
  const sessionIdForFeedback = reportSession || sessionId;
  const latestStage = stageReports[stageReports.length - 1]?.stage ?? 'Tier_1';

  const goToFeedback = () => {
    if (activeStageIdx !== stageReports.length - 1) {
      setActiveStageIdx(stageReports.length - 1);
    }
    setTimeout(() => {
      document.getElementById('tier-progression-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const EXPORT_ID = 'rca-export-root';
  const handleExport = (format: 'pdf' | 'doc' | 'odt') => {
    setExportOpen(false);
    const stageName = stageReports[activeStageIdx]?.stage || 'Report';
    if (format === 'pdf') { exportAsPdf(EXPORT_ID); return; }
    if (format === 'doc') { exportAsDoc(EXPORT_ID, `RCA_Report_${stageName}.doc`); return; }
    exportAsOdt(EXPORT_ID, `RCA_Report_${stageName}.odt`);
  };

  const handleFullBundleZip = async () => {
    setExportOpen(false);
    setFullBundleError('');
    if (!sessionIdForFeedback) {
      setFullBundleError('No session is selected. Open this report from the jobs board or add ?session= to the URL.');
      return;
    }
    if (stageReports.length === 0) {
      setFullBundleError('No RCA stages are available to export yet.');
      return;
    }
    setFullBundleDownloading(true);
    try {
      await downloadFullBundleZip(sessionIdForFeedback);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Full bundle download failed';
      setFullBundleError(msg);
      console.error('Full bundle download failed:', err);
    } finally {
      setFullBundleDownloading(false);
    }
  };

  return (
    <div className="space-y-6" id="rca-export-root">
      <TierIntroModal
        sessionId={sessionIdForFeedback}
        page="detailed"
        currentStage={latestStage}
        onGoToFeedback={goToFeedback}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">RCA Detailed Analysis</h1>
            <AIGeneratedBadge />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Calendar className="w-4 h-4" />
            Generated {createdDate}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 no-export">
          {fullBundleError && (
            <p className="text-sm text-red-700 max-w-md text-right" role="alert">
              {fullBundleError}
            </p>
          )}
          <div className="flex items-center gap-2">
          {/* RCA Bundle download — all docs in one ZIP */}
          <button
            onClick={handleFullBundleZip}
            disabled={fullBundleDownloading || !sessionIdForFeedback || stageReports.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-red text-white
                       text-sm font-medium hover:bg-red-700 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {fullBundleDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            {fullBundleDownloading ? 'Building…' : 'RCA Bundle (ZIP)'}
          </button>

          {/* Per-stage export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300
                         text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Stage
              <ChevronDown className="w-4 h-4" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('doc')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as DOC
                </button>
                <button
                  onClick={() => handleExport('odt')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Export as ODT
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      <RCAReportDisclaimer />

      {/* Progress accent */}
      <div className="h-1.5 w-full bg-brand-red rounded-full" />

      {/* Stage switcher — always visible so the current round label is clear */}
      {stageReports.length >= 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-medium">Analysis tiers</span>
          </div>
          {stageReports.map((report, i) => {
            const tab = STAGE_TAB_DEFS.find(t => t.stage === report.stage) ?? STAGE_TAB_DEFS[i];
            return (
              <button
                key={report.stage}
                onClick={() => setActiveStageIdx(i)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium
                            border transition-all duration-200
                            ${activeStageIdx === i
                              ? 'bg-brand-red text-white border-brand-red shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-red/50 hover:text-brand-red'
                            }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                              ${activeStageIdx === i ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  {tab.short}
                </span>
                <span>{tab.round}</span>
                <span className={`text-xs ${activeStageIdx === i ? 'text-white/70' : 'text-slate-400'}`}>
                  · {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8" id="rca-content">
        <div className="prose prose-slate max-w-none
          prose-headings:text-slate-800
          prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
          prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-strong:text-brand-red
          prose-li:text-slate-600
          prose-ul:space-y-1
          prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
            {rcaTextBeforeDag}
          </ReactMarkdown>
        </div>

        {causalDag && <RCACausalDagDiagram dag={causalDag} />}

        {rcaTextAfterDag && (
          <div className="prose prose-slate max-w-none
            prose-headings:text-slate-800
            prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-strong:text-brand-red
            prose-li:text-slate-600
            prose-ul:space-y-1
            prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {rcaTextAfterDag}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Feedback for further analysis — always at end of page */}
      {stageReports.length > 0 && (
        <TierProgressionPanel
          stageReports={stageReports}
          sessionId={sessionIdForFeedback}
          originalSessionId={originalSessionRef.current}
          onDeepeningStarted={startDeepening}
          onStagesReloaded={() => { const c = { value: false }; loadStages(c); }}
        />
      )}
    </div>
  );
}
