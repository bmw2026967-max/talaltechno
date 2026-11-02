/* ==========================================================================
   Page — Treasury, expenses, receipts, payments, transfers & daily close
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const A = Accounting;
  const state = {
    tab: 'overview',
    from: U.startOfMonth(U.today()),
    to: U.today(),
    expQ: '', expAccount: 'all', expMethod: 'all',
    recQ: '', payQ: '', trfQ: '',
    closeDate: U.today()
  };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  const COLORS = ['#0e5a44', '#2563a8', '#a97c28', '#6d4fa3', '#b13a33', '#0f766e', '#7c5c2e', '#c26a3d'];

  const methodLabel = (m) => ({ cash: 'نقدي', card: 'شبكة', bank: 'بنكي', wallet: 'محفظة' }[m] || m || '—');

  function rangeToolbar(extra) {
    return `<div data-range>${PK.rangeInputs(state.from, state.to, extra)}</div>`;
  }

  function headerHtml() {
    return `<div class="page-head">
      <div><div class="page-title">الخزينة والمصروفات</div><div class="page-sub">إدارة الصندوق والبنك والمصروفات والتحصيلات والمدفوعات والإغلاق اليومي</div></div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" data-new-expense>${U.icon('wallet', 14)} مصروف</button>
        <button class="btn btn-secondary btn-sm" data-new-receipt>${U.icon('download', 14)} سند قبض</button>
        <button class="btn btn-secondary btn-sm" data-new-payment>${U.icon('upload', 14)} سند صرف</button>
        <button class="btn btn-primary" data-new-transfer>${U.icon('refresh', 16)} تحويل</button>
      </div>
    </div>`;
  }

  function kpiHtml() {
    const cash = A.cashBalance();
    const bank = A.bankBalance();
    const from = U.startOfMonth(U.today()), to = U.today();
    const receipts = Store.data.payments.filter((p) => p.type === 'receipt' && U.inRange(p.date, from, to));
    const pays = Store.data.payments.filter((p) => p.type === 'payment' && U.inRange(p.date, from, to));
    const expenses = A.expenses(from, to);
    const receiptTotal = U.sum(receipts, (p) => p.amount);
    const outTotal = U.sum(pays, (p) => p.amount) + U.sum(expenses, (e) => e.total);
    return `<div class="kpi-grid">
      ${PK.kpi({ label: 'نقدية الصندوق', value: U.money(cash), icon: 'cash', tone: 'green', sub: `<b>${Store.data.expenses.filter((e) => e.method === 'cash' && U.inRange(e.date, from, to)).length}</b> مصروف نقدي هذا الشهر` })}
      ${PK.kpi({ label: 'رصيد البنك', value: U.money(bank), icon: 'bank', tone: 'blue', sub: `تحصيلات شبكة وبنك <b>${U.moneyShort(U.sum(receipts.filter((p) => p.method !== 'cash'), (p) => p.amount))}</b>` })}
      ${PK.kpi({ label: 'تحصيلات الشهر', value: U.money(receiptTotal), icon: 'download', tone: 'gold', sub: `<b>${receipts.length}</b> سند قبض` })}
      ${PK.kpi({ label: 'مدفوعات ومصروفات الشهر', value: U.money(outTotal), icon: 'upload', tone: 'red', sub: `صافي التدفق <b class="${receiptTotal - outTotal >= 0 ? 'text-success' : 'text-danger'}">${U.moneyShort(receiptTotal - outTotal)}</b>` })}
    </div>`;
  }

  function tabsHtml() {
    const tabs = [
      ['overview', 'نظرة عامة', 'wallet', null],
      ['expenses', 'المصروفات', 'receipt', Store.data.expenses.length],
      ['receipts', 'سندات القبض', 'download', Store.data.payments.filter((p) => p.type === 'receipt').length],
      ['payments', 'سندات الصرف', 'upload', Store.data.payments.filter((p) => p.type === 'payment').length],
      ['transfers', 'التحويلات', 'refresh', Store.data.transfers.length],
      ['close', 'الإغلاق اليومي', 'clock', null]
    ];
    return `<div class="tabs">${tabs.map(([id, label, icon, count]) =>
      `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}${count !== null ? `<span class="count">${U.num(count, 0)}</span>` : ''}</button>`).join('')}</div>`;
  }

  /* ---------- Shared data ---------- */
  function filteredExpenses() {
    let list = A.expenses(state.from, state.to);
    if (state.expAccount !== 'all') list = list.filter((e) => e.accountId === state.expAccount);
    if (state.expMethod !== 'all') list = list.filter((e) => e.method === state.expMethod);
    const q = norm(state.expQ);
    if (q) list = list.filter((e) => norm(e.number).includes(q) || norm(e.description).includes(q)
      || norm(e.accountName).includes(q) || norm(e.notes).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function filteredPayments(type) {
    const q = norm(type === 'receipt' ? state.recQ : state.payQ);
    let list = Store.data.payments.filter((p) => p.type === type && U.inRange(p.date, state.from, state.to));
    if (q) list = list.filter((p) => norm(p.number).includes(q) || norm(p.partyName).includes(q) || norm(p.notes).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function filteredTransfers() {
    let list = Store.data.transfers.filter((t) => U.inRange(t.date, state.from, state.to));
    const q = norm(state.trfQ);
    if (q) list = list.filter((t) => norm(t.number).includes(q) || norm(t.fromName).includes(q) || norm(t.toName).includes(q) || norm(t.notes).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  /* ---------- Overview ---------- */
  function overviewContent() {
    const expenses = A.expenses(state.from, state.to);
    const breakdown = A.expenseBreakdown(state.from, state.to);
    const donutItems = breakdown.slice(0, 7).map((r, i) => ({ label: r.name, value: r.total, color: COLORS[i % COLORS.length] }));
    const docs = [];
    expenses.forEach((e) => docs.push({
      id: e.id, kind: 'expense', number: e.number, date: e.date, createdAt: e.createdAt,
      title: e.description, sub: e.accountName, method: e.method, amount: -e.total, icon: 'wallet', tone: 'badge-gold', label: 'مصروف', journalId: e.journalId
    }));
    Store.data.payments.filter((p) => U.inRange(p.date, state.from, state.to)).forEach((p) => docs.push({
      id: p.id, kind: p.type, number: p.number, date: p.date, createdAt: p.createdAt,
      title: p.partyName, sub: p.type === 'receipt' ? 'تحصيل من عميل' : 'سداد لمورد', method: p.method,
      amount: p.type === 'receipt' ? p.amount : -p.amount, icon: p.type === 'receipt' ? 'download' : 'upload',
      tone: p.type === 'receipt' ? 'badge-green' : 'badge-red', label: p.type === 'receipt' ? 'سند قبض' : 'سند صرف', journalId: p.journalId
    }));
    Store.data.transfers.filter((t) => U.inRange(t.date, state.from, state.to)).forEach((t) => docs.push({
      id: t.id, kind: 'transfer', number: t.number, date: t.date, createdAt: t.createdAt,
      title: `تحويل ${t.fromName} ← ${t.toName}`, sub: t.notes || 'تحويل بين الحسابات', method: '',
      amount: t.amount, icon: 'refresh', tone: 'badge-blue', label: 'تحويل', journalId: t.journalId, neutral: true
    }));
    docs.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
    const recent = docs.slice(0, 12);
    const receipts = Store.data.payments.filter((p) => p.type === 'receipt' && U.inRange(p.date, state.from, state.to));
    const pays = Store.data.payments.filter((p) => p.type === 'payment' && U.inRange(p.date, state.from, state.to));
    const inflow = U.sum(receipts, (p) => p.amount);
    const outflow = U.sum(pays, (p) => p.amount) + U.sum(expenses, (e) => e.total);

    const rows = recent.map((d) => `<tr>
      <td><div class="product-cell"><div class="thumb sm">${U.icon(d.icon, 17)}</div><div><div class="cell-main">${U.esc(d.title)}</div><div class="cell-sub">${U.esc(d.sub)}</div></div></div></td>
      <td><span class="badge ${d.tone}">${U.esc(d.label)}</span><div class="cell-sub"><span class="code">${U.esc(d.number)}</span></div></td>
      <td class="nowrap"><div class="cell-main">${U.formatDate(d.date)}</div><div class="cell-sub">${U.formatTime(d.createdAt)}</div></td>
      <td>${d.method ? UI.methodBadge(d.method) : '<span class="text-muted">—</span>'}</td>
      <td class="num fw-800 ${d.amount < 0 ? 'text-danger' : 'text-success'}">${d.amount < 0 ? '-' : '+'}${U.money(Math.abs(d.amount))}</td>
      <td class="actions-cell"><div class="row-actions">
        ${d.journalId ? `<button class="btn-icon btn-ghost" data-journal="${d.journalId}" title="القيد">${U.icon('book', 15)}</button>` : ''}
        <button class="btn-icon btn-ghost" data-doc-view="${d.kind}" data-id="${d.id}" title="عرض">${U.icon('eye', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(6, 'wallet', 'لا توجد حركات خزينة', 'سجّل مصروفاً أو سنداً خلال الفترة');

    return `${rangeToolbar('')}
      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} أحدث حركات الخزينة</div><div class="card-sub">${U.formatDate(state.from)} — ${U.formatDate(state.to)}</div></div>
            <span class="badge badge-gray">${docs.length} حركة</span></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>البيان</th><th>النوع</th><th>التاريخ</th><th>الطريقة</th><th>المبلغ</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <div class="card-foot"><span class="text-muted text-xs">إجمالي الوارد: <b class="text-success">${U.money(inflow)}</b></span>
            <span class="text-muted text-xs">إجمالي الصادر: <b class="text-danger">${U.money(outflow)}</b></span></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('pie', 18)} توزيع المصروفات</div><div class="card-sub">${U.formatDate(state.from)} — ${U.formatDate(state.to)}</div></div></div>
            <div class="card-body">${UI.donut(donutItems, 'إجمالي المصروفات', U.moneyShort(U.sum(expenses, (e) => e.total)))}</div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('cash', 18)} أرصدة الخزينة</div></div></div>
            <div class="card-body">
              <div class="branch-row" style="margin-bottom:10px"><div class="thumb">${U.icon('cash', 19)}</div><div class="br-main"><strong>الصندوق — النقدية</strong><span>متاح للسداد والتحصيل النقدي</span></div><div class="fw-800" style="direction:ltr">${U.money(A.cashBalance())}</div></div>
              <div class="branch-row" style="margin-bottom:0"><div class="thumb">${U.icon('bank', 19)}</div><div class="br-main"><strong>الحساب البنكي</strong><span>شبكة، تحويلات ومدفوعات بنكية</span></div><div class="fw-800" style="direction:ltr">${U.money(A.bankBalance())}</div></div>
              <div class="summary-strip mt-3">
                <div><div class="ss-lbl">تحصيلات</div><div class="ss-val text-success">${U.moneyShort(inflow)}</div></div>
                <div><div class="ss-lbl">مدفوعات</div><div class="ss-val text-danger">${U.moneyShort(outflow)}</div></div>
                <div><div class="ss-lbl">الصافي</div><div class="ss-val ${inflow - outflow >= 0 ? 'text-success' : 'text-danger'}">${U.moneyShort(inflow - outflow)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Expenses ---------- */
  function expensesContent() {
    const list = filteredExpenses();
    const accounts = Store.data.accounts.filter((a) => !a.isGroup && a.type === 'expense' && a.id !== A.ACC.cogs);
    const rows = list.map((e) => `<tr>
      <td><div class="cell-main"><span class="code">${U.esc(e.number)}</span></div><div class="cell-sub">${U.formatDate(e.date)} • ${U.formatTime(e.createdAt)}</div></td>
      <td><div class="cell-main">${U.esc(e.description)}</div><div class="cell-sub">${U.esc(e.accountName)}${e.notes ? ' • ' + U.esc(e.notes) : ''}</div></td>
      <td class="num">${U.money(e.amount)}</td>
      <td class="num text-muted">${U.money(e.tax)}</td>
      <td class="num fw-800">${U.money(e.total)}</td>
      <td>${UI.methodBadge(e.method)}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-expense-view="${e.id}" title="عرض">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-expense-print="${e.id}" title="طباعة السند">${U.icon('print', 15)}</button>
        ${e.journalId ? `<button class="btn-icon btn-ghost" data-journal="${e.journalId}" title="القيد">${U.icon('book', 15)}</button>` : ''}
      </div></td>
    </tr>`).join('') || PK.emptyRow(7, 'wallet', 'لا توجد مصروفات في الفترة', 'سجّل مصروفاً جديداً أو غيّر الفترة');
    return `${rangeToolbar(`<div class="searchbox">${U.icon('search', 15)}<input class="input" data-exp-q placeholder="ابحث برقم المصروف أو الوصف..." value="${U.esc(state.expQ)}" /></div>
        <select class="select" data-exp-account><option value="all">كل حسابات المصروفات</option>${accounts.map((a) => `<option value="${a.id}" ${state.expAccount === a.id ? 'selected' : ''}>${U.esc(a.name)}</option>`).join('')}</select>
        <select class="select" data-exp-method><option value="all" ${state.expMethod === 'all' ? 'selected' : ''}>كل طرق الدفع</option><option value="cash" ${state.expMethod === 'cash' ? 'selected' : ''}>نقدي</option><option value="bank" ${state.expMethod === 'bank' ? 'selected' : ''}>بنكي</option></select>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('wallet', 18)} المصروفات</div><div class="card-sub">${U.num(list.length, 0)} مصروف • إجمالي ${U.money(U.sum(list, (e) => e.total))}</div></div>
          <button class="btn btn-primary btn-sm" data-new-expense>${U.icon('plus', 14)} مصروف جديد</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المستند</th><th>البيان / الحساب</th><th>قبل الضريبة</th><th>الضريبة</th><th>الإجمالي</th><th>الدفع</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">الإجمالي</td><td class="num">${U.money(U.sum(list, (e) => e.amount))}</td><td class="num">${U.money(U.sum(list, (e) => e.tax))}</td><td class="num">${U.money(U.sum(list, (e) => e.total))}</td><td></td><td></td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">تُرحّل المصروفات تلقائياً إلى حساب المصروف وضريبة المدخلات</span>
          <span class="text-muted text-xs">نقدي: <b>${U.money(U.sum(list.filter((e) => e.method === 'cash'), (e) => e.total))}</b> • بنكي: <b>${U.money(U.sum(list.filter((e) => e.method === 'bank'), (e) => e.total))}</b></span></div>
      </div>`;
  }

  /* ---------- Receipts / payments ---------- */
  function paymentsContent(type) {
    const isReceipt = type === 'receipt';
    const list = filteredPayments(type);
    const rows = list.map((p) => `<tr>
      <td><div class="cell-main"><span class="code">${U.esc(p.number)}</span></div><div class="cell-sub">${U.formatDate(p.date)} • ${U.formatTime(p.createdAt)}</div></td>
      <td><div class="product-cell">${UI.avatar(p.partyName, 'sm')}<div><div class="cell-main">${U.esc(p.partyName)}</div><div class="cell-sub">${isReceipt ? 'عميل' : 'مورد'}</div></div></div></td>
      <td class="num fw-800 ${isReceipt ? 'text-success' : 'text-danger'}">${U.money(p.amount)}</td>
      <td>${UI.methodBadge(p.method)}</td>
      <td class="text-muted text-sm">${U.esc(p.notes || '—')}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-payment-view="${p.id}" title="عرض">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-payment-print="${p.id}" title="طباعة">${U.icon('print', 15)}</button>
        ${p.journalId ? `<button class="btn-icon btn-ghost" data-journal="${p.journalId}" title="القيد">${U.icon('book', 15)}</button>` : ''}
      </div></td>
    </tr>`).join('') || PK.emptyRow(6, isReceipt ? 'download' : 'upload', isReceipt ? 'لا توجد سندات قبض' : 'لا توجد سندات صرف', 'سجّل سنداً جديداً أو غيّر الفترة');
    return `${rangeToolbar(`<div class="searchbox">${U.icon('search', 15)}<input class="input" data-pay-q="${type}" placeholder="ابحث برقم السند أو الاسم..." value="${U.esc(isReceipt ? state.recQ : state.payQ)}" /></div>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon(isReceipt ? 'download' : 'upload', 18)} ${isReceipt ? 'سندات القبض من العملاء' : 'سندات الصرف للموردين'}</div><div class="card-sub">${U.num(list.length, 0)} سند • إجمالي ${U.money(U.sum(list, (p) => p.amount))}</div></div>
          <button class="btn btn-primary btn-sm" data-new-${isReceipt ? 'receipt' : 'payment'}>${U.icon('plus', 14)} ${isReceipt ? 'سند قبض' : 'سند صرف'}</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>السند</th><th>${isReceipt ? 'العميل' : 'المورد'}</th><th>المبلغ</th><th>الطريقة</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">الإجمالي</td><td class="num">${U.money(U.sum(list, (p) => p.amount))}</td><td></td><td></td><td></td></tr></tfoot>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">${isReceipt ? 'تُخصم السندات من رصيد العميل وتُضاف إلى الخزينة' : 'تُخصم السندات من رصيد المورد ومن الخزينة'}</span>
          <span class="text-muted text-xs">نقدي: <b>${U.money(U.sum(list.filter((p) => p.method === 'cash'), (p) => p.amount))}</b> • شبكة: <b>${U.money(U.sum(list.filter((p) => p.method !== 'cash'), (p) => p.amount))}</b></span></div>
      </div>`;
  }

  /* ---------- Transfers ---------- */
  function transfersContent() {
    const list = filteredTransfers();
    const rows = list.map((t) => `<tr>
      <td><div class="cell-main"><span class="code">${U.esc(t.number)}</span></div><div class="cell-sub">${U.formatDate(t.date)} • ${U.formatTime(t.createdAt)}</div></td>
      <td><span class="badge badge-red">${U.icon('upload', 11)} ${U.esc(t.fromName)}</span></td>
      <td><span class="badge badge-green">${U.icon('download', 11)} ${U.esc(t.toName)}</span></td>
      <td class="num fw-800">${U.money(t.amount)}</td>
      <td class="text-muted text-sm">${U.esc(t.notes || '—')}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-transfer-view="${t.id}" title="عرض">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-transfer-print="${t.id}" title="طباعة">${U.icon('print', 15)}</button>
        ${t.journalId ? `<button class="btn-icon btn-ghost" data-journal="${t.journalId}" title="القيد">${U.icon('book', 15)}</button>` : ''}
      </div></td>
    </tr>`).join('') || PK.emptyRow(6, 'refresh', 'لا توجد تحويلات', 'سجّل تحويلاً بين الصندوق والبنك');
    return `${rangeToolbar(`<div class="searchbox">${U.icon('search', 15)}<input class="input" data-trf-q placeholder="ابحث برقم التحويل أو الحساب..." value="${U.esc(state.trfQ)}" /></div>`)}
      <div class="card">
        <div class="card-head"><div><div class="card-title">${U.icon('refresh', 18)} التحويلات بين الحسابات</div><div class="card-sub">${U.num(list.length, 0)} تحويل • إجمالي ${U.money(U.sum(list, (t) => t.amount))}</div></div>
          <button class="btn btn-primary btn-sm" data-new-transfer>${U.icon('plus', 14)} تحويل جديد</button></div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المستند</th><th>من حساب</th><th>إلى حساب</th><th>المبلغ</th><th>ملاحظات</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">التحويلات لا تؤثر على صافي الربح — فقط على توزيع النقدية</span>
          <span class="text-muted text-xs">صندوق ← بنك: <b>${U.money(U.sum(list.filter((t) => t.fromAccountId === A.ACC.cash), (t) => t.amount))}</b></span></div>
      </div>`;
  }

  /* ---------- Daily close ---------- */
  function closeContent() {
    const d = A.dailyClose(state.closeDate);
    const approved = (Store.data.meta.dailyCloses || {})[state.closeDate];
    const diff = d.difference;
    const byMethodRows = d.byMethod.map((m) => `<div class="z-row"><span>${U.esc(m.label)}</span><b>${U.money(m.amount)}</b></div>`).join('') || '<div class="z-row"><span>لا توجد مبيعات</span><b>—</b></div>';
    const topRows = d.topProducts.map((p) => `<div class="z-row"><span>${U.esc(p.name)}</span><b>${U.num(p.qty, 0)} × ${U.money(p.revenue)}</b></div>`).join('') || '<div class="z-row"><span>لا توجد مبيعات</span><b>—</b></div>';
    const history = Object.values(Store.data.meta.dailyCloses || {}).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 20);
    return `<div class="toolbar" style="border:1px solid var(--line);border-radius:12px;margin-bottom:16px">
        <label class="text-xs text-muted">تاريخ الإغلاق</label>
        <input class="input" type="date" data-close-date value="${state.closeDate}" style="width:auto" />
        <button class="btn btn-secondary btn-sm" data-apply-close>${U.icon('refresh', 14)} تحديث</button>
        <div class="toolbar-spacer"></div>
        <button class="btn btn-secondary btn-sm" data-print-close>${U.icon('print', 14)} طباعة التقرير</button>
        <button class="btn btn-primary btn-sm" data-approve-close>${U.icon('checkCircle', 14)} ${approved ? 'إعادة اعتماد الإغلاق' : 'اعتماد الإغلاق'}</button>
      </div>
      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} تقرير الإغلاق اليومي</div><div class="card-sub">${U.formatDate(state.closeDate, 'full')} • ${U.esc(Store.branchName(App.branchId))}</div></div>
            ${approved ? '<span class="badge badge-green">مُعتمد</span>' : '<span class="badge badge-amber">غير معتمد</span>'}</div>
          <div class="card-body">
            <div class="z-report">
              <div class="z-head"><strong>${U.esc(Store.data.settings.company)}</strong><span>تقرير إغلاق الصندوق — ${U.formatDate(state.closeDate, 'full')}</span></div>
              <div class="z-row"><span>عدد فواتير البيع</span><b>${U.num(d.salesCount, 0)}</b></div>
              <div class="z-row"><span>إجمالي المبيعات</span><b>${U.money(d.totalSales)}</b></div>
              <div class="z-row"><span>إجمالي المرتجعات</span><b>${U.money(d.totalReturns)}</b></div>
              <div class="z-row"><span>الضريبة المحصلة</span><b>${U.money(d.totalTax)}</b></div>
              <div class="z-row"><span>الخصومات</span><b>${U.money(d.totalDiscount)}</b></div>
              <div class="z-row"><span>مبيعات نقدية</span><b>${U.money(d.cashSales)}</b></div>
              <div class="z-row"><span>مبيعات شبكة / بنك</span><b>${U.money(d.cardSales)}</b></div>
              <div class="z-row"><span>مبيعات آجلة</span><b>${U.money(d.creditSales)}</b></div>
              <div class="z-row"><span>مرتجعات نقدية</span><b>${U.money(d.cashReturns)}</b></div>
              <div class="z-row"><span>تحصيلات نقدية</span><b>${U.money(d.cashReceipts)}</b></div>
              <div class="z-row"><span>مصروفات نقدية</span><b>${U.money(d.cashExpenses)}</b></div>
              <div class="z-row"><span>سداد موردين نقدي</span><b>${U.money(d.cashSupplier)}</b></div>
              <div class="z-row"><span>تحويلات واردة / صادرة</span><b>${U.money(d.cashIn)} / ${U.money(d.cashOut)}</b></div>
              <div class="z-row total"><span>النقدية المتوقعة</span><b>${U.money(d.expected)}</b></div>
              <div class="z-row"><span>النقدية الفعلية بالصندوق</span><b>${U.money(d.actual)}</b></div>
              <div class="z-row"><span>الفرق</span><b class="${Math.abs(diff) < 0.01 ? 'text-success' : 'text-danger'}">${U.money(diff)}</b></div>
            </div>
          </div>
          <div class="card-foot"><span class="text-muted text-xs">الرصيد الافتتاحي للنقدية: ${U.money(d.openingCash)}</span>
            <span class="badge ${Math.abs(diff) < 0.01 ? 'badge-green' : 'badge-red'}">${Math.abs(diff) < 0.01 ? 'الصندوق مطابق' : 'يوجد فرق يحتاج مراجعة'}</span></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('card', 18)} المبيعات حسب طريقة الدفع</div></div></div>
            <div class="card-body"><div class="z-report" style="padding:12px">${byMethodRows}</div></div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('star', 18)} الأصناف الأكثر بيعاً</div></div></div>
            <div class="card-body"><div class="z-report" style="padding:12px">${topRows}</div></div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} سجل الإغلاقات</div></div></div>
            <div class="table-wrap"><table class="table compact">
              <thead><tr><th>التاريخ</th><th>المبيعات</th><th>الفرق</th><th>المستخدم</th></tr></thead>
              <tbody>${history.map((h) => `<tr><td class="nowrap">${U.formatDate(h.date)}</td><td class="num">${U.money(h.totalSales)}</td><td class="num ${Math.abs(h.difference) < 0.01 ? 'text-success' : 'text-danger'}">${U.money(h.difference)}</td><td class="text-muted text-xs">${U.esc(h.by || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:16px">لا توجد إغلاقات معتمدة</td></tr>'}</tbody>
            </table></div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Expense detail / vouchers ---------- */
  function openExpenseDetail(id) {
    const e = Store.data.expenses.find((x) => x.id === id);
    if (!e) return;
    UI.modal({
      size: 'md', title: `تفاصيل المصروف ${e.number}`, subtitle: `${U.formatDate(e.date, 'long')} • ${e.accountName}`, icon: 'wallet',
      body: `<div class="balance-hero mb-2"><div><div class="bh-lbl">إجمالي المصروف</div><div class="bh-val">${U.money(e.total)}</div></div><div class="bh-icon">${U.icon('wallet', 22)}</div></div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">الوصف</div><div class="detail-value">${U.esc(e.description)}</div></div>
          <div class="detail-item"><div class="detail-label">حساب المصروف</div><div class="detail-value">${U.esc(e.accountName)}</div></div>
          <div class="detail-item"><div class="detail-label">المبلغ قبل الضريبة</div><div class="detail-value">${U.money(e.amount)}</div></div>
          <div class="detail-item"><div class="detail-label">الضريبة</div><div class="detail-value">${U.money(e.tax)}</div></div>
          <div class="detail-item"><div class="detail-label">طريقة الدفع</div><div class="detail-value">${UI.methodBadge(e.method)}</div></div>
          <div class="detail-item"><div class="detail-label">القيد المحاسبي</div><div class="detail-value"><span class="code">${U.esc(e.journalId ? (Store.data.journal.find((j) => j.id === e.journalId) || {}).number || e.journalId : '—')}</span></div></div>
        </div>
        ${e.notes ? `<div class="info-banner mt-2">${U.icon('info', 17)}<div>${U.esc(e.notes)}</div></div>` : ''}`,
      footer: `<div class="foot-info">${e.journalId ? `<button class="btn btn-ghost btn-sm" data-journal>${U.icon('book', 14)} القيد المحاسبي</button>` : ''}</div>
        <button class="btn btn-secondary" data-print>${U.icon('print', 15)} طباعة السند</button>
        <button class="btn btn-primary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-print]').addEventListener('click', () => printExpenseVoucher(e));
        const j = modal.querySelector('[data-journal]');
        if (j) j.addEventListener('click', () => { close(); Actions.openJournal(e.journalId); });
      }
    });
  }

  function docBrand() {
    const s = Store.data.settings;
    return `<div class="doc-brand"><div class="doc-logo">م</div><div><strong>${U.esc(s.company)}</strong><span>${U.esc(s.legalName)} • الرقم الضريبي: ${U.esc(s.taxNumber)}</span><span>${U.esc(s.address)} • ${U.esc(s.phone)}</span></div></div>`;
  }

  function voucherHtml(opts) {
    const s = Store.data.settings;
    return `<div class="doc-head">${docBrand()}<div class="doc-meta"><h2>${U.esc(opts.title)}</h2><div>رقم المستند: <b>${U.esc(opts.number)}</b></div><div>التاريخ: <b>${U.formatDate(opts.date, 'full')}</b></div><div>${U.esc(opts.status || '')}</div></div></div>
      <div class="doc-parties">
        <div class="party"><div class="lbl">${U.esc(opts.partyLabel || 'الجهة')}</div><strong>${U.esc(opts.partyName || '—')}</strong><span>${U.esc(opts.partySub || '')}</span></div>
        <div class="party"><div class="lbl">بيانات الدفع</div><strong>${U.esc(opts.method || '—')}</strong><span>${U.esc(opts.meta || '')}</span></div>
      </div>
      <table class="items"><thead><tr><th>البيان</th><th>التفاصيل</th><th>المبلغ</th></tr></thead>
        <tbody>${(opts.lines || []).map((l) => `<tr><td>${U.esc(l.label)}</td><td>${U.esc(l.detail || '')}</td><td class="num">${U.money(l.amount)}</td></tr>`).join('')}</tbody>
      </table>
      <div class="totals"><div class="row grand"><span>الإجمالي</span><b>${U.money(opts.total)}</b></div></div>
      ${opts.notes ? `<div class="party" style="margin-top:12px"><div class="lbl">ملاحظات</div><strong>${U.esc(opts.notes)}</strong></div>` : ''}
      ${U.barcodeHtml(String(opts.number).replace(/[^A-Za-z0-9]/g, ''))}
      <div class="sig"><div>المستلم</div><div>المحاسب</div><div>الختم</div></div>
      <div class="doc-foot"><div>${U.esc(s.company)} — ${U.esc(s.phone)}</div><div>${U.esc(s.website || '')}</div></div>`;
  }

  function printExpenseVoucher(e) {
    U.printDoc('سند مصروف — ' + e.number, voucherHtml({
      title: 'سند صرف مصروف', number: e.number, date: e.date, partyLabel: 'حساب المصروف',
      partyName: e.accountName, partySub: e.description, method: methodLabel(e.method),
      meta: 'مصروف تشغيلي', lines: [
        { label: e.description, detail: e.accountName, amount: e.amount },
        ...(e.tax ? [{ label: 'ضريبة القيمة المضافة — مدخلات', detail: '15%', amount: e.tax }] : [])
      ], total: e.total, notes: e.notes
    }), { width: '210mm' });
  }

  function printPaymentVoucher(p) {
    const isReceipt = p.type === 'receipt';
    U.printDoc((isReceipt ? 'سند قبض — ' : 'سند صرف — ') + p.number, voucherHtml({
      title: isReceipt ? 'سند قبض' : 'سند صرف', number: p.number, date: p.date,
      partyLabel: isReceipt ? 'العميل' : 'المورد', partyName: p.partyName,
      partySub: isReceipt ? 'تحصيل من رصيد العميل' : 'سداد من رصيد المورد',
      method: methodLabel(p.method), meta: isReceipt ? 'وارد إلى الخزينة' : 'صادر من الخزينة',
      lines: [{ label: isReceipt ? 'تحصيل دفعة' : 'سداد دفعة', detail: p.notes || '', amount: p.amount }],
      total: p.amount, notes: p.notes
    }), { width: '210mm' });
  }

  function printTransferVoucher(t) {
    U.printDoc('سند تحويل — ' + t.number, voucherHtml({
      title: 'سند تحويل بين الحسابات', number: t.number, date: t.date,
      partyLabel: 'من حساب', partyName: t.fromName, partySub: 'الحساب المحوّل منه',
      method: 'تحويل داخلي', meta: 'إلى: ' + t.toName,
      lines: [{ label: 'تحويل إلى ' + t.toName, detail: t.notes || '', amount: t.amount }],
      total: t.amount, notes: t.notes
    }), { width: '210mm' });
  }

  function openPaymentDetail(id) {
    const p = Store.data.payments.find((x) => x.id === id);
    if (!p) return;
    const isReceipt = p.type === 'receipt';
    UI.modal({
      size: 'sm', title: `${isReceipt ? 'سند قبض' : 'سند صرف'} ${p.number}`, subtitle: `${U.formatDate(p.date, 'long')} • ${p.partyName}`, icon: isReceipt ? 'download' : 'upload',
      body: `<div class="balance-hero mb-2"><div><div class="bh-lbl">${isReceipt ? 'المبلغ المحصل' : 'المبلغ المدفوع'}</div><div class="bh-val ${isReceipt ? '' : 'negative'}">${U.money(p.amount)}</div></div><div class="bh-icon">${U.icon(isReceipt ? 'download' : 'upload', 22)}</div></div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">${isReceipt ? 'العميل' : 'المورد'}</div><div class="detail-value">${U.esc(p.partyName)}</div></div>
          <div class="detail-item"><div class="detail-label">طريقة الدفع</div><div class="detail-value">${UI.methodBadge(p.method)}</div></div>
          <div class="detail-item"><div class="detail-label">القيد</div><div class="detail-value"><span class="code">${U.esc(p.journalId ? (Store.data.journal.find((j) => j.id === p.journalId) || {}).number || p.journalId : '—')}</span></div></div>
          <div class="detail-item"><div class="detail-label">ملاحظات</div><div class="detail-value">${U.esc(p.notes || '—')}</div></div>
        </div>`,
      footer: `<div class="foot-info">${p.journalId ? `<button class="btn btn-ghost btn-sm" data-journal>${U.icon('book', 14)} القيد</button>` : ''}</div>
        <button class="btn btn-secondary" data-print>${U.icon('print', 15)} طباعة</button><button class="btn btn-primary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-print]').addEventListener('click', () => printPaymentVoucher(p));
        const j = modal.querySelector('[data-journal]');
        if (j) j.addEventListener('click', () => { close(); Actions.openJournal(p.journalId); });
      }
    });
  }

  function openTransferDetail(id) {
    const t = Store.data.transfers.find((x) => x.id === id);
    if (!t) return;
    UI.modal({
      size: 'sm', title: `تحويل ${t.number}`, subtitle: U.formatDate(t.date, 'long'), icon: 'refresh',
      body: `<div class="balance-hero mb-2"><div><div class="bh-lbl">قيمة التحويل</div><div class="bh-val">${U.money(t.amount)}</div></div><div class="bh-icon">${U.icon('refresh', 22)}</div></div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">من حساب</div><div class="detail-value">${U.esc(t.fromName)}</div></div>
          <div class="detail-item"><div class="detail-label">إلى حساب</div><div class="detail-value">${U.esc(t.toName)}</div></div>
          <div class="detail-item"><div class="detail-label">ملاحظات</div><div class="detail-value">${U.esc(t.notes || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">القيد</div><div class="detail-value"><span class="code">${U.esc(t.journalId ? (Store.data.journal.find((j) => j.id === t.journalId) || {}).number || t.journalId : '—')}</span></div></div>
        </div>`,
      footer: `<div class="foot-info">${t.journalId ? `<button class="btn btn-ghost btn-sm" data-journal>${U.icon('book', 14)} القيد</button>` : ''}</div>
        <button class="btn btn-secondary" data-print>${U.icon('print', 15)} طباعة</button><button class="btn btn-primary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-print]').addEventListener('click', () => printTransferVoucher(t));
        const j = modal.querySelector('[data-journal]');
        if (j) j.addEventListener('click', () => { close(); Actions.openJournal(t.journalId); });
      }
    });
  }

  /* ---------- Forms ---------- */
  function openTransferForm() {
    const accounts = Store.data.accounts.filter((a) => !a.isGroup && [A.ACC.cash, A.ACC.bank].includes(a.id));
    PK.formModal({
      title: 'تحويل بين الحسابات', subtitle: 'نقل النقدية بين الصندوق والحساب البنكي', icon: 'refresh', size: 'sm',
      submitText: 'تنفيذ التحويل', submitIcon: 'refresh',
      fields: [
        { name: 'fromAccountId', label: 'من حساب', type: 'select', options: accounts.map((a) => ({ value: a.id, label: a.name })), required: true },
        { name: 'toAccountId', label: 'إلى حساب', type: 'select', options: accounts.slice().reverse().map((a) => ({ value: a.id, label: a.name })), required: true },
        { name: 'amount', label: 'المبلغ', type: 'number', step: '0.01', min: 0, required: true, num: true },
        { name: 'date', label: 'التاريخ', type: 'date', value: U.today(), required: true },
        { name: 'notes', label: 'ملاحظات', type: 'textarea', full: true, placeholder: 'سبب التحويل (اختياري)' }
      ],
      onSubmit(data) {
        Business.createTransfer({ fromAccountId: data.fromAccountId, toAccountId: data.toAccountId, amount: data.amount, date: data.date, notes: data.notes });
      },
      successMessage: 'تم تنفيذ التحويل بنجاح',
      onDone() { App.refresh(); }
    });
  }

  function approveClose() {
    const d = A.dailyClose(state.closeDate);
    UI.confirm({
      title: 'اعتماد الإغلاق اليومي',
      message: `سيتم حفظ إغلاق يوم <strong>${U.formatDate(state.closeDate, 'full')}</strong> بنقدية فعلية <strong>${U.money(d.actual)}</strong> وفرق <strong>${U.money(d.difference)}</strong>. هل تريد المتابعة؟`,
      confirmText: 'اعتماد الإغلاق', icon: 'checkCircle'
    }).then((ok) => {
      if (!ok) return;
      Store.data.meta.dailyCloses = Store.data.meta.dailyCloses || {};
      Store.data.meta.dailyCloses[state.closeDate] = {
        date: state.closeDate, at: new Date().toISOString(), by: Store.currentUser ? Store.currentUser.name : 'النظام',
        actual: d.actual, expected: d.expected, difference: d.difference,
        totalSales: d.totalSales, totalReturns: d.totalReturns, salesCount: d.salesCount,
        totalTax: d.totalTax, totalDiscount: d.totalDiscount, cashSales: d.cashSales, cardSales: d.cardSales,
        creditSales: d.creditSales, cashExpenses: d.cashExpenses, cashReceipts: d.cashReceipts
      };
      Store.audit('اعتماد إغلاق يومي', `${state.closeDate} — نقدية ${U.money(d.actual)} — فرق ${U.money(d.difference)}`, 'checkCircle');
      Store.save();
      UI.toast('تم اعتماد الإغلاق اليومي', 'success');
      App.refresh();
    });
  }

  function printCloseReport() {
    const d = A.dailyClose(state.closeDate);
    PK.printReport({
      title: 'تقرير الإغلاق اليومي — الصندوق',
      subtitle: `${U.formatDate(state.closeDate, 'full')} • ${Store.branchName(App.branchId)}`,
      headers: ['البيان', 'القيمة'],
      rows: [
        ['عدد فواتير البيع', U.num(d.salesCount, 0)],
        ['إجمالي المبيعات', U.money(d.totalSales)],
        ['إجمالي المرتجعات', U.money(d.totalReturns)],
        ['الضريبة المحصلة', U.money(d.totalTax)],
        ['الخصومات', U.money(d.totalDiscount)],
        ['مبيعات نقدية', U.money(d.cashSales)],
        ['مبيعات شبكة / بنك', U.money(d.cardSales)],
        ['مبيعات آجلة', U.money(d.creditSales)],
        ['مرتجعات نقدية', U.money(d.cashReturns)],
        ['تحصيلات نقدية', U.money(d.cashReceipts)],
        ['مصروفات نقدية', U.money(d.cashExpenses)],
        ['سداد موردين نقدي', U.money(d.cashSupplier)],
        ['تحويلات واردة', U.money(d.cashIn)],
        ['تحويلات صادرة', U.money(d.cashOut)],
        ['الرصيد الافتتاحي', U.money(d.openingCash)],
        ['النقدية المتوقعة', U.money(d.expected)],
        ['النقدية الفعلية', U.money(d.actual)],
        ['الفرق', U.money(d.difference)]
      ],
      totals: [{ label: 'حالة الصندوق', value: Math.abs(d.difference) < 0.01 ? 'مطابق' : 'فرق ' + U.money(d.difference), grand: true }]
    });
  }

  /* ---------- Content switch ---------- */
  function content() {
    switch (state.tab) {
      case 'expenses': return expensesContent();
      case 'receipts': return paymentsContent('receipt');
      case 'payments': return paymentsContent('payment');
      case 'transfers': return transfersContent();
      case 'close': return closeContent();
      default: return overviewContent();
    }
  }

  /* ---------- Render ---------- */
  Pages.treasury = {
    title: 'الخزينة والمصروفات', icon: 'wallet', perm: 'treasury',
    render(view) {
      viewRef = view;
      view.innerHTML = `${headerHtml()}${kpiHtml()}
        <div class="card mt-3">
          ${tabsHtml()}
          <div class="card-body" style="padding:0">${content()}</div>
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab;
        Pages.treasury.render(view);
      }));

      const range = view.querySelector('[data-range]');
      if (range) PK.bindRange(range, (from, to) => {
        state.from = from; state.to = to;
        Pages.treasury.render(view);
      });

      const eq = view.querySelector('[data-exp-q]');
      if (eq) eq.addEventListener('input', U.debounce(() => { state.expQ = eq.value; Pages.treasury.render(view); }, 150));
      const ea = view.querySelector('[data-exp-account]');
      if (ea) ea.addEventListener('change', () => { state.expAccount = ea.value; Pages.treasury.render(view); });
      const em = view.querySelector('[data-exp-method]');
      if (em) em.addEventListener('change', () => { state.expMethod = em.value; Pages.treasury.render(view); });
      const pq = view.querySelector('[data-pay-q]');
      if (pq) pq.addEventListener('input', U.debounce(() => {
        if (pq.dataset.payQ === 'receipt') state.recQ = pq.value; else state.payQ = pq.value;
        Pages.treasury.render(view);
      }, 150));
      const tq = view.querySelector('[data-trf-q]');
      if (tq) tq.addEventListener('input', U.debounce(() => { state.trfQ = tq.value; Pages.treasury.render(view); }, 150));
      const cd = view.querySelector('[data-close-date]');
      if (cd) cd.addEventListener('change', () => { state.closeDate = cd.value || U.today(); Pages.treasury.render(view); });
      const ac = view.querySelector('[data-apply-close]');
      if (ac) ac.addEventListener('click', () => Pages.treasury.render(view));

      view.onclick = (e) => {
        if (e.target.closest('[data-tab]')) return;
        if (e.target.closest('[data-new-expense]')) { Actions.openExpense(); return; }
        if (e.target.closest('[data-new-receipt]')) { Actions.openReceipt(); return; }
        if (e.target.closest('[data-new-payment]')) { Actions.openSupplierPayment(); return; }
        if (e.target.closest('[data-new-transfer]')) { openTransferForm(); return; }
        if (e.target.closest('[data-approve-close]')) { approveClose(); return; }
        if (e.target.closest('[data-print-close]')) { printCloseReport(); return; }
        if (e.target.closest('[data-apply-close]')) { Pages.treasury.render(view); return; }
        const expView = e.target.closest('[data-expense-view]');
        if (expView) { openExpenseDetail(expView.dataset.expenseView); return; }
        const expPrint = e.target.closest('[data-expense-print]');
        if (expPrint) { const x = Store.data.expenses.find((y) => y.id === expPrint.dataset.expensePrint); if (x) printExpenseVoucher(x); return; }
        const payView = e.target.closest('[data-payment-view]');
        if (payView) { openPaymentDetail(payView.dataset.paymentView); return; }
        const payPrint = e.target.closest('[data-payment-print]');
        if (payPrint) { const x = Store.data.payments.find((y) => y.id === payPrint.dataset.paymentPrint); if (x) printPaymentVoucher(x); return; }
        const trfView = e.target.closest('[data-transfer-view]');
        if (trfView) { openTransferDetail(trfView.dataset.transferView); return; }
        const trfPrint = e.target.closest('[data-transfer-print]');
        if (trfPrint) { const x = Store.data.transfers.find((y) => y.id === trfPrint.dataset.transferPrint); if (x) printTransferVoucher(x); return; }
        const docView = e.target.closest('[data-doc-view]');
        if (docView) {
          if (docView.dataset.docView === 'expense') openExpenseDetail(docView.dataset.id);
          else if (docView.dataset.docView === 'transfer') openTransferDetail(docView.dataset.id);
          else openPaymentDetail(docView.dataset.id);
          return;
        }
        const journal = e.target.closest('[data-journal]');
        if (journal) { Actions.openJournal(journal.dataset.journal); return; }
      };
    }
  };
})();
