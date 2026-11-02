'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoCoupons, demoCustomers } from '@/lib/demo';
import { apiPost, getToken } from '@/lib/api';
import { formatDate, formatNumber, formatSAR } from '@/lib/utils';

type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  vatNumber?: string | null;
  loyaltyPoints: number;
  tier: string;
  totalSpent: number;
  invoices: number;
  lastPurchaseAt?: string | null;
};

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minSpend: number;
  usageLimit: number;
  used: number;
  active: boolean;
  expiresAt?: string | null;
  remaining?: number;
};

type CustomersResponse = { data: Customer[]; meta?: { total?: number; points?: number } };
type CouponsResponse = { data: Coupon[] };

const tiers = [
  { value: 'bronze', label: 'برونزي', threshold: 0, tone: 'bg-amber-700/10 text-amber-800 dark:text-amber-300', dot: 'bg-amber-700' },
  { value: 'silver', label: 'فضي', threshold: 500, tone: 'bg-slate-500/10 text-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
  { value: 'gold', label: 'ذهبي', threshold: 1500, tone: 'bg-brand-gold/15 text-[#8a6a0f] dark:text-brand-gold', dot: 'bg-brand-gold' },
  { value: 'platinum', label: 'بلاتيني', threshold: 3000, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' }
];

const tierOf = (points: number) => [...tiers].reverse().find((tier) => points >= tier.threshold) || tiers[0];

const emptyCustomer = { name: '', phone: '', vatNumber: '' };
const emptyCoupon = { code: '', type: 'percent', value: '10', minSpend: '0', usageLimit: '100', expiresAt: '' };

export default function LoyaltyPage() {
  const customersApi = useApi<CustomersResponse>('/crm/customers', demoCustomers as unknown as CustomersResponse);
  const couponsApi = useApi<CouponsResponse>('/crm/coupons', demoCoupons as unknown as CouponsResponse);
  const { toast } = useToast();

  const [tab, setTab] = useState<'customers' | 'coupons'>('customers');
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [couponForm, setCouponForm] = useState(emptyCoupon);
  const [points, setPoints] = useState('100');
  const [saving, setSaving] = useState(false);

  useEffect(() => setCustomers(customersApi.data.data || []), [customersApi.data]);
  useEffect(() => setCoupons(couponsApi.data.data || []), [couponsApi.data]);

  const loading = customersApi.loading || couponsApi.loading;
  const source = customersApi.source;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((row) => {
      const tierOk = tierFilter === 'all' || row.tier === tierFilter;
      const text = `${row.name} ${row.phone} ${row.code}`.toLowerCase();
      return tierOk && (!needle || text.includes(needle));
    });
  }, [customers, query, tierFilter]);

  const stats = useMemo(() => {
    const pointsTotal = customers.reduce((total, row) => total + Number(row.loyaltyPoints || 0), 0);
    const spent = customers.reduce((total, row) => total + Number(row.totalSpent || 0), 0);
    const activeCoupons = coupons.filter((row) => row.active).length;
    const redemptions = coupons.reduce((total, row) => total + Number(row.used || 0), 0);
    return { pointsTotal, spent, activeCoupons, redemptions };
  }, [customers, coupons]);

  const refreshAll = () => {
    customersApi.refresh();
    couponsApi.refresh();
  };

  const createCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      toast('أدخل اسم العميل ورقم الجوال.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/crm/customers', {
          name: customerForm.name,
          phone: customerForm.phone,
          vatNumber: customerForm.vatNumber || undefined
        });
        toast('تم إنشاء العميل.');
        setCustomerOpen(false);
        setCustomerForm(emptyCustomer);
        setSaving(false);
        customersApi.refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إنشاء العميل.', 'error');
        setSaving(false);
        return;
      }
    }
    setCustomers((current) => [
      {
        id: `demo-customer-${Date.now()}`,
        code: `C${String(current.length + 1).padStart(3, '0')}`,
        name: customerForm.name,
        phone: customerForm.phone,
        vatNumber: customerForm.vatNumber || null,
        loyaltyPoints: 0,
        tier: 'bronze',
        totalSpent: 0,
        invoices: 0,
        lastPurchaseAt: null
      },
      ...current
    ]);
    toast('تمت إضافة العميل في وضع العرض فقط.', 'success');
    setCustomerOpen(false);
    setCustomerForm(emptyCustomer);
    setSaving(false);
  };

  const createCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(couponForm.value);
    if (!couponForm.code.trim() || !Number.isFinite(value) || value <= 0) {
      toast('أدخل كود قسيمة وقيمة صحيحة.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type,
      value,
      minSpend: Number(couponForm.minSpend || 0),
      usageLimit: Number(couponForm.usageLimit || 1),
      expiresAt: couponForm.expiresAt || undefined
    };
    if (getToken()) {
      try {
        await apiPost('/crm/coupons', payload);
        toast('تم إنشاء القسيمة.');
        setCouponOpen(false);
        setCouponForm(emptyCoupon);
        setSaving(false);
        couponsApi.refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إنشاء القسيمة.', 'error');
        setSaving(false);
        return;
      }
    }
    setCoupons((current) => [
      {
        id: `demo-coupon-${Date.now()}`,
        code: payload.code,
        type: payload.type,
        value: payload.value,
        minSpend: payload.minSpend,
        usageLimit: payload.usageLimit,
        used: 0,
        active: true,
        expiresAt: payload.expiresAt || null,
        remaining: payload.usageLimit
      },
      ...current
    ]);
    toast('تمت إضافة القسيمة في وضع العرض فقط.', 'success');
    setCouponOpen(false);
    setCouponForm(emptyCoupon);
    setSaving(false);
  };

  const adjustPoints = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    const delta = Number(points);
    if (!Number.isFinite(delta) || delta === 0) {
      toast('أدخل عدد نقاط موجباً أو سالباً.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost(`/crm/customers/${selected.id}/loyalty`, { points: delta, reason: 'تعديل يدوي من لوحة التحكم' });
        toast('تم تعديل نقاط الولاء.');
        setSaving(false);
        setSelected(null);
        customersApi.refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تعديل النقاط.', 'error');
        setSaving(false);
        return;
      }
    }
    const nextPoints = Math.max(0, selected.loyaltyPoints + delta);
    const nextTier = tierOf(nextPoints).value;
    setCustomers((current) =>
      current.map((row) =>
        row.id === selected.id ? { ...row, loyaltyPoints: nextPoints, tier: nextTier } : row
      )
    );
    toast(`تم تعديل النقاط بمقدار ${delta} — محاكاة عرض.`, 'success');
    setSaving(false);
    setSelected(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="العملاء والنمو"
        title="الولاء والعروض"
        description="برنامج نقاط، طبقات عضوية، وقسائم خصم. تُحتسب النقاط من الفواتير وتُستبدل عند الدفع — مع محاكاة كاملة في وضع العرض."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={customersApi.error} onRefresh={refreshAll} />
            <Button variant="outline" size="sm" onClick={() => setCouponOpen(true)}>
              <Icon name="loyalty" size={15} />
              قسيمة جديدة
            </Button>
            <Button size="sm" onClick={() => setCustomerOpen(true)}>
              <Icon name="plus" size={15} />
              عميل جديد
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="نقاط الولاء المتاحة" value={formatNumber(stats.pointsTotal)} hint={`${customers.length} عميل مسجل`} icon="loyalty" tone="gold" />
        <StatCard label="إجمالي إنفاق العملاء" value={formatSAR(stats.spent)} hint="عبر كل الفواتير المسجلة" icon="wallet" tone="green" />
        <StatCard label="قسائم نشطة" value={formatNumber(stats.activeCoupons)} hint={`${coupons.length} قسيمة إجمالاً`} icon="sales" tone="navy" />
        <StatCard label="مرات الاستخدام" value={formatNumber(stats.redemptions)} hint="استبدال قسائم تراكمي" icon="trend" tone="green" />
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-4">
        {tiers.map((tier) => {
          const count = customers.filter((row) => row.tier === tier.value).length;
          return (
            <div key={tier.value} className="talal-card flex items-center gap-3 p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tier.tone}`}>
                <Icon name="sparkles" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold">{tier.label}</p>
                <p className="text-[10px] text-muted-foreground">{formatNumber(tier.threshold)}+ نقطة</p>
              </div>
              <span className="text-lg font-extrabold tabular-nums">{formatNumber(count)}</span>
            </div>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{tab === 'customers' ? 'دليل العملاء' : 'القسائم والعروض'}</CardTitle>
            <CardDescription>
              {tab === 'customers' ? 'اختر عميلاً لتعديل نقاطه أو مراجعة إنفاقه.' : 'قسائم نسبة مئوية أو مبلغ ثابت مع حد أدنى للإنفاق.'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {tab === 'customers' ? (
              <>
                <div className="relative">
                  <Icon name="search" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الجوال…" className="h-9 pr-9 text-xs sm:w-56" />
                </div>
                <Select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)} className="h-9 text-xs sm:w-36">
                  <option value="all">كل الطبقات</option>
                  {tiers.map((tier) => (
                    <option key={tier.value} value={tier.value}>{tier.label}</option>
                  ))}
                </Select>
              </>
            ) : null}
            <Segmented
              value={tab}
              onChange={setTab}
              items={[
                { value: 'customers', label: 'العملاء', count: customers.length },
                { value: 'coupons', label: 'القسائم', count: coupons.length }
              ]}
            />
          </div>
        </CardHeader>

        {tab === 'customers' ? (
          <CardContent className="px-0 pb-0">
            {filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="users" title="لا يوجد عملاء مطابقون" description="جرّب تغيير البحث أو إضافة عميل جديد." />
              </div>
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>العميل</TH>
                      <TH>الطبقة</TH>
                      <TH>النقاط</TH>
                      <TH>الإنفاق</TH>
                      <TH>الفواتير</TH>
                      <TH>آخر شراء</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {filtered.map((row) => {
                      const tier = tierOf(row.loyaltyPoints);
                      return (
                        <TR key={row.id}>
                          <TD>
                            <div className="flex items-center gap-2">
                              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-[10px] font-extrabold text-primary">
                                {row.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
                              </span>
                              <div>
                                <p className="text-xs font-bold">{row.name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{row.phone}</p>
                              </div>
                            </div>
                          </TD>
                          <TD>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tier.tone}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                              {tier.label}
                            </span>
                          </TD>
                          <TD className="w-36">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-extrabold tabular-nums">{formatNumber(row.loyaltyPoints)}</span>
                              <span className="text-[9px] text-muted-foreground">نقطة</span>
                            </div>
                            <Progress className="mt-1.5" value={row.loyaltyPoints} max={Math.max(3000, row.loyaltyPoints)} tone="gold" />
                          </TD>
                          <TD className="whitespace-nowrap text-xs font-semibold tabular-nums">{formatSAR(row.totalSpent)}</TD>
                          <TD className="text-[11px] tabular-nums">{formatNumber(row.invoices)}</TD>
                          <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{row.lastPurchaseAt ? formatDate(row.lastPurchaseAt) : '—'}</TD>
                          <TD>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[11px]"
                              onClick={() => {
                                setSelected(row);
                                setPoints('100');
                              }}
                            >
                              إدارة النقاط
                            </Button>
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        ) : (
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الكود</TH>
                    <TH>النوع</TH>
                    <TH>القيمة</TH>
                    <TH>الحد الأدنى</TH>
                    <TH>الاستخدام</TH>
                    <TH>الانتهاء</TH>
                    <TH>الحالة</TH>
                  </TR>
                </THead>
                <TBody>
                  {coupons.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        <span className="rounded-lg border bg-muted/40 px-2 py-1 font-mono text-[11px] font-bold" dir="ltr">{row.code}</span>
                      </TD>
                      <TD className="text-[11px]">{row.type === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'}</TD>
                      <TD className="text-xs font-bold tabular-nums">{row.type === 'percent' ? `${row.value}%` : formatSAR(row.value)}</TD>
                      <TD className="text-[11px] tabular-nums text-muted-foreground">{formatSAR(row.minSpend)}</TD>
                      <TD className="w-40">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-semibold tabular-nums">{row.used} / {row.usageLimit}</span>
                          <span className="text-[9px] text-muted-foreground">{row.remaining ?? Math.max(0, row.usageLimit - row.used)} متبقٍ</span>
                        </div>
                        <Progress className="mt-1.5" value={row.used} max={row.usageLimit || 1} tone="gold" />
                      </TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{row.expiresAt ? formatDate(row.expiresAt) : 'بدون انتهاء'}</TD>
                      <TD>
                        <Badge variant={row.active ? 'success' : 'secondary'}>{row.active ? 'نشطة' : 'موقوفة'}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <p className="border-t px-5 py-3 text-[10px] leading-5 text-muted-foreground">
              القسائم تُطبّق في نقطة البيع عبر كود الخصم. التحقق من الحد الأدنى وعدد الاستخدامات يتم في الـ API قبل ترحيل الفاتورة.
            </p>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `نقاط ولاء — ${selected.name}` : 'نقاط الولاء'}
        description={selected ? `${formatNumber(selected.loyaltyPoints)} نقطة حالياً · الطبقة ${tierOf(selected.loyaltyPoints).label}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>إلغاء</Button>
            <Button variant="gold" onClick={adjustPoints} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="loyalty" size={15} />}
              تطبيق التعديل
            </Button>
          </>
        }
      >
        <form onSubmit={adjustPoints} className="space-y-4">
          <Field label="عدد النقاط (+ إضافة / − خصم)" hint="مثال: 100 لمنح 100 نقطة، أو -50 لخصمها.">
            <Input type="number" step="1" value={points} onChange={(event) => setPoints(event.target.value)} dir="ltr" className="text-left" />
          </Field>
          {selected ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-[11px] leading-6 text-muted-foreground">
              الرصيد بعد التعديل:{' '}
              <span className="font-bold text-foreground">
                {formatNumber(Math.max(0, selected.loyaltyPoints + Number(points || 0)))} نقطة
              </span>
              <br />
              قيمة الاستبدال التقريبية:{' '}
              <span className="font-bold text-foreground">
                {formatSAR(Math.max(0, selected.loyaltyPoints + Number(points || 0)) * 0.05)}
              </span>
            </div>
          ) : null}
        </form>
      </Dialog>

      <Dialog
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="عميل جديد"
        description="يُستخدم رقم الجوال كمعرّف للولاء عند الدفع."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCustomerOpen(false)}>إلغاء</Button>
            <Button onClick={createCustomer} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="plus" size={15} />}
              إنشاء العميل
            </Button>
          </>
        }
      >
        <form onSubmit={createCustomer} className="space-y-4">
          <Field label="الاسم">
            <Input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} placeholder="مثال: نورة العتيبي" />
          </Field>
          <Field label="رقم الجوال">
            <Input value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} placeholder="05xxxxxxxx" dir="ltr" className="text-left" />
          </Field>
          <Field label="الرقم الضريبي (اختياري)" hint="للفواتير القياسية B2B فقط.">
            <Input value={customerForm.vatNumber} onChange={(event) => setCustomerForm({ ...customerForm, vatNumber: event.target.value })} dir="ltr" className="text-left font-mono" />
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={couponOpen}
        onClose={() => setCouponOpen(false)}
        title="قسيمة خصم جديدة"
        description="كود فريد يُستخدم في نقطة البيع أو القائمة الإلكترونية."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCouponOpen(false)}>إلغاء</Button>
            <Button variant="gold" onClick={createCoupon} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="loyalty" size={15} />}
              إنشاء القسيمة
            </Button>
          </>
        }
      >
        <form onSubmit={createCoupon} className="space-y-4">
          <Field label="الكود">
            <Input value={couponForm.code} onChange={(event) => setCouponForm({ ...couponForm, code: event.target.value.toUpperCase() })} placeholder="TALAL20" dir="ltr" className="text-left font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="النوع">
              <Select value={couponForm.type} onChange={(event) => setCouponForm({ ...couponForm, type: event.target.value })}>
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت</option>
              </Select>
            </Field>
            <Field label={couponForm.type === 'percent' ? 'النسبة %' : 'المبلغ SAR'}>
              <Input type="number" min="0.01" step="0.01" value={couponForm.value} onChange={(event) => setCouponForm({ ...couponForm, value: event.target.value })} dir="ltr" className="text-left" />
            </Field>
            <Field label="الحد الأدنى SAR">
              <Input type="number" min="0" step="0.01" value={couponForm.minSpend} onChange={(event) => setCouponForm({ ...couponForm, minSpend: event.target.value })} dir="ltr" className="text-left" />
            </Field>
            <Field label="حد الاستخدام">
              <Input type="number" min="1" step="1" value={couponForm.usageLimit} onChange={(event) => setCouponForm({ ...couponForm, usageLimit: event.target.value })} dir="ltr" className="text-left" />
            </Field>
          </div>
          <Field label="تاريخ الانتهاء (اختياري)">
            <Input type="date" value={couponForm.expiresAt} onChange={(event) => setCouponForm({ ...couponForm, expiresAt: event.target.value })} dir="ltr" className="text-left" />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
