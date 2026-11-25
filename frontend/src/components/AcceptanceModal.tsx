import { useState, useEffect, useMemo } from 'react';
import {
  getLegalDocumentContent,
  postAcceptance,
  type RequiredAcceptanceDocument,
} from '../services/api';

interface AcceptanceModalProps {
  documentVersion: string;
  effectiveDate: string;
  instanceName?: string;
  requiredDocuments?: RequiredAcceptanceDocument[];
  onAccepted: () => void;
}

/** One attestation checkbox per wizard step (steps 0..n-1). Last step adds remainder + master. */
const STEP_ATTESTATIONS = [
  [{ id: 'authorized', label: 'I am authorized to submit the diagnostic data I provide' }],
  [{ id: 'review', label: 'I will review and verify all AI-generated output before acting on it' }],
  [
    { id: 'sovereign', label: 'I will not submit data I am prohibited from sharing with the configured LLM provider' },
    { id: 'exports', label: 'I will handle exports (PDF, ZIP, etc.) per my organization\'s data-classification policies' },
  ],
] as const;

type StepAttestId = 'authorized' | 'review' | 'sovereign' | 'exports';

function docCheckboxLabel(doc: RequiredAcceptanceDocument): string {
  return `I have read and understand the ${doc.title} (v${doc.document_version})`;
}

export default function AcceptanceModal({
  documentVersion,
  effectiveDate,
  instanceName,
  requiredDocuments = [],
  onAccepted,
}: AcceptanceModalProps) {
  const docs = useMemo(() => {
    if (requiredDocuments.length > 0) return requiredDocuments;
    return [
      {
        id: 'ai_usage_notice',
        title: 'AI Usage Notice',
        document_version: documentVersion,
        effective_date: effectiveDate,
        url_path: '/instance/notice-document',
      },
    ];
  }, [requiredDocuments, documentVersion, effectiveDate]);

  const [step, setStep] = useState(0);
  const [docHtml, setDocHtml] = useState<string>('');
  const [docLoadError, setDocLoadError] = useState('');
  const [docLoading, setDocLoading] = useState(true);
  const [docReadChecked, setDocReadChecked] = useState(false);
  const [stepAttest, setStepAttest] = useState<Record<StepAttestId, boolean>>({
    authorized: false,
    review: false,
    sovereign: false,
    exports: false,
  });
  const [masterChecked, setMasterChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentDoc = docs[step];
  const isLastStep = step === docs.length - 1;

  const stepAttestations = useMemo(() => {
    if (isLastStep) {
      if (docs.length >= 3) return [...STEP_ATTESTATIONS[2]];
      if (docs.length === 2) return [...STEP_ATTESTATIONS[1], ...STEP_ATTESTATIONS[2]];
      return [
        ...STEP_ATTESTATIONS[0],
        ...STEP_ATTESTATIONS[1],
        ...STEP_ATTESTATIONS[2],
      ];
    }
    const group = STEP_ATTESTATIONS[step];
    return group ? [...group] : [...STEP_ATTESTATIONS[0]];
  }, [step, isLastStep, docs.length]);

  useEffect(() => {
    setDocReadChecked(false);
    setMasterChecked(false);
    setDocLoading(true);
    setDocLoadError('');
    let cancelled = false;
    (async () => {
      try {
        const data = await getLegalDocumentContent(currentDoc.id);
        if (!cancelled) setDocHtml(data.html);
      } catch (err) {
        if (!cancelled) {
          setDocLoadError(err instanceof Error ? err.message : 'Could not load document');
          setDocHtml('');
        }
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentDoc.id]);

  const stepAttestOk = stepAttestations.every(a => stepAttest[a.id as StepAttestId]);
  const canContinue = docReadChecked && stepAttestOk && !docLoading && !docLoadError;
  const canSubmit = isLastStep && canContinue && masterChecked;

  const handleContinue = () => {
    if (!canContinue) return;
    setStep(s => s + 1);
  };

  const handleAccept = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await postAcceptance(documentVersion);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Acceptance failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight">IntelliAide — Legal review</h1>
          <p className="mt-1 text-red-100 text-sm">
            {instanceName && <span className="block font-medium">{instanceName}</span>}
            Document {step + 1} of {docs.length} · Bundle version {documentVersion}
            {effectiveDate && <> · Effective {effectiveDate}</>}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 pb-32">
        <h2 className="text-lg font-semibold text-brand-dark mb-1">{currentDoc.title}</h2>
        <p className="text-sm text-slate-500 mb-6">
          Scroll through the full document below before acknowledging.
        </p>

        {docLoading && (
          <p className="text-slate-500 text-sm py-12 text-center">Loading document…</p>
        )}
        {docLoadError && (
          <p className="text-red-600 text-sm py-4">{docLoadError}</p>
        )}
        {!docLoading && !docLoadError && (
          <article
            className="legal-document-prose bg-white border border-slate-200 rounded-xl px-8 py-8 shadow-sm"
            dangerouslySetInnerHTML={{ __html: docHtml }}
          />
        )}

        <div className="mt-10 space-y-4 border-t border-slate-200 pt-8">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={docReadChecked}
              disabled={docLoading || !!docLoadError}
              onChange={() => setDocReadChecked(v => !v)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-slate-800 font-medium">{docCheckboxLabel(currentDoc)}</span>
          </label>

          {stepAttestations.map(({ id, label }) => (
            <label key={id} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={stepAttest[id as StepAttestId]}
                onChange={() =>
                  setStepAttest(prev => ({ ...prev, [id]: !prev[id as StepAttestId] }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}

          {isLastStep && (
            <label className="flex items-start gap-3 cursor-pointer group pt-2">
              <input
                type="checkbox"
                checked={masterChecked}
                disabled={!canContinue}
                onChange={() => setMasterChecked(v => !v)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:opacity-40"
              />
              <span className={`text-sm font-semibold ${canContinue ? 'text-slate-800' : 'text-slate-400'}`}>
                I have read and agree to all documents and attestations in this acceptance flow
              </span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-end gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
            >
              Back
            </button>
          )}
          {!isLastStep ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-40"
            >
              Continue to next document
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAccept}
              disabled={!canSubmit || submitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'I Accept — finish'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
