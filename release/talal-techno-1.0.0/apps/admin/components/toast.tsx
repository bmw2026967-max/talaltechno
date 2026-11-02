'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icons';

type Tone = 'success' | 'error' | 'info' | 'warning';
type ToastItem = { id: number; message: string; tone: Tone };

const ToastContext = React.createContext<{
  toast: (message: string, tone?: Tone) => void;
}>({ toast: () => undefined });

export function useToast() {
  return React.useContext(ToastContext);
}

const tones: Record<Tone, string> = {
  success: 'border-emerald-500/30 bg-emerald-950/95 text-emerald-50',
  error: 'border-red-500/30 bg-red-950/95 text-red-50',
  info: 'border-sky-500/30 bg-sky-950/95 text-sky-50',
  warning: 'border-amber-500/30 bg-amber-950/95 text-amber-50'
};

const toneIcons: Record<Tone, 'check' | 'alert' | 'sparkles' | 'shield'> = {
  success: 'check',
  error: 'alert',
  info: 'sparkles',
  warning: 'shield'
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: Tone = 'success') => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl animate-fade-up',
              tones[item.tone]
            )}
          >
            <Icon name={toneIcons[item.tone]} size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 leading-6">{item.message}</p>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="rounded-full p-1 opacity-70 transition hover:opacity-100"
              aria-label="إغلاق التنبيه"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
