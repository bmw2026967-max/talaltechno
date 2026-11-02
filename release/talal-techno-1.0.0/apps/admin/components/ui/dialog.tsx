'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md'
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-[#04150f]/65 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border bg-card p-5 shadow-2xl animate-fade-up sm:rounded-3xl sm:p-6',
          widths[size]
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground transition hover:bg-muted"
            aria-label="إغلاق"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
