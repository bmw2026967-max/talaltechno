# مخطط الكيانات والعلاقات (ERD) — طلال تكنو

> المصدر الحقيقي: [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma)
> PostgreSQL 16 · Prisma 6 · المال `Decimal(12,2)` · الكميات `Decimal(12,3/4)`
> المخطط **مُتحقق منه** بـ`prisma validate`، لكن لم تُنفَّذ ترحيلات على قاعدة فعلية بعد.

## 1. اصطلاحات

| الاصطلاح | المعنى |
|---|---|
| `tenantId` | معرف المستأجر؛ إلزامي في كل جدول أعمال |
| `@db.Decimal(12,2)` | مبلغ مالي بالريال بمنزلتين |
| `@db.Decimal(12,3)` | كمية مخزون بثلاث منازل |
| `@db.Decimal(12,4)` | كمية وصفة BOM بأربع منازل |
| `@db.Date` | تاريخ يومي (بدون وقت) للفواتير والقيود |
| `cuid()` | معرف نصي فريد |
| `onDelete: Cascade` | حذف تابع مع الأب |
| `onDelete: Restrict` | منع الحذف إذا وُجدت مراجع |
| `onDelete: SetNull` | إبقاء السجل وإفراغ المرجع |

## 2. الخريطة العامة

```mermaid
erDiagram
    Tenant ||--o{ Branch : "فروع"
    Tenant ||--o{ User : "مستخدمون"
    Tenant ||--o{ Warehouse : "مستودعات"
    Tenant ||--o{ Account : "دليل حسابات"
    Tenant ||--o{ Product : "أصناف ومواد"
    Tenant ||--o{ Customer : "عملاء"
    Tenant ||--o{ Supplier : "موردون"
    Tenant ||--o{ Invoice : "فواتير"
    Tenant ||--o{ Order : "طلبات"
    Tenant ||--o{ Shift : "ورديات"
    Tenant ||--o{ ZatcaInvoice : "فواتير ضريبية"

    Branch ||--o{ Warehouse : "يضم"
    Branch ||--o{ DiningTable : "طاولات"
    Branch ||--o{ Device : "أجهزة"
    Branch ||--o{ Invoice : "يُصدر"
    Branch ||--o{ Order : "يستقبل"
    Branch ||--o{ Shift : "ورديات"

    Product ||--o{ RecipeLine : "وصفة (صنف)"
    Product ||--o{ StockLevel : "أرصدة"
    Product ||--o{ StockMove : "حركات"
    Product ||--o{ InvoiceItem : "بنود فاتورة"
    Product ||--o{ OrderItem : "بنود طلب"

    Invoice ||--o{ InvoiceItem : "بنود"
    Invoice ||--o{ Payment : "دفعات"
    Invoice ||--o| ZatcaInvoice : "فاتورة ضريبية"
    Invoice ||--o{ Invoice : "مرتجع"

    Order ||--o{ OrderItem : "بنود"
    Order ||--o{ Invoice : "يُفوتر"
    DiningTable ||--o{ Order : "طلبات"

    JournalEntry ||--o{ JournalLine : "أسطر"
    Account ||--o{ JournalLine : "يُستخدم"

    Customer ||--o{ Invoice : "فواتير"
    Customer ||--o{ LoyaltyTransaction : "نقاط"
    Supplier ||--o{ PurchaseOrder : "أوامر شراء"
```

## 3. المؤسسة والهوية

```mermaid
erDiagram
    Tenant ||--o{ Branch : ""
    Tenant ||--o{ Warehouse : ""
    Tenant ||--o{ Device : ""
    Tenant ||--o{ User : ""
    Tenant ||--o{ UserBranch : ""
    Branch ||--o{ Warehouse : ""
    Branch ||--o{ Device : ""
    Branch ||--o{ UserBranch : ""
    User ||--o{ UserBranch : ""

    Tenant {
        string id PK
        string name
        string slug UK
        string vatNumber
        string crNumber
        decimal vatRate
        string currency
        string timezone
        json settings
        boolean active
    }
    Branch {
        string id PK
        string tenantId FK
        string name
        string code
        boolean active
    }
    Warehouse {
        string id PK
        string tenantId FK
        string branchId FK
        string name
        string code
    }
    User {
        string id PK
        string tenantId FK
        string branchId FK
        string name
        string email
        enum role
        string passwordHash
        string pinHash
    }
    UserBranch {
        string id PK
        string tenantId FK
        string userId FK
        string branchId FK
    }
    Device {
        string id PK
        string tenantId FK
        string branchId FK
        string name
        enum type
        string serial UK
        datetime lastSeenAt
    }
```

**قيود فريدة مهمة:**

- `Tenant.slug` عالمي.
- `Branch(tenantId, code)`.
- `Warehouse(branchId, code)`.
- `User(tenantId, email)`.
- `Device(tenantId, serial)`.
- `UserBranch(userId, branchId)`.

## 4. الكتالوج والمخزون

```mermaid
erDiagram
    Category ||--o{ Product : "تصنيف"
    Product ||--o{ RecipeLine : "مكوّنات"
    Product ||--o{ StockLevel : "أرصدة"
    Product ||--o{ StockMove : "حركات"
    Warehouse ||--o{ StockLevel : "يخزّن"
    Warehouse ||--o{ StockMove : "حركة"
    Product ||--o{ WasteRecord : "هالك"

    Product {
        string id PK
        string tenantId FK
        string categoryId FK
        string name
        string sku
        string barcode
        enum type "MENU | RAW"
        decimal price
        decimal cost
        decimal taxRate
        string unit
        boolean active
        boolean available
        boolean trackStock
        decimal minStock
    }
    RecipeLine {
        string id PK
        string productId FK "الصنف"
        string materialId FK "المادة الخام"
        decimal qty
    }
    StockLevel {
        string id PK
        string tenantId FK
        string warehouseId FK
        string productId FK
        decimal qty
        datetime updatedAt
    }
    StockMove {
        string id PK
        string tenantId FK
        string warehouseId FK
        string productId FK
        enum type
        decimal qty
        decimal unitCost
        decimal value
        string referenceType
        string referenceId
        datetime createdAt
    }
    WasteRecord {
        string id PK
        string tenantId FK
        string branchId FK
        string warehouseId FK
        string productId FK
        decimal qty
        decimal cost
        string reason
    }
```

**القاعدة:**

- `type = MENU` ← `RecipeLine[]` تشير إلى `type = RAW`.
- توفر الصنف = `min(StockLevel.qty / RecipeLine.qty)` عبر مكوناته المتتبعة.
- `trackStock = false` يستثني المكوّن من حساب التوفر.
- البيع يخصم المواد الخام (وليس الصنف النهائي).
- `StockMove.qty` موجب للدخول وسالب للخروج حسب نوع الحركة.

**أنواع الحركة:** `OPENING`, `PURCHASE`, `SALE`, `SALE_RETURN`, `WASTE`, `ADJUSTMENT`, `TRANSFER_IN`, `TRANSFER_OUT`.

## 5. الطلبات والمبيعات

```mermaid
erDiagram
    Order ||--o{ OrderItem : "بنود"
    Order ||--o{ Invoice : "فواتير"
    Order }o--|| DiningTable : "طاولة"
    Invoice ||--o{ InvoiceItem : "بنود"
    Invoice ||--o{ Payment : "دفعات"
    Invoice ||--o| ZatcaInvoice : "ZATCA"
    Invoice ||--o{ Invoice : "مرتجع"
    Shift ||--o{ Invoice : "وردية"
    Customer ||--o{ Invoice : "عميل"
    Customer ||--o{ Order : "عميل"

    Order {
        string id PK
        string tenantId FK
        string branchId FK
        string number UK
        enum type
        enum status
        string tableId FK
        string customerId FK
        enum platform
        string platformName
        string externalOrderId
        decimal subtotal
        decimal tax
        decimal total
        datetime readyAt
        datetime servedAt
    }
    OrderItem {
        string id PK
        string orderId FK
        string productId FK
        string name
        decimal qty
        decimal price
        decimal cost
        enum status
        string station
    }
    Invoice {
        string id PK
        string tenantId FK
        string branchId FK
        string shiftId FK
        string orderId FK
        string customerId FK
        string originalInvoiceId FK
        string number UK
        enum type "SALE | RETURN"
        enum status
        date date
        decimal subtotal
        decimal discount
        decimal serviceCharge
        decimal deliveryFee
        decimal tax
        decimal total
        decimal paid
        decimal due
        enum method
        decimal cogs
        decimal profit
        string couponCode
        int loyaltyPoints
        enum syncStatus
        json snapshot
    }
    InvoiceItem {
        string id PK
        string invoiceId FK
        string productId FK
        string name
        enum type
        decimal qty
        decimal price
        decimal net
        decimal taxRate
        decimal taxAmount
        decimal total
        decimal cost
    }
    Payment {
        string id PK
        string invoiceId FK
        enum method
        decimal amount
        string reference
        string provider
        string transactionId
        string status
    }
    DiningTable {
        string id PK
        string tenantId FK
        string branchId FK
        string name
        string zone
        int seats
        string status
        string qrToken UK
    }
    Shift {
        string id PK
        string tenantId FK
        string branchId FK
        string userId FK
        string number UK
        enum status
        decimal openingCash
        decimal closingCash
        decimal expectedCash
        decimal variance
        decimal sales
        int orders
        decimal tax
        decimal cogs
    }
```

**ملاحظات:**

- `Order.number` فريد داخل المستأجر.
- `Invoice.number` فريد داخل المستأجر.
- `Invoice.originalInvoiceId` للمرتجعات.
- `Invoice.snapshot` يحفظ بنود/أسعار لحظة البيع (ضروري للفواتير التاريخية).
- `Invoice.syncStatus` لتتبع مزامنة أجهزة POS.
- `Payment.status` نصي (`approved` افتراضياً) لدعم حالات PSP لاحقاً.

## 6. المحاسبة

```mermaid
erDiagram
    Account ||--o{ JournalLine : "يُستخدم"
    JournalEntry ||--o{ JournalLine : "أسطر"
    Account ||--o{ Account : "شجرة"

    Account {
        string id PK
        string tenantId FK
        string code
        string name
        enum type
        string parentId FK
        boolean active
    }
    JournalEntry {
        string id PK
        string tenantId FK
        string number UK
        date date
        string description
        string sourceType
        string sourceId
        string sourceNumber
        boolean posted
        decimal totalDebit
        decimal totalCredit
        string createdById FK
    }
    JournalLine {
        string id PK
        string entryId FK
        string accountId FK
        decimal debit
        decimal credit
        string memo
        string partyType
        string partyId
    }
```

**القيود:**

- `JournalEntry(tenantId, number)` فريد.
- `JournalLine` لا يحمل `tenantId`؛ العزل عبر `entry.tenantId` و`account.tenantId`.
- `Account(tenantId, code)` فريد.
- لا يمكن حذف حساب مستخدم (`Restrict`).

## 7. ZATCA

```mermaid
erDiagram
    Invoice ||--o| ZatcaInvoice : "1:1"

    ZatcaInvoice {
        string id PK
        string tenantId FK
        string invoiceId FK UK
        string uuid UK
        string type
        string invoiceHash
        string previousHash
        string qr
        string signature
        string xml
        enum status
        string environment
        string warning
        int retries
        datetime issuedAt
        datetime reportedAt
    }
```

**ملاحظات:**

- علاقة 1:1 مع الفاتورة (`invoiceId @unique`).
- `uuid` عالمي فريد.
- `status`: `PENDING | REPORTED | CLEARED | REJECTED` (محلي فقط في Sandbox).
- `environment` يجب أن يكون `sandbox` في هذا الإصدار.
- `previousHash` يبني السلسلة لكل مستأجر.
- `xml` نص كامل للفاتورة UBL.

## 8. CRM والولاء

```mermaid
erDiagram
    Customer ||--o{ Invoice : "فواتير"
    Customer ||--o{ Order : "طلبات"
    Customer ||--o{ LoyaltyTransaction : "نقاط"
    Invoice ||--o{ LoyaltyTransaction : "مصدر"

    Customer {
        string id PK
        string tenantId FK
        string code UK
        string name
        string phone
        string vatNumber
        int loyaltyPoints
        string tier
        decimal totalSpent
        datetime lastPurchaseAt
    }
    LoyaltyTransaction {
        string id PK
        string tenantId FK
        string customerId FK
        string invoiceId FK
        int points
        string type
        string note
    }
    Coupon {
        string id PK
        string tenantId FK
        string code UK
        string type
        decimal value
        decimal minSpend
        int usageLimit
        int used
        boolean active
        datetime expiresAt
    }
```

## 9. المشتريات

```mermaid
erDiagram
    Supplier ||--o{ PurchaseOrder : "أوامر"
    PurchaseOrder ||--o{ PurchaseOrderItem : "بنود"
    Product ||--o{ PurchaseOrderItem : "مادة"

    Supplier {
        string id PK
        string tenantId FK
        string name
        string vatNumber
        decimal balance
    }
    PurchaseOrder {
        string id PK
        string tenantId FK
        string branchId FK
        string supplierId FK
        string number
        enum status
        date date
        decimal subtotal
        decimal tax
        decimal total
    }
    PurchaseOrderItem {
        string id PK
        string purchaseOrderId FK
        string productId FK
        decimal qty
        decimal unitCost
        decimal taxRate
        decimal total
    }
```

**حالات أمر الشراء:** `DRAFT`, `ORDERED`, `RECEIVED`, `CANCELLED` (بحسب enum `PurchaseStatus`).

## 10. التكاملات والمزامنة والتدقيق

```mermaid
erDiagram
    Tenant ||--o{ IntegrationConfig : "إعدادات"
    Tenant ||--o{ PaymentTransaction : "مدفوعات"
    Tenant ||--o{ DeliveryOrder : "توصيل"
    Tenant ||--o{ PrinterJob : "طباعة"
    Tenant ||--o{ SyncOperation : "مزامنة"
    Tenant ||--o{ AuditLog : "تدقيق"
    Tenant ||--o{ Notification : "إشعارات"
    Tenant ||--o{ WebhookEndpoint : "Webhooks"
    Tenant ||--o{ Backup : "نسخ"
    Invoice ||--o{ PaymentTransaction : "دفع"
    Order ||--o| DeliveryOrder : "توصيل"
```

| النموذج | الغرض | حقول مفتاحية |
|---|---|---|
| `IntegrationConfig` | إعداد مزود | `kind`, `provider`, `mode`, `enabled`, `config` (بلا أسرار) |
| `PaymentTransaction` | محاولة دفع | `provider`, `amount`, `status`, `reference`, `raw` |
| `DeliveryOrder` | طلب منصة | `platform`, `externalId`, `status`, `payload` |
| `PrinterJob` | مهمة طباعة | `type`, `payload`, `status`, `bytes`, `printer` |
| `SyncOperation` | عملية جهاز | `deviceId`, `entity`, `entityType`, `payload`, `status` |
| `AuditLog` | تدقيق | `userId`, `action`, `entity`, `entityId`, `details`, `ip` |
| `Notification` | إشعار | `channel`, `recipient`, `status`, `payload` |
| `WebhookEndpoint` | Webhook صادر | `url`, `secretHash`, `events`, `active` |
| `Backup` | نسخة | `path`, `size`, `checksum`, `encrypted`, `createdAt` |

> **تنبيه:** لا تُخزَّن مفاتيح المزودين في `IntegrationConfig.config`؛ القيم الحساسة تُقرأ من متغيرات البيئة فقط. الحقل مخصص لمعرّفات غير سرية وإعدادات عرض.

## 11. العلاقات الحاكمة (Rules)

1. **كل جدول أعمال له مسار مستأجر:** إما `tenantId` مباشر، أو عبر أب (`InvoiceItem → Invoice → tenantId`).
2. **المراجع المالية لا تُحذف:** `Restrict` على الحسابات والموظفين المرتبطين بورديات، و`SetNull` للمراجع الاختيارية.
3. **الفواتير تاريخية:** لا تُحدَّث بنودها بعد الإصدار؛ التصحيح عبر مرتجع أو قيد عكسي.
4. **الطلبات قابلة للتعديل:** يمكن إضافة بنود/تغيير حالة قبل الفوترة.
5. **الوردية لا تُحذف:** تُغلق فقط.
6. **ZATCA سجل دائم:** لا يُحذف إلا بحذف الفاتورة (Cascade) — ممنوع عملياً.
7. **المخزون لا يُحذف:** تُسجَّل الحركات؛ التسوية تعدّل الرصيد عبر حركة.
8. **العملاء/الموردون:** `SetNull` على الفواتير للحفاظ على السجل المالي.

## 12. الفهارس وسببها

| الفهرس | الاستخدام |
|---|---|
| `Invoice(tenantId, date)` | تقارير الفترة |
| `Invoice(tenantId, type, status)` | المرتجعات والمتأخرات |
| `Order(tenantId, status, createdAt)` | طابور KDS |
| `Order(platform, externalOrderId)` | منع تكرار طلبات التوصيل |
| `StockMove(tenantId, createdAt)` | حركة المخزون |
| `StockLevel(warehouseId, productId)` فريد | رصيد واحد لكل مستودع/مادة |
| `JournalEntry(tenantId, date)` | ميزان المراجعة |
| `ZatcaInvoice(tenantId, issuedAt)` | سلسلة التجزئة |
| `SyncOperation(deviceId, status)` | متابعة الأجهزة |
| `AuditLog(tenantId, createdAt)` | التحقيق |

## 13. دورة حياة البيانات

```mermaid
flowchart LR
    A["طلب Order"] --> B["فاتورة Invoice"]
    B --> C["دفعات Payment"]
    B --> D["ZATCA"]
    B --> E["قيد JournalEntry"]
    B --> F["حركات StockMove"]
    B --> G["ولاء LoyaltyTransaction"]
    B -->|مرتجع| H["Invoice RETURN"]
    H --> E2["قيد عكسي"]
    H --> F2["إرجاع مخزون"]
```

- لا حذف للفواتير المفوترة؛ تُلغى بمرتجع.
- إلغاء طلب قبل الفوترة: `status = CANCELLED` مع الاحتفاظ بالسجل.
- حذف مستأجر (Cascade) عملية إدارية خطرة تتطلب نسخة احتياطية.

## 14. ما لم يُنمذج بعد

- جداول HR/رواتب/بصمات (مذكورة كوحدة لكنها غير منفذة في المخطط).
- تعدد العملات وأسعار الصرف.
- الضرائب المتعددة/الإعفاءات.
- إدارة العروض/الوجبات المركبة (Combo) ككيانات مستقلة.
- تخصيص المخزون (Reservations) لأصناف معينة.
- سجل تغييرات تفصيلي لكل حقل (CDC).

هذه فجوات معروفة في ROADMAP وليست أخطاء في المخطط الحالي؛ تُضاف عند الحاجة إليها في P5.
