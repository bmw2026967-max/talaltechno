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
import { Field, Input, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoShifts } from '@/lib/demo';
import { apiGet, apiPost, getToken } from '@/lib/api';
import { formatDate, formatNumber, formatSAR } from '@/lib/utils';

type Shift = {
  id: string;
  number: string;
  branchId: string;
  userId: string;
  userName: string;
  status: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  sales: number;
  orders: number;
  tax: number;
  cogs: number;
  notes: string;
  openedAt: string;
  closedAt: string | null;
};

type ShiftsResponse = { data: Shift[] };

type ShiftSummary = {
  shift: Shift;
  sales: number;
  refunds: number;
  tax: number;
  discounts: number;
  cogs: number;
  count: number;
  avgTicket: number;
  cashSales: number;
  cashExpenses: number;
  expectedCash: number;
  byMethod: Record<string, number>;
};

type SummaryResponse = { data: ShiftSummary };

const methodLabels: Record<string, string> = {
  cash: 'نقدي',
  mada: 'مدى',
  applepay: 'Apple Pay',
  stcpay: 'STC Pay',
  visa: 'Visa',
  mastercard: 'Mastercard',
  card: 'شبكة',
  bank: 'تحويل',
  credit: 'آجل',
  wallet: 'محفظة',
  mixed: 'مختلط'
};

const duration = (from: string, to: string | null) => {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '—';
  const minutes = Math.floor((end - start) / 60000);
  return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
};

export default function ShiftsPage() {
  const { data, loading, source, error, refresh } = useApi<ShiftsResponse>('/shifts', demoShifts as unknown as ShiftsResponse);
  const { toast } = useToast();

  const [rows, setRows] = useState<Shift[]>([]);
  const [openOpen, setOpenOpen] = useState(false);
  const [closeFor, setCloseFor] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState('500');
  const [openNotes, setOpenNotes] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => setRows(data.data || []), [data]);

  const openShift = rows.find((row) => row.status === 'open');
  const stats = useMemo(() => {
    const sales = rows.reduce((total, row) => total + Number(row.sales || 0), 0);
    const variance = rows.reduce((total, row) => total + Number(row.variance || 0), 0);
    const expected = rows.reduce((total, row) => total + Number(row.expectedCash || 0), 0);
    return { sales, variance, expected, count: rows.length };
  }, [rows]);

  const submitOpen = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(openingCash);
    if (!Number.isFinite(value) || value < 0) {
      toast('أدخل نقدية افتتاحية صحيحة.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/shifts/open', { openingCash: value, notes: openNotes || undefined });
        toast('تم فتح الوردية بنجاح.');
        setOpenOpen(false);
        setOpenNotes('');
        setSaving(false);
        refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر فتح الوردية.', 'error');
        setSaving(false);
        return;
      }
    }
    setRows((current) => [
      {
        id: `demo-shift-${Date.now()}`,
        number: `SH-${1002 + current.length}`,
        branchId: 'b1',
        userId: 'demo',
        userName: 'زائر العرض',
        status: 'open',
        openingCash: value,
        closingCash: null,
        expectedCash: null,
        variance: null,
        sales: 0,
        orders: 0,
        tax: 0,
        cogs: 0,
        notes: openNotes,
        openedAt: new Date().toISOString(),
        closedAt: null
      },
      ...current
    ]);
    toast('تم فتح وردية تجريبية — محاكاة عرض.', 'success');
    setOpenOpen(false);
    setOpenNotes('');
    setSaving(false);
  };

  const openSummary = async (shift: Shift) => {
    setSummaryLoading(true);
    if (getToken()) {
      try {
        const result = await apiGet<SummaryResponse>(`/shifts/${shift.id}/summary`);
        setSummary(result.data);
        setSummaryLoading(false);
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تحميل ملخص الوردية.', 'error');
        setSummaryLoading(false);
        return;
      }
    }
    const cashSales = shift.sales - shift.tax;
    const expected = shift.openingCash + cashSales;
    setSummary({
      shift,
      sales: shift.sales,
      refunds: 0,
      tax: shift.tax,
      discounts: 0,
      cogs: shift.cogs,
      count: shift.orders,
      avgTicket: shift.orders ? shift.sales / shift.orders : 0,
      cashSales,
      cashExpenses: 0,
      expectedCash: expected,
      byMethod: { cash: cashSales, mada: shift.sales * 0.45 }
    });
    setSummaryLoading(false);
  };

  const submitClose = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!closeFor) return;
    const counted = Number(countedCash);
    if (!Number.isFinite(counted) || counted < 0) {
      toast('أدخل النقدية المعدودة.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost(`/shifts/${closeFor.id}/close`, { countedCash: counted, notes: closeNotes || undefined });
        toast('تم إغلاق الوردية وتسجيل الفرق.');
        setCloseFor(null);
        setCountedCash('');
        setCloseNotes('');
        setSaving(false);
        refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إغلاق الوردية.', 'error');
        setSaving(false);
        return;
      }
    }
    const cashSales = Math.max(0, closeFor.sales - closeFor.tax);
    const expected = closeFor.openingCash + cashSales;
    const variance = Math.round((counted - expected) * 100) / 100;
    setRows((current) =>
      current.map((row) =>
        row.id === closeFor.id
          ? {
              ...row,
              status: 'closed',
              closingCash: counted,
              expectedCash: expected,
              variance,
              notes: closeNotes || row.notes,
              closedAt: new Date().toISOString()
            }
          : row
      )
    );
    toast(`تم إغلاق الوردية — الفرق ${formatSAR(variance)} (محاكاة عرض).`, Math.abs(variance) < 0.01 ? 'success' : 'warning');
    setCloseFor(null);
    setCountedCash('');
    setCloseNotes('');
    setSaving(false);
  };

  const previewVariance = closeFor
    ? Math.round((Number(countedCash || 0) - (closeFor.openingCash + Math.max(0, closeFor.sales - closeFor.tax))) * 100) / 100
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="الورديات والصندوق"
        title="الورديات وإغلاق الصندوق"
        description="فتح وإغلاق ورديات الكاشير مع النقدية الافتتاحية والمعدودة، حساب الفرق تلقائياً، وملخص المبيعات حسب طريقة الدفع."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={error} onRefresh={refresh} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="printer" size={15} />
              طباعة التقرير
            </Button>
            <Button size="sm" onClick={() => setOpenOpen(true)} disabled={Boolean(openShift)}>
              <Icon name="shifts" size={15} />
              فتح وردية
            </Button>
          </>
        }
      />

      {openShift ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Icon name="clock" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">
              وردية مفتوحة — {openShift.number} · {openShift.userName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              بدأت {formatDate(openShift.openedAt)} · النقدية الافتتاحية {formatSAR(openShift.openingCash)} · المدة {duration(openShift.openedAt, null)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => openSummary(openShift)} disabled={summaryLoading}>
              {summaryLoading ? <Icon name="refresh" size={14} className="animate-spin" /> : <Icon name="receipt" size={14} />}
              الملخص
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setCloseFor(openShift);
                setCountedCash(String(openShift.openingCash));
                setCloseNotes('');
              }}
            >
              <Icon name="wallet" size={14} />
              إغلاق الوردية
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Icon name="clock" size={19} />
          </span>
          <div className="flex-1">
            <p className="text-xs font-bold">لا توجد وردية مفتوحة حالياً</p>
            <p className="text-[10px] text-muted-foreground">افتح وردية جديدة قبل تسجيل مبيعات نقدية في نقطة البيع.</p>
          </div>
          <Button size="sm" onClick={() => setOpenOpen(true)}>
            <Icon name="plus" size={14} />
            فتح وردية
          </Button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي مبيعات الورديات" value={formatSAR(stats.sales)} hint={`${formatNumber(stats.count)} وردية مسجلة`} icon="sales" tone="green" />
        <StatCard label="النقدية المتوقعة" value={formatSAR(stats.expected)} hint="افتتاحي + مبيعات نقدية" icon="wallet" tone="navy" />
        <StatCard label="صافي الفروقات" value={formatSAR(stats.variance)} hint="معدود − متوقع" icon="alert" tone={Math.abs(stats.variance) < 0.01 ? 'green' : 'red'} />
        <StatCard label="الورديات المفتوحة" value={formatNumber(rows.filter((row) => row.status === 'open').length)} hint="على مستوى المنشأة" icon="shifts" tone="gold" />
      </section>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>سجل الورديات</CardTitle>
          <CardDescription>الورديات المغلقة تُظهر النقدية المعدودة والفرق مقابل المتوقع.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>الوردية</TH>
                  <TH>الكاشير</TH>
                  <TH>الحالة</TH>
                  <TH>الافتتاح</TH>
                  <TH>المبيعات</TH>
                  <TH>المتوقع</TH>
                  <TH>المعدود</TH>
                  <TH>الفرق</TH>
                  <TH>المدة</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const variance = row.variance === null ? null : Number(row.variance);
                  return (
                    <TR key={row.id}>
                      <TD>
                        <p className="font-mono text-[11px] font-bold" dir="ltr">{row.number}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(row.openedAt)}</p>
                      </TD>
                      <TD className="text-xs font-semibold">{row.userName}</TD>
                      <TD>
                        <Badge variant={row.status === 'open' ? 'success' : 'secondary'}>
                          {row.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-[11px] tabular-nums">{formatSAR(row.openingCash)}</TD>
                      <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{formatSAR(row.sales)}</TD>
                      <TD className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">{row.expectedCash === null ? '—' : formatSAR(row.expectedCash)}</TD>
                      <TD className="whitespace-nowrap text-[11px] tabular-nums">{row.closingCash === null ? '—' : formatSAR(row.closingCash)}</TD>
                      <TD className={`whitespace-nowrap text-xs font-bold tabular-nums ${variance === null ? 'text-muted-foreground' : variance === 0 ? 'text-emerald-600 dark:text-emerald-300' : variance > 0 ? 'text-sky-600 dark:text-sky-300' : 'text-red-600 dark:text-red-300'}`}>
                        {variance === null ? '—' : formatSAR(variance)}
                      </TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{duration(row.openedAt, row.closedAt)}</TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => openSummary(row)} disabled={summaryLoading}>
                            <Icon name="eye" size={13} />
                            ملخص
                          </Button>
                          {row.status === 'open' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[11px] text-amber-700 dark:text-amber-300"
                              onClick={() => {
                                setCloseFor(row);
                                setCountedCash(String(row.openingCash));
                                setCloseNotes('');
                              }}
                            >
                              إغلاق
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">لا توجد ورديات مسجلة بعد.</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={openOpen}
        onClose={() => setOpenOpen(false)}
        title="فتح وردية جديدة"
        description="تُسجَّل النقدية الافتتاحية في الصندوق وتُربط بالوردية الحالية."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpenOpen(false)}>إلغاء</Button>
            <Button onClick={submitOpen} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="shifts" size={15} />}
              فتح الوردية
            </Button>
          </>
        }
      >
        <form onSubmit={submitOpen} className="space-y-4">
          <Field label="النقدية الافتتاحية (SAR)" hint="المبلغ الموجود فعلياً في درج النقدية.">
            <Input type="number" min="0" step="0.01" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} dir="ltr" className="text-left" />
          </Field>
          <Field label="ملاحظات (اختياري)">
            <Textarea value={openNotes} onChange={(event) => setOpenNotes(event.target.value)} rows={2} placeholder="مثال: تسليم وردية صباحية" />
          </Field>
          <div className="rounded-xl border bg-muted/30 p-3 text-[11px] leading-5 text-muted-foreground">
            لا يمكن فتح وردية ثانية لنفس المستخدم قبل إغلاق الحالية. يُسجَّل الحدث في سجل التدقيق.
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(closeFor)}
        onClose={() => setCloseFor(null)}
        title={closeFor ? `إغلاق وردية ${closeFor.number}` : 'إغلاق الوردية'}
        description="أدخل النقدية المعدودة فعلياً. سيُحسب الفرق مقابل المتوقع تلقائياً."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCloseFor(null)}>إلغاء</Button>
            <Button variant="gold" onClick={submitClose} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="check" size={15} />}
              إغلاق الوردية
            </Button>
          </>
        }
      >
        <form onSubmit={submitClose} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-muted-foreground">الافتتاحي</p>
              <p className="mt-1 text-sm font-bold tabular-nums">{formatSAR(closeFor?.openingCash || 0)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-muted-foreground">المبيعات</p>
              <p className="mt-1 text-sm font-bold tabular-nums">{formatSAR(closeFor?.sales || 0)}</p>
            </div>
          </div>
          <Field label="النقدية المعدودة (SAR)">
            <Input type="number" min="0" step="0.01" value={countedCash} onChange={(event) => setCountedCash(event.target.value)} dir="ltr" className="text-left" />
          </Field>
          <Field label="ملاحظات الإغلاق (اختياري)">
            <Textarea value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} rows={2} placeholder="أي فروقات أو ملاحظات على الصندوق" />
          </Field>
          <div className={`rounded-xl border p-3 text-[11px] leading-5 ${Math.abs(previewVariance) < 0.01 ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200' : 'border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-200'}`}>
            الفرق المتوقع:{' '}
            <span className="font-extrabold tabular-nums">{formatSAR(previewVariance)}</span>
            {Math.abs(previewVariance) < 0.01 ? ' — الصندوق مطابق.' : ' — راجع النقدية قبل الإغلاق.'}
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(summary)}
        onClose={() => setSummary(null)}
        title={summary ? `ملخص الوردية ${summary.shift.number}` : 'ملخص الوردية'}
        description={summary ? `${summary.shift.userName} · ${formatDate(summary.shift.openedAt)}` : undefined}
        size="md"
        footer={<Button onClick={() => setSummary(null)}>إغلاق</Button>}
      >
        {summary ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">المبيعات</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatSAR(summary.sales)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">الضريبة</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatSAR(summary.tax)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">عدد الفواتير</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatNumber(summary.count)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-3 text-[11px]">
                <p className="mb-2 font-bold">تفاصيل النقدية</p>
                {[
                  ['نقدية افتتاحية', summary.shift.openingCash],
                  ['مبيعات نقدية', summary.cashSales],
                  ['مصروفات نقدية', -summary.cashExpenses],
                  ['النقدية المتوقعة', summary.expectedCash],
                  ['المعدودة', summary.shift.closingCash ?? 0]
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between py-0.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">{formatSAR(Number(value || 0))}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border bg-muted/20 p-3 text-[11px]">
                <p className="mb-2 font-bold">حسب طريقة الدفع</p>
                {Object.keys(summary.byMethod).length === 0 ? (
                  <p className="text-muted-foreground">لا توجد مدفوعات مسجلة.</p>
                ) : (
                  Object.entries(summary.byMethod).map(([method, value]) => (
                    <div key={method} className="flex items-center justify-between py-0.5">
                      <span className="text-muted-foreground">{methodLabels[method] || method}</span>
                      <span className="font-semibold tabular-nums">{formatSAR(value)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-[11px]">
              <div className="rounded-xl border p-3">
                <p className="text-muted-foreground">المرتجعات</p>
                <p className="mt-1 font-bold tabular-nums">{formatSAR(summary.refunds)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-muted-foreground">الخصومات</p>
                <p className="mt-1 font-bold tabular-nums">{formatSAR(summary.discounts)}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-muted-foreground">تكلفة البضاعة</p>
                <p className="mt-1 font-bold tabular-nums">{formatSAR(summary.cogs)}</p>
              </div>
            </div>
            <p className="rounded-xl border border-dashed bg-muted/20 p-3 text-[10px] leading-5 text-muted-foreground">
              الملخص محسوب من محرك الورديات في <span className="font-mono" dir="ltr">@talaltechno/domain</span> — نفس
              المنطق المستخدم عند الإغلاق الفعلي.
            </p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
