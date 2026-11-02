# النشر على Render (مجاني) — دليل سريع

هذا الدليل لـ **الخطة المجانية (Free tier)**. لا بطاقة، لا اشتراك. لكنها تأتي بقيود (انظر "القيود" في الأسفل).

## ما تحتاجه

| المتطلب | pourquoi |
|---|---|
| حساب GitHub (مجاني) | استضافة الكود |
| حساب Neon (مجاني، بدون بطاقة) | قاعدة بيانات PostgreSQL دائمة |
| حساب Render (مجاني) | استضافة النظام |
| أربع قيم للمنشأة | تُدخل مرة واحدة |

## 1) إنشاء حساب GitHub ومستودع (إذا لم تفعل بعد)

1. سجّل في <https://github.com/signup> وفعّل البريد.
2. افتح <https://github.com/new>: الاسم `talaltechno`، **Public**، **لا** تضف README/.gitignore/License.
3. رابط المستودع: `https://github.com/bmw2026967-max/talaltechno` (موجود بالفعل).

## 2) إنشاء قاعدة بيانات مجانية على Neon (بدون بطاقة)

1. افتح <https://neon.tech> → **Sign Up** (GitHub/Google/Email).
2. **Create Project**: الاسم `talaltechno`، Region **AWS Asia Pacific (Singapore)** (الأقرب لـ Render singapore).
3. بعد الإنشاء، من لوحة المشروع: **Connection Details** → انسخ **Connection string** (Pooled أو Direct — استخدم **Direct**).
   - يجب أن ينتهي بـ `?sslmode=require` (Neon يتطلب SSL).
   - مثال: `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. احفظه — ستلصقه في Render.

> Neon Free: 0.5 GB، بدون انتهاء، بدون بطاقة. قاعدة بيانات واحدة (project) تكفي.

## 3) النشر على Render (مجاني)

### خيار أ — زر النشر (أسهل)

افتح: **https://render.com/deploy?repo=https://github.com/bmw2026967-max/talaltechno**

### خيار ب — يدوياً

1. سجّل في <https://dashboard.render.com/register> (GitHub).
2. **New → Blueprint** → اختر المستودع `talaltechno`.

### في كلا الخيارين

3. Render سيعرض 3 خدمات (لا قاعدة بيانات داخلية — سنستخدم Neon).
4. سيطلب القيم التالية:

| الحقل | القيمة |
|---|---|
| `DATABASE_URL` | connection string من Neon (الخطوة 2) |
| `TENANT_NAME` | اسم مطعمك |
| `TENANT_SLUG` | `talal` (أحرف لاتينية) |
| `OWNER_EMAIL` | بريدك |
| `OWNER_PASSWORD` | كلمة مرور قوية (8+) |

5. اضغط **Apply Blueprint**. البناء الأول: 15–30 دقيقة.

## 4) التحقق

- صحة API: `https://talaltechno-api.onrender.com/health` → `{"status":"ok"}`
- توثيق: `https://talaltechno-api.onrender.com/docs`
- لوحة التحكم: `https://talaltechno-admin.onrender.com` → سجّل الدخول بـ Tenant Slug + Email + Password
- القائمة: `https://talaltechno-emenu.onrender.com`

## 5) بعد النجاح

1. في Render → `talaltechno-api` → **Environment**: غيّر `BOOTSTRAP_TENANT` إلى `false`.
2. (اختياري) أبقِ الخدمات "مستيقظة" مجاناً: سجّل في <https://uptimerobot.com> (مجاني) وأضف monitor (HTTP, interval 5 min) لـ `https://talaltechno-api.onrender.com/health`. يمنع النوم (cold start).

## ⚠️ القيود (مهم)

| القيود | التأثير |
|---|---|
| خدمات الويب "تنام" بعد 15 دقيقة | أول طلب بعد النوم يأخذ ~1 دقيقة (UptimeRobot يحل 90%) |
| 500 دقيقة بناء/شهر | كافية (3 خدمات × ~10 min) |
| Neon 0.5 GB | كافٍ لسنوات (مطعم متوسط) |
| Neon compute ينام بعد 5 min | إقلاع بارد ~1-2 ثانية (مقبول) |
| لا دعم فني (Hobby) | دعم بريد/دردشة فقط |

## الترقية لاحقاً (عند الحاجة)

- **24/7 بدون نوم + 30$+**: غيّر `plan: free` → `plan: 0.5c-512mb` في `render.yaml` وأضف بطاقة. راجع `docs/CLOUD.md` §14 (خطة مدفوعة ~27$/شهر).
- **قاعدة بيانات أكبر**: Neon Pro (10$+/شهر) أو Render Postgres.

## أخطاء شائعة

| العَرَض | السبب/الحل |
|---|---|
| `password authentication failed` | connection string من Neon خاطئ — أعد النسخ (Direct، مع `?sslmode=require`) |
| `ETIMEDOUT` / `ENOTFOUND` | region mismatch أو Neon project معلّق — تحقق من Region |
| صفحة بيضاء في لوحة التحكم | `NEXT_PUBLIC_API_URL` خاطئ → صحّح وأعد النشر |
| `CORS` في Console | أضف نطاقي لوحة التحكم/القائمة إلى `APP_URL` في API |
| فشل بناء | Logs → **Manual Deploy → Clear build cache** |

## ملاحظات أمنية

- لا تضع `OWNER_PASSWORD` أو `DATABASE_URL` في Git.
- فعّل 2FA على GitHub وRender وNeon.
- المدفوعات وZATCA وطباعة الفواتير في وضع Sandbox/Mock (راجع `docs/CLOUD.md` §13).