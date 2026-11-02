'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLockup, BrandMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { clearSession, login, setUser, setup, setupStatus, type SetupPayload } from '@/lib/api';
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
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [initialized, setInitialized] = useState<boolean | null>(null);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // setup fields
  const [sTenantName, setSTenantName] = useState('');
  const [sTenantSlug, setSTenantSlug] = useState('');
  const [sOwnerName, setSOwnerName] = useState('');
  const [sOwnerEmail, setSOwnerEmail] = useState('');
  const [sOwnerPassword, setSOwnerPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    setupStatus()
      .then((r) => {
        setInitialized(r.data.initialized);
        if (!r.data.initialized) setMode('setup');
      })
      .catch(() => setInitialized(null));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(email, password, tenantSlug.trim() || undefined);
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

  const submitSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSetupLoading(true);
    setSetupError(null);
    try {
      const payload: SetupPayload = {
        tenantName: sTenantName,
        tenantSlug: sTenantSlug.trim().toLowerCase(),
        ownerName: sOwnerName,
        ownerEmail: sOwnerEmail,
        ownerPassword: sOwnerPassword
      };
      await setup(payload);
      toast('تم إنشاء المنشأة. سجّل الدخول الآن.');
      // prefill login
      setTenantSlug(payload.tenantSlug);
      setEmail(payload.ownerEmail);
      setPassword(payload.ownerPassword);
      setMode('login');
      setInitialized(true);
    } catch (reason) {
      setSetupError(reason instanceof Error ? reason.message : 'تعذر إنشاء المنشأة.');
    } finally {
      setSetupLoading(false);
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
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#f4efe3]/75">
              نظام متكامل: نقاط بيع، مخزون بوصفات، شاشة مطبخ، قائمة QR، ولاء، محاسبة، ZATCA Sandbox، وتكاملات توصيل ومدفوعات — Mock.
            </p>
          </div>
        </div>
        <div className="relative grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gold/15 text-brand-gold">
                <Icon name={feature.icon} size={18} />
              </div>
              <p className="text-sm font-bold">{feature.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#f4efe3]/65">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center bg-background p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="text-sm font-extrabold">طلال تكنو</p>
              <p className="text-xs text-muted-foreground">ERP + POS</p>
            </div>
          </div>

          {mode === 'login' ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold">تسجيل الدخول</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {initialized === false
                    ? 'النظام غير مُهيّأ بعد. اضغط "إعداد المنشأة" أدناه.'
                    : 'أدخل بياناتك للوصول إلى لوحة التحكم.'}
                </p>
              </div>

              {initialized === false && (
                <Button type="button" className="mb-4 w-full" onClick={() => setMode('setup')}>
                  <Icon name="settings" size={16} />
                  إعداد المنشأة (أول مرة)
                </Button>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Tenant Slug (رمز المنشأة)</Label>
                  <Input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="talal" dir="ltr" />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" dir="ltr" required />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'جارٍ الدخول...' : 'دخول'}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">أو</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={enterDemo}>
                <Icon name="dashboard" size={16} />
                دخول كزائر (عرض تجريبي)
              </Button>
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                بيئة Sandbox — ZATCA/Mدفوعات/توصيل/طباعة محاكاة.
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold">إعداد المنشأة (أول مرة)</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  أنشئ مطعمك. سيُنشأ حساب المالك و10 طاولات ودليل الحسابات تلقائياً.
                </p>
              </div>
              <form onSubmit={submitSetup} className="space-y-4">
                <div>
                  <Label>اسم المنشأة</Label>
                  <Input value={sTenantName} onChange={(e) => setSTenantName(e.target.value)} placeholder="مطعم طلال" required />
                </div>
                <div>
                  <Label>Tenant Slug (رمز لاتيني)</Label>
                  <Input value={sTenantSlug} onChange={(e) => setSTenantSlug(e.target.value)} placeholder="talal" dir="ltr" required />
                </div>
                <div>
                  <Label>اسم المالك</Label>
                  <Input value={sOwnerName} onChange={(e) => setSOwnerName(e.target.value)} placeholder="أحمد" required />
                </div>
                <div>
                  <Label>بريد المالك (تسجيل الدخول)</Label>
                  <Input type="email" value={sOwnerEmail} onChange={(e) => setSOwnerEmail(e.target.value)} placeholder="owner@example.com" dir="ltr" required />
                </div>
                <div>
                  <Label>كلمة المرور (8+ أحرف)</Label>
                  <Input type="password" value={sOwnerPassword} onChange={(e) => setSOwnerPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {setupError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{setupError}</p>}
                <Button type="submit" className="w-full" disabled={setupLoading}>
                  {setupLoading ? 'جارٍ الإنشاء...' : 'إنشاء المنشأة'}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setMode('login')}>
                  العودة لتسجيل الدخول
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
