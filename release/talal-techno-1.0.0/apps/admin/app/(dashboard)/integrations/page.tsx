'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import {
  demoDeliveryOrders,
  demoIntegrations,
  demoPaymentTransactions,
  demoPrinterJobs
} from '@/lib/demo';
import { apiPost, getToken } from '@/lib/api';
import { formatDate, formatSAR, statusLabel } from '@/lib/utils';

type Provider = { provider: string; name: string; configured: boolean };
type Platform = { platform: string; name: string; configured: boolean };

type IntegrationsData = {
  payments: { mode: string; providers: Provider[] };
  delivery: { mode: string; providers: Platform[] };
  printer: { mode: string; name: string; width: number };
  zatca: { environment: string; certified: boolean };
  disclaimer: string;
};

type Transaction = {
  id: string;
  provider: string;
  providerName: string;
  method: string;
  amount: number;
  status: string;
  transactionId: string;
  reference: string;
  mode: string;
  invoiceNumber?: string | null;
  createdAt: string;
};

type DeliveryOrder = {
  id: string;
  platform: string;
  platformName: string;
  externalOrderId: string;
  status: string;
  total: number;
  orderNumber?: string | null;
  branchName: string;
  createdAt: string;
  syncedAt?: string | null;
};

type PrinterJob = {
  id: string;
  kind: string;
  number: string;
  printer: string;
  bytes: number;
  status: string;
  preview: string;
  createdAt: string;
};

type IntegrationsResponse = { data: IntegrationsData };
type TransactionsResponse = { data: Transaction[] };
type DeliveryResponse = { data: DeliveryOrder[] };
type PrinterResponse = { data: PrinterJob[] };

const methodLabels: Record<string, string> = {
  mada: 'مدى',
  applepay: 'Apple Pay',
  stcpay: 'STC Pay',
  visa: 'Visa',
  mastercard: 'Mastercard',
  card: 'شبكة / بطاقة',
  cash: 'نقدي'
};

const chargeMethods = ['mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'card'];

const deliveryStatusLabels: Record<string, string> = {
  new: 'جديد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  picked_up: 'مع المندوب',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
};

export default function IntegrationsPage() {
  const integrationsApi = useApi<IntegrationsResponse>('/integrations', demoIntegrations as unknown as IntegrationsResponse);
  const transactionsApi = useApi<TransactionsResponse>('/integrations/payments/transactions', demoPaymentTransactions as unknown as TransactionsResponse);
  const deliveryApi = useApi<DeliveryResponse>('/integrations/delivery/orders', demoDeliveryOrders as unknown as DeliveryResponse);
  const printerApi = useApi<PrinterResponse>('/integrations/printer/jobs', demoPrinterJobs as unknown as PrinterResponse);
  const { toast } = useToast();

  const [tab, setTab] = useState<'payments' | 'delivery' | 'printer'>('payments');
  const [provider, setProvider] = useState('hyperpay');
  const [method, setMethod] = useState('mada');
  const [amount, setAmount] = useState('46');
  const [charging, setCharging] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [printerJobs, setPrinterJobs] = useState<PrinterJob[]>([]);
  const [pulling, setPulling] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ status: string; message: string; transactionId?: string } | null>(null);

  useEffect(() => setTransactions(transactionsApi.data.data || []), [transactionsApi.data]);
  useEffect(() => setDeliveryOrders(deliveryApi.data.data || []), [deliveryApi.data]);
  useEffect(() => setPrinterJobs(printerApi.data.data || []), [printerApi.data]);

  const data = integrationsApi.data.data;
  const loading = integrationsApi.loading || transactionsApi.loading || deliveryApi.loading || printerApi.loading;
  const source = integrationsApi.source;

  const refreshAll = () => {
    integrationsApi.refresh();
    transactionsApi.refresh();
    deliveryApi.refresh();
    printerApi.refresh();
  };

  const charge = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast('أدخل مبلغاً أكبر من صفر.', 'error');
      return;
    }
    setCharging(true);
    setLastResult(null);
    const providerName = data.payments.providers.find((row) => row.provider === provider)?.name || provider;

    if (getToken()) {
      try {
        const result = await apiPost<{ data: { status: string; message: string; transactionId: string } }>('/integrations/payments/charge', {
          provider,
          method,
          amount: value,
          reference: 'admin-console'
        });
        setLastResult({ status: result.data.status, message: result.data.message, transactionId: result.data.transactionId });
        toast(result.data.message, result.data.status === 'approved' ? 'success' : 'error');
        transactionsApi.refresh();
        setCharging(false);
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تنفيذ الدفع.', 'error');
        setCharging(false);
        return;
      }
    }

    const approved = method !== 'credit';
    const result = {
      status: approved ? 'approved' : 'declined',
      message: approved
        ? `دفعة تجريبية عبر ${providerName} — لم تُخصم أي مبالغ حقيقية.`
        : 'الدفع الآجل لا يمر عبر بوابة دفع — محاكاة.',
      transactionId: `MOCK-${provider.toUpperCase()}-${Date.now().toString().slice(-6)}`
    };
    setTransactions((current) => [
      {
        id: `demo-${Date.now()}`,
        provider,
        providerName,
        method,
        amount: value,
        status: result.status,
        transactionId: result.transactionId,
        reference: 'demo',
        mode: 'mock',
        invoiceNumber: null,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    setLastResult(result);
    toast(result.message, approved ? 'success' : 'error');
    setCharging(false);
  };

  const pull = async (platform: Platform) => {
    setPulling(platform.platform);
    if (getToken()) {
      try {
        const result = await apiPost<{ data: { fetched: number; imported: number; skipped: number } }>('/integrations/delivery/pull', {
          platform: platform.platform
        });
        toast(`تم جلب ${result.data.fetched} طلب من ${platform.name} — مستورد ${result.data.imported}، مكرر ${result.data.skipped}.`, 'success');
        deliveryApi.refresh();
        setPulling(null);
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر جلب طلبات التوصيل.', 'error');
        setPulling(null);
        return;
      }
    }

    const now = new Date().toISOString();
    const newOrders: DeliveryOrder[] = [
      {
        id: `demo-delivery-${Date.now()}`,
        platform: platform.platform,
        platformName: platform.name,
        externalOrderId: `${platform.platform.toUpperCase()}-MOCK-${Math.floor(100000 + Math.random() * 899999)}`,
        status: 'new',
        total: 69,
        orderNumber: null,
        branchName: 'الفرع الرئيسي — العليا',
        createdAt: now,
        syncedAt: now
      }
    ];
    setDeliveryOrders((current) => [...newOrders, ...current]);
    toast(`تمت محاكاة جلب طلب من ${platform.name}. لم يتم الاتصال بأي منصة حقيقية.`, 'success');
    setPulling(null);
  };

  const printerTest = async () => {
    setTesting(true);
    if (getToken()) {
      try {
        const result = await apiPost<{ data: { preview: string; printer: string; bytes: number } }>('/integrations/printer/test', {});
        setPreview(result.data.preview);
        toast(`تمت طباعة تجريبية على ${result.data.printer} (${result.data.bytes} بايت).`, 'success');
        printerApi.refresh();
        setTesting(false);
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تنفيذ الطباعة التجريبية.', 'error');
        setTesting(false);
        return;
      }
    }

    const text = [
      '        طلال تكنو',
      '     TALAL TECHNO · MOCK',
      '-------------------------------',
      'فاتورة تجريبية: TEST-' + Date.now().toString().slice(-6),
      'كبسة دجاج        1 × 32.00',
      'مياه معدنية      2 ×  3.00',
      '-------------------------------',
      'المجموع             38.00',
      'ضريبة 15%            5.70',
      'الإجمالي            43.70',
      '-------------------------------',
      'شكراً لزيارتكم — Sandbox'
    ].join('\n');
    setPreview(text);
    setPrinterJobs((current) => [
      {
        id: `demo-job-${Date.now()}`,
        kind: 'test',
        number: `TEST-${Date.now().toString().slice(-6)}`,
        printer: data.printer.name,
        bytes: new TextEncoder().encode(text).length + 8,
        status: 'printed',
        preview: text,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    toast('تمت محاكاة الطباعة الحرارية — لم تُرسل بيانات لطابعة حقيقية.', 'success');
    setTesting(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="التكاملات"
        title="المدفوعات والتوصيل والطباعة"
        description="محولات Mock وSandbox لكل تكامل. المفاتيح الحقيقية اختيارية عبر متغيرات البيئة، ولا توجد أي ادعاءات باعتماد مقدمي الخدمة."
        actions={<SourceBadge source={source} loading={loading} error={integrationsApi.error} onRefresh={refreshAll} />}
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-xs leading-6 text-[#7a5d0b] dark:text-brand-gold">
        <Icon name="shield" size={18} className="mt-0.5 shrink-0" />
        <p>{data.disclaimer}</p>
      </div>

      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: 'payments', label: 'المدفوعات', count: transactions.length },
            { value: 'delivery', label: 'التوصيل', count: deliveryOrders.length },
            { value: 'printer', label: 'الطباعة الحرارية', count: printerJobs.length }
          ]}
        />
      </div>

      {tab === 'payments' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>بوابات الدفع</CardTitle>
                <CardDescription>مدى، Apple Pay، STC Pay، وبطاقات عبر HyperPay / Geidea / Moyasar / PayTabs.</CardDescription>
              </div>
              <Badge variant={data.payments.mode === 'mock' ? 'gold' : 'info'}>{data.payments.mode.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {data.payments.providers.map((row) => (
                <button
                  key={row.provider}
                  type="button"
                  onClick={() => setProvider(row.provider)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    provider === row.provider ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'bg-muted/15 hover:bg-muted/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-sm font-extrabold text-primary">
                      {row.name.slice(0, 1)}
                    </span>
                    <Badge variant={row.configured ? 'success' : 'secondary'}>{row.configured ? 'مهيأ' : 'غير مهيأ'}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-bold">{row.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {provider === row.provider ? 'محدد للاختبار' : 'اضغط للاختيار'} · محاكاة فقط
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>اختبار دفعة Sandbox</CardTitle>
              <CardDescription>لن يتم خصم أي مبلغ حقيقي.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={charge} className="space-y-3">
                <Field label="البوابة">
                  <Select value={provider} onChange={(event) => setProvider(event.target.value)}>
                    {data.payments.providers.map((row) => (
                      <option key={row.provider} value={row.provider}>{row.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="طريقة الدفع">
                  <Select value={method} onChange={(event) => setMethod(event.target.value)}>
                    {chargeMethods.map((value) => (
                      <option key={value} value={value}>{methodLabels[value] || value}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="المبلغ (SAR)">
                  <Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} dir="ltr" className="text-left" />
                </Field>
                <Button type="submit" className="w-full" disabled={charging}>
                  {charging ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="wallet" size={15} />}
                  تنفيذ دفعة تجريبية
                </Button>
              </form>
              {lastResult ? (
                <div className={`mt-3 rounded-xl border p-3 text-[11px] leading-5 ${lastResult.status === 'approved' ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200' : 'border-red-500/25 bg-red-500/5 text-red-800 dark:text-red-200'}`}>
                  <p className="font-bold">{lastResult.status === 'approved' ? 'دفعة ناجحة' : 'دفعة مرفوضة'}</p>
                  <p className="mt-1">{lastResult.message}</p>
                  {lastResult.transactionId ? <p className="mt-1 font-mono text-[9px]" dir="ltr">{lastResult.transactionId}</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle>آخر المعاملات</CardTitle>
              <CardDescription>كل معاملة مرتبطة بمحاكي البوابة ووسم Sandbox.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TableWrap>
                <Table>
                  <THead>
                    <TR><TH>البوابة</TH><TH>الطريقة</TH><TH>المبلغ</TH><TH>الحالة</TH><TH>المعرّف</TH><TH>الفاتورة</TH><TH>الوقت</TH></TR>
                  </THead>
                  <TBody>
                    {transactions.map((row) => (
                      <TR key={row.id}>
                        <TD className="text-xs font-semibold">{row.providerName}</TD>
                        <TD className="text-[11px]">{methodLabels[row.method] || row.method}</TD>
                        <TD className="text-xs font-bold tabular-nums">{formatSAR(row.amount)}</TD>
                        <TD><Badge variant={row.status === 'approved' ? 'success' : row.status === 'declined' ? 'danger' : 'warning'}>{statusLabel(row.status)}</Badge></TD>
                        <TD className="max-w-[150px] truncate font-mono text-[9px] text-muted-foreground" dir="ltr">{row.transactionId}</TD>
                        <TD className="font-mono text-[10px]" dir="ltr">{row.invoiceNumber || '—'}</TD>
                        <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'delivery' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>منصات التوصيل</CardTitle>
                <CardDescription>HungerStation، Jahez، Mrsool، ToYou، Careem — محولات محاكاة.</CardDescription>
              </div>
              <Badge variant={data.delivery.mode === 'mock' ? 'gold' : 'info'}>{data.delivery.mode.toUpperCase()}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {data.delivery.providers.map((row) => (
                <div key={row.platform} className="rounded-2xl border bg-muted/15 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-sm font-extrabold text-primary">{row.name.slice(0, 1)}</span>
                    <Badge variant={row.configured ? 'success' : 'secondary'}>{row.configured ? 'مهيأ' : 'Mock'}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-bold">{row.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">سحب الطلبات وتحديث الحالة</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => pull(row)}
                    disabled={pulling === row.platform}
                  >
                    {pulling === row.platform ? <Icon name="refresh" size={13} className="animate-spin" /> : <Icon name="download" size={13} />}
                    جلب الطلبات
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>طلبات التوصيل الواردة</CardTitle>
              <CardDescription>يتم ربط الطلب برقم داخلي عند استيراده من الـ API.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TableWrap>
                <Table>
                  <THead>
                    <TR><TH>المنصة</TH><TH>رقم خارجي</TH><TH>الطلب الداخلي</TH><TH>الإجمالي</TH><TH>الحالة</TH><TH>الفرع</TH><TH>الاستلام</TH></TR>
                  </THead>
                  <TBody>
                    {deliveryOrders.map((row) => (
                      <TR key={row.id}>
                        <TD className="text-xs font-semibold">{row.platformName}</TD>
                        <TD className="font-mono text-[10px]" dir="ltr">{row.externalOrderId}</TD>
                        <TD className="font-mono text-[10px]" dir="ltr">{row.orderNumber || '—'}</TD>
                        <TD className="text-xs font-bold tabular-nums">{formatSAR(row.total)}</TD>
                        <TD><Badge variant={row.status === 'delivered' ? 'success' : row.status === 'new' ? 'info' : 'warning'}>{deliveryStatusLabels[row.status] || row.status}</Badge></TD>
                        <TD className="text-[10px] text-muted-foreground">{row.branchName}</TD>
                        <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'printer' ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>الطابعة الحرارية</CardTitle>
                <CardDescription>ESC/POS عبر محول Mock. العرض يوضح البايتات الناتجة دون إرسالها لجهاز.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground">الطابعة</p>
                  <p className="mt-1 text-xs font-bold">{data.printer.name}</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground">العرض</p>
                  <p className="mt-1 text-xs font-bold">{data.printer.width} حرف</p>
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-[10px] text-muted-foreground">الوضع</p>
                  <p className="mt-1"><Badge variant="gold">{data.printer.mode.toUpperCase()}</Badge></p>
                </div>
                <p className="text-[10px] leading-5 text-muted-foreground sm:col-span-3">
                  يدعم المحول أوامر ESC/POS، فتح الدرج، قطع الورق، ومحاذاة RTL. الربط الحقيقي عبر TCP 9100 يحتاج
                  تفعيلاً خارج هذه النسخة.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>طباعة اختبار</CardTitle>
                <CardDescription>فاتورة تجريبية قصيرة.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={printerTest} disabled={testing}>
                  {testing ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="printer" size={15} />}
                  طباعة تجريبية
                </Button>
                <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                  لن يتم الاتصال بطابعة حقيقية. راجع المعاينة ثم استخدم تكامل TCP في بيئة الإنتاج.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>مهام الطباعة</CardTitle>
              <CardDescription>سجل المهام ومعاينة آخر إيصال.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <TableWrap>
                <Table>
                  <THead>
                    <TR><TH>المهمة</TH><TH>المرجع</TH><TH>الطابعة</TH><TH>البايتات</TH><TH>الحالة</TH><TH>الوقت</TH><TH /></TR>
                  </THead>
                  <TBody>
                    {printerJobs.map((row) => (
                      <TR key={row.id}>
                        <TD className="text-xs font-semibold">{row.kind}</TD>
                        <TD className="font-mono text-[10px]" dir="ltr">{row.number}</TD>
                        <TD className="text-[10px] text-muted-foreground">{row.printer}</TD>
                        <TD className="text-[11px] tabular-nums">{row.bytes}</TD>
                        <TD><Badge variant="success">{statusLabel(row.status)}</Badge></TD>
                        <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</TD>
                        <TD>
                          <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => setPreview(row.preview)}>
                            معاينة
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="معاينة الإيصال الحراري"
        description="نص تقريبي بعد إزالة أوامر التحكم. ESC/POS Mock."
        size="sm"
        footer={<Button onClick={() => setPreview(null)}>إغلاق</Button>}
      >
        <pre className="scrollbar-thin max-h-[60vh] overflow-auto rounded-xl border bg-[#f8f5eb] p-4 text-left font-mono text-[11px] leading-6 text-[#1b2b24]" dir="ltr">
{preview || ''}
        </pre>
      </Dialog>
    </>
  );
}
