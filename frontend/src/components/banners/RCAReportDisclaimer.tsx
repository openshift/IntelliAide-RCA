import { Sparkles } from 'lucide-react';
import { RCA_AI_DISCLAIMER } from '@/content/notices';

export { RCA_AI_DISCLAIMER };

export default function RCAReportDisclaimer() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <p>{RCA_AI_DISCLAIMER}</p>
    </div>
  );
}
