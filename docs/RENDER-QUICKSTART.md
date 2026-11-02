# النشر على Render — دليل سريع (نسخة الإنتاج)

هذا الدليل مكتوب لغير المبرمجين: كل نقرة مطلوبة بالترتيب. المساعد يستطيع تنفيذ رفع الكود، لكن إنشاء الحسابات والدفع يبقيان عليك.

## ما تحتاجه

| المتطلب | لماذا |
|---|---|
| حساب GitHub (مجاني) | استضافة الكود علناً |
| حساب Render + بطاقة بنكية | استضافة النظام 24/7 (Stripe) |
| أربع قيم للمنشأة | تُدخل مرة واحدة عند النشر |

التكلفة التقديرية: **~27 دولاراً شهرياً** (3 خدمات × 7$ + قاعدة بيانات 6$). لا يوجد التزام طويل؛ يمكنك الإيقاف في أي وقت.

---

## 1) إنشاء حساب GitHub

1. افتح <https://github.com/signup>.
2. أدخل بريدك وكلمة مرور قوية، ثم فعّل البريد من الرسالة.
3. احفظ **اسم المستخدم** (username).

## 2) رفع الكود (أسهل طريقة)

اطلب من المساعد تنفيذ الرفع، وسيطلب منك:

1. إنشاء **Personal Access Token**: GitHub → صورتك → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
2. الاسم: `talaltechno-deploy`، المدة: 7 أيام، الصلاحية: **repo** فقط.
3. انسخ التوكن (يظهر مرة واحدة) وأرسله للمساعد مع اسم المستخدم.

> بعد نجاح الرفع، احذف التوكن من GitHub فوراً.

بديل يدوي: استخدم GitHub Desktop لإنشاء مستودع Public باسم `talaltechno` ثم `Publish`.

## 3) إنشاء الخدمات على Render

1. افتح <https://dashboard.render.com/register> وسجّل بحساب GitHub.
2. أضف بطاقة في **Billing** (Render يخصم 1$ للتحقق ثم يعيدها).
3. من الشاشة الرئيسية: **New → Blueprint**.
4. اختر المستودع `talaltechno` واضغط **Connect**.
5. Render سيعرض الخدمات الخمس (قاعدة بيانات + 3 خدمات + لا Redis) ويطلب القيم التالية:

| المتغير | مثال | ملاحظات |
|---|---|---|
| `TENANT_NAME` | `مطعم طلال` | اسم المنشأة كما يظهر في الفواتير |
| `TENANT_SLUG` | `talal` | أحرف لاتينية صغيرة وأرقام وشرطة فقط (3–49) |
| `OWNER_EMAIL` | `owner@example.com` | بريد تسجيل الدخول |
| `OWNER_PASSWORD` | كلمة مرور قوية | 8 أحرف على الأقل — احفظها في مكان آمن |

6. اضغط **Apply**. سيبدأ بناء ثلاث صور Docker (15–30 دقيقة أول مرة).
7. تابِع **Logs** لأي خدمة. أول ما ينجح فيه API ستظهر رسالة إنشاء المنشأة.

## 4) التحقق

- صحة API: افتح `https://talaltechno-api.onrender.com/health` — يجب أن يظهر `{"status":"ok"}`.
- توثيق API: `https://talaltechno-api.onrender.com/docs`.
- لوحة التحكم: `https://talaltechno-admin.onrender.com` ثم سجّل الدخول بـ:
  - Tenant Slug: القيمة التي أدخلتها
  - Email: `OWNER_EMAIL`
  - Password: `OWNER_PASSWORD`
- القائمة الإلكترونية: `https://talaltechno-emenu.onrender.com` (تعمل من الجوال).

## 5) بعد النجاح

1. في Render → خدمة `talaltechno-api` → **Environment**: غيّر `BOOTSTRAP_TENANT` إلى `false` (لمنع إعادة المحاولة عند كل إقلاع).
2. اربط نطاقك: **Settings → Custom Domains** في كل خدمة، ثم أضف سجلات CNAME التي يعرضها Render.
3. حدّث القيم الثلاث بعد ربط النطاق:
   - في API: `APP_URL` = نطاق لوحة التحكم + نطاق القائمة (مفصولان بفاصلة).
   - في Admin: `NEXT_PUBLIC_API_URL` و`NEXT_PUBLIC_EMENU_URL`.
   - في E-Menu: `NEXT_PUBLIC_API_URL`.
4. أعد النشر بعد تغيير `NEXT_PUBLIC_*` (تُدمج وقت البناء، وليس وقت التشغيل).

## أخطاء شائعة

| العَرَض | السبب والحل |
|---|---|
| صفحة بيضاء في لوحة التحكم | `NEXT_PUBLIC_API_URL` خاطئ أو تغيّر اسم الخدمة → صحّحه وأعد النشر |
| `CORS` في Console | أضف نطاق لوحة التحكم/القائمة إلى `APP_URL` في API |
| فشل بناء API | راجع Logs؛ غالباً مشكلة في `pnpm install`. أعد المحاولة من **Manual Deploy → Clear build cache** |
| `EADDRINUSE` أو فشل Health | Render يمرر `PORT`؛ لا تثبّت منفذاً يدوياً |
| نسيان كلمة مرور المالك | أنشئ منشأة جديدة بـ `TENANT_SLUG` آخر، أو استخدم Render Shell لتحديث كلمة المرور |

## ملاحظات أمنية

- لا تضع `OWNER_PASSWORD` في `render.yaml` أو Git.
- استخدم كلمة مرور فريدة، وفعّل 2FA على GitHub وRender.
- المدفوعات وZATCA وطباعة الفواتير في وضع Sandbox/Mock — راجع `docs/CLOUD.md` قسم 13.
