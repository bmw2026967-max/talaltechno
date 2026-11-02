'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useApi } from '@/lib/use-api';
import { demoInvoices } from '@/lib/demo';
import { apiGet, getToken } from '@/lib/api';
import { formatSAR, statusLabel } from '@/lib/utils';

type Invoice = {
  id: string;
  number: string;
  type: string;
  status: string;
  date: string;
  createdAt: string;
  customerName: string;
  subtotal: number;
  discount: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  method?: string;
  orderType?: string;
  tableName?: string | null;
  cogs?: number;
  profit?: number;
  zatca?: { status?: string; uuid?: string; qr?: string; invoiceHash?: string } | null;
  items?: Array<{ name: string; qty: number; price: number; total?: number }>;
  payments?: Array<{ method: string; amount: number }>;
};

type InvoiceResponse = { data: Invoice[]; meta?: { total?: number } };

const orderTypeLabels: Record<string, string> = {
  dine_in: 'محلي',
  takeaway: 'سفري',
  delivery: 'توصيل',
  curbside: 'سيارة'
};

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

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn',
    calendar: 'gregory'
  }).format(date);
};

export default function SalesPage() {
  const { data, loading, source, error, refresh } = useApi<InvoiceResponse>('/sales?pageSize=100', demoInvoices as unknown as InvoiceResponse);
  const [filter, setFilter] = useState<'all' | 'sale' | 'return'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const rows = data.data || [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((invoice) => {
      const typeOk = filter === 'all' || invoice.type === filter;
      const text = `${invoice.number} ${invoice.customerName || ''} ${invoice.status}`.toLowerCase();
      return typeOk && (!needle || text.includes(needle));
    });
  }, [rows, filter, query]);

  const totals = useMemo(() => {
    const sales = rows.filter((row) => row.type === 'sale');
    const returns = rows.filter((row) => row.type === 'return');
    const sum = (list: Invoice[], key: keyof Invoice) =>
      list.reduce((total, row) => total + Number(row[key] || 0), 0);
    return {
      sales: sum(sales, 'total'),
      returns: sum(returns, 'total'),
      tax: sum(sales, 'tax') - sum(returns, 'tax'),
      due: sum(sales, 'due'),
      count: sales.length,
      avg: sales.length ? sum(sales, 'total') / sales.length : 0
    };
  }, [rows]);

  const openInvoice = async (invoice: Invoice) => {
    setSelected(invoice);
    if (!getToken()) return;
    setDetailLoading(true);
    try {
      const result = await apiGet<{ data: Invoice }>(`/sales/${invoice.id}`);
      setSelected(result.data);
    } catch {
      // Keep the list row as a graceful fallback.
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['الرقم', 'النوع', 'العميل', 'نوع الطلب', 'طريقة الدفع', 'المجموع', 'الضريبة', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة', 'ZATCA', 'التاريخ'];
    const lines = filtered.map((row) => [
      row.number,
      row.type === 'return' ? 'مرتجع' : 'بيع',
      row.customerName || 'عميل نقدي',
      orderTypeLabels[row.orderType || ''] || row.orderType || '',
      methodLabels[row.method || ''] || row.method || '',
      Number(row.subtotal || 0).toFixed(2),
      Number(row.tax || 0).toFixed(2),
      Number(row.total || 0).toFixed(2),
      Number(row.paid || 0).toFixed(2),
      Number(row.due || 0).toFixed(2),
      statusLabel(row.status),
      row.zatca?.status || '—',
      row.createdAt
    ]);
    const csv = '\uFEFF' + [header, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `talaltechno-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="المبيعات"
        title="الفواتير والمرتجعات"
        description="سجل موحد لفواتير البيع والمرتجعات مع حالة الدفع وربط ZATCA. استخدم البحث والتصدير للمراجعة السريعة."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={error} onRefresh={refresh} />
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Icon name="download" size={15} />
              تصدير CSV
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Icon name="printer" size={15} />
              طباعة
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المبيعات" value={formatSAR(totals.sales)} hint={`${totals.count} فاتورة بيع`} icon="sales" tone="green" />
        <StatCard label="المرتجعات" value={formatSAR(totals.returns)} hint="خصم من صافي المبيعات" icon="sales" tone="red" />
        <StatCard label="ضريبة القيمة المضافة" value={formatSAR(totals.tax)} hint="صافي ضريبة المخرجات" icon="accounting" tone="gold" />
        <StatCard label="مبالغ مستحقة" value={formatSAR(totals.due)} hint={`متوسط الفاتورة ${formatSAR(totals.avg)}`} icon="wallet" tone="navy" />
      </section>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>سجل الفواتير</CardTitle>
            <CardDescription>{filtered.length} سجل معروض من أصل {rows.length}.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Icon name="search" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث برقم الفاتورة أو العميل…"
                className="h-9 w-full pr-9 text-xs sm:w-64"
              />
            </div>
            <Segmented
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'الكل', count: rows.length },
                { value: 'sale', label: 'بيع', count: rows.filter((row) => row.type === 'sale').length },
                { value: 'return', label: 'مرتجع', count: rows.filter((row) => row.type === 'return').length }
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="receipt" title="لا توجد فواتير مطابقة" description="جرّب تغيير كلمة البحث أو نوع الفاتورة." />
            </div>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الفاتورة</TH>
                    <TH>العميل</TH>
                    <TH>الطلب</TH>
                    <TH>الدفع</TH>
                    <TH>الإجمالي</TH>
                    <TH>الضريبة</TH>
                    <TH>الحالة</TH>
                    <TH>ZATCA</TH>
                    <TH>الوقت</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((invoice) => (
                    <TR key={invoice.id}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className={`h-7 w-1 rounded-full ${invoice.type === 'return' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                          <div>
                            <p className="font-mono text-[11px] font-bold" dir="ltr">{invoice.number}</p>
                            <p className="text-[10px] text-muted-foreground">{invoice.type === 'return' ? 'مرتجع' : 'بيع'}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="max-w-[170px] truncate text-xs">{invoice.customerName || 'عميل نقدي'}</TD>
                      <TD className="text-[11px]">
                        {orderTypeLabels[invoice.orderType || ''] || '—'}
                        {invoice.tableName ? <span className="block text-[10px] text-muted-foreground">{invoice.tableName}</span> : null}
                      </TD>
                      <TD className="text-[11px]">{methodLabels[invoice.method || ''] || '—'}</TD>
                      <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{formatSAR(invoice.total)}</TD>
                      <TD className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">{formatSAR(invoice.tax)}</TD>
                      <TD>
                        <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : invoice.status === 'returned' ? 'gold' : 'secondary'}>
                          {statusLabel(invoice.status)}
                        </Badge>
                      </TD>
                      <TD>
                        {invoice.zatca?.status ? (
                          <Badge variant={invoice.zatca.status === 'CLEARED' ? 'success' : invoice.zatca.status === 'REPORTED' ? 'info' : 'warning'}>
                            {statusLabel(invoice.zatca.status)}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatTime(invoice.createdAt)}</TD>
                      <TD>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openInvoice(invoice)} aria-label={`عرض ${invoice.number}`}>
                          <Icon name="eye" size={15} />
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `فاتورة ${selected.number}` : 'فاتورة'}
        description={selected ? `${selected.customerName || 'عميل نقدي'} · ${orderTypeLabels[selected.orderType || ''] || 'بيع مباشر'}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => window.print()}>
              <Icon name="printer" size={15} />
              طباعة
            </Button>
            <Button variant="gold" onClick={() => setSelected(null)}>إغلاق</Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            {detailLoading ? <p className="text-[11px] text-muted-foreground">جارٍ تحميل تفاصيل الفاتورة من الـ API…</p> : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">الإجمالي شامل الضريبة</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums">{formatSAR(selected.total)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">المدفوع</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-300">{formatSAR(selected.paid)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">المتبقي</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-600 dark:text-amber-300">{formatSAR(selected.due)}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border p-3 text-xs">
                <p className="mb-2 font-bold">تفاصيل المبالغ</p>
                <div className="space-y-1.5 text-[11px]">
                  {[
                    ['المجموع قبل الضريبة', selected.subtotal],
                    ['الخصم', selected.discount],
                    ['رسوم الخدمة', selected.serviceCharge],
                    ['رسوم التوصيل', selected.deliveryFee],
                    ['ضريبة القيمة المضافة', selected.tax]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold tabular-nums">{formatSAR(Number(value || 0))}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-3 text-xs">
                <p className="mb-2 font-bold">الحالة والامتثال</p>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">حالة الدفع</span>
                    <Badge variant={selected.status === 'paid' ? 'success' : 'warning'}>{statusLabel(selected.status)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">حالة ZATCA</span>
                    <Badge variant="info">{statusLabel(selected.zatca?.status || 'pending')}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">طريقة الدفع</span>
                    <span className="font-semibold">{methodLabels[selected.method || ''] || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تكلفة البضاعة</span>
                    <span className="font-semibold tabular-nums">{formatSAR(selected.cogs || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {selected.items && selected.items.length > 0 ? (
              <TableWrap className="rounded-xl border">
                <Table>
                  <THead>
                    <TR>
                      <TH>الصنف</TH>
                      <TH>الكمية</TH>
                      <TH>السعر</TH>
                      <TH>الإجمالي</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {selected.items.map((item, index) => (
                      <TR key={`${item.name}-${index}`}>
                        <TD className="text-xs">{item.name}</TD>
                        <TD className="text-xs tabular-nums">{item.qty}</TD>
                        <TD className="text-xs tabular-nums">{formatSAR(item.price)}</TD>
                        <TD className="text-xs font-semibold tabular-nums">{formatSAR(item.total ?? item.price * item.qty)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : (
              <p className="rounded-xl border border-dashed bg-muted/20 p-3 text-[11px] leading-5 text-muted-foreground">
                تفاصيل الأصناف تُحمّل من الـ API عند تسجيل الدخول. في وضع العرض يظهر ملخص الفاتورة فقط.
              </p>
            )}

            {selected.zatca?.uuid ? (
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">UUID / ZATCA Sandbox</p>
                <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground" dir="ltr">{selected.zatca.uuid}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
