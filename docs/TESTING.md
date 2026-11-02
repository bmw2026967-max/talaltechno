# الاختبار والتحقق — طلال تكنو

> آخر تحديث: 2026-10-27. تفصل هذه الوثيقة بين **ما تم التحقق منه فعلياً** و**ما لم يُتحقق**.

## 1. مصفوفة التحقق

| # | العنصر | الأداة/الطريقة | النتيجة | الدليل |
|---|---|---|---|---|
| 1 | العرض التجريبي: 19 مساراً | متصفح + فحص console | ✅ | كل المسارات تُعرض، لا أخطاء console |
| 2 | بيع POS كامل | متصفح يدوي | ✅ | أصناف، خصم، دفع، إيصال، خصم مخزون |
| 3 | طاولات/فواتير مفتوحة/تقسيم/نقل | متصفح يدوي | ✅ | الحالات تتحدث والقيد يبقى متوازناً |
| 4 | KDS ومؤقتات و86-ing | متصفح يدوي | ✅ | الحالة تتغير وتظهر في KDS |
| 5 | قائمة QR/PWA | متصفح يدوي + HTTP | ✅ | طلب يصل KDS؛ PWA يعمل عبر خادم |
| 6 | ولاء وكوبونات | متصفح يدوي | ✅ | كسب/استبدال/عكس عند المرتجع |
| 7 | ورديات وفرق نقدي | متصفح يدوي | ✅ | فتح/إغلاق/فرق |
| 8 | مرتجع كامل/جزئي | متصفح يدوي | ✅ | عكس مخزون/ضريبة/ولاء |
| 9 | مخزون/هالك/تحويل/BOM | متصفح يدوي | ✅ | توفر الصنف يتبع المواد |
| 10 | محاسبة/ميزان/دخل/ميزانية | متصفح يدوي | ✅ | متوازن بعد العمليات |
| 11 | ZATCA Sandbox | متصفح + سكربت | ✅ | 375 فاتورة (بذرة هذه الجلسة)، 0 مكسور، 0 معدّل |
| 12 | تكاملات Mock | متصفح يدوي | ✅ | دفع/توصيل/طباعة تعمل بلا مفاتيح |
| 13 | طباعة حرارية Mock | متصفح + اختبار domain | ✅ | بايتات ESC/POS وإيصال |
| 14 | مزامنة Offline | متصفح يدوي | ✅ | pending → 0 بعد push/pull |
| 15 | نسخ احتياطي/استعادة | متصفح يدوي | ✅ | JSON يستعيد الحالة |
| 16 | `packages/domain` | `node --test` | ✅ | 60/60 تمر |
| 17 | Prisma schema | `prisma validate` | ✅ | "The schema ... is valid" |
| 18 | `pnpm install` | pnpm 9.15.4 (corepack) | ✅ | 526 حزمة، `pnpm-lock.yaml` مولّد |
| 19 | Typecheck | `pnpm typecheck` | ✅ | 11/11 مهمة عبر 8 حزم |
| 20 | Build | `pnpm build` | ✅ | 7/7 مهام: API dist، Admin 16 مساراً، E-Menu 4 مسارات |
| 21 | Admin production start | `next start` | ✅ | `/login` → HTTP 200 |
| 22 | E-Menu production start | `next start` | ✅ | `/` → HTTP 200 |
| 23 | API runtime | PostgreSQL 17 مؤقت + `prisma db push` + seed + اختبار دخان | ✅ | health/login/catalog/public menu/trial balance/ZATCA/sale/return/orders/split/KDS/integrations/sync/printer |
| 24 | Docker Compose | `docker compose up` | 🟡 | Docker غير متوفر |
| 25 | Flutter analyze/test | `flutter test` | 🟡 | Flutter غير متوفر |
| 26 | E2E API | Supertest | ❌ | غير مكتوب |
| 27 | اختبار عزل مستأجرين | آلي | ❌ | غير مكتوب |
| 28 | ZATCA/SAMA production | بوابة رسمية | 🔴 | اعتماد خارجي |

**الرموز:** ✅ مُتحقق · 🟡 غير مُتحقق في هذه البيئة · ❌ غير موجود · 🔴 خارج النطاق.

**ملخص جلسة 2026-10-27:** نجح `pnpm install` ثم `pnpm typecheck` (11/11) و`pnpm build` (7/7) و`pnpm test` (12/12 مهمة، منها 60/60 اختبار domain). شُغّل Admin وE-Menu الإنتاجيان وأعادا 200. شُغّل API فعلياً على PostgreSQL 17.10 مؤقت (منفذ 55432، ترميز UTF8): نجح `prisma db push` والزرع (8 مستخدمين، 32 صنفاً، 13 فاتورة، 13 فاتورة ZATCA) واختبار الدخان الكامل. لم تُشغَّل Docker Compose أو Flutter.

## 2. تشغيل اختبارات منطق الأعمال

```bash
cd packages/domain
node --test "test/*.test.js"
```

**النتيجة المتوقعة:**

```
# tests 60
# suites 0
# pass 60
# fail 0
```

### التغطية

| الملف | ما يُختبر |
|---|---|
| `sale.test.js` | بنود، ضريبة، خصم، رسوم، دفع مختلط، باقي، آجل، تحقق |
| `returns.test.js` | مرتجع كامل/جزئي، تجاوز الكمية، عكس COGS، استرداد |
| `inventory.test.js` | BOM، توفر، صرف، استرجاع، هالك، تسوية، تقييم |
| `journal.test.js` | قيد بيع/مرتجع، توازن، ميزان، قائمة دخل |
| `shift.test.js` | فتح/إغلاق، نقدي متوقع، فرق، حالات |
| `zatca.test.js` | TLV/QR، UBL، سلسلة، كشف تعديل، توقيع وهمي |
| `printer.test.js` | ESC/POS، إيصال، تذكرة، Mock |
| `sync.test.js` | Outbox، دفع، دمج، تعارض، إعادة محاولة |

### اختبارات Flutter (غير مُشغَّلة)

```bash
cd apps/pos
flutter test
```

تغطي:
- `cart_test.dart`: حساب الضريبة/الإجمالي، إضافة/حذف، صنف غير متاح، تحويل API.
- `printer_test.dart`: أوامر ESC/POS، وجود النص العربي، Mock transport.
- `money_test.dart`: تقريب وتنسيق.

**لم تُشغَّل** لعدم توفر Flutter SDK.

## 3. التحقق من Prisma

```bash
cd packages/database
DATABASE_URL="postgresql://u:p@localhost:5432/db?schema=public" npx prisma validate
```

**النتيجة:** المخطط صالح. لم تُنفَّذ ترحيلات أو seed لعدم توفر PostgreSQL.

## 4. اختبار العرض التجريبي يدوياً

### الإعداد

```bash
node scripts/serve-demo.mjs
# افتح http://localhost:4173
```

أو افتح `index.html` مباشرة (بعض ميزات PWA/QR تحتاج HTTP).

### سيناريو 1 — بيع بسيط (< 3 نقرات)

1. سجّل الدخول `1234`.
2. `#/pos` → اضغط صنفاً → اضغط «الدفع».
3. اختر «نقدي» → «إتمام».
4. **المتوقع:** إيصال، خصم مخزون، قيد متوازن، فاتورة في `#/sales`.

### سيناريو 2 — دفع مختلط وباقي

1. أضف أصنافاً بقيمة 73.60.
2. ادفع 50 نقداً + 30 مدى.
3. **المتوقع:** `paid=80`, `change=6.40`, `due=0`.

### سيناريو 3 — وردية

1. `#/shifts` → افتح وردية بـ500.
2. بِع نقداً 100.
3. أغلق الوردية بـ600.
4. **المتوقع:** expected = 600، variance = 0.

### سيناريو 4 — مرتجع

1. من `#/sales` افتح فاتورة → «مرتجع».
2. أرجع بنداً واحداً.
3. **المتوقع:** فاتورة RETURN، مخزون يعود، ضريبة/COGS معكوسة، نقاط ولاء معكوسة.

### سيناريو 5 — مخزون وBOM

1. `#/products` → صنف قائمة → عرض الوصفة.
2. `#/inventory` → سجّل هالكاً من مادة.
3. **المتوقع:** توفر الأصناف المرتبطة ينخفض/يتوقف حسب الكمية.

### سيناريو 6 — ZATCA

1. `#/zatca` → «تحقق من السلسلة».
2. **المتوقع:** `checked > 0`, `broken=0`, `tampered=0`, `valid=true`، تحذير Sandbox ظاهر.

### سيناريو 7 — طباعة

1. من إيصال بيع → «طباعة».
2. **المتوقع:** معاينة ESC/POS/إيصال، لا طابعة حقيقية.

### سيناريو 8 — مزامنة

1. `#/settings` أو شريط المزامنة → اعرض pending.
2. نفّذ push ثم pull.
3. **المتوقع:** pending = 0، لا أخطاء.

### سيناريو 9 — قائمة QR

1. `#/emenu` → افتح رابط طاولة.
2. أضف أصنافاً وأرسل.
3. **المتوقع:** طلب يظهر في `#/kds` و`#/tables`.

### سيناريو 10 — نسخ احتياطي

1. `#/settings` → «تنزيل نسخة».
2. عدّل بيانات، ثم استورد النسخة.
3. **المتوقع:** الحالة تعود كما كانت.

## 5. اختبار API (بعد التشغيل)

### تحضير

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate   # أو db push
pnpm db:seed
pnpm --filter @talaltechno/api dev
```

### اختبارات دخان (Smoke)

```bash
BASE=http://localhost:4000

curl -fsS $BASE/health

TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@talaltechno.dev","password":"Talal@1234"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')

AUTH="Authorization: Bearer $TOKEN"

curl -fsS $BASE/products -H "$AUTH"
curl -fsS $BASE/shifts/current -H "$AUTH"
curl -fsS $BASE/inventory/availability -H "$AUTH"
curl -fsS $BASE/accounting/trial-balance -H "$AUTH"
curl -fsS $BASE/zatca/chain/verify -H "$AUTH"
curl -fsS "$BASE/public/menu?branch=RUH"
```

### اختبار بيع → قيد → ZATCA

1. افتح وردية.
2. أنشئ بيعاً نقدياً.
3. تحقق:
   - `GET /sales/:id` يعيد `paid`, `change`, `zatca.qr`.
   - `GET /accounting/trial-balance` متوازن.
   - `GET /zatca/chain/verify` سليم.
4. أنشئ مرتجعاً وتأكد من العكس.

### اختبار RBAC

- سجّل كاشير → حاول `POST /accounting/journal` → **403**.
- سجّل كاشير → `GET /sales` → **200**.
- بلا توكن → `GET /products` → **401**.

### اختبار العزل (مطلوب)

- أنشئ مستأجرين A/B.
- تأكد أن مستخدم A لا يرى فواتير/عملاء B عبر كل `:id`.
- **غير مُنفَّذ بعد.**

### نتيجة التشغيل الفعلي (2026-10-27)

تم تشغيل API الإنتاجي (`dist/main.js`) على PostgreSQL 17.10 محمول، ترميز UTF8، منفذ `55432`:

- `prisma db push`: «Your database is now in sync with your Prisma schema».
- الزرع: 8 مستخدمين، 32 صنفاً (12 قائمة + 20 مادة خام)، 13 فاتورة، 3 طلبات، 13 قيداً، 13 فاتورة ZATCA، 12 طاولة.
- `GET /health`: `ok` وقاعدة البيانات `ok`، الدفع/التوصيل/الطباعة `mock`، ZATCA `sandbox`.
- الدخول `admin@talaltechno.dev` بدور `ADMIN`.
- الكتالوج: 12/12 صنفاً متاحاً (بعد إصلاح حساب التوفر من مواد الوصفة).
- القائمة العامة: 12 صنفاً، 6 تصنيفات، الطلب الذاتي مفعّل.
- بيع `TT-1013` ثم مرتجع `RET-1002`؛ ميزان المراجعة متوازن قبل وبعد (1,587.61).
- سلسلة ZATCA: 13 → 14 بعد البيع → 15 بعد المرتجع، 0 مكسور و0 معدّل.
- الطلبات: إنشاء/إضافة بنود/تقسيم `ORD-0004` → `ORD-0005`، طلب محلي `ORD-0006`، طلب QR محلي `ORD-0007`، طلب QR سفري `ORD-0008`، ثم NEW → PREPARING → READY مع تحديث حالة البنود.
- التكاملات: 4 مزودي دفع و5 مزودي توصيل بوضع mock؛ عملية HyperPay معتمدة؛ استيراد طلبَي HungerStation؛ طباعة اختبارية 875 بايت؛ `zatca.certified = false`.
- المزامنة: `GET /sync/pull` يعمل.

## 6. اختبار Docker (مطلوب قبل الإنتاج)

```bash
cp .env.example .env
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://localhost:8080/health
docker compose exec api pnpm db:seed
```

ثم:

- Admin: `http://localhost:8080`.
- E-Menu: `http://localhost:8080/menu/` وتأكد من تحميل CSS/JS (assetPrefix).
- Swagger: `http://localhost:8080/api/docs`.
- تحقق من `/health` عبر Nginx.
- أوقف API وتأكد أن Nginx يعيد 502 (sig) وأن health يفشل.
- أعد التشغيل وتحقق من التعافي.

**لم يُنفَّذ** (Docker غير متوفر).

## 7. اختبار Flutter (مطلوب قبل الميدان)

```bash
cd apps/pos
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

### سيناريو جهاز حقيقي

1. ثبّت APK.
2. سجّل الدخول (أو «متابعة بدون اتصال»).
3. افتح وردية.
4. فعّل وضع الطيران.
5. بِع 3 فواتير.
6. أغلق التطبيق وأعد فتحه → **الفواتير موجودة**.
7. أعد الشبكة → «مزامنة الآن».
8. تحقق من `pending=0` و`unsynced=0`.
9. اطبع إيصالاً → **Mock**، لا طابعة.
10. أغلق الوردية وتحقق من الفرق.

**لم يُنفَّذ** (Flutter/Android SDK غير متوفرين).

## 8. اختبارات القبول (مطلوبة)

| الاختبار | النوع | الحالة |
|---|---|---|
| بيع نقدي/مختلط/آجل | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| مرتجع كامل/جزئي | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| وردية وفرق | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| مخزون/هالك/BOM | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| قيد متوازن | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| ZATCA Sandbox | وحدة + تكامل | وحدة ✅ / تكامل ❌ |
| Offline → Sync | وحدة + جهاز | وحدة ✅ / جهاز ❌ |
| طباعة Mock | وحدة + جهاز | وحدة ✅ / جهاز ❌ |
| عزل مستأجرين | تكامل | ❌ |
| IDOR | تكامل | ❌ |

## 9. CI

الملف `.github/workflows/ci.yml` يشغّل:

1. `pnpm install --no-frozen-lockfile` (حتى يُلتزم lockfile).
2. `pnpm db:generate` ثم `prisma db push` على PostgreSQL خدمة CI.
3. `pnpm test:domain` (60 اختباراً).
4. `pnpm typecheck`.
5. `pnpm build`.
6. فحص أسرار أساسي عبر `git grep`.

**تم تنفيذ الخطوات 1 و3 و4 و5 محلياً بنجاح، ونُفّذ `prisma db push` على PostgreSQL 17.10 محمول.** لم يُشغَّل الـworkflow نفسه لأن المستودع ليس Git repo ولا يوجد remote. يجب التحقق عند أول push.

## 10. أدوات وبيئات

| الأداة | متوفرة في بيئة التسليم؟ |
|---|---|
| Node.js 22.14 (portable) | ✅ |
| Prisma CLI (temp) | ✅ (للتحقق) |
| pnpm | ✅ (corepack 9.15.4 — shim مؤقت) |
| Docker | ❌ |
| PostgreSQL | ✅ (17.10 محمول للتحقق فقط — ليس ضمن التسليم) |
| Redis | ❌ |
| Flutter/Android SDK | ❌ |
| Git | ❌ |

## 11. القيود

1. الاختبارات اليدوية للعرض لا تُغني عن اختبارات آلية.
2. لا اختبارات e2e أو عزل أو IDOR.
3. لا قياس أداء/حمل.
4. لا اختبار إمكانية وصول (a11y) آلي.
5. لا اختبار متصفحات متعددة (Chromium فقط عملياً).
6. لا اختبار PWA offline حقيقي على جهاز.
7. لا اختبار طباعة حقيقية.
8. لا اختبار ZATCA مقابل البوابة.
9. لا اختبار Flutter على جهاز.

## 12. خطة P4 (التحقق التشغيلي)

1. تثبيت Docker وRedis (pnpm متوفر عبر corepack، وPostgreSQL تم التحقق عبر نسخة محمولة).
2. ✅ `pnpm install` تم؛ يتبقى الالتزام بـ `pnpm-lock.yaml` والتحويل إلى `--frozen-lockfile`.
3. ✅ `pnpm typecheck` + `pnpm build` نجحا (11/11 و7/7).
4. ✅ `prisma db push` + seed + اختبار API تم؛ يتبقى إنشاء ترحيل `prisma migrate dev --name init` والتزامه.
5. `docker compose up` واختبار Nginx/E-Menu وAPI/health.
6. كتابة اختبارات e2e (Supertest) للسيناريوهات أعلاه.
7. كتابة اختبار عزل وIDOR.
8. تثبيت Flutter وبناء APK واختبار جهاز.
9. تحديث هذه الوثيقة بالنتائج والأدلة.
10. تشغيل CI عند أول push والتحقق من نجاحه.

**لا تُعلن جاهزية إنتاج قبل إتمام P4 وP5.**
