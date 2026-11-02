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
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoAvailability, demoMaterials, demoMoves } from '@/lib/demo';
import { apiPost, getToken } from '@/lib/api';
import { formatDate, formatNumber, formatSAR } from '@/lib/utils';

type Material = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  cost: number;
  stock: number;
  minStock: number;
  value: number;
  low: boolean;
  out: boolean;
};

type Move = {
  id: string;
  productName: string;
  warehouse: string;
  type: string;
  qty: number;
  unitCost: number;
  value: number;
  referenceNumber: string;
  note: string;
  createdAt: string;
};

type Availability = {
  id: string;
  name: string;
  category: string | null;
  recipe: Array<{ materialId: string; qty: number }>;
  availableServings: number;
  available: boolean;
};

type MaterialsResponse = { data: Material[]; meta?: { total: number; low: number; out: number; value: number } };
type MovesResponse = { data: Move[] };
type AvailabilityResponse = { data: Availability[] };

const moveLabels: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'secondary' }> = {
  sale: { label: 'صرف بيع', variant: 'success' },
  purchase: { label: 'استلام شراء', variant: 'info' },
  waste: { label: 'هالك', variant: 'danger' },
  adjustment: { label: 'تسوية جرد', variant: 'warning' },
  transfer_in: { label: 'تحويل وارد', variant: 'success' },
  transfer_out: { label: 'تحويل صادر', variant: 'warning' },
  return: { label: 'مرتجع', variant: 'info' }
};

export default function InventoryPage() {
  const materialsApi = useApi<MaterialsResponse>('/inventory/materials', demoMaterials as unknown as MaterialsResponse);
  const movesApi = useApi<MovesResponse>('/inventory/moves?limit=100', demoMoves as unknown as MovesResponse);
  const availabilityApi = useApi<AvailabilityResponse>('/inventory/availability', demoAvailability as unknown as AvailabilityResponse);
  const { toast } = useToast();

  const [tab, setTab] = useState<'materials' | 'moves' | 'availability'>('materials');
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [wasteFor, setWasteFor] = useState<Material | null>(null);
  const [wasteQty, setWasteQty] = useState('1');
  const [wasteReason, setWasteReason] = useState('تلف أثناء التحضير');
  const [saving, setSaving] = useState(false);

  useEffect(() => setMaterials(materialsApi.data.data || []), [materialsApi.data]);
  useEffect(() => setMoves(movesApi.data.data || []), [movesApi.data]);

  const availability = availabilityApi.data.data || [];
  const loading = materialsApi.loading || movesApi.loading || availabilityApi.loading;
  const source = materialsApi.source;

  const meta = useMemo(() => {
    const low = materials.filter((row) => row.low).length;
    const out = materials.filter((row) => row.out).length;
    const value = materials.reduce((total, row) => total + Number(row.value || row.stock * row.cost), 0);
    return { total: materials.length, low, out, value };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return materials.filter((row) => !needle || `${row.name} ${row.sku}`.toLowerCase().includes(needle));
  }, [materials, query]);

  const refreshAll = () => {
    materialsApi.refresh();
    movesApi.refresh();
    availabilityApi.refresh();
  };

  const submitWaste = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!wasteFor) return;
    const qty = Number(wasteQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('أدخل كمية هالك أكبر من صفر.', 'error');
      return;
    }
    if (qty > wasteFor.stock) {
      toast(`الكمية أكبر من الرصيد المتاح (${wasteFor.stock} ${wasteFor.unit}).`, 'error');
      return;
    }

    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/inventory/waste', { materialId: wasteFor.id, qty, reason: wasteReason });
        toast('تم تسجيل الهالك وخصمه من المخزون وقيده محاسبياً.');
        setWasteFor(null);
        setWasteQty('1');
        setSaving(false);
        refreshAll();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر تسجيل الهالك.', 'error');
        setSaving(false);
        return;
      }
    }

    const value = Math.round(qty * wasteFor.cost * 100) / 100;
    const nextStock = Math.round((wasteFor.stock - qty) * 1000) / 1000;
    setMaterials((current) =>
      current.map((row) =>
        row.id === wasteFor.id
          ? {
              ...row,
              stock: nextStock,
              value: Math.round(nextStock * row.cost * 100) / 100,
              low: row.minStock > 0 && nextStock <= row.minStock,
              out: nextStock <= 0
            }
          : row
      )
    );
    setMoves((current) => [
      {
        id: `demo-waste-${Date.now()}`,
        productName: wasteFor.name,
        warehouse: 'المخزن الرئيسي',
        type: 'waste',
        qty: -qty,
        unitCost: wasteFor.cost,
        value: -value,
        referenceNumber: `WST-${Date.now().toString().slice(-6)}`,
        note: wasteReason,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
    toast(`تم تسجيل ${qty} ${wasteFor.unit} هالك (${formatSAR(value)}) — محاكاة عرض.`, 'success');
    setWasteFor(null);
    setWasteQty('1');
    setSaving(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="المخزون"
        title="المخزون والوصفات والهوالك"
        description="رصيد المواد الخام، حركات المخزون، وتوفر أصناف القائمة محسوباً من وصفات BOM. كل حركة مرتبطة بقيد محاسبي."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={materialsApi.error} onRefresh={refreshAll} />
            <Button size="sm" onClick={() => setWasteFor(materials[0] || null)} disabled={!materials.length}>
              <Icon name="alert" size={15} />
              تسجيل هالك
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="قيمة المخزون" value={formatSAR(meta.value)} hint="بمتوسط التكلفة الحالية" icon="inventory" tone="green" />
        <StatCard label="مواد تحت الحد الأدنى" value={formatNumber(meta.low)} hint={`من ${meta.total} مادة خام`} icon="alert" tone="gold" />
        <StatCard label="مواد نافدة" value={formatNumber(meta.out)} hint="تحتاج إعادة طلب فوري" icon="alert" tone="red" />
        <StatCard label="أصناف بوصفة" value={formatNumber(availability.length)} hint="توفر محسوب تلقائياً" icon="products" tone="navy" />
      </section>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>مركز المخزون</CardTitle>
            <CardDescription>ثلاثة عروض: المواد الخام، الحركات، وتوفر القائمة.</CardDescription>
          </div>
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { value: 'materials', label: 'المواد الخام', count: materials.length },
              { value: 'moves', label: 'الحركات', count: moves.length },
              { value: 'availability', label: 'توفر القائمة', count: availability.length }
            ]}
          />
        </CardHeader>

        {tab === 'materials' ? (
          <CardContent className="px-0 pb-0">
            <div className="relative mx-5 mb-4">
              <Icon name="search" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم المادة أو رمز SKU…"
                className="h-9 pr-9 text-xs"
              />
            </div>
            {filteredMaterials.length === 0 ? (
              <div className="p-5"><EmptyState icon="inventory" title="لا توجد مواد خام" description="أضف مواد خام من صفحة الأصناف أو من الـ API." /></div>
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>المادة الخام</TH>
                      <TH>الرصيد</TH>
                      <TH>الحد الأدنى</TH>
                      <TH>التكلفة</TH>
                      <TH>القيمة</TH>
                      <TH>الحالة</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {filteredMaterials.map((row) => (
                      <TR key={row.id}>
                        <TD>
                          <div className="flex items-center gap-2">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-[13px]">📦</span>
                            <div>
                              <p className="text-xs font-bold">{row.name}</p>
                              <p className="font-mono text-[10px] text-muted-foreground" dir="ltr">{row.sku}</p>
                            </div>
                          </div>
                        </TD>
                        <TD className="w-40">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs font-bold tabular-nums">{formatNumber(row.stock)} {row.unit}</span>
                          </div>
                          <Progress
                            className="mt-1.5"
                            value={row.stock}
                            max={Math.max(row.minStock * 2, row.stock, 1)}
                            tone={row.out ? 'red' : row.low ? 'gold' : 'green'}
                          />
                        </TD>
                        <TD className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">{formatNumber(row.minStock)} {row.unit}</TD>
                        <TD className="whitespace-nowrap text-[11px] tabular-nums">{formatSAR(row.cost)}</TD>
                        <TD className="whitespace-nowrap text-xs font-semibold tabular-nums">{formatSAR(row.value || row.stock * row.cost)}</TD>
                        <TD>
                          <Badge variant={row.out ? 'danger' : row.low ? 'warning' : 'success'}>
                            {row.out ? 'نافد' : row.low ? 'منخفض' : 'متوفر'}
                          </Badge>
                        </TD>
                        <TD>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[11px] text-red-600 dark:text-red-300"
                            onClick={() => {
                              setWasteFor(row);
                              setWasteQty('1');
                              setWasteReason('تلف أثناء التحضير');
                            }}
                            disabled={row.out}
                          >
                            هالك
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </CardContent>
        ) : null}

        {tab === 'moves' ? (
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>المادة</TH>
                    <TH>الحركة</TH>
                    <TH>الكمية</TH>
                    <TH>القيمة</TH>
                    <TH>المرجع</TH>
                    <TH>المخزن</TH>
                    <TH>الوقت</TH>
                  </TR>
                </THead>
                <TBody>
                  {moves.map((row) => (
                    <TR key={row.id}>
                      <TD className="text-xs font-semibold">{row.productName}</TD>
                      <TD>
                        <Badge variant={moveLabels[row.type]?.variant || 'secondary'}>
                          {moveLabels[row.type]?.label || row.type}
                        </Badge>
                      </TD>
                      <TD className={`whitespace-nowrap text-xs font-bold tabular-nums ${row.qty < 0 ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                        {row.qty > 0 ? '+' : ''}{formatNumber(row.qty)}
                      </TD>
                      <TD className="whitespace-nowrap text-[11px] tabular-nums">{formatSAR(row.value)}</TD>
                      <TD>
                        <p className="font-mono text-[10px]" dir="ltr">{row.referenceNumber || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{row.note}</p>
                      </TD>
                      <TD className="text-[10px] text-muted-foreground">{row.warehouse}</TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        ) : null}

        {tab === 'availability' ? (
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>الصنف</TH>
                    <TH>الفئة</TH>
                    <TH>الوصفة (BOM)</TH>
                    <TH>حصص متاحة</TH>
                    <TH>الحالة</TH>
                  </TR>
                </THead>
                <TBody>
                  {availability.map((row) => (
                    <TR key={row.id}>
                      <TD className="text-xs font-bold">{row.name}</TD>
                      <TD className="text-[11px] text-muted-foreground">{row.category || '—'}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          {row.recipe.map((line) => {
                            const material = materials.find((material) => material.id === line.materialId);
                            return (
                              <span key={line.materialId} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {material?.name || line.materialId} × {line.qty}
                              </span>
                            );
                          })}
                        </div>
                      </TD>
                      <TD className="w-44">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold tabular-nums">{formatNumber(row.availableServings)}</span>
                          <span className="text-[10px] text-muted-foreground">حصة</span>
                        </div>
                        <Progress className="mt-1.5" value={row.availableServings} max={Math.max(30, row.availableServings)} tone={row.availableServings > 5 ? 'green' : 'gold'} />
                      </TD>
                      <TD>
                        <Badge variant={row.available ? 'success' : 'danger'}>{row.available ? 'متوفر' : 'غير متوفر'}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        ) : null}
      </Card>

      <Dialog
        open={Boolean(wasteFor)}
        onClose={() => setWasteFor(null)}
        title="تسجيل هالك مخزون"
        description="سيتم خصم الكمية من الرصيد وإنشاء حركة مخزون وقيد «فاقد مخزون» تلقائياً."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setWasteFor(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={submitWaste} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="alert" size={15} />}
              تسجيل الهالك
            </Button>
          </>
        }
      >
        <form onSubmit={submitWaste} className="space-y-4">
          <Field label="المادة الخام">
            <Select
              value={wasteFor?.id || ''}
              onChange={(event) => setWasteFor(materials.find((row) => row.id === event.target.value) || null)}
            >
              {materials.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} — {formatNumber(row.stock)} {row.unit} متاح
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الكمية" hint={wasteFor ? `المتاح حالياً ${formatNumber(wasteFor.stock)} ${wasteFor.unit}` : undefined}>
            <Input type="number" min="0.001" step="0.001" value={wasteQty} onChange={(event) => setWasteQty(event.target.value)} dir="ltr" className="text-left" />
          </Field>
          <Field label="سبب الهالك">
            <Textarea value={wasteReason} onChange={(event) => setWasteReason(event.target.value)} rows={2} />
          </Field>
          {wasteFor ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-[11px] text-muted-foreground">
              القيمة التقديرية: <span className="font-bold text-foreground">{formatSAR(Number(wasteQty || 0) * wasteFor.cost)}</span>
              {' '}— ستُسجل في حساب فاقد المخزون 5108.
            </div>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}
