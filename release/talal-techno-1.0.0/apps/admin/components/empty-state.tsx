import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';

export function EmptyState({
  icon = 'sparkles',
  title,
  description,
  action
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        {description ? <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
