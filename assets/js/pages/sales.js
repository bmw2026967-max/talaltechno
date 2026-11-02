/* ==========================================================================
   Page — Sales
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = {
    tab: 'invoices', from: U.addDays(U.today(), -29), to: U.today(),
    q: '', status: 'all', branch: 'all', limit: 100
  };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  function baseInvoices() {
    return Store.data.invoices.filter((i) => U.inRange(i.date, state.from, state.to));
  }

  function filteredInvoices() {
    let list = baseInvoices().filter((i) => i.type === 'sale');
    if (state.branch !== 'all') list = list.filter((i) => i.branchId === state.branch);
    if (state.status !== 'all') list = list.filter((i) => i.status === state.status);
    const q = norm(state.q);
    if (q) list = list.filter((i) => norm(i.number).includes(q) || norm(i.customerName).includes(q)
      || norm(i.cashierName).includes(q) || String(i.total).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function filteredReturns() {
    let list = baseInvoices().filter((i) => i.type === 'return');
    if (state.branch !== 'all') list = list.filter((i) => i.branchId === state.branch);
    const q = norm(state.q);
    if (q) list = list.filter((i) => norm(i.number).includes(q) || norm(i.customerName).includes(q)
      || norm(i.originalNumber).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function filteredQuotes() {
    let list = baseInvoices().filter((i) => i.type === 'quote');
    if (state.branch !== 'all') list = list.filter((i) => i.branchId === state.branch);
    if (state.status !== 'all' && state.status !== 'unpaid') list = list.filter((i) => i.status === state.status);
    const q = norm(state.q);
    if (q) list = list.filter((i) => norm(i.number).includes(q) || norm(i.customerName).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function currentList() {
    return state.tab === 'returns' ? filteredReturns() : state.tab === 'quotes' ? filteredQuotes() : filteredInvoices();
  }

  /* ---------- Tables ---------- */
  function invoicesTable() {
    const all = filteredInvoices();
    const list = all.slice(0, state.limit);
    const body = list.map((i) => `<tr>
      <td><div class="cell-main" style="display:flex;align-items:center;gap:6px">${U.esc(i.number)} ${i.due > 0.01 ? '<span class="status-dot amber"></span>' : ''}</div><div class="cell-sub">${U.formatDate(i.date)} • ${U.formatTime(i.createdAt)}</div></td>
      <td><div class="cell-main" style="font-weight:600">${U.esc(i.customerName || 'عميل نقدي')}</div><div class="cell-sub">${U.esc(i.cashierName || '')} • ${U.esc(Store.branchName(i.branchId))}</div></td>
      <td class="num text-muted">${U.num((i.items || []).length, 0)}</td>
      <td class="num fw-800">${U.money(i.total)}</td>
      <td class="num text-success">${U.money(i.paid)}</td>
      <td class="num ${i.due > 0.01 ? 'text-danger fw-800' : 'text-muted'}">${U.money(i.due)}</td>
      <td>${UI.methodBadge(i.method)}</td>
      <td>${UI.statusBadge(i.status)}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-view="${i.id}" title="عرض">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-print="${i.id}" title="طباعة">${U.icon('print', 15)}</button>
        ${i.due > 0.01 && i.customerId ? `<button class="btn-icon btn-ghost" data-receipt="${i.customerId}" title="تحصيل">${U.icon('download', 15)}</button>` : ''}
        <button class="btn-icon btn-ghost" data-return="${i.id}" title="إرجاع">${U.icon('refresh', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(9, 'receipt', 'لا توجد فواتير مطابقة', 'جرّب تغيير الفترة أو أضف بيعاً جديداً');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>الفاتورة</th><th>العميل / الكاشير</th><th>الأصناف</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الدفع</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">عرض ${U.num(list.length, 0)} من ${U.num(all.length, 0)} فاتورة في الفترة</span>
        <span class="flex items-center gap-2">${all.length > state.limit ? `<button class="btn btn-ghost btn-sm" data-more>عرض المزيد ${U.icon('chevronDown', 13)}</button>` : ''}
        <span class="text-muted text-xs">إجمالي المعروض: <b class="text-success">${U.money(U.sum(list, (i) => i.total))}</b></span></span></div>`;
  }

  function returnsTable() {
    const all = filteredReturns();
    const list = all.slice(0, state.limit);
    const body = list.map((i) => `<tr>
      <td><div class="cell-main">${U.esc(i.number)}</div><div class="cell-sub">${U.formatDate(i.date)}</div></td>
      <td><span class="code">${U.esc(i.originalNumber || '—')}</span></td>
      <td><div class="cell-main" style="font-weight:600">${U.esc(i.customerName || 'عميل نقدي')}</div><div class="cell-sub">${U.esc(Store.branchName(i.branchId))}</div></td>
      <td class="num">${U.num((i.items || []).length, 0)}</td>
      <td class="num fw-800 text-danger">${U.money(i.total)}</td>
      <td>${UI.methodBadge(i.refundMethod || i.method)}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-view="${i.id}" title="عرض">${U.icon('eye', 15)}</button>
        <button class="btn-icon btn-ghost" data-print="${i.id}" title="طباعة">${U.icon('print', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(7, 'refresh', 'لا توجد مرتجعات', 'لم تُسجل مرتجعات في الفترة المحددة');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>المرتجع</th><th>الفاتورة الأصلية</th><th>العميل</th><th>الأصناف</th><th>القيمة</th><th>طريقة الاسترداد</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(all.length, 0)} مرتجع في الفترة</span>
        <span class="text-muted text-xs">إجمالي المرتجعات: <b class="text-danger">${U.money(U.sum(all, (i) => i.total))}</b></span></div>`;
  }

  function quotesTable() {
    const all = filteredQuotes();
    const list = all.slice(0, state.limit);
    const body = list.map((i) => `<tr>
      <td><div class="cell-main">${U.esc(i.number)}</div><div class="cell-sub">${U.formatDate(i.date)}</div></td>
      <td><div class="cell-main" style="font-weight:600">${U.esc(i.customerName || 'عميل نقدي')}</div><div class="cell-sub">${U.esc(i.cashierName || '')}</div></td>
      <td class="num">${U.num((i.items || []).length, 0)}</td>
      <td class="num fw-800">${U.money(i.total)}</td>
      <td class="nowrap text-muted">${U.formatDate(i.validUntil)}</td>
      <td>${UI.statusBadge(i.status)}</td>
      <td class="actions-cell"><div class="row-actions">
        <button class="btn-icon btn-ghost" data-view="${i.id}" title="عرض">${U.icon('eye', 15)}</button>
        ${i.status === 'quote' ? `<button class="btn-icon btn-ghost" data-convert="${i.id}" title="تحويل إلى بيع">${U.icon('pos', 15)}</button>` : ''}
        <button class="btn-icon btn-ghost" data-print="${i.id}" title="طباعة">${U.icon('print', 15)}</button>
        ${i.status === 'quote' ? `<button class="btn-icon btn-ghost" data-del-quote="${i.id}" title="حذف">${U.icon('trash', 15)}</button>` : ''}
      </div></td>
    </tr>`).join('') || PK.emptyRow(7, 'file', 'لا توجد عروض أسعار', 'أنشئ عرض سعر من نقطة البيع');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>عرض السعر</th><th>العميل</th><th>الأصناف</th><th>الإجمالي</th><th>صالح حتى</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(all.length, 0)} عرض سعر</span>
        <span class="text-muted text-xs">قيمة العروض السارية: <b class="text-info">${U.money(U.sum(all.filter((i) => i.status === 'quote'), (i) => i.total))}</b></span></div>`;
  }

  function listHtml() {
    return state.tab === 'returns' ? returnsTable() : state.tab === 'quotes' ? quotesTable() : invoicesTable();
  }

  /* ---------- Print / export ---------- */
  function exportCurrent() {
    const list = currentList();
    if (state.tab === 'invoices') {
      PK.exportCSV('sales-' + U.today() + '.csv', ['الفاتورة', 'التاريخ', 'العميل', 'الكاشير', 'الفرع', 'الأصناف', 'الإجمالي', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الحالة'],
        list.map((i) => [i.number, i.date, i.customerName, i.cashierName, Store.branchName(i.branchId), (i.items || []).length, i.total, i.paid, i.due, Accounting.methodLabel(i.method), i.status]));
    } else if (state.tab === 'returns') {
      PK.exportCSV('sales-returns-' + U.today() + '.csv', ['المرتجع', 'الأصل', 'التاريخ', 'العميل', 'القيمة', 'طريقة الاسترداد'],
        list.map((i) => [i.number, i.originalNumber, i.date, i.customerName, i.total, Accounting.methodLabel(i.refundMethod || i.method)]));
    } else {
      PK.exportCSV('quotes-' + U.today() + '.csv', ['العرض', 'التاريخ', 'العميل', 'الإجمالي', 'صالح حتى', 'الحالة'],
        list.map((i) => [i.number, i.date, i.customerName, i.total, i.validUntil, i.status]));
    }
  }

  function printCurrent() {
    const list = currentList();
    if (state.tab === 'invoices') {
      PK.printReport({
        title: 'تقرير فواتير المبيعات', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)} • ${list.length} فاتورة`,
        headers: ['الفاتورة', 'التاريخ', 'العميل', 'الكاشير', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'],
        rows: list.map((i) => [U.esc(i.number), U.formatDate(i.date), U.esc(i.customerName), U.esc(i.cashierName || ''), U.money(i.total), U.money(i.paid), U.money(i.due), UI.statusBadge(i.status)]),
        totals: [
          { label: 'عدد الفواتير', value: U.num(list.length, 0) },
          { label: 'إجمالي المبيعات', value: U.money(U.sum(list, (i) => i.total)), grand: true }
        ]
      });
    } else if (state.tab === 'returns') {
      PK.printReport({
        title: 'تقرير مرتجعات المبيعات', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`,
        headers: ['المرتجع', 'الأصل', 'التاريخ', 'العميل', 'القيمة'],
        rows: list.map((i) => [U.esc(i.number), U.esc(i.originalNumber || ''), U.formatDate(i.date), U.esc(i.customerName), U.money(i.total)]),
        totals: [{ label: 'إجمالي المرتجعات', value: U.money(U.sum(list, (i) => i.total)), grand: true }]
      });
    } else {
      PK.printReport({
        title: 'تقرير عروض الأسعار', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`,
        headers: ['العرض', 'التاريخ', 'العميل', 'الإجمالي', 'صالح حتى', 'الحالة'],
        rows: list.map((i) => [U.esc(i.number), U.formatDate(i.date), U.esc(i.customerName), U.money(i.total), U.formatDate(i.validUntil), i.status === 'quote' ? 'عرض سعر' : 'محوّل']),
        totals: [{ label: 'قيمة العروض', value: U.money(U.sum(list, (i) => i.total)), grand: true }]
      });
    }
  }

  Pages.sales = {
    title: 'المبيعات', icon: 'receipt', perm: 'sales',
    render(view) {
      viewRef = view;
      const summary = Accounting.salesSummary(state.from, state.to);
      const allBase = baseInvoices();
      const counts = {
        invoices: allBase.filter((i) => i.type === 'sale').length,
        returns: allBase.filter((i) => i.type === 'return').length,
        quotes: allBase.filter((i) => i.type === 'quote').length
      };
      const overdue = Store.data.invoices.filter((i) => i.type === 'sale' && i.due > 0.01 && U.daysBetween(i.date, U.today()) > 30).length;

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">المبيعات</div><div class="page-sub">الفواتير والمرتجعات وعروض الأسعار — ${U.formatDate(state.from)} إلى ${U.formatDate(state.to)}</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير CSV</button>
            <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة التقرير</button>
            <button class="btn btn-gold" data-quote>${U.icon('file', 16)} عرض سعر</button>
            <button class="btn btn-primary" data-new>${U.icon('pos', 16)} فاتورة بيع</button>
          </div>
        </div>
        <div class="kpi-grid">
          ${PK.kpi({ label: 'إجمالي المبيعات', value: U.money(summary.total), icon: 'receipt', tone: 'green', sub: `<b>${summary.count}</b> فاتورة • متوسط ${U.moneyShort(summary.avgTicket)}` })}
          ${PK.kpi({ label: 'صافي الإيراد بعد المرتجعات', value: U.money(summary.netRevenue), icon: 'trendingUp', tone: 'blue', sub: `مرتجعات <b>${U.moneyShort(summary.returnTotal)}</b>` })}
          ${PK.kpi({ label: 'أرباح المبيعات', value: U.money(summary.profit), icon: 'coins', tone: 'gold', sub: `هامش <b>${U.num(summary.margin, 1)}%</b> • تكلفة ${U.moneyShort(summary.cogs)}` })}
          ${PK.kpi({ label: 'مستحقات غير محصلة', value: U.money(summary.due), icon: 'clock', tone: summary.due ? 'red' : 'green', sub: `<b>${overdue}</b> فاتورة متأخرة أكثر من 30 يوماً` })}
        </div>
        <div class="card mt-3">
          <div class="tabs">
            <button class="tab ${state.tab === 'invoices' ? 'active' : ''}" data-tab="invoices">${U.icon('receipt', 15)} الفواتير <span class="count">${counts.invoices}</span></button>
            <button class="tab ${state.tab === 'returns' ? 'active' : ''}" data-tab="returns">${U.icon('refresh', 15)} المرتجعات <span class="count">${counts.returns}</span></button>
            <button class="tab ${state.tab === 'quotes' ? 'active' : ''}" data-tab="quotes">${U.icon('file', 15)} عروض الأسعار <span class="count">${counts.quotes}</span></button>
          </div>
          <div class="toolbar">
            <div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="بحث برقم الفاتورة أو العميل..." value="${U.esc(state.q)}" /></div>
            ${state.tab === 'invoices' ? `<select class="select" data-status>
              <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل الحالات</option>
              <option value="paid" ${state.status === 'paid' ? 'selected' : ''}>مدفوعة</option>
              <option value="partial" ${state.status === 'partial' ? 'selected' : ''}>جزئية</option>
              <option value="unpaid" ${state.status === 'unpaid' ? 'selected' : ''}>غير مدفوعة</option>
            </select>` : ''}
            ${state.tab === 'quotes' ? `<select class="select" data-status>
              <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل العروض</option>
              <option value="quote" ${state.status === 'quote' ? 'selected' : ''}>سارية</option>
              <option value="converted" ${state.status === 'converted' ? 'selected' : ''}>محوّلة</option>
            </select>` : ''}
            <select class="select" data-branch><option value="all">كل الفروع</option>${Store.data.branches.map((b) => `<option value="${b.id}" ${state.branch === b.id ? 'selected' : ''}>${U.esc(b.name)}</option>`).join('')}</select>
            <div class="toolbar-spacer"></div>
            <div class="segmented" data-presets>
              <button data-preset="7">7 أيام</button>
              <button data-preset="30" class="active">30 يوماً</button>
              <button data-preset="month">هذا الشهر</button>
              <button data-preset="lastMonth">الشهر الماضي</button>
            </div>
            <input class="input" type="date" data-from value="${state.from}" />
            <span class="text-muted text-xs">إلى</span>
            <input class="input" type="date" data-to value="${state.to}" />
            <button class="btn btn-secondary btn-sm" data-apply>${U.icon('refresh', 14)} تحديث</button>
          </div>
          <div id="sales-list">${listHtml()}</div>
        </div>`;

      const rerender = () => Pages.sales.render(view);
      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab; state.limit = 100; state.q = ''; state.status = 'all'; rerender();
      }));
      const q = view.querySelector('[data-q]');
      q.addEventListener('input', U.debounce(() => { state.q = q.value; state.limit = 100; const box = view.querySelector('#sales-list'); if (box) box.innerHTML = listHtml(); }, 120));
      const st = view.querySelector('[data-status]');
      if (st) st.addEventListener('change', () => { state.status = st.value; state.limit = 100; const box = view.querySelector('#sales-list'); if (box) box.innerHTML = listHtml(); });
      const br = view.querySelector('[data-branch]');
      br.addEventListener('change', () => { state.branch = br.value; state.limit = 100; const box = view.querySelector('#sales-list'); if (box) box.innerHTML = listHtml(); });
      view.querySelectorAll('[data-presets] button').forEach((b) => b.addEventListener('click', () => {
        const r = U.presetRange(b.dataset.preset);
        state.from = r.from; state.to = r.to; state.limit = 100; rerender();
      }));
      view.querySelector('[data-apply]').addEventListener('click', () => {
        const f = view.querySelector('[data-from]').value, t = view.querySelector('[data-to]').value;
        if (!f || !t) { UI.toast('حدد الفترة الزمنية', 'warning'); return; }
        state.from = f; state.to = t; state.limit = 100; rerender();
      });
      view.querySelector('[data-export]').addEventListener('click', exportCurrent);
      view.querySelector('[data-print]').addEventListener('click', printCurrent);
      view.querySelector('[data-new]').addEventListener('click', () => App.navigate('#/pos'));
      view.querySelector('[data-quote]').addEventListener('click', () => { App.navigate('#/pos'); UI.toast('أضف الأصناف ثم اختر «عرض سعر» من السلة', 'info'); });

      view.onclick = (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) return;
        const more = e.target.closest('[data-more]');
        if (more) { state.limit += 100; const box = view.querySelector('#sales-list'); if (box) box.innerHTML = listHtml(); return; }
        const v = e.target.closest('[data-view]');
        if (v) { Actions.openInvoice(v.dataset.view); return; }
        const pr = e.target.closest('[data-print]');
        if (pr && pr.dataset.print) { const inv = Store.invoice(pr.dataset.print); if (inv) Actions.printInvoice(inv); return; }
        const ret = e.target.closest('[data-return]');
        if (ret) { const inv = Store.invoice(ret.dataset.return); if (inv) Actions.openSaleReturn(inv); return; }
        const rec = e.target.closest('[data-receipt]');
        if (rec) { Actions.openReceipt(rec.dataset.receipt); return; }
        const conv = e.target.closest('[data-convert]');
        if (conv) { window.__pendingQuote = conv.dataset.convert; App.navigate('#/pos'); return; }
        const del = e.target.closest('[data-del-quote]');
        if (del) {
          const quote = Store.invoice(del.dataset.delQuote);
          if (!quote) return;
          UI.confirm({ title: 'حذف عرض السعر', message: `هل تريد حذف عرض السعر <strong>${U.esc(quote.number)}</strong>؟`, danger: true, confirmText: 'حذف', icon: 'trash' }).then((ok) => {
            if (!ok) return;
            Store.remove('invoices', quote.id);
            Store.audit('حذف عرض سعر', quote.number, 'trash');
            Store.save();
            UI.toast('تم حذف عرض السعر', 'success');
            App.refresh();
          });
        }
      };
    }
  };
})();
