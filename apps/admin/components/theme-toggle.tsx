'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

const KEY = 'talaltechno_theme';

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      window.localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      // Storage can be unavailable in private mode; the class still applies.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
      title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-full border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground',
        className
      )}
    >
      {mounted && dark ? <Icon name="sun" size={18} /> : <Icon name="moon" size={18} />}
    </button>
  );
}
