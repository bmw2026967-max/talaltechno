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
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoProducts } from '@/lib/demo';
import { apiPatch, getToken } from '@/lib/api';
import { formatNumber, formatSAR } from '@/lib/utils';

type RecipeLine = {
  materialId: string;
  materialName?: string;
  qty: number;
  unit?: string;
  cost?: number;
};

type Product = {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  name: string;
  nameEn?: string | null;
  sku: string;
  barcode?: string | null;
  type: string;
  price: number;
  cost: number;
  taxRate: number;
  unit: string;
  emoji?: string | null;
  active: boolean;
  available: boolean;
  minStock: number;
  stock: number;
  recipe: RecipeLine[];
};

type ProductsResponse = { data: Product[]; meta?: { total?: number } };

export default function ProductsPage() {
  const { data, loading, source, error, refresh } = useApi<ProductsResponse>('/products', demoProducts as unknown as ProductsResponse);
  const { toast } = useToast();
  const [rows, setRows] = useState<Product[]>([]);
  const [tab, setTab] = useState<'menu' | 'raw'>('menu');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setRows(data.data || []), [data]);

  const menu = rows.filter((row) => row.type === 'menu');
  const raw = rows.filter((row) => row.type === 'raw');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => row.type === tab)
      .filter((row) => !needle || `${row.name} ${row.nameEn || ''} ${row.sku}`.toLowerCase().includes(needle));
  }, [rows, tab, query]);

  const unavailable = menu.filter((row) => !row.available).length;
  const averageMargin = menu.length
    ? menu.reduce((total, row) => total + (row.price > 0 ? (row.price - row.cost) / row.price : 0), 0) / menu.length
    : 0;

  const toggleAvailability = async (product: Product) => {
    const next = !product.available;
    setBusy(product.id);
    if (getToken()) {
      try {
        await apiPatch(`/products/${product.id}`, { available: next });
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تحديث توفر الصنف.', 'error');
        setBusy(null);
        return;
      }
    }
    setRows((current) => current.map((row) => (row.id === product.id ? { ...row, available: next } : row)));
    if (selected?.id === product.id) setSelected({ ...selected, available: next });
    toast(`${product.name} أصبح ${next ? 'متوفراً' : 'غير متوفر (86)'}${getToken() ? '' : ' — محاكاة عرض'}.`, next ? 'success' : 'warning');
    setBusy(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="القائمة والوصفات"
        title="الأصناف والوصفات (BOM)"
        description="كل صنف قائمة مرتبط بوصفة مواد خام. يتحدد توفره تلقائياً من أرصدة المكونات، ويمكن إخفاؤه فوراً عند النفاد (86-ing)."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={error} onRefresh={refresh} />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Icon name="printer" size={15} />
              طباعة القائمة
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="أصناف القائمة" value={formatNumber(menu.length)} hint={`${formatNumber(menu.filter((row) => row.available).length)} متوفر الآن`} icon="products" tone="green" />
        <StatCard label="المواد الخام" value={formatNumber(raw.length)} hint="تُخصم تلقائياً عند البيع" icon="inventory" tone="navy" />
        <StatCard label="أصناف غير متوفرة" value={formatNumber(unavailable)} hint="مخفية أو نفدت مكوناتها" icon="alert" tone="gold" />
        <StatCard label="متوسط هامش الربح" value={`${(averageMargin * 100).toFixed(1)}%`} hint="قبل المصروفات التشغيلية" icon="trend" tone="green" />
      </section>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>دليل الأصناف</CardTitle>
            <CardDescription>اختر صنفاً لعرض الوصفة والتكلفة وتفاصيل التوفر.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Icon name="search" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو SKU…" className="h-9 pr-9 text-xs sm:w-60" />
            </div>
            <Segmented
              value={tab}
              onChange={setTab}
              items={[
                { value: 'menu', label: 'قائمة الطعام', count: menu.length },
                { value: 'raw', label: 'مواد خام', count: raw.length }
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {visible.length === 0 ? (
            <div className="p-5"><EmptyState icon="products" title="لا توجد أصناف" description="جرّب تغيير البحث أو التبويب." /></div>
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الصنف</TH>
                    <TH>الفئة</TH>
                    <TH>السعر</TH>
                    <TH>التكلفة</TH>
                    <TH>الهامش</TH>
                    <TH>{tab === 'menu' ? 'الوصفة' : 'الرصيد'}</TH>
                    <TH>الحالة</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {visible.map((row) => {
                    const margin = row.price > 0 ? ((row.price - row.cost) / row.price) * 100 : 0;
                    return (
                      <TR key={row.id}>
                        <TD>
                          <button type="button" className="flex items-center gap-2 text-right" onClick={() => setSelected(row)}>
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-lg">{row.emoji || '🍽️'}</span>
                            <span>
                              <span className="block text-xs font-bold">{row.name}</span>
                              <span className="block font-mono text-[10px] text-muted-foreground" dir="ltr">{row.sku}</span>
                            </span>
                          </button>
                        </TD>
                        <TD className="text-[11px] text-muted-foreground">{row.categoryName || '—'}</TD>
                        <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{row.price > 0 ? formatSAR(row.price) : '—'}</TD>
                        <TD className="whitespace-nowrap text-[11px] tabular-nums">{formatSAR(row.cost)}</TD>
                        <TD className="whitespace-nowrap text-[11px] font-semibold tabular-nums">
                          {row.price > 0 ? <span className={margin >= 50 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}>{margin.toFixed(1)}%</span> : '—'}
                        </TD>
                        <TD className="w-40">
                          {tab === 'menu' ? (
                            <div>
                              <p className="text-[11px] font-semibold">{row.recipe.length} مكونات</p>
                              <Progress className="mt-1.5" value={row.recipe.length} max={6} tone="green" />
                            </div>
                          ) : (
                            <div>
                              <p className="text-[11px] font-semibold tabular-nums">{formatNumber(row.stock)} {row.unit}</p>
                              <Progress
                                className="mt-1.5"
                                value={row.stock}
                                max={Math.max(row.minStock * 2, row.stock, 1)}
                                tone={row.stock <= 0 ? 'red' : row.minStock > 0 && row.stock <= row.minStock ? 'gold' : 'green'}
                              />
                            </div>
                          )}
                        </TD>
                        <TD>
                          <Badge variant={!row.active ? 'secondary' : row.available ? 'success' : 'warning'}>
                            {!row.active ? 'معطل' : row.available ? 'متوفر' : '86 / مخفي'}
                          </Badge>
                        </TD>
                        <TD>
                          <Button variant="ghost" size="sm" className="h-8 text-[11px]" onClick={() => toggleAvailability(row)} disabled={busy === row.id || !row.active}>
                            {busy === row.id ? <Icon name="refresh" size={13} className="animate-spin" /> : null}
                            {row.available ? 'إخفاء' : 'إتاحة'}
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
      </Card>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.emoji || '🍽️'} ${selected.name}` : 'صنف'}
        description={selected ? `${selected.nameEn || ''} · ${selected.categoryName || 'بدون فئة'} · ${selected.sku}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button>
            {selected && selected.type === 'menu' ? (
              <Button variant={selected.available ? 'destructive' : 'gold'} onClick={() => toggleAvailability(selected)} disabled={busy === selected.id}>
                {selected.available ? 'إخفاء الصنف (86)' : 'إتاحة الصنف'}
              </Button>
            ) : null}
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">سعر البيع</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{selected.price > 0 ? formatSAR(selected.price) : '—'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">تكلفة المواد</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{formatSAR(selected.cost)}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">هامش الربح</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">
                  {selected.price > 0 ? `${(((selected.price - selected.cost) / selected.price) * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">ضريبة القيمة المضافة</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums">{selected.taxRate}%</p>
              </div>
            </div>

            {selected.type === 'menu' ? (
              selected.recipe.length > 0 ? (
                <TableWrap className="rounded-xl border">
                  <Table>
                    <THead>
                      <TR>
                        <TH>المادة الخام</TH>
                        <TH>الكمية</TH>
                        <TH>تكلفة الوحدة</TH>
                        <TH>تكلفة السطر</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {selected.recipe.map((line) => (
                        <TR key={line.materialId}>
                          <TD className="text-xs font-semibold">{line.materialName || line.materialId}</TD>
                          <TD className="text-xs tabular-nums">{line.qty} {line.unit || ''}</TD>
                          <TD className="text-[11px] tabular-nums">{formatSAR(line.cost || 0)}</TD>
                          <TD className="text-[11px] font-semibold tabular-nums">{formatSAR(line.qty * (line.cost || 0))}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              ) : (
                <EmptyState icon="inventory" title="لا توجد وصفة" description="أضف مكونات BOM ليتم خصم المخزون تلقائياً عند البيع." />
              )
            ) : (
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">الرصيد الحالي</span>
                  <span className="text-sm font-extrabold tabular-nums">{formatNumber(selected.stock)} {selected.unit}</span>
                </div>
                <Progress
                  className="mt-2"
                  value={selected.stock}
                  max={Math.max(selected.minStock * 2, selected.stock, 1)}
                  tone={selected.stock <= 0 ? 'red' : selected.stock <= selected.minStock ? 'gold' : 'green'}
                />
                <p className="mt-2 text-[10px] text-muted-foreground">الحد الأدنى: {formatNumber(selected.minStock)} {selected.unit}</p>
              </div>
            )}

            <p className="rounded-xl border border-dashed bg-muted/20 p-3 text-[10px] leading-5 text-muted-foreground">
              تعديل الوصفات والأسعار متاح عبر واجهات <span className="font-mono" dir="ltr">POST/PATCH /products</span> في الـ API.
              الواجهة الحالية للعرض والتحكم السريع في توفر الأصناف.
            </p>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
