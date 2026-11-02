'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { SalesChart, ChartLegend } from '@/components/sales-chart';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useApi } from '@/lib/use-api';
import { demoDashboard, demoRecent, demoTopProducts, demoTrend } from '@/lib/demo';
import { formatNumber, formatSAR, shortDate, statusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const dashboard = useApi('/dashboard', demoDashboard);
  const trend = useApi('/dashboard/sales-trend?days=7', demoTrend);
  const top = useApi('/dashboard/top-products?days=30&limit=6', demoTopProducts);
  const recent = useApi('/dashboard/recent', demoRecent);

  const data = dashboard.data.data;
  const loading = dashboard.loading || trend.loading || top.loading || recent.loading;
  const todayLabel = new Intl.DateTimeFormat('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    calendar: 'gregory',
    numberingSystem: 'latn'
  }).format(new Date());

  const maxRevenue = Math.max(1, ...top.data.data.map((row) => row.revenue));

  return (
    <>
      <PageHeader
        eyebrow="TALAL TECHNO · CLOUD ERP + POS"
        title="لوحة التحكم"
        description={`نظرة حية على أداء مطعمك — ${todayLabel}. كل الأرقام تجريبية أو من Sandbox.`}
        actions={
          <>
            <SourceBadge
              source={dashboard.source}
              loading={loading}
              error={dashboard.error}
              onRefresh={() => {
                dashboard.refresh();
                trend.refresh();
                top.refresh();
                recent.refresh();
              }}
            />
            <Button onClick={() => window.print()} variant="outline" size="sm">
              <Icon name="download" size={15} />
              تصدير التقرير
            </Button>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => window.location.assign('/sales')}>
              <Icon name="sales" size={15} />
              عرض المبيعات
            </Button>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-xs leading-6 text-[#7a5d0b] dark:text-brand-gold">
        <Icon name="shield" size={18} className="mt-0.5 shrink-0" />
        <p>
          <span className="font-bold">بيئة عرض Sandbox:</span> ZATCA، المدفوعات، التوصيل والطباعة محاكاة كاملة. لا
          تُجرى أي اتصالات إنتاجية ولا يوجد ادعاء باعتماد رسمي من هيئة الزكاة والضريبة والجمارك أو ساما.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="مؤشرات الأداء">
        <StatCard
          label="مبيعات اليوم"
          value={formatSAR(data.today.sales)}
          hint={`${formatNumber(data.today.orders)} طلب · ضريبة ${formatSAR(data.today.tax)}`}
          icon="sales"
          tone="green"
          footer={
            <span className="flex items-center justify-between">
              <span>مرتجعات اليوم</span>
              <span className="font-semibold text-red-600 dark:text-red-300">{formatSAR(data.today.refunds)}</span>
            </span>
          }
        />
        <StatCard
          label="متوسط الفاتورة"
          value={formatSAR(data.today.avgTicket)}
          hint="محسوب على فواتير البيع اليوم"
          icon="receipt"
          tone="gold"
          footer={
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
              <Icon name="trend" size={12} />
              إجمالي اليوم {formatSAR(data.today.gross)}
            </span>
          }
        />
        <StatCard
          label="صافي ربح الشهر"
          value={formatSAR(data.month.profit)}
          hint={`تكلفة البضاعة ${formatSAR(data.month.cogs)}`}
          icon="trend"
          tone="navy"
          footer={
            <span className="flex items-center justify-between">
              <span>مبيعات الشهر</span>
              <span className="font-semibold text-foreground">{formatSAR(data.month.sales)}</span>
            </span>
          }
        />
        <StatCard
          label="الطلبات النشطة"
          value={formatNumber(data.openChecks)}
          hint={`${formatNumber(data.kitchenQueue)} في المطبخ · ${formatNumber(data.deliveryOrders)} توصيل`}
          icon="orders"
          tone="green"
          footer={
            <Link href="/orders" className="flex items-center justify-between text-primary hover:underline">
              <span>فتح لوحة الطلبات</span>
              <Icon name="arrow-left" size={12} />
            </Link>
          }
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>اتجاه المبيعات — آخر 7 أيام</CardTitle>
              <CardDescription>شامل الضريبة، مع خط المرتجعات. البيانات بالريال السعودي.</CardDescription>
            </div>
            <ChartLegend />
          </CardHeader>
          <CardContent>
            <SalesChart data={trend.data.data} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>العمليات الآن</CardTitle>
            <CardDescription>نظرة سريعة على ما يحتاج انتباهك.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { href: '/orders', icon: 'flame' as const, label: 'طلبات في المطبخ', value: data.kitchenQueue, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
              { href: '/orders', icon: 'orders' as const, label: 'شيكات مفتوحة', value: data.openChecks, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
              { href: '/integrations', icon: 'integrations' as const, label: 'طلبات توصيل نشطة', value: data.deliveryOrders, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' }
            ].map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex min-h-14 items-center gap-3 rounded-xl border bg-muted/20 px-3 transition hover:bg-muted/50"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${row.tone}`}>
                  <Icon name={row.icon} size={17} />
                </span>
                <span className="flex-1 text-xs font-semibold">{row.label}</span>
                <span className="text-lg font-extrabold tabular-nums">{formatNumber(row.value)}</span>
                <Icon name="arrow-left" size={13} className="text-muted-foreground" />
              </Link>
            ))}

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Icon name="zatca" size={15} className="text-emerald-600 dark:text-emerald-300" />
                  سلسلة ZATCA Sandbox
                </span>
                <Badge variant={data.zatca.chainValid ? 'success' : 'danger'}>
                  {data.zatca.chainValid ? 'سليمة' : 'مكسورة'}
                </Badge>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                تم فحص {formatNumber(data.zatca.chainChecked)} فاتورة · {formatNumber(data.zatca.reported)} مُبلّغ ·{' '}
                {formatNumber(data.zatca.cleared)} مطابق.
              </p>
              <Link href="/zatca" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                فتح مركز الامتثال
                <Icon name="arrow-left" size={12} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>الأصناف الأكثر مبيعاً</CardTitle>
              <CardDescription>آخر 30 يوماً — الإيراد والربح الإجمالي.</CardDescription>
            </div>
            <Link href="/products" className="text-[11px] font-bold text-primary hover:underline">
              كل الأصناف
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {top.data.data.map((row, index) => (
              <div key={row.productId} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
                  {formatNumber(index + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-xs font-bold">{row.name}</p>
                    <p className="shrink-0 text-[11px] font-semibold tabular-nums">{formatSAR(row.revenue)}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={row.revenue} max={maxRevenue} tone={index === 0 ? 'gold' : 'green'} />
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatNumber(row.qty)} وحدة</span>
                  </div>
                </div>
                <span className="hidden w-20 text-left text-[10px] text-emerald-600 dark:text-emerald-300 sm:block">
                  +{formatSAR(row.profit)}
                </span>
              </div>
            ))}
            {top.data.data.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">لا توجد مبيعات في هذه الفترة.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>نقص المخزون</CardTitle>
              <CardDescription>مواد خام وصلت للحد الأدنى.</CardDescription>
            </div>
            <Badge variant="warning">{formatNumber(data.lowStock.length)}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStock.map((row) => (
              <div key={row.productId} className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold">{row.name}</p>
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    {row.stock} / {row.minStock} {row.unit}
                  </span>
                </div>
                <Progress className="mt-2" value={row.stock} max={row.minStock || 1} tone="gold" />
              </div>
            ))}
            {data.lowStock.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">كل المواد ضمن الحدود الآمنة.</p>
            ) : (
              <Link href="/inventory" className="flex items-center justify-center gap-1 rounded-xl border border-dashed py-2.5 text-[11px] font-bold text-primary hover:bg-muted/40">
                إدارة المخزون والهوالك
                <Icon name="arrow-left" size={12} />
              </Link>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>أحدث الفواتير</CardTitle>
              <CardDescription>آخر العمليات المسجلة في النظام.</CardDescription>
            </div>
            <Link href="/sales" className="text-[11px] font-bold text-primary hover:underline">
              كل الفواتير
            </Link>
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
                    <TH>الوقت</TH>
                  </TR>
                </THead>
                <TBody>
                  {recent.data.data.invoices.map((invoice) => (
                    <TR key={invoice.id}>
                      <TD className="font-mono text-[11px] font-bold" dir="ltr">{invoice.number}</TD>
                      <TD className="max-w-[160px] truncate text-xs">{invoice.customerName || 'عميل نقدي'}</TD>
                      <TD>
                        <Badge variant={invoice.type === 'return' ? 'warning' : 'default'}>
                          {invoice.type === 'return' ? 'مرتجع' : 'بيع'}
                        </Badge>
                      </TD>
                      <TD className="text-xs font-bold tabular-nums">{formatSAR(invoice.total)}</TD>
                      <TD>
                        <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : 'secondary'}>
                          {statusLabel(invoice.status)}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{shortDate(invoice.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>طلبات حية</CardTitle>
            <CardDescription>آخر الطلبات من كل القنوات.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recent.data.data.orders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-card text-muted-foreground">
                  <Icon name={order.type === 'delivery' ? 'integrations' : order.type === 'dine_in' ? 'orders' : 'cart'} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] font-bold" dir="ltr">{order.number}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {order.tableName ? `طاولة ${order.tableName}` : statusLabel(order.type)} · {order.items} صنف
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold tabular-nums">{formatSAR(order.total)}</p>
                  <Badge variant={order.status === 'new' ? 'info' : order.status === 'preparing' ? 'warning' : 'success'} className="mt-0.5">
                    {statusLabel(order.status)}
                  </Badge>
                </div>
              </div>
            ))}
            <Link href="/orders" className="flex items-center justify-center gap-1 rounded-xl border border-dashed py-2.5 text-[11px] font-bold text-primary hover:bg-muted/40">
              لوحة المطبخ والطلبات
              <Icon name="arrow-left" size={12} />
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
