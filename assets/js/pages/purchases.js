/* ==========================================================================
   Page — Purchases
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { tab: 'purchases', from: U.addDays(U.today(), -59), to: U.today(), q: '', supplier: 'all', limit: 100 };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  function base() { return Store.data.purchases.filter((p) => U.inRange(p.date, state.from, state.to)); }
  function filteredPurchases() {
    let list = base().filter((p) => p.type !== 'return');
    if (state.supplier !== 'all') list = list.filter((p) => p.supplierId === state.supplier);
    const q = norm(state.q);
    if (q) list = list.filter((p) => norm(p.number).includes(q) || norm(p.supplierName).includes(q) || norm(p.notes).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }
  function filteredReturns() {
    let list = base().filter((p) => p.type === 'return');
    if (state.supplier !== 'all') list = list.filter((p) => p.supplierId === state.supplier);
    const q = norm(state.q);
    if (q) list = list.filter((p) => norm(p.number).includes(q) || norm(p.supplierName).includes(q) || norm(p.originalNumber).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }
  function currentList() { return state.tab === 'returns' ? filteredReturns() : filteredPurchases(); }

  function statusBadge(p) {
    if (p.type === 'return') return '<span class="badge badge-purple">مرتجع</span>';
    return UI.statusBadge(p.status);
  }

  /* ---------- Purchase form ---------- */
  function lineRow(productId, qty, cost) {
    const p = productId ? Store.product(productId) : Store.data.products[0];
    return `<div class="pur-line" data-line style="display:grid;grid-template-columns:minmax(180px,1fr) 82px 96px 88px 32px;gap:8px;align-items:center;margin-bottom:7px">
      <select class="select sm" data-product>${PK.productOptions(p ? p.id : '')}</select>
      <input class="input sm num" type="number" min="0.01" step="1" data-qty value="${qty || 1}" />
      <input class="input sm num" type="number" min="0" step="0.01" data-cost value="${cost != null ? cost : (p ? p.cost : 0)}" />
      <div class="num fw-800 text-sm" data-line-total style="text-align:left">0.00</div>
      <button type="button" class="btn-icon btn-ghost" data-remove-line title="حذف السطر">${U.icon('trash', 14)}</button>
    </div>`;
  }

  function openPurchaseForm() {
    const suppliers = Store.data.suppliers.filter((s) => s.active !== false);
    const products = Store.data.products.filter((p) => p.active !== false);
    if (!suppliers.length) { UI.toast('أضف مورداً أولاً من صفحة العملاء والموردين', 'warning'); return; }
    if (!products.length) { UI.toast('أضف منتجاً أولاً', 'warning'); return; }
    const modal = UI.modal({
      size: 'xl',
      title: 'فاتورة شراء جديدة',
      subtitle: 'تُضاف الكميات للمخزون ويُحدّث متوسط التكلفة تلقائياً',
      icon: 'truck',
      body: `<div class="form-grid">
          <div class="field"><label>المورد <span class="req">*</span></label><select class="select" name="supplierId">${PK.supplierOptions(suppliers[0].id)}</select></div>
          <div class="field"><label>تاريخ الفاتورة</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
          <div class="field full"><label>ملاحظات / رقم أمر الشراء</label><input class="input" name="notes" placeholder="مثال: توريد دوري — أمر شراء 12" /></div>
        </div>
        <div class="form-section">
          <div class="flex items-center justify-between mb-2"><div class="form-section-title" style="margin:0">أصناف الفاتورة</div><button class="btn btn-soft btn-sm" type="button" data-add-line>${U.icon('plus', 14)} إضافة صنف</button></div>
          <div class="pur-lines" data-lines>${lineRow(products[0].id, 1, products[0].cost)}</div>
        </div>
        <div class="form-section">
          <div class="form-grid">
            <div class="field"><label>الخصم على الفاتورة</label><input class="input num" type="number" min="0" step="0.01" name="discount" data-discount value="0" /></div>
            <div class="field"><label>المبلغ المدفوع الآن</label><input class="input num" type="number" min="0" step="0.01" name="paid" data-paid value="0" /></div>
            <div class="field"><label>طريقة الدفع للمبلغ المدفوع</label><select class="select" name="method" data-method><option value="bank">تحويل بنكي</option><option value="cash">نقدي — الصندوق</option></select></div>
            <div class="field"><label>حالة السداد</label><input class="input" data-status-text value="غير مدفوعة" disabled /></div>
          </div>
          <div class="pay-summary mt-2">
            <div class="ps-row"><span>المجموع قبل الضريبة</span><b data-subtotal>0.00</b></div>
            <div class="ps-row"><span>الخصم</span><b data-discount-show>0.00</b></div>
            <div class="ps-row"><span>ضريبة القيمة المضافة</span><b data-tax>0.00</b></div>
            <div class="ps-row total"><span>إجمالي الفاتورة</span><b data-total>0.00</b></div>
            <div class="ps-row"><span>المدفوع</span><b data-paid-show>0.00</b></div>
            <div class="ps-row"><span>المتبقي على المورد</span><b data-due>0.00</b></div>
          </div>
        </div>`,
      footer: `<span class="foot-info">سيُسجّل قيد الشراء والمخزون والضريبة تلقائياً</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ فاتورة الشراء</button>`,
      onMount(modalEl, close) {
        const linesBox = modalEl.querySelector('[data-lines]');
        const discountInput = modalEl.querySelector('[data-discount]');
        const paidInput = modalEl.querySelector('[data-paid]');
        const methodSel = modalEl.querySelector('[data-method]');
        const statusText = modalEl.querySelector('[data-status-text]');
        const out = {
          subtotal: modalEl.querySelector('[data-subtotal]'), discount: modalEl.querySelector('[data-discount-show]'),
          tax: modalEl.querySelector('[data-tax]'), total: modalEl.querySelector('[data-total]'),
          paid: modalEl.querySelector('[data-paid-show]'), due: modalEl.querySelector('[data-due]')
        };

        const readLines = () => Array.from(linesBox.querySelectorAll('[data-line]')).map((row) => {
          const productId = row.querySelector('[data-product]').value;
          const p = Store.product(productId);
          return {
            productId,
            qty: U.parseNum(row.querySelector('[data-qty]').value),
            cost: U.parseNum(row.querySelector('[data-cost]').value),
            taxRate: p ? Number(p.taxRate) || 0 : 0
          };
        }).filter((l) => l.productId && l.qty > 0);

        const calc = () => {
          const items = readLines();
          const subtotal = U.round2(U.sum(items, (i) => i.qty * i.cost));
          const discount = U.round2(U.clamp(U.parseNum(discountInput.value), 0, subtotal));
          let tax = 0;
          items.forEach((it) => {
            const share = subtotal ? (it.qty * it.cost) / subtotal : 0;
            tax += U.round2((it.qty * it.cost - discount * share) * it.taxRate / 100);
          });
          tax = U.round2(tax);
          const total = U.round2(subtotal - discount + tax);
          const paid = U.round2(U.clamp(U.parseNum(paidInput.value), 0, total));
          const due = U.round2(total - paid);
          Array.from(linesBox.querySelectorAll('[data-line]')).forEach((row) => {
            const p = Store.product(row.querySelector('[data-product]').value);
            const qty = U.parseNum(row.querySelector('[data-qty]').value);
            const cost = U.parseNum(row.querySelector('[data-cost]').value);
            row.querySelector('[data-line-total]').textContent = U.money(qty * cost);
          });
          out.subtotal.textContent = U.money(subtotal);
          out.discount.textContent = '- ' + U.money(discount);
          out.tax.textContent = U.money(tax);
          out.total.textContent = U.money(total);
          out.paid.textContent = U.money(paid);
          out.due.textContent = U.money(due);
          statusText.value = due <= 0.01 ? 'مدفوعة بالكامل' : paid > 0 ? 'مدفوعة جزئياً' : 'غير مدفوعة (آجل)';
        };

        const bindLine = (row) => {
          const sel = row.querySelector('[data-product]');
          const qty = row.querySelector('[data-qty]');
          const cost = row.querySelector('[data-cost]');
          sel.addEventListener('change', () => {
            const p = Store.product(sel.value);
            if (p) cost.value = p.cost;
            calc();
          });
          qty.addEventListener('input', calc);
          cost.addEventListener('input', calc);
          row.querySelector('[data-remove-line]').addEventListener('click', () => {
            if (linesBox.querySelectorAll('[data-line]').length <= 1) { UI.toast('يجب أن تحتوي الفاتورة على صنف واحد على الأقل', 'warning'); return; }
            row.remove();
            calc();
          });
        };
        linesBox.querySelectorAll('[data-line]').forEach(bindLine);

        modalEl.querySelector('[data-add-line]').addEventListener('click', () => {
          const used = new Set(Array.from(linesBox.querySelectorAll('[data-product]')).map((s) => s.value));
          const p = products.find((x) => !used.has(x.id)) || products[0];
          const wrap = document.createElement('div');
          wrap.innerHTML = lineRow(p.id, 1, p.cost);
          const row = wrap.firstElementChild;
          linesBox.appendChild(row);
          bindLine(row);
          calc();
          row.querySelector('[data-qty]').focus();
        });

        discountInput.addEventListener('input', calc);
        paidInput.addEventListener('input', calc);
        methodSel.addEventListener('change', calc);
        calc();

        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          const items = readLines();
          if (!data.supplierId) { UI.toast('اختر المورد', 'warning'); return; }
          if (!items.length) { UI.toast('أضف صنفاً واحداً على الأقل بكمية صحيحة', 'warning'); return; }
          const ids = items.map((i) => i.productId);
          if (new Set(ids).size !== ids.length) { UI.toast('لا يمكن تكرار الصنف في نفس الفاتورة', 'warning'); return; }
          const saveBtn = modalEl.querySelector('[data-save]');
          UI.setBusy(saveBtn, true, 'جارٍ حفظ الشراء...');
          try {
            const purchase = Business.createPurchase({
              supplierId: data.supplierId, date: data.date, items,
              discount: U.parseNum(data.discount), paid: U.parseNum(data.paid),
              method: data.method, notes: data.notes
            });
            close();
            UI.toast(`تم حفظ فاتورة الشراء ${purchase.number}`, 'success');
            App.refresh();
            setTimeout(() => openPurchaseDetail(purchase.id), 250);
          } catch (e) {
            UI.setBusy(saveBtn, false);
            UI.toast(e.message, 'error');
          }
        });
      }
    });
    return modal;
  }

  /* ---------- Detail ---------- */
  function openPurchaseDetail(id) {
    const p = Store.purchase(id);
    if (!p) { UI.toast('المستند غير موجود', 'error'); return; }
    const isReturn = p.type === 'return';
    const supplier = Store.supplier(p.supplierId);
    const rows = (p.items || []).map((it, idx) => `<tr>
      <td class="text-muted">${idx + 1}</td>
      <td><div class="product-cell"><div class="thumb sm">${it.emoji || '📦'}</div><div><div class="cell-main">${U.esc(it.name)}</div><div class="cell-sub">${U.esc(it.sku || '')}</div></div></div></td>
      <td class="num">${U.num(it.qty, 0)}</td>
      <td class="num">${U.money(it.cost || it.unitNet || 0)}</td>
      <td class="num">${U.num(it.taxRate || 0, 0)}%</td>
      <td class="num fw-800">${U.money((it.qty * (it.cost || it.unitNet || 0)) + (it.taxAmount || 0))}</td>
    </tr>`).join('');
    UI.modal({
      size: 'lg',
      title: `${isReturn ? 'مرتجع شراء' : 'فاتورة شراء'} ${p.number}`,
      subtitle: `${U.formatDate(p.date, 'long')} • ${p.supplierName}`,
      icon: isReturn ? 'refresh' : 'truck',
      body: `<div class="invoice-doc">
        <div class="invoice-doc-head">
          <div class="idoc-brand"><div class="brand-mark" style="width:38px;height:38px;border-radius:11px">${U.icon('truck', 19)}</div><div><strong>${U.esc(Store.data.settings.company)}</strong><span>فاتورة مشتريات ${isReturn ? '— مرتجع' : ''}</span></div></div>
          <div class="idoc-meta"><strong>${U.esc(p.number)}</strong>${U.formatDate(p.date, 'full')}<br>${isReturn ? `أصل: ${U.esc(p.originalNumber || '')}` : `الحالة: ${p.status === 'paid' ? 'مدفوعة' : p.status === 'partial' ? 'جزئية' : 'غير مدفوعة'}`}</div>
        </div>
        <div class="invoice-doc-body">
          <div class="detail-grid" style="margin-bottom:16px">
            <div class="detail-item"><div class="detail-label">المورد</div><div class="detail-value">${U.esc(p.supplierName)}</div><div class="cell-sub">${U.esc(supplier ? supplier.phone || '' : '')}</div></div>
            <div class="detail-item"><div class="detail-label">الرقم الضريبي للمورد</div><div class="detail-value mono">${U.esc(supplier ? supplier.taxNumber || '—' : '—')}</div></div>
            <div class="detail-item"><div class="detail-label">طريقة السداد</div><div class="detail-value">${UI.methodBadge(p.method)}</div></div>
            <div class="detail-item"><div class="detail-label">ملاحظات</div><div class="detail-value">${U.esc(p.notes || '—')}</div></div>
          </div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>التكلفة</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
        </div>
        <div class="invoice-doc-totals"><div class="invoice-totals">
          <div class="it-row"><span>المجموع قبل الضريبة</span><b>${U.money(p.subtotal)}</b></div>
          ${p.discount ? `<div class="it-row"><span>الخصم</span><b>- ${U.money(p.discount)}</b></div>` : ''}
          <div class="it-row"><span>ضريبة القيمة المضافة</span><b>${U.money(p.tax)}</b></div>
          <div class="it-row it-total"><span>الإجمالي</span><b>${U.money(p.total)}</b></div>
          ${!isReturn ? `<div class="it-row" style="margin-top:5px"><span>المدفوع</span><b>${U.money(p.paid)}</b></div>
          ${p.due > 0.01 ? `<div class="it-row"><span>المتبقي</span><b style="color:var(--danger)">${U.money(p.due)}</b></div>` : ''}` : ''}
        </div></div>
      </div>`,
      footer: `<div class="foot-info">${p.journalId ? `<button class="btn btn-ghost btn-sm" data-journal>${U.icon('book', 14)} القيد المحاسبي</button>` : ''}</div>
        ${!isReturn ? `<button class="btn btn-secondary btn-sm" data-return>${U.icon('refresh', 14)} مرتجع</button>
        ${p.due > 0.01 ? `<button class="btn btn-secondary btn-sm" data-pay>${U.icon('upload', 14)} سداد</button>` : ''}` : ''}
        <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
        <button class="btn btn-primary btn-sm" data-close>إغلاق</button>`,
      onMount(modalEl, close) {
        modalEl.querySelector('[data-close]').addEventListener('click', close);
        modalEl.querySelector('[data-print]').addEventListener('click', () => printPurchase(p));
        if (modalEl.querySelector('[data-journal]')) modalEl.querySelector('[data-journal]').addEventListener('click', () => Actions.openJournal(p.journalId));
        if (modalEl.querySelector('[data-return]')) modalEl.querySelector('[data-return]').addEventListener('click', () => { close(); Actions.openPurchaseReturn(p); });
        if (modalEl.querySelector('[data-pay]')) modalEl.querySelector('[data-pay]').addEventListener('click', () => {
          close();
          Actions.openSupplierPayment(p.supplierId, { amount: p.due, onDone: () => App.refresh() });
        });
      }
    });
  }

  /* ---------- Print ---------- */
  function printPurchase(p) {
    const s = Store.data.settings;
    const supplier = Store.supplier(p.supplierId);
    const isReturn = p.type === 'return';
    const rows = (p.items || []).map((it, i) => `<tr>
      <td>${i + 1}</td><td>${U.esc(it.name)}<br><span style="font-size:8px;color:#6d7f76">${U.esc(it.sku || '')}</span></td>
      <td class="num">${U.num(it.qty, 0)}</td><td class="num">${U.money(it.cost || it.unitNet || 0)}</td>
      <td class="num">${U.num(it.taxRate || 0, 0)}%</td>
      <td class="num">${U.money((it.qty * (it.cost || it.unitNet || 0)) + (it.taxAmount || 0))}</td>
    </tr>`).join('');
    const body = `<div class="doc-head">
      <div class="doc-brand"><div class="doc-logo">م</div><div><strong>${U.esc(s.company)}</strong><span>${U.esc(s.legalName)} • الرقم الضريبي: ${U.esc(s.taxNumber)}</span><span>${U.esc(s.address)} • ${U.esc(s.phone)}</span></div></div>
      <div class="doc-meta"><h2>${isReturn ? 'مرتجع مشتريات' : 'فاتورة مشتريات'}</h2><div>رقم المستند: <b>${U.esc(p.number)}</b></div><div>التاريخ: <b>${U.formatDate(p.date, 'full')}</b></div>${isReturn ? `<div>الفاتورة الأصلية: <b>${U.esc(p.originalNumber || '')}</b></div>` : `<div>الحالة: <b>${p.status === 'paid' ? 'مدفوعة' : p.status === 'partial' ? 'جزئية' : 'غير مدفوعة'}</b></div>`}</div>
    </div>
    <div class="doc-parties">
      <div class="party"><div class="lbl">المورد</div><strong>${U.esc(p.supplierName)}</strong><span>${U.esc(supplier ? supplier.phone || '' : '')} — ${U.esc(supplier ? supplier.address || '' : '')}</span><span>الرقم الضريبي: ${U.esc(supplier ? supplier.taxNumber || '—' : '—')}</span></div>
      <div class="party"><div class="lbl">بيانات المستند</div><strong>${U.esc(Accounting.methodLabel(p.method))}</strong><span>${U.esc(p.notes || '')}</span></div>
    </div>
    <table class="items"><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>التكلفة</th><th>الضريبة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals">
      <div class="row"><span>المجموع قبل الضريبة</span><b>${U.money(p.subtotal)}</b></div>
      ${p.discount ? `<div class="row"><span>الخصم</span><b>- ${U.money(p.discount)}</b></div>` : ''}
      <div class="row"><span>ضريبة القيمة المضافة</span><b>${U.money(p.tax)}</b></div>
      <div class="row grand"><span>الإجمالي</span><b>${U.money(p.total)}</b></div>
      ${!isReturn ? `<div class="row" style="margin-top:5px"><span>المدفوع</span><b>${U.money(p.paid)}</b></div>${p.due > 0.01 ? `<div class="row"><span>المتبقي</span><b>${U.money(p.due)}</b></div>` : ''}` : ''}
    </div>
    ${U.barcodeHtml(p.number.replace(/[^A-Za-z0-9]/g, ''))}
    <div class="doc-foot"><div>${U.esc(s.company)} — ${U.esc(s.phone)}</div><div>${U.esc(s.website || '')}</div></div>
    <div class="sig"><div>المستلم</div><div>المحاسب</div><div>الختم</div></div>`;
    U.printDoc((isReturn ? 'مرتجع شراء — ' : 'فاتورة شراء — ') + p.number, body, { width: '210mm' });
  }

  /* ---------- Export ---------- */
  function exportCurrent() {
    const list = currentList();
    if (state.tab === 'purchases') {
      PK.exportCSV('purchases-' + U.today() + '.csv', ['الفاتورة', 'التاريخ', 'المورد', 'الأصناف', 'الإجمالي', 'المدفوع', 'المتبقي', 'طريقة الدفع', 'الحالة'],
        list.map((p) => [p.number, p.date, p.supplierName, (p.items || []).length, p.total, p.paid, p.due, Accounting.methodLabel(p.method), p.status]));
    } else {
      PK.exportCSV('purchase-returns-' + U.today() + '.csv', ['المرتجع', 'الأصل', 'التاريخ', 'المورد', 'القيمة', 'طريقة التسوية'],
        list.map((p) => [p.number, p.originalNumber, p.date, p.supplierName, p.total, Accounting.methodLabel(p.refundMethod || p.method)]));
    }
  }

  function printCurrent() {
    const list = currentList();
    if (state.tab === 'purchases') {
      PK.printReport({
        title: 'تقرير فواتير المشتريات', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)} • ${list.length} فاتورة`,
        headers: ['الفاتورة', 'التاريخ', 'المورد', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'],
        rows: list.map((p) => [U.esc(p.number), U.formatDate(p.date), U.esc(p.supplierName), U.money(p.total), U.money(p.paid), U.money(p.due), p.status === 'paid' ? 'مدفوعة' : p.status === 'partial' ? 'جزئية' : 'غير مدفوعة']),
        totals: [{ label: 'إجمالي المشتريات', value: U.money(U.sum(list, (p) => p.total)), grand: true }]
      });
    } else {
      PK.printReport({
        title: 'تقرير مرتجعات المشتريات', subtitle: `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`,
        headers: ['المرتجع', 'الأصل', 'التاريخ', 'المورد', 'القيمة'],
        rows: list.map((p) => [U.esc(p.number), U.esc(p.originalNumber || ''), U.formatDate(p.date), U.esc(p.supplierName), U.money(p.total)]),
        totals: [{ label: 'إجمالي المرتجعات', value: U.money(U.sum(list, (p) => p.total)), grand: true }]
      });
    }
  }

  Pages.purchases = {
    title: 'المشتريات', icon: 'truck', perm: 'purchases',
    render(view) {
      viewRef = view;
      const purchases = Accounting.purchases(state.from, state.to);
      const returns = Accounting.purchaseReturns(state.from, state.to);
      const total = U.sum(purchases, (p) => p.total);
      const due = U.sum(purchases, (p) => p.due);
      const counts = { purchases: base().filter((p) => p.type !== 'return').length, returns: base().filter((p) => p.type === 'return').length };

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">المشتريات</div><div class="page-sub">فواتير الشراء ومرتجعاتها ومتابعة مستحقات الموردين</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير CSV</button>
            <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة التقرير</button>
            <button class="btn btn-primary" data-new>${U.icon('plus', 16)} فاتورة شراء</button>
          </div>
        </div>
        <div class="kpi-grid">
          ${PK.kpi({ label: 'إجمالي المشتريات', value: U.money(total), icon: 'truck', tone: 'blue', sub: `<b>${purchases.length}</b> فاتورة • صافي ${U.moneyShort(U.sum(purchases, (p) => p.subtotal - p.discount))}` })}
          ${PK.kpi({ label: 'مستحقات الموردين', value: U.money(Accounting.payables()), icon: 'clock', tone: 'gold', sub: `<b>${Store.data.suppliers.length}</b> مورد مسجل` })}
          ${PK.kpi({ label: 'غير المسدد في الفترة', value: U.money(due), icon: 'alert', tone: due ? 'red' : 'green', sub: `<b>${purchases.filter((p) => p.due > 0.01).length}</b> فاتورة عليها رصيد` })}
          ${PK.kpi({ label: 'مرتجعات المشتريات', value: U.money(U.sum(returns, (p) => p.total)), icon: 'refresh', tone: 'purple', sub: `<b>${returns.length}</b> مرتجع في الفترة` })}
        </div>
        <div class="card mt-3">
          <div class="tabs">
            <button class="tab ${state.tab === 'purchases' ? 'active' : ''}" data-tab="purchases">${U.icon('truck', 15)} فواتير الشراء <span class="count">${counts.purchases}</span></button>
            <button class="tab ${state.tab === 'returns' ? 'active' : ''}" data-tab="returns">${U.icon('refresh', 15)} المرتجعات <span class="count">${counts.returns}</span></button>
          </div>
          <div class="toolbar">
            <div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="بحث برقم الفاتورة أو المورد..." value="${U.esc(state.q)}" /></div>
            <select class="select" data-supplier><option value="all">كل الموردين</option>${Store.data.suppliers.map((s) => `<option value="${s.id}" ${state.supplier === s.id ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}</select>
            <div class="toolbar-spacer"></div>
            <div class="segmented" data-presets>
              <button data-preset="30">30 يوماً</button>
              <button data-preset="month">هذا الشهر</button>
              <button data-preset="lastMonth">الشهر الماضي</button>
              <button data-preset="year">هذا العام</button>
            </div>
            <input class="input" type="date" data-from value="${state.from}" />
            <span class="text-muted text-xs">إلى</span>
            <input class="input" type="date" data-to value="${state.to}" />
            <button class="btn btn-secondary btn-sm" data-apply>${U.icon('refresh', 14)} تحديث</button>
          </div>
          <div id="purchases-list"></div>
        </div>`;

      const draw = () => {
        const box = view.querySelector('#purchases-list');
        if (!box) return;
        if (state.tab === 'returns') {
          const all = filteredReturns();
          const list = all.slice(0, state.limit);
          box.innerHTML = `<div class="table-wrap"><table class="table">
            <thead><tr><th>المرتجع</th><th>الفاتورة الأصلية</th><th>المورد</th><th>التاريخ</th><th>القيمة</th><th>طريقة التسوية</th><th></th></tr></thead>
            <tbody>${list.map((p) => `<tr>
              <td><div class="cell-main">${U.esc(p.number)}</div><div class="cell-sub">${U.formatDate(p.date)}</div></td>
              <td><span class="code">${U.esc(p.originalNumber || '—')}</span></td>
              <td class="fw-700">${U.esc(p.supplierName)}</td>
              <td class="nowrap text-muted">${U.formatDate(p.date)}</td>
              <td class="num fw-800 text-danger">${U.money(p.total)}</td>
              <td>${UI.methodBadge(p.refundMethod || p.method)}</td>
              <td class="actions-cell"><div class="row-actions">
                <button class="btn-icon btn-ghost" data-view="${p.id}" title="عرض">${U.icon('eye', 15)}</button>
                <button class="btn-icon btn-ghost" data-print-one="${p.id}" title="طباعة">${U.icon('print', 15)}</button>
              </div></td>
            </tr>`).join('') || PK.emptyRow(7, 'refresh', 'لا توجد مرتجعات شراء', 'لم تُسجل مرتجعات في الفترة المحددة')}</tbody></table></div>
            <div class="card-foot"><span class="text-muted text-xs">${U.num(all.length, 0)} مرتجع</span><span class="text-muted text-xs">الإجمالي: <b class="text-danger">${U.money(U.sum(all, (p) => p.total))}</b></span></div>`;
        } else {
          const all = filteredPurchases();
          const list = all.slice(0, state.limit);
          box.innerHTML = `<div class="table-wrap"><table class="table">
            <thead><tr><th>الفاتورة</th><th>المورد</th><th>الأصناف</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الدفع</th><th>الحالة</th><th></th></tr></thead>
            <tbody>${list.map((p) => `<tr>
              <td><div class="cell-main">${U.esc(p.number)}</div><div class="cell-sub">${U.formatDate(p.date)} • ${U.formatTime(p.createdAt)}</div></td>
              <td><div class="cell-main" style="font-weight:600">${U.esc(p.supplierName)}</div><div class="cell-sub">${U.esc((Store.supplier(p.supplierId) || {}).phone || '')}</div></td>
              <td class="num text-muted">${U.num((p.items || []).length, 0)}</td>
              <td class="num fw-800">${U.money(p.total)}</td>
              <td class="num text-success">${U.money(p.paid)}</td>
              <td class="num ${p.due > 0.01 ? 'text-danger fw-800' : 'text-muted'}">${U.money(p.due)}</td>
              <td>${UI.methodBadge(p.method)}</td>
              <td>${statusBadge(p)}</td>
              <td class="actions-cell"><div class="row-actions">
                <button class="btn-icon btn-ghost" data-view="${p.id}" title="عرض">${U.icon('eye', 15)}</button>
                <button class="btn-icon btn-ghost" data-print-one="${p.id}" title="طباعة">${U.icon('print', 15)}</button>
                ${p.due > 0.01 ? `<button class="btn-icon btn-ghost" data-pay="${p.id}" title="سداد">${U.icon('upload', 15)}</button>` : ''}
                <button class="btn-icon btn-ghost" data-return="${p.id}" title="مرتجع">${U.icon('refresh', 15)}</button>
              </div></td>
            </tr>`).join('') || PK.emptyRow(9, 'truck', 'لا توجد فواتير شراء', 'ابدأ بإنشاء فاتورة شراء جديدة')}</tbody></table></div>
            <div class="card-foot"><span class="text-muted text-xs">عرض ${U.num(list.length, 0)} من ${U.num(all.length, 0)} فاتورة</span>
              <span class="flex items-center gap-2">${all.length > state.limit ? `<button class="btn btn-ghost btn-sm" data-more>عرض المزيد ${U.icon('chevronDown', 13)}</button>` : ''}<span class="text-muted text-xs">إجمالي المعروض: <b>${U.money(U.sum(list, (p) => p.total))}</b></span></span></div>`;
        }
      };
      draw();

      const rerender = () => Pages.purchases.render(view);
      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; state.q = ''; state.limit = 100; rerender(); }));
      const q = view.querySelector('[data-q]');
      q.addEventListener('input', U.debounce(() => { state.q = q.value; state.limit = 100; draw(); }, 120));
      const sup = view.querySelector('[data-supplier]');
      sup.addEventListener('change', () => { state.supplier = sup.value; state.limit = 100; draw(); });
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
      view.querySelector('[data-new]').addEventListener('click', openPurchaseForm);

      view.onclick = (e) => {
        const more = e.target.closest('[data-more]');
        if (more) { state.limit += 100; draw(); return; }
        const v = e.target.closest('[data-view]');
        if (v) { openPurchaseDetail(v.dataset.view); return; }
        const pr = e.target.closest('[data-print-one]');
        if (pr) { const p = Store.purchase(pr.dataset.printOne); if (p) printPurchase(p); return; }
        const pay = e.target.closest('[data-pay]');
        if (pay) { const p = Store.purchase(pay.dataset.pay); if (p) Actions.openSupplierPayment(p.supplierId, { amount: p.due, onDone: () => App.refresh() }); return; }
        const ret = e.target.closest('[data-return]');
        if (ret) { const p = Store.purchase(ret.dataset.return); if (p) Actions.openPurchaseReturn(p); return; }
      };

      if (window.__newPurchase) {
        window.__newPurchase = null;
        setTimeout(openPurchaseForm, 150);
      }
    }
  };
})();
