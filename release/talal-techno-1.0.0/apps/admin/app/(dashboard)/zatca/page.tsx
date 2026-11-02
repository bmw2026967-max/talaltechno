'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoChain, demoZatcaInvoices, demoZatcaStatus } from '@/lib/demo';
import { apiGet, apiPost, getToken } from '@/lib/api';
import { formatDate, formatSAR, statusLabel } from '@/lib/utils';

type ZatcaStatus = {
  environment: string;
  certified: boolean;
  warning: string;
  counts: { reported: number; cleared: number; pending: number; rejected: number; total: number };
  lastHash: string;
  runtime: {
    environment: string;
    vatNumber: string;
    commonName: string;
    serialNumber: string;
    hasPrivateKey: boolean;
    hasCertificate: boolean;
  };
  checklist: Array<{ key: string; label: string; ok: boolean }>;
};

type ZatcaInvoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  type: string;
  uuid: string;
  invoiceHash: string;
  previousHash: string;
  qr?: string | null;
  signature?: string | null;
  status: string;
  environment: string;
  issuedAt: string;
  warning?: string;
  xml?: string | null;
  items?: Array<{ name: string; qty: number; price: number; taxAmount: number; total: number }>;
};

type StatusResponse = { data: ZatcaStatus };
type InvoicesResponse = { data: ZatcaInvoice[]; meta?: { total?: number } };
type ChainResponse = { data: { valid: boolean; checked: number; broken: unknown[]; tampered: unknown[]; lastHash: string; environment: string; note: string } };

export default function ZatcaPage() {
  const statusApi = useApi<StatusResponse>('/zatca/status', demoZatcaStatus as unknown as StatusResponse);
  const invoicesApi = useApi<InvoicesResponse>('/zatca/invoices?pageSize=100', demoZatcaInvoices as unknown as InvoicesResponse);
  const chainApi = useApi<ChainResponse>('/zatca/chain/verify', demoChain as unknown as ChainResponse);
  const { toast } = useToast();

  const [rows, setRows] = useState<ZatcaInvoice[]>([]);
  const [filter, setFilter] = useState<'all' | 'REPORTED' | 'CLEARED' | 'PENDING'>('all');
  const [selected, setSelected] = useState<ZatcaInvoice | null>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setRows(invoicesApi.data.data || []), [invoicesApi.data]);

  const status = statusApi.data.data;
  const chain = chainApi.data.data;
  const loading = statusApi.loading || invoicesApi.loading || chainApi.loading;
  const source = statusApi.source;

  const filtered = useMemo(
    () => rows.filter((row) => filter === 'all' || row.status === filter),
    [rows, filter]
  );

  const refreshAll = () => {
    statusApi.refresh();
    invoicesApi.refresh();
    chainApi.refresh();
  };

  const openInvoice = async (invoice: ZatcaInvoice) => {
    setSelected(invoice);
    setXml(invoice.xml || null);
    if (!getToken()) return;
    try {
      const result = await apiGet<{ data: ZatcaInvoice }>(`/zatca/invoices/${invoice.id}`);
      setSelected(result.data);
      setXml(result.data.xml || null);
    } catch {
      // Keep the list row.
    }
  };

  const report = async (invoice: ZatcaInvoice, next: 'REPORTED' | 'CLEARED') => {
    setBusy(true);
    if (getToken()) {
      try {
        await apiPost(`/zatca/invoices/${invoice.id}/report`, { status: next });
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تحديث حالة ZATCA.', 'error');
        setBusy(false);
        return;
      }
    }
    setRows((current) => current.map((row) => (row.id === invoice.id ? { ...row, status: next } : row)));
    setSelected((current) => (current && current.id === invoice.id ? { ...current, status: next } : current));
    toast(`تم تعليم ${invoice.invoiceNumber} كـ «${statusLabel(next)}» — Sandbox فقط.`, next === 'CLEARED' ? 'success' : 'info');
    setBusy(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="الامتثال والفوترة الإلكترونية"
        title="مركز ZATCA Sandbox"
        description="فوترة UBL 2.1، رمز QR، سلسلة تجزئة، وتوقيع ECDSA تجريبي. هذه البيئة للمحاكاة والتطوير وليست اعتماداً رسمياً."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={statusApi.error} onRefresh={refreshAll} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="download" size={15} />
              تصدير التقرير
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-xs leading-6 text-amber-800 dark:text-amber-200">
        <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">إخلاء مسؤولية إلزامي</p>
          <p>{status.warning || 'محاكاة Sandbox فقط — ليست اعتماداً رسمياً من هيئة الزكاة والضريبة والجمارك.'}</p>
        </div>
        <Badge variant="warning" className="mr-auto hidden shrink-0 sm:inline-flex">غير معتمد</Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مُبلّغ عنه" value={String(status.counts.reported)} hint="Reported — Sandbox" icon="zatca" tone="navy" />
        <StatCard label="مطابق / Cleared" value={String(status.counts.cleared)} hint="محاكاة استجابة المنصة" icon="check" tone="green" />
        <StatCard label="معلّق" value={String(status.counts.pending)} hint="بانتظار المعالجة" icon="clock" tone="gold" />
        <StatCard label="سلسلة التجزئة" value={chain.valid ? 'سليمة' : 'مكسورة'} hint={`تم فحص ${chain.checked} فاتورة`} icon="shield" tone={chain.valid ? 'green' : 'red'} />
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>إعدادات بيئة Sandbox</CardTitle>
            <CardDescription>القيم التشغيلية غير السرية فقط.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11px]">
            {[
              ['البيئة', status.runtime.environment],
              ['الرقم الضريبي', status.runtime.vatNumber],
              ['الاسم الشائع', status.runtime.commonName],
              ['الرقم التسلسلي', status.runtime.serialNumber]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="break-all text-left font-mono text-[10px] font-semibold" dir="ltr">{value || '—'}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">المفتاح الخاص</span>
              <Badge variant={status.runtime.hasPrivateKey ? 'success' : 'secondary'}>
                {status.runtime.hasPrivateKey ? 'مهيأ' : 'غير مهيأ (Mock)'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <span className="text-muted-foreground">الشهادة / CSID</span>
              <Badge variant={status.runtime.hasCertificate ? 'success' : 'secondary'}>
                {status.runtime.hasCertificate ? 'مهيأة' : 'غير مهيأة (Mock)'}
              </Badge>
            </div>
            <p className="rounded-lg border border-dashed p-2.5 leading-5 text-muted-foreground">
              لا تُخزَّن مفاتيح الإنتاج في المستودع. استخدم متغيرات البيئة أو مدير أسرار خارجي عند الربط الحقيقي.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قائمة التحقق</CardTitle>
            <CardDescription>ما يلزم قبل الانتقال لبيئة الامتثال الحقيقية.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {status.checklist.map((item) => (
              <div key={item.key} className="flex items-center gap-2.5 rounded-xl border bg-muted/20 px-3 py-2.5">
                <span className={`grid h-6 w-6 place-items-center rounded-full ${item.ok ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
                  <Icon name={item.ok ? 'check' : 'alert'} size={13} />
                </span>
                <span className="text-[11px] font-medium">{item.label}</span>
                <Badge variant={item.ok ? 'success' : 'warning'} className="mr-auto">
                  {item.ok ? 'جاهز' : 'مطلوب'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تحقق سلسلة التجزئة</CardTitle>
            <CardDescription>PIH → Invoice Hash لكل فاتورة.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`rounded-2xl border p-4 ${chain.valid ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${chain.valid ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/15 text-red-700 dark:text-red-300'}`}>
                  <Icon name={chain.valid ? 'shield' : 'alert'} size={21} />
                </span>
                <div>
                  <p className="text-sm font-bold">{chain.valid ? 'السلسلة سليمة' : 'السلسلة مكسورة'}</p>
                  <p className="text-[10px] text-muted-foreground">{chain.checked} فاتورة مفحوصة · {chain.broken.length} كسر · {chain.tampered.length} تلاعب</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-muted-foreground">آخر تجزئة (PIH)</p>
                <p className="mt-1 break-all rounded-lg bg-card p-2 font-mono text-[9px] leading-4 text-muted-foreground" dir="ltr">{chain.lastHash}</p>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">{chain.note}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>فواتير ZATCA</CardTitle>
            <CardDescription>سجل الفواتير التجريبية وحالة التبليغ. اضغط لعرض UUID والتجزئة.</CardDescription>
          </div>
          <Segmented
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'الكل', count: rows.length },
              { value: 'REPORTED', label: 'مُبلّغ', count: rows.filter((row) => row.status === 'REPORTED').length },
              { value: 'CLEARED', label: 'مطابق', count: rows.filter((row) => row.status === 'CLEARED').length },
              { value: 'PENDING', label: 'معلّق', count: rows.filter((row) => row.status === 'PENDING').length }
            ]}
          />
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>الفاتورة</TH>
                  <TH>العميل</TH>
                  <TH>النوع</TH>
                  <TH>الإجمالي</TH>
                  <TH>الحالة</TH>
                  <TH>الإصدار</TH>
                  <TH>التجزئة</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {filtered.map((row) => (
                  <TR key={row.id}>
                    <TD className="font-mono text-[11px] font-bold" dir="ltr">{row.invoiceNumber}</TD>
                    <TD className="max-w-[160px] truncate text-xs">{row.customerName || 'عميل نقدي'}</TD>
                    <TD><Badge variant="secondary">{row.type === 'standard' ? 'قياسية' : 'مبسطة'}</Badge></TD>
                    <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{formatSAR(row.total)}</TD>
                    <TD>
                      <Badge variant={row.status === 'CLEARED' ? 'success' : row.status === 'REPORTED' ? 'info' : row.status === 'REJECTED' ? 'danger' : 'warning'}>
                        {statusLabel(row.status)}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatDate(row.issuedAt)}</TD>
                    <TD className="max-w-[130px] truncate font-mono text-[9px] text-muted-foreground" dir="ltr">{row.invoiceHash?.slice(0, 16)}…</TD>
                    <TD>
                      <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => openInvoice(row)}>
                        <Icon name="eye" size={13} />
                        عرض
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `فاتورة ZATCA — ${selected.invoiceNumber}` : 'فاتورة ZATCA'}
        description="بيانات الفاتورة التجريبية وسلسلة التجزئة. لا تمثل اعتماداً رسمياً."
        size="lg"
        footer={
          selected ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button>
              <Button variant="secondary" onClick={() => report(selected, 'REPORTED')} disabled={busy}>
                <Icon name="zatca" size={15} />
                تعليم كمُبلّغ
              </Button>
              <Button variant="gold" onClick={() => report(selected, 'CLEARED')} disabled={busy}>
                <Icon name="check" size={15} />
                تعليم كمطابق
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selected.status === 'CLEARED' ? 'success' : selected.status === 'REPORTED' ? 'info' : 'warning'}>{statusLabel(selected.status)}</Badge>
              <Badge variant="gold">Sandbox</Badge>
              <Badge variant="outline">{selected.type === 'standard' ? 'فاتورة قياسية' : 'فاتورة مبسطة'}</Badge>
              <span className="mr-auto text-sm font-extrabold tabular-nums">{formatSAR(selected.total)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">UUID</p>
                <p className="mt-1 break-all font-mono text-[10px]" dir="ltr">{selected.uuid}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">تاريخ الإصدار</p>
                <p className="mt-1 text-[11px] font-semibold">{formatDate(selected.issuedAt)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">Invoice Hash</p>
                <p className="mt-1 break-all font-mono text-[9px] leading-4" dir="ltr">{selected.invoiceHash}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">Previous Hash (PIH)</p>
                <p className="mt-1 break-all font-mono text-[9px] leading-4" dir="ltr">{selected.previousHash}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <div className="grid place-items-center rounded-xl border bg-muted/20 p-3">
                {selected.qr && selected.qr.startsWith('data:image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.qr} alt="QR الفاتورة" className="h-32 w-32 rounded-lg bg-white p-1" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-[10px] text-muted-foreground">
                    <span className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed">
                      <Icon name="qr" size={36} />
                    </span>
                    QR يُولّد من محرك ZATCA عند البيع
                  </div>
                )}
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] font-bold text-muted-foreground">XML / UBL 2.1</p>
                {xml ? (
                  <pre className="scrollbar-thin mt-2 max-h-40 overflow-auto rounded-lg bg-card p-2 text-left font-mono text-[9px] leading-4" dir="ltr">{xml.slice(0, 4000)}</pre>
                ) : (
                  <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                    يتم تحميل XML من الـ API عند تسجيل الدخول. في وضع العرض لا يُعرض XML كامل.
                  </p>
                )}
              </div>
            </div>

            {selected.items && selected.items.length > 0 ? (
              <TableWrap className="rounded-xl border">
                <Table>
                  <THead>
                    <TR><TH>الصنف</TH><TH>الكمية</TH><TH>السعر</TH><TH>الضريبة</TH><TH>الإجمالي</TH></TR>
                  </THead>
                  <TBody>
                    {selected.items.map((item, index) => (
                      <TR key={`${item.name}-${index}`}>
                        <TD className="text-xs">{item.name}</TD>
                        <TD className="text-xs tabular-nums">{item.qty}</TD>
                        <TD className="text-xs tabular-nums">{formatSAR(item.price)}</TD>
                        <TD className="text-xs tabular-nums">{formatSAR(item.taxAmount)}</TD>
                        <TD className="text-xs font-semibold tabular-nums">{formatSAR(item.total)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : null}

            <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[10px] leading-5 text-amber-800 dark:text-amber-200">
              هذا السجل محاكاة تعليمية. لا يعني التبليغ أو المطابقة هنا أن المنشأة معتمدة من ZATCA. يلزم اجتياز
              اختبارات الامتثال وربط CSID إنتاجي بشكل منفصل.
            </p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
