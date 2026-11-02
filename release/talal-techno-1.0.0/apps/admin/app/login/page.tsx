'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLockup, BrandMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { clearSession, login, setUser } from '@/lib/api';
import { useToast } from '@/components/toast';

const features = [
  { icon: 'sales' as const, title: 'نقطة بيع أوفلاين أولاً', text: 'بيع في أقل من 3 لمسات مع مزامنة تلقائية عند عودة الشبكة.' },
  { icon: 'inventory' as const, title: 'مخزون بوصفات BOM', text: 'خصم المواد الخام تلقائياً، هوالك، تحويلات، وتنبيهات نقص.' },
  { icon: 'zatca' as const, title: 'ZATCA Sandbox', text: 'UBL 2.1، QR، وسلسلة تجزئة — بدون أي ادعاء باعتماد رسمي.' },
  { icon: 'integrations' as const, title: 'تكاملات جاهزة للمحاكاة', text: 'مدى، Apple Pay، HungerStation، Jahez، وطباعة حرارية Mock.' }
];

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password);
      toast(`أهلاً ${result.user && (result.user as { name?: string }).name ? (result.user as { name?: string }).name : ''} — تم الاتصال بالـ API.`);
      router.push('/');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? `${reason.message} — تأكد من تشغيل الـ API أو استخدم العرض التجريبي.`
          : 'تعذر تسجيل الدخول.'
      );
    } finally {
      setLoading(false);
    }
  };

  const enterDemo = () => {
    clearSession();
    setUser({
      id: 'demo',
      name: 'زائر العرض',
      email: 'demo@talaltechno.dev',
      role: 'demo',
      branch: { name: 'الفرع الرئيسي — العليا' },
      tenant: { name: 'مطعم طلال تكنو' }
    });
    router.push('/');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[#07241b] p-10 text-[#f4efe3] lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #C9A227 0, transparent 28%), radial-gradient(circle at 80% 70%, #1f8a63 0, transparent 34%), linear-gradient(120deg, transparent 40%, rgba(201,162,39,.35) 41%, transparent 42%)'
          }}
        />
        <div className="relative">
          <BrandLockup />
          <div className="mt-16 max-w-xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-brand-gold">
              CLOUD ERP + POS · SAUDI RESTAURANTS
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.25] tracking-tight">
              إدارة مطعمك بالعربي،
              <br />
              من أول طلب إلى القيد المحاسبي.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/65">
              منصة مفتوحة المصدر تجمع نقطة البيع، المطبخ، المخزون، المحاسبة، الولاء، والتكاملات في نظام واحد — مع
              إمكانية العمل دون إنترنت.
            </p>
          </div>
        </div>

        <div className="relative mt-12 grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gold/15 text-brand-gold">
                <Icon name={feature.icon} size={18} />
              </span>
              <p className="mt-3 text-sm font-bold">{feature.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-white/55">{feature.text}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-10 flex items-center gap-2 text-[10px] text-white/40">
          <BrandMark size={22} />
          TALAL TECHNO © 2026 · AGPL-3.0 · Sandbox / Mock integrations only
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandLockup />
            <span className="text-[10px] font-semibold text-muted-foreground">ERP + POS</span>
          </div>

          <div className="talal-card p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-gold">تسجيل الدخول</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">مرحباً بعودتك</h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              ادخل بحساب المنشأة للاتصال بالـ API، أو استكشف لوحة التحكم ببيانات تجريبية كاملة.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@talaltechno.dev"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[11px] leading-5 text-red-700 dark:text-red-300">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <Icon name="refresh" size={17} className="animate-spin" /> : <Icon name="logout" size={17} className="rotate-180" />}
                {loading ? 'جارٍ التحقق…' : 'دخول بالـ API'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              أو
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="gold" size="lg" className="w-full" onClick={enterDemo}>
              <Icon name="sparkles" size={17} />
              دخول العرض التجريبي
            </Button>

            <div className="mt-5 rounded-xl border border-dashed bg-muted/30 p-3 text-[10px] leading-5 text-muted-foreground">
              <p className="font-bold text-foreground">بيانات التهيئة التجريبية</p>
              <p dir="ltr" className="mt-1 text-left font-mono">admin@talaltechno.dev · Talal@1234</p>
              <p>تعمل فقط بعد تشغيل PostgreSQL وتنفيذ أمر التهيئة. لا تُستخدم في الإنتاج.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={enterDemo}
            className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <Icon name="arrow-left" size={13} />
            تخطي الدخول واستخدام بيانات العرض
          </button>
        </div>
      </section>
    </div>
  );
}
