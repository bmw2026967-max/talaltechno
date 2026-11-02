# النشر السحابي — طلال تكنو 1.1.0

هذا الدليل يشرح تشغيل النظام كخدمة سحابية متعددة المنشآت على سيرفر واحد، مع تطبيق نقاط بيع واحد يعمل على iPad/iPhone وAndroid وWindows.

> **حدود واضحة:** هذه الحزمة تُعدّ نشراً عملياً على سيرفر افتراضي (VPS) وليست منصة سحابية مُدارة. لم يتم اختبار `docker-compose.cloud.yml` داخل بيئة هذا المشروع لعدم توفر Docker محلياً. كما أن ZATCA والمدفوعات والتوصيل ما زالت Sandbox/Mock وغير معتمدة.

## المعمارية

```
iPad / iPhone / Android / Windows (Flutter POS)
                    │  HTTPS + JWT
                    ▼
            Caddy (TLS تلقائي)
        ┌───────────┼────────────┐
        │           │            │
     /api/*       /menu*         /
        │           │            │
      API        E-Menu       Admin
   (NestJS)     (Next.js)    (Next.js)
        │
   ┌────┴────┐
PostgreSQL  Redis
```

- تطبيق POS يخزّن البيع محلياً في SQLite WAL ويستخدم outbox للمزامنة.
- كل طلب يحمل `tenantId` من رمز JWT؛ لا تختلط بيانات المنشآت.
- المنشأة تُحدد عند الدخول بـ `tenantSlug` لأن البريد الإلكتروني فريد داخل المنشأة لا عالمياً.
- Caddy يصدر شهادة Let's Encrypt تلقائياً عند توفر نطاق عام وسجلات DNS صحيحة.

## متطلبات السيرفر

| العنصر | الحد الأدنى | الموصى به |
|---|---|---|
| المعالج | 2 vCPU | 4 vCPU |
| الذاكرة | 4 GB | 8 GB |
| القرص | 40 GB SSD | 80 GB SSD + نسخ احتياطي خارجي |
| النظام | Ubuntu 22.04/24.04 LTS | Ubuntu 24.04 LTS |
| البرمجيات | Docker Engine 24+ وCompose v2 | أحدث إصدار مستقر |

افتح المنفذين `80/tcp` و`443/tcp` (و`443/udp` اختياري لـ HTTP/3). لا تفتح `5432` أو `6379` للإنترنت.

## 1. تجهيز النطاق

1. اشترِ نطاقاً مثل `erp.example.sa`.
2. أنشئ سجل DNS من النوع `A` يشير إلى عنوان IP العام للسيرفر.
3. انتظر انتشار DNS ثم تحقق:

```bash
dig +short erp.example.sa
```

## 2. رفع المشروع

```bash
sudo apt update && sudo apt install -y git
git clone <repository-url> talaltechno
cd talaltechno
```

> إن لم يكن لديك مستودع Git، ارفع مجلد المشروع عبر `scp` أو `rsync` باستثناء `node_modules` و`.next` و`release`.

## 3. إعداد الأسرار

```bash
cp .env.cloud.example .env.cloud
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 24   # PIN_PEPPER
```

عدّل `.env.cloud`:

```dotenv
DOMAIN=erp.example.sa
ACME_EMAIL=you@example.sa
PUBLIC_API_URL=https://erp.example.sa/api
APP_URL=https://erp.example.sa
POSTGRES_PASSWORD=<كلمة مرور قوية>
JWT_SECRET=<سر عشوائي طويل>
PIN_PEPPER=<سر عشوائي>
```

مهم: `PUBLIC_API_URL` يُدمج داخل حزم Next.js وقت البناء، لذا غيّره قبل أول بناء. إذا غيّرته لاحقاً أعد بناء `admin` و`emenu`.

- `DATABASE_URL` يشير في الوضع الافتراضي إلى خدمة `postgres` داخل الحاوية؛ عند استخدام قاعدة سحابية مُدارة (AWS RDS / Cloud SQL / Azure) عيّن المتغير إلى عنوان الاتصال (راجع القسم 12).

## 4. أول تشغيل

```bash
docker compose --env-file .env.cloud -f docker-compose.cloud.yml up -d --build
docker compose --env-file .env.cloud -f docker-compose.cloud.yml ps
```

تحقق من الصحة:

```bash
curl -fsS https://erp.example.sa/health
```

يجب أن يعيد JSON يحتوي `"status":"ok"` و`"database":"ok"`. إن فشل Caddy في إصدار الشهادة، تحقق من DNS والمنفذين 80/443 وسجلاته:

```bash
docker compose --env-file .env.cloud -f docker-compose.cloud.yml logs -f caddy
```

## 5. إنشاء منشأة (Tenant)

السكربت **غير هدّام**: يرفض رمزاً موجوداً ولا يحذف أي بيانات.

```bash
docker compose --env-file .env.cloud -f docker-compose.cloud.yml exec api \
  pnpm --filter @talaltechno/database provision:tenant -- \
  --name "مطعم النخيل" \
  --slug alnakheel \
  --email owner@alnakheel.sa \
  --password "StrongPass123!" \
  --branch "الفرع الرئيسي" \
  --city الرياض \
  --vat 310123456700003 \
  --cr 1010123456
```

سينشئ: المنشأة، فرعاً، مخزناً، مالكاً بدور `OWNER`، دليل حسابات كامل، تصنيفات قائمة، 10 طاولات، وجهاز POS.

لإضافة فرع ثانٍ أو مستخدمين إضافيين استخدم لوحة التحكم بعد الدخول.

## 6. الدخول

- لوحة التحكم: `https://erp.example.sa`
- قائمة الطعام: `https://erp.example.sa/menu`
- API: `https://erp.example.sa/api` (توثيق Swagger على `/api/docs` إذا كان مكشوفاً)
- تطبيق POS: أدخل رابط API و`Tenant Slug` والبريد وكلمة المرور.

## 7. بناء تطبيق POS

### Android

```bash
cd apps/pos
flutter pub get
flutter build apk --release \
  --dart-define=API_BASE_URL=https://erp.example.sa/api \
  --dart-define=TENANT_SLUG=alnakheel
```

لـ Google Play استخدم `flutter build appbundle` ووقّع بـ keystore. لا تُضمّن كلمات مرور أو مفاتيح توقيع في المستودع.

### iOS / iPadOS

يتطلب macOS مع Xcode:

```bash
cd apps/pos
flutter pub get
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://erp.example.sa/api \
  --dart-define=TENANT_SLUG=alnakheel
```

ثم وقّع عبر Xcode/Transporter وانشر على App Store أو MDM. لا يمكن بناء IPA على Windows/Linux.

### Windows

يتطلب Windows مع Visual Studio 2022 (Desktop development with C++):

```powershell
cd apps\pos
flutter pub get
flutter build windows --release `
  --dart-define=API_BASE_URL=https://erp.example.sa/api `
  --dart-define=TENANT_SLUG=alnakheel
```

الناتج في `apps\pos\build\windows\x64\runner\Release\`. وزّع المجلد كاملاً. للتوقيع استخدم شهادة Authenticode.

### ملاحظات عامة

- `TENANT_SLUG` اختياري لكنه يقلل أخطاء الدخول في نشر مخصص لمنشأة واحدة.
- `API_BASE_URL` يجب أن ينتهي بـ `/api` عند استخدام Caddy أعلاه.
- التطبيق يعمل دون اتصال؛ المزامنة كل 5 دقائق وعند الطلب من الإعدادات.
- لا تدّعِ أن الملفات موقعة أو منشورة في المتاجر إلا بعد تنفيذ خطوات التوقيع والنشر فعلياً.

## 8. النسخ الاحتياطي

سكربت جاهز:

```bash
chmod +x scripts/backup-postgres.sh
BACKUP_DIR=/var/backups/talaltechno ./scripts/backup-postgres.sh
```

أضفه إلى cron يومياً:

```cron
15 2 * * * cd /opt/talaltechno && BACKUP_DIR=/var/backups/talaltechno ./scripts/backup-postgres.sh >> /var/log/talaltechno-backup.log 2>&1
```

انسخ النسخ خارج السيرفر (S3 أو خادم آخر). الاستعادة:

```bash
gunzip -c /var/backups/talaltechno/talaltechno-YYYYMMDD-HHMMSS.dump.gz \
  | docker compose --env-file .env.cloud -f docker-compose.cloud.yml exec -T postgres \
    sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists'
```

> الاستعادة بـ `--clean` تحذف الكائنات الحالية. جرّبها على قاعدة اختبارية أولاً.

## 9. التحديث والتراجع

أو عبر السكربت الجاهز على السيرفر:

```bash
./scripts/deploy-cloud.sh
```

أو يدوياً:

```bash
git pull
docker compose --env-file .env.cloud -f docker-compose.cloud.yml build
docker compose --env-file .env.cloud -f docker-compose.cloud.yml up -d
```

- خذ نسخة احتياطية قبل كل تحديث.
- `RUN_DB_PUSH=true` يطبق مخطط Prisma عند الإقلاع. للإنتاج المستقر يُفضّل اعتماد `prisma migrate deploy` بعد إضافة ترحيلات مُدارة.
- للتراجع: أعد نشر الصورة/الوسم السابق ثم استعد النسخة الاحتياطية إن تغيّر المخطط.

## 10. قائمة أمان مختصرة

- [ ] كلمات مرور PostgreSQL وJWT وPIN عشوائية وطويلة.
- [ ] `.env.cloud` بصلاحيات `600` وغير موجود في Git.
- [ ] المنافذ 5432 و6379 غير منشورة.
- [ ] جدار ناري يسمح فقط بـ 22 (مقيّد IP) و80 و443.
- [ ] تحديثات أمنية دورية للنظام والصور.
- [ ] نسخ احتياطية مُختبرة الاستعادة.
- [ ] مراقبة `/health` وتنبيه عند الفشل.
- [ ] عدم استخدام بيانات البذرة التجريبية في الإنتاج (`SEED_DEMO=false`).
- [ ] مراجعة صلاحيات المستخدمين وفصل حسابات الكاشير عن المالك.

## 11. النشر عبر GitHub Actions

يُنفَّذ النشر السحابي تلقائياً عند كل push إلى `main` عبر workflow `Deploy`:

```
.github/workflows/deploy.yml
```

مسار التنفيذ:

1. **Build:** يبني صور API وAdmin وE-Menu ويُدرجها في GitHub Container Registry (GHCR) بصيغة `ghcr.io/<owner>/<repo>/{api,admin,emenu}:latest`.
2. **Deploy:** يشغّل على السيرفر عبر SSH:
   ```bash
   docker compose --env-file .env.cloud -f docker-compose.cloud.yml build api admin emenu
   docker compose --env-file .env.cloud -f docker-compose.cloud.yml up -d api admin emenu caddy
   ```
3. **Health:** بعد الانتظار حتى يبدأ التشغيل، يفحص `https://<DOMAIN>/health`.

### الإعداد المطلوب (GitHub Secrets / Variables)

| البند | النوع | القيمة المقترحة |
|---|---|---|
| `VPS_HOST` | Secret | عنوان IP العام للسيرفر (VPS) |
| `VPS_USER` | Secret | مستخدم SSH (مثال: `root` أو `ubuntu`) |
| `VPS_SSH_KEY` | Secret | مفتاح SSH الخاص بالسيرفر |
| `DOMAIN` | Variable | النطاق المستخدم، مثال: `erp.example.sa` |
| `PUBLIC_API_URL` | Variable | `https://<DOMAIN>/api` |

ملاحظات:

- يجب أن يكون المشروع مُستجوباً في المسار `/opt/talaltechno` على السيرفر.
- البناء يتم على السيرفر داخل الحاويات؛ لا يُشترط تخزين الصور في GHCR لعملية النشر، لكنه يُستخدم للتتبع والرجوع.
- يمكن تشغيل النشر يدوياً عبر `workflow_dispatch` من تبويب Actions.

## 12. استخدام قاعدة بيانات سحابية مُدارة (Managed Database)

البنية الموصى بها للنشر السحابي الحقيقي:

- **VPS (Hetzner / DigitalOcean / AWS EC2):** يستضيف التطبيقات (API + Admin + E-Menu) وRedis داخل Docker.
- **قاعدة بيانات PostgreSQL مُدار على السحابة:** AWS RDS / Google Cloud SQL / Azure Database for PostgreSQL.

### الإعداد

1. أنشئ قاعدة مُدارة PostgreSQL 16 في المنطقة القريبة من المملكة (مثال: AWS RDS في منطقة `me-central-1` / Bahrain أو Google Cloud SQL).
2. عيّن في `.env.cloud`:

   ```dotenv
   DATABASE_URL=postgresql://<user>:<password>@<endpoint>:5432/<db>?schema=public
   ```

3. أوقف خدمة `postgres` الداخلية (غير ضرورية مع قاعدة مُدارة):

   ```bash
   docker compose --env-file .env.cloud -f docker-compose.cloud.yml stop postgres
   ```

4. أعد تشغيل التطبيقات.

### الأمان

- Security group للقاعدة: السماح بالاتصال من عنوان IP الخاص بالسيرفر فقط (مثال: `203.0.113.10/32`).
- لا تفتح منفذ `5432` للإنترنت.
- فعّل النسخ الاحتياطي التلقائي من المزوّد + سكربت `scripts/backup-postgres.sh` للنسخ المتقدم.

### ما بعد التثبيت

- بعد تثبيت ترحيلات Prisma تدريجياً، غيّر `RUN_DB_PUSH=false` في `.env.cloud` واعتمد `prisma migrate deploy` (راجع قسم الترحيلات في [DEPLOYMENT.md](DEPLOYMENT.md)).

## 13. ما لم يُختبر هنا

| العنصر | الحالة |
|---|---|
| Docker Compose على سيرفر حقيقي | مُعد لكن غير مُشغّل في بيئة التطوير |
| نشر Render (Blueprint + Dockerfiles) | الملفات جاهزة، لكن لم يُبنَ فعلياً هنا لعدم توفر Docker/Node في بيئة التطوير |
| شهادة TLS من Let's Encrypt | يعتمد على DNS والسيرفر، غير مُختبر هنا |
| بناء Android/iOS/Windows | يعتمد على CI/أجهزة البناء؛ راجع سير العمل |
| توقيع المتاجر وApp Store | غير منفذ |
| ZATCA / ساما / مدفوعات حقيقية | Sandbox/Mock فقط، بلا اعتماد |

لأي نشر فعلي، نفّذ الخطوات على بيئة staging أولاً ووثّق نتائجك.

## 14. النشر على منصة PaaS (Render)

بديلاً عن VPS: يُنشر التطبيق كخدمات Docker على **Render** (منصة PaaS) دون الحاجة إلى إدارة خادم أو تثبيت Docker محلياً.

### البنية والتكلفة

يحتوي المستودع على `render.yaml` الذي يحدد:

| المورد | الخطة | السعر الشهري |
|---|---|---|
| `talaltechno-db` — PostgreSQL مُدارة 256MB | `0.1c-256mb` | 6$ |
| `talaltechno-api` — Docker + health `/health` | `0.5c-512mb` | 7$ |
| `talaltechno-admin` — Docker | `0.5c-512mb` | 7$ |
| `talaltechno-emenu` — Docker | `0.5c-512mb` | 7$ |
| **الإجمالي** | | **~27$/شهر** |

> لا نستخدم Redis لأن الـ API لا يعتمد عليه إطلاقاً (لا يوجد أي استخدام لـ `REDIS_URL` في `apps/api/src`).
> خطط `free` توفر المال لكنها غير مناسبة للإنتاج: خدمة الويب تتوقف عند الخمول (إقلاع بطيء ~1 دقيقة)، وقاعدة PostgreSQL المجانية **تنتهي بعد 30 يوماً وتُحذف بياناتها**.

### المتطلبات (على المستخدم)

1. حساب GitHub ورفع المستودع (Public) — راجع قسم 11.
2. حساب Render مع طريقة دفع (Stripe). لا يلزم Docker أو Node على جهازك.
3. أربع قيم تُدخل عند إنشاء الـ Blueprint:
   - `TENANT_NAME` — اسم المنشأة، مثال: `مطعم طلال`
   - `TENANT_SLUG` — رمز لاتيني فريد، مثال: `talal`
   - `OWNER_EMAIL` — بريد المالك (يُستخدم لتسجيل الدخول)
   - `OWNER_PASSWORD` — كلمة مرور قوية (8 أحرف على الأقل)

### خطوات النشر

1. ارفع الكود إلى GitHub على الفرع `main`.
2. في Render: **New → Blueprint** ثم اختر المستودع (Render يقرأ `render.yaml` تلقائياً).
3. أدخل قيم المتغيرات الأربعة أعلاه عند الطلب، ثم **Apply**.
4. انتظر أول بناء: ثلاث صور Docker (API + Admin + E-Menu) وقد يستغرق 15–30 دقيقة.
5. الروابط بعد النجاح:
   - API: `https://talaltechno-api.onrender.com` (فحص الصحة: `/health`، توثيق: `/docs`)
   - لوحة التحكم: `https://talaltechno-admin.onrender.com`
   - القائمة الإلكترونية: `https://talaltechno-emenu.onrender.com`
6. سجّل الدخول إلى لوحة التحكم بـ `Tenant Slug` + `OWNER_EMAIL` + `OWNER_PASSWORD`.

### تهيئة المنشأة تلقائياً

لا حاجة إلى Shell أو أوامر يدوية. عند إقلاع خدمة API:

1. `RUN_DB_PUSH=true` يطبّق مخطط Prisma على قاعدة البيانات (idempotent).
2. `BOOTSTRAP_TENANT=true` يستدعي `provision:tenant --if-missing`، فينشئ المنشأة والفرع والمخزن وحساب المالك ودليل الحسابات والتصنيفات و10 طاولات وجهاز POS — مرة واحدة فقط. أي إقلاع لاحق يتخطى الخطوة بهدوء.

### ملاحظات مهمة

- Render يحوّل متغيرات البيئة إلى **build args** تلقائياً، لذا `NEXT_PUBLIC_API_URL` و`NEXT_PUBLIC_EMENU_URL` تُدمج داخل صور Next.js وقت البناء.
- لا تضع `/api` في `NEXT_PUBLIC_API_URL`: الـ API لديه global prefix فارغ ولا يوجد reverse proxy يزيل البادئة.
- `APP_URL` في خدمة API هو قائمة CORS ويجب أن تحتوي نطاقي لوحة التحكم والقائمة الإلكترونية. إذا تغيّرت أسماء الخدمات (لأن اسم النطاق محجوز)، حدّث `APP_URL` و`NEXT_PUBLIC_API_URL` و`NEXT_PUBLIC_EMENU_URL`.
- القائمة الإلكترونية تُخدم من **جذر نطاقها** على Render (لا يوجد reverse proxy تحت `/menu`)؛ مسار VPS خلف Caddy لا يزال يستخدم `/menu` عبر `docker-compose.cloud.yml`.
- `RUN_DB_PUSH=true` مقبول الآن لأن المشروع لا يحتوي ترحيلات Prisma مُصدّرة بعد. عند إضافة `packages/database/prisma/migrations` استبدله بـ `prisma migrate deploy`.
- Render Hobby يشمل نسخاً احتياطياً/Point-in-time recovery لمدة 3 أيام و5 GB نقل بيانات شهرياً.
- ربط نطاق مخصص: **Settings → Custom Domains** ثم أضف سجل CNAME كما يطلب Render (شهادة TLS تلقائية).

### الفرق عن مسار VPS

| البند | VPS + Docker | Render (PaaS) |
|---|---|---|
| إدارة الخادم | يدوية | مُدارة |
| قاعدة البيانات | يدوية (Docker أو مُدارة) | Render Postgres |
| TLS | Caddy/Let's Encrypt | تلقائي |
| Deploy | يدوي/SSH/GitHub Actions | تلقائي من Git |
| النسخ الاحتياطي | سكربت/مزوّد | PITR مدمج (3 أيام في Hobby) |
| التكلفة | حسب المزوّد | ~27$/شهر |
