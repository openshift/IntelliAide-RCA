/** AIA-Issue-011: persistent human-in-the-loop notice (text from content/notices.json). */
import { PERSISTENT_AI_NOTICE } from '@/content/notices';

export { PERSISTENT_AI_NOTICE };

export default function PersistentAINoticeBanner() {
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex min-h-8 items-center justify-center
                 border-b border-amber-200 bg-amber-50 px-4 py-1.5
                 text-center text-xs font-medium text-amber-800"
    >
      {PERSISTENT_AI_NOTICE}
    </div>
  );
}
