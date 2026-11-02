# حزمة الإصدار الرسمي — طلال تكنو 1.0.0

**تاريخ الإصدار:** 2026-10-27 · **الرخصة:** AGPL-3.0-or-later

## محتويات المجلد

| الملف | الوصف |
|---|---|
| `talal-techno-1.0.0-source.zip` | الحزمة الكاملة: العرض التجريبي + Monorepo + التوثيق + Docker + CI |
| `talal-techno-1.0.0-demo.zip` | نسخة العرض التجريبي فقط — تعمل في المتصفح |
| `SHA256SUMS.txt` | بصمات SHA-256 للأرشيفين |
| `manifest.json` | بيانات الإصدار والتحقق والقيود |
| `talal-techno-1.0.0/` | مجلد المصدر بعد فك الضغط (نسخة عمل) |
| `talal-techno-1.0.0-demo/` | مجلد العرض بعد فك الضغط |

## التحقق من السلامة

```powershell
# Windows
Get-FileHash .\talal-techno-1.0.0-source.zip -Algorithm SHA256
Get-FileHash .\talal-techno-1.0.0-demo.zip -Algorithm SHA256
```

```bash
# Linux/macOS
sha256sum -c SHA256SUMS.txt
```

طابق الناتج مع `SHA256SUMS.txt` أو `manifest.json`.

## التشغيل السريع — العرض التجريبي

1. فك ضغط `talal-techno-1.0.0-demo.zip`.
2. افتح `index.html` مباشرة، أو شغّل خادماً محلياً:

```bash
npx serve . -l 4173
# أو
python -m http.server 4173
```

3. افتح `http://127.0.0.1:4173`.
4. الدخول: `أحمد الحميري` / `1234`.

## التشغيل الكامل

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate      # أو prisma db push
pnpm db:seed
pnpm dev
```

- API: `http://localhost:4000`
- Admin: `http://localhost:3000`
- E-Menu: `http://localhost:3001`
- دخول البذرة: `admin@talaltechno.dev` / `Talal@1234` — للتطوير فقط.

أو عبر Docker (يتطلب Docker):

```bash
docker compose up -d
docker compose exec api pnpm db:seed
# http://localhost:8080
```

## ملخص التحقق

| العنصر | النتيجة |
|---|---|
| `pnpm install` | ✅ 526 حزمة |
| `pnpm typecheck` | ✅ 11/11 |
| `pnpm build` | ✅ 7/7 — Admin 16 مساراً، E-Menu 4 مسارات |
| `pnpm test` | ✅ 12/12 — domain 60/60 |
| PostgreSQL + Prisma | ✅ `db push` + seed |
| API runtime | ✅ بيع/مرتجع/طلبات/KDS/ZATCA/تكاملات |
| Admin/E-Menu production | ✅ HTTP 200 |

## قيود معروفة

- **Docker Compose** لم يُشغَّل في بيئة الإصدار.
- **Flutter POS** لم يُجمَّع (لا Flutter/Android SDK).
- **Redis/BullMQ** لم يُختبر تشغيلياً.
- **ZATCA/SAMA**: Sandbox فقط، ولا اعتماد رسمي.
- **الدفع/التوصيل**: Mock/Sandbox فقط.
- لا اختبارات E2E/عزل/IDOR، ولا ترحيلات Prisma مُصدَّرة.
- الطباعة الحرارية Mock فقط.
- البذرة مدمّرة وللتطوير فقط.

**هذا إصدار برمجي رسمي مفتوح المصدر، وليس شهادة اعتماد أو تصريحاً بالجاهزية الإنتاجية.**
