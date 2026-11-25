import { Sparkles } from 'lucide-react';
import { AI_BADGE_LABEL } from '@/content/notices';

export default function AIGeneratedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      bg-purple-100 text-purple-700 text-[10px] font-bold
                      uppercase tracking-wider ${className}`}
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      {AI_BADGE_LABEL}
    </span>
  );
}
