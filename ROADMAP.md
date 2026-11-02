# خارطة الطريق — طلال تكنو

> الإصدار الحالي: `1.0.0` — الإصدار الرسمي الأول: هيكل إنتاجي + عرض تجريبي كامل.
> آخر تحديث: 2026-10-27.

## الحالة باختصار

| المرحلة | الوصف | الحالة |
|---|---|---|
| P0 | عرض تجريبي متكامل في المتصفح | ✅ مكتمل ومُختبر |
| P1 | نواة منطق الأعمال القابلة للاختبار | ✅ مكتمل (60 اختباراً) |
| P2 | هيكل Monorepo + Prisma + API + Admin + E-Menu + POS | 🟡 مبني، غير مُشغَّل بالكامل |
| P3 | Docker/Nginx/CI + توثيق | 🟡 مكتوب، غير مُتحقق تشغيلياً |
| P4 | تحقق تشغيلي كامل (بناء/تشغيل/اختبارات تكامل) | ⬜ التالي |
| P5 | جاهزية الإنتاج الفعلية (أمان، ZATCA، مدفوعات) | ⬜ لاحقاً |

---

## P0 — العرض التجريبي ✅

**الهدف:** منتج قابل للتقييم فوراً في المتصفح بلا تثبيت.

- [x] 19 شاشة: لوحة تحكم، POS، طاولات، KDS، قائمة QR، مبيعات، مشتريات، منتجات/وصفات، مخزون، ولاء، عملاء/موردون، محاسبة، خزينة، ورديات، تقارير، ZATCA، تكاملات، مستخدمون، إعدادات.
- [x] هوية «طلال تكنو»: أخضر داكن/كحلي + ذهبي، شعار T/circuit، RTL، وضع داكن، أهداف لمس كبيرة.
- [x] بيع في أقل من 3 نقرات، دفع نقدي/شبكة/مختلط/آجل، خصومات، رسوم خدمة/توصيل.
- [x] طاولات وفواتير مفتوحة، تقسيم فاتورة، نقل طاولة، دمج.
- [x] KDS بمؤقتات وإيقاف أصناف (86-ing).
- [x] قائمة QR/PWA مستقلة + إدارة طاولات ورموز.
- [x] مخزون مواد خام + وصفات BOM + توفر تلقائي + هالك + تحويلات.
- [x] محاسبة مزدوجة، ميزان مراجعة، دخل، ميزانية، إقرار ضريبي.
- [x] ZATCA Sandbox: QR TLV، UBL 2.1، سلسلة SHA-256، تحقق، توقيع وهمي موسوم.
- [x] مدفوعات وتوصيل Mock مع واجهة إدارة.
- [x] ورديات وصندوق وفروقات.
- [x] ولاء وكوبونات.
- [x] طباعة حرارية تجريبية (ESC/POS) مع معاينة.
- [x] مزامنة Offline: صندوق صادر، دفع/سحب، عدّادات معلقة.
- [x] نسخ احتياطي/استعادة JSON.
- [x] PWA + Service Worker + أيقونات.
- [x] اختبار المتصفح: كل المسارات تعمل، لا أخطاء console، سلسلة ZATCA سليمة.

## P1 — نواة منطق الأعمال ✅

**الهدف:** قواعد واحدة قابلة للاختبار بلا قاعدة بيانات أو Docker.

- [x] `money` — تقريب هللات وتنسيق SAR.
- [x] `sale` — بنود، ضريبة، خصم، رسوم، دفع مختلط، باقي، آجل.
- [x] `returns` — مرتجع كامل/جزئي، تحقق كميات، عكس COGS.
- [x] `inventory` — BOM، توفر، صرف/استرجاع، هالك، تسوية، تقييم.
- [x] `journal` — قيد بيع/مرتجع، توازن، ميزان، قائمة دخل.
- [x] `shift` — فتح/إغلاق، نقدي متوقع، فرق.
- [x] `zatca` — TLV، UBL، سلسلة، توقيع وهمي، تحقق.
- [x] `printer` — ESC/POS، إيصال، تذكرة مطبخ، Mock.
- [x] `sync` — Outbox، دفع، دمج، حل تعارضات.
- [x] 60 اختباراً عبر `node --test`.
- [x] أنواع TypeScript في `index.d.ts`.

## P2 — الهيكل الإنتاجي 🟡

**الهدف:** مسار إنتاجي حقيقي، وليس مجرد واجهة.

### قاعدة البيانات
- [x] Prisma schema متعدد المستأجرين (35+ نموذجاً).
- [x] `Decimal(12,2)`، فهارس، علاقات، enums.
- [x] Seed مطعم سعودي + سلسلة ZATCA.
- [x] `prisma validate` ناجح.
- [ ] `prisma migrate` / `seed` على PostgreSQL فعلي.
- [ ] اختبارات تكامل لقاعدة البيانات.

### API
- [x] Auth/JWT/RBAC + guards + Swagger.
- [x] Catalog/Orders/Sales/Returns/Shifts/Inventory/Accounting.
- [x] ZATCA/Integrations/Dashboard/Organization/Purchasing/CRM/Sync.
- [x] Public menu/orders.
- [x] ValidationPipe + Arabic error filter + Helmet + CORS.
- [x] Health check.
- [ ] تشغيل API والتحقق من كل endpoint.
- [ ] Idempotency keys للمزامنة.
- [ ] اختبارات e2e (Supertest).
- [ ] Rate limiting على مستوى التطبيق (Nginx يوفره جزئياً).

### Admin
- [x] 13 صفحة: dashboard, sales, orders/KDS, inventory, products, accounting, ZATCA, integrations, settings, loyalty, shifts, purchasing, login.
- [x] RTL + dark mode + مكوّنات UI + demo fallback.
- [ ] بناء Next.js والتحقق من الأنواع.
- [ ] ربط كامل بكل endpoints (بعض الصفحات للقراءة فقط).
- [ ] نموذج إنشاء/تعديل كامل للمستخدمين والفروع.

### E-Menu
- [x] صفحة قائمة/سلة/دفع/نجاح، RTL، PWA، Service Worker.
- [x] دعم `basePath`/`assetPrefix`، Docker، Nginx.
- [x] وضع عرض عند غياب API.
- [ ] بناء Next.js والتحقق.
- [ ] تتبع حالة الطلب بعد الإرسال.
- [ ] دفع إلكتروني للطلب الذاتي (اختياري).

### Flutter POS
- [x] SQLite WAL + جداول + بذرة.
- [x] بيع/وردية/صندوق صادر داخل معاملات.
- [x] مزامنة مرتبة + إعادة محاولة + سجل أخطاء.
- [x] Mock ESC/POS.
- [x] واجهات RTL: دخول، بيع، سلة، ورديات، مزامنة، إعدادات.
- [x] اختبارات وحدة للسلة/المال/الطباعة.
- [ ] توليد منصات Android/iOS والبناء.
- [ ] تشغيل الاختبارات في CI مع Flutter.
- [ ] طباعة Bluetooth/USB حقيقية.
- [ ] شاشة KDS/طاولات داخل التطبيق.

## P3 — التشغيل والتوثيق 🟡

- [x] `docker-compose.yml` (Postgres/Redis/API/Admin/E-Menu/Nginx).
- [x] Dockerfiles متعددة المراحل + standalone.
- [x] Nginx routing + security headers + gzip + rate limit.
- [x] `.env.example` بلا أسرار.
- [x] `.dockerignore`.
- [x] GitHub Actions CI (install/generate/validate/typecheck/test).
- [x] ARCHITECTURE / ROADMAP / DECISIONS / API / ERD / DEPLOYMENT / SECURITY / TESTING.
- [x] README ثنائي المسار (Demo + Production).
- [ ] `docker compose up` فعلي.
- [ ] اختبار Nginx routing وbasePath.
- [ ] نشر تجريبي على خادم/سحابة.

## P4 — التحقق التشغيلي (التالي)

**هدف الخروج:** بناء نظيف + تشغيل كامل + اختبارات تكامل خضراء.

1. تثبيت pnpm 9.15.4 وNode 22.
2. `pnpm install` لتوليد `pnpm-lock.yaml`، ثم الالتزام به واستخدام `--frozen-lockfile` لاحقاً.
3. `pnpm typecheck` و`pnpm build` لكل الحزم.
4. تشغيل PostgreSQL/Redis (Docker أو محلي).
5. `prisma migrate deploy` + `db:seed`.
6. تشغيل API والتحقق من:
   - login + JWT + RBAC،
   - بيع نقدي/مختلط/آجل،
   - مرتجع كامل/جزئي،
   - وردية فتح/إغلاق،
   - هالك/تحويل مخزون،
   - قيد متوازن وميزان مراجعة،
   - ZATCA chain verify،
   - public menu/order،
   - sync push/pull.
7. بناء Admin/E-Menu والتحقق من RTL وbasePath.
8. `docker compose up -d --build` واختبار Nginx.
9. Flutter: `bootstrap.ps1`, `flutter analyze`, `flutter test`, بناء APK.
10. تحديث مصفوفة التحقق في `docs/TESTING.md` بالأدلة.

## P5 — جاهزية الإنتاج

### الأمان والتشغيل
- [ ] تدوير أسرار، إدارة عبر Vault/Secrets Manager.
- [ ] Refresh tokens + إبطال الجلسات.
- [ ] MFA للمالك/المدير.
- [ ] Rate limiting دقيق + قفل الحساب.
- [ ] تشفير النسخ الاحتياطي + استعادة مجرّبة.
- [ ] مراقبة (OpenTelemetry) + تنبيهات + structured logs.
- [ ] اختبار اختراق خارجي.
- [ ] سياسة احتفاظ بيانات وتوافق PDPL.

### ZATCA
- [ ] تسجيل رسمي والحصول على CSID إنتاجي.
- [ ] توقيع ECDSA/secp256k1 حقيقي + XAdES.
- [ ] إرسال Clearance/Reporting ومعالجة الرفض.
- [ ] فواتير مبسطة/قياسية بحسب اللوائح.
- [ ] اختبار قبول مع بوابة ZATCA.

### المدفوعات
- [ ] عقد مع PSP (HyperPay/Geidea/Moyasar/PayTabs).
- [ ] 3-D Secure، استرداد، تسوية، Webhooks موقعة.
- [ ] مطابقة يومية مع كشف البنك.
- [ ] اختبار SAMA/PCI-DSS حسب النطاق.

### التوصيل
- [ ] عقود HungerStation/Jahez/Mrsool/ToYou/Careem.
- [ ] Webhooks للطلبات والحالات، إدارة القوائم والأسعار.
- [ ] اختبار sandbox رسمي لكل منصة.

### المنتج
- [ ] Idempotency + تعارضات مزامنة متقدمة (CRDT/version vectors).
- [ ] طوابير BullMQ للطباعة والإشعارات والنسخ.
- [ ] تعدد العملات واللغات (EN).
- [ ] تقارير أعمق (ABC، هامش أصناف، توقع طلب).
- [ ] إدارة ورديات متعددة الكاشير وتوزيع البقشيش.
- [ ] تطبيق موبايل للمالك/المدير.
- [ ] استيراد بيانات من أنظمة شائعة.

---

## مصفوفة القبول (Acceptance)

| المتطلب | الحالة | الدليل/الملاحظة |
|---|---|---|
| Docker Compose يشغّل النظام | 🟡 | الملفات جاهزة؛ لم تُشغَّل لعدم توفر Docker |
| بيانات مطعم تجريبية | ✅ | Demo seed + Prisma seed |
| اختبار بيع/وردية/مرتجع/مخزون/قيد/ZATCA | ✅ | 60 اختبار domain + اختبار متصفح |
| POS offline ثم مزامنة | ✅ (منطق) / 🟡 (Flutter) | Domain sync tests + Flutter outbox؛ التطبيق لم يُبنَ |
| طباعة حرارية Mock | ✅ | Domain printer + Flutter MockPrinterTransport + demo |
| توثيق API/ERD/نشر | ✅ | docs/* |
| لا أسرار في Git | ✅ | `.env.example` فقط، لا مفاتيح |
| كل التكاملات Mock افتراضياً | ✅ | `*_MODE=mock` |
| ZATCA/SAMA معتمد | 🔴 | غير مطالب به؛ Sandbox فقط |
| بناء/تشغيل API/Admin/E-Menu | 🟡 | لم يُتحقق؛ يتطلب pnpm/DB |
| Flutter POS قابل للتشغيل | 🟡 | يحتاج Flutter/Android SDK |

---

## معايير «جاهز للإنتاج» (Definition of Done)

لا يُعلن الإصدار `1.0.0` قبل:

1. CI أخضر على بناء + اختبارات وحدة + تكامل + e2e.
2. `docker compose up` موثّق ومُختبر من صفر.
3. ZATCA: CSID إنتاجي + إرسال ناجح + معالجة رفض.
4. PSP واحد على الأقل في الإنتاج مع 3DS وتسوية.
5. اختبار اختراق وسد الثغرات الحرجة.
6. نسخ احتياطي مشفر + استعادة موثقة (RPO/RTO).
7. مراقبة وتنبيهات.
8. Flutter APK موقّع ومختبر على جهاز حقيقي.
9. مراجعة قانونية لـAGPL وسياسة الخصوصية.
