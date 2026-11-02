# طلال تكنو — الإصدار الرسمي 1.0.0

**نظام ERP + نقاط بيع سعودي مفتوح المصدر، عربي أولاً، لمطاعم ومقاهي المملكة.**
دفع مزدوج، مخزون بوصفات BOM، شاشة مطبخ، قائمة QR، ولاء، تكاملات توصيل ومدفوعات، وZATCA المرحلة الثانية **بوضع Sandbox** — مع POS يعمل دون اتصال.

- **رقم الإصدار:** `1.0.0`
- **تاريخ الإصدار:** 2026-10-27
- **الرخصة:** AGPL-3.0-or-later
- **الحالة:** إصدار رسمي مفتوح المصدر — جاهز للعرض والتطوير والتقييم. **ليس اعتماداً إنتاجياً** ولا ادعاء اعتماد ZATCA/SAMA.
- **المتطلبات:** Node.js ≥ 22، pnpm 9.15.4، PostgreSQL 15+، Redis 7+ (اختياري للتشغيل الأساسي)، Docker (اختياري).

---

## 1. ما الذي تتضمنه الحزمة؟

| المكوّن | الوصف |
|---|---|
| `index.html` + `assets/` | العرض التجريبي الكامل (19 مساراً) — يعمل في المتصفح |
| `emenu.html` | قائمة QR/PWA مستقلة للعميل |
| `apps/api` | NestJS API + Prisma + Swagger |
| `apps/admin` | Next.js 15 Admin |
| `apps/emenu` | Next.js E-Menu PWA |
| `apps/pos` | Flutter POS offline-first |
| `packages/domain` | منطق الأعمال + 60 اختباراً |
| `packages/zatca-engine` | ZATCA Sandbox (UBL 2.1 / QR / Hash chain) |
| `packages/thermal-printer` | ESC/POS + Mock transport |
| `packages/database` | Prisma schema + seed مطعم سعودي |
| `docs/` | API، ERD، النشر، الأمان، الاختبار |
| `docker-compose.yml` + `docker/` | حزمة النشر الكاملة |
| `.github/workflows/ci.yml` | CI للتحقق والبناء |

---

## 2. التشغيل السريع — العرض التجريبي

```bash
# من جذر الحزمة
pnpm demo
# أو: node scripts/serve-demo.mjs
```

افتح `http://127.0.0.1:4173`.

**دخول العرض التجريبي:** `أحمد الحميري` / `1234`
(مستخدمون آخرون: منى `2222`، سارة `3333`، خالد `4444`، ريم `5555`.)

> يمكن أيضاً فتح `index.html` مباشرة، لكن PWA وQR يحتاجان HTTP.

---

## 3. التشغيل الكامل — API + Admin + E-Menu

### أ) إعداد البيئة

```bash
corepack enable
pnpm install
cp .env.example .env
# عدّل .env: DATABASE_URL، JWT_SECRET، APP_URL، NEXT_PUBLIC_API_URL
```

### ب) قاعدة البيانات

```bash
pnpm db:generate
pnpm db:migrate      # أو: prisma db push
pnpm db:seed
```

> البذرة **مدمّرة للتطوير فقط**: تحذف بيانات الـTenant وتعيد إنشاء مطعم تجريبي. ترفض العمل عند `NODE_ENV=production`.

### ج) التشغيل

```bash
pnpm dev
# API:    http://localhost:4000
# Admin:  http://localhost:3000
# E-Menu: http://localhost:3001
```

**دخول البذرة الإنتاجية:** `admin@talaltechno.dev` / `Talal@1234` — للتطوير فقط.

### د) Docker (إن توفر)

```bash
docker compose up -d
docker compose exec api pnpm db:seed
# http://localhost:8080
```

---

## 4. ما تم التحقق منه في هذا الإصدار

| العنصر | النتيجة |
|---|---|
| `pnpm install` | ✅ 526 حزمة |
| `pnpm typecheck` | ✅ 11/11 مهمة عبر 8 حزم |
| `pnpm build` | ✅ 7/7 مهام — Admin 16 مساراً، E-Menu 4 مسارات |
| `pnpm test` | ✅ 12/12 مهمة — 60/60 اختبار domain |
| Prisma schema + PostgreSQL 17.10 UTF8 | ✅ `db push` ناجح |
| الزرع | ✅ 8 مستخدمين، 32 صنفاً، 13 فاتورة، 13 ZATCA، 12 طاولة |
| API runtime | ✅ health/login/catalog/public menu/trial balance/ZATCA |
| بيع + مرتجع | ✅ `TT-1013` ثم `RET-1002`، ميزان متوازن |
| سلسلة ZATCA | ✅ 13 → 14 → 15، 0 مكسور و0 معدّل |
| الطلبات | ✅ إنشاء/إضافة/تقسيم/نقل + QR dine-in/takeaway + KDS |
| التكاملات | ✅ 4 دفع و5 توصيل mock + طباعة ESC/POS |
| Admin/E-Menu إنتاجي | ✅ HTTP 200 |

---

## 5. قيود معروفة — اقرأها قبل الإنتاج

1. **Docker Compose** لم يُشغَّل في بيئة الإصدار؛ يجب التحقق منه على خادم فيه Docker.
2. **Flutter POS** هيكل مكتمل لكنه لم يُجمَّع؛ يلزم Flutter/Android SDK واختبار جهاز.
3. **Redis/BullMQ** لم يُختبر تشغيلياً.
4. **ZATCA/SAMA**: Sandbox فقط. لا اعتماد، ولا إرسال لبوابة حقيقية.
5. **الدفع/التوصيل**: Mock/Sandbox فقط. لا مفاتيح إنتاج ولا مدفوعات حقيقية.
6. **الطباعة الحرارية**: Mock ESC/POS؛ لم تُختبر طابعة فعلية.
7. **PWA offline** لم يُختبر على جهاز حقيقي.
8. لا اختبارات E2E/عزل/IDOR آلية، ولا ترحيلات Prisma مُصدَّرة.
9. البذرة مدمّرة ولا تصلح للإنتاج.
10. غيّر `JWT_SECRET` وكلمات المرور قبل أي نشر.

---

## 6. الأمان

- لا توجد أسرار في الكود؛ استخدم `.env` (غير ملتزم) و`.env.example` كقالب.
- `NEXT_PUBLIC_*` تظهر في حزمة المتصفح — لا تضع فيها أسراراً.
- راجع `docs/SECURITY.md` قبل النشر.
- الإبلاغ عن الثغرات: لا تفتح Issue عاماً؛ راسل مالك المشروع.

---

## 7. الترخيص

AGPL-3.0-or-later — راجع `LICENSE`.

---

## 8. البصمات

بعد فك الضغط، تحقق من سلامة الحزمة:

```bash
sha256sum -c SHA256SUMS.txt
# Windows:
Get-FileHash .\talal-techno-1.0.0-source.zip -Algorithm SHA256
```

**لا ندّعي أي اعتماد رسمي من ZATCA أو SAMA. هذا إصدار برمجي مفتوح المصدر، وليس شهادة.**
