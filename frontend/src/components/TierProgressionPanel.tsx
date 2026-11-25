import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Send, ChevronRight, Info, Zap } from 'lucide-react';
import { submitFeedback } from '../services/api';
import { TIER_PROGRESSION_STEPS, type RcaStageId } from '@/content/rcaStages';

type Stage = RcaStageId;
interface StageEntry { stage: Stage; text: string }

interface TierProgressionPanelProps {
  stageReports: StageEntry[];
  sessionId: string | null;
  originalSessionId: string | null;
  onDeepeningStarted: (newSessionId: string) => void;
  onStagesReloaded: () => void;
}

const TIER_STEPS = TIER_PROGRESSION_STEPS;

export default function TierProgressionPanel({
  stageReports,
  sessionId,
  originalSessionId,
  onDeepeningStarted,
  onStagesReloaded,
}: TierProgressionPanelProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAcceptanceFeedback, setShowAcceptanceFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const completedStages = new Set(stageReports.map(r => r.stage));
  const hasFinal = completedStages.has('Final');
  const currentTierIdx = hasFinal ? 2 : completedStages.has('Tier_2') ? 1 : 0;
  const isComplete = hasFinal;

  const nextTier = TIER_STEPS[currentTierIdx + 1] ?? null;
  const currentTier = TIER_STEPS[currentTierIdx];
  const canDeepen = Boolean(nextTier) && stageReports.length < 3;

  const handleStartAcceptance = () => {
    setShowAcceptanceFeedback(true);
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (sessionId) {
        await submitFeedback(sessionId, true, feedbackText);
      }
      setAccepted(true);
      setShowAcceptanceFeedback(false);
      setFeedbackText('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save feedback. Please try again.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDeepening = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (sessionId) {
        const origSid = originalSessionId ?? sessionId;
        const result = await submitFeedback(sessionId, false, feedbackText, origSid);
        if (result?.status === 'deepening' && result.session_id) {
          onDeepeningStarted(result.session_id);
          return;
        }
        onStagesReloaded();
        setFeedbackText('');
        setShowFeedbackForm(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Deepening analysis failed. Please try again.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Acceptance feedback state ── */
  if (showAcceptanceFeedback && !isComplete) {
    return (
      <div id="tier-progression-panel" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-export">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">Accept {currentTier.label} Results</span>
          </div>
          <TierStepper completedStages={completedStages} currentTierIdx={currentTierIdx} />
        </div>

        <div className="px-6 py-5 space-y-4">
          {errorMsg && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              What went well? <span className="text-slate-400 font-normal">(optional)</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Help us understand what the {currentTier.label} analysis got right. This improves our AI.
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={4}
              placeholder={`e.g. "The etcd issue identification was correct. The timeline of events was accurate..."`}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm
                         focus:ring-2 focus:ring-green-300 focus:border-green-400
                         placeholder:text-slate-400 transition-colors resize-y"
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowAcceptanceFeedback(false); setFeedbackText(''); setErrorMsg(null); }}
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600
                         hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                         bg-green-600 text-white hover:bg-green-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {submitting ? 'Accepting…' : `Accept ${currentTier.label} Results`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Complete state ── */
  if (isComplete) {
    return (
      <div id="tier-progression-panel" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-export">
        {/* Stepper header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">All 3 Analysis Tiers Complete</span>
          </div>
          <TierStepper completedStages={completedStages} currentTierIdx={2} />
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-sm text-slate-600">
            All tiers have been processed — this is the final, most comprehensive RCA report.
            {stageReports.length > 1 && ' Use the tier tabs above to compare each analysis round.'}
          </p>
        </div>
      </div>
    );
  }

  /* ── Accepted state ── */
  if (accepted) {
    return (
      <div id="tier-progression-panel" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-export">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">{currentTier.label} Results Accepted</span>
          </div>
          <TierStepper completedStages={completedStages} currentTierIdx={currentTierIdx} />
        </div>
        <div className="px-6 py-5 text-center">
          <p className="text-sm text-slate-500">
            You've accepted the {currentTier.label} analysis. You can still deepen later from the RCA Detailed page.
          </p>
        </div>
      </div>
    );
  }

  /* ── Feedback form state ── */
  if (showFeedbackForm && canDeepen && nextTier) {
    return (
      <div id="tier-progression-panel" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-export">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-800 text-sm">
              Move to {nextTier.label}: {nextTier.subtitle}
            </span>
          </div>
          <TierStepper completedStages={completedStages} currentTierIdx={currentTierIdx} highlightNext />
        </div>

        <div className="px-6 py-5 space-y-4">
          {errorMsg && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              Guide the {nextTier.label} investigation <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Tell the AI what the {currentTier.label} analysis missed, got wrong, or should explore further.
              This feedback directly shapes the {nextTier.label} deep-dive.
            </p>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              rows={4}
              placeholder={`e.g. "The etcd quorum loss on master02 was not addressed. Focus on the etcd operator logs around 14:00-14:30 UTC…"`}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-sm
                         focus:ring-2 focus:ring-blue-300 focus:border-blue-400
                         placeholder:text-slate-400 transition-colors resize-y"
              disabled={submitting}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setShowFeedbackForm(false); setFeedbackText(''); setErrorMsg(null); }}
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600
                         hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitDeepening}
              disabled={submitting || !feedbackText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                         bg-blue-600 text-white hover:bg-blue-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? 'Submitting…' : `Submit & Start ${nextTier.label}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Default: feedback for further analysis ── */
  return (
    <div id="tier-progression-panel" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden no-export">
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/60 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">Feedback for Further Analysis</span>
        </div>
        <p className="text-xs text-amber-700 font-medium mb-3">
          You are on <strong>{currentTier.label}</strong> — this is an intermediate RCA.
          {canDeepen && nextTier && <> Provide feedback below to move to <strong>{nextTier.label}</strong>.</>}
        </p>
        <TierStepper completedStages={completedStages} currentTierIdx={currentTierIdx} highlightNext />
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          IntelliAide runs up to <strong>3 analysis tiers</strong>. Each tier investigates deeper with
          additional files and your feedback.
        </p>
      </div>

      <div className="px-6 py-5">
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleStartAcceptance}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-green-200
                       text-sm font-medium text-green-700 bg-green-50
                       hover:bg-green-100 hover:border-green-300 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Accept {currentTier.label} Results
          </button>
          {canDeepen && nextTier && (
            <button
              onClick={() => setShowFeedbackForm(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg
                         text-sm font-medium text-white
                         bg-gradient-to-r from-blue-600 to-indigo-600
                         hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              Move to {nextTier.label}
              <ChevronRight className="w-4 h-4 -ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Visual tier stepper ── */
function TierStepper({
  completedStages,
  currentTierIdx,
  highlightNext = false,
}: {
  completedStages: Set<Stage>;
  currentTierIdx: number;
  highlightNext?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {TIER_STEPS.map((step, i) => {
        const done = completedStages.has(step.key);
        const isCurrent = i === currentTierIdx;
        const isNext = highlightNext && i === currentTierIdx + 1;

        let dotClass = 'bg-slate-200 text-slate-400';
        let labelClass = 'text-slate-400';
        if (done) { dotClass = 'bg-green-500 text-white'; labelClass = 'text-green-700 font-medium'; }
        else if (isCurrent) { dotClass = 'bg-blue-500 text-white'; labelClass = 'text-blue-700 font-medium'; }
        else if (isNext) { dotClass = 'bg-blue-200 text-blue-600 ring-2 ring-blue-300 ring-offset-1'; labelClass = 'text-blue-600 font-medium'; }

        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-8 h-0.5 mx-0.5 ${done || isCurrent ? 'bg-green-300' : isNext ? 'bg-blue-200' : 'bg-slate-200'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${dotClass}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs whitespace-nowrap ${labelClass}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
