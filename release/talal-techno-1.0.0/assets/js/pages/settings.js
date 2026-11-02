/* ==========================================================================
   Page — Settings (company, branches, categories, POS, backup & reset)
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { tab: 'company' };
  let viewRef = null;

  const TABS = [
    ['company', 'بيانات الشركة والضريبة', 'home'],
    ['restaurant', 'المطعم والطلبات', 'chef'],
    ['pos', 'إعدادات نقطة البيع', 'pos'],
    ['printer', 'الطباعة الحرارية', 'print'],
    ['zatca', 'ZATCA Sandbox', 'shield'],
    ['payments', 'المدفوعات السعودية', 'card'],
    ['delivery', 'منصات التوصيل', 'truck'],
    ['emenu', 'القائمة الإلكترونية', 'qr'],
    ['branches', 'الفروع', 'map'],
    ['categories', 'فئات الأصناف', 'layers'],
    ['backup', 'النسخ الاحتياطي والبيانات', 'database']
  ];

  function headerHtml() {
    return `<div class="page-head">
      <div><div class="page-title">إعدادات النظام</div><div class="page-sub">تخصيص بيانات المؤسسة والفروع والضريبة وسلوك نقطة البيع وإدارة النسخ الاحتياطية</div></div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" data-quick-backup>${U.icon('download', 14)} نسخة احتياطية</button>
        <button class="btn btn-secondary btn-sm" data-quick-print>${U.icon('print', 14)} طباعة البيانات</button>
      </div>
    </div>`;
  }

  function navHtml() {
    return `<aside class="settings-nav">${TABS.map(([id, label, icon]) =>
      `<button class="${state.tab === id ? 'active' : ''}" data-settings-tab="${id}">${U.icon(icon, 16)} ${U.esc(label)}</button>`).join('')}</aside>`;
  }

  function field(label, name, value, opts = {}) {
    const type = opts.type || 'text';
    const full = opts.full ? ' full' : '';
    const req = opts.required ? ' required' : '';
    const attrs = [
      opts.min !== undefined ? `min="${opts.min}"` : '',
      opts.max !== undefined ? `max="${opts.max}"` : '',
      opts.step !== undefined ? `step="${opts.step}"` : '',
      opts.maxlength ? `maxlength="${opts.maxlength}"` : '',
      opts.placeholder ? `placeholder="${U.esc(opts.placeholder)}"` : ''
    ].filter(Boolean).join(' ');
    let input;
    if (type === 'select') {
      input = `<select class="select" name="${name}"${req}>${(opts.options || []).map((o) =>
        `<option value="${U.esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${U.esc(o.label)}</option>`).join('')}</select>`;
    } else if (type === 'textarea') {
      input = `<textarea class="textarea" name="${name}"${req} ${attrs}>${U.esc(value)}</textarea>`;
    } else if (type === 'checkbox') {
      input = `<label class="checkline" style="height:42px"><input type="checkbox" name="${name}" ${value ? 'checked' : ''} /> ${U.esc(opts.text || '')}</label>`;
    } else {
      input = `<input class="input ${opts.num ? 'num' : ''}" type="${type}" name="${name}" value="${U.esc(value)}"${req} ${attrs} />`;
    }
    return `<div class="field${full}">
      ${type === 'checkbox' ? '' : `<label>${U.esc(label)}${opts.required ? ' <span class="req">*</span>' : ''}</label>`}
      ${input}${opts.help ? `<div class="help">${opts.help}</div>` : ''}
    </div>`;
  }

  /* ---------- Company ---------- */
  function companyContent() {
    const s = Store.data.settings;
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('home', 18)} بيانات المؤسسة</div><div class="card-sub">تظهر هذه البيانات في الفواتير والتقارير والطباعة</div></div>
        <button class="btn btn-primary btn-sm" data-save-company>${U.icon('save', 14)} حفظ البيانات</button></div>
      <div class="card-body">
        <div class="flex items-center gap-2 mb-3">
          <div class="company-logo-preview"><span style="font-size:28px;font-weight:900">م</span></div>
          <div><div class="fw-800" style="font-size:15px">${U.esc(s.company)}</div><div class="text-muted text-xs">${U.esc(s.legalName)}</div>
            <div class="text-muted text-xs">الرقم الضريبي: ${U.esc(s.taxNumber)}</div></div>
        </div>
        <div class="form-grid" data-company-form>
          ${field('اسم المؤسسة التجاري', 'company', s.company, { required: true, placeholder: 'مؤسسة طلال تكنو التجارية' })}
          ${field('الاسم القانوني الكامل', 'legalName', s.legalName, { placeholder: 'مؤسسة طلال تكنو للتجارة والتوزيع' })}
          ${field('الرقم الضريبي', 'taxNumber', s.taxNumber, { placeholder: '310123456700003', maxlength: 20 })}
          ${field('السجل التجاري', 'commercialRegister', s.commercialRegister, { maxlength: 20 })}
          ${field('رقم الهاتف', 'phone', s.phone, { placeholder: '+966 55 123 4567' })}
          ${field('البريد الإلكتروني', 'email', s.email, { type: 'email', placeholder: 'info@example.com' })}
          ${field('العنوان', 'address', s.address, { full: true, placeholder: 'الرياض — حي العليا — طريق الملك فهد' })}
          ${field('الموقع الإلكتروني', 'website', s.website, { placeholder: 'www.example.com' })}
          ${field('العملة', 'currency', s.currency, { placeholder: 'ر.س' })}
          ${field('رمز العملة', 'currencyCode', s.currencyCode, { placeholder: 'SAR', maxlength: 5 })}
          ${field('نسبة ضريبة القيمة المضافة %', 'vatRate', s.vatRate, { type: 'number', num: true, min: 0, max: 100, step: 0.5, help: 'تُطبق افتراضياً على المنتجات الجديدة والفواتير.' })}
          ${field('بادئة فواتير البيع', 'invoicePrefix', s.invoicePrefix, { placeholder: 'INV', maxlength: 8 })}
          ${field('بادئة فواتير الشراء', 'purchasePrefix', s.purchasePrefix, { placeholder: 'PUR', maxlength: 8 })}
          ${field('نص أسفل الفاتورة', 'footer', s.footer, { type: 'textarea', full: true, placeholder: 'شكراً لثقتكم بنا' })}
          ${field('شروط وأحكام الفاتورة', 'invoiceTerms', s.invoiceTerms, { type: 'textarea', full: true, placeholder: 'سياسة الاستبدال والاسترجاع...' })}
        </div>
        <div class="info-banner success mt-3">${U.icon('info', 17)}<div>سيتم تحديث اسم المؤسسة والعملة والضريبة في جميع الفواتير والتقارير الجديدة فور الحفظ.</div></div>
      </div>
    </div>`;
  }

  /* ---------- Branches ---------- */
  function branchesContent() {
    const branches = Store.data.branches.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
    const rows = branches.map((b) => {
      const invoices = Store.data.invoices.filter((i) => i.branchId === b.id).length;
      const purchases = Store.data.purchases.filter((p) => p.branchId === b.id).length;
      return `<div class="branch-row">
        <div class="thumb">${U.icon('map', 19)}</div>
        <div class="br-main"><strong>${U.esc(b.name)}</strong><span>${U.esc(b.address || 'لا يوجد عنوان')} • ${U.esc(b.phone || 'بدون هاتف')}</span>
          <span class="text-muted text-xs">${invoices} فاتورة بيع • ${purchases} فاتورة شراء</span></div>
        <div class="text-muted text-xs" style="white-space:nowrap">${b.id === App.branchId ? '<span class="badge badge-green">الفرع الحالي</span>' : ''}</div>
        ${UI.statusBadge(b.active === false ? 'inactive' : 'active')}
        <div class="row-actions" style="opacity:1">
          <button class="btn-icon btn-ghost" data-branch-edit="${b.id}" title="تعديل">${U.icon('edit', 15)}</button>
          <button class="btn-icon btn-ghost" data-branch-toggle="${b.id}" title="${b.active === false ? 'تفعيل' : 'إيقاف'}">${U.icon(b.active === false ? 'checkCircle' : 'lock', 15)}</button>
          <button class="btn-icon btn-ghost" data-branch-del="${b.id}" title="حذف">${U.icon('trash', 15)}</button>
        </div>
      </div>`;
    }).join('') || UI.empty('map', 'لا توجد فروع', 'أضف فرعاً للبدء في تسجيل المبيعات');

    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('map', 18)} فروع المؤسسة</div><div class="card-sub">${branches.length} فرع • يُسجل الفرع على كل فاتورة وتقرير</div></div>
        <button class="btn btn-primary btn-sm" data-new-branch>${U.icon('plus', 14)} فرع جديد</button></div>
      <div class="card-body">${rows}
        <div class="info-banner mt-3">${U.icon('info', 17)}<div>المخزون مركزي لجميع الفروع، ويُستخدم الفرع لتحليل المبيعات والأداء فقط.</div></div>
      </div>
    </div>`;
  }

  /* ---------- Categories ---------- */
  function categoriesContent() {
    const cats = Store.data.categories.map((c) => {
      const products = Store.data.products.filter((p) => p.categoryId === c.id);
      const stockValue = U.sum(products, (p) => p.stock * p.cost);
      return { ...c, count: products.length, stockValue };
    }).sort((a, b) => b.count - a.count);
    const rows = cats.map((c) => `<div class="branch-row">
      <div class="thumb" style="background:${c.color || '#0e5a44'}1a;color:${c.color || '#0e5a44'};font-size:21px">${c.icon || '📦'}</div>
      <div class="br-main"><strong>${U.esc(c.name)}</strong><span>${c.count} منتج • قيمة مخزون ${U.money(c.stockValue)}</span></div>
      <span class="badge" style="background:${c.color || '#0e5a44'}1a;color:${c.color || '#0e5a44'}">${U.esc(c.color || '')}</span>
      <div class="row-actions" style="opacity:1">
        <button class="btn-icon btn-ghost" data-cat-edit="${c.id}" title="تعديل">${U.icon('edit', 15)}</button>
        <button class="btn-icon btn-ghost" data-cat-del="${c.id}" title="حذف">${U.icon('trash', 15)}</button>
      </div>
    </div>`).join('') || UI.empty('layers', 'لا توجد فئات', 'أضف فئة لتنظيم منتجاتك');

    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('layers', 18)} فئات المنتجات</div><div class="card-sub">${cats.length} فئة • تُستخدم في تصنيف المنتجات والتقارير</div></div>
        <button class="btn btn-primary btn-sm" data-new-cat>${U.icon('plus', 14)} فئة جديدة</button></div>
      <div class="card-body">${rows}
        <div class="info-banner warn mt-3">${U.icon('alert', 17)}<div>لا يمكن حذف فئة تحتوي على منتجات. انقل المنتجات إلى فئة أخرى أولاً.</div></div>
      </div>
    </div>`;
  }

  /* ---------- POS ---------- */
  function posContent() {
    const s = Store.data.settings;
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('pos', 18)} إعدادات نقطة البيع</div><div class="card-sub">تحكم في سلوك الكاشير والمخزون والطباعة والمظهر</div></div>
        <button class="btn btn-primary btn-sm" data-save-pos>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="form-grid" data-pos-form>
          ${field('السماح بالبيع بالسالب', 'allowNegativeStock', s.allowNegativeStock !== false, { type: 'checkbox', text: 'السماح بإتمام البيع حتى لو كان المخزون غير كافٍ', full: true })}
          ${field('نقاط الولاء لكل 10 وحدات نقدية', 'loyaltyPer', s.loyaltyPer, { type: 'number', num: true, min: 0, step: 1 })}
          ${field('حد إعادة الطلب الافتراضي', 'lowStockGlobal', s.lowStockGlobal, { type: 'number', num: true, min: 0, step: 1, help: 'يُطبق على المنتجات التي لا تملك حداً خاصاً.' })}
          ${field('عرض إيصال الطباعة', 'receiptWidth', s.receiptWidth, { type: 'select', options: [{ value: '80mm', label: '80 مم — طابعة حرارية' }, { value: '58mm', label: '58 مم — طابعة صغيرة' }] })}
          ${field('مظهر النظام', 'theme', s.theme, { type: 'select', options: [{ value: 'light', label: 'فاتح' }, { value: 'dark', label: 'داكن' }] })}
          ${field('مبالغ الدفع السريع', 'posQuickCash', (s.posQuickCash || []).join(', '), { full: true, placeholder: '50, 100, 200, 500', help: 'اكتب المبالغ مفصولة بفاصلة، وتُعرض كأزرار في شاشة الدفع.' })}
        </div>
        <div class="summary-strip mt-3">
          <div><div class="ss-lbl">نسبة الضريبة الافتراضية</div><div class="ss-val">${U.pct(s.vatRate || 0)}</div></div>
          <div><div class="ss-lbl">العملة</div><div class="ss-val">${U.esc(s.currency)}</div></div>
          <div><div class="ss-lbl">بادئة الفواتير</div><div class="ss-val">${U.esc(s.invoicePrefix)}</div></div>
        </div>
        <div class="info-banner mt-3">${U.icon('info', 17)}<div>تُحفظ الإعدادات محلياً وتُطبق فوراً. تغيير المظهر يعيد تحميل الألوان دون فقدان أي بيانات.</div></div>
      </div>
    </div>`;
  }

  /* ---------- Restaurant ---------- */
  function restaurantContent() {
    const s = Store.data.settings;
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('chef', 18)} إعدادات المطعم والطلبات</div><div class="card-sub">نوع الطلب الافتراضي، رسوم الخدمة والتوصيل، والطلب الذاتي</div></div>
        <button class="btn btn-primary btn-sm" data-save-restaurant>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="form-grid" data-restaurant-form>
          ${field('نوع الطلب الافتراضي', 'defaultOrderType', s.defaultOrderType, { type: 'select', options: Object.keys(Orders.TYPES).map((k) => ({ value: k, label: Orders.TYPES[k].label })) })}
          ${field('نسبة رسوم الخدمة %', 'serviceChargeRate', s.serviceChargeRate, { type: 'number', num: true, min: 0, max: 100, step: 0.5, help: 'تُطبق على طلبات الصالة فقط.' })}
          ${field('رسوم التوصيل', 'deliveryFee', s.deliveryFee, { type: 'number', num: true, min: 0, step: 0.5, help: 'تُضاف تلقائياً على طلبات التوصيل.' })}
          ${field('قيمة نقطة الولاء', 'loyaltyValue', s.loyaltyValue, { type: 'number', num: true, min: 0, step: 0.01, help: 'قيمة النقطة الواحدة عند الاستبدال بالريال.' })}
          ${field('رابط أساس QR', 'qrBaseUrl', s.qrBaseUrl, { full: true, placeholder: 'https://pos.example.com/', help: 'اتركه فارغاً لاستخدام رابط النظام الحالي. يُستخدم في روابط QR للطاولات.' })}
          ${field('السماح بالطلب الذاتي من QR', 'selfOrdering', s.selfOrdering !== false, { type: 'checkbox', text: 'يمكن للعملاء إرسال الطلبات من القائمة الإلكترونية مباشرة للمطبخ', full: true })}
          ${field('اعتماد المطبخ قبل التحضير', 'requireKitchenAccept', s.requireKitchenAccept === true, { type: 'checkbox', text: 'تبقى التذاكر جديدة حتى يقبلها المطبخ من شاشة KDS', full: true })}
        </div>
        <div class="info-banner success mt-3">${U.icon('info', 17)}<div>رسوم الخدمة والتوصيل تُحتسب قبل الضريبة وتُسجّل في حسابات الإيرادات الأخرى. جميع الطلبات مرتبطة بالطاولة والوردية والفرع.</div></div>
      </div>
    </div>`;
  }

  /* ---------- Printer ---------- */
  function printerContent() {
    const cfg = Store.data.settings.printer || {};
    const jobs = (Store.data.printerJobs || []).slice(0, 8);
    const rows = jobs.map((j) => `<tr>
      <td><span class="code">${U.esc(j.number || '—')}</span></td>
      <td>${j.kind === 'kitchen' ? 'تذكرة مطبخ' : j.kind === 'test' ? 'اختبار' : 'إيصال'}</td>
      <td class="num">${U.num(j.bytes || 0, 0)} بايت</td>
      <td><span class="badge ${j.mock ? 'badge-gold' : 'badge-green'}">${j.mock ? 'Mock' : 'حية'}</span></td>
      <td class="nowrap">${U.formatDateTime(j.at)}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-view-job="${j.id}" title="عرض محتوى ESC/POS">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-reprint="${j.id}" title="إعادة الطباعة">${U.icon('print', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(6, 'print', 'لا توجد مهام طباعة', 'جرّب طباعة إيصال تجريبي');
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('print', 18)} الطباعة الحرارية ESC/POS</div><div class="card-sub">طابعة إيصالات 80/58 مم — الوضع الافتراضي محاكاة</div></div>
        <button class="btn btn-primary btn-sm" data-save-printer>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="info-banner warn">${U.icon('alert', 16)}<div><strong>وضع المحاكاة:</strong> لا يتصل النظام بطابعة حقيقية في هذه النسخة. تُحفظ المهمة كنص ESC/POS ويمكن معاينتها أو إعادة طباعتها.</div></div>
        <div class="form-grid mt-3" data-printer-form>
          ${field('طريقة الاتصال', 'connection', cfg.connection || 'mock', { type: 'select', options: [{ value: 'mock', label: 'محاكاة (Mock)' }, { value: 'tcp', label: 'TCP/IP — شبكة' }, { value: 'usb', label: 'USB' }, { value: 'bluetooth', label: 'Bluetooth' }] })}
          ${field('اسم الطابعة', 'name', cfg.name || 'Talal Techno Mock Printer', { placeholder: 'Talal Techno Mock Printer' })}
          ${field('عنوان IP', 'ip', cfg.ip || '', { placeholder: '192.168.1.50' })}
          ${field('المنفذ', 'port', cfg.port || 9100, { type: 'number', num: true, min: 1, max: 65535, step: 1 })}
          ${field('عرض الورق', 'width', cfg.width || 80, { type: 'select', options: [{ value: '80', label: '80 مم — 42 عموداً' }, { value: '58', label: '58 مم — 32 عموداً' }] })}
          ${field('عدد النسخ', 'copies', cfg.copies || 1, { type: 'number', num: true, min: 1, max: 5, step: 1 })}
          ${field('طباعة تذكرة المطبخ تلقائياً', 'autoPrintKitchen', cfg.autoPrintKitchen !== false, { type: 'checkbox', text: 'عند إرسال الطلب للمطبخ', full: true })}
          ${field('طباعة الإيصال تلقائياً', 'autoPrintReceipt', cfg.autoPrintReceipt === true, { type: 'checkbox', text: 'بعد إتمام الدفع', full: true })}
        </div>
        <div class="flex gap-2 mt-3 wrap">
          <button class="btn btn-secondary" data-test-print>${U.icon('print', 15)} طباعة اختبار</button>
          <button class="btn btn-secondary" data-open-drawer>${U.icon('box', 15)} فتح درج النقدية</button>
        </div>
      </div>
    </div>
    <div class="card settings-section mt-3">
      <div class="card-head"><div><div class="card-title">${U.icon('receipt', 18)} مهام الطباعة الأخيرة</div><div class="card-sub">${U.num((Store.data.printerJobs || []).length, 0)} مهمة محفوظة</div></div></div>
      <div class="table-wrap"><table class="table compact">
        <thead><tr><th>المستند</th><th>النوع</th><th>الحجم</th><th>الوضع</th><th>التاريخ</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </div>`;
  }

  /* ---------- ZATCA ---------- */
  function zatcaContent() {
    const z = Store.data.settings.zatca || {};
    const comp = Zatca.compliance();
    const checks = (comp.checks || []).map((c) => `<div class="checkline" style="height:auto;padding:8px 0;border-bottom:1px dashed var(--line)">
      <span style="color:${c.ok ? 'var(--success)' : 'var(--danger)'}">${U.icon(c.ok ? 'checkCircle' : 'alert', 15)}</span>
      <span style="flex:1">${U.esc(c.label)}</span>
      <span class="badge ${c.ok ? 'badge-green' : 'badge-red'}">${c.ok ? 'جاهز' : 'ناقص'}</span>
    </div>`).join('');
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('shield', 18)} إعدادات ZATCA Sandbox</div><div class="card-sub">الفوترة الإلكترونية — بيئة تجريبية فقط</div></div>
        <button class="btn btn-primary btn-sm" data-save-zatca>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="info-banner warn">${U.icon('alert', 16)}<div><strong>غير معتمد:</strong> هذه محاكاة تعليمية لمسار ZATCA Phase 2 (UBL 2.1، QR TLV، سلسلة الهاش، توقيع ECDSA تجريبي). لا تُعد شهادة أو اعتماداً من هيئة الزكاة والضريبة والجمارك.</div></div>
        <div class="form-grid mt-3" data-zatca-form>
          ${field('البيئة', 'environment', z.environment || 'sandbox', { type: 'select', options: [{ value: 'sandbox', label: 'Sandbox — تجريبية' }, { value: 'simulation', label: 'Simulation — محاكاة' }] })}
          ${field('نوع CSID', 'csidType', z.csidType || 'compliance', { type: 'select', options: [{ value: 'compliance', label: 'Compliance CSID' }, { value: 'production', label: 'Production CSID (غير متاح)' }] })}
          ${field('الاسم الشائع', 'commonName', z.commonName || '', { placeholder: 'Talal Techno Sandbox CSID' })}
          ${field('الرقم التسلسلي', 'serialNumber', z.serialNumber || '', { placeholder: 'TT-SANDBOX-0001' })}
          ${field('الرقم الضريبي', 'vatNumber', z.vatNumber || '', { placeholder: '310123456700003', maxlength: 20 })}
          ${field('نوع الفاتورة الافتراضي', 'invoiceType', z.invoiceType || 'simplified', { type: 'select', options: [{ value: 'simplified', label: 'فاتورة ضريبية مبسطة' }, { value: 'standard', label: 'فاتورة ضريبية قياسية' }] })}
          ${field('إبلاغ تلقائي', 'autoReport', z.autoReport !== false, { type: 'checkbox', text: 'إرسال كل فاتورة جديدة إلى Sandbox فور إصدارها', full: true })}
        </div>
        <div class="grid grid-2 mt-3">
          <div>
            <div class="fw-800 mb-2" style="font-size:12px">قائمة التحقق</div>
            ${checks}
          </div>
          <div>
            <div class="summary-strip">
              <div><div class="ss-lbl">حالة السلسلة</div><div class="ss-val ${comp.chainValid ? 'text-success' : 'text-danger'}">${comp.chainValid ? 'سليمة' : 'مكسورة'}</div></div>
              <div><div class="ss-lbl">فواتير ZATCA</div><div class="ss-val">${U.num(comp.withZatca, 0)}</div></div>
              <div><div class="ss-lbl">قيد الإرسال</div><div class="ss-val">${U.num(comp.pending, 0)}</div></div>
            </div>
            <div class="detail-grid mt-3">
              <div class="detail-item"><div class="detail-label">عدّاد الفواتير</div><div class="detail-value">${U.num(comp.counter, 0)}</div></div>
              <div class="detail-item"><div class="detail-label">آخر هاش</div><div class="detail-value mono" style="font-size:9px;word-break:break-all">${U.esc((comp.lastHash || '—').slice(0, 32))}…</div></div>
            </div>
            <div class="flex gap-2 mt-3 wrap">
              <button class="btn btn-secondary btn-sm" data-verify-chain>${U.icon('shield', 14)} التحقق من السلسلة</button>
              <button class="btn btn-secondary btn-sm" data-zatca-center>${U.icon('shield', 14)} مركز ZATCA</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- Payments ---------- */
  function paymentsContent() {
    const cfg = Store.data.settings.payments || {};
    const providers = Payments.providers();
    const methods = { cash: 'نقدي', mada: 'مدى', applepay: 'Apple Pay', stcpay: 'STC Pay', visa: 'Visa', mastercard: 'Mastercard', credit: 'آجل' };
    const cards = providers.map((p) => `<div class="provider-card">
      <div class="pc-head"><div class="pc-logo" style="background:${p.id === 'hyperpay' ? '#0b3b60' : p.id === 'geidea' ? '#0e5a44' : p.id === 'moyasar' ? '#1c4ed8' : '#7c3aed'}">${U.esc((p.name || '?').slice(0, 1))}</div>
        <div class="pc-name"><strong>${U.esc(p.name)}</strong><span>${U.esc(p.docs || 'Sandbox')} • ${p.npg ? 'NPG / SAMA' : 'Gateway'}</span></div>
        <span class="badge badge-gold">Mock</span></div>
      <div class="pc-methods">${(p.methods || []).map((m) => `<span class="badge badge-gray">${U.esc(methods[m] || m)}</span>`).join('')}</div>
    </div>`).join('');
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('card', 18)} المدفوعات السعودية</div><div class="card-sub">مدى، STC Pay، Apple Pay، البطاقات — جميعها عبر محاكاة</div></div>
        <button class="btn btn-primary btn-sm" data-save-payments>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="info-banner warn">${U.icon('alert', 16)}<div><strong>بيئة تجريبية:</strong> لا توجد مفاتيح حقيقية. أي عملية دفع تُنفّذ عبر Mock Adapter وتُسجّل في سجل المدفوعات. ربط HyperPay/Geidea/Moyasar/PayTabs يتطلب عقوداً ومفاتيح من المزوّد.</div></div>
        <div class="form-grid mt-3" data-payments-form>
          ${field('مزود الدفع الافتراضي', 'provider', cfg.provider || 'mock', { type: 'select', options: [{ value: 'mock', label: 'Mock Gateway — محاكاة' }].concat(providers.map((p) => ({ value: p.id, label: `${p.name} — Sandbox` }))) })}
          <div class="field full"><label>طرق الدفع المفعّلة</label><div class="pay-methods" style="grid-template-columns:repeat(4,1fr)">
            ${Object.keys(methods).map((m) => `<label class="checkline" style="height:36px"><input type="checkbox" name="method_${m}" ${((cfg.methods || {})[m] !== false) ? 'checked' : ''}/> ${U.esc(methods[m])}</label>`).join('')}
          </div></div>
        </div>
        <div class="provider-grid mt-3">${cards}</div>
        <div class="card" style="margin-top:14px;background:var(--card-2)">
          <div class="card-body">
            <div class="fw-800 mb-2" style="font-size:12px">${U.icon('card', 15)} اختبار عملية دفع</div>
            <div class="flex gap-2 wrap items-end">
              <div class="field" style="margin:0"><label>المبلغ</label><input class="input num" id="test-charge-amount" type="number" min="1" step="0.01" value="1.00" /></div>
              <div class="field" style="margin:0"><label>الطريقة</label><select class="select" id="test-charge-method"><option value="mada">مدى</option><option value="applepay">Apple Pay</option><option value="stcpay">STC Pay</option><option value="visa">Visa</option><option value="mastercard">Mastercard</option></select></div>
              <button class="btn btn-secondary" data-test-charge>${U.icon('shield', 15)} تنفيذ الدفع التجريبي</button>
            </div>
            <div class="text-muted text-xs mt-2">تُنشئ العملية سجل دفع تجريبي فقط ولا تؤثر على الفواتير أو الحسابات.</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------- Delivery ---------- */
  function deliveryContent() {
    const cfg = Store.data.settings.delivery || {};
    const platforms = cfg.platforms || [];
    const cards = platforms.map((p) => `<div class="provider-card">
      <div class="pc-head"><div class="pc-logo" style="background:${p.color || '#0e5a44'}">${U.esc((p.name || '?').slice(0, 1))}</div>
        <div class="pc-name"><strong>${U.esc(p.name)}</strong><span>${p.lastSync ? 'آخر مزامنة ' + U.formatDateTime(p.lastSync) : 'لم تتم مزامنة بعد'}</span></div>
        <label class="checkline" style="height:auto"><input type="checkbox" name="platform_${p.id}" ${p.enabled !== false ? 'checked' : ''}/> مفعّل</label></div>
      <div class="pc-foot">
        <span class="badge badge-gold">Mock Adapter</span>
        ${p.syncedItems ? `<span class="badge badge-gray">${U.num(p.syncedItems, 0)} صنف</span>` : ''}
        <div class="toolbar-spacer"></div>
        <button class="btn btn-ghost btn-xs" data-sync-platform="${p.id}">${U.icon('refresh', 12)} مزامنة</button>
        <button class="btn btn-ghost btn-xs" data-simulate-platform="${p.id}">${U.icon('plus', 12)} طلب تجريبي</button>
      </div>
    </div>`).join('');
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('truck', 18)} منصات التوصيل</div><div class="card-sub">هنقرستيشن، جاهز، مرسول، ToYou، كريم — محاكاة</div></div>
        <button class="btn btn-primary btn-sm" data-save-delivery>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="info-banner warn">${U.icon('alert', 16)}<div><strong>تكاملات تجريبية:</strong> استقبال الطلبات ومزامنة القائمة يعملان عبر Mock Adapters. الربط الفعلي يتطلب اتفاقيات ومفاتيح API من كل منصة.</div></div>
        <div class="form-grid mt-3" data-delivery-form>
          ${field('قبول الطلبات تلقائياً', 'autoAccept', cfg.autoAccept === true, { type: 'checkbox', text: 'تحويل طلبات المنصات مباشرة إلى المطبخ', full: true })}
          ${field('مزامنة الأسعار', 'syncPrices', cfg.syncPrices !== false, { type: 'checkbox', text: 'إرسال أسعار القائمة إلى المنصات', full: true })}
          ${field('مزامنة التوفر', 'syncAvailability', cfg.syncAvailability !== false, { type: 'checkbox', text: 'إخفاء الأصناف غير المتاحة على المنصات', full: true })}
        </div>
        <div class="provider-grid mt-3">${cards}</div>
        <div class="flex gap-2 mt-3 wrap">
          <button class="btn btn-secondary" data-sync-all-platforms>${U.icon('refresh', 15)} مزامنة القائمة مع كل المنصات</button>
          <button class="btn btn-secondary" data-delivery-page>${U.icon('truck', 15)} صفحة التكاملات الكاملة</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------- E-menu ---------- */
  function emenuContent() {
    const s = Store.data.settings;
    const dir = location.pathname.replace(/[^/]*$/, '');
    const base = String(s.qrBaseUrl || '').trim() || (location.origin && location.origin !== 'null' ? location.origin + dir : dir);
    const link = base.replace(/\/?$/, '/') + 'emenu.html';
    return `<div class="card settings-section">
      <div class="card-head"><div><div class="card-title">${U.icon('qr', 18)} القائمة الإلكترونية والطلب الذاتي</div><div class="card-sub">رابط QR موحد لجميع الطاولات وإعدادات الطلب</div></div>
        <button class="btn btn-primary btn-sm" data-save-emenu>${U.icon('save', 14)} حفظ الإعدادات</button></div>
      <div class="card-body">
        <div class="form-grid" data-emenu-form>
          ${field('رابط أساس QR', 'qrBaseUrl', s.qrBaseUrl, { full: true, placeholder: 'https://pos.example.com/', help: 'يُستخدم لتوليد روابط QR للطاولات. اتركه فارغاً لاستخدام رابط النظام الحالي.' })}
          ${field('السماح بالطلب الذاتي', 'selfOrdering', s.selfOrdering !== false, { type: 'checkbox', text: 'يمكن للعميل إرسال الطلب من القائمة الإلكترونية', full: true })}
        </div>
        <div class="qr-preview-card mt-3">
          <div class="qr-preview-code">${Zatca.qrSvg(link, 128)}</div>
          <div class="qr-preview-info">
            <strong>${U.icon('qr', 15)} رابط القائمة الموحد</strong>
            <span class="text-muted text-xs">افتحه من جوال العميل — يعمل بدون تطبيق.</span>
            <div class="code-block" style="margin:8px 0">${U.esc(link)}</div>
            <div class="flex gap-2 wrap">
              <button class="btn btn-secondary btn-sm" data-copy-emenu>${U.icon('clipboard', 13)} نسخ الرابط</button>
              <button class="btn btn-secondary btn-sm" data-open-emenu>${U.icon('qr', 13)} معاينة القائمة</button>
              <button class="btn btn-secondary btn-sm" data-emenu-admin>${U.icon('grid', 13)} QR الطاولات</button>
            </div>
          </div>
        </div>
        <div class="info-banner success mt-3">${U.icon('info', 17)}<div>لكل طاولة رابط خاص يفتح القائمة مع تحديد رقم الطاولة تلقائياً. تُدار البطاقات وطباعتها من صفحة القائمة الإلكترونية.</div></div>
      </div>
    </div>`;
  }

  /* ---------- Backup ---------- */
  function backupContent() {
    const json = Store.exportJSON();
    const bytes = new Blob([json]).size;
    const sizeText = bytes > 1024 * 1024 ? U.num(bytes / 1024 / 1024, 2) + ' ميجابايت' : U.num(bytes / 1024, 1) + ' كيلوبايت';
    const quota = 5 * 1024 * 1024;
    const usedPct = U.clamp(bytes / quota * 100, 0, 100);
    const stats = Store.stats();
    const s = Store.data.settings;
    return `<div class="grid grid-2">
      <div class="card settings-section">
        <div class="card-head"><div><div class="card-title">${U.icon('download', 18)} تصدير نسخة احتياطية</div><div class="card-sub">ملف JSON يحتوي كل بيانات النظام</div></div></div>
        <div class="card-body">
          <div class="backup-box">
            <div class="flex items-center justify-between gap-2">
              <div><strong style="font-size:13px">نسخة كاملة من قاعدة البيانات</strong><div class="text-muted text-xs mt-1">المنتجات، الفواتير، القيود، العملاء، الموردون، الإعدادات، المستخدمون.</div></div>
              <div class="thumb" style="background:var(--brand-soft);color:var(--brand)">${U.icon('database', 20)}</div>
            </div>
            <div class="summary-strip mt-3">
              <div><div class="ss-lbl">حجم البيانات</div><div class="ss-val">${sizeText}</div></div>
              <div><div class="ss-lbl">الفواتير</div><div class="ss-val">${U.num(stats.invoices, 0)}</div></div>
              <div><div class="ss-lbl">القيود</div><div class="ss-val">${U.num(stats.journal, 0)}</div></div>
            </div>
            <button class="btn btn-primary btn-block mt-3" data-backup-export>${U.icon('download', 16)} تنزيل النسخة الاحتياطية</button>
            <div class="text-muted text-xs mt-2" style="text-align:center">آخر حفظ: ${Store.data.meta.updatedAt ? U.formatDateTime(Store.data.meta.updatedAt) : '—'}</div>
          </div>
        </div>
      </div>
      <div class="card settings-section">
        <div class="card-head"><div><div class="card-title">${U.icon('upload', 18)} استيراد نسخة احتياطية</div><div class="card-sub">استعادة البيانات من ملف طلال تكنو سابق</div></div></div>
        <div class="card-body">
          <div class="backup-box">
            <div class="info-banner warn">${U.icon('alert', 17)}<div><strong>تنبيه</strong><br>سيتم استبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. يُنصح بتصدير نسخة أولاً.</div></div>
            <input type="file" data-backup-file accept=".json,application/json" style="display:none" />
            <button class="btn btn-secondary btn-block mt-3" data-backup-import>${U.icon('upload', 16)} اختيار ملف النسخة الاحتياطية</button>
            <div class="text-muted text-xs mt-2" style="text-align:center">الصيغة المدعومة: .json — نسخة طلال تكنو فقط</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card settings-section mt-3">
      <div class="card-head"><div><div class="card-title">${U.icon('server', 18)} حالة مساحة التخزين</div><div class="card-sub">البيانات محفوظة في متصفحك عبر localStorage</div></div></div>
      <div class="card-body">
        <div class="flex items-center justify-between mb-2"><span class="text-muted text-sm">المستخدم: ${sizeText} من أصل ~5 ميجابايت</span><b>${U.num(usedPct, 1)}%</b></div>
        <div class="progress ${usedPct > 85 ? 'danger' : usedPct > 65 ? 'warn' : ''}"><span style="width:${usedPct}%"></span></div>
        <div class="metric-inline mt-3">
          <div class="mi"><div class="mi-lbl">المنتجات</div><div class="mi-val">${U.num(stats.products, 0)}</div></div>
          <div class="mi"><div class="mi-lbl">العملاء</div><div class="mi-val">${U.num(stats.customers, 0)}</div></div>
          <div class="mi"><div class="mi-lbl">الموردون</div><div class="mi-val">${U.num(stats.suppliers, 0)}</div></div>
          <div class="mi"><div class="mi-lbl">المستخدمون</div><div class="mi-val">${U.num(stats.users, 0)}</div></div>
          <div class="mi"><div class="mi-lbl">القيود المحاسبية</div><div class="mi-val">${U.num(stats.journal, 0)}</div></div>
        </div>
      </div>
    </div>

    <div class="card settings-section mt-3">
      <div class="card-head"><div><div class="card-title">${U.icon('info', 18)} معلومات النظام</div></div></div>
      <div class="card-body">
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">اسم النظام</div><div class="detail-value">طلال تكنو — المحاسبة ونقاط البيع</div></div>
          <div class="detail-item"><div class="detail-label">الإصدار</div><div class="detail-value">1.0 — نسخة تجريبية</div></div>
          <div class="detail-item"><div class="detail-label">المؤسسة</div><div class="detail-value">${U.esc(s.company)}</div></div>
          <div class="detail-item"><div class="detail-label">العملة / الضريبة</div><div class="detail-value">${U.esc(s.currency)} • ${U.pct(s.vatRate || 0)}</div></div>
          <div class="detail-item"><div class="detail-label">قاعدة البيانات</div><div class="detail-value">localStorage — محلية بالكامل</div></div>
          <div class="detail-item"><div class="detail-label">آخر تحديث</div><div class="detail-value">${Store.data.meta.updatedAt ? U.formatDateTime(Store.data.meta.updatedAt) : '—'}</div></div>
        </div>
      </div>
    </div>

    <div class="danger-zone mt-3">
      <div class="flex items-center justify-between gap-2 wrap">
        <div><div class="fw-800" style="font-size:13px">${U.icon('alert', 16)} منطقة الخطر — إعادة تعيين النظام</div>
          <div class="text-muted text-xs mt-1">حذف جميع البيانات الحالية واستعادة البيانات التجريبية الكاملة. لا يمكن التراجع.</div></div>
        <button class="btn btn-danger" data-reset-demo>${U.icon('refresh', 15)} إعادة تعيين البيانات التجريبية</button>
      </div>
    </div>`;
  }

  function content() {
    switch (state.tab) {
      case 'restaurant': return restaurantContent();
      case 'printer': return printerContent();
      case 'zatca': return zatcaContent();
      case 'payments': return paymentsContent();
      case 'delivery': return deliveryContent();
      case 'emenu': return emenuContent();
      case 'branches': return branchesContent();
      case 'categories': return categoriesContent();
      case 'pos': return posContent();
      case 'backup': return backupContent();
      default: return companyContent();
    }
  }

  /* ---------- Actions ---------- */
  function saveCompany() {
    const form = viewRef.querySelector('[data-company-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    if (!String(v.company || '').trim()) { UI.toast('اسم المؤسسة مطلوب', 'error'); return; }
    s.company = String(v.company).trim();
    s.legalName = String(v.legalName || '').trim();
    s.taxNumber = String(v.taxNumber || '').trim();
    s.commercialRegister = String(v.commercialRegister || '').trim();
    s.phone = String(v.phone || '').trim();
    s.email = String(v.email || '').trim();
    s.address = String(v.address || '').trim();
    s.website = String(v.website || '').trim();
    s.currency = String(v.currency || 'ر.س').trim() || 'ر.س';
    s.currencyCode = String(v.currencyCode || 'SAR').trim().toUpperCase() || 'SAR';
    s.vatRate = U.clamp(U.parseNum(v.vatRate), 0, 100);
    s.invoicePrefix = String(v.invoicePrefix || 'INV').trim().toUpperCase() || 'INV';
    s.purchasePrefix = String(v.purchasePrefix || 'PUR').trim().toUpperCase() || 'PUR';
    s.footer = String(v.footer || '').trim();
    s.invoiceTerms = String(v.invoiceTerms || '').trim();
    Store.audit('تحديث إعدادات الشركة', s.company, 'settings');
    Store.save();
    App.refreshChrome();
    UI.toast('تم حفظ بيانات المؤسسة بنجاح', 'success');
    Pages.settings.render(viewRef);
  }

  function savePos() {
    const form = viewRef.querySelector('[data-pos-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    s.allowNegativeStock = !!v.allowNegativeStock;
    s.loyaltyPer = Math.max(0, U.parseNum(v.loyaltyPer));
    s.lowStockGlobal = Math.max(0, U.parseNum(v.lowStockGlobal));
    s.receiptWidth = v.receiptWidth === '58mm' ? '58mm' : '80mm';
    s.theme = v.theme === 'dark' ? 'dark' : 'light';
    s.posQuickCash = String(v.posQuickCash || '').split(/[,،]/).map((x) => U.parseNum(x)).filter((x) => x > 0).slice(0, 8);
    if (!s.posQuickCash.length) s.posQuickCash = [50, 100, 200, 500];
    Store.applyTheme();
    Store.audit('تحديث إعدادات نقطة البيع', `المظهر: ${s.theme === 'dark' ? 'داكن' : 'فاتح'} • الضريبة: ${s.vatRate}%`, 'settings');
    Store.save();
    App.refreshChrome();
    UI.toast('تم حفظ إعدادات نقطة البيع', 'success');
    Pages.settings.render(viewRef);
  }

  function saveRestaurant() {
    const form = viewRef.querySelector('[data-restaurant-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    s.defaultOrderType = Orders.TYPES[v.defaultOrderType] ? v.defaultOrderType : 'dine_in';
    s.serviceChargeRate = U.clamp(U.parseNum(v.serviceChargeRate), 0, 100);
    s.deliveryFee = Math.max(0, U.round2(v.deliveryFee));
    s.loyaltyValue = Math.max(0, U.parseNum(v.loyaltyValue));
    s.qrBaseUrl = String(v.qrBaseUrl || '').trim();
    s.selfOrdering = !!v.selfOrdering;
    s.requireKitchenAccept = !!v.requireKitchenAccept;
    Store.audit('تحديث إعدادات المطعم', `خدمة ${s.serviceChargeRate}% • توصيل ${U.money(s.deliveryFee)}`, 'chef');
    Store.save();
    UI.toast('تم حفظ إعدادات المطعم', 'success');
    Pages.settings.render(viewRef);
  }

  function savePrinter() {
    const form = viewRef.querySelector('[data-printer-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    s.printer = Object.assign({}, s.printer, {
      connection: v.connection || 'mock',
      name: String(v.name || '').trim() || 'Talal Techno Mock Printer',
      ip: String(v.ip || '').trim(),
      port: U.clamp(U.parseNum(v.port), 1, 65535) || 9100,
      width: Number(v.width) === 58 ? 58 : 80,
      copies: U.clamp(U.parseNum(v.copies), 1, 5) || 1,
      autoPrintKitchen: !!v.autoPrintKitchen,
      autoPrintReceipt: !!v.autoPrintReceipt
    });
    Store.audit('تحديث إعدادات الطباعة', `${s.printer.name} • ${s.printer.width}mm • ${s.printer.connection}`, 'print');
    Store.save();
    UI.toast('تم حفظ إعدادات الطباعة', 'success');
    Pages.settings.render(viewRef);
  }

  function saveZatca() {
    const form = viewRef.querySelector('[data-zatca-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    s.zatca = Object.assign({}, s.zatca, {
      environment: v.environment === 'simulation' ? 'simulation' : 'sandbox',
      csidType: v.csidType === 'production' ? 'production' : 'compliance',
      commonName: String(v.commonName || '').trim(),
      serialNumber: String(v.serialNumber || '').trim(),
      vatNumber: String(v.vatNumber || '').trim(),
      autoReport: !!v.autoReport,
      invoiceType: v.invoiceType === 'standard' ? 'standard' : 'simplified'
    });
    Store.audit('تحديث إعدادات ZATCA', `${s.zatca.environment} • ${s.zatca.csidType}`, 'shield');
    Store.save();
    UI.toast('تم حفظ إعدادات ZATCA Sandbox', 'success');
    Pages.settings.render(viewRef);
  }

  function savePayments() {
    const form = viewRef.querySelector('[data-payments-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    const methods = {};
    Object.keys(v).forEach((k) => { if (k.startsWith('method_')) methods[k.replace('method_', '')] = !!v[k]; });
    s.payments = Object.assign({}, s.payments, { provider: v.provider || 'mock', methods });
    Store.audit('تحديث إعدادات المدفوعات', `المزود: ${v.provider} • ${Object.keys(methods).filter((m) => methods[m]).length} طريقة`, 'card');
    Store.save();
    UI.toast('تم حفظ إعدادات المدفوعات', 'success');
    Pages.settings.render(viewRef);
  }

  function saveDelivery() {
    const form = viewRef.querySelector('[data-delivery-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    const enabled = {};
    viewRef.querySelectorAll('[name^="platform_"]').forEach((input) => {
      enabled[input.name.replace('platform_', '')] = input.checked;
    });
    s.delivery = Object.assign({}, s.delivery, {
      autoAccept: !!v.autoAccept,
      syncPrices: !!v.syncPrices,
      syncAvailability: !!v.syncAvailability
    });
    s.delivery.platforms = (s.delivery.platforms || []).map((p) => Object.assign({}, p, {
      enabled: enabled[p.id] !== undefined ? enabled[p.id] : p.enabled !== false
    }));
    Store.audit('تحديث إعدادات التوصيل', `${s.delivery.platforms.filter((p) => p.enabled !== false).length} منصة مفعّلة`, 'truck');
    Store.save();
    UI.toast('تم حفظ إعدادات التوصيل', 'success');
    Pages.settings.render(viewRef);
  }

  function saveEmenu() {
    const form = viewRef.querySelector('[data-emenu-form]');
    if (!form) return;
    const v = UI.values(form);
    const s = Store.data.settings;
    s.qrBaseUrl = String(v.qrBaseUrl || '').trim();
    s.selfOrdering = !!v.selfOrdering;
    Store.audit('تحديث إعدادات القائمة الإلكترونية', s.qrBaseUrl || 'الرابط الحالي', 'qr');
    Store.save();
    UI.toast('تم حفظ إعدادات القائمة الإلكترونية', 'success');
    Pages.settings.render(viewRef);
  }

  function emenuLink() {
    const s = Store.data.settings;
    const dir = location.pathname.replace(/[^/]*$/, '');
    const base = String(s.qrBaseUrl || '').trim() || (location.origin && location.origin !== 'null' ? location.origin + dir : dir);
    return base.replace(/\/?$/, '/') + 'emenu.html';
  }

  function openBranchForm(branch) {
    const isNew = !branch;
    PK.formModal({
      title: isNew ? 'إضافة فرع جديد' : 'تعديل الفرع',
      subtitle: isNew ? 'سجّل فرعاً جديداً لتتبع مبيعاته' : branch.name,
      icon: 'map',
      submitText: isNew ? 'إضافة الفرع' : 'حفظ التعديلات',
      fields: [
        { name: 'name', label: 'اسم الفرع', required: true, full: true, placeholder: 'فرع النخيل', value: isNew ? '' : branch.name },
        { name: 'phone', label: 'هاتف الفرع', placeholder: '+966 11 000 0000', value: isNew ? '' : branch.phone },
        { name: 'address', label: 'عنوان الفرع', full: true, placeholder: 'الرياض — حي النخيل', value: isNew ? '' : branch.address },
        { name: 'active', label: 'الفرع نشط', type: 'checkbox', text: 'السماح بالبيع من هذا الفرع', value: isNew ? true : branch.active !== false, full: true }
      ],
      onSubmit(data) {
        const name = String(data.name || '').trim();
        if (name.length < 2) throw new Error('يرجى إدخال اسم الفرع.');
        if (isNew) {
          Store.data.branches.push({ id: U.uid('br'), name, phone: String(data.phone || '').trim(), address: String(data.address || '').trim(), active: data.active !== false });
          Store.audit('إضافة فرع', name, 'map');
        } else {
          Object.assign(branch, { name, phone: String(data.phone || '').trim(), address: String(data.address || '').trim(), active: data.active !== false });
          Store.audit('تعديل فرع', name, 'map');
        }
        Store.save();
        return true;
      },
      onDone() { Pages.settings.render(viewRef); App.refreshChrome(); }
    });
  }

  function toggleBranch(id) {
    const branch = Store.branch(id);
    if (!branch) return;
    const activeBranches = Store.data.branches.filter((b) => b.active !== false);
    if (branch.active !== false && activeBranches.length <= 1) { UI.toast('يجب أن يبقى فرع واحد نشط على الأقل', 'error'); return; }
    branch.active = branch.active === false;
    if (!branch.active && App.branchId === id) {
      const next = Store.data.branches.find((b) => b.active !== false);
      if (next) { App.branchId = next.id; try { localStorage.setItem('TalalTechno.branch', next.id); } catch (e) {} }
    }
    Store.audit(branch.active ? 'تفعيل فرع' : 'إيقاف فرع', branch.name, branch.active ? 'checkCircle' : 'lock');
    Store.save();
    UI.toast(branch.active ? 'تم تفعيل الفرع' : 'تم إيقاف الفرع', 'success');
    Pages.settings.render(viewRef);
    App.refreshChrome();
  }

  function deleteBranch(id) {
    const branch = Store.branch(id);
    if (!branch) return;
    if (Store.data.branches.length <= 1) { UI.toast('لا يمكن حذف الفرع الوحيد', 'error'); return; }
    const used = Store.data.invoices.some((i) => i.branchId === id) || Store.data.purchases.some((p) => p.branchId === id);
    if (used) { UI.toast('لا يمكن حذف فرع مرتبط بفواتير. يمكنك إيقافه بدلاً من ذلك.', 'error'); return; }
    UI.confirm({
      title: 'حذف الفرع', message: `هل تريد حذف الفرع <strong>${U.esc(branch.name)}</strong>؟`,
      danger: true, confirmText: 'حذف الفرع', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.data.branches = Store.data.branches.filter((b) => b.id !== id);
      if (App.branchId === id) {
        const next = Store.data.branches[0];
        if (next) { App.branchId = next.id; try { localStorage.setItem('TalalTechno.branch', next.id); } catch (e) {} }
      }
      Store.audit('حذف فرع', branch.name, 'trash');
      Store.save();
      UI.toast('تم حذف الفرع', 'success');
      Pages.settings.render(viewRef);
      App.refreshChrome();
    });
  }

  function openCategoryForm(cat) {
    const isNew = !cat;
    const palette = ['#0e5a44', '#2563a8', '#a97c28', '#6d4fa3', '#b13a33', '#0f766e', '#7c5c2e', '#c26a3d'];
    PK.formModal({
      title: isNew ? 'إضافة فئة جديدة' : 'تعديل الفئة',
      subtitle: isNew ? 'نظّم منتجاتك في فئات واضحة' : cat.name,
      icon: 'layers',
      submitText: isNew ? 'إضافة الفئة' : 'حفظ التعديلات',
      fields: [
        { name: 'name', label: 'اسم الفئة', required: true, full: true, placeholder: 'مواد غذائية', value: isNew ? '' : cat.name },
        { name: 'icon', label: 'أيقونة الفئة (رمز تعبيري)', placeholder: '🌾', value: isNew ? '📦' : cat.icon },
        { name: 'color', label: 'لون الفئة', type: 'color', value: isNew ? palette[0] : (cat.color || palette[0]) }
      ],
      onSubmit(data) {
        const name = String(data.name || '').trim();
        if (name.length < 2) throw new Error('يرجى إدخال اسم الفئة.');
        if (isNew) {
          Store.data.categories.push({ id: U.uid('cat'), name, icon: String(data.icon || '📦').trim() || '📦', color: String(data.color || palette[0]) });
          Store.audit('إضافة فئة', name, 'layers');
        } else {
          Object.assign(cat, { name, icon: String(data.icon || '📦').trim() || '📦', color: String(data.color || palette[0]) });
          Store.audit('تعديل فئة', name, 'layers');
        }
        Store.save();
        return true;
      },
      onDone() { Pages.settings.render(viewRef); }
    });
  }

  function deleteCategory(id) {
    const cat = Store.category(id);
    if (!cat) return;
    const used = Store.data.products.filter((p) => p.categoryId === id).length;
    if (used) { UI.toast(`لا يمكن حذف الفئة — تحتوي على ${used} منتج. انقل المنتجات أولاً.`, 'error'); return; }
    UI.confirm({
      title: 'حذف الفئة', message: `هل تريد حذف الفئة <strong>${U.esc(cat.name)}</strong>؟`,
      danger: true, confirmText: 'حذف الفئة', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.data.categories = Store.data.categories.filter((c) => c.id !== id);
      Store.audit('حذف فئة', cat.name, 'trash');
      Store.save();
      UI.toast('تم حذف الفئة', 'success');
      Pages.settings.render(viewRef);
    });
  }

  function exportBackup() {
    const filename = `TalalTechno-backup-${U.today()}.json`;
    U.download(filename, Store.exportJSON(), 'application/json;charset=utf-8');
    Store.audit('تصدير نسخة احتياطية', filename, 'download');
    Store.save();
    UI.toast('تم تنزيل النسخة الاحتياطية بنجاح', 'success');
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      UI.confirm({
        title: 'استيراد نسخة احتياطية',
        message: `سيتم استبدال جميع البيانات الحالية ببيانات الملف <strong>${U.esc(file.name)}</strong>. هل أنت متأكد؟`,
        danger: true, confirmText: 'استيراد واستبدال', icon: 'upload'
      }).then((ok) => {
        if (!ok) { const input = viewRef.querySelector('[data-backup-file]'); if (input) input.value = ''; return; }
        try {
          Store.importJSON(String(reader.result));
          App.branchId = (Store.data.branches[0] || {}).id;
          if (App.branchId) { try { localStorage.setItem('TalalTechno.branch', App.branchId); } catch (e) {} }
          UI.toast('تم استيراد النسخة الاحتياطية بنجاح', 'success');
          App.refresh();
        } catch (e) {
          UI.toast(e.message || 'تعذر استيراد الملف', 'error');
        }
        const input = viewRef.querySelector('[data-backup-file]');
        if (input) input.value = '';
      });
    };
    reader.onerror = () => UI.toast('تعذر قراءة الملف', 'error');
    reader.readAsText(file);
  }

  function resetDemo() {
    UI.confirm({
      title: 'إعادة تعيين البيانات التجريبية',
      message: 'سيتم <strong>حذف جميع البيانات الحالية</strong> واستعادة البيانات التجريبية الكاملة. لا يمكن التراجع عن هذه العملية.',
      danger: true, confirmText: 'إعادة تعيين', icon: 'refresh'
    }).then((ok) => {
      if (!ok) return;
      try {
        Store.resetDemo();
        App.branchId = (Store.data.branches[0] || {}).id;
        if (App.branchId) { try { localStorage.setItem('TalalTechno.branch', App.branchId); } catch (e) {} }
        state.tab = 'company';
        UI.toast('تمت إعادة تعيين البيانات التجريبية', 'success');
        App.refresh();
      } catch (e) {
        console.error(e);
        UI.toast(e.message || 'تعذر إعادة تعيين البيانات', 'error');
      }
    });
  }

  /* ---------- Integration helpers ---------- */
  function viewJob(id) {
    const job = (Store.data.printerJobs || []).find((j) => j.id === id);
    if (!job) return;
    UI.modal({
      size: 'md', title: 'محتوى مهمة الطباعة', subtitle: `${job.number || '—'} • ${job.kind} • ${U.formatDateTime(job.at)}`, icon: 'print',
      body: `<div class="info-banner success">${U.icon('info', 16)}<div>محاكاة ESC/POS — ${U.num(job.bytes || 0, 0)} بايت • ${U.esc(job.printer || '')} • ${U.esc(String(job.connection || 'mock'))}</div></div>
        <pre class="code-block" style="max-height:420px;overflow:auto;white-space:pre-wrap;direction:ltr;text-align:left">${U.esc(job.text || '')}</pre>`,
      footer: `<button class="btn btn-secondary" data-close>إغلاق</button><button class="btn btn-primary" data-reprint-now>${U.icon('print', 15)} إعادة الطباعة</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-reprint-now]').addEventListener('click', () => {
          try { Printer.reprint(id); UI.toast('تمت إعادة الطباعة (محاكاة)', 'success'); close(); Pages.settings.render(viewRef); }
          catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function testCharge() {
    const amount = Math.max(0, U.round2(U.parseNum((viewRef.querySelector('#test-charge-amount') || {}).value)));
    const method = (viewRef.querySelector('#test-charge-method') || {}).value || 'mada';
    const btn = viewRef.querySelector('[data-test-charge]');
    if (!(amount > 0)) { UI.toast('أدخل مبلغاً صحيحاً', 'error'); return; }
    UI.setBusy(btn, true, 'جارٍ تنفيذ الدفع...');
    Payments.charge({ amount, method, orderId: null, invoiceId: null }).then((tx) => {
      UI.setBusy(btn, false);
      UI.modal({
        size: 'sm', title: 'نتيجة الدفع التجريبي', subtitle: `${Payments.methodLabel(method)} • ${U.money(amount)}`, icon: 'card',
        body: `<div class="pay-success"><div class="success-ring">${U.icon('check', 32)}</div><h3>تمت العملية</h3><p>${U.esc(tx.providerName)} — Sandbox</p><div class="amount">${U.money(tx.amount)}</div></div>
          <div class="detail-grid mt-3">
            <div class="detail-item"><div class="detail-label">رقم العملية</div><div class="detail-value mono" style="font-size:10px">${U.esc(tx.transactionId || '—')}</div></div>
            <div class="detail-item"><div class="detail-label">المرجع</div><div class="detail-value mono" style="font-size:10px">${U.esc(tx.reference || '—')}</div></div>
            <div class="detail-item"><div class="detail-label">الحالة</div><div class="detail-value">${U.esc(tx.status)}</div></div>
            <div class="detail-item"><div class="detail-label">البيئة</div><div class="detail-value">Mock / Sandbox</div></div>
          </div>
          <div class="info-banner warn mt-2">${U.icon('alert', 15)}<div>هذه عملية تجريبية فقط — لا تُحرّك أموالاً حقيقية.</div></div>`,
        footer: `<button class="btn btn-primary" data-close>تم</button>`,
        onMount(modal, close) { modal.querySelector('[data-close]').addEventListener('click', close); }
      });
    }).catch((e) => {
      UI.setBusy(btn, false);
      UI.toast(e.message || 'فشلت العملية', 'error');
    });
  }

  function syncPlatform(id) {
    try {
      const list = Delivery.syncMenu(id);
      UI.toast(`تمت مزامنة ${U.num(list[0] ? list[0].syncedItems : 0, 0)} صنف (محاكاة)`, 'success');
      Pages.settings.render(viewRef);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function simulatePlatform(id) {
    try {
      const result = Delivery.ingest(id);
      UI.toast(`تم استقبال طلب تجريبي ${result.order.number} من ${Delivery.platformName(id)}`, 'success');
      App.refreshChrome();
      Pages.settings.render(viewRef);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function syncAllPlatforms() {
    try {
      const list = Delivery.syncMenu();
      UI.toast(`تمت مزامنة القائمة مع ${U.num(list.length, 0)} منصة (محاكاة)`, 'success');
      Pages.settings.render(viewRef);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  /* ---------- Render ---------- */
  Pages.settings = {
    title: 'الإعدادات', icon: 'settings', perm: 'settings',
    render(view) {
      viewRef = view;
      view.innerHTML = `${headerHtml()}
        <div class="settings-layout mt-3">
          ${navHtml()}
          <div>${content()}</div>
        </div>`;

      view.querySelectorAll('[data-settings-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.settingsTab;
        Pages.settings.render(view);
      }));

      const file = view.querySelector('[data-backup-file]');
      if (file) file.addEventListener('change', () => importBackup(file.files && file.files[0]));

      view.onclick = (e) => {
        if (e.target.closest('[data-settings-tab]')) return;
        if (e.target.closest('[data-save-company]')) { saveCompany(); return; }
        if (e.target.closest('[data-save-pos]')) { savePos(); return; }
        if (e.target.closest('[data-save-restaurant]')) { saveRestaurant(); return; }
        if (e.target.closest('[data-save-printer]')) { savePrinter(); return; }
        if (e.target.closest('[data-save-zatca]')) { saveZatca(); return; }
        if (e.target.closest('[data-save-payments]')) { savePayments(); return; }
        if (e.target.closest('[data-save-delivery]')) { saveDelivery(); return; }
        if (e.target.closest('[data-save-emenu]')) { saveEmenu(); return; }
        if (e.target.closest('[data-test-print]')) {
          try { Printer.test(); UI.toast('تم إنشاء مهمة طباعة اختبار (محاكاة)', 'success'); Pages.settings.render(viewRef); }
          catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        if (e.target.closest('[data-open-drawer]')) {
          Printer.openDrawer();
          UI.toast('تم إرسال أمر فتح درج النقدية (محاكاة)', 'success');
          return;
        }
        const vj = e.target.closest('[data-view-job]');
        if (vj) { viewJob(vj.dataset.viewJob); return; }
        const rp = e.target.closest('[data-reprint]');
        if (rp) {
          try { Printer.reprint(rp.dataset.reprint); UI.toast('تمت إعادة الطباعة (محاكاة)', 'success'); Pages.settings.render(viewRef); }
          catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        if (e.target.closest('[data-verify-chain]')) {
          const chain = Zatca.verifyChain();
          UI.modal({
            size: 'sm', title: 'التحقق من سلسلة الهاش', subtitle: `${U.num(chain.checked, 0)} فاتورة`, icon: 'shield',
            body: chain.valid
              ? `<div class="info-banner success">${U.icon('checkCircle', 18)}<div><strong>السلسلة سليمة.</strong><br>تم التحقق من ${U.num(chain.checked, 0)} فاتورة مرتبطة بالتسلسل الصحيح.</div></div>`
              : `<div class="info-banner warn">${U.icon('alert', 18)}<div><strong>تم اكتشاف ${U.num((chain.broken || []).length + (chain.tampered || []).length, 0)} اختلاف.</strong><br>${(chain.broken || []).concat(chain.tampered || []).map((b) => U.esc(b.invoice + ' — ' + (b.note || 'عدم تطابق'))).join('<br>')}</div></div>`,
            footer: `<button class="btn btn-primary" data-close>إغلاق</button>`,
            onMount(modal, close) { modal.querySelector('[data-close]').addEventListener('click', close); }
          });
          return;
        }
        if (e.target.closest('[data-zatca-center]')) { App.navigate('#/zatca'); return; }
        if (e.target.closest('[data-test-charge]')) { testCharge(); return; }
        const sp = e.target.closest('[data-sync-platform]');
        if (sp) { syncPlatform(sp.dataset.syncPlatform); return; }
        const si = e.target.closest('[data-simulate-platform]');
        if (si) { simulatePlatform(si.dataset.simulatePlatform); return; }
        if (e.target.closest('[data-sync-all-platforms]')) { syncAllPlatforms(); return; }
        if (e.target.closest('[data-delivery-page]')) { App.navigate('#/integrations'); return; }
        if (e.target.closest('[data-copy-emenu]')) {
          U.copy(emenuLink()).then(() => UI.toast('تم نسخ رابط القائمة', 'success'));
          return;
        }
        if (e.target.closest('[data-open-emenu]')) { window.open(emenuLink(), '_blank'); return; }
        if (e.target.closest('[data-emenu-admin]')) { App.navigate('#/emenu'); return; }
        if (e.target.closest('[data-new-branch]')) { openBranchForm(null); return; }
        const be = e.target.closest('[data-branch-edit]');
        if (be) { const b = Store.branch(be.dataset.branchEdit); if (b) openBranchForm(b); return; }
        const bt = e.target.closest('[data-branch-toggle]');
        if (bt) { toggleBranch(bt.dataset.branchToggle); return; }
        const bd = e.target.closest('[data-branch-del]');
        if (bd) { deleteBranch(bd.dataset.branchDel); return; }
        if (e.target.closest('[data-new-cat]')) { openCategoryForm(null); return; }
        const ce = e.target.closest('[data-cat-edit]');
        if (ce) { const c = Store.category(ce.dataset.catEdit); if (c) openCategoryForm(c); return; }
        const cd = e.target.closest('[data-cat-del]');
        if (cd) { deleteCategory(cd.dataset.catDel); return; }
        if (e.target.closest('[data-backup-export]') || e.target.closest('[data-quick-backup]')) { exportBackup(); return; }
        if (e.target.closest('[data-backup-import]')) { const f = view.querySelector('[data-backup-file]'); if (f) f.click(); return; }
        if (e.target.closest('[data-reset-demo]')) { resetDemo(); return; }
        if (e.target.closest('[data-quick-print]')) { printSystemData(); return; }
      };
    }
  };

  function printSystemData() {
    const s = Store.data.settings;
    const stats = Store.stats();
    PK.printReport({
      title: 'ملخص بيانات النظام',
      subtitle: `${s.company} • ${s.currency} • ضريبة ${U.pct(s.vatRate || 0)}`,
      headers: ['البيان', 'القيمة'],
      rows: [
        ['اسم المؤسسة', U.esc(s.company)],
        ['الاسم القانوني', U.esc(s.legalName)],
        ['الرقم الضريبي', U.esc(s.taxNumber)],
        ['الهاتف', U.esc(s.phone)],
        ['العنوان', U.esc(s.address)],
        ['العملة', U.esc(s.currency)],
        ['نسبة الضريبة', U.pct(s.vatRate || 0)],
        ['عدد المنتجات', U.num(stats.products, 0)],
        ['عدد العملاء', U.num(stats.customers, 0)],
        ['عدد الموردين', U.num(stats.suppliers, 0)],
        ['عدد المستخدمين', U.num(stats.users, 0)],
        ['عدد الفواتير', U.num(stats.invoices, 0)],
        ['عدد القيود المحاسبية', U.num(stats.journal, 0)],
        ['آخر تحديث', Store.data.meta.updatedAt ? U.formatDateTime(Store.data.meta.updatedAt) : '—']
      ],
      totals: [{ label: 'قيمة المخزون', value: U.money(Accounting.inventoryValue()) }],
      date: U.today()
    });
  }
})();
