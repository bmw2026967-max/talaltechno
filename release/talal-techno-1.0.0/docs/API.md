# واجهات API — طلال تكنو

> الإصدار `1.0.0` · Base URL تطويري: `http://localhost:4000` · عبر Nginx: `http://localhost:8080/api`
> Swagger تفاعلي: `/docs` (مثال: `http://localhost:8080/api/docs`)

> **حالة التحقق:** شُغّل API فعلياً على PostgreSQL 17.10 محمول، ونجح `prisma db push` والزرع واختبار الدخان الكامل (بيع/مرتجع/طلبات/تكاملات/ZATCA). لم تُختبر Redis/الطوابير تشغيلياً بعد.

## 1. الاتفاقيات

| الموضوع | القاعدة |
|---|---|
| التنسيق | JSON، UTF-8 |
| المصادقة | `Authorization: Bearer <accessToken>` |
| المستأجر | يُستخرج من JWT، **لا يُرسل** في الطلب |
| النجاح | `{ "data": ... }` أو `{ "data": [...], "meta": {...} }` |
| الخطأ | `{ statusCode, error, message, requestId, path, timestamp }` |
| اللغة | رسائل عربية حيث صرّحنا بذلك؛ أكواد إنجليزية |
| التواريخ | ISO-8601 (`2026-10-27T12:00:00.000Z`) |
| المال | أرقام عشرية بالريال، منزلتان |
| الترقيم | `page`, `pageSize` (حد أقصى عملي 200) |
| الأسرار | لا تُرسل مفاتيح مزودين من العميل؛ تُضبط في `.env` |

### شكل الخطأ

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "كمية البند يجب أن تكون أكبر من صفر.",
  "requestId": null,
  "path": "/sales",
  "timestamp": "2026-10-27T09:15:00.000Z"
}
```

### رموز الحالة

| الرمز | المعنى |
|---|---|
| 200 | نجاح قراءة/تحديث |
| 201 | إنشاء |
| 400 | تحقق مدخلات أو قاعدة أعمال |
| 401 | توكن مفقود/منتهٍ |
| 403 | دور لا يملك الصلاحية |
| 404 | غير موجود داخل المستأجر |
| 409 | تعارض (مثل وردية مفتوحة) |
| 500 | خطأ غير متوقع (يُسجَّل) |

---

## 2. المصادقة

### `POST /auth/login` — عام

```json
{
  "email": "admin@talaltechno.dev",
  "password": "Talal@1234"
}
```

**200:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 28800,
    "user": {
      "id": "usr_...",
      "tenantId": "ten_...",
      "branchId": "br_...",
      "name": "أحمد الحميري",
      "email": "admin@talaltechno.dev",
      "role": "OWNER",
      "permissions": ["*"],
      "tenant": { "id": "ten_...", "name": "مطاعم طلال", "slug": "talal", "vatNumber": "310123456700003" },
      "branch": { "id": "br_...", "name": "فرع الرياض" }
    }
  }
}
```

### `GET /auth/me` 🔒

يعيد `{ data: user }` من التوكن.

### `POST /auth/logout` 🔒

يعيد `{ data: { ok: true } }`. لا يوجد إبطال توكن على الخادم بعد (JWT stateless).

---

## 3. الصحة

### `GET /health` — عام

```json
{
  "status": "ok",
  "service": "talaltechno-api",
  "version": "1.0.0",
  "database": "ok",
  "latencyMs": 4,
  "environment": "development",
  "integrations": {
    "payments": "mock",
    "delivery": "mock",
    "printer": "mock",
    "zatca": "sandbox"
  },
  "disclaimer": "ZATCA/payment/delivery integrations are sandbox/mock and not certified.",
  "timestamp": "2026-10-27T09:00:00.000Z"
}
```

---

## 4. الكتالوج

| Method | Path | الوصف |
|---|---|---|
| GET | `/products` | قائمة الأصناف والمواد (استعلام: `type`, `categoryId`, `search`) |
| POST | `/products` | إنشاء صنف/مادة + وصفة |
| PATCH | `/products/:id` | تعديل صنف + استبدال الوصفة |
| GET | `/categories` | الفئات |
| GET | `/tables` | الطاولات |
| GET | `/customers` | العملاء |

### إنشاء صنف قائمة بوصفة

```json
{
  "name": "كبسة دجاج",
  "nameEn": "Chicken Kabsa",
  "sku": "M-001",
  "type": "menu",
  "categoryId": "cat_main",
  "price": 32,
  "cost": 9.8,
  "taxRate": 15,
  "unit": "طبق",
  "emoji": "🍛",
  "active": true,
  "recipe": [
    { "materialId": "raw_chicken", "qty": 0.25 },
    { "materialId": "raw_rice", "qty": 0.2 }
  ]
}
```

`type=raw` لا يقبل `recipe`. الوصفة تُستبدل بالكامل عند `PATCH` إذا أُرسلت.

---

## 5. الطلبات والمطبخ

| Method | Path | الوصف |
|---|---|---|
| GET | `/orders?status=&type=&tableId=` | قائمة الطلبات |
| GET | `/orders/:id` | تفاصيل |
| POST | `/orders` | إنشاء طلب |
| PATCH | `/orders/:id/status` | تغيير الحالة |
| POST | `/orders/:id/items` | إضافة بنود |
| PATCH | `/orders/:id/table` | نقل طاولة |
| POST | `/orders/:id/split` | تقسيم بنود لطلب جديد |

### إنشاء طلب

```json
{
  "type": "dine_in",
  "tableId": "tbl_12",
  "notes": "بدون بصل",
  "items": [
    { "productId": "p_kabsa", "qty": 2, "notes": "حار", "station": "grill" }
  ]
}
```

**الحالات:** `new` → `preparing` → `ready` → `served` → `completed` / `cancelled`.

**تقسيم:**

```json
{ "itemIds": ["oi_1", "oi_2"] }
```

---

## 6. المبيعات والمرتجعات

| Method | Path | الوصف |
|---|---|---|
| GET | `/sales?from=&to=&type=&page=&pageSize=` | الفواتير |
| GET | `/sales/:id` | فاتورة + بنود + دفعات + ZATCA |
| POST | `/sales` | إنشاء بيع (ينشئ فاتورة + قيد + مخزون + ZATCA) |
| POST | `/sales/:id/returns` | مرتجع كامل/جزئي |

### إنشاء بيع

```json
{
  "items": [
    { "productId": "p_kabsa", "qty": 2 },
    { "productId": "p_pepsi", "qty": 1, "price": 7 }
  ],
  "payments": [
    { "method": "cash", "amount": 100 },
    { "method": "mada", "amount": 20, "reference": "MOCK-123" }
  ],
  "orderType": "dine_in",
  "tableId": "tbl_12",
  "customerId": "cus_1",
  "discount": 5,
  "serviceCharge": 0,
  "deliveryFee": 0,
  "couponCode": "WELCOME10",
  "loyaltyPoints": 100,
  "shiftId": "sh_1",
  "source": "pos",
  "notes": "طلب تجريبي"
}
```

**قواعد:**

- `items` بحد أدنى بند واحد.
- `payments` اختيارية؛ إن غابت تُعتبر آجلة ويتطلب ذلك `customerId`.
- الدفع الزائد يُعاد كـ`change`.
- `method=credit` يتطلب عميلاً.
- `price` اختياري؛ يُستخدم سعر الخادم إن غاب.
- `couponCode` يُتحقق من الصلاحية والحد الأدنى والاستخدام.
- `loyaltyPoints` تُستبدل ضمن حدود العميل.
- `orderId` يربط بطلب مطبخ قائم.
- `shiftId` يربط بالوردية؛ لا يمنع البيع بدونها.

**201 (مختصر):**

```json
{
  "data": {
    "id": "inv_...",
    "number": "INV-1024",
    "type": "sale",
    "subtotal": 71,
    "discount": 5,
    "tax": 9.9,
    "total": 75.9,
    "paid": 120,
    "due": 0,
    "change": 44.1,
    "orderType": "dine_in",
    "tableName": "طاولة 12",
    "status": "paid",
    "createdAt": "2026-10-27T12:00:00.000Z",
    "items": [
      { "productId": "p_kabsa", "name": "كبسة دجاج", "qty": 2, "price": 32, "taxRate": 15, "total": 73.6 }
    ],
    "payments": [
      { "method": "cash", "amount": 100 },
      { "method": "mada", "amount": 20, "reference": "MOCK-123" }
    ],
    "zatca": {
      "uuid": "…",
      "invoiceHash": "…",
      "previousHash": "…",
      "qr": "…",
      "status": "PENDING",
      "environment": "sandbox"
    }
  }
}
```

### مرتجع

```json
{
  "items": [{ "productId": "p_kabsa", "qty": 1 }],
  "refundMethod": "cash",
  "notes": "الطبق بارد"
}
```

**قواعد:**

- الكمية المرتجعة تراكمياً ≤ الكمية الأصلية.
- ينشئ `Invoice.type = RETURN` برقم مستقل.
- يعيد المخزون ويعكس COGS والضريبة.
- يعكس نقاط الولاء بحد أقصى ما كُسب من الفاتورة الأصلية.

---

## 7. الورديات

| Method | Path | الوصف |
|---|---|---|
| GET | `/shifts` | آخر الورديات |
| GET | `/shifts/current` | الوردية المفتوحة للمستخدم |
| GET | `/shifts/:id/summary` | ملخص قبل الإغلاق |
| POST | `/shifts/open` | فتح |
| POST | `/shifts/:id/close` | إغلاق وتسوية |

### فتح

```json
{ "openingCash": 500, "notes": "وردية صباحية" }
```

يفشل `409` إذا وُجدت وردية مفتوحة.

### إغلاق

```json
{ "countedCash": 5320.5, "notes": "فرق 20 ريال" }
```

**الملخص:** `openingCash`, `cashSales`, `expectedCash`, `countedCash`, `variance`, `byMethod`, `sales`, `orders`, `tax`, `cogs`.

---

## 8. المخزون

| Method | Path | الوصف |
|---|---|---|
| GET | `/inventory/materials` | المواد الخام وأرصدتها |
| GET | `/inventory/moves?productId=&from=&to=` | حركات المخزون |
| GET | `/inventory/valuation` | تقييم المخزون |
| GET | `/inventory/low-stock` | تحت حد الطلب |
| GET | `/inventory/availability` | توفر أصناف القائمة من BOM |
| POST | `/inventory/waste` | تسجيل هالك |
| POST | `/inventory/adjustments` | تسوية جرد |
| POST | `/inventory/transfers` | تحويل بين مستودعين |

### هالك

```json
{ "materialId": "raw_chicken", "qty": 2.5, "reason": "انتهاء صلاحية" }
```

### تسوية

```json
{ "materialId": "raw_rice", "newQty": 48, "reason": "جرد فعلي" }
```

### تحويل

```json
{ "productId": "raw_rice", "fromWarehouseId": "wh_main", "toWarehouseId": "wh_2", "qty": 10, "note": "نقل" }
```

كل عملية تنشئ `StockMove` وقيداً محاسبياً عند الحاجة.

---

## 9. المحاسبة

| Method | Path | الوصف |
|---|---|---|
| GET | `/accounting/accounts` | دليل الحسابات |
| GET | `/accounting/journal?from=&to=&page=` | القيود |
| GET | `/accounting/journal/:id` | قيد |
| POST | `/accounting/journal` | قيد يدوي |
| GET | `/accounting/trial-balance?from=&to=` | ميزان المراجعة |
| GET | `/accounting/income-statement?from=&to=` | قائمة الدخل |
| GET | `/accounting/balance-sheet?asOf=` | الميزانية |
| GET | `/accounting/expenses` | المصروفات |
| POST | `/accounting/expenses` | مصروف |

### قيد يدوي

```json
{
  "description": "إيجار أكتوبر",
  "date": "2026-10-27",
  "lines": [
    { "accountId": "5103", "debit": 8000, "credit": 0, "memo": "إيجار" },
    { "accountId": "1102", "debit": 0, "credit": 8000, "memo": "تحويل بنكي" }
  ]
}
```

**قواعد:** بندان على الأقل، مدين = دائن، لا مبالغ سالبة.

### مصروف

```json
{
  "category": "إيجار",
  "amount": 8000,
  "method": "bank",
  "notes": "أكتوبر",
  "date": "2026-10-27",
  "shiftId": "sh_1"
}
```

---

## 10. ZATCA (Sandbox)

| Method | Path | الوصف |
|---|---|---|
| GET | `/zatca/status` | حالة البيئة والعدادات |
| GET | `/zatca/invoices?status=&page=` | فواتير ZATCA |
| GET | `/zatca/invoices/:id` | فاتورة + XML + QR |
| GET | `/zatca/chain/verify` | التحقق من السلسلة |
| POST | `/zatca/invoices/:id/report` | محاكاة الإبلاغ/الإخلاء |

### `POST /zatca/invoices/:id/report`

```json
{ "status": "REPORTED" }
```

القيم: `PENDING`, `REPORTED`, `CLEARED`, `REJECTED`. **لا يوجد اتصال ببوابة ZATCA**؛ العملية تغيّر الحالة محلياً فقط.

### `GET /zatca/chain/verify`

```json
{
  "data": {
    "environment": "sandbox",
    "checked": 375,
    "broken": 0,
    "tampered": 0,
    "valid": true,
    "warning": "بيئة تجريبية Sandbox — غير معتمدة من هيئة الزكاة والضريبة والجمارك."
  }
}
```

---

## 11. التكاملات

| Method | Path | الوصف |
|---|---|---|
| GET | `/integrations` | حالة المزودين والأوضاع |
| POST | `/integrations/payments/charge` | محاكاة تحصيل |
| GET | `/integrations/payments/transactions` | سجل المحاولات |
| GET | `/integrations/delivery/orders` | طلبات التوصيل |
| POST | `/integrations/delivery/pull` | سحب طلبات من منصة (Mock) |
| PATCH | `/integrations/delivery/orders/:id/status` | تحديث حالة |
| POST | `/integrations/printer/test` | طباعة اختبارية |
| GET | `/integrations/printer/jobs` | مهام الطباعة |

### تحصيل

```json
{
  "provider": "moyasar",
  "method": "mada",
  "amount": 75.9,
  "invoiceId": "inv_...",
  "reference": "TEST-1"
}
```

**المزودون:** `hyperpay`, `geidea`, `moyasar`, `paytabs`.
**الوضع:** يتبع `PAYMENTS_MODE` (`mock` افتراضياً). لا مبالغ حقيقية.

### سحب توصيل

```json
{ "platform": "hungerstation" }
```

**المنصات:** `hungerstation`, `jahez`, `mrsool`, `toyou`, `careem`.

### طباعة اختبارية

`POST /integrations/printer/test` لا يتطلب جسم طلب. يُنشئ `PrinterJob` ويولّد ESC/POS عبر المحوّل الحالي.

```json
{
  "data": {
    "id": "pj_...",
    "status": "printed",
    "mode": "mock",
    "bytes": 214,
    "printer": "Talal Techno Mock Printer"
  }
}
```

> الوضع `mock` لا يتصل بطابعة؛ يعيد عدد البايتات فقط. الحقول النهائية يحددها `PrinterJob` في قاعدة البيانات.

---

## 12. المؤسسة والإعدادات

| Method | Path | الوصف |
|---|---|---|
| GET | `/organization` | المؤسسة |
| GET | `/branches` | الفروع |
| GET | `/users` | المستخدمون |
| GET | `/devices` | الأجهزة |
| GET | `/settings` | إعدادات المؤسسة |
| PATCH | `/settings` | تحديث الإعدادات |

### تحديث الإعدادات

```json
{
  "name": "مطاعم طلال",
  "vatNumber": "310123456700003",
  "crNumber": "1010123456",
  "phone": "0112223333",
  "city": "الرياض",
  "settings": {
    "emenu": { "enabled": true, "allowSelfOrder": true, "requireTable": true },
    "printing": { "width": 32, "mode": "mock" }
  }
}
```

`settings` كائن حر يُدمج/يُستبدل حسب الخدمة؛ لا تضع أسراراً فيه.

---

## 13. المشتريات

| Method | Path | الوصف |
|---|---|---|
| GET | `/suppliers` | الموردون |
| POST | `/suppliers` | إنشاء مورد |
| GET | `/purchase-orders` | أوامر الشراء |
| POST | `/purchase-orders` | إنشاء أمر |
| POST | `/purchase-orders/:id/receive` | استلام وتحديث المخزون والتكلفة |

### أمر شراء

```json
{
  "supplierId": "sup_1",
  "warehouseId": "wh_main",
  "date": "2026-10-27",
  "notes": "توريد أسبوعي",
  "items": [
    { "productId": "raw_rice", "qty": 50, "unitCost": 6, "taxRate": 15 }
  ]
}
```

الاستلام ينشئ `StockMove` من نوع `PURCHASE` وقيداً (مخزون/ضريبة مدخلات/دائنون).

---

## 14. CRM والولاء

| Method | Path | الوصف |
|---|---|---|
| GET | `/crm/customers` | العملاء |
| POST | `/crm/customers` | إنشاء عميل |
| GET | `/crm/customers/:id/loyalty` | رصيد وسجل النقاط |
| POST | `/crm/customers/:id/loyalty` | تعديل يدوي |
| GET | `/crm/coupons` | الكوبونات |
| POST | `/crm/coupons` | إنشاء كوبون |

### كوبون

```json
{
  "code": "WELCOME10",
  "type": "percent",
  "value": 10,
  "minSpend": 50,
  "usageLimit": 100,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "active": true
}
```

### تعديل نقاط

```json
{ "points": 100, "note": "تعويض عن تأخير" }
```

---

## 15. المزامنة

| Method | Path | الوصف |
|---|---|---|
| POST | `/sync/push` | دفع عمليات من جهاز |
| GET | `/sync/pull?since=` | سحب مرجع (منتجات/فروع/إعدادات) |
| GET | `/sync/status?deviceId=` | حالة المزامنة |

### Push

```json
{
  "deviceId": "POS-1729",
  "operations": [
    {
      "id": "outbox-1",
      "entity": "sale",
      "type": "create",
      "entityId": "local-sale-1",
      "updatedAt": "2026-10-27T12:00:00.000Z",
      "payload": { "items": [], "payments": [] }
    }
  ]
}
```

> **مهم:** التنفيذ الحالي يسجل العمليات في `SyncOperation` ولا يعيد تطبيقها كبيع فعلي. تطبيق Flutter POS يستخدم نقاط الأعمال المباشرة (`/sales`, `/shifts/open`, `/shifts/:id/close`) بدلاً من `/sync/push`، ثم `GET /sync/pull` للمرجع. `/sync/push` الحالي مفيد للتتبع فقط. هذه فجوة موثقة.

### Pull

```json
{
  "data": {
    "serverTime": "2026-10-27T12:00:05.000Z",
    "reference": {
      "products": [],
      "branches": [],
      "categories": []
    }
  }
}
```

---

## 16. القائمة العامة (بدون مصادقة)

### `GET /public/menu?table=<qrToken>&branch=<code>`

كلاهما اختياري؛ إن غابا يُختار أول فرع نشط. يستخدم المستأجر من الفرع/الطاولة.

```json
{
  "data": {
    "tenant": { "name": "مطعم طلال تكنو", "vatNumber": "310123456700003", "currency": "SAR", "city": "الرياض" },
    "branch": { "id": "br_1", "name": "الفرع الرئيسي — العليا", "code": "RUH-01" },
    "table": { "id": "tbl_12", "name": "T11", "token": "talal-t11-uliq35" },
    "settings": {
      "allowSelfOrder": true,
      "requireTable": false,
      "welcomeText": "أهلاً بكم في مطعم طلال تكنو — اختر أصنافك."
    },
    "categories": [{ "id": "cat_main", "name": "الأطباق الرئيسية" }],
    "products": [
      {
        "id": "p_kabsa",
        "name": "كبسة دجاج",
        "price": 32,
        "taxRate": 15,
        "available": true,
        "availableServings": 14,
        "categoryId": "cat_main",
        "categoryName": "الأطباق الرئيسية",
        "emoji": "🍛"
      }
    ],
    "disclaimer": "طلب تجريبي عبر القائمة الإلكترونية — الدفع عند الكاشير. لا تُجرى مدفوعات إلكترونية من هذه الصفحة."
  }
}
```

> إعدادات `settings.emenu` تُخزَّن في `Tenant.settings`، لكن استجابة القائمة العامة تعيد الحقول الثلاثة مسطّحة كما أعلاه.

### `POST /public/orders`

```json
{
  "table": "talal-t11-uliq35",
  "branch": "RUH-01",
  "type": "dine_in",
  "customerName": "نورة",
  "customerPhone": "0551234567",
  "notes": "بدون بصل",
  "items": [
    { "productId": "p_kabsa", "qty": 2, "notes": "حار" }
  ]
}
```

**القواعد:**

- يتطلب `settings.emenu.allowSelfOrder === true`.
- إذا `requireTable === true` يجب `table` صالح ونشط.
- النوع `dine_in` عند وجود طاولة، وإلا `takeaway`؛ و`dine_in` بدون طاولة يُرفض.
- الطلب يُخزَّن كـ`Order` بـ`platform = DIRECT` و`platformName = 'QR E-Menu'`.
- لا يُنشئ فاتورة أو دفعاً؛ الدفع عند الكاشير.
- `400` عند تعطيل الطلب الذاتي أو غياب الطاولة المطلوبة، و`404` عند صنف غير متاح.

**201:**

```json
{
  "data": {
    "id": "ord_...",
    "number": "ORD-1042",
    "status": "NEW",
    "type": "DINE_IN",
    "tableName": "T11",
    "subtotal": 64,
    "tax": 9.6,
    "total": 73.6,
    "items": [{ "name": "كبسة دجاج", "qty": 2, "price": 32 }],
    "message": "تم إرسال طلبك إلى المطبخ. يرجى إتمام الدفع عند الكاشير."
  }
}
```

---

## 17. لوحة التحكم

| Method | Path | الوصف |
|---|---|---|
| GET | `/dashboard` | مؤشرات اليوم |
| GET | `/dashboard/sales-trend?days=14` | اتجاه المبيعات |
| GET | `/dashboard/top-products?limit=8` | الأكثر مبيعاً |
| GET | `/dashboard/recent` | أحدث الفواتير والطلبات |

---

## 18. أمثلة cURL

```bash
# دخول
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@talaltechno.dev","password":"Talal@1234"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')

# فتح وردية
curl -X POST http://localhost:4000/shifts/open \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"openingCash":500}'

# بيع نقدي
curl -X POST http://localhost:4000/sales \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":"p_kabsa","qty":2}],"payments":[{"method":"cash","amount":100}],"orderType":"takeaway"}'

# تحقق سلسلة ZATCA
curl http://localhost:4000/zatca/chain/verify -H "Authorization: Bearer $TOKEN"

# قائمة عامة
curl 'http://localhost:4000/public/menu?branch=RUH'
```

---

## 19. حدود معروفة

1. لا Idempotency على `POST /sales` — إعادة المحاولة قد تكرر البيع.
2. `/sync/push` لا يعيد تطبيق العمليات كأعمال.
3. لا refresh tokens ولا إبطال جلسات.
4. لا rate limiting داخل التطبيق (Nginx يحدّ `/api/`).
5. لا اختبارات e2e بعد.
6. توثيق DTO لبعض نقاط التكامل تقريبي؛ Swagger هو المرجع النهائي بعد التشغيل.
