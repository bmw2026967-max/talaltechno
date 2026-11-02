'use client';

import { cn } from '@/lib/utils';

export function Segmented<T extends string>({
  value,
  onChange,
  items,
  className
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string; count?: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border bg-muted/50 p-1',
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-xs font-semibold transition',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
