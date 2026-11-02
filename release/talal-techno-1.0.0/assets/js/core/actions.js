/* ==========================================================================
   طلال تكنو — Shared actions & printable documents
   ========================================================================== */
(function () {
  'use strict';
  const Actions = window.Actions = {};

  const company = () => Store.data.settings;
  const refresh = () => { if (window.App && App.refresh) App.refresh(); };

  function brandMark(size = 42) {
    return `<div class="brand-mark" style="width:${size}px;height:${size}px;flex:0 0 ${size}px;border-radius:${Math.round(size * .3)}px">
      <svg width="${Math.round(size * .55)}" height="${Math.round(size * .55)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 6h14M8 6 4 14h8L8 6Zm8 0-4 8h8l-4-8Z"/></svg>
    </div>`;
  }

  function docBrand() {
    const s = company();
    return `<div class="doc-brand"><div class="doc-logo">ط</div><div><strong>${U.esc(s.company)}</strong><span>${U.esc(s.legalName)} • الرقم الضريبي: ${U.esc(s.taxNumber)}</span><span>${U.esc(s.address)} • ${U.esc(s.phone)}</span></div></div>`;
  }

  function typeLabel(inv) {
    if (inv.type === 'return') return 'مرتجع مبيعات';
    if (inv.type === 'quote') return 'عرض سعر';
    return 'فاتورة ضريبية مبسطة';
  }

  function orderLabel(inv) {
    const type = inv.orderType ? (window.Orders && Orders.typeLabel ? Orders.typeLabel(inv.orderType) : inv.orderType) : '';
    const table = inv.tableName || '';
    if (!type && !table) return '';
    return [type, table].filter(Boolean).join(' • ');
  }

  function zatcaQr(inv, size) {
    if (!inv || !inv.zatca || !inv.zatca.qr || !window.Zatca) return '';
    return Zatca.qrSvg(inv.zatca.qr, size || 110);
  }

  function zatcaStatusBadge(status) {
    const tone = status === 'CLEARED' || status === 'REPORTED' ? 'badge-green'
      : status === 'REJECTED' || status === 'FAILED' ? 'badge-red' : 'badge-amber';
    return `<span class="badge ${tone}">${U.esc(window.Zatca ? Zatca.statusLabel(status) : status)}</span>`;
  }

  /* ------------------------------------------------------------------
     Invoice detail
     ------------------------------------------------------------------ */
  Actions.openInvoice = function (invoiceId, opts = {}) {
    const inv = Store.invoice(invoiceId);
    if (!inv) { UI.toast('الفاتورة غير موجودة', 'error'); return; }
    const customer = inv.customerId ? Store.customer(inv.customerId) : null;
    const balance = customer ? Accounting.customerBalance(customer.id) : 0;
    const isReturn = inv.type === 'return';
    const items = inv.items || [];
    const rows = items.map((it, i) => `<tr>
      <td class="text-muted">${i + 1}</td>
      <td><div class="product-cell"><div class="thumb sm">${it.emoji || '📦'}</div><div><div class="cell-main">${U.esc(it.name)}</div><div class="cell-sub">${U.esc(it.sku || '')}</div></div></div></td>
      <td class="num">${U.num(it.qty, 0)}</td>
      <td class="num">${U.money(it.price)}</td>
      <td class="num">${it.discount ? U.money(it.discount) : '—'}</td>
      <td class="num">${U.num(it.taxRate, 0)}%</td>
      <td class="num fw-800">${U.money((it.price * it.qty) - (it.discount || 0) + (it.taxAmount || 0))}</td>
    </tr>`).join('');
    const paid = inv.paid || 0;
    const due = inv.due || 0;
    const modal = UI.modal({
      size: 'lg',
      title: `تفاصيل ${inv.type === 'quote' ? 'عرض السعر' : 'الفاتورة'} ${inv.number}`,
      subtitle: `${U.formatDate(inv.date, 'long')} • ${inv.branchName || Store.branchName(inv.branchId)}`,
      icon: inv.type === 'return' ? 'refresh' : inv.type === 'quote' ? 'file' : 'receipt',
      body: `
        <div class="invoice-doc">
          <div class="invoice-doc-head">
            <div class="idoc-brand">${brandMark(38)}<div><strong>${U.esc(company().company)}</strong><span>${U.esc(company().legalName)} • ${U.esc(company().taxNumber)}</span></div></div>
            <div class="idoc-meta"><strong>${U.esc(inv.number)}</strong>${typeLabel(inv)}<br>${U.formatDate(inv.date, 'full')}</div>
          </div>
          <div class="invoice-doc-body">
            <div class="detail-grid" style="margin-bottom:16px">
              <div class="detail-item"><div class="detail-label">العميل</div><div class="detail-value">${U.esc(inv.customerName || 'عميل نقدي')}</div>${customer ? `<div class="cell-sub">${U.esc(customer.phone || '')}</div>` : ''}</div>
              <div class="detail-item"><div class="detail-label">الكاشير / الفرع</div><div class="detail-value">${U.esc(inv.cashierName || '—')}</div><div class="cell-sub">${U.esc(Store.branchName(inv.branchId))}</div></div>
              <div class="detail-item"><div class="detail-label">نوع الطلب</div><div class="detail-value">${U.esc(orderLabel(inv) || 'بيع مباشر')}</div>${inv.orderNumber ? `<div class="cell-sub">طلب ${U.esc(inv.orderNumber)}</div>` : ''}</div>
              <div class="detail-item"><div class="detail-label">الحالة وطريقة الدفع</div><div class="detail-value" style="display:flex;gap:5px;flex-wrap:wrap">${UI.statusBadge(inv.status)} ${UI.methodBadge(inv.method)}</div></div>
              <div class="detail-item"><div class="detail-label">${isReturn ? 'الفاتورة الأصلية' : 'الرصيد الحالي للعميل'}</div><div class="detail-value">${isReturn ? U.esc(inv.originalNumber || '—') : (customer ? U.money(balance) : '—')}</div></div>
            </div>
            ${inv.zatca ? `<div class="doc-zatca">
              <div class="dz-qr">${zatcaQr(inv, 96)}</div>
              <div class="dz-info">
                <div class="dz-title">${U.icon('shield', 15)} رمز الاستجابة السريعة — ZATCA Sandbox ${zatcaStatusBadge(inv.zatca.status)}</div>
                <div class="dz-meta">UUID: <span class="mono">${U.esc(String(inv.zatca.uuid || '').slice(0, 18))}…</span></div>
                <div class="dz-meta">هاش الفاتورة: <span class="mono">${U.esc(String(inv.zatca.invoiceHash || '').slice(0, 24))}…</span></div>
                <div class="dz-note">محاكاة تعليمية — ليست شهادة أو اعتماداً من هيئة الزكاة والضريبة والجمارك.</div>
              </div>
            </div>` : ''}
            <div class="table-wrap">
              <table class="table compact">
                <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
          <div class="invoice-doc-totals">
            <div class="invoice-totals">
              <div class="it-row"><span>المجموع قبل الضريبة</span><b>${U.money(inv.subtotal)}</b></div>
              ${inv.discount ? `<div class="it-row"><span>الخصم</span><b style="color:var(--danger)">- ${U.money(inv.discount)}</b></div>` : ''}
              <div class="it-row"><span>ضريبة القيمة المضافة</span><b>${U.money(inv.tax)}</b></div>
              <div class="it-row it-total"><span>الإجمالي</span><b>${U.money(inv.total)}</b></div>
              ${!isReturn ? `<div class="it-row" style="margin-top:5px"><span>المدفوع</span><b>${U.money(paid)}</b></div>
              ${due > 0.01 ? `<div class="it-row"><span>المتبقي</span><b style="color:var(--danger)">${U.money(due)}</b></div>` : ''}` : ''}
              ${inv.type === 'quote' ? `<div class="it-row"><span>صالح حتى</span><b>${U.formatDate(inv.validUntil)}</b></div>` : ''}
            </div>
          </div>
        </div>
        ${inv.notes ? `<div class="info-banner mt-2">${U.icon('info', 17)}<div><strong>ملاحظات:</strong> ${U.esc(inv.notes)}</div></div>` : ''}
      `,
      footer: `<div class="foot-info">${inv.journalId ? `<button class="btn btn-ghost btn-sm" data-journal>${U.icon('book', 14)} القيد المحاسبي</button>` : ''}</div>
        ${inv.type === 'sale' ? `<button class="btn btn-secondary btn-sm" data-return>${U.icon('refresh', 14)} إرجاع</button>` : ''}
        ${inv.type === 'quote' && inv.status === 'quote' ? `<button class="btn btn-gold btn-sm" data-convert>${U.icon('pos', 14)} تحويل إلى بيع</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-thermal>${U.icon('print', 14)} طباعة حرارية (محاكاة)</button>
        <button class="btn btn-secondary btn-sm" data-receipt-print>${U.icon('print', 14)} إيصال 80مم</button>
        <button class="btn btn-primary btn-sm" data-print>${U.icon('print', 14)} طباعة A4</button>`,
      onMount(modalEl, close) {
        const q = (sel) => modalEl.querySelector(sel);
        q('[data-print]').addEventListener('click', () => Actions.printInvoice(inv));
        q('[data-receipt-print]').addEventListener('click', () => Actions.printReceipt(inv));
        q('[data-thermal]').addEventListener('click', () => Actions.thermalPrint(inv));
        if (q('[data-return]')) q('[data-return]').addEventListener('click', () => { close(); Actions.openSaleReturn(inv); });
        if (q('[data-convert]')) q('[data-convert]').addEventListener('click', () => {
          close();
          window.__pendingQuote = inv.id;
          App.navigate('#/pos');
        });
        if (q('[data-journal]')) q('[data-journal]').addEventListener('click', () => Actions.openJournal(inv.journalId));
      }
    });
    return modal;
  };

  /* ------------------------------------------------------------------
     Printing
     ------------------------------------------------------------------ */
  Actions.printInvoice = function (inv) {
    const s = company();
    const isReturn = inv.type === 'return';
    const rows = (inv.items || []).map((it, i) => `<tr>
      <td>${i + 1}</td><td>${U.esc(it.name)}<br><span style="font-size:8px;color:#6d7f76">${U.esc(it.sku || '')}</span></td>
      <td class="num">${U.num(it.qty, 0)}</td><td class="num">${U.money(it.price)}</td>
      <td class="num">${it.discount ? U.money(it.discount) : '—'}</td>
      <td class="num">${U.num(it.taxRate, 0)}%</td>
      <td class="num">${U.money((it.price * it.qty) - (it.discount || 0) + (it.taxAmount || 0))}</td>
    </tr>`).join('');
    const body = `
      <div class="doc-head">${docBrand()}
        <div class="doc-meta"><h2>${typeLabel(inv)}</h2>
          <div>رقم المستند: <b>${U.esc(inv.number)}</b></div>
          <div>التاريخ: <b>${U.formatDate(inv.date, 'full')}</b></div>
          <div>الحالة: <b>${inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partial' ? 'مدفوعة جزئياً' : inv.status === 'return' ? 'مرتجع' : inv.status === 'quote' ? 'عرض سعر' : 'غير مدفوعة'}</b></div>
          ${orderLabel(inv) ? `<div>نوع الطلب: <b>${U.esc(orderLabel(inv))}</b></div>` : ''}
          ${inv.orderNumber ? `<div>رقم الطلب: <b>${U.esc(inv.orderNumber)}</b></div>` : ''}
          ${inv.type === 'quote' ? `<div>صالح حتى: <b>${U.formatDate(inv.validUntil)}</b></div>` : ''}
          ${isReturn ? `<div>الفاتورة الأصلية: <b>${U.esc(inv.originalNumber || '')}</b></div>` : ''}
        </div>
      </div>
      <div class="doc-parties">
        <div class="party"><div class="lbl">العميل</div><strong>${U.esc(inv.customerName || 'عميل نقدي')}</strong>
          ${inv.customerId && Store.customer(inv.customerId) ? `<span>${U.esc(Store.customer(inv.customerId).phone || '')} — ${U.esc(Store.customer(inv.customerId).address || '')}</span>` : '<span>بيع نقدي مباشر</span>'}
        </div>
        <div class="party"><div class="lbl">الفرع / الكاشير</div><strong>${U.esc(Store.branchName(inv.branchId))}</strong><span>${U.esc(inv.cashierName || '')} — ${U.formatTime(inv.createdAt)}</span></div>
      </div>
      <table class="items">
        <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>المجموع قبل الضريبة</span><b>${U.money(inv.subtotal)}</b></div>
        ${inv.discount ? `<div class="row"><span>الخصم</span><b>- ${U.money(inv.discount)}</b></div>` : ''}
        <div class="row"><span>ضريبة القيمة المضافة (${U.num(s.vatRate, 0)}%)</span><b>${U.money(inv.tax)}</b></div>
        <div class="row grand"><span>الإجمالي</span><b>${U.money(inv.total)}</b></div>
        ${!isReturn ? `<div class="row" style="margin-top:5px"><span>المدفوع</span><b>${U.money(inv.paid)}</b></div>` : ''}
        ${!isReturn && inv.due > 0.01 ? `<div class="row"><span>المتبقي</span><b>${U.money(inv.due)}</b></div>` : ''}
      </div>
      ${inv.zatca ? `<div class="doc-zatca">
        <div class="dz-qr">${zatcaQr(inv, 92)}</div>
        <div class="dz-info"><div class="dz-title">${U.icon('shield', 14)} رمز الاستجابة السريعة — ZATCA Sandbox</div>
          <div class="dz-meta">الحالة: ${U.esc(window.Zatca ? Zatca.statusLabel(inv.zatca.status) : inv.zatca.status)} • UUID: ${U.esc(String(inv.zatca.uuid || '').slice(0, 18))}…</div>
          <div class="dz-meta">هاش: <span class="mono">${U.esc(String(inv.zatca.invoiceHash || '').slice(0, 32))}…</span></div>
          <div class="dz-note">محاكاة تعليمية — ليست شهادة أو اعتماداً من هيئة الزكاة والضريبة والجمارك.</div></div>
      </div>` : ''}
      ${U.barcodeHtml(inv.number.replace(/[^A-Za-z0-9]/g, ''))}
      <div class="doc-foot"><div>${U.esc(s.invoiceTerms)}</div><div style="text-align:left">${U.esc(s.website || '')}<br>${U.esc(s.email || '')}</div></div>
      <div class="sig"><div>المستلم</div><div>المحاسب</div><div>الختم</div></div>`;
    U.printDoc(typeLabel(inv) + ' — ' + inv.number, body, { width: '210mm' });
  };

  Actions.printReceipt = function (inv) {
    const s = company();
    const rows = (inv.items || []).map((it) => `<tr><td>${U.esc(it.name)}</td><td class="num">${U.num(it.qty, 0)}</td><td class="num">${U.money(it.price)}</td><td class="num">${U.money((it.price * it.qty) - (it.discount || 0) + (it.taxAmount || 0))}</td></tr>`).join('');
    const body = `<div class="receipt">
      <div class="r-head"><strong>${U.esc(s.company)}</strong><span>${U.esc(s.legalName)}</span><span>الرقم الضريبي: ${U.esc(s.taxNumber)}</span><span>${U.esc(s.address)}</span><span>${U.esc(s.phone)}</span></div>
      <div class="r-meta"><span>${inv.type === 'quote' ? 'عرض سعر' : inv.type === 'return' ? 'مرتجع' : 'فاتورة ضريبية مبسطة'}</span><span>${U.esc(inv.number)}</span></div>
      <div class="r-meta"><span>${U.formatDate(inv.date, 'numeric')} — ${U.formatTime(inv.createdAt)}</span><span>${U.esc(inv.customerName || 'عميل نقدي')}</span></div>
      ${orderLabel(inv) ? `<div class="r-meta"><span>نوع الطلب</span><span>${U.esc(orderLabel(inv))}</span></div>` : ''}
      ${inv.orderNumber ? `<div class="r-meta"><span>رقم الطلب</span><span>${U.esc(inv.orderNumber)}</span></div>` : ''}
      <table><thead><tr><th>الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="r-tot"><span>المجموع</span><b>${U.money(inv.subtotal)}</b></div>
      ${inv.discount ? `<div class="r-tot"><span>الخصم</span><b>- ${U.money(inv.discount)}</b></div>` : ''}
      <div class="r-tot"><span>الضريبة ${U.num(s.vatRate, 0)}%</span><b>${U.money(inv.tax)}</b></div>
      <div class="r-tot r-grand"><span>الإجمالي</span><b>${U.money(inv.total)}</b></div>
      <div class="r-tot"><span>طريقة الدفع</span><b>${Accounting.methodLabel(inv.method)}</b></div>
      ${inv.type !== 'return' ? `<div class="r-tot"><span>المدفوع</span><b>${U.money(inv.paid)}</b></div>` : ''}
      ${inv.type !== 'return' && inv.due > 0.01 ? `<div class="r-tot"><span>المتبقي</span><b>${U.money(inv.due)}</b></div>` : ''}
      ${inv.zatca ? `<div class="r-qr">${zatcaQr(inv, 104)}<span>رمز ZATCA — Sandbox</span></div>` : ''}
      ${U.barcodeHtml(inv.number.replace(/[^A-Za-z0-9]/g, ''))}
      <div class="r-foot">${U.esc(s.footer)}<br>${U.esc(s.phone)} • ${U.esc(s.website || '')}</div>
    </div>`;
    U.printDoc('إيصال — ' + inv.number, body, { width: '80mm' });
  };

  /* Mock ESC/POS thermal print with a job preview. */
  Actions.thermalPrint = function (inv) {
    if (!window.Printer) { UI.toast('وحدة الطباعة الحرارية غير محمّلة', 'error'); return; }
    let job;
    try {
      job = Printer.receipt(inv);
    } catch (e) {
      UI.toast(e.message || 'تعذر إنشاء مهمة الطباعة', 'error');
      return;
    }
    UI.modal({
      size: 'md',
      title: 'مهمة طباعة حرارية — محاكاة',
      subtitle: `${job.number || ''} • ${job.printer || 'Mock Printer'} • ${job.width || 80}مم`,
      icon: 'print',
      body: `<div class="info-banner warn">${U.icon('alert', 17)}<div><strong>وضع المحاكاة (Mock ESC/POS):</strong> لم تُرسل بيانات إلى طابعة حقيقية. حُفظت المهمة في سجل الطباعة ويمكن معاينتها أو إعادة طباعتها.</div></div>
        <div class="detail-grid mt-2">
          <div class="detail-item"><div class="detail-label">حجم المهمة</div><div class="detail-value">${U.num(job.bytes || 0, 0)} بايت</div></div>
          <div class="detail-item"><div class="detail-label">الاتصال</div><div class="detail-value">${U.esc(job.connection || 'mock')}</div></div>
          <div class="detail-item"><div class="detail-label">عدد النسخ</div><div class="detail-value">${U.num(job.copies || 1, 0)}</div></div>
          <div class="detail-item"><div class="detail-label">الحالة</div><div class="detail-value"><span class="badge badge-gold">Mock / printed</span></div></div>
        </div>
        <div class="fw-800 mt-3 mb-1" style="font-size:11px">معاينة محتوى ESC/POS</div>
        <pre class="code-block" style="max-height:300px;overflow:auto;white-space:pre-wrap;direction:rtl;text-align:right;font-size:9.5px">${U.esc(String(job.text || '').replace(/\x1B[^A-Za-z]*[A-Za-z]/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''))}</pre>`,
      footer: `<button class="btn btn-secondary" data-close>إغلاق</button><button class="btn btn-primary" data-reprint>${U.icon('print', 15)} إعادة الطباعة (محاكاة)</button>`,
      onMount(modalEl, close) {
        modalEl.querySelector('[data-close]').addEventListener('click', close);
        modalEl.querySelector('[data-reprint]').addEventListener('click', () => {
          try {
            Printer.reprint(job.id);
            UI.toast('تمت إعادة الطباعة (محاكاة)', 'success');
            close();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
    return job;
  };

  Actions.printStatement = function (type, partyId, from, to) {
    const party = type === 'customer' ? Store.customer(partyId) : Store.supplier(partyId);
    if (!party) return;
    const ledger = Accounting.partyLedger(type, partyId, from, to);
    const rows = ledger.rows.map((r) => `<tr><td>${U.formatDate(r.date)}</td><td>${U.esc(r.number)}</td><td>${U.esc(r.description)}</td><td class="num">${r.debit ? U.money(r.debit) : '—'}</td><td class="num">${r.credit ? U.money(r.credit) : '—'}</td><td class="num">${U.money(Math.abs(r.balance))} ${r.balance >= 0 ? 'مدين' : 'دائن'}</td></tr>`).join('');
    const body = `<div class="doc-head">${docBrand()}<div class="doc-meta"><h2>كشف حساب ${type === 'customer' ? 'عميل' : 'مورد'}</h2><div>${U.esc(party.name)}</div><div>الفترة: ${U.formatDate(from)} — ${U.formatDate(to)}</div></div></div>
      <div class="doc-parties"><div class="party"><div class="lbl">${type === 'customer' ? 'العميل' : 'المورد'}</div><strong>${U.esc(party.name)}</strong><span>${U.esc(party.phone || '')}</span><span>${U.esc(party.address || '')}</span></div>
      <div class="party"><div class="lbl">ملخص الرصيد</div><strong>${U.money(Math.abs(ledger.closing))} ${ledger.closing >= 0 ? 'مدين' : 'دائن'}</strong><span>رصيد افتتاحي: ${U.money(Math.abs(ledger.opening))}</span></div></div>
      <table class="items"><thead><tr><th>التاريخ</th><th>المستند</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center">لا توجد حركات في الفترة</td></tr>'}</tbody></table>
      <div class="doc-foot"><div>${U.esc(company().company)} — ${U.esc(company().phone)}</div><div>تم الطباعة في ${U.formatDate(U.today(), 'full')}</div></div>`;
    U.printDoc('كشف حساب — ' + party.name, body, { width: '210mm' });
  };

  /* ------------------------------------------------------------------
     Journal entry
     ------------------------------------------------------------------ */
  Actions.openJournal = function (entryOrId) {
    const entry = typeof entryOrId === 'string' ? Store.data.journal.find((j) => j.id === entryOrId) : entryOrId;
    if (!entry) { UI.toast('القيد غير موجود', 'error'); return; }
    const rows = entry.lines.map((l) => `<tr>
      <td><span class="code">${U.esc(l.accountCode)}</span></td>
      <td><div class="cell-main">${U.esc(l.accountName)}</div>${l.partyType ? `<div class="cell-sub">${U.esc(Store.partyName(l.partyType, l.partyId))}</div>` : (l.memo ? `<div class="cell-sub">${U.esc(l.memo)}</div>` : '')}</td>
      <td class="num">${l.debit ? U.money(l.debit) : '—'}</td>
      <td class="num">${l.credit ? U.money(l.credit) : '—'}</td>
    </tr>`).join('');
    const dr = U.sum(entry.lines, (l) => l.debit), cr = U.sum(entry.lines, (l) => l.credit);
    UI.modal({
      size: 'lg',
      title: `القيد المحاسبي ${entry.number}`,
      subtitle: `${U.formatDate(entry.date, 'long')} • ${entry.createdBy || ''}`,
      icon: 'book',
      body: `<div class="info-banner ${Math.abs(dr - cr) < 0.01 ? 'success' : 'warn'}">${U.icon(Math.abs(dr - cr) < 0.01 ? 'checkCircle' : 'alert', 17)}<div><strong>${U.esc(entry.description)}</strong><br>المصدر: ${U.esc(entry.sourceType || 'يدوي')} ${entry.sourceNumber ? '— ' + U.esc(entry.sourceNumber) : ''}</div></div>
        <div class="table-wrap mt-2"><table class="table compact">
          <thead><tr><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">الإجمالي</td><td class="num">${U.money(dr)}</td><td class="num">${U.money(cr)}</td></tr></tfoot>
        </table></div>`,
      footer: `<span class="foot-info">القيد ${Math.abs(dr - cr) < 0.01 ? 'متوازن' : 'غير متوازن'}</span><button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button><button class="btn btn-primary btn-sm" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-print]').addEventListener('click', () => {
          const body = `<div class="doc-head">${docBrand()}<div class="doc-meta"><h2>قيد يومية</h2><div>${U.esc(entry.number)}</div><div>${U.formatDate(entry.date, 'full')}</div></div></div>
            <h3 style="margin-bottom:8px">${U.esc(entry.description)}</h3>
            <table class="items"><thead><tr><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="doc-foot"><div>أُنشئ بواسطة ${U.esc(entry.createdBy || '')}</div><div>${U.esc(company().company)}</div></div>`;
          U.printDoc('قيد يومية — ' + entry.number, body, { width: '210mm' });
        });
      }
    });
  };

  /* ------------------------------------------------------------------
     Sale return
     ------------------------------------------------------------------ */
  Actions.openSaleReturn = function (inv) {
    if (!inv || inv.type !== 'sale') return;
    const previous = {};
    Store.data.invoices.filter((i) => i.type === 'return' && i.originalInvoiceId === inv.id)
      .forEach((r) => r.items.forEach((it) => { previous[it.productId] = (previous[it.productId] || 0) + it.qty; }));
    const availableItems = inv.items.map((it) => ({ ...it, available: U.round2(it.qty - (previous[it.productId] || 0)) })).filter((it) => it.available > 0);
    if (!availableItems.length) { UI.toast('تم إرجاع جميع أصناف هذه الفاتورة مسبقاً', 'warning'); return; }
    const canCredit = !!inv.customerId;
    const rows = availableItems.map((it) => `<tr>
      <td><div class="product-cell"><div class="thumb sm">${it.emoji || '📦'}</div><div><div class="cell-main">${U.esc(it.name)}</div><div class="cell-sub">متاح للإرجاع ${U.num(it.available, 0)} ${U.esc(it.unit || '')}</div></div></div></td>
      <td class="num">${U.num(it.available, 0)}</td>
      <td style="width:110px"><input class="input sm num" type="number" min="0" max="${it.available}" step="1" value="0" data-qty="${it.productId}" /></td>
      <td class="num" data-line-total="${it.productId}">${U.money(0)}</td>
    </tr>`).join('');
    const modal = UI.modal({
      size: 'lg',
      title: `إرجاع من الفاتورة ${inv.number}`,
      subtitle: `العميل: ${inv.customerName || 'عميل نقدي'} • الإجمالي الأصلي ${U.money(inv.total)}`,
      icon: 'refresh',
      body: `<div class="info-banner warn">${U.icon('alert', 17)}<div>سيتم إعادة الكميات إلى المخزون وإنشاء قيد محاسبي عكسي تلقائياً. لا يمكن إرجاع أكثر من الكمية المتاحة.</div></div>
        <div class="table-wrap mt-2"><table class="table compact">
          <thead><tr><th>الصنف</th><th>المباع</th><th>كمية الإرجاع</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="form-grid mt-2">
          <div class="field"><label>طريقة الاسترداد</label><select class="select" name="refundMethod">
            <option value="cash">نقدي من الصندوق</option>
            <option value="card">إلى الحساب البنكي</option>
            ${canCredit ? '<option value="credit">خصم من رصيد العميل</option>' : ''}
          </select></div>
          <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
          <div class="field full"><label>سبب الإرجاع</label><input class="input" name="notes" placeholder="مثال: منتج تالف / غير مطابق" /></div>
        </div>
        <div class="pay-summary mt-2"><div class="ps-row total"><span>إجمالي المرتجع التقديري</span><b data-refund-total>0.00</b></div></div>`,
      footer: `<span class="foot-info">سيُصدر مرتجع برقم تسلسلي مستقل</span><button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-confirm>${U.icon('refresh', 15)} تأكيد الإرجاع</button>`,
      onMount(modalEl, close) {
        const inputs = Array.from(modalEl.querySelectorAll('[data-qty]'));
        const calc = () => {
          let total = 0;
          inputs.forEach((inp) => {
            const it = availableItems.find((x) => x.productId === inp.dataset.qty);
            const qty = U.clamp(U.parseNum(inp.value), 0, it.available);
            const net = Accounting.saleLineNet(inv, it);
            const unit = (net / it.qty) * (1 + (it.taxRate || 0) / 100);
            const line = U.round2(unit * qty);
            total += line;
            const cell = modalEl.querySelector(`[data-line-total="${it.productId}"]`);
            if (cell) cell.textContent = U.money(line);
          });
          const out = modalEl.querySelector('[data-refund-total]');
          if (out) out.textContent = U.money(total);
        };
        inputs.forEach((inp) => inp.addEventListener('input', calc));
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-confirm]').addEventListener('click', () => {
          const items = inputs.map((inp) => ({ productId: inp.dataset.qty, qty: U.parseNum(inp.value) })).filter((x) => x.qty > 0);
          if (!items.length) { UI.toast('حدد كمية واحدة على الأقل', 'warning'); return; }
          const data = UI.values(modalEl);
          try {
            const ret = Business.createSaleReturn({
              invoiceId: inv.id, items, refundMethod: data.refundMethod, date: data.date, notes: data.notes
            });
            close();
            UI.toast(`تم إنشاء المرتجع ${ret.number} بنجاح`, 'success');
            refresh();
            setTimeout(() => Actions.openInvoice(ret.id), 200);
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
    return modal;
  };

  /* ------------------------------------------------------------------
     Purchase return
     ------------------------------------------------------------------ */
  Actions.openPurchaseReturn = function (pur) {
    if (!pur || pur.type !== 'purchase') return;
    const previous = {};
    Store.data.purchases.filter((p) => p.type === 'return' && p.originalPurchaseId === pur.id)
      .forEach((r) => r.items.forEach((it) => { previous[it.productId] = (previous[it.productId] || 0) + it.qty; }));
    const availableItems = pur.items.map((it) => ({ ...it, available: U.round2(it.qty - (previous[it.productId] || 0)) })).filter((it) => it.available > 0);
    if (!availableItems.length) { UI.toast('تم إرجاع جميع أصناف فاتورة الشراء مسبقاً', 'warning'); return; }
    const rows = availableItems.map((it) => `<tr>
      <td><div class="product-cell"><div class="thumb sm">${it.emoji || '📦'}</div><div><div class="cell-main">${U.esc(it.name)}</div><div class="cell-sub">متاح ${U.num(it.available, 0)} ${U.esc(it.unit || '')}</div></div></div></td>
      <td class="num">${U.num(it.available, 0)}</td>
      <td style="width:110px"><input class="input sm num" type="number" min="0" max="${it.available}" step="1" value="0" data-qty="${it.productId}" /></td>
      <td class="num" data-line-total="${it.productId}">${U.money(0)}</td>
    </tr>`).join('');
    UI.modal({
      size: 'lg',
      title: `مرتجع شراء — ${pur.number}`,
      subtitle: `المورد: ${pur.supplierName}`,
      icon: 'truck',
      body: `<div class="table-wrap"><table class="table compact">
        <thead><tr><th>الصنف</th><th>المستلم</th><th>كمية الإرجاع</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="form-grid mt-2">
          <div class="field"><label>طريقة التسوية</label><select class="select" name="refundMethod"><option value="credit">خصم من رصيد المورد</option><option value="cash">استلام نقدي</option><option value="card">إلى الحساب البنكي</option></select></div>
          <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
          <div class="field full"><label>سبب الإرجاع</label><input class="input" name="notes" placeholder="مثال: تالف / خطأ في التوريد" /></div>
        </div>`,
      footer: `<span class="foot-info">سيتم خصم الكميات من المخزون</span><button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-confirm>${U.icon('refresh', 15)} تأكيد المرتجع</button>`,
      onMount(modalEl, close) {
        const inputs = Array.from(modalEl.querySelectorAll('[data-qty]'));
        const calc = () => {
          let total = 0;
          inputs.forEach((inp) => {
            const it = availableItems.find((x) => x.productId === inp.dataset.qty);
            const qty = U.clamp(U.parseNum(inp.value), 0, it.available);
            const unit = (it.unitNet || it.cost) * (1 + (it.taxRate || 0) / 100);
            const line = U.round2(unit * qty);
            total += line;
            const cell = modalEl.querySelector(`[data-line-total="${it.productId}"]`);
            if (cell) cell.textContent = U.money(line);
          });
        };
        inputs.forEach((inp) => inp.addEventListener('input', calc));
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-confirm]').addEventListener('click', () => {
          const items = inputs.map((inp) => ({ productId: inp.dataset.qty, qty: U.parseNum(inp.value) })).filter((x) => x.qty > 0);
          if (!items.length) { UI.toast('حدد كمية واحدة على الأقل', 'warning'); return; }
          const data = UI.values(modalEl);
          try {
            const ret = Business.createPurchaseReturn({
              purchaseId: pur.id, items, refundMethod: data.refundMethod, date: data.date, notes: data.notes
            });
            close();
            UI.toast(`تم إنشاء مرتجع الشراء ${ret.number}`, 'success');
            refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  };

  /* ------------------------------------------------------------------
     Party statement
     ------------------------------------------------------------------ */
  Actions.openStatement = function (type, partyId) {
    const party = type === 'customer' ? Store.customer(partyId) : Store.supplier(partyId);
    if (!party) { UI.toast('الجهة غير موجودة', 'error'); return; }
    let from = U.addDays(U.today(), -90), to = U.today();
    const modal = UI.modal({
      size: 'xl',
      title: `كشف حساب — ${party.name}`,
      subtitle: `${type === 'customer' ? 'عميل' : 'مورد'} • ${party.phone || ''}`,
      icon: 'file',
      body: `<div class="balance-hero mb-2">
        <div><div class="bh-lbl">${type === 'customer' ? 'الرصيد المستحق على العميل' : 'الرصيد المستحق للمورد'}</div><div class="bh-val" data-balance>${U.money(type === 'customer' ? Accounting.customerBalance(partyId) : Accounting.supplierBalance(partyId))}</div></div>
        <div class="bh-icon">${U.icon(type === 'customer' ? 'user' : 'truck', 22)}</div>
      </div>
      <div class="toolbar" style="border:1px solid var(--line);border-radius:11px;padding:9px 11px;margin-bottom:12px">
        <label class="text-xs text-muted">من</label><input class="input sm" type="date" data-from value="${from}" style="width:auto" />
        <label class="text-xs text-muted">إلى</label><input class="input sm" type="date" data-to value="${to}" style="width:auto" />
        <button class="btn btn-secondary btn-sm" data-refresh>${U.icon('refresh', 14)} تحديث</button>
        <div class="toolbar-spacer"></div>
        <button class="btn btn-ghost btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
      </div>
      <div class="table-wrap" data-statement></div>`,
      footer: `<button class="btn btn-secondary" data-close>إغلاق</button>
        ${type === 'customer' ? `<button class="btn btn-primary" data-receipt>${U.icon('download', 15)} سند قبض</button>` : `<button class="btn btn-primary" data-payment>${U.icon('upload', 15)} سند صرف</button>`}`,
      onMount(modalEl, close) {
        const render = () => {
          const fromV = modalEl.querySelector('[data-from]').value;
          const toV = modalEl.querySelector('[data-to]').value;
          const ledger = Accounting.partyLedger(type, partyId, fromV, toV);
          const rows = ledger.rows.map((r) => `<tr>
            <td class="nowrap">${U.formatDate(r.date)}</td>
            <td><span class="code">${U.esc(r.number)}</span></td>
            <td><div class="cell-main">${U.esc(r.description)}</div>${r.memo ? `<div class="cell-sub">${U.esc(r.memo)}</div>` : ''}</td>
            <td class="num">${r.debit ? U.money(r.debit) : '—'}</td>
            <td class="num">${r.credit ? U.money(r.credit) : '—'}</td>
            <td class="num fw-800 ${r.balance >= 0 ? '' : 'text-success'}">${U.money(Math.abs(r.balance))} <span class="text-muted text-xs">${r.balance >= 0 ? (type === 'customer' ? 'مدين' : 'دائن') : (type === 'customer' ? 'دائن' : 'مدين')}</span></td>
          </tr>`).join('');
          modalEl.querySelector('[data-statement]').innerHTML = `<table class="table compact">
            <thead><tr><th>التاريخ</th><th>المستند</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead>
            <tbody>
              <tr style="background:var(--card-2)"><td colspan="5" class="fw-700">رصيد افتتاحي</td><td class="num fw-800">${U.money(Math.abs(ledger.opening))}</td></tr>
              ${rows || '<tr><td colspan="6" class="text-muted" style="text-align:center;padding:22px">لا توجد حركات في الفترة المحددة</td></tr>'}
            </tbody>
            <tfoot><tr><td colspan="5">الرصيد الختامي</td><td class="num">${U.money(Math.abs(ledger.closing))} <span class="text-muted text-xs">${ledger.closing >= 0 ? (type === 'customer' ? 'مدين' : 'دائن') : (type === 'customer' ? 'دائن' : 'مدين')}</span></td></tr></tfoot>
          </table>`;
          const bal = modalEl.querySelector('[data-balance]');
          bal.textContent = U.money(type === 'customer' ? Accounting.customerBalance(partyId) : Accounting.supplierBalance(partyId));
          bal.classList.toggle('negative', (type === 'customer' ? Accounting.customerBalance(partyId) : Accounting.supplierBalance(partyId)) < 0);
        };
        modalEl.querySelector('[data-refresh]').addEventListener('click', render);
        modalEl.querySelector('[data-print]').addEventListener('click', () => Actions.printStatement(type, partyId, modalEl.querySelector('[data-from]').value, modalEl.querySelector('[data-to]').value));
        modalEl.querySelector('[data-close]').addEventListener('click', close);
        if (modalEl.querySelector('[data-receipt]')) modalEl.querySelector('[data-receipt]').addEventListener('click', () => { close(); Actions.openReceipt(partyId); });
        if (modalEl.querySelector('[data-payment]')) modalEl.querySelector('[data-payment]').addEventListener('click', () => { close(); Actions.openSupplierPayment(partyId); });
        render();
      }
    });
    return modal;
  };

  /* ------------------------------------------------------------------
     Receipt / supplier payment / expense
     ------------------------------------------------------------------ */
  Actions.openReceipt = function (customerId, opts = {}) {
    const customers = Store.data.customers.filter((c) => c.active !== false);
    if (!customers.length) { UI.toast('أضف عميلاً أولاً', 'warning'); return; }
    const selectedId = customerId || customers[0].id;
    const selected = Store.customer(selectedId);
    const balance = Accounting.customerBalance(selectedId);
    UI.modal({
      size: 'sm',
      title: 'سند قبض — تحصيل من عميل',
      subtitle: 'سيتم ترحيل القيد إلى الصندوق أو البنك تلقائياً',
      icon: 'download',
      body: `<div class="form-grid">
        <div class="field full"><label>العميل <span class="req">*</span></label><select class="select" name="customerId">${customers.map((c) => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select></div>
        <div class="field full"><div class="info-banner success">${U.icon('info', 17)}<div>الرصيد الحالي: <strong data-current-balance>${U.money(balance)}</strong></div></div></div>
        <div class="field"><label>المبلغ <span class="req">*</span></label><input class="input num" name="amount" type="number" step="0.01" min="0" placeholder="0.00" value="${opts.amount || ''}" /></div>
        <div class="field"><label>طريقة التحصيل</label><select class="select" name="method"><option value="cash">نقدي — الصندوق</option><option value="card">شبكة / بنك</option></select></div>
        <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field"><label>ملاحظات</label><input class="input" name="notes" placeholder="اختياري" /></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ السند</button>`,
      onMount(modalEl, close) {
        const sel = modalEl.querySelector('[name=customerId]');
        sel.addEventListener('change', () => {
          const b = Accounting.customerBalance(sel.value);
          modalEl.querySelector('[data-current-balance]').textContent = U.money(b);
        });
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          try {
            const p = Business.createReceipt({ customerId: data.customerId, amount: data.amount, method: data.method, date: data.date, notes: data.notes });
            close();
            UI.toast(`تم تسجيل سند القبض ${p.number}`, 'success');
            if (opts.onDone) opts.onDone(p); else refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  };

  Actions.openSupplierPayment = function (supplierId, opts = {}) {
    const suppliers = Store.data.suppliers.filter((s) => s.active !== false);
    if (!suppliers.length) { UI.toast('أضف مورداً أولاً', 'warning'); return; }
    const selectedId = supplierId || suppliers[0].id;
    const balance = Accounting.supplierBalance(selectedId);
    UI.modal({
      size: 'sm',
      title: 'سند صرف — سداد لمورد',
      subtitle: 'سيتم خصم المبلغ من الصندوق أو البنك',
      icon: 'upload',
      body: `<div class="form-grid">
        <div class="field full"><label>المورد <span class="req">*</span></label><select class="select" name="supplierId">${suppliers.map((s) => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${U.esc(s.name)}</option>`).join('')}</select></div>
        <div class="field full"><div class="info-banner warn">${U.icon('info', 17)}<div>الرصيد المستحق للمورد: <strong data-current-balance>${U.money(balance)}</strong></div></div></div>
        <div class="field"><label>المبلغ <span class="req">*</span></label><input class="input num" name="amount" type="number" step="0.01" min="0" placeholder="0.00" value="${opts.amount || ''}" /></div>
        <div class="field"><label>طريقة الدفع</label><select class="select" name="method"><option value="card">بنك</option><option value="cash">نقدي — الصندوق</option></select></div>
        <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field"><label>ملاحظات</label><input class="input" name="notes" placeholder="اختياري" /></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ السند</button>`,
      onMount(modalEl, close) {
        const sel = modalEl.querySelector('[name=supplierId]');
        sel.addEventListener('change', () => {
          modalEl.querySelector('[data-current-balance]').textContent = U.money(Accounting.supplierBalance(sel.value));
        });
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          try {
            const p = Business.createSupplierPayment({ supplierId: data.supplierId, amount: data.amount, method: data.method, date: data.date, notes: data.notes });
            close();
            UI.toast(`تم تسجيل سند الصرف ${p.number}`, 'success');
            if (opts.onDone) opts.onDone(p); else refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  };

  Actions.openExpense = function (opts = {}) {
    const accounts = Store.data.accounts.filter((a) => !a.isGroup && a.type === 'expense' && a.id !== Accounting.ACC.cogs);
    UI.modal({
      size: 'sm',
      title: 'تسجيل مصروف',
      subtitle: 'يُرحّل تلقائياً إلى حساب المصروف والضريبة',
      icon: 'wallet',
      body: `<div class="form-grid">
        <div class="field full"><label>حساب المصروف <span class="req">*</span></label><select class="select" name="accountId">${accounts.map((a) => `<option value="${a.id}">${U.esc(a.name)}</option>`).join('')}</select></div>
        <div class="field full"><label>الوصف <span class="req">*</span></label><input class="input" name="description" placeholder="مثال: فاتورة كهرباء شهر أكتوبر" /></div>
        <div class="field"><label>المبلغ قبل الضريبة <span class="req">*</span></label><input class="input num" name="amount" type="number" step="0.01" min="0" placeholder="0.00" /></div>
        <div class="field"><label>نسبة الضريبة</label><select class="select" name="taxRate"><option value="15">15%</option><option value="0">بدون ضريبة</option></select></div>
        <div class="field"><label>طريقة الدفع</label><select class="select" name="method"><option value="bank">بنك</option><option value="cash">نقدي — الصندوق</option></select></div>
        <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field full"><label>ملاحظات</label><input class="input" name="notes" placeholder="اختياري" /></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ المصروف</button>`,
      onMount(modalEl, close) {
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          try {
            const e = Business.createExpense({
              accountId: data.accountId, description: data.description, amount: data.amount,
              taxRate: data.taxRate, method: data.method, date: data.date, notes: data.notes
            });
            close();
            UI.toast(`تم تسجيل المصروف ${e.number}`, 'success');
            if (opts.onDone) opts.onDone(e); else refresh();
          } catch (err) { UI.toast(err.message, 'error'); }
        });
      }
    });
  };
})();
