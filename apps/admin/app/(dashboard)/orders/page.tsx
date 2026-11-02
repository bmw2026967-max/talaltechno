'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoOrders } from '@/lib/demo';
import { apiPatch, getToken } from '@/lib/api';
import { formatSAR, statusLabel } from '@/lib/utils';

type OrderItem = { name: string; qty: number; notes?: string };
type Order = {
  id: string;
  number: string;
  type: string;
  status: string;
  table?: { name: string } | null;
  tableName?: string | null;
  total: number;
  platform?: string;
  platformName?: string;
  createdAt: string;
  items: OrderItem[];
  notes?: string;
};

type OrderResponse = { data: Order[] };

const columns: Array<{ status: string; label: string; tone: string; accent: string }> = [
  { status: 'NEW', label: 'جديد', tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', accent: 'border-t-sky-500' },
  { status: 'PREPARING', label: 'قيد التحضير', tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', accent: 'border-t-amber-500' },
  { status: 'READY', label: 'جاهز للتقديم', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', accent: 'border-t-emerald-500' },
  { status: 'SERVED', label: 'مُقدّم', tone: 'bg-muted text-muted-foreground', accent: 'border-t-border' }
];

const nextStatus: Record<string, string> = {
  NEW: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
  SERVED: 'COMPLETED'
};

const nextLabel: Record<string, string> = {
  NEW: 'بدء التحضير',
  PREPARING: 'جاهز',
  READY: 'تقديم',
  SERVED: 'إكمال'
};

const typeLabels: Record<string, string> = {
  DINE_IN: 'محلي',
  TAKEAWAY: 'سفري',
  DELIVERY: 'توصيل',
  CURBSIDE: 'سيارة'
};

const typeIcons: Record<string, 'orders' | 'cart' | 'integrations' | 'receipt'> = {
  DINE_IN: 'orders',
  TAKEAWAY: 'cart',
  DELIVERY: 'integrations',
  CURBSIDE: 'receipt'
};

function minutesSince(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.max(0, Math.floor(diff / 60000));
}

export default function OrdersPage() {
  const { data, loading, source, error, refresh } = useApi<OrderResponse>('/orders', demoOrders as unknown as OrderResponse);
  const { toast } = useToast();
  const [rows, setRows] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRows(data.data || []);
  }, [data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((order) => {
      if (!needle) return true;
      return `${order.number} ${order.table?.name || order.tableName || ''} ${order.platformName || order.platform || ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query]);

  const active = filtered.filter((order) => !['COMPLETED', 'CANCELLED'].includes(order.status));
  const counts = {
    new: rows.filter((row) => row.status === 'NEW').length,
    preparing: rows.filter((row) => row.status === 'PREPARING').length,
    ready: rows.filter((row) => row.status === 'READY').length,
    done: rows.filter((row) => row.status === 'COMPLETED').length,
    cancelled: rows.filter((row) => row.status === 'CANCELLED').length
  };

  const advance = async (order: Order) => {
    const next = nextStatus[order.status];
    if (!next) return;
    setBusy(order.id);
    if (getToken()) {
      try {
        await apiPatch(`/orders/${order.id}/status`, { status: next.toLowerCase() });
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تحديث حالة الطلب.', 'error');
        setBusy(null);
        return;
      }
    }
    setRows((current) =>
      current.map((row) => (row.id === order.id ? { ...row, status: next } : row))
    );
    toast(`تم تحديث ${order.number} إلى «${statusLabel(next)}»${getToken() ? '' : ' — محاكاة عرض'}`, 'success');
    setBusy(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="المطبخ والطلبات"
        title="لوحة الطلبات الحية"
        description="تابع الطلبات من الاستلام حتى التقديم. شاشة KDS تعمل باللمس وتدعم المحلي والسفري والتوصيل وطلبات السيارات."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={error} onRefresh={refresh} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="printer" size={15} />
              طباعة الشاشة
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="طلبات جديدة" value={String(counts.new)} hint="بانتظار بدء التحضير" icon="orders" tone="navy" />
        <StatCard label="قيد التحضير" value={String(counts.preparing)} hint="داخل المطبخ الآن" icon="flame" tone="gold" />
        <StatCard label="جاهزة" value={String(counts.ready)} hint="بانتظار التقديم أو التسليم" icon="check" tone="green" />
        <StatCard label="مكتملة اليوم" value={String(counts.done)} hint={`${counts.cancelled} ملغاة`} icon="receipt" tone="muted" />
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Icon name="search" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث برقم الطلب أو الطاولة أو المنصة…"
            className="h-10 pr-9 text-xs sm:w-80"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <Badge variant="outline">{active.length} طلب نشط</Badge>
          <Badge variant="outline">تحديث يدوي</Badge>
          <Badge variant="gold">KDS Mock</Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {columns.map((column) => {
          const list = active.filter((order) => order.status === column.status);
          return (
            <section key={column.status} className={`rounded-2xl border border-t-4 bg-muted/20 ${column.accent}`}>
              <div className="flex items-center justify-between gap-2 border-b bg-card/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${column.tone}`}>{column.label}</span>
                </div>
                <span className="text-xs font-extrabold tabular-nums text-muted-foreground">{list.length}</span>
              </div>
              <div className="scrollbar-thin max-h-[560px] space-y-3 overflow-y-auto p-3">
                {list.map((order) => {
                  const minutes = minutesSince(order.createdAt);
                  const late = minutes >= 15 && order.status !== 'SERVED';
                  const tableName = order.table?.name || order.tableName;
                  return (
                    <article key={order.id} className="rounded-2xl border bg-card p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                            <Icon name={typeIcons[order.type] || 'orders'} size={15} />
                          </span>
                          <div>
                            <p className="font-mono text-[11px] font-extrabold" dir="ltr">{order.number}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {typeLabels[order.type] || order.type}
                              {tableName ? ` · ${tableName}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant={late ? 'danger' : 'outline'} className="tabular-nums">
                          <Icon name="clock" size={11} />
                          {minutes} د
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-1.5 rounded-xl bg-muted/35 p-2.5">
                        {order.items.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-2 text-[11px]">
                            <span className="flex items-start gap-1.5">
                              <span className="mt-0.5 grid h-4 min-w-4 place-items-center rounded bg-card px-1 text-[9px] font-bold tabular-nums">
                                {item.qty}
                              </span>
                              <span className="font-medium">{item.name}</span>
                            </span>
                            {item.notes ? <span className="text-[9px] text-amber-600 dark:text-amber-300">{item.notes}</span> : null}
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-extrabold tabular-nums">{formatSAR(order.total)}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {order.platformName || order.platform || 'مباشر'}
                          </p>
                        </div>
                        {nextStatus[order.status] ? (
                          <Button
                            size="sm"
                            variant={order.status === 'READY' ? 'gold' : 'default'}
                            className="h-8 px-3 text-[11px]"
                            onClick={() => advance(order)}
                            disabled={busy === order.id}
                          >
                            {busy === order.id ? <Icon name="refresh" size={13} className="animate-spin" /> : null}
                            {nextLabel[order.status]}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                {list.length === 0 ? (
                  <div className="rounded-xl border border-dashed py-10 text-center text-[11px] text-muted-foreground">
                    لا توجد طلبات في هذه المرحلة
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>ملاحظات تشغيل المطبخ</CardTitle>
          <CardDescription>سلوك الشاشة في نسخة Sandbox.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-[11px] leading-6 text-muted-foreground sm:grid-cols-3">
          <p className="rounded-xl border bg-muted/20 p-3">
            <span className="mb-1 flex items-center gap-1.5 font-bold text-foreground"><Icon name="clock" size={14} /> مؤقتات الطلبات</span>
            يتحول الطلب إلى لون تحذيري بعد 15 دقيقة. المؤقتات للعرض فقط ولا تُرسل إشعارات خارجية.
          </p>
          <p className="rounded-xl border bg-muted/20 p-3">
            <span className="mb-1 flex items-center gap-1.5 font-bold text-foreground"><Icon name="flame" size={14} /> 86-ing</span>
            إخفاء صنف من القائمة يتم من صفحة الأصناف. الطلبات الحالية لا تتأثر عند نفاد المكونات.
          </p>
          <p className="rounded-xl border bg-muted/20 p-3">
            <span className="mb-1 flex items-center gap-1.5 font-bold text-foreground"><Icon name="integrations" size={14} /> قنوات التوصيل</span>
            طلبات HungerStation وJahez وغيرها محاكاة. لا يتم الاتصال بمنصات حقيقية في هذه النسخة.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
