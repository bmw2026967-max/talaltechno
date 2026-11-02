# طلال تكنو — Talal Techno

**نظام ERP + نقاط بيع سعودي مفتوح المصدر، عربي أولاً، لمطاعم ومقاهي المملكة.**
دفع مزدوج، مخزون بوصفات BOM، شاشة مطبخ، قائمة QR، ولاء، تكاملات توصيل ومدفوعات، وZATCA المرحلة الثانية **بوضع Sandbox** — مع تطبيق POS يعمل دون اتصال.

[الرخصة AGPL-3.0-or-later](LICENSE) · الإصدار `1.0.0` · Node.js ≥ 22 (بناء الإنتاج) · pnpm 9.15.4

> **نشر سحابي جاهز (Render):** استخدم ملف `render.yaml` ودليل [docs/RENDER-QUICKSTART.md](docs/RENDER-QUICKSTART.md) — ينشئ قاعدة البيانات وثلاث خدمات ويُهيّئ أول منشأة تلقائياً.

---

## ما الذي يوجد في هذا المستودع؟

المشروع يقدّم **منتجين متكاملين**:

| # | المنتج | المسار | الحالة |
|---|---|---|---|
| 1 | **عرض تجريبي كامل في المتصفح** — 19 شاشة، بيانات مطعم سعودي، بيع/ورديات/مرتجعات/محاسبة/ZATCA/طباعة/مزامنة | `index.html` + `assets/` | ✅ يعمل ومُختبر في المتصفح |
| 2 | **Monorepo إنتاجي** — NestJS API + Next.js Admin + Next.js E-Menu PWA + Flutter POS + Prisma/PostgreSQL + Redis + Docker/Nginx | `apps/` + `packages/` | 🟡 مبني ومُتحقق جزئياً (انظر مصفوفة التحقق) |

> **تنبيه قانوني:** هذا المشروع **غير معتمد** من هيئة الزكاة والضريبة والجمارك (ZATCA) ولا من البنك المركزي السعودي (SAMA). تكاملات ZATCA والمدفوعات والتوصيل تعمل افتراضياً بنمط **Mock/Sandbox**، ولا تُرسل فواتير حقيقية ولا تُحصّل أموالاً. لا توجد مفاتيح أو أسرار في المستودع.

---

## 1) تشغيل العرض التجريبي (أسرع طريقة)

### بدون أي أدوات

افتح `index.html` مباشرة في Chrome أو Edge أو Firefox. كل البيانات تُحفظ في `localStorage`، ولا يحتاج الأمر إلى إنترنت أو خادم.

### عبر خادم محلي (موصى به لاختبار PWA وقائمة QR)

```bash
npm run demo
# أو: node scripts/serve-demo.mjs
```

ثم افتح `http://localhost:4173`. المنفذ قابل للتغيير عبر `PORT`.

### حسابات العرض

| المستخدم | الدور | رمز الدخول |
|---|---|---|
| أحمد الحميري | مدير النظام | `1234` |
| منى عبدالله | مدير المبيعات | `2222` |
| سارة العلي | محاسب | `3333` |
| خالد الشامي | كاشير | `4444` |
| ريم الحربي | كاشير | `5555` |

### مسارات العرض

`#/dashboard` · `#/pos` · `#/tables` · `#/kds` · `#/emenu` · `#/sales` · `#/purchases` · `#/products` · `#/inventory` · `#/loyalty` · `#/contacts` · `#/accounting` · `#/treasury` · `#/shifts` · `#/reports` · `#/zatca` · `#/integrations` · `#/users` · `#/settings`

قائمة QR للزبائن تعمل مستقلة على `emenu.html` (وضع PWA، عربي RTL، سلة محلية، إرسال الطلب للكاشير).

---

## 2) تشغيل الحزمة الإنتاجية

### المتطلبات

- Node.js **22+** (لأن API يستهلك حزم ESM من CommonJS)
- pnpm **9.15.4** (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- Docker Desktop + Docker Compose (للتشغيل الكامل)
- Flutter 3.24+ وAndroid SDK (اختياري لتطبيق POS)

### أ) تشغيل كامل عبر Docker Compose

```bash
cp .env.example .env
# عدّل الأسرار المحلية في .env — لا ترفع .env إلى Git
docker compose up -d --build

# الـentrypoint يطبّق المخطط عبر `prisma db push` (لا توجد ترحيلات مُصدّرة بعد).
# لزرع بيانات المطعم التجريبية مرة واحدة (عملية هدّامة):
docker compose exec api pnpm db:seed
```

> لا تستخدم `pnpm db:deploy` قبل توليد ترحيلات مُصدّرة (`prisma migrate dev`). الإصدار الحالي يعتمد `db push` للتطوير فقط.

| الخدمة | العنوان |
|---|---|
| لوحة التحكم | `http://localhost:8080` |
| قائمة QR | `http://localhost:8080/menu/` |
| API | `http://localhost:8080/api` |
| Swagger | `http://localhost:8080/api/docs` |
| E-Menu مباشر | `http://localhost:3001/menu/` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

بيانات دخول البذرة: `admin@talaltechno.dev` / `Talal@1234` — **للتطوير فقط**. السكربت يرفض العمل عند `NODE_ENV=production` ويحذف بيانات الـ Tenant قبل الزرع. البذرة تنشئ: 8 مستخدمين، 32 صنفاً (12 قائمة + 20 مادة خام)، 13 فاتورة، 3 طلبات، 13 قيداً محاسبياً، 13 فاتورة ZATCA، 12 طاولة، وسلسلة تجزئة ZATCA صالحة.

> **لم يُتحقق من `docker compose up` في بيئة التسليم** لعدم توفر Docker. راجع [docs/TESTING.md](docs/TESTING.md) قبل الاعتماد عليه.

### ب) تشغيل التطوير بدون Docker

```bash
corepack enable
pnpm install
cp .env.example .env

# PostgreSQL + Redis يجب أن يعملا محلياً
pnpm db:generate
pnpm db:migrate
pnpm db:seed

pnpm --filter @talaltechno/api dev      # http://localhost:4000
pnpm --filter @talaltechno/admin dev    # http://localhost:3000
pnpm --filter @talaltechno/emenu dev    # http://localhost:3001
```

### ج) تطبيق Flutter POS

مجلدات المنصات غير مضمّنة. أنشئها مرة واحدة:

```powershell
cd apps/pos
.\tool\bootstrap.ps1 -ApiBaseUrl "http://10.0.2.2:4000"
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

راجع [apps/pos/README.md](apps/pos/README.md) للتفاصيل والقيود.

---

## البنية

```
.
├── index.html, emenu.html, assets/       # العرض التجريبي (Vanilla JS + localStorage)
├── apps/
│   ├── api/                              # NestJS 10 + Prisma + JWT + RBAC + Swagger
│   ├── admin/                            # Next.js 15 + Tailwind + RTL (لوحة التحكم)
│   ├── emenu/                            # Next.js 15 PWA لقائمة QR
│   └── pos/                              # Flutter + SQLite WAL + Outbox + ESC/POS Mock
├── packages/
│   ├── domain/                           # منطق أعمال نقي بلا اعتماديات + 60 اختباراً
│   ├── database/                         # Prisma schema + seed لمطعم سعودي
│   ├── shared-types/                     # أنواع TypeScript مشتركة
│   ├── zatca-engine/                     # واجهة Sandbox لـ ZATCA (UBL/QR/Hash)
│   └── thermal-printer/                  # ESC/POS + Mock transport
├── docker/nginx.conf                     # /api, /menu, /menu-assets
├── docker-compose.yml
├── docs/                                 # API, ERD, Deployment, Security, Testing
├── ARCHITECTURE.md · ROADMAP.md · DECISIONS.md
└── .github/workflows/ci.yml
```

### المكوّنات الرئيسية

| المكوّن | التقنية | المسؤولية |
|---|---|---|
| API | NestJS 10, Prisma 6, PostgreSQL 16 | كل منطق الأعمال، RBAC، ZATCA Sandbox، تكاملات، مزامنة |
| Admin | Next.js 15 App Router, Tailwind | إدارة المطعم، التقارير، الإعدادات، KDS، الطاولات |
| E-Menu | Next.js 15 PWA | قائمة QR للزبون، سلة، طلب ذاتي، دفع عند الكاشير |
| POS | Flutter, sqflite WAL | بيع دون اتصال، ورديات، صندوق صادر، طباعة تجريبية |
| Domain | JavaScript نقي | قواعد البيع/المرتجع/المخزون/القيد/الوردية/ZATCA/المزامنة |
| Cache/Queue | Redis 7 | جاهز للتوسع (BullMQ غير مُفعّل بعد) |

اقرأ التفاصيل في [ARCHITECTURE.md](ARCHITECTURE.md).

---

## الوحدات الوظيفية

- **المؤسسة والفروع:** مستأجرون، فروع، مستودعات، أجهزة، مستخدمون، أدوار.
- **نقطة البيع:** محلي/توصيل/استلام/سيارة، طاولات، فواتير مفتوحة، دفع مختلط، آجل، خصومات، مرتجعات، ورديات، ESC/POS.
- **المطبخ KDS:** طوابير حسب الحالة، مؤقتات، إيقاف الأصناف (86-ing).
- **قائمة QR:** PWA عربية، طلب من الطاولة، إعدادات السماح بالطلب الذاتي.
- **المخزون:** مواد خام، وصفات BOM، توفر تلقائي، هالك، تسويات، تحويلات، تقييم.
- **المحاسبة:** دليل حسابات، قيود مزدوجة آلية ويدوية، ميزان مراجعة، دخل، ميزانية، مصروفات.
- **المشتريات:** موردون، أوامر شراء، استلام، متوسط تكلفة.
- **CRM والولاء:** عملاء، نقاط، فئات، كوبونات.
- **ZATCA Sandbox:** UBL 2.1، QR TLV، سلسلة SHA-256، توقيع ECDSA وهمي صريح، تحقق من السلسلة.
- **التكاملات:** مدفوعات Mada/STC Pay/Apple Pay/بطاقات عبر HyperPay/Geidea/Moyasar/PayTabs، وتوصيل HungerStation/Jahez/Mrsool/ToYou/Careem — **كلها Adapter + Mock + Sandbox**.
- **الأمان:** JWT، RBAC، تحقق مدخلات، Helmet، سجل تدقيق، نسخ احتياطي، Webhooks.

---

## التكاملات: Mock أولاً

كل تكامل خارجي يتبع النمط:

```
Adapter (واجهة)  ←  MockAdapter (افتراضي، بلا شبكة)
                 ←  SandboxAdapter (يتطلب مفاتيح بيئة، لا يُرفع أي مفتاح)
```

- `PAYMENTS_MODE=mock` و`DELIVERY_MODE=mock` و`PRINTER_MODE=mock` افتراضياً.
- `ZATCA_ENVIRONMENT=sandbox` — بدون CSID يبقى التوليد محلياً وموسوماً Sandbox.
- لا تُدّعى أي شهادة أو اعتماد. الانتقال للإنتاج يتطلب تسجيلاً رسمياً ومفاتيح خارج Git.

---

## الاختبارات والتحقق

```bash
# منطق الأعمال (60 اختباراً، بلا تثبيت اعتماديات)
cd packages/domain && node --test "test/*.test.js"

# فحص مخطط قاعدة البيانات
cd packages/database && pnpm prisma validate

# اختبارات Flutter (تتطلب Flutter SDK)
cd apps/pos && flutter test

# كل المهام عبر Turborepo (يتطلب pnpm install)
pnpm test
pnpm typecheck
pnpm build
```

| العنصر | الحالة |
|---|---|
| العرض التجريبي: 19 مساراً، بيع/وردية/مرتجع/مخزون/قيد/ZATCA/طباعة/مزامنة | ✅ مُختبر في المتصفح |
| `packages/domain` — 60 اختباراً | ✅ تمر جميعها |
| Prisma schema | ✅ `prisma validate` ناجح |
| `pnpm install` + `pnpm typecheck` | ✅ 526 حزمة، 11/11 مهمة |
| `pnpm build` (API + Admin + E-Menu + الحزم) | ✅ 7/7 مهام؛ Admin 16 مساراً وE-Menu 4 مسارات |
| تشغيل Admin/E-Menu الإنتاجي | ✅ `next start` — `/login` و`/` يعيدان 200 |
| API runtime | ✅ PostgreSQL 17 مؤقت + `prisma db push` + seed + اختبار دخان كامل (بيع/مرتجع/طلب/تقسيم/قائمة QR/تكاملات/ZATCA) |
| Docker Compose | 🟡 غير مُتحقق (Docker غير مثبت) |
| Flutter POS | 🟡 هيكل غير مُجمَّع (Flutter/Android SDK غير متوفرة) |
| ZATCA/SAMA | 🔴 اعتماد خارجي — غير مطالب به وغير مُدّعى |

التفاصيل الكاملة في [docs/TESTING.md](docs/TESTING.md).

---

## التوثيق

- [RELEASE_NOTES.md](RELEASE_NOTES.md) — ملاحظات الإصدار الرسمي 1.0.0، التحقق، والقيود.
- [CHANGELOG.md](CHANGELOG.md) — سجل التغييرات.
- [ARCHITECTURE.md](ARCHITECTURE.md) — المعمارية، تدفق البيانات، المزامنة، المحاسبة، ZATCA.
- [ROADMAP.md](ROADMAP.md) — ما أُنجز، المراحل القادمة، المتطلبات الخارجية.
- [DECISIONS.md](DECISIONS.md) — قرارات التصميم ومبرراتها.
- [docs/API.md](docs/API.md) — واجهات REST، المصادقة، الأخطاء، أمثلة.
- [docs/ERD.md](docs/ERD.md) — مخطط الكيانات والعلاقات.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker، Nginx، النسخ الاحتياطي، الإنتاج.
- [docs/SECURITY.md](docs/SECURITY.md) — نموذج التهديد، RBAC، الأسرار، ZATCA.
- [docs/TESTING.md](docs/TESTING.md) — مصفوفة التحقق وخطة الاختبار اليدوي.

---

## الترخيص

[AGPL-3.0-or-later](LICENSE) © 2026 Talal Techno contributors.

استخدام هذا النظام في خدمة شبكية يلزمك بإتاحة الكود المصدري المعدّل وفق AGPL. للاستخدام التجاري المغلق تواصل مع maintainers لترتيب ترخيص بديل.
