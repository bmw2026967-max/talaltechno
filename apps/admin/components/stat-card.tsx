import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

const tones = {
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  gold: 'bg-brand-gold/15 text-[#8a6a0f] dark:text-brand-gold',
  navy: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  red: 'bg-red-500/10 text-red-700 dark:text-red-300',
  muted: 'bg-muted text-muted-foreground'
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'green',
  footer
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: keyof typeof tones;
  footer?: ReactNode;
}) {
  return (
    <div className="talal-card group relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="metric-value mt-2 truncate">{value}</p>
          {hint ? <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', tones[tone])}>
          <Icon name={icon} size={21} />
        </span>
      </div>
      {footer ? <div className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">{footer}</div> : null}
      <span className="pointer-events-none absolute -left-8 -bottom-10 h-24 w-24 rounded-full bg-brand-gold/5 blur-xl transition group-hover:bg-brand-gold/10" />
    </div>
  );
}
