'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLockup, BrandMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { allNavItems, navGroups } from '@/lib/nav';
import { clearSession, getUser, TOKEN_KEY } from '@/lib/api';
import { cn } from '@/lib/utils';

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
  branch?: { name?: string } | null;
  tenant?: { name?: string } | null;
};

const roleLabels: Record<string, string> = {
  OWNER: 'مالك',
  ADMIN: 'مدير النظام',
  MANAGER: 'مدير',
  CASHIER: 'كاشير',
  WAITER: 'نادل',
  KITCHEN: 'مطبخ',
  ACCOUNTANT: 'محاسب',
  DELIVERY_MANAGER: 'مدير توصيل',
  demo: 'عرض تجريبي'
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] || '').join('') || 'TT';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [demo, setDemo] = React.useState(true);

  React.useEffect(() => {
    setUser(getUser<SessionUser>());
    try {
      setDemo(!window.localStorage.getItem(TOKEN_KEY));
    } catch {
      setDemo(true);
    }
  }, []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = allNavItems.find((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)));
  const name = user?.name || 'زائر العرض';
  const role = roleLabels[String(user?.role || 'demo').toUpperCase()] || user?.role || 'عرض تجريبي';
  const branchName = user?.branch?.name || 'الفرع الرئيسي — العليا';

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#07241b] text-[#f4efe3]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-5">
        <Link href="/" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-gold">
          <BrandLockup />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 lg:hidden"
          aria-label="إغلاق القائمة"
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-brand-gold/25 bg-brand-gold/10 px-3.5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-brand-gold">
          <Icon name="branch" size={14} />
          الفرع الحالي
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-white/90">{branchName}</p>
        <p className="mt-0.5 text-[10px] text-white/50">الرياض · Asia/Riyadh · SAR</p>
      </div>

      <nav className="scrollbar-thin mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="القائمة الرئيسية">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                      active
                        ? 'bg-white/12 text-white shadow-inner'
                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
                        active ? 'bg-brand-gold text-[#10251c]' : 'bg-white/5 text-white/60 group-hover:text-white'
                      )}
                    >
                      <Icon name={item.icon} size={17} />
                    </span>
                    <span className="truncate">{item.label}</span>
                    {active ? <span className="mr-auto h-1.5 w-1.5 rounded-full bg-brand-gold" /> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gold text-sm font-extrabold text-[#10251c]">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{name}</p>
            <p className="truncate text-[10px] text-white/50">{role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 px-1 text-[10px] leading-4 text-white/40">
          <Icon name="shield" size={12} />
          نسخة Sandbox — لا تمثل اعتماداً رسمياً.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[268px] lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-[286px] max-w-[86vw] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:mr-[268px]">
        <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-card text-muted-foreground lg:hidden"
                aria-label="فتح القائمة"
              >
                <Icon name="menu" size={19} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{current?.label || 'لوحة التحكم'}</p>
                <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                  طلال تكنو · ERP + POS · نسخة 1.0.0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {demo ? (
                <Badge variant="gold" className="hidden sm:inline-flex">
                  <Icon name="sparkles" size={12} />
                  وضع العرض
                </Badge>
              ) : (
                <Badge variant="success" className="hidden sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  متصل
                </Badge>
              )}
              <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground md:flex">
                <Icon name="branch" size={13} />
                {branchName}
              </div>
              <ThemeToggle />
              <div className="hidden items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2 sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
                  {initials(name)}
                </span>
                <div className="max-w-[110px] leading-tight">
                  <p className="truncate text-[11px] font-bold">{name}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{role}</p>
                </div>
              </div>
              {demo ? (
                <Button variant="outline" size="sm" onClick={() => router.push('/login')} className="hidden lg:inline-flex">
                  <Icon name="logout" size={14} />
                  دخول API
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج">
                  <Icon name="logout" size={17} />
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>

        <footer className="mx-auto flex w-full max-w-[1500px] flex-col gap-2 border-t px-4 py-5 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-1.5">
            <BrandMark size={18} />
            طلال تكنو © 2026 — رخصة AGPL-3.0
          </span>
          <span>بيانات تجريبية / Sandbox. ZATCA والمدفوعات والتوصيل محاكاة وليست معتمدة رسمياً.</span>
        </footer>
      </div>
    </div>
  );
}
