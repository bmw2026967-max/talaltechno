import { cn } from '@/lib/utils';

export function Progress({
  value,
  max = 100,
  tone = 'green',
  className
}: {
  value: number;
  max?: number;
  tone?: 'green' | 'gold' | 'red' | 'sky';
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const tones = {
    green: 'bg-emerald-500',
    gold: 'bg-brand-gold',
    red: 'bg-red-500',
    sky: 'bg-sky-500'
  };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-all', tones[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}
