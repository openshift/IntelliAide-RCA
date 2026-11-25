import { useEffect, useState } from 'react';
import { X, ArrowRight, Layers, Info } from 'lucide-react';
import {
  TIER_INTRO_STEPS,
  TIER_LABELS,
  type RcaStageId,
} from '@/content/rcaStages';

type Stage = RcaStageId;

const TIER_STEPS = TIER_INTRO_STEPS;

interface TierIntroModalProps {
  sessionId: string | null;
  page: 'detailed' | 'summary';
  currentStage: Stage;
  onGoToFeedback?: () => void;
}

function introStorageKey(sessionId: string, page: string, stage: Stage) {
  return `rca-tier-intro-seen-${sessionId}-${page}-${stage}`;
}

export default function TierIntroModal({
  sessionId,
  page,
  currentStage,
  onGoToFeedback,
}: TierIntroModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const key = introStorageKey(sessionId, page, currentStage);
    setOpen(!localStorage.getItem(key));
  }, [sessionId, page, currentStage]);

  const close = () => {
    if (sessionId) {
      localStorage.setItem(introStorageKey(sessionId, page, currentStage), 'true');
    }
    setOpen(false);
  };

  const handleGoToFeedback = () => {
    close();
    onGoToFeedback?.();
  };

  if (!open) return null;

  const currentTierLabel = TIER_LABELS[currentStage];
  const currentTierIdx = currentStage === 'Final' ? 2 : currentStage === 'Tier_2' ? 1 : 0;
  const isIntermediate = currentStage !== 'Final';
  const nextTier = TIER_STEPS[currentTierIdx + 1] ?? null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">3-Tier Progressive Analysis</p>
                <h2 className="text-lg font-bold mt-0.5">You are viewing {currentTierLabel}</h2>
              </div>
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isIntermediate ? (
            <div className="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">This is an intermediate RCA</p>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                  The report below is based on <strong>{currentTierLabel}</strong> analysis only.
                  It may not include all root causes yet. You can request a deeper investigation
                  {nextTier ? <> by moving to <strong>{nextTier.label}</strong></> : ''} with your feedback.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <Info className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900">This is the final RCA</p>
                <p className="text-sm text-green-800 mt-1 leading-relaxed">
                  All three analysis tiers have been completed. This is the most comprehensive
                  root cause analysis available for this session.
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Analysis progress</p>
            <div className="flex items-center gap-1">
              {TIER_STEPS.map((step, i) => {
                const done = i < currentTierIdx || (i === currentTierIdx && currentStage === 'Final');
                const isCurrent = i === currentTierIdx;
                return (
                  <div key={step.key} className="flex items-center gap-1">
                    {i > 0 && (
                      <div className={`w-6 h-0.5 ${done || isCurrent ? 'bg-blue-300' : 'bg-slate-200'}`} />
                    )}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold
                        ${done ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {done ? '✓' : i + 1}
                      </span>
                      <span className={`text-[10px] font-medium ${isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isIntermediate && (
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
              <li>Review the {currentTierLabel} report below.</li>
              <li>
                Scroll to the <strong>feedback section at the end</strong> of the report.
              </li>
              <li>
                Click <strong>Move to {nextTier?.label}</strong> and describe what to investigate further.
              </li>
              <li>Or accept the {currentTierLabel} results if the analysis is sufficient.</li>
            </ol>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={close}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600
                       hover:bg-slate-200 transition-colors"
          >
            Got it
          </button>
          {isIntermediate && onGoToFeedback && (
            <button
              onClick={handleGoToFeedback}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium
                         text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to feedback section
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
