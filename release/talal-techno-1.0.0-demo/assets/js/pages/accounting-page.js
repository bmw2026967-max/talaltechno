/* ==========================================================================
   Page — Accounting (COA, journals, ledger, trial balance, statements, VAT)
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const A = Accounting;
  const state = {
    tab: 'coa',
    from: U.startOfYear(U.today()),
    to: U.today(),
    coaQ: '',
    journalQ: '',
    journalSource: 'all',
    ledgerAccount: A.ACC.cash,
    asOf: U.today()
  };
  let viewRef = null;

  const TYPE_LABEL = { asset: 'أصول', liability: 'التزامات', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات' };
  const TYPE_TONE = { asset: 'green', liability: 'red', equity: 'purple', revenue: 'blue', expense: 'gold' };
  const SOURCE_LABEL = {
    manual: ['قيد يدوي', 'badge-gray', 'edit'],
    sale: ['فاتورة بيع', 'badge-green', 'receipt'],
    sale_return: ['مرتجع بيع', 'badge-purple', 'refresh'],
    purchase: ['فاتورة شراء', 'badge-blue', 'truck'],
    purchase_return: ['مرتجع شراء', 'badge-amber', 'upload'],
    expense: ['مصروف', 'badge-gold', 'wallet'],
    receipt: ['سند قبض', 'badge-green', 'download'],
    payment: ['سند صرف', 'badge-red', 'upload'],
    transfer: ['تحويل خزينة', 'badge-blue', 'refresh'],
    adjustment: ['تسوية مخزون', 'badge-gold', 'sliders'],
    opening: ['رصيد افتتاحي', 'badge-gray', 'archive'],
    opening_party: ['رصيد افتتاحي', 'badge-gray', 'archive']
  };

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const money = (v) => U.money(v);
  const typeBadge = (type) => `<span class="badge badge-${TYPE_TONE[type] || 'gray'}">${TYPE_LABEL[type] || type}</span>`;
  const sourceBadge = (source) => {
    const s = SOURCE_LABEL[source] || [source || '—', 'badge-gray', 'info'];
    return `<span class="badge ${s[1]}">${U.icon(s[2], 11)}${U.esc(s[0])}</span>`;
  };
  const sourceLabel = (source) => (SOURCE_LABEL[source] || [source || '—'])[0];

  function pctChange(cur, prev) {
    if (!prev) return cur ? 100 : 0;
    return U.round2((cur - prev) / Math.abs(prev) * 100);
  }

  /* ---------- Header ---------- */
  function headerHtml() {
    const isCoa = state.tab === 'coa';
    return `<div class="page-head">
      <div><div class="page-title">المحاسبة</div><div class="page-sub">دليل الحسابات والقيود والتقارير المالية وفق نظام القيد المزدوج</div></div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير</button>
        <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
        ${isCoa
          ? `<button class="btn btn-primary" data-new-account>${U.icon('plus', 16)} حساب جديد</button>`
          : `<button class="btn btn-primary" data-new-journal>${U.icon('plus', 16)} قيد يومية</button>`}
      </div>
    </div>`;
  }

  function kpiHtml() {
    const bs = A.balanceSheet(U.today());
    const inc = A.incomeStatement(U.startOfYear(U.today()), U.today());
    return `<div class="kpi-grid">
      ${PK.kpi({ label: 'إجمالي الأصول', value: U.money(bs.totalAssets), icon: 'bank', tone: 'green', sub: `نقدية <b>${U.moneyShort(A.cashBalance())}</b> • بنك <b>${U.moneyShort(A.bankBalance())}</b>` })}
      ${PK.kpi({ label: 'الالتزامات', value: U.money(bs.totalLiabilities), icon: 'upload', tone: 'red', sub: `موردون <b>${U.moneyShort(A.payables())}</b> • ضريبة <b>${U.moneyShort(A.accountBalance(A.ACC.vatOutput))}</b>` })}
      ${PK.kpi({ label: 'حقوق الملكية', value: U.money(bs.totalEquity + bs.currentEarnings), icon: 'scale', tone: 'purple', sub: `رأس المال <b>${U.moneyShort(A.accountBalance(A.ACC.capital))}</b>` })}
      ${PK.kpi({ label: 'صافي الربح (العام)', value: U.money(inc.netProfit), icon: 'trendingUp', tone: inc.netProfit >= 0 ? 'gold' : 'red', sub: `هامش صافي <b>${U.pct(inc.margin)}</b> • إيرادات <b>${U.moneyShort(inc.totalRevenue)}</b>` })}
    </div>`;
  }

  function tabsHtml() {
    const tabs = [
      ['coa', 'دليل الحسابات', 'book', Store.data.accounts.length],
      ['journals', 'قيود اليومية', 'list', Store.data.journal.length],
      ['ledger', 'دفتر الأستاذ', 'bookOpen', null],
      ['trial', 'ميزان المراجعة', 'scale', null],
      ['income', 'قائمة الدخل', 'trendingUp', null],
      ['balance', 'الميزانية العمومية', 'bank', null],
      ['vat', 'الإقرار الضريبي', 'percent', null]
    ];
    return `<div class="tabs">${tabs.map(([id, label, icon, count]) =>
      `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}${count !== null ? `<span class="count">${U.num(count, 0)}</span>` : ''}</button>`).join('')}</div>`;
  }

  function rangeToolbar(extra) {
    return `<div data-range>${PK.rangeInputs(state.from, state.to, extra)}</div>`;
  }

  /* ---------- Chart of accounts ---------- */
  function accountsWithAncestors() {
    const q = norm(state.coaQ);
    if (!q) return Store.data.accounts;
    const set = new Set();
    Store.data.accounts.forEach((a) => {
      if (norm(a.name).includes(q) || String(a.code).includes(q)) set.add(a.id);
    });
    Store.data.accounts.forEach((a) => {
      if (!set.has(a.id)) return;
      let parent = a.parent;
      let guard = 0;
      while (parent && guard++ < 20) {
        set.add(parent);
        const p = Store.account(parent);
        parent = p ? p.parent : null;
      }
    });
    return Store.data.accounts.filter((a) => set.has(a.id));
  }

  function accountRow(a, depth, list) {
    const children = list.filter((x) => x.parent === a.id).sort((x, y) => String(x.code).localeCompare(String(y.code)));
    const bal = A.accountBalance(a.id);
    const hasJournal = Store.data.journal.some((e) => e.lines.some((l) => l.accountId === a.id));
    const normal = a.type === 'asset' || a.type === 'expense' ? 'مدين' : 'دائن';
    const display = bal >= 0 ? 'مدين' : 'دائن';
    return `<div class="account-row ${a.isGroup ? 'group' : ''}" style="padding-inline-start:${12 + depth * 20}px">
        <span class="account-indent">${a.isGroup ? U.icon('chevronDown', 12) : ''}</span>
        <span class="account-code">${U.esc(a.code)}</span>
        <span class="account-name">${U.esc(a.name)}</span>
        <span class="acc-type">${TYPE_LABEL[a.type] || a.type}${a.isGroup ? ' • رئيسي' : ''}</span>
        <span class="acc-bal ${bal < -0.004 ? 'text-success' : bal > 0.004 ? '' : 'text-muted'}" title="الرصيد الطبيعي ${normal}">${U.money(Math.abs(bal))} <small class="text-muted" style="font-weight:600;font-size:9px">${display}</small></span>
        <span class="row-actions" style="opacity:1">
          ${a.isGroup ? `<button class="btn-icon btn-ghost" data-account-add="${a.id}" title="إضافة حساب فرعي">${U.icon('plus', 14)}</button>` : ''}
          <button class="btn-icon btn-ghost" data-account-edit="${a.id}" title="تعديل">${U.icon('edit', 14)}</button>
          <button class="btn-icon btn-ghost" data-account-ledger="${a.id}" title="دفتر الأستاذ">${U.icon('bookOpen', 14)}</button>
          ${!a.isGroup && !hasJournal ? `<button class="btn-icon btn-ghost" data-account-del="${a.id}" title="حذف">${U.icon('trash', 14)}</button>` : ''}
        </span>
      </div>${children.map((c) => accountRow(c, depth + 1, list)).join('')}`;
  }

  function coaContent() {
    const list = accountsWithAncestors();
    const roots = list.filter((a) => !a.parent || !list.some((x) => x.id === a.parent))
      .sort((a, b) => String(a.code).localeCompare(String(b.code)));
    const rows = roots.map((a) => accountRow(a, 0, list)).join('') || UI.empty('book', 'لا توجد حسابات مطابقة', 'جرّب تغيير البحث');
    return `${rangeToolbar(`<div class="searchbox">${U.icon('search', 15)}<input class="input" data-coa-q placeholder="ابحث باسم الحساب أو رقمه..." value="${U.esc(state.coaQ)}" /></div>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('book', 18)} دليل الحسابات</div><div class="card-sub">${Store.data.accounts.filter((a) => a.isGroup).length} حساب رئيسي • ${Store.data.accounts.filter((a) => !a.isGroup).length} حساب فرعي قابل للترحيل</div></div>
          <button class="btn btn-primary btn-sm" data-new-account>${U.icon('plus', 14)} حساب جديد</button></div>
        <div style="padding:8px 12px">${rows}</div>
        <div class="card-foot"><span class="text-muted text-xs">إجمالي مدين الدليل: <b>${U.money(A.totalJournalDebit())}</b></span>
          <span class="text-muted text-xs">إجمالي دائن الدليل: <b>${U.money(A.totalJournalCredit())}</b></span></div>
      </div>`;
  }

  function openAccountForm(id, parentId) {
    const acc = id ? Store.account(id) : null;
    const isEdit = !!acc;
    const presetParent = parentId ? Store.account(parentId) : null;
    const groups = Store.data.accounts.filter((a) => a.isGroup && (!acc || a.id !== acc.id));
    const typeOptions = Object.keys(TYPE_LABEL).map((t) => ({ value: t, label: TYPE_LABEL[t] }));
    const parentOptions = groups.sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }));
    PK.formModal({
      title: isEdit ? 'تعديل حساب' : 'إضافة حساب جديد',
      subtitle: isEdit ? `${acc.code} — ${acc.name}` : 'أضف حساباً رئيسياً أو فرعياً إلى دليل الحسابات',
      icon: 'book',
      size: 'md',
      submitText: isEdit ? 'حفظ التعديلات' : 'إضافة الحساب',
      submitIcon: isEdit ? 'save' : 'plus',
      values: acc ? { code: acc.code, name: acc.name, type: acc.type, parent: acc.parent || '', isGroup: !!acc.isGroup }
        : { type: presetParent ? presetParent.type : 'asset', parent: presetParent ? presetParent.id : '', isGroup: !presetParent },
      fields: [
        { name: 'code', label: 'رقم الحساب', required: true, placeholder: 'مثال: 1107', disabled: isEdit, help: isEdit ? 'لا يمكن تغيير رقم الحساب بعد الإنشاء' : 'رقم فريد يستخدم في ترتيب الدليل' },
        { name: 'name', label: 'اسم الحساب', required: true, placeholder: 'مثال: عهد ومستحقات موظفين' },
        { name: 'type', label: 'نوع الحساب', type: 'select', options: typeOptions, disabled: isEdit },
        { name: 'parent', label: 'الحساب الأب', type: 'select', options: parentOptions, help: 'اتركه فارغاً للحسابات الرئيسية فقط' },
        { name: 'isGroup', label: 'حساب رئيسي (تجميعي)', type: 'checkbox', text: 'لا يقبل الترحيل المباشر ويُستخدم لتجميع الحسابات الفرعية', disabled: isEdit, full: true }
      ],
      extraBody: `<div class="info-banner success mt-2">${U.icon('info', 17)}<div>الحسابات الرئيسية تُستخدم للتجميع فقط. القيود تُرحّل إلى الحسابات الفرعية (Leaf Accounts).</div></div>`,
      onMount(modalEl) {
        const typeSel = modalEl.querySelector('[name=type]');
        const parentSel = modalEl.querySelector('[name=parent]');
        const isGroupBox = modalEl.querySelector('[name=isGroup]');
        const refreshParents = () => {
          const type = typeSel.value;
          const current = parentSel.value;
          parentSel.innerHTML = `<option value="">بدون أب — حساب رئيسي</option>` + groups
            .filter((g) => g.type === type)
            .sort((a, b) => String(a.code).localeCompare(String(b.code)))
            .map((g) => `<option value="${g.id}" ${g.id === current ? 'selected' : ''}>${U.esc(g.code)} — ${U.esc(g.name)}</option>`).join('');
          if (!isEdit) isGroupBox.checked = !parentSel.value;
        };
        typeSel.addEventListener('change', refreshParents);
        parentSel.addEventListener('change', () => { if (!isEdit) isGroupBox.checked = !parentSel.value; });
        refreshParents();
        if (isEdit) {
          parentSel.value = acc.parent || '';
          isGroupBox.checked = !!acc.isGroup;
        }
      },
      onSubmit(data) {
        const code = String(data.code || '').trim();
        const name = String(data.name || '').trim();
        const type = String(data.type || '').trim();
        const isGroup = !!data.isGroup;
        const parent = String(data.parent || '').trim();
        if (!code) throw new Error('رقم الحساب مطلوب.');
        if (!/^[0-9]{3,8}$/.test(code)) throw new Error('رقم الحساب يجب أن يتكون من 3 إلى 8 أرقام.');
        if (!name) throw new Error('اسم الحساب مطلوب.');
        if (!TYPE_LABEL[type]) throw new Error('نوع الحساب غير صحيح.');
        if (!isEdit && Store.account(code)) throw new Error('رقم الحساب مستخدم بالفعل.');
        if (!isGroup && !parent) throw new Error('اختر الحساب الأب للحساب الفرعي.');
        if (parent) {
          const p = Store.account(parent);
          if (!p || !p.isGroup) throw new Error('الحساب الأب يجب أن يكون حساباً رئيسياً.');
          if (p.type !== type) throw new Error('نوع الحساب الفرعي يجب أن يطابق نوع الحساب الأب.');
          let cursor = p, guard = 0;
          while (cursor && guard++ < 30) {
            if (acc && cursor.id === acc.id) throw new Error('لا يمكن اختيار الحساب أو أحد فروعه كحساب أب.');
            cursor = cursor.parent ? Store.account(cursor.parent) : null;
          }
        }
        if (isEdit) {
          Store.update('accounts', acc.id, { name, parent: parent || null });
          Store.audit('تعديل حساب', `${acc.code} — ${name}`, 'book');
          Store.save();
          return acc.id;
        }
        const record = {
          id: code, code, name, type, isGroup,
          parent: parent || null,
          normal: type === 'asset' || type === 'expense' ? 'debit' : 'credit'
        };
        Store.data.accounts.push(record);
        Store.audit('حساب جديد', `${code} — ${name}`, 'plus');
        Store.save();
        return code;
      },
      successMessage: isEdit ? 'تم حفظ الحساب' : 'تمت إضافة الحساب',
      onDone() { App.refresh(); }
    });
  }

  function deleteAccount(id) {
    const acc = Store.account(id);
    if (!acc) return;
    const children = Store.data.accounts.filter((a) => a.parent === id);
    if (children.length) { UI.toast('لا يمكن حذف حساب له حسابات فرعية', 'error'); return; }
    const used = Store.data.journal.some((e) => e.lines.some((l) => l.accountId === id));
    if (used) { UI.toast('لا يمكن حذف حساب مرتبط بقيود محاسبية', 'error'); return; }
    UI.confirm({
      title: 'حذف الحساب', message: `هل تريد حذف الحساب «<strong>${U.esc(acc.name)}</strong>» (${U.esc(acc.code)})؟`,
      danger: true, confirmText: 'حذف', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.remove('accounts', id);
      Store.audit('حذف حساب', `${acc.code} — ${acc.name}`, 'trash');
      Store.save();
      UI.toast('تم حذف الحساب', 'success');
      App.refresh();
    });
  }

  /* ---------- Journals ---------- */
  function filteredJournals() {
    let list = Store.data.journal.filter((e) => U.inRange(e.date, state.from, state.to));
    if (state.journalSource !== 'all') list = list.filter((e) => e.sourceType === state.journalSource);
    const q = norm(state.journalQ);
    if (q) list = list.filter((e) => norm(e.number).includes(q) || norm(e.description).includes(q)
      || norm(e.sourceNumber).includes(q) || norm(e.createdBy).includes(q));
    return list.sort((a, b) => (a.date === b.date ? String(b.number).localeCompare(String(a.number)) : b.date.localeCompare(a.date)));
  }

  function journalsContent() {
    const all = filteredJournals();
    const list = all.slice(0, 250);
    const rows = list.map((e) => {
      const dr = U.sum(e.lines, (l) => l.debit);
      const cr = U.sum(e.lines, (l) => l.credit);
      return `<tr>
        <td><div class="cell-main"><span class="code">${U.esc(e.number)}</span></div><div class="cell-sub">${U.formatDate(e.date)} • ${U.formatTime(e.createdAt)}</div></td>
        <td><div class="cell-main">${U.esc(e.description)}</div><div class="cell-sub">${U.num((e.lines || []).length, 0)} سطر • ${U.esc(e.createdBy || '')}</div></td>
        <td>${sourceBadge(e.sourceType)}${e.sourceNumber ? `<div class="cell-sub"><span class="code">${U.esc(e.sourceNumber)}</span></div>` : ''}</td>
        <td class="num fw-800">${U.money(dr)}</td>
        <td class="num fw-800">${U.money(cr)}</td>
        <td>${Math.abs(dr - cr) < 0.01 ? '<span class="badge badge-green">متوازن</span>' : '<span class="badge badge-red">غير متوازن</span>'}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-journal="${e.id}" title="عرض القيد">${U.icon('eye', 15)}</button>
          ${e.sourceType === 'manual' ? `<button class="btn-icon btn-ghost" data-journal-del="${e.id}" title="حذف القيد">${U.icon('trash', 15)}</button>` : ''}
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(7, 'book', 'لا توجد قيود في الفترة', 'جرّب توسيع الفترة أو أنشئ قيداً يدوياً');
    const sources = ['all', 'manual', 'sale', 'sale_return', 'purchase', 'purchase_return', 'expense', 'receipt', 'payment', 'transfer', 'adjustment', 'opening', 'opening_party'];
    return `${rangeToolbar(`<div class="searchbox">${U.icon('search', 15)}<input class="input" data-journal-q placeholder="ابحث برقم القيد أو البيان..." value="${U.esc(state.journalQ)}" /></div>
        <select class="select" data-journal-source>${sources.map((s) => `<option value="${s}" ${state.journalSource === s ? 'selected' : ''}>${s === 'all' ? 'كل المصادر' : sourceLabel(s)}</option>`).join('')}</select>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('list', 18)} قيود اليومية</div><div class="card-sub">${U.num(all.length, 0)} قيد في الفترة • تُعرض أحدث 250 قيد</div></div>
          <button class="btn btn-primary btn-sm" data-new-journal>${U.icon('plus', 14)} قيد جديد</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>رقم القيد</th><th>البيان</th><th>المصدر</th><th>مدين</th><th>دائن</th><th>التوازن</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="3">إجمالي المعروض</td><td class="num">${U.money(U.sum(list, (e) => U.sum(e.lines, (l) => l.debit)))}</td><td class="num">${U.money(U.sum(list, (e) => U.sum(e.lines, (l) => l.credit)))}</td><td></td><td></td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">إجمالي القيود في النظام: ${U.num(Store.data.journal.length, 0)}</span>
          <span class="text-muted text-xs">مدين الدليل: <b>${U.money(A.totalJournalDebit())}</b> • دائن الدليل: <b>${U.money(A.totalJournalCredit())}</b></span></div>
      </div>`;
  }

  function journalLineHtml(selected) {
    return `<div class="journal-line" data-line style="display:grid;grid-template-columns:minmax(0,1.4fr) 105px 105px minmax(0,1fr) 30px;gap:8px;align-items:center;padding:6px 0">
      <select class="select" data-account><option value="">اختر الحساب...</option>${PK.accountOptions(null, selected)}</select>
      <input class="input num" data-debit type="number" step="0.01" min="0" placeholder="مدين" />
      <input class="input num" data-credit type="number" step="0.01" min="0" placeholder="دائن" />
      <input class="input" data-memo placeholder="بيان السطر" />
      <button type="button" class="btn-icon btn-ghost" data-remove-line title="حذف السطر">${U.icon('x', 14)}</button>
    </div>`;
  }

  function openJournalForm() {
    const modal = UI.modal({
      size: 'xl',
      title: 'قيد يومية جديد',
      subtitle: 'يجب أن يتساوى مجموع المدين مع مجموع الدائن',
      icon: 'book',
      body: `<div class="form-grid">
        <div class="field"><label>تاريخ القيد <span class="req">*</span></label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field"><label>البيان العام <span class="req">*</span></label><input class="input" name="description" placeholder="مثال: تسوية مصروفات مستحقة" /></div>
      </div>
      <div class="form-section">
        <div class="form-section-title" style="display:flex;align-items:center;justify-content:space-between">بنود القيد <span class="text-muted text-xs">الحساب — مدين — دائن — البيان</span></div>
        <div data-lines>${journalLineHtml()}${journalLineHtml()}</div>
        <button type="button" class="btn btn-secondary btn-sm mt-1" data-add-line>${U.icon('plus', 14)} إضافة سطر</button>
        <div class="journal-totals"><span>مدين: <b data-total-debit>0.00</b></span><span>دائن: <b data-total-credit>0.00</b></span><span data-balance-pill class="balanced-pill ok">متوازن</span></div>
      </div>
      <div class="info-banner success mt-2">${U.icon('info', 17)}<div>سيُسجّل القيد باسم <strong>${U.esc(Store.currentUser ? Store.currentUser.name : 'المستخدم')}</strong> ويظهر مباشرة في دفتر الأستاذ وميزان المراجعة.</div></div>`,
      footer: `<span class="foot-info">القيود اليدوية يمكن حذفها لاحقاً من قائمة القيود</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-save>${U.icon('save', 15)} ترحيل القيد</button>`,
      onMount(modalEl, close) {
        const lines = modalEl.querySelector('[data-lines]');
        const totalDebit = modalEl.querySelector('[data-total-debit]');
        const totalCredit = modalEl.querySelector('[data-total-credit]');
        const pill = modalEl.querySelector('[data-balance-pill]');
        const recalc = () => {
          let dr = 0, cr = 0;
          lines.querySelectorAll('[data-line]').forEach((row) => {
            dr += U.parseNum(row.querySelector('[data-debit]').value);
            cr += U.parseNum(row.querySelector('[data-credit]').value);
          });
          dr = U.round2(dr); cr = U.round2(cr);
          totalDebit.textContent = U.num(dr, 2);
          totalCredit.textContent = U.num(cr, 2);
          const ok = dr > 0 && Math.abs(dr - cr) < 0.01;
          pill.textContent = ok ? 'متوازن' : (dr === 0 && cr === 0 ? 'بانتظار الإدخال' : 'غير متوازن');
          pill.className = 'balanced-pill ' + (ok ? 'ok' : 'bad');
        };
        const bindLine = (row) => {
          const debit = row.querySelector('[data-debit]');
          const credit = row.querySelector('[data-credit]');
          debit.addEventListener('input', () => { if (U.parseNum(debit.value) > 0) credit.value = ''; recalc(); });
          credit.addEventListener('input', () => { if (U.parseNum(credit.value) > 0) debit.value = ''; recalc(); });
          row.querySelector('[data-remove-line]').addEventListener('click', () => {
            if (lines.querySelectorAll('[data-line]').length <= 2) { UI.toast('القيد يحتاج سطرين على الأقل', 'warning'); return; }
            row.remove(); recalc();
          });
          recalc();
        };
        lines.querySelectorAll('[data-line]').forEach(bindLine);
        modalEl.querySelector('[data-add-line]').addEventListener('click', () => {
          const wrap = document.createElement('div');
          wrap.innerHTML = journalLineHtml();
          const row = wrap.firstElementChild;
          lines.appendChild(row);
          bindLine(row);
          row.querySelector('[data-account]').focus();
        });
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          const description = String(data.description || '').trim();
          if (!description) { UI.toast('أدخل بيان القيد', 'error'); return; }
          const entryLines = [];
          let error = '';
          lines.querySelectorAll('[data-line]').forEach((row) => {
            const accountId = row.querySelector('[data-account]').value;
            const debit = U.round2(U.parseNum(row.querySelector('[data-debit]').value));
            const credit = U.round2(U.parseNum(row.querySelector('[data-credit]').value));
            const memo = row.querySelector('[data-memo]').value;
            if (!accountId && !debit && !credit) return;
            if (!accountId) { error = 'اختر حساباً لكل سطر يحتوي مبلغاً.'; return; }
            if (debit > 0 && credit > 0) { error = 'لا يمكن إدخال مدين ودائن في نفس السطر.'; return; }
            if (debit <= 0 && credit <= 0) { error = 'أدخل مبلغاً مديناً أو دائناً في كل سطر.'; return; }
            entryLines.push({ accountId, debit, credit, memo });
          });
          if (error) { UI.toast(error, 'error'); return; }
          if (entryLines.length < 2) { UI.toast('أضف سطرين على الأقل للقيد', 'error'); return; }
          const dr = U.round2(U.sum(entryLines, (l) => l.debit));
          const cr = U.round2(U.sum(entryLines, (l) => l.credit));
          if (Math.abs(dr - cr) > 0.01) { UI.toast(`القيد غير متوازن — مدين ${U.money(dr)} / دائن ${U.money(cr)}`, 'error'); return; }
          try {
            const entry = A.manualJournal({ date: data.date, description, lines: entryLines });
            close();
            UI.toast(`تم ترحيل القيد ${entry.number}`, 'success');
            App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
        recalc();
      }
    });
    return modal;
  }

  function deleteJournal(id) {
    const entry = Store.data.journal.find((e) => e.id === id);
    if (!entry) return;
    if (entry.sourceType !== 'manual') { UI.toast('لا يمكن حذف قيد مرتبط بمستند — استخدم مستنداً عكسياً', 'error'); return; }
    UI.confirm({
      title: 'حذف القيد', message: `هل تريد حذف القيد <strong>${U.esc(entry.number)}</strong> — ${U.esc(entry.description)}؟ سيُحذف من جميع التقارير.`,
      danger: true, confirmText: 'حذف القيد', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.remove('journal', id);
      Store.audit('حذف قيد يدوي', `${entry.number} — ${entry.description}`, 'trash');
      Store.save();
      UI.toast('تم حذف القيد', 'success');
      App.refresh();
    });
  }

  /* ---------- Ledger ---------- */
  function ledgerAccountOptions(selected) {
    return Store.data.accounts.slice().sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .map((a) => `<option value="${a.id}" ${String(a.id) === String(selected) ? 'selected' : ''}>${U.esc(a.code)} — ${U.esc(a.name)}${a.isGroup ? ' (رئيسي)' : ''}</option>`).join('');
  }

  function ledgerContent() {
    if (!Store.account(state.ledgerAccount)) state.ledgerAccount = A.ACC.cash;
    const data = A.ledger(state.ledgerAccount, state.from, state.to);
    const rows = data.rows.slice(0, 500).map((r) => `<tr>
      <td class="nowrap">${U.formatDate(r.date)}</td>
      <td><span class="code">${U.esc(r.number)}</span></td>
      <td><div class="cell-main">${U.esc(r.description)}</div><div class="cell-sub">${U.esc(r.memo || r.accountName)}</div></td>
      <td class="num">${r.debit ? U.money(r.debit) : '—'}</td>
      <td class="num">${r.credit ? U.money(r.credit) : '—'}</td>
      <td class="num fw-800 ${r.balance < 0 ? 'text-success' : ''}">${U.money(Math.abs(r.balance))} <span class="text-muted text-xs">${r.balance >= 0 ? 'مدين' : 'دائن'}</span></td>
    </tr>`).join('') || PK.emptyRow(6, 'bookOpen', 'لا توجد حركات على الحساب', 'جرّب تغيير الفترة أو اختيار حساب آخر');
    return `${rangeToolbar(`<select class="select" data-ledger-account style="min-width:250px">${ledgerAccountOptions(state.ledgerAccount)}</select>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('bookOpen', 18)} دفتر الأستاذ — ${U.esc(data.account ? data.account.name : '')}</div><div class="card-sub">${U.esc(data.account ? data.account.code : '')} • ${U.formatDate(state.from)} — ${U.formatDate(state.to)}</div></div>
          <span class="badge ${data.closing >= 0 ? 'badge-green' : 'badge-blue'}">الرصيد الختامي ${U.money(Math.abs(data.closing))} ${data.closing >= 0 ? 'مدين' : 'دائن'}</span></div>
        <div class="summary-strip" style="margin:14px 16px 0">
          <div><div class="ss-lbl">الرصيد الافتتاحي</div><div class="ss-val">${U.money(Math.abs(data.opening))} <small class="text-muted text-xs">${data.opening >= 0 ? 'مدين' : 'دائن'}</small></div></div>
          <div><div class="ss-lbl">إجمالي المدين</div><div class="ss-val text-success">${U.money(U.sum(data.rows, (r) => r.debit))}</div></div>
          <div><div class="ss-lbl">إجمالي الدائن</div><div class="ss-val text-danger">${U.money(U.sum(data.rows, (r) => r.credit))}</div></div>
        </div>
        <div class="table-wrap mt-2"><table class="table">
          <thead><tr><th>التاريخ</th><th>المستند</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
          <tbody>
            <tr style="background:var(--card-2)"><td colspan="5" class="fw-700">رصيد افتتاحي</td><td class="num fw-800">${U.money(Math.abs(data.opening))}</td></tr>
            ${rows}
          </tbody>
          <tfoot><tr><td colspan="5">الرصيد الختامي</td><td class="num">${U.money(Math.abs(data.closing))} ${data.closing >= 0 ? 'مدين' : 'دائن'}</td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">${U.num(data.rows.length, 0)} حركة — تُعرض أحدث 500</span>
          <span class="text-muted text-xs">الرصيد الطبيعي للحساب: <b>${data.account && (data.account.type === 'asset' || data.account.type === 'expense') ? 'مدين' : 'دائن'}</b></span></div>
      </div>`;
  }

  /* ---------- Trial balance ---------- */
  function trialContent() {
    const tb = A.trialBalance(state.from, state.to);
    const diff = U.round2(tb.totals.debitBalance - tb.totals.creditBalance);
    const rows = tb.rows.map((r) => `<tr>
      <td><span class="code">${U.esc(r.code)}</span></td>
      <td><div class="cell-main">${U.esc(r.name)}</div><div class="cell-sub">${TYPE_LABEL[r.type] || r.type}</div></td>
      <td class="num">${r.debit ? U.money(r.debit) : '—'}</td>
      <td class="num">${r.credit ? U.money(r.credit) : '—'}</td>
      <td class="num ${r.debitBalance ? 'fw-800' : 'text-muted'}">${r.debitBalance ? U.money(r.debitBalance) : '—'}</td>
      <td class="num ${r.creditBalance ? 'fw-800' : 'text-muted'}">${r.creditBalance ? U.money(r.creditBalance) : '—'}</td>
    </tr>`).join('') || PK.emptyRow(6, 'scale', 'لا توجد حركات في الفترة', 'غيّر الفترة أو سجّل قيوداً');
    return `${rangeToolbar('')}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('scale', 18)} ميزان المراجعة</div><div class="card-sub">${U.formatDate(state.from)} — ${U.formatDate(state.to)} • ${tb.rows.length} حساب</div></div>
          <span class="badge ${Math.abs(diff) < 0.01 ? 'badge-green' : 'badge-red'}">${Math.abs(diff) < 0.01 ? 'متوازن' : 'فرق ' + U.money(Math.abs(diff))}</span></div>
        <div class="vat-cards" style="padding:16px 16px 0">
          <div class="vat-card"><div class="v-lbl">إجمالي الحركة المدينة</div><div class="v-val">${U.money(tb.totals.debit)}</div></div>
          <div class="vat-card"><div class="v-lbl">إجمالي الحركة الدائنة</div><div class="v-val">${U.money(tb.totals.credit)}</div></div>
          <div class="vat-card highlight"><div class="v-lbl">أرصدة مدينة / دائنة</div><div class="v-val">${U.money(tb.totals.debitBalance)} / ${U.money(tb.totals.creditBalance)}</div></div>
        </div>
        <div class="table-wrap mt-2"><table class="table">
          <thead><tr><th>الحساب</th><th>الاسم</th><th>حركة مدين</th><th>حركة دائن</th><th>رصيد مدين</th><th>رصيد دائن</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">الإجمالي</td><td class="num">${U.money(tb.totals.debit)}</td><td class="num">${U.money(tb.totals.credit)}</td><td class="num">${U.money(tb.totals.debitBalance)}</td><td class="num">${U.money(tb.totals.creditBalance)}</td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">${Math.abs(diff) < 0.01 ? 'القيود متوازنة — لا توجد فروقات' : 'يوجد فرق في الأرصدة يحتاج مراجعة'}</span>
          <span class="text-muted text-xs">إجمالي القيود: ${U.num(Store.data.journal.length, 0)}</span></div>
      </div>`;
  }

  /* ---------- Income statement ---------- */
  function finRow(name, value, cls, prev) {
    const prevText = prev === undefined ? '' : ` <span class="text-muted text-xs">(سابقاً ${U.money(prev)})</span>`;
    return `<div class="fin-row ${cls || ''}"><span class="fr-name">${name}${prevText}</span><span class="fr-val">${U.money(value)}</span></div>`;
  }

  function incomeContent() {
    const days = U.daysBetween(state.from, state.to) + 1;
    const prevTo = U.addDays(state.from, -1);
    const prevFrom = U.addDays(prevTo, -(Math.max(1, days) - 1));
    const cur = A.incomeStatement(state.from, state.to);
    const prev = A.incomeStatement(prevFrom, prevTo);
    const revenueRows = cur.revenue.map((r) => finRow(U.esc(r.account.name), r.amount, r.amount < 0 ? 'negative' : '', (prev.revenue.find((p) => p.account.id === r.account.id) || {}).amount || 0)).join('');
    const expenseRows = cur.operating.map((r) => finRow(U.esc(r.account.name), r.amount, '', (prev.operating.find((p) => p.account.id === r.account.id) || {}).amount || 0)).join('');
    return `${rangeToolbar('')}
      <div class="report-kpis">
        <div class="report-kpi"><div class="rk-lbl">إجمالي الإيرادات</div><div class="rk-val">${U.money(cur.totalRevenue)}</div><div class="rk-sub ${pctChange(cur.totalRevenue, prev.totalRevenue) >= 0 ? 'text-success' : 'text-danger'}">${PK.delta(pctChange(cur.totalRevenue, prev.totalRevenue))} عن الفترة السابقة</div></div>
        <div class="report-kpi"><div class="rk-lbl">إجمالي الربح</div><div class="rk-val">${U.money(cur.grossProfit)}</div><div class="rk-sub">هامش إجمالي ${U.pct(cur.grossMargin)}</div></div>
        <div class="report-kpi"><div class="rk-lbl">صافي الربح</div><div class="rk-val ${cur.netProfit < 0 ? 'text-danger' : ''}">${U.money(cur.netProfit)}</div><div class="rk-sub ${pctChange(cur.netProfit, prev.netProfit) >= 0 ? 'text-success' : 'text-danger'}">${PK.delta(pctChange(cur.netProfit, prev.netProfit))} عن الفترة السابقة</div></div>
        <div class="report-kpi"><div class="rk-lbl">هامش الربح الصافي</div><div class="rk-val">${U.pct(cur.margin)}</div><div class="rk-sub">تكلفة المبيعات ${U.money(cur.cogs)}</div></div>
      </div>
      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('trendingUp', 18)} قائمة الدخل</div><div class="card-sub">${U.formatDate(state.from)} — ${U.formatDate(state.to)} • مقارنة مع ${U.formatDate(prevFrom)} — ${U.formatDate(prevTo)}</div></div>
          <span class="badge badge-green">${U.num(days, 0)} يوم</span></div>
        <div class="card-body"><div class="fin-statement">
          <div class="fin-section"><div class="fin-section-title">الإيرادات</div>
            ${revenueRows || '<div class="fin-row"><span class="fr-name text-muted">لا توجد إيرادات</span><span class="fr-val">—</span></div>'}
            ${finRow('إجمالي الإيرادات', cur.totalRevenue, 'total')}
          </div>
          <div class="fin-section"><div class="fin-section-title">تكلفة المبيعات</div>
            ${finRow('تكلفة البضاعة المباعة', cur.cogs, 'negative')}
            ${finRow('إجمالي الربح', cur.grossProfit, 'total')}
          </div>
          <div class="fin-section"><div class="fin-section-title">المصروفات التشغيلية</div>
            ${expenseRows || '<div class="fin-row"><span class="fr-name text-muted">لا توجد مصروفات تشغيلية</span><span class="fr-val">—</span></div>'}
            ${finRow('إجمالي المصروفات التشغيلية', cur.totalExpenses, 'total')}
          </div>
          <div class="fin-row grand"><span class="fr-name">صافي الربح / (الخسارة)</span><span class="fr-val ${cur.netProfit < 0 ? 'text-danger' : ''}">${U.money(cur.netProfit)}</span></div>
          <div class="metric-inline mt-3">
            <div class="mi"><div class="mi-lbl">هامش الربح الإجمالي</div><div class="mi-val">${U.pct(cur.grossMargin)}</div></div>
            <div class="mi"><div class="mi-lbl">هامش الربح الصافي</div><div class="mi-val">${U.pct(cur.margin)}</div></div>
            <div class="mi"><div class="mi-lbl">مقارنة صافي الربح</div><div class="mi-val">${PK.delta(pctChange(cur.netProfit, prev.netProfit))}</div></div>
          </div>
        </div></div>
      </div>`;
  }

  /* ---------- Balance sheet ---------- */
  function bsSection(title, rows, totalLabel, total, tone) {
    return `<div class="fin-section">
      <div class="fin-section-title">${U.esc(title)}</div>
      ${rows.map((r) => `<div class="fin-row"><span class="fr-name">${U.esc(r.account.name)} <span class="text-muted text-xs">${U.esc(r.account.code)}</span></span><span class="fr-val">${U.money(r.display)}</span></div>`).join('') || '<div class="fin-row"><span class="fr-name text-muted">لا توجد أرصدة</span><span class="fr-val">—</span></div>'}
      <div class="fin-row total ${tone || ''}"><span class="fr-name">${U.esc(totalLabel)}</span><span class="fr-val">${U.money(total)}</span></div>
    </div>`;
  }

  function balanceContent() {
    const bs = A.balanceSheet(state.asOf);
    const diff = bs.difference;
    return `<div class="toolbar" style="border:1px solid var(--line);border-radius:12px;margin-bottom:16px">
        <label class="text-xs text-muted">كما في تاريخ</label>
        <input class="input" type="date" data-asof value="${state.asOf}" style="width:auto" />
        <button class="btn btn-secondary btn-sm" data-apply-asof>${U.icon('refresh', 14)} تحديث</button>
        <div class="toolbar-spacer"></div>
        <span class="badge ${Math.abs(diff) < 0.01 ? 'badge-green' : 'badge-red'}">${Math.abs(diff) < 0.01 ? 'الميزانية متوازنة' : 'فرق ' + U.money(Math.abs(diff))}</span>
      </div>
      <div class="vat-cards mb-3">
        <div class="vat-card"><div class="v-lbl">إجمالي الأصول</div><div class="v-val text-success">${U.money(bs.totalAssets)}</div></div>
        <div class="vat-card"><div class="v-lbl">إجمالي الالتزامات</div><div class="v-val text-danger">${U.money(bs.totalLiabilities)}</div></div>
        <div class="vat-card highlight"><div class="v-lbl">حقوق الملكية + أرباح الفترة</div><div class="v-val">${U.money(bs.totalEquity + bs.currentEarnings)}</div></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('bank', 18)} الميزانية العمومية</div><div class="card-sub">كما في ${U.formatDate(state.asOf, 'full')}</div></div>
          <span class="badge badge-${Math.abs(diff) < 0.01 ? 'green' : 'red'}">${Math.abs(diff) < 0.01 ? 'متوازنة' : 'تحتاج مراجعة'}</span></div>
        <div class="card-body"><div class="fin-cols">
          <div>
            ${bsSection('الأصول', bs.assets, 'إجمالي الأصول', bs.totalAssets)}
          </div>
          <div>
            ${bsSection('الالتزامات', bs.liabilities, 'إجمالي الالتزامات', bs.totalLiabilities)}
            ${bsSection('حقوق الملكية', bs.equity, 'إجمالي حقوق الملكية', bs.totalEquity, '')}
            ${finRow('أرباح الفترة الحالية', bs.currentEarnings, 'sub')}
            <div class="fin-row grand"><span class="fr-name">إجمالي الالتزامات وحقوق الملكية</span><span class="fr-val">${U.money(bs.totalLiabilitiesEquity)}</span></div>
          </div>
        </div></div>
        <div class="card-foot"><span class="text-muted text-xs">المعادلة: الأصول = الالتزامات + حقوق الملكية + أرباح الفترة</span>
          <span class="text-muted text-xs ${Math.abs(diff) < 0.01 ? 'text-success' : 'text-danger'}">${Math.abs(diff) < 0.01 ? 'المعادلة متطابقة' : 'فرق ' + U.money(Math.abs(diff))}</span></div>
      </div>`;
  }

  /* ---------- VAT ---------- */
  function vatContent() {
    const v = A.vatReport(state.from, state.to);
    return `${rangeToolbar('')}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('percent', 18)} الإقرار الضريبي — ضريبة القيمة المضافة</div><div class="card-sub">${U.formatDate(state.from)} — ${U.formatDate(state.to)} • ${U.num(v.salesCount, 0)} فاتورة بيع • ${U.num(v.purchasesCount, 0)} فاتورة شراء</div></div>
          <span class="badge badge-blue">${U.num(Store.data.settings.vatRate, 0)}%</span></div>
        <div class="vat-cards" style="padding:16px 16px 0">
          <div class="vat-card"><div class="v-lbl">ضريبة المخرجات (مبيعات)</div><div class="v-val text-success">${U.money(v.output)}</div></div>
          <div class="vat-card"><div class="v-lbl">ضريبة المدخلات (مشتريات)</div><div class="v-val text-info">${U.money(v.input)}</div></div>
          <div class="vat-card highlight"><div class="v-lbl">${v.net >= 0 ? 'صافي الضريبة المستحقة' : 'رصيد ضريبي لصالح المنشأة'}</div><div class="v-val">${U.money(Math.abs(v.net))}</div></div>
        </div>
        <div class="card-body"><div class="fin-statement">
          <div class="fin-section"><div class="fin-section-title">المبيعات الخاضعة للضريبة</div>
            ${finRow('إجمالي المبيعات قبل الضريبة (بعد المرتجعات والخصومات)', v.salesBase)}
            ${finRow('ضريبة المخرجات', v.output)}
            ${finRow('ضريبة المبيعات المحتسبة من الفواتير', v.salesTax, 'sub')}
          </div>
          <div class="fin-section"><div class="fin-section-title">المشتريات الخاضعة للضريبة</div>
            ${finRow('إجمالي المشتريات قبل الضريبة (بعد المرتجعات)', v.purchasesBase)}
            ${finRow('ضريبة المدخلات', v.input)}
            ${finRow('ضريبة المشتريات المحتسبة من الفواتير', v.purchasesTax, 'sub')}
          </div>
          <div class="fin-row grand"><span class="fr-name">${v.net >= 0 ? 'صافي الضريبة المستحقة السداد' : 'رصيد ضريبي قابل للاسترداد'}</span><span class="fr-val">${U.money(Math.abs(v.net))}</span></div>
          <div class="info-banner ${v.net >= 0 ? 'warn' : 'success'} mt-2">${U.icon('info', 17)}<div>يُحتسب الإقرار من أرصدة حسابات ضريبة المخرجات والمدخلات في دفتر الأستاذ. راجع الفواتير قبل التقديم.</div></div>
        </div></div>
        <div class="card-foot"><span class="text-muted text-xs">الرقم الضريبي للمنشأة: <b>${U.esc(Store.data.settings.taxNumber)}</b></span>
          <span class="text-muted text-xs">صافي المعاملات: <b>${U.money(v.salesBase - v.purchasesBase)}</b></span></div>
      </div>`;
  }

  function content() {
    switch (state.tab) {
      case 'journals': return journalsContent();
      case 'ledger': return ledgerContent();
      case 'trial': return trialContent();
      case 'income': return incomeContent();
      case 'balance': return balanceContent();
      case 'vat': return vatContent();
      default: return coaContent();
    }
  }

  /* ---------- Export / print ---------- */
  function exportCurrent() {
    if (state.tab === 'coa') {
      PK.exportCSV('chart-of-accounts-' + U.today() + '.csv', ['الرقم', 'الاسم', 'النوع', 'رئيسي', 'الحساب الأب', 'الرصيد'],
        Store.data.accounts.map((a) => [a.code, a.name, TYPE_LABEL[a.type] || a.type, a.isGroup ? 'نعم' : 'لا', a.parent || '', A.accountBalance(a.id)]));
      return;
    }
    if (state.tab === 'journals') {
      const list = filteredJournals();
      PK.exportCSV('journal-entries-' + U.today() + '.csv', ['الرقم', 'التاريخ', 'البيان', 'المصدر', 'المستند', 'مدين', 'دائن', 'المستخدم'],
        list.map((e) => [e.number, e.date, e.description, sourceLabel(e.sourceType), e.sourceNumber || '',
          U.sum(e.lines, (l) => l.debit), U.sum(e.lines, (l) => l.credit), e.createdBy || '']));
      return;
    }
    if (state.tab === 'ledger') {
      const data = A.ledger(state.ledgerAccount, state.from, state.to);
      PK.exportCSV('ledger-' + data.account.code + '-' + U.today() + '.csv', ['التاريخ', 'المستند', 'البيان', 'مدين', 'دائن', 'الرصيد'],
        data.rows.map((r) => [r.date, r.number, r.description, r.debit, r.credit, r.balance]));
      return;
    }
    if (state.tab === 'trial') {
      const tb = A.trialBalance(state.from, state.to);
      PK.exportCSV('trial-balance-' + U.today() + '.csv', ['الرقم', 'الحساب', 'النوع', 'حركة مدين', 'حركة دائن', 'رصيد مدين', 'رصيد دائن'],
        tb.rows.map((r) => [r.code, r.name, TYPE_LABEL[r.type] || r.type, r.debit, r.credit, r.debitBalance, r.creditBalance]));
      return;
    }
    if (state.tab === 'income') {
      const inc = A.incomeStatement(state.from, state.to);
      const rows = [
        ...inc.revenue.map((r) => [r.account.code, r.account.name, 'إيراد', r.amount]),
        ['', 'إجمالي الإيرادات', '', inc.totalRevenue],
        ['', 'تكلفة المبيعات', 'مصروف', inc.cogs],
        ['', 'إجمالي الربح', '', inc.grossProfit],
        ...inc.operating.map((r) => [r.account.code, r.account.name, 'مصروف تشغيلي', r.amount]),
        ['', 'صافي الربح', '', inc.netProfit]
      ];
      PK.exportCSV('income-statement-' + U.today() + '.csv', ['الرقم', 'البيان', 'التصنيف', 'المبلغ'], rows);
      return;
    }
    if (state.tab === 'balance') {
      const bs = A.balanceSheet(state.asOf);
      const rows = [
        ...bs.assets.map((r) => ['أصول', r.account.code, r.account.name, r.display]),
        ['', '', 'إجمالي الأصول', bs.totalAssets],
        ...bs.liabilities.map((r) => ['التزامات', r.account.code, r.account.name, r.display]),
        ['', '', 'إجمالي الالتزامات', bs.totalLiabilities],
        ...bs.equity.map((r) => ['حقوق ملكية', r.account.code, r.account.name, r.display]),
        ['', '', 'أرباح الفترة', bs.currentEarnings],
        ['', '', 'إجمالي الالتزامات وحقوق الملكية', bs.totalLiabilitiesEquity]
      ];
      PK.exportCSV('balance-sheet-' + U.today() + '.csv', ['التصنيف', 'الرقم', 'الحساب', 'المبلغ'], rows);
      return;
    }
    if (state.tab === 'vat') {
      const v = A.vatReport(state.from, state.to);
      PK.exportCSV('vat-return-' + U.today() + '.csv', ['البيان', 'المبلغ'],
        [['المبيعات الخاضعة', v.salesBase], ['ضريبة المخرجات', v.output], ['المشتريات الخاضعة', v.purchasesBase],
          ['ضريبة المدخلات', v.input], ['صافي الضريبة', v.net]]);
    }
  }

  function printCurrent() {
    if (state.tab === 'coa') {
      PK.printReport({
        title: 'دليل الحسابات', subtitle: `${Store.data.accounts.length} حساب • حتى ${U.formatDate(U.today(), 'full')}`,
        headers: ['الرقم', 'اسم الحساب', 'النوع', 'رئيسي', 'الرصيد'],
        rows: Store.data.accounts.slice().sort((a, b) => String(a.code).localeCompare(String(b.code)))
          .map((a) => [U.esc(a.code), U.esc(a.name), TYPE_LABEL[a.type] || a.type, a.isGroup ? 'نعم' : 'لا', U.money(A.accountBalance(a.id))])
      });
      return;
    }
    if (state.tab === 'journals') {
      const list = filteredJournals();
      PK.printReport({
        title: 'دفتر اليومية', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)} • ${list.length} قيد`,
        headers: ['الرقم', 'التاريخ', 'البيان', 'المصدر', 'مدين', 'دائن'],
        rows: list.map((e) => [U.esc(e.number), U.formatDate(e.date), U.esc(e.description), sourceLabel(e.sourceType),
          U.money(U.sum(e.lines, (l) => l.debit)), U.money(U.sum(e.lines, (l) => l.credit))]),
        totals: [{ label: 'إجمالي المدين', value: U.money(U.sum(list, (e) => U.sum(e.lines, (l) => l.debit))) },
          { label: 'إجمالي الدائن', value: U.money(U.sum(list, (e) => U.sum(e.lines, (l) => l.credit))), grand: true }]
      });
      return;
    }
    if (state.tab === 'ledger') {
      const data = A.ledger(state.ledgerAccount, state.from, state.to);
      PK.printReport({
        title: 'دفتر الأستاذ — ' + (data.account ? data.account.name : ''), subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)} • رصيد افتتاحي ${U.money(data.opening)}`,
        headers: ['التاريخ', 'المستند', 'البيان', 'مدين', 'دائن', 'الرصيد'],
        rows: data.rows.map((r) => [U.formatDate(r.date), U.esc(r.number), U.esc(r.description), r.debit ? U.money(r.debit) : '—',
          r.credit ? U.money(r.credit) : '—', U.money(Math.abs(r.balance)) + (r.balance >= 0 ? ' مدين' : ' دائن')]),
        totals: [{ label: 'الرصيد الختامي', value: U.money(Math.abs(data.closing)) + (data.closing >= 0 ? ' مدين' : ' دائن'), grand: true }]
      });
      return;
    }
    if (state.tab === 'trial') {
      const tb = A.trialBalance(state.from, state.to);
      PK.printReport({
        title: 'ميزان المراجعة', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`,
        headers: ['الرقم', 'الحساب', 'حركة مدين', 'حركة دائن', 'رصيد مدين', 'رصيد دائن'],
        rows: tb.rows.map((r) => [U.esc(r.code), U.esc(r.name), U.money(r.debit), U.money(r.credit), U.money(r.debitBalance), U.money(r.creditBalance)]),
        totals: [{ label: 'الإجمالي', value: U.money(tb.totals.debitBalance) + ' / ' + U.money(tb.totals.creditBalance), grand: true }]
      });
      return;
    }
    if (state.tab === 'income') {
      const inc = A.incomeStatement(state.from, state.to);
      const rows = [
        ...inc.revenue.map((r) => ['', U.esc(r.account.name), U.money(r.amount)]),
        ['', 'إجمالي الإيرادات', U.money(inc.totalRevenue)],
        ['', 'تكلفة المبيعات', U.money(inc.cogs)],
        ['', 'إجمالي الربح', U.money(inc.grossProfit)],
        ...inc.operating.map((r) => ['', U.esc(r.account.name), U.money(r.amount)]),
        ['', 'إجمالي المصروفات التشغيلية', U.money(inc.totalExpenses)],
        ['', 'صافي الربح', U.money(inc.netProfit)]
      ];
      PK.printReport({ title: 'قائمة الدخل', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`, headers: ['الرقم', 'البيان', 'المبلغ'], rows });
      return;
    }
    if (state.tab === 'balance') {
      const bs = A.balanceSheet(state.asOf);
      const rows = [
        ...bs.assets.map((r) => ['أصول', U.esc(r.account.name), U.money(r.display)]),
        ['', 'إجمالي الأصول', U.money(bs.totalAssets)],
        ...bs.liabilities.map((r) => ['التزامات', U.esc(r.account.name), U.money(r.display)]),
        ['', 'إجمالي الالتزامات', U.money(bs.totalLiabilities)],
        ...bs.equity.map((r) => ['حقوق ملكية', U.esc(r.account.name), U.money(r.display)]),
        ['', 'أرباح الفترة', U.money(bs.currentEarnings)],
        ['', 'إجمالي الالتزامات وحقوق الملكية', U.money(bs.totalLiabilitiesEquity)]
      ];
      PK.printReport({ title: 'الميزانية العمومية', subtitle: 'كما في ' + U.formatDate(state.asOf, 'full'), headers: ['التصنيف', 'الحساب', 'المبلغ'], rows });
      return;
    }
    if (state.tab === 'vat') {
      const v = A.vatReport(state.from, state.to);
      PK.printReport({
        title: 'الإقرار الضريبي — ضريبة القيمة المضافة', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`,
        headers: ['البيان', 'المبلغ'],
        rows: [['المبيعات الخاضعة للضريبة', U.money(v.salesBase)], ['ضريبة المخرجات', U.money(v.output)],
          ['المشتريات الخاضعة للضريبة', U.money(v.purchasesBase)], ['ضريبة المدخلات', U.money(v.input)],
          [v.net >= 0 ? 'صافي الضريبة المستحقة' : 'رصيد ضريبي قابل للاسترداد', U.money(Math.abs(v.net))]],
        totals: [{ label: 'صافي الضريبة', value: U.money(Math.abs(v.net)), grand: true }]
      });
    }
  }

  /* ---------- Render ---------- */
  Pages.accounting = {
    title: 'المحاسبة', icon: 'book', perm: 'accounting',
    render(view) {
      viewRef = view;
      view.innerHTML = `${headerHtml()}${kpiHtml()}
        <div class="card mt-3">
          ${tabsHtml()}
          <div class="card-body" style="padding:0">${content()}</div>
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab;
        Pages.accounting.render(view);
      }));

      const range = view.querySelector('[data-range]');
      if (range) PK.bindRange(range, (from, to) => {
        state.from = from; state.to = to;
        Pages.accounting.render(view);
      });

      const coaQ = view.querySelector('[data-coa-q]');
      if (coaQ) coaQ.addEventListener('input', U.debounce(() => {
        state.coaQ = coaQ.value;
        Pages.accounting.render(view);
      }, 150));

      const jq = view.querySelector('[data-journal-q]');
      if (jq) jq.addEventListener('input', U.debounce(() => {
        state.journalQ = jq.value;
        Pages.accounting.render(view);
      }, 150));
      const js = view.querySelector('[data-journal-source]');
      if (js) js.addEventListener('change', () => { state.journalSource = js.value; Pages.accounting.render(view); });

      const la = view.querySelector('[data-ledger-account]');
      if (la) la.addEventListener('change', () => { state.ledgerAccount = la.value; Pages.accounting.render(view); });

      const asof = view.querySelector('[data-asof]');
      if (asof) asof.addEventListener('change', () => { state.asOf = asof.value || U.today(); Pages.accounting.render(view); });

      view.onclick = (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) return;
        if (e.target.closest('[data-new-journal]')) { openJournalForm(); return; }
        if (e.target.closest('[data-new-account]')) { openAccountForm(); return; }
        if (e.target.closest('[data-apply-asof]')) { Pages.accounting.render(view); return; }
        if (e.target.closest('[data-export]')) { exportCurrent(); return; }
        if (e.target.closest('[data-print]')) { printCurrent(); return; }
        const add = e.target.closest('[data-account-add]');
        if (add) { openAccountForm(null, add.dataset.accountAdd); return; }
        const edit = e.target.closest('[data-account-edit]');
        if (edit) { openAccountForm(edit.dataset.accountEdit); return; }
        const ledger = e.target.closest('[data-account-ledger]');
        if (ledger) {
          state.ledgerAccount = ledger.dataset.accountLedger;
          state.tab = 'ledger';
          Pages.accounting.render(view);
          return;
        }
        const del = e.target.closest('[data-account-del]');
        if (del) { deleteAccount(del.dataset.accountDel); return; }
        const journal = e.target.closest('[data-journal]');
        if (journal) { Actions.openJournal(journal.dataset.journal); return; }
        const journalDel = e.target.closest('[data-journal-del]');
        if (journalDel) { deleteJournal(journalDel.dataset.journalDel); return; }
      };
    }
  };
})();
