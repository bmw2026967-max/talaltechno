'use client';

import * as React from 'react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { StatCard } from '@/components/stat-card';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoProducts, demoPurchaseOrders, demoSuppliers } from '@/lib/demo';
import { apiPost, getToken } from '@/lib/api';
import { formatDate, formatNumber, formatSAR, statusLabel } from '@/lib/utils';

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  balance: number;
};

type PurchaseItem = {
  id?: string;
  productId?: string;
  name: string;
  qty: number;
  unitCost: number;
  taxRate?: number;
  total: number;
};

type PurchaseOrder = {
  id: string;
  number: string;
  status: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  items: PurchaseItem[];
};

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  cost: number;
  type: string;
};

type SuppliersResponse = { data: Supplier[] };
type OrdersResponse = { data: PurchaseOrder[] };
type ProductsResponse = { data: RawProduct[] };

const emptySupplier = { name: '', phone: '', vatNumber: '', email: '', address: '' };
const emptyLine = { productId: '', qty: '1', unitCost: '0' };

export default function PurchasingPage() {
  const suppliersApi = useApi<SuppliersResponse>('/suppliers', demoSuppliers as unknown as SuppliersResponse);
  const ordersApi = useApi<OrdersResponse>('/purchase-orders', demoPurchaseOrders as unknown as OrdersResponse);
  const productsApi = useApi<ProductsResponse>(
    '/products?type=raw',
    { data: (demoProducts.data as unknown as RawProduct[]).filter((row) => row.type === 'raw') }
  );
  const { toast } = useToast();

  const [tab, setTab] = useState<'orders' | 'suppliers'>('orders');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [orderNotes, setOrderNotes] = useState('');
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSuppliers(suppliersApi.data.data || []), [suppliersApi.data]);
  useEffect(() => setOrders(ordersApi.data.data || []), [ordersApi.data]);
  useEffect(() => {
    if (!supplierId && suppliers.length) setSupplierId(suppliers[0].id);
  }, [suppliers, supplierId]);

  const products = productsApi.data.data || [];
  const loading = suppliersApi.loading || ordersApi.loading || productsApi.loading;
  const source = ordersApi.source;

  const stats = useMemo(() => {
    const payable = suppliers.reduce((total, row) => total + Number(row.balance || 0), 0);
    const ordered = orders.filter((row) => row.status === 'ordered');
    const received = orders.filter((row) => row.status === 'received');
    return {
      payable,
      ordered: ordered.length,
      orderedValue: ordered.reduce((total, row) => total + Number(row.total || 0), 0),
      receivedValue: received.reduce((total, row) => total + Number(row.total || 0), 0)
    };
  }, [suppliers, orders]);

  const refreshAll = () => {
    suppliersApi.refresh();
    ordersApi.refresh();
    productsApi.refresh();
  };

  const setLine = (index: number, patch: Partial<typeof emptyLine>) => {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  };

  const pickProduct = (index: number, productId: string) => {
    const product = products.find((row) => row.id === productId);
    setLines((current) =>
      current.map((line, position) =>
        position === index
          ? { ...line, productId, unitCost: product ? String(product.cost) : line.unitCost }
          : line
      )
    );
  };

  const orderTotals = useMemo(() => {
    const subtotal = lines.reduce((total, line) => total + Number(line.qty || 0) * Number(line.unitCost || 0), 0);
    const tax = subtotal * 0.15;
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  const submitSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierForm.name.trim()) {
      toast('أدخل اسم المورد.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/suppliers', {
          name: supplierForm.name,
          phone: supplierForm.phone || undefined,
          vatNumber: supplierForm.vatNumber || undefined,
          email: supplierForm.email || undefined,
          address: supplierForm.address || undefined
        });
        toast('تم إنشاء المورد.');
        setSupplierOpen(false);
        setSupplierForm(emptySupplier);
        setSaving(false);
        suppliersApi.refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إنشاء المورد.', 'error');
        setSaving(false);
        return;
      }
    }
    setSuppliers((current) => [
      {
        id: `demo-supplier-${Date.now()}`,
        name: supplierForm.name,
        phone: supplierForm.phone || null,
        email: supplierForm.email || null,
        vatNumber: supplierForm.vatNumber || null,
        address: supplierForm.address || null,
        balance: 0
      },
      ...current
    ]);
    toast('تمت إضافة المورد في وضع العرض فقط.', 'success');
    setSupplierOpen(false);
    setSupplierForm(emptySupplier);
    setSaving(false);
  };

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    const valid = lines.filter((line) => line.productId && Number(line.qty) > 0);
    if (!supplierId || valid.length === 0) {
      toast('اختر المورد وأضف صنفاً واحداً على الأقل بكمية صحيحة.', 'error');
      return;
    }
    setSaving(true);
    if (getToken()) {
      try {
        await apiPost('/purchase-orders', {
          supplierId,
          date: orderDate,
          notes: orderNotes || undefined,
          items: valid.map((line) => ({
            productId: line.productId,
            qty: Number(line.qty),
            unitCost: Number(line.unitCost),
            taxRate: 15
          }))
        });
        toast('تم إنشاء أمر الشراء.');
        setOrderOpen(false);
        setLines([{ ...emptyLine }]);
        setOrderNotes('');
        setSaving(false);
        ordersApi.refresh();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر إنشاء أمر الشراء.', 'error');
        setSaving(false);
        return;
      }
    }
    const supplier = suppliers.find((row) => row.id === supplierId);
    setOrders((current) => [
      {
        id: `demo-po-${Date.now()}`,
        number: `PO-${1003 + current.length}`,
        status: 'ordered',
        date: orderDate,
        supplierId,
        supplierName: supplier?.name || 'مورد تجريبي',
        subtotal: Math.round(orderTotals.subtotal * 100) / 100,
        tax: Math.round(orderTotals.tax * 100) / 100,
        total: Math.round(orderTotals.total * 100) / 100,
        notes: orderNotes,
        items: valid.map((line) => {
          const product = products.find((row) => row.id === line.productId);
          return {
            productId: line.productId,
            name: product?.name || line.productId,
            qty: Number(line.qty),
            unitCost: Number(line.unitCost),
            taxRate: 15,
            total: Math.round(Number(line.qty) * Number(line.unitCost) * 1.15 * 100) / 100
          };
        })
      },
      ...current
    ]);
    toast('تم إنشاء أمر شراء تجريبي — محاكاة عرض.', 'success');
    setOrderOpen(false);
    setLines([{ ...emptyLine }]);
    setOrderNotes('');
    setSaving(false);
  };

  const receive = async (order: PurchaseOrder) => {
    setBusy(order.id);
    if (getToken()) {
      try {
        await apiPost(`/purchase-orders/${order.id}/receive`, {});
        toast('تم استلام أمر الشراء وتحديث المخزون والقيود.');
        setBusy(null);
        refreshAll();
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر استلام أمر الشراء.', 'error');
        setBusy(null);
        return;
      }
    }
    setOrders((current) => current.map((row) => (row.id === order.id ? { ...row, status: 'received' } : row)));
    setSuppliers((current) =>
      current.map((row) =>
        row.id === order.supplierId ? { ...row, balance: Math.round((row.balance + order.total) * 100) / 100 } : row
      )
    );
    toast(`تم استلام ${order.number} تجريبياً — خُصم المخزون وأنشئ قيد 1104/1105/2101.`, 'success');
    setBusy(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="المشتريات والموردون"
        title="المشتريات والمخزون الوارد"
        description="أوامر شراء للمواد الخام، استلام يحدّث المخزون تلقائياً، وقيود مدين/دائن متوازنة على حسابات المخزون وضريبة المدخلات والموردين."
        actions={
          <>
            <SourceBadge source={source} loading={loading} error={ordersApi.error} onRefresh={refreshAll} />
            <Button variant="outline" size="sm" onClick={() => setSupplierOpen(true)}>
              <Icon name="users" size={15} />
              مورد جديد
            </Button>
            <Button size="sm" onClick={() => setOrderOpen(true)}>
              <Icon name="plus" size={15} />
              أمر شراء
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مستحقات الموردين" value={formatSAR(stats.payable)} hint={`${suppliers.length} مورد نشط`} icon="wallet" tone="gold" />
        <StatCard label="أوامر بانتظار الاستلام" value={formatNumber(stats.ordered)} hint={formatSAR(stats.orderedValue)} icon="purchasing" tone="navy" />
        <StatCard label="قيمة المشتريات المستلمة" value={formatSAR(stats.receivedValue)} hint="دخلت المخزون والقيود" icon="inventory" tone="green" />
        <StatCard label="ضريبة المدخلات المتوقعة" value={formatSAR(orders.reduce((total, row) => total + Number(row.tax || 0), 0))} hint="قابلة للخصم — 1105" icon="accounting" tone="green" />
      </section>

      <Card className="mt-5">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>مركز المشتريات</CardTitle>
            <CardDescription>أوامر الشراء والموردون وأرصدة المستحقات.</CardDescription>
          </div>
          <Segmented
            value={tab}
            onChange={setTab}
            items={[
              { value: 'orders', label: 'أوامر الشراء', count: orders.length },
              { value: 'suppliers', label: 'الموردون', count: suppliers.length }
            ]}
          />
        </CardHeader>

        {tab === 'orders' ? (
          <CardContent className="px-0 pb-0">
            {orders.length === 0 ? (
              <div className="p-5">
                <EmptyState icon="purchasing" title="لا توجد أوامر شراء" description="أنشئ أمر شراء لبدء توريد المواد الخام." />
              </div>
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>الأمر</TH>
                      <TH>المورد</TH>
                      <TH>التاريخ</TH>
                      <TH>قبل الضريبة</TH>
                      <TH>الضريبة</TH>
                      <TH>الإجمالي</TH>
                      <TH>الحالة</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {orders.map((order) => (
                      <Fragment key={order.id}>
                        <TR className="cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                          <TD className="font-mono text-[11px] font-bold" dir="ltr">{order.number}</TD>
                          <TD className="max-w-[220px] truncate text-xs">{order.supplierName}</TD>
                          <TD className="whitespace-nowrap text-[11px] text-muted-foreground">{order.date}</TD>
                          <TD className="whitespace-nowrap text-[11px] tabular-nums">{formatSAR(order.subtotal)}</TD>
                          <TD className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">{formatSAR(order.tax)}</TD>
                          <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{formatSAR(order.total)}</TD>
                          <TD>
                            <Badge variant={order.status === 'received' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}>
                              {statusLabel(order.status)}
                            </Badge>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-1">
                              {order.status === 'ordered' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    receive(order);
                                  }}
                                  disabled={busy === order.id}
                                >
                                  {busy === order.id ? <Icon name="refresh" size={13} className="animate-spin" /> : <Icon name="download" size={13} />}
                                  استلام
                                </Button>
                              ) : null}
                              <Icon
                                name="chevron-down"
                                size={15}
                                className={`text-muted-foreground transition ${expanded === order.id ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </TD>
                        </TR>
                        {expanded === order.id ? (
                          <tr>
                            <td colSpan={8} className="bg-muted/20 px-4 py-3">
                              <div className="overflow-x-auto rounded-xl border bg-card">
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="border-b bg-muted/40 text-right text-[10px] text-muted-foreground">
                                      <th className="px-3 py-2">الصنف</th>
                                      <th className="px-3 py-2">الكمية</th>
                                      <th className="px-3 py-2">تكلفة الوحدة</th>
                                      <th className="px-3 py-2">الإجمالي شامل الضريبة</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.map((item, index) => (
                                      <tr key={item.id || `${item.name}-${index}`} className="border-b last:border-0">
                                        <td className="px-3 py-2 font-semibold">{item.name}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatNumber(item.qty)}</td>
                                        <td className="px-3 py-2 tabular-nums">{formatSAR(item.unitCost)}</td>
                                        <td className="px-3 py-2 font-semibold tabular-nums">{formatSAR(item.total)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {order.notes ? <p className="mt-2 text-[10px] text-muted-foreground">ملاحظات: {order.notes}</p> : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
            <p className="border-t px-5 py-3 text-[10px] leading-5 text-muted-foreground">
              عند الاستلام: يُحدَّث رصيد المخزون، تُسجَّل حركة شراء، ويُنشأ قيد مدين للمخزون 1104 وضريبة المدخلات 1105
              مقابل دائن الموردين 2101.
            </p>
          </CardContent>
        ) : (
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>المورد</TH>
                    <TH>الهاتف</TH>
                    <TH>الرقم الضريبي</TH>
                    <TH>الرصيد المستحق</TH>
                    <TH>الحالة</TH>
                  </TR>
                </THead>
                <TBody>
                  {suppliers.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                            <Icon name="users" size={16} />
                          </span>
                          <span className="text-xs font-bold">{row.name}</span>
                        </div>
                      </TD>
                      <TD className="font-mono text-[10px] text-muted-foreground" dir="ltr">{row.phone || '—'}</TD>
                      <TD className="font-mono text-[10px] text-muted-foreground" dir="ltr">{row.vatNumber || '—'}</TD>
                      <TD className="whitespace-nowrap text-xs font-bold tabular-nums">{formatSAR(row.balance)}</TD>
                      <TD><Badge variant={row.balance > 0 ? 'warning' : 'success'}>{row.balance > 0 ? 'مستحق' : 'مسدد'}</Badge></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title="أمر شراء جديد"
        description="اختر المورد والمواد الخام. تُحسب الضريبة 15% تلقائياً."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOrderOpen(false)}>إلغاء</Button>
            <Button onClick={submitOrder} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="purchasing" size={15} />}
              إنشاء أمر الشراء
            </Button>
          </>
        }
      >
        <form onSubmit={submitOrder} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="المورد">
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                {suppliers.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="التاريخ">
              <Input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} dir="ltr" className="text-left" />
            </Field>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold">الأصناف</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setLines((current) => [...current, { ...emptyLine }])}
              >
                <Icon name="plus" size={13} />
                إضافة سطر
              </Button>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-xl border bg-muted/20 p-3 sm:grid-cols-[1.6fr_0.7fr_0.8fr_auto]">
                <Select value={line.productId} onChange={(event) => pickProduct(index, event.target.value)} className="h-10 text-xs">
                  <option value="">اختر مادة خام…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={line.qty}
                  onChange={(event) => setLine(index, { qty: event.target.value })}
                  placeholder="الكمية"
                  dir="ltr"
                  className="h-10 text-left text-xs"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(event) => setLine(index, { unitCost: event.target.value })}
                  placeholder="تكلفة الوحدة"
                  dir="ltr"
                  className="h-10 text-left text-xs"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-red-600 dark:text-red-300"
                  onClick={() => setLines((current) => (current.length === 1 ? current : current.filter((_, position) => position !== index)))}
                  aria-label="حذف السطر"
                >
                  <Icon name="close" size={15} />
                </Button>
              </div>
            ))}
          </div>

          <Field label="ملاحظات">
            <Textarea value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} rows={2} placeholder="مثال: توريد أسبوعي — فرع العليا" />
          </Field>

          <div className="rounded-xl border bg-muted/30 p-3 text-[11px]">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">قبل الضريبة</span><span className="font-semibold tabular-nums">{formatSAR(orderTotals.subtotal)}</span></div>
            <div className="mt-1 flex items-center justify-between"><span className="text-muted-foreground">ضريبة 15%</span><span className="font-semibold tabular-nums">{formatSAR(orderTotals.tax)}</span></div>
            <div className="mt-1 flex items-center justify-between border-t pt-1"><span className="font-bold">الإجمالي</span><span className="font-extrabold tabular-nums">{formatSAR(orderTotals.total)}</span></div>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={supplierOpen}
        onClose={() => setSupplierOpen(false)}
        title="مورد جديد"
        description="بيانات المورد تُستخدم في أوامر الشراء وفواتير المشتريات."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>إلغاء</Button>
            <Button onClick={submitSupplier} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="plus" size={15} />}
              إنشاء المورد
            </Button>
          </>
        }
      >
        <form onSubmit={submitSupplier} className="space-y-4">
          <Field label="اسم المورد">
            <Input value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الهاتف">
              <Input value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} dir="ltr" className="text-left" />
            </Field>
            <Field label="الرقم الضريبي">
              <Input value={supplierForm.vatNumber} onChange={(event) => setSupplierForm({ ...supplierForm, vatNumber: event.target.value })} dir="ltr" className="text-left font-mono" />
            </Field>
          </div>
          <Field label="البريد الإلكتروني (اختياري)">
            <Input type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} dir="ltr" className="text-left" />
          </Field>
          <Field label="العنوان (اختياري)">
            <Input value={supplierForm.address} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
