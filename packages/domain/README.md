# @talaltechno/domain

منطق الأعمال النقي (Pure Domain Logic) لنظام **طلال تكنو** — بدون أي اعتماديات خارجية، يعمل على Node.js 20+ ويُختبر بمشغّل الاختبارات المدمج.

## لماذا حزمة مستقلة؟

- نفس القواعد تُستخدم في واجهة المتصفح التجريبية، وخادم NestJS، وتطبيق Flutter عبر جسر JSON.
- لا تحتاج قاعدة بيانات أو Docker أو شبكة لتشغيل الاختبارات.
- كل الدوال نقية (Pure) عدا ناقلي الطباعة والمزامنة، وهما يُحقنان (Injected) في الاختبارات.

## التشغيل

```bash
cd packages/domain
node --test test
```

## الوحدات

| الملف | المسؤولية |
|---|---|
| `money.js` | تقريب هللات، جمع، تنسيق ريال سعودي |
| `sale.js` | تطبيع بنود البيع، ضريبة القيمة المضافة، الخصومات، الرسوم، الدفع المختلط، الآجل |
| `returns.js` | مرتجعات البيع وإشعارات الدائن مع التحقق من الكميات |
| `inventory.js` | وصفات BOM، توفر الأصناف، صرف/استرجاع المواد، الهالك، التسويات، التقييم |
| `journal.js` | قيود اليومية المزدوجة، ميزان المراجعة، قائمة الدخل |
| `shift.js` | فتح/إغلاق الورديات وتسوية الصندوق والفروقات |
| `zatca.js` | Sandbox: QR بصيغة TLV، UBL 2.1، سلسلة SHA-256، توقيع ECDSA وهمي صريح |
| `printer.js` | بناء إيصال ESC/POS، تذكرة مطبخ، ناقل طباعة Mock |
| `sync.js` | صندوق صادر Offline-First، دفع العمليات، دمج السحابة، حل التعارضات |

## تنبيه ZATCA

`zatca.js` يحاكي متطلبات المرحلة الثانية **لأغراض التطوير والعرض فقط**. التوقيع الناتج ليس توقيعاً حقيقياً، والنظام غير معتمد من هيئة الزكاة والضريبة والجمارك. الاعتماد الفعلي يتطلب CSID إنتاجي وتسجيلاً رسمياً.

## مثال

```js
import { createSaleDraft, buildSaleJournal, issueSandbox } from '@talaltechno/domain';

const { invoice } = createSaleDraft({
  items: [{ productId: 'm_kabsa', name: 'كبسة دجاج', qty: 2, price: 32, cost: 10.85, taxRate: 15 }],
  payments: [{ method: 'cash', amount: 100 }]
});

console.log(invoice.total);   // 73.60
console.log(invoice.change);  // 26.40
console.log(buildSaleJournal(invoice).balanced); // true

const zatca = issueSandbox(invoice);
console.log(zatca.environment); // sandbox
```

## الترخيص

AGPL-3.0-or-later.
