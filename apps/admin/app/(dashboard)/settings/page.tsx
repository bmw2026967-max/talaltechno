'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { SourceBadge } from '@/components/source-badge';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Switch } from '@/components/ui/switch';
import { Table, TBody, TD, TH, THead, TR, TableWrap } from '@/components/ui/table';
import { useToast } from '@/components/toast';
import { useApi } from '@/lib/use-api';
import { demoOrganization } from '@/lib/demo';
import { apiPatch, getToken } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';

type Branch = { id: string; name: string; code: string; address?: string; phone?: string; active: boolean };
type Warehouse = { id: string; name: string; code: string; branchName: string };
type Device = { id: string; name: string; type: string; serial: string; branchName: string; lastSeenAt?: string | null };
type UserRow = { id: string; name: string; email: string; role: string; branchName: string; active: boolean; lastLoginAt?: string | null };
type Tenant = {
  id: string;
  name: string;
  slug: string;
  vatNumber: string;
  crNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  vatRate: number;
  settings: Record<string, any>;
};

type OverviewResponse = {
  data: {
    tenant: Tenant;
    branches: Branch[];
    warehouses: Warehouse[];
    devices: Device[];
    users: UserRow[];
  };
};

type FormState = {
  name: string;
  vatNumber: string;
  crNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  timezone: string;
  currency: string;
  vatRate: string;
};

const emptyForm: FormState = {
  name: '',
  vatNumber: '',
  crNumber: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  timezone: 'Asia/Riyadh',
  currency: 'SAR',
  vatRate: '15'
};

const roleLabels: Record<string, string> = {
  owner: 'مالك',
  admin: 'مدير النظام',
  manager: 'مدير',
  cashier: 'كاشير',
  waiter: 'نادل',
  kitchen: 'مطبخ',
  accountant: 'محاسب',
  delivery_manager: 'مدير توصيل'
};

const deviceIcons: Record<string, 'device' | 'printer' | 'orders' | 'qr'> = {
  pos: 'device',
  kds: 'orders',
  printer: 'printer',
  emenu: 'qr'
};

export default function SettingsPage() {
  const overview = useApi<OverviewResponse>('/organization', demoOrganization as unknown as OverviewResponse);
  const { toast } = useToast();

  const [tab, setTab] = useState<'organization' | 'branches' | 'users' | 'devices' | 'printing' | 'emenu' | 'loyalty'>('organization');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const data = overview.data.data;

  useEffect(() => {
    const tenant = overview.data.data.tenant;
    setForm({
      name: tenant.name || '',
      vatNumber: tenant.vatNumber || '',
      crNumber: tenant.crNumber || '',
      phone: tenant.phone || '',
      email: tenant.email || '',
      address: tenant.address || '',
      city: tenant.city || '',
      timezone: tenant.timezone || 'Asia/Riyadh',
      currency: tenant.currency || 'SAR',
      vatRate: String(tenant.vatRate ?? 15)
    });
    setSettings(tenant.settings || {});
  }, [overview.data]);

  const printer = settings.printer || {};
  const emenu = settings.emenu || {};
  const loyalty = settings.loyalty || {};

  const counts = useMemo(
    () => ({
      branches: data.branches.length,
      users: data.users.length,
      devices: data.devices.length,
      warehouses: data.warehouses.length
    }),
    [data]
  );

  const setNested = (group: string, key: string, value: unknown) => {
    setSettings((current) => ({ ...current, [group]: { ...(current[group] || {}), [key]: value } }));
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      vatRate: Number(form.vatRate),
      settings: {
        ...settings,
        printer,
        emenu,
        loyalty
      }
    };

    if (getToken()) {
      try {
        await apiPatch('/settings', payload);
        toast('تم حفظ إعدادات المنشأة.');
        overview.refresh();
        setSaving(false);
        return;
      } catch (reason) {
        toast(reason instanceof Error ? reason.message : 'تعذر حفظ الإعدادات.', 'error');
        setSaving(false);
        return;
      }
    }

    toast('تم حفظ الإعدادات في وضع العرض فقط — لن تُحفظ بعد إعادة التحميل.', 'success');
    setSaving(false);
  };

  return (
    <>
      <PageHeader
        eyebrow="الإدارة"
        title="إعدادات المنشأة"
        description="بيانات المنشأة، الفروع، المستخدمون والأدوار، الأجهزة، الطباعة، القائمة الإلكترونية، وبرنامج الولاء."
        actions={
          <>
            <SourceBadge source={overview.source} loading={overview.loading} error={overview.error} onRefresh={overview.refresh} />
            <Button onClick={save} disabled={saving}>
              {saving ? <Icon name="refresh" size={15} className="animate-spin" /> : <Icon name="check" size={15} />}
              حفظ التغييرات
            </Button>
          </>
        }
      />

      <div className="mb-4 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          items={[
            { value: 'organization', label: 'المنشأة' },
            { value: 'branches', label: 'الفروع والمخازن', count: counts.branches },
            { value: 'users', label: 'المستخدمون', count: counts.users },
            { value: 'devices', label: 'الأجهزة', count: counts.devices },
            { value: 'printing', label: 'الطباعة' },
            { value: 'emenu', label: 'القائمة الإلكترونية' },
            { value: 'loyalty', label: 'الولاء' }
          ]}
        />
      </div>

      {tab === 'organization' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>البيانات الأساسية</CardTitle>
              <CardDescription>تظهر على الفواتير والإيصالات وتُستخدم في تقارير الضريبة.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم المنشأة" className="sm:col-span-2">
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Field>
              <Field label="الرقم الضريبي" hint="15 رقماً — يُستخدم في ZATCA Sandbox.">
                <Input value={form.vatNumber} onChange={(event) => setForm({ ...form, vatNumber: event.target.value })} dir="ltr" className="text-left font-mono" />
              </Field>
              <Field label="السجل التجاري">
                <Input value={form.crNumber} onChange={(event) => setForm({ ...form, crNumber: event.target.value })} dir="ltr" className="text-left font-mono" />
              </Field>
              <Field label="الهاتف">
                <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} dir="ltr" className="text-left" />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} dir="ltr" className="text-left" />
              </Field>
              <Field label="العنوان" className="sm:col-span-2">
                <Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </Field>
              <Field label="المدينة">
                <Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </Field>
              <Field label="المنطقة الزمنية">
                <Select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })}>
                  <option value="Asia/Riyadh">Asia/Riyadh</option>
                  <option value="Asia/Jeddah">Asia/Jeddah</option>
                  <option value="Asia/Dammam">Asia/Dammam</option>
                  <option value="UTC">UTC</option>
                </Select>
              </Field>
              <Field label="العملة">
                <Select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                  <option value="SAR">SAR — ريال سعودي</option>
                  <option value="USD">USD — دولار</option>
                </Select>
              </Field>
              <Field label="نسبة ضريبة القيمة المضافة %">
                <Input type="number" min="0" max="100" step="0.5" value={form.vatRate} onChange={(event) => setForm({ ...form, vatRate: event.target.value })} dir="ltr" className="text-left" />
              </Field>
              <Field label="بادئة الفواتير" hint="مثال: TT ينتج TT-1043.">
                <Input value={settings.invoicePrefix || ''} onChange={(event) => setSettings({ ...settings, invoicePrefix: event.target.value })} dir="ltr" className="text-left font-mono" />
              </Field>
              <Field label="نص أسفل الإيصال" className="sm:col-span-2">
                <Input value={settings.receiptFooter || ''} onChange={(event) => setSettings({ ...settings, receiptFooter: event.target.value })} />
              </Field>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>بطاقة المنشأة</CardTitle>
                <CardDescription>ملخص غير قابل للتعديل.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-[11px]">
                {[
                  ['المعرّف', data.tenant.id],
                  ['الرابط المختصر', data.tenant.slug],
                  ['المخازن', `${counts.warehouses} مخزن`],
                  ['المستخدمون', `${counts.users} مستخدم`],
                  ['الأجهزة', `${counts.devices} جهاز`]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="max-w-[160px] truncate font-mono text-[10px] font-semibold" dir="ltr">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>رسوم الخدمة</CardTitle>
                <CardDescription>تُضاف على طلبات المحلي فقط.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field label="النسبة %">
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={settings.serviceChargeRate ?? 0}
                    onChange={(event) => setSettings({ ...settings, serviceChargeRate: Number(event.target.value) })}
                    dir="ltr"
                    className="text-left"
                  />
                </Field>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  تُسجل الإيرادات الإضافية في حساب 4102 «إيرادات أخرى».
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'branches' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>الفروع</CardTitle>
              <CardDescription>كل فرع له مخزن مستقل وأجهزة نقطة بيع.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.branches.map((branch) => (
                <div key={branch.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/15 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="branch" size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{branch.name}</p>
                    <p className="text-[10px] text-muted-foreground">{branch.code} · {branch.address || 'بدون عنوان'} · {branch.phone || 'بدون هاتف'}</p>
                  </div>
                  <Badge variant={branch.active ? 'success' : 'secondary'}>{branch.active ? 'نشط' : 'معطل'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>المخازن</CardTitle>
              <CardDescription>مخزن رئيسي لكل فرع.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.warehouses.map((warehouse) => (
                <div key={warehouse.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold">{warehouse.name}</p>
                    <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">{warehouse.code}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{warehouse.branchName}</p>
                </div>
              ))}
              <p className="rounded-xl border border-dashed p-3 text-[10px] leading-5 text-muted-foreground">
                إضافة فرع أو مخزن جديد تتم عبر واجهات الـ API الإدارية. الواجهة الحالية للعرض.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'users' ? (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>المستخدمون والأدوار</CardTitle>
              <CardDescription>8 أدوار مدعومة: مالك، مدير نظام، مدير، كاشير، نادل، مطبخ، محاسب، مدير توصيل.</CardDescription>
            </div>
            <Badge variant="outline">{counts.users} مستخدم</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <TableWrap>
              <Table>
                <THead>
                  <TR><TH>المستخدم</TH><TH>البريد</TH><TH>الدور</TH><TH>الفرع</TH><TH>الحالة</TH><TH>آخر دخول</TH></TR>
                </THead>
                <TBody>
                  {data.users.map((user) => (
                    <TR key={user.id}>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {user.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
                          </span>
                          <span className="text-xs font-bold">{user.name}</span>
                        </div>
                      </TD>
                      <TD className="font-mono text-[10px] text-muted-foreground" dir="ltr">{user.email}</TD>
                      <TD><Badge variant="secondary">{roleLabels[user.role] || user.role}</Badge></TD>
                      <TD className="text-[10px] text-muted-foreground">{user.branchName || '—'}</TD>
                      <TD><Badge variant={user.active ? 'success' : 'secondary'}>{user.active ? 'نشط' : 'معطل'}</Badge></TD>
                      <TD className="whitespace-nowrap text-[10px] text-muted-foreground">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'devices' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.devices.map((device) => (
            <Card key={device.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <Icon name={deviceIcons[device.type] || 'device'} size={20} />
                  </span>
                  <Badge variant="success">متصل</Badge>
                </div>
                <p className="mt-3 text-sm font-bold">{device.name}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground" dir="ltr">{device.serial}</p>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-[10px] text-muted-foreground">
                  <span>{device.branchName}</span>
                  <span>{device.lastSeenAt ? formatDate(device.lastSeenAt) : '—'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'printing' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>إعدادات الطباعة الحرارية</CardTitle>
              <CardDescription>تُطبق على إيصالات البيع وتذاكر المطبخ. الوضع الافتراضي Mock.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم الطابعة">
                <Input value={printer.name || ''} onChange={(event) => setNested('printer', 'name', event.target.value)} />
              </Field>
              <Field label="عرض الورق (حرف)">
                <Select value={String(printer.width || 32)} onChange={(event) => setNested('printer', 'width', Number(event.target.value))}>
                  <option value="32">32 حرف — 58mm</option>
                  <option value="48">48 حرف — 80mm</option>
                </Select>
              </Field>
              <Field label="وضع التشغيل">
                <Select value={printer.mode || 'mock'} onChange={(event) => setNested('printer', 'mode', event.target.value)}>
                  <option value="mock">Mock — محاكاة</option>
                  <option value="sandbox">Sandbox</option>
                </Select>
              </Field>
              <Field label="فتح درج النقدية">
                <Select value={printer.drawer ? 'yes' : 'no'} onChange={(event) => setNested('printer', 'drawer', event.target.value === 'yes')}>
                  <option value="no">لا</option>
                  <option value="yes">نعم</option>
                </Select>
              </Field>
              <Field label="نص الإيصال" className="sm:col-span-2">
                <Input value={settings.receiptFooter || ''} onChange={(event) => setSettings({ ...settings, receiptFooter: event.target.value })} />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px] leading-6 text-muted-foreground">
              <p className="rounded-xl border bg-muted/20 p-3">
                ESC/POS مدعوم عبر حزمة <span className="font-mono text-[10px]" dir="ltr">@talaltechno/thermal-printer</span>.
              </p>
              <p className="rounded-xl border bg-muted/20 p-3">
                الربط الشبكي TCP 9100 يحتاج تفعيل PRINTER_MODE وبيانات المضيف في بيئة الإنتاج.
              </p>
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-amber-800 dark:text-amber-200">
                لا تُطبع أي بيانات حقيقية في وضع العرض. استخدم زر الاختبار من صفحة التكاملات.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'emenu' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>القائمة الإلكترونية PWA</CardTitle>
              <CardDescription>قائمة QR للعملاء مع إمكانية الطلب الذاتي من الطاولة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-xs font-bold">تفعيل القائمة الإلكترونية</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">رابط /menu يعمل دون تسجيل دخول.</p>
                </div>
                <Switch checked={Boolean(emenu.enabled)} onChange={(value) => setNested('emenu', 'enabled', value)} label="تفعيل القائمة" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-xs font-bold">السماح بالطلب الذاتي</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">إرسال الطلب إلى KDS بعد تأكيد العميل.</p>
                </div>
                <Switch checked={Boolean(emenu.allowSelfOrder)} onChange={(value) => setNested('emenu', 'allowSelfOrder', value)} label="الطلب الذاتي" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-xs font-bold">اشتراط رقم الطاولة</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">يمنع الطلب إن لم يكن QR مربوطاً بطاولة.</p>
                </div>
                <Switch checked={Boolean(emenu.requireTable)} onChange={(value) => setNested('emenu', 'requireTable', value)} label="اشتراط الطاولة" />
              </div>
              <Field label="نص ترحيبي في القائمة">
                <Input value={emenu.welcomeText || ''} onChange={(event) => setNested('emenu', 'welcomeText', event.target.value)} placeholder="أهلاً بكم في مطعم طلال تكنو" />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>رابط القائمة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground">المسار في Docker/Nginx</p>
                <p className="mt-1 font-mono text-xs font-bold" dir="ltr">/menu/</p>
              </div>
              <a
                href="/menu/"
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-xl border bg-card text-xs font-semibold transition hover:bg-muted"
              >
                <Icon name="external" size={15} />
                فتح القائمة الإلكترونية
              </a>
              <p className="text-[10px] leading-5 text-muted-foreground">
                في العرض التجريبي الثابت، القائمة متاحة كملف <span className="font-mono" dir="ltr">emenu.html</span> على خادم العرض.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === 'loyalty' ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>برنامج الولاء</CardTitle>
              <CardDescription>نقاط لكل ريال، وقيمة استبدال النقطة. تُدار العروض من صفحة الولاء.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="نقاط لكل 1 SAR">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={loyalty.earnPerSar ?? 1}
                  onChange={(event) => setNested('loyalty', 'earnPerSar', Number(event.target.value))}
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <Field label="قيمة النقطة عند الاستبدال (SAR)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={loyalty.redeemValue ?? 0.05}
                  onChange={(event) => setNested('loyalty', 'redeemValue', Number(event.target.value))}
                  dir="ltr"
                  className="text-left"
                />
              </Field>
              <div className="rounded-xl border bg-muted/20 p-3 text-[11px] leading-6 text-muted-foreground sm:col-span-2">
                مثال: فاتورة 100 SAR تمنح {formatNumber(Number(loyalty.earnPerSar ?? 1) * 100)} نقطة، وقيمتها عند
                الاستبدال {formatNumber(Number(loyalty.redeemValue ?? 0.05) * Number(loyalty.earnPerSar ?? 1) * 100)} SAR.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>الطبقات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11px]">
              {[
                ['برونزي', '0+', 'bg-amber-700/10 text-amber-800 dark:text-amber-300'],
                ['فضي', '500+', 'bg-slate-500/10 text-slate-700 dark:text-slate-300'],
                ['ذهبي', '1500+', 'bg-brand-gold/15 text-[#8a6a0f] dark:text-brand-gold'],
                ['بلاتيني', '3000+', 'bg-sky-500/10 text-sky-700 dark:text-sky-300']
              ].map(([label, threshold, tone]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${tone}`}>{label}</span>
                  <span className="text-muted-foreground">{threshold} نقطة</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
