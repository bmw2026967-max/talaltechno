/* ==========================================================================
   Page — Customers & Suppliers
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { tab: 'customers', q: '', status: 'all', sort: 'name', agingType: 'customer' };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  function parties(type) {
    return type === 'customer' ? Store.data.customers : Store.data.suppliers;
  }

  function balanceOf(type, id) {
    return type === 'customer' ? Accounting.customerBalance(id) : Accounting.supplierBalance(id);
  }

  function filtered(type) {
    let list = parties(type).slice();
    const q = norm(state.q);
    if (q) list = list.filter((p) => norm(p.name).includes(q) || norm(p.code).includes(q)
      || norm(p.phone).includes(q) || norm(p.email).includes(q) || norm(p.taxNumber).includes(q));
    if (state.status === 'active') list = list.filter((p) => p.active !== false);
    else if (state.status === 'inactive') list = list.filter((p) => p.active === false);
    else if (state.status === 'due') list = list.filter((p) => balanceOf(type, p.id) > 0.01);
    else if (state.status === 'clear') list = list.filter((p) => Math.abs(balanceOf(type, p.id)) <= 0.01);
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (state.sort === 'balance') list.sort((a, b) => balanceOf(type, b.id) - balanceOf(type, a.id));
    else if (state.sort === 'credit') list.sort((a, b) => (b.creditLimit || 0) - (a.creditLimit || 0));
    return list;
  }

  function nextCode(type) {
    const list = parties(type);
    const prefix = type === 'customer' ? 'C-' : 'S-';
    let max = 0;
    list.forEach((p) => {
      const m = String(p.code || '').match(/(\d+)$/);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function statusBadge(p) {
    return p.active === false
      ? '<span class="badge badge-gray">موقوف</span>'
      : '<span class="badge badge-green">نشط</span>';
  }

  /* ---------- Form ---------- */
  function openForm(type, id) {
    const isSupplier = type === 'supplier';
    const party = id ? (isSupplier ? Store.supplier(id) : Store.customer(id)) : null;
    const isEdit = !!party;
    const fields = [
      { name: 'name', label: isSupplier ? 'اسم المورد' : 'اسم العميل', required: true, full: true, placeholder: isSupplier ? 'شركة / مؤسسة / فرد' : 'اسم العميل الكامل أو اسم الشركة' },
      { name: 'code', label: 'رمز الحساب', required: true, value: party ? party.code : nextCode(type), placeholder: isSupplier ? 'S-001' : 'C-001', disabled: isEdit, help: isEdit ? 'لا يمكن تغيير الرمز بعد الإنشاء' : 'رمز داخلي للبحث السريع' },
      { name: 'phone', label: 'رقم الجوال', placeholder: '+966 5X XXX XXXX' },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'name@example.com' },
      { name: 'address', label: 'العنوان', full: true, placeholder: 'المدينة — الحي — الشارع' }
    ];
    if (isSupplier) {
      fields.push({ name: 'taxNumber', label: 'الرقم الضريبي', placeholder: '310000000000003' });
    } else {
      fields.push({ name: 'creditLimit', label: 'حد الائتمان', type: 'number', step: '0.01', min: 0, num: true, help: 'أقصى رصيد مسموح به للبيع الآجل' });
    }
    if (!isEdit) {
      fields.push({
        name: 'openingBalance', label: 'الرصيد الافتتاحي', type: 'number', step: '0.01', min: 0, num: true,
        help: isSupplier ? 'المبلغ المستحق للمورد عند بداية التعامل' : 'المبلغ المستحق على العميل عند بداية التعامل'
      });
    }
    fields.push({ name: 'notes', label: 'ملاحظات', type: 'textarea', full: true, placeholder: 'ملاحظات داخلية اختيارية' });
    fields.push({ name: 'active', label: 'نشط', type: 'checkbox', text: 'متاح للتعامل في الفواتير والعمليات', full: true });

    PK.formModal({
      title: isEdit ? `تعديل ${isSupplier ? 'المورد' : 'العميل'}` : (isSupplier ? 'إضافة مورد جديد' : 'إضافة عميل جديد'),
      subtitle: isEdit ? party.name : (isSupplier ? 'سجّل بيانات المورد لربط فواتير الشراء والمدفوعات' : 'سجّل بيانات العميل لربط المبيعات والتحصيلات'),
      icon: isSupplier ? 'truck' : 'user',
      size: 'lg',
      submitText: isEdit ? 'حفظ التعديلات' : 'إضافة السجل',
      submitIcon: isEdit ? 'save' : 'plus',
      values: party ? {
        name: party.name, code: party.code, phone: party.phone, email: party.email,
        address: party.address, taxNumber: party.taxNumber, creditLimit: party.creditLimit,
        notes: party.notes, active: party.active !== false
      } : { active: true, creditLimit: '', openingBalance: '' },
      fields,
      extraBody: `<div class="info-banner ${isSupplier ? 'warn' : 'success'} mt-2">${U.icon(isSupplier ? 'truck' : 'user', 17)}<div>
        ${isSupplier ? 'سيظهر المورد في فواتير الشراء وسندات الصرف وكشوف الحساب.' : 'سيظهر العميل في نقطة البيع وكشوف الحساب وسندات القبض.'}
        ${!isEdit ? ' يمكن ترحيل رصيد افتتاحي ليُضاف إلى حساب الذمم تلقائياً.' : ''}
      </div></div>`,
      onSubmit(data) {
        const name = String(data.name || '').trim();
        const code = String(data.code || '').trim();
        if (!name) throw new Error('الاسم مطلوب.');
        if (!code) throw new Error('رمز الحساب مطلوب.');
        const duplicateCode = parties(type).find((p) => p.id !== (party ? party.id : '') && norm(p.code) === norm(code));
        if (duplicateCode) throw new Error('رمز الحساب مستخدم بالفعل.');
        const payload = {
          name, code, phone: String(data.phone || '').trim(), email: String(data.email || '').trim(),
          address: String(data.address || '').trim(), notes: String(data.notes || '').trim(),
          active: !!data.active
        };
        if (isSupplier) payload.taxNumber = String(data.taxNumber || '').trim();
        else payload.creditLimit = Math.max(0, U.parseNum(data.creditLimit));

        if (isEdit) {
          Store.update(isSupplier ? 'suppliers' : 'customers', party.id, payload);
          Store.audit(isSupplier ? 'تعديل مورد' : 'تعديل عميل', `${name} — ${code}`, isSupplier ? 'truck' : 'user');
          Store.save();
          return party.id;
        }

        const id = U.uid(isSupplier ? 's' : 'c');
        const record = Object.assign({ id, loyaltyPoints: 0, createdAt: new Date().toISOString() }, payload);
        if (isSupplier) record.taxNumber = payload.taxNumber || '';
        else record.creditLimit = payload.creditLimit || 0;
        parties(type).push(record);
        const opening = U.round2(U.parseNum(data.openingBalance));
        if (opening > 0) {
          const lines = isSupplier
            ? [
              { accountId: Accounting.ACC.capital, debit: opening, credit: 0, memo: 'رصيد افتتاحي — مورد' },
              { accountId: Accounting.ACC.ap, debit: 0, credit: opening, partyId: id, partyType: 'supplier', memo: `رصيد افتتاحي — ${name}` }
            ]
            : [
              { accountId: Accounting.ACC.ar, debit: opening, credit: 0, partyId: id, partyType: 'customer', memo: `رصيد افتتاحي — ${name}` },
              { accountId: Accounting.ACC.capital, debit: 0, credit: opening, memo: 'رصيد افتتاحي — عميل' }
            ];
          const entry = Accounting.post({
            date: U.today(), description: `رصيد افتتاحي — ${name}`,
            sourceType: 'opening_party', sourceId: id, sourceNumber: code, lines
          });
          record.openingJournalId = entry.id;
        }
        Store.audit(isSupplier ? 'مورد جديد' : 'عميل جديد', `${name} — ${code}`, isSupplier ? 'truck' : 'user');
        Store.save();
        return id;
      },
      successMessage: isEdit ? 'تم حفظ البيانات' : (isSupplier ? 'تمت إضافة المورد' : 'تمت إضافة العميل'),
      onDone() { App.refresh(); }
    });
  }

  function removeParty(type, id) {
    const party = type === 'customer' ? Store.customer(id) : Store.supplier(id);
    if (!party) return;
    const used = Store.data.journal.some((e) => e.lines.some((l) => l.partyId === id))
      || Store.data.invoices.some((i) => i.customerId === id)
      || Store.data.purchases.some((p) => p.supplierId === id)
      || Store.data.payments.some((p) => p.partyId === id);
    UI.confirm({
      title: used ? 'إيقاف السجل' : 'حذف السجل',
      message: used
        ? `السجل «<strong>${U.esc(party.name)}</strong>» مرتبط بحركات مالية أو مستندات. سيتم إيقافه وإخفاؤه من القوائم مع الاحتفاظ بكامل تاريخه.`
        : `هل تريد حذف «<strong>${U.esc(party.name)}</strong>» نهائياً؟ لا يمكن التراجع.`,
      danger: !used, confirmText: used ? 'إيقاف السجل' : 'حذف نهائي', icon: used ? 'archive' : 'trash'
    }).then((ok) => {
      if (!ok) return;
      if (used) Store.update(type === 'customer' ? 'customers' : 'suppliers', id, { active: false });
      else Store.remove(type === 'customer' ? 'customers' : 'suppliers', id);
      Store.audit(used ? 'إيقاف سجل' : 'حذف سجل', `${type === 'customer' ? 'عميل' : 'مورد'} — ${party.name}`, used ? 'archive' : 'trash');
      Store.save();
      UI.toast(used ? 'تم إيقاف السجل' : 'تم حذف السجل', 'success');
      App.refresh();
    });
  }

  /* ---------- Tables ---------- */
  function customersTable() {
    const list = filtered('customer');
    const body = list.map((c) => {
      const bal = Accounting.customerBalance(c.id);
      const limit = Number(c.creditLimit) || 0;
      const usage = limit > 0 ? Math.min(100, Math.max(0, bal / limit * 100)) : 0;
      return `<tr>
        <td><div class="product-cell">${UI.avatar(c.name, 'sm')}<div><div class="cell-main">${U.esc(c.name)}</div><div class="cell-sub"><span class="code">${U.esc(c.code)}</span>${c.notes ? ' • ' + U.esc(c.notes) : ''}</div></div></div></td>
        <td><div class="cell-main" style="font-weight:600">${U.esc(c.phone || '—')}</div><div class="cell-sub">${U.esc(c.email || '')}</div></td>
        <td class="num">${limit ? U.money(limit) : '—'}</td>
        <td style="min-width:140px"><div class="cell-main ${bal > 0.01 ? 'text-danger' : bal < -0.01 ? 'text-success' : ''}">${U.money(Math.abs(bal))} ${bal < -0.01 ? 'دائن' : ''}</div>
          ${limit ? `<div class="progress ${usage > 85 ? 'danger' : usage > 65 ? 'warn' : ''}" style="margin-top:5px;height:5px"><span style="width:${Math.max(3, usage)}%"></span></div><div class="cell-sub">استخدام ${U.num(usage, 0)}% من الحد</div>` : `<div class="cell-sub">${bal > 0.01 ? 'مستحق على العميل' : 'لا يوجد رصيد'}</div>`}</td>
        <td class="num text-muted">${U.num(c.loyaltyPoints || 0, 0)}</td>
        <td>${statusBadge(c)}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-statement="${c.id}" title="كشف الحساب">${U.icon('file', 15)}</button>
          <button class="btn-icon btn-ghost" data-receipt="${c.id}" title="سند قبض">${U.icon('download', 15)}</button>
          <button class="btn-icon btn-ghost" data-edit="${c.id}" title="تعديل">${U.icon('edit', 15)}</button>
          <button class="btn-icon btn-ghost" data-del="${c.id}" title="حذف / إيقاف">${U.icon('trash', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(7, 'users', 'لا يوجد عملاء مطابقون', 'جرّب تغيير البحث أو أضف عميلاً جديداً');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>العميل</th><th>التواصل</th><th>حد الائتمان</th><th>الرصيد</th><th>النقاط</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">عرض <b>${list.length}</b> من ${Store.data.customers.length} عميل</span>
        <span class="text-muted text-xs">إجمالي المستحق على العملاء: <b class="text-danger">${U.money(U.sum(list, (c) => Math.max(0, Accounting.customerBalance(c.id))))}</b></span></div>`;
  }

  function suppliersTable() {
    const list = filtered('supplier');
    const body = list.map((s) => {
      const bal = Accounting.supplierBalance(s.id);
      return `<tr>
        <td><div class="product-cell">${UI.avatar(s.name, 'sm')}<div><div class="cell-main">${U.esc(s.name)}</div><div class="cell-sub"><span class="code">${U.esc(s.code)}</span>${s.notes ? ' • ' + U.esc(s.notes) : ''}</div></div></div></td>
        <td><div class="cell-main" style="font-weight:600">${U.esc(s.phone || '—')}</div><div class="cell-sub">${U.esc(s.email || '')}</div></td>
        <td><span class="code">${U.esc(s.taxNumber || '—')}</span></td>
        <td class="num fw-800 ${bal > 0.01 ? 'text-danger' : 'text-muted'}">${U.money(Math.abs(bal))} ${bal > 0.01 ? '<span class="text-muted text-xs">مستحق</span>' : ''}</td>
        <td>${statusBadge(s)}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-statement="${s.id}" title="كشف الحساب">${U.icon('file', 15)}</button>
          <button class="btn-icon btn-ghost" data-payment="${s.id}" title="سند صرف">${U.icon('upload', 15)}</button>
          <button class="btn-icon btn-ghost" data-edit="${s.id}" title="تعديل">${U.icon('edit', 15)}</button>
          <button class="btn-icon btn-ghost" data-del="${s.id}" title="حذف / إيقاف">${U.icon('trash', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(6, 'truck', 'لا يوجد موردون مطابقون', 'أضف مورداً لبدء تسجيل المشتريات');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>المورد</th><th>التواصل</th><th>الرقم الضريبي</th><th>الرصيد المستحق</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">عرض <b>${list.length}</b> من ${Store.data.suppliers.length} مورد</span>
        <span class="text-muted text-xs">إجمالي المستحق للموردين: <b class="text-danger">${U.money(U.sum(list, (s) => Math.max(0, Accounting.supplierBalance(s.id))))}</b></span></div>`;
  }

  const BUCKETS = [
    { key: 'current', label: '0 — 30 يوم', color: '#0e5a44' },
    { key: 'd30', label: '31 — 60 يوم', color: '#a97c28' },
    { key: 'd60', label: '61 — 90 يوم', color: '#c26a3d' },
    { key: 'd90', label: 'أكثر من 90 يوم', color: '#b13a33' }
  ];

  function agingTable() {
    const type = state.agingType;
    const data = Accounting.aging(type);
    const total = data.totals.total || 0;
    const body = data.rows.map((r) => {
      const bar = BUCKETS.map((b) => {
        const w = total ? (r.buckets[b.key] / total) * 100 : 0;
        return `<span style="width:${w}%;background:${b.color}" title="${b.label}"></span>`;
      }).join('');
      return `<tr>
        <td><div class="product-cell">${UI.avatar(r.name, 'sm')}<div><div class="cell-main">${U.esc(r.name)}</div><div class="cell-sub">${U.esc(r.phone || '')}</div></div></div></td>
        <td class="num">${r.buckets.current ? U.money(r.buckets.current) : '—'}</td>
        <td class="num ${r.buckets.d30 ? 'text-warning' : ''}">${r.buckets.d30 ? U.money(r.buckets.d30) : '—'}</td>
        <td class="num ${r.buckets.d60 ? 'text-danger' : ''}">${r.buckets.d60 ? U.money(r.buckets.d60) : '—'}</td>
        <td class="num ${r.buckets.d90 ? 'text-danger fw-800' : ''}">${r.buckets.d90 ? U.money(r.buckets.d90) : '—'}</td>
        <td class="num fw-800">${U.money(r.balance)}</td>
        <td style="min-width:140px"><div class="aging-bar">${bar}</div><div class="cell-sub">${r.items.length} مستند مفتوح</div></td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-aging-statement="${r.id}" title="كشف الحساب">${U.icon('file', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(8, 'clock', 'لا توجد أرصدة مستحقة', type === 'customer' ? 'كل العملاء مسددون بالكامل' : 'كل الموردين مسددون بالكامل');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>${type === 'customer' ? 'العميل' : 'المورد'}</th><th>0 — 30</th><th>31 — 60</th><th>61 — 90</th><th>+90</th><th>الإجمالي</th><th>التوزيع</th><th></th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td>الإجمالي</td><td class="num">${U.money(data.totals.current)}</td><td class="num">${U.money(data.totals.d30)}</td><td class="num">${U.money(data.totals.d60)}</td><td class="num">${U.money(data.totals.d90)}</td><td class="num">${U.money(data.totals.total)}</td><td></td><td></td></tr></tfoot>
      </table></div>
      <div class="card-foot"><span class="text-muted text-xs">${data.rows.length} ${type === 'customer' ? 'عميل' : 'مورد'} لديهم أرصدة مستحقة</span>
        <span class="aging-legend">${BUCKETS.map((b) => `<span><i style="background:${b.color}"></i>${b.label}</span>`).join('')}</span></div>`;
  }

  function exportCurrent() {
    if (state.tab === 'customers') {
      const list = filtered('customer');
      PK.exportCSV('customers-' + U.today() + '.csv',
        ['الرمز', 'الاسم', 'الجوال', 'البريد', 'العنوان', 'حد الائتمان', 'الرصيد', 'النقاط', 'الحالة'],
        list.map((c) => [c.code, c.name, c.phone || '', c.email || '', c.address || '', c.creditLimit || 0,
          Accounting.customerBalance(c.id), c.loyaltyPoints || 0, c.active === false ? 'موقوف' : 'نشط']));
    } else if (state.tab === 'suppliers') {
      const list = filtered('supplier');
      PK.exportCSV('suppliers-' + U.today() + '.csv',
        ['الرمز', 'الاسم', 'الجوال', 'البريد', 'العنوان', 'الرقم الضريبي', 'الرصيد', 'الحالة'],
        list.map((s) => [s.code, s.name, s.phone || '', s.email || '', s.address || '', s.taxNumber || '',
          Accounting.supplierBalance(s.id), s.active === false ? 'موقوف' : 'نشط']));
    } else {
      const data = Accounting.aging(state.agingType);
      PK.exportCSV('aging-' + state.agingType + '-' + U.today() + '.csv',
        ['الاسم', '0-30', '31-60', '61-90', '+90', 'الإجمالي'],
        data.rows.map((r) => [r.name, r.buckets.current, r.buckets.d30, r.buckets.d60, r.buckets.d90, r.balance]));
    }
  }

  function printCurrent() {
    if (state.tab === 'customers') {
      const list = filtered('customer');
      PK.printReport({
        title: 'كشف العملاء والأرصدة', subtitle: `${list.length} عميل`,
        headers: ['الرمز', 'العميل', 'الجوال', 'حد الائتمان', 'الرصيد', 'الحالة'],
        rows: list.map((c) => [U.esc(c.code), U.esc(c.name), U.esc(c.phone || ''), U.money(c.creditLimit || 0),
          U.money(Accounting.customerBalance(c.id)), c.active === false ? 'موقوف' : 'نشط']),
        totals: [{ label: 'إجمالي المستحق على العملاء', value: U.money(Accounting.receivables()), grand: true }]
      });
    } else if (state.tab === 'suppliers') {
      const list = filtered('supplier');
      PK.printReport({
        title: 'كشف الموردين والأرصدة', subtitle: `${list.length} مورد`,
        headers: ['الرمز', 'المورد', 'الجوال', 'الرقم الضريبي', 'الرصيد', 'الحالة'],
        rows: list.map((s) => [U.esc(s.code), U.esc(s.name), U.esc(s.phone || ''), U.esc(s.taxNumber || ''),
          U.money(Accounting.supplierBalance(s.id)), s.active === false ? 'موقوف' : 'نشط']),
        totals: [{ label: 'إجمالي المستحق للموردين', value: U.money(Accounting.payables()), grand: true }]
      });
    } else {
      const data = Accounting.aging(state.agingType);
      PK.printReport({
        title: `تقرير أعمار ${state.agingType === 'customer' ? 'الذمم المدينة' : 'الذمم الدائنة'}`,
        subtitle: `${data.rows.length} سجل • حتى ${U.formatDate(U.today(), 'full')}`,
        headers: ['الاسم', '0-30', '31-60', '61-90', '+90', 'الإجمالي'],
        rows: data.rows.map((r) => [U.esc(r.name), U.money(r.buckets.current), U.money(r.buckets.d30),
          U.money(r.buckets.d60), U.money(r.buckets.d90), U.money(r.balance)]),
        totals: [{ label: 'الإجمالي', value: U.money(data.totals.total), grand: true }]
      });
    }
  }

  /* ---------- Render ---------- */
  Pages.contacts = {
    title: 'العملاء والموردون', icon: 'users', perm: 'contacts',
    render(view) {
      viewRef = view;
      const activeCustomers = Store.data.customers.filter((c) => c.active !== false).length;
      const activeSuppliers = Store.data.suppliers.filter((s) => s.active !== false).length;
      const receivables = Accounting.receivables();
      const payables = Accounting.payables();
      const overdue = Store.data.invoices.filter((i) => i.type === 'sale' && i.due > 0.01 && U.daysBetween(i.date, U.today()) > 30).length;

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">العملاء والموردون</div><div class="page-sub">إدارة جهات التعامل والأرصدة وكشوف الحساب وأعمار الديون</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-new="supplier">${U.icon('truck', 14)} مورد جديد</button>
            <button class="btn btn-primary" data-new="customer">${U.icon('plus', 16)} عميل جديد</button>
          </div>
        </div>
        <div class="kpi-grid">
          ${PK.kpi({ label: 'العملاء', value: U.num(Store.data.customers.length, 0), icon: 'users', tone: 'green', sub: `<b>${activeCustomers}</b> نشط • ${U.num(Store.data.customers.length - activeCustomers, 0)} موقوف` })}
          ${PK.kpi({ label: 'الذمم المدينة (لنا)', value: U.money(receivables), icon: 'download', tone: 'blue', sub: `<b>${overdue}</b> فاتورة متأخرة أكثر من 30 يوماً` })}
          ${PK.kpi({ label: 'الموردون', value: U.num(Store.data.suppliers.length, 0), icon: 'truck', tone: 'gold', sub: `<b>${activeSuppliers}</b> مورد نشط` })}
          ${PK.kpi({ label: 'الذمم الدائنة (علينا)', value: U.money(payables), icon: 'upload', tone: 'red', sub: `إجمالي مستحقات الموردين` })}
        </div>
        <div class="card mt-3">
          <div class="tabs">
            <button class="tab ${state.tab === 'customers' ? 'active' : ''}" data-tab="customers">${U.icon('users', 15)} العملاء <span class="count">${Store.data.customers.length}</span></button>
            <button class="tab ${state.tab === 'suppliers' ? 'active' : ''}" data-tab="suppliers">${U.icon('truck', 15)} الموردون <span class="count">${Store.data.suppliers.length}</span></button>
            <button class="tab ${state.tab === 'aging' ? 'active' : ''}" data-tab="aging">${U.icon('clock', 15)} أعمار الديون</button>
          </div>
          ${state.tab === 'aging' ? `
            <div class="toolbar">
              <div class="chips">
                <button class="chip ${state.agingType === 'customer' ? 'active' : ''}" data-aging-type="customer">ذمم العملاء</button>
                <button class="chip ${state.agingType === 'supplier' ? 'active' : ''}" data-aging-type="supplier">ذمم الموردين</button>
              </div>
              <div class="toolbar-spacer"></div>
              <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير</button>
              <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
            </div>
            <div id="contacts-list">${agingTable()}</div>
          ` : `
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="ابحث بالاسم أو الرمز أو الجوال..." value="${U.esc(state.q)}" /></div>
              <select class="select" data-status>
                <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل الحالات</option>
                <option value="active" ${state.status === 'active' ? 'selected' : ''}>نشط</option>
                <option value="due" ${state.status === 'due' ? 'selected' : ''}>عليه رصيد</option>
                <option value="clear" ${state.status === 'clear' ? 'selected' : ''}>رصيد صفري</option>
                <option value="inactive" ${state.status === 'inactive' ? 'selected' : ''}>موقوف</option>
              </select>
              <select class="select" data-sort>
                <option value="name" ${state.sort === 'name' ? 'selected' : ''}>ترتيب: الاسم</option>
                <option value="balance" ${state.sort === 'balance' ? 'selected' : ''}>الأعلى رصيداً</option>
                ${state.tab === 'customers' ? `<option value="credit" ${state.sort === 'credit' ? 'selected' : ''}>حد الائتمان</option>` : ''}
              </select>
              <div class="toolbar-spacer"></div>
              <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير</button>
              <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
              <button class="btn btn-primary btn-sm" data-new="${state.tab === 'suppliers' ? 'supplier' : 'customer'}">${U.icon('plus', 14)} إضافة</button>
            </div>
            <div id="contacts-list">${state.tab === 'customers' ? customersTable() : suppliersTable()}</div>
          `}
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab; state.q = ''; state.status = 'all';
        Pages.contacts.render(view);
      }));
      view.querySelectorAll('[data-new]').forEach((b) => b.addEventListener('click', () => openForm(b.dataset.new)));
      view.querySelectorAll('[data-aging-type]').forEach((b) => b.addEventListener('click', () => {
        state.agingType = b.dataset.agingType;
        const box = view.querySelector('#contacts-list');
        if (box) box.innerHTML = agingTable();
        view.querySelectorAll('[data-aging-type]').forEach((x) => x.classList.toggle('active', x === b));
      }));
      const q = view.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => {
        state.q = q.value;
        const box = view.querySelector('#contacts-list');
        if (box) box.innerHTML = state.tab === 'customers' ? customersTable() : suppliersTable();
      }, 120));
      const st = view.querySelector('[data-status]');
      if (st) st.addEventListener('change', () => {
        state.status = st.value;
        const box = view.querySelector('#contacts-list');
        if (box) box.innerHTML = state.tab === 'customers' ? customersTable() : suppliersTable();
      });
      const sort = view.querySelector('[data-sort]');
      if (sort) sort.addEventListener('change', () => {
        state.sort = sort.value;
        const box = view.querySelector('#contacts-list');
        if (box) box.innerHTML = state.tab === 'customers' ? customersTable() : suppliersTable();
      });
      const exp = view.querySelector('[data-export]');
      if (exp) exp.addEventListener('click', exportCurrent);
      const pr = view.querySelector('[data-print]');
      if (pr) pr.addEventListener('click', printCurrent);

      view.onclick = (e) => {
        const statement = e.target.closest('[data-statement], [data-aging-statement]');
        if (statement) {
          const id = statement.dataset.statement || statement.dataset.agingStatement;
          Actions.openStatement(state.tab === 'aging' ? state.agingType : (state.tab === 'customers' ? 'customer' : 'supplier'), id);
          return;
        }
        const receipt = e.target.closest('[data-receipt]');
        if (receipt) { Actions.openReceipt(receipt.dataset.receipt); return; }
        const payment = e.target.closest('[data-payment]');
        if (payment) { Actions.openSupplierPayment(payment.dataset.payment); return; }
        const edit = e.target.closest('[data-edit]');
        if (edit) { openForm(state.tab === 'suppliers' ? 'supplier' : 'customer', edit.dataset.edit); return; }
        const del = e.target.closest('[data-del]');
        if (del) { removeParty(state.tab === 'suppliers' ? 'supplier' : 'customer', del.dataset.del); return; }
      };
    }
  };
})();
