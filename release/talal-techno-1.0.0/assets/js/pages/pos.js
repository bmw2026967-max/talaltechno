/* ==========================================================================
   Page — Point of Sale (POS) for restaurants
   Order types, tables, open checks, kitchen tickets, split payments,
   Saudi payment adapters and ZATCA sandbox receipt QR.
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = {
    cart: [], customerId: null, discount: 0, notes: '',
    search: '', category: 'all', quoteId: null,
    orderType: 'dine_in', tableId: null, orderId: null,
    customerName: '', customerPhone: ''
  };
  let viewRef = null;
  let keysBound = false;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  const settings = () => Store.data.settings;

  function resetState(keepTable) {
    state.cart = []; state.customerId = null; state.discount = 0;
    state.notes = ''; state.search = ''; state.category = 'all'; state.quoteId = null;
    state.orderId = null; state.customerName = ''; state.customerPhone = '';
    if (!keepTable) {
      state.tableId = null;
      state.orderType = settings().defaultOrderType || 'dine_in';
    }
  }

  function products() {
    return Store.menuProducts().filter((p) => p.active !== false);
  }

  function filteredProducts() {
    const q = norm(state.search);
    return products().filter((p) => {
      if (state.category !== 'all' && p.categoryId !== state.category) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || norm(p.sku).includes(q) || String(p.barcode || '').includes(q);
    });
  }

  function cartItems() {
    return state.cart.map((l) => ({
      productId: l.productId, qty: l.qty, price: l.price,
      discount: l.discount || 0, taxRate: l.taxRate
    }));
  }

  function calcTotals() {
    const totals = Orders.calcTotals(cartItems(), {
      orderType: state.orderType,
      discount: state.discount,
      deliveryFee: state.orderType === 'delivery' ? Number(settings().deliveryFee) || 0 : 0
    });
    return totals;
  }

  function cartCount() { return state.cart.reduce((a, l) => a + l.qty, 0); }

  function availableOf(p) {
    return Store.availableOf ? Store.availableOf(p) : (Number(p.stock) || 0);
  }

  function addProduct(id, qty = 1) {
    const p = Store.product(id);
    if (!p || p.active === false || p.type === 'raw') return;
    const line = state.cart.find((l) => l.productId === id);
    const current = line ? line.qty : 0;
    if (!settings().allowNegativeStock && current + qty > availableOf(p) + 0.001) {
      UI.toast(availableOf(p) <= 0 ? `«${p.name}» غير متوفر حالياً` : `الكمية المتاحة من «${p.name}» هي ${U.num(availableOf(p), 2)} فقط`, 'warning');
      return;
    }
    if (line) line.qty = U.round2(line.qty + qty);
    else state.cart.push({ productId: id, qty, price: p.price, discount: 0, taxRate: Number(p.taxRate) || 0 });
    renderCart();
  }

  function renderCats() {
    const box = viewRef && viewRef.querySelector('#pos-cats');
    if (!box) return;
    const all = products();
    const chips = [`<button class="chip ${state.category === 'all' ? 'active' : ''}" data-cat="all">الكل <span class="count">${all.length}</span></button>`];
    Store.data.categories.forEach((c) => {
      const count = all.filter((p) => p.categoryId === c.id).length;
      if (!count) return;
      chips.push(`<button class="chip ${state.category === c.id ? 'active' : ''}" data-cat="${c.id}"><span style="width:7px;height:7px;border-radius:50%;background:${c.color}"></span>${U.esc(c.name)} <span class="count">${count}</span></button>`);
    });
    box.innerHTML = chips.join('');
  }

  function renderProducts() {
    const box = viewRef && viewRef.querySelector('#pos-grid');
    if (!box) return;
    const list = filteredProducts();
    if (!list.length) {
      box.innerHTML = `<div class="pos-empty-products">${UI.empty('search', 'لا توجد أصناف مطابقة', 'جرّب اسماً آخر أو امسح الباركود')}</div>`;
      return;
    }
    box.innerHTML = list.map((p) => {
      const avail = availableOf(p);
      const out = avail <= 0 && !settings().allowNegativeStock;
      const low = avail > 0 && avail <= 5;
      const station = (Orders.STATIONS[p.station] || {}).label || '';
      const stockLabel = out ? 'نفد' : low ? `متبقي ${U.num(avail, 2)}` : `${U.num(avail, 0)} متاح`;
      return `<button class="product-card ${out ? 'disabled' : ''}" data-add="${p.id}" ${out ? 'disabled' : ''} title="${U.esc(p.name)}">
        <span class="pc-add">${U.icon('plus', 13)}</span>
        <span class="pc-emoji">${p.emoji || '🍽️'}</span>
        <span class="pc-name">${U.esc(p.name)}</span>
        <span class="pc-foot"><span class="pc-price">${U.money(p.price)} <small>${U.esc(station)}</small></span>
          <span class="pc-stock ${out ? 'out' : low ? 'low' : ''}">${stockLabel}</span></span>
      </button>`;
    }).join('');
  }

  function customerInfoHtml() {
    const c = state.customerId ? Store.customer(state.customerId) : null;
    if (!c) return `<div class="cc-info">${U.icon('user', 12)} بيع نقدي مباشر — بدون تسجيل عميل</div>`;
    const bal = Accounting.customerBalance(c.id);
    const limit = Number(c.creditLimit) || 0;
    const over = limit > 0 && bal >= limit;
    return `<div class="cc-info" style="flex-wrap:wrap">${U.icon('user', 12)} الرصيد: <b>${U.money(bal)}</b> ${limit ? `• الحد ${U.moneyShort(limit)}` : ''} ${over ? '<span class="badge badge-amber" style="font-size:8px">تجاوز الحد</span>' : ''} • ${U.num(c.loyaltyPoints || 0, 0)} نقطة</div>`;
  }

  function tableOptions() {
    const list = Tables.all(App.branchId).filter((t) => Tables.status(t) === 'free' || t.id === state.tableId);
    if (!list.length) return `<option value="">لا توجد طاولات متاحة</option>`;
    return `<option value="">اختر طاولة…</option>` + list.map((t) =>
      `<option value="${t.id}" ${state.tableId === t.id ? 'selected' : ''}>${U.esc(t.name)} — ${U.esc(t.zone || 'الصالة')} (${U.num(t.capacity)} مقاعد)</option>`).join('');
  }

  function orderTypeBar() {
    const types = Object.keys(Orders.TYPES);
    return `<div class="pos-orderbar">
      <div class="pos-types">${types.map((id) => {
        const t = Orders.TYPES[id];
        return `<button type="button" class="pos-type ${state.orderType === id ? 'active' : ''}" data-order-type="${id}">${U.icon(t.icon, 15)}<span>${t.label}</span></button>`;
      }).join('')}</div>
      ${state.orderType === 'dine_in' ? `<div class="pos-table-row">${U.icon('grid', 14)}<select class="select" id="pos-table" ${state.orderId ? 'disabled' : ''}>${tableOptions()}</select></div>` : ''}
      ${state.orderId ? `<div class="pos-open-banner">${U.icon('receipt', 14)}<span>طلب مفتوح <b>${U.esc((Store.order(state.orderId) || {}).number || '')}</b> — ${U.esc((Store.order(state.orderId) || {}).tableName || '')}</span><button type="button" class="btn btn-ghost btn-xs" data-unlink-order>فصل</button></div>` : ''}
    </div>`;
  }

  function renderCart() {
    const box = viewRef && viewRef.querySelector('#pos-cart');
    if (!box) return;
    const totals = calcTotals();
    const count = cartCount();
    const customer = state.customerId ? Store.customer(state.customerId) : null;
    const customers = Store.data.customers.filter((c) => c.active !== false);
    const items = state.cart.map((line) => {
      const p = Store.product(line.productId);
      if (!p) return '';
      return `<div class="cart-item">
        <div class="thumb sm">${p.emoji || '🍽️'}</div>
        <div class="ci-main"><strong>${U.esc(p.name)}</strong><span>${U.money(line.price)} × ${U.num(line.qty, 0)}</span></div>
        <div class="qty-stepper"><button type="button" data-dec="${p.id}" aria-label="تقليل">${U.icon('minus', 12)}</button><span>${U.num(line.qty, 0)}</span><button type="button" data-inc="${p.id}" aria-label="زيادة">${U.icon('plus', 12)}</button></div>
        <div class="ci-total">${U.money(line.qty * line.price)}</div>
        <button type="button" class="ci-del" data-del="${p.id}" aria-label="حذف">${U.icon('x', 13)}</button>
      </div>`;
    }).join('');
    box.innerHTML = `
      <div class="cart-head">
        <span class="ch-title">سلة البيع</span><span class="ch-count">${U.num(count, 0)} صنف</span>
        <div class="ch-actions">
          <button class="btn-icon btn-ghost" data-hold title="تعليق البيع (F8)">${U.icon('clock', 16)}</button>
          <button class="btn-icon btn-ghost" data-clear title="مسح السلة">${U.icon('trash', 16)}</button>
        </div>
      </div>
      ${orderTypeBar()}
      <div class="cart-customer">
        <select class="select" id="pos-customer">
          <option value="">عميل نقدي — بدون تسجيل</option>
          ${customers.map((c) => `<option value="${c.id}" ${state.customerId === c.id ? 'selected' : ''}>${U.esc(c.name)}${c.phone ? ' — ' + U.esc(c.phone) : ''}</option>`).join('')}
        </select>
        ${customerInfoHtml()}
      </div>
      <div class="cart-items">
        ${items || `<div class="cart-empty"><div class="ce-ico">${U.icon('cart', 25)}</div><strong>السلة فارغة</strong><span>اختر صنفاً من القائمة لإضافته</span></div>`}
      </div>
      <div class="pos-summary">
        <div class="sum-row"><span>المجموع (${U.num(state.cart.length, 0)} صنف)</span><b>${U.money(totals.subtotal)}</b></div>
        ${totals.serviceCharge ? `<div class="sum-row"><span>رسوم الخدمة (${U.num(settings().serviceChargeRate)}%)</span><b>${U.money(totals.serviceCharge)}</b></div>` : ''}
        ${totals.deliveryFee ? `<div class="sum-row"><span>رسوم التوصيل</span><b>${U.money(totals.deliveryFee)}</b></div>` : ''}
        <div class="sum-row"><span>الخصم ${totals.discount ? `<button class="btn btn-ghost btn-sm" style="height:20px;padding:0 5px;font-size:9px" data-discount>تعديل</button>` : `<button class="btn btn-ghost btn-sm" style="height:20px;padding:0 5px;font-size:9px" data-discount>إضافة</button>`}</span><b class="discount-val">${totals.discount ? '- ' + U.money(totals.discount) : U.money(0)}</b></div>
        <div class="sum-row"><span>ضريبة القيمة المضافة</span><b>${U.money(totals.tax)}</b></div>
        <div class="sum-total"><span>الإجمالي</span><strong>${U.money(totals.total)}</strong></div>
        <button class="btn btn-primary btn-block pos-pay" data-pay ${count ? '' : 'disabled'}>${U.icon('card', 18)} الدفع الآن <span class="kbd" style="background:rgba(255,255,255,.16);border-color:transparent;color:#d9f4e9">F4</span></button>
        ${state.orderType === 'dine_in' && !state.orderId ? `<button class="btn btn-secondary btn-block mt-1" data-kitchen ${count ? '' : 'disabled'}>${U.icon('chef', 15)} إرسال للمطبخ وفتح طلب</button>` : ''}
        <div class="pos-toolbar">
          <button class="btn btn-secondary" data-hold>${U.icon('clock', 13)} تعليق</button>
          <button class="btn btn-secondary" data-quote>${U.icon('file', 13)} عرض سعر</button>
          <button class="btn btn-ghost" data-clear>${U.icon('trash', 13)} مسح</button>
        </div>
      </div>`;
    const held = document.getElementById('held-count');
    if (held) held.textContent = Store.data.holds.length;
  }

  function renderAll() {
    renderCats();
    renderProducts();
    renderCart();
  }

  /* ---------- Discount ---------- */
  function openDiscount() {
    const totals = calcTotals();
    UI.modal({
      size: 'sm', title: 'خصم على الفاتورة', icon: 'percent',
      body: `<div class="pay-summary"><div class="ps-row"><span>المجموع قبل الخصم</span><b>${U.money(totals.subtotal)}</b></div><div class="ps-row"><span>الخصم الحالي</span><b>${U.money(totals.discount)}</b></div></div>
        <div class="form-grid mt-2">
          <div class="field"><label>نوع الخصم</label><select class="select" name="type"><option value="amount">مبلغ ثابت</option><option value="percent">نسبة مئوية</option></select></div>
          <div class="field"><label>القيمة</label><input class="input num" name="value" type="number" min="0" step="0.01" placeholder="0.00" /></div>
        </div>
        <div class="help mt-1">سيُحتسب الخصم على إجمالي الفاتورة قبل الضريبة، ويظهر كحساب خصومات مبيعات في القيود.</div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>تطبيق الخصم</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modal);
          let amount = U.parseNum(data.value);
          if (data.type === 'percent') amount = totals.subtotal * amount / 100;
          state.discount = U.round2(U.clamp(amount, 0, totals.subtotal));
          close();
          renderCart();
          if (state.discount > 0) UI.toast('تم تطبيق الخصم', 'success');
        });
      }
    });
  }

  /* ---------- Hold / resume ---------- */
  function holdSale() {
    if (!state.cart.length) { UI.toast('السلة فارغة', 'warning'); return; }
    const totals = calcTotals();
    Store.data.holds.unshift({
      id: U.uid('hold'), at: new Date().toISOString(),
      cart: JSON.parse(JSON.stringify(state.cart)),
      customerId: state.customerId, discount: state.discount,
      notes: state.notes, quoteId: state.quoteId,
      orderType: state.orderType, tableId: state.tableId,
      total: totals.total, count: cartCount()
    });
    if (Store.data.holds.length > 20) Store.data.holds.length = 20;
    Store.save();
    Store.audit('تعليق عملية بيع', `${cartCount()} صنف — ${U.money(totals.total)}`, 'clock');
    resetState();
    renderAll();
    UI.toast('تم تعليق البيع — يمكنك استعادته من قائمة المعلقة', 'success');
  }

  function openHeld() {
    const holds = Store.data.holds;
    if (!holds.length) { UI.toast('لا توجد فواتير معلقة', 'info'); return; }
    UI.modal({
      size: 'lg', title: 'الفواتير المعلقة', subtitle: `${holds.length} عملية محفوظة`, icon: 'clock',
      body: holds.map((h) => `<div class="held-sale">
        <div class="thumb sm">${U.icon('cart', 15)}</div>
        <div class="hs-main"><strong>${h.count} صنف • ${h.customerId ? U.esc((Store.customer(h.customerId) || {}).name || 'عميل') : 'عميل نقدي'}</strong><span>${U.formatDateTime(h.at)}</span></div>
        <div class="hs-total">${U.money(h.total)}</div>
        <button class="btn btn-primary btn-sm" data-resume="${h.id}">استعادة</button>
        <button class="btn-icon btn-ghost" data-del-hold="${h.id}" title="حذف">${U.icon('trash', 15)}</button>
      </div>`).join(''),
      footer: `<span class="foot-info">تُحفظ العمليات المعلقة محلياً حتى بعد إغلاق المتصفح</span><button class="btn btn-secondary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelectorAll('[data-resume]').forEach((btn) => btn.addEventListener('click', () => {
          const h = Store.data.holds.find((x) => x.id === btn.dataset.resume);
          if (!h) return;
          state.cart = h.cart || [];
          state.customerId = h.customerId || null;
          state.discount = h.discount || 0;
          state.notes = h.notes || '';
          state.quoteId = h.quoteId || null;
          state.orderType = h.orderType || 'dine_in';
          state.tableId = h.tableId || null;
          Store.data.holds = Store.data.holds.filter((x) => x.id !== h.id);
          Store.save();
          close();
          renderAll();
          UI.toast('تم استعادة البيع المعلق', 'success');
        }));
        modal.querySelectorAll('[data-del-hold]').forEach((btn) => btn.addEventListener('click', () => {
          Store.data.holds = Store.data.holds.filter((x) => x.id !== btn.dataset.delHold);
          Store.save();
          btn.closest('.held-sale').remove();
          renderCart();
          if (!Store.data.holds.length) close();
          UI.toast('تم حذف العملية المعلقة', 'success');
        }));
      }
    });
  }

  /* ---------- Quote ---------- */
  function saveQuote() {
    if (!state.cart.length) { UI.toast('أضف أصنافاً أولاً', 'warning'); return; }
    try {
      const q = Business.saveQuote({
        items: cartItems(),
        customerId: state.customerId, discount: state.discount, notes: state.notes,
        branchId: App.branchId
      });
      resetState();
      renderAll();
      UI.toast(`تم حفظ عرض السعر ${q.number}`, 'success');
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  /* ---------- Kitchen / open check ---------- */
  function sendToKitchen() {
    if (!state.cart.length) { UI.toast('السلة فارغة', 'warning'); return; }
    if (state.orderType === 'dine_in' && !state.tableId) { UI.toast('اختر طاولة أولاً', 'warning'); return; }
    try {
      const order = Orders.create({
        type: state.orderType, tableId: state.orderType === 'dine_in' ? state.tableId : null,
        items: cartItems(), customerId: state.customerId,
        customerName: state.customerName || (state.customerId ? undefined : 'عميل نقدي'),
        customerPhone: state.customerPhone,
        notes: state.notes, sendToKitchen: true, status: 'new',
        branchId: App.branchId
      });
      if (settings().printer && settings().printer.autoPrintKitchen) {
        try { Printer.kitchen(order); } catch (e) { console.warn(e); }
      }
      resetState();
      renderAll();
      UI.toast(`تم إرسال الطلب ${order.number} للمطبخ — تابع الطاولة من شاشة الطاولات`, 'success');
      setTimeout(() => App.refreshChrome(), 50);
    } catch (e) { UI.toast(e.message, 'error'); }
  }

  function loadOrder(order) {
    if (!order) return;
    state.orderId = order.id;
    state.tableId = order.tableId || null;
    state.orderType = order.type || 'dine_in';
    state.customerId = order.customerId || null;
    state.customerName = order.customerName || '';
    state.customerPhone = order.customerPhone || '';
    state.discount = order.discount || 0;
    state.notes = order.notes || '';
    state.cart = (order.items || []).map((it) => ({
      productId: it.productId, qty: it.qty, price: it.price,
      discount: it.discount || 0, taxRate: it.taxRate
    }));
  }

  /* ---------- Payment ---------- */
  function paymentMethods() {
    const cfg = settings().payments || {};
    const enabled = cfg.methods || {};
    return ['cash', 'mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'mixed', 'credit']
      .filter((m) => m === 'mixed' || m === 'credit' || enabled[m] !== false);
  }

  function openPayment() {
    if (!state.cart.length) { UI.toast('السلة فارغة', 'warning'); return; }
    if (state.orderType === 'dine_in' && !state.tableId) { UI.toast('اختر طاولة أولاً', 'warning'); return; }
    const totals = calcTotals();
    const customer = state.customerId ? Store.customer(state.customerId) : null;
    const balance = customer ? Accounting.customerBalance(customer.id) : 0;
    const quick = (settings().posQuickCash || [50, 100, 200, 500]).filter((n) => n > 0);
    const methods = paymentMethods();
    const provider = (Payments.provider && Payments.provider((settings().payments || {}).provider)) || { name: 'Mock Gateway' };
    const methodBtn = (m) => {
      const meta = (Payments.METHODS || {})[m] || {};
      if (m === 'mixed') return `<button type="button" class="pay-method" data-method="mixed">${U.icon('credit', 18)} مختلط</button>`;
      if (m === 'credit') return `<button type="button" class="pay-method" data-method="credit">${U.icon('clock', 18)} آجل</button>`;
      return `<button type="button" class="pay-method" data-method="${m}">${U.icon(meta.icon || 'card', 18)} ${U.esc(meta.label || m)}</button>`;
    };
    UI.modal({
      size: 'sm', title: 'إتمام عملية البيع', subtitle: `${U.num(cartCount(), 0)} صنف • ${customer ? customer.name : 'عميل نقدي'}`, icon: 'card',
      body: `<div class="pay-summary">
          <div class="ps-row"><span>المجموع قبل الضريبة</span><b>${U.money(totals.subtotal)}</b></div>
          ${totals.serviceCharge ? `<div class="ps-row"><span>رسوم الخدمة</span><b>${U.money(totals.serviceCharge)}</b></div>` : ''}
          ${totals.deliveryFee ? `<div class="ps-row"><span>رسوم التوصيل</span><b>${U.money(totals.deliveryFee)}</b></div>` : ''}
          ${totals.discount ? `<div class="ps-row"><span>الخصم</span><b>- ${U.money(totals.discount)}</b></div>` : ''}
          <div class="ps-row"><span>ضريبة القيمة المضافة</span><b>${U.money(totals.tax)}</b></div>
          <div class="ps-row total"><span>الإجمالي المستحق</span><b>${U.money(totals.total)}</b></div>
        </div>
        <div class="pay-methods mt-2" style="grid-template-columns:repeat(4,1fr)">${methods.map(methodBtn).join('')}</div>
        <div class="form-grid mt-2">
          <div class="field"><label>المستلم نقداً</label><input class="input num" id="pay-cash" type="number" step="0.01" min="0" value="${totals.total.toFixed(2)}" /></div>
          <div class="field"><label id="pay-card-label">مبلغ مدى / الشبكة</label><input class="input num" id="pay-card" type="number" step="0.01" min="0" value="0" /></div>
        </div>
        <div class="cash-quick mt-2">
          ${quick.map((n) => `<button type="button" data-quick="${n}">${U.num(n, 0)}</button>`).join('')}
          <button type="button" data-quick="${totals.total.toFixed(2)}">المبلغ بالضبط</button>
        </div>
        <div class="change-box mt-2" id="pay-change-box"><span>الباقي للعميل</span><strong id="pay-change">0.00</strong></div>
        <div class="info-banner warn mt-2" id="pay-warning" hidden></div>
        <div class="form-grid mt-2">
          <div class="field"><label>كوبون خصم (اختياري)</label><input class="input" id="pay-coupon" placeholder="WELCOME10" value="" /></div>
          <div class="field"><label>استبدال نقاط ${customer ? `(المتاح ${U.num(customer.loyaltyPoints || 0)})` : ''}</label><input class="input num" id="pay-points" type="number" min="0" step="1" value="0" ${customer ? '' : 'disabled'} /></div>
        </div>
        ${state.orderType !== 'dine_in' ? `<div class="form-grid mt-2">
          <div class="field"><label>اسم العميل</label><input class="input" id="pay-name" value="${U.esc(state.customerName)}" placeholder="عميل ${Orders.typeLabel(state.orderType)}" /></div>
          <div class="field"><label>الجوال</label><input class="input" id="pay-phone" dir="ltr" value="${U.esc(state.customerPhone)}" placeholder="05x xxx xxxx" /></div>
        </div>` : ''}
        <div class="field mt-2"><label>ملاحظات الفاتورة</label><input class="input" id="pay-notes" placeholder="اختياري" value="${U.esc(state.notes)}" /></div>
        <div class="foot-info mt-2" style="font-size:10px">${U.icon('shield', 12)} الدفع الإلكتروني عبر ${U.esc(provider.name)} — بيئة تجريبية/Mock</div>`,
      footer: `<div class="foot-info" id="pay-customer-info">${customer ? `الرصيد الحالي ${U.money(balance)}` : 'لن يُسجل البيع على حساب عميل'}</div>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-confirm>${U.icon('check', 15)} تأكيد البيع</button>`,
      onMount(modalEl, close) {
        const cashInput = modalEl.querySelector('#pay-cash');
        const cardInput = modalEl.querySelector('#pay-card');
        const cardLabel = modalEl.querySelector('#pay-card-label');
        const changeBox = modalEl.querySelector('#pay-change-box');
        const changeEl = modalEl.querySelector('#pay-change');
        const warn = modalEl.querySelector('#pay-warning');
        const confirm = modalEl.querySelector('[data-confirm]');
        let appliedCash = 0, appliedCard = 0, due = 0, change = 0;
        let mode = 'cash', eMethod = 'mada';

        const recalc = () => {
          let cashT = Math.max(0, U.parseNum(cashInput.value));
          let card = Math.max(0, U.parseNum(cardInput.value));
          if (card > totals.total) { card = totals.total; cardInput.value = card.toFixed(2); }
          appliedCash = U.round2(Math.min(cashT, Math.max(0, totals.total - card)));
          appliedCard = U.round2(card);
          const paid = U.round2(appliedCash + appliedCard);
          due = U.round2(Math.max(0, totals.total - paid));
          change = U.round2(Math.max(0, cashT - appliedCash));
          if (due > 0.01) {
            changeBox.classList.add('due');
            changeBox.querySelector('span').textContent = 'المتبقي آجل على العميل';
            changeEl.textContent = U.money(due);
          } else {
            changeBox.classList.remove('due');
            changeBox.querySelector('span').textContent = 'الباقي للعميل';
            changeEl.textContent = U.money(change);
          }
          const overLimit = customer && due > 0 && Number(customer.creditLimit) > 0 && (balance + due) > Number(customer.creditLimit);
          if (due > 0.01 && !customer) {
            warn.hidden = false;
            warn.className = 'info-banner warn mt-2';
            warn.innerHTML = `${U.icon('alert', 17)}<div><strong>البيع الآجل يتطلب عميلاً مسجلاً.</strong><br>اختر عميلاً من سلة البيع أو غطِّ كامل المبلغ نقداً/إلكترونياً.</div>`;
            confirm.disabled = true;
          } else if (overLimit) {
            warn.hidden = false;
            warn.className = 'info-banner warn mt-2';
            warn.innerHTML = `${U.icon('alert', 17)}<div><strong>تنبيه: تجاوز حد الائتمان.</strong><br>الرصيد بعد البيع ${U.money(balance + due)} مقابل حد ${U.money(customer.creditLimit)}. يمكنك المتابعة أو تعديل الدفع.</div>`;
            confirm.disabled = false;
          } else {
            warn.hidden = true;
            confirm.disabled = false;
          }
          confirm.innerHTML = `${U.icon('check', 15)} تأكيد البيع • ${U.money(totals.total)}`;
        };

        const setMode = (next) => {
          mode = next;
          modalEl.querySelectorAll('[data-method]').forEach((b) => b.classList.toggle('active', b.dataset.method === next));
          if (next === 'cash') { cashInput.value = totals.total.toFixed(2); cardInput.value = '0'; }
          else if (next === 'mixed') {
            const half = U.round2(totals.total / 2);
            cashInput.value = half.toFixed(2); cardInput.value = U.round2(totals.total - half).toFixed(2);
          } else if (next === 'credit') { cashInput.value = '0'; cardInput.value = '0'; }
          else {
            eMethod = next;
            cashInput.value = '0'; cardInput.value = totals.total.toFixed(2);
            const meta = (Payments.METHODS || {})[next] || {};
            cardLabel.textContent = `مبلغ ${meta.label || next}`;
          }
          if (next === 'cash' || next === 'credit' || next === 'mixed') cardLabel.textContent = 'مبلغ الشبكة / البنك';
          recalc();
        };

        modalEl.querySelectorAll('[data-method]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.method)));
        modalEl.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => { cashInput.value = Number(b.dataset.quick).toFixed(2); recalc(); }));
        cashInput.addEventListener('input', recalc);
        cardInput.addEventListener('input', recalc);
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        confirm.addEventListener('click', async () => {
          if (confirm.disabled) return;
          const couponCode = (modalEl.querySelector('#pay-coupon') || {}).value ? modalEl.querySelector('#pay-coupon').value.trim() : '';
          const loyaltyPoints = Math.max(0, Math.floor(U.parseNum((modalEl.querySelector('#pay-points') || {}).value)));
          const payName = (modalEl.querySelector('#pay-name') || {}).value ? modalEl.querySelector('#pay-name').value.trim() : '';
          const payPhone = (modalEl.querySelector('#pay-phone') || {}).value ? modalEl.querySelector('#pay-phone').value.trim() : '';
          if (state.orderType !== 'dine_in') {
            state.customerName = payName;
            state.customerPhone = payPhone;
          }
          UI.setBusy(confirm, true, 'جارٍ تنفيذ الدفع...');
          let tx = null;
          try {
            if (appliedCard > 0) {
              tx = await Payments.charge({
                amount: appliedCard, method: eMethod, orderId: state.orderId,
                customerPhone: state.customerPhone, invoiceId: null
              });
              if (!tx || tx.status !== 'approved') throw new Error((tx && tx.message) || 'فشلت عملية الدفع الإلكتروني.');
            }
            let orderId = state.orderId;
            if (!orderId) {
              const order = Orders.create({
                type: state.orderType, tableId: state.orderType === 'dine_in' ? state.tableId : null,
                items: cartItems(), customerId: state.customerId,
                customerName: state.customerName || undefined, customerPhone: state.customerPhone,
                notes: state.notes, sendToKitchen: true, status: 'new', branchId: App.branchId
              });
              orderId = order.id;
              if (settings().printer && settings().printer.autoPrintKitchen) {
                try { Printer.kitchen(order); } catch (e) { console.warn(e); }
              }
            }
            const payments = [];
            if (appliedCash > 0) payments.push({ method: 'cash', amount: appliedCash });
            if (appliedCard > 0) payments.push({ method: eMethod, amount: appliedCard });
            const sale = Business.createSale({
              items: cartItems(),
              customerId: state.customerId, customerName: state.customerName || undefined,
              customerPhone: state.customerPhone,
              discount: totals.discount, payments,
              orderType: state.orderType,
              tableId: state.orderType === 'dine_in' ? state.tableId : null,
              orderId,
              serviceCharge: totals.serviceCharge,
              deliveryFee: totals.deliveryFee,
              couponCode, loyaltyPoints,
              notes: modalEl.querySelector('#pay-notes').value.trim(),
              branchId: App.branchId, cashierId: Store.currentUser ? Store.currentUser.id : null,
              source: 'pos'
            });
            if (tx) sale.paymentTransactionId = tx.transactionId;
            if (state.quoteId) Business.markQuoteConverted(state.quoteId, sale.id);
            close();
            resetState();
            renderAll();
            App.refreshChrome();
            showSuccess(sale, change);
          } catch (e) {
            UI.setBusy(confirm, false);
            UI.toast(e.message || 'تعذر إتمام البيع', 'error');
          }
        });
        recalc();
        setTimeout(() => cashInput.select(), 100);
      }
    });
  }

  function showSuccess(inv, change) {
    const z = inv.zatca || {};
    const qr = z.qr ? Zatca.qrSvg(z.qr, 120) : '';
    UI.modal({
      size: 'sm', title: 'تمت عملية البيع بنجاح', subtitle: inv.number, icon: 'checkCircle',
      body: `<div class="pay-success">
          <div class="success-ring">${U.icon('check', 36)}</div>
          <h3>تم حفظ الفاتورة</h3>
          <p>${U.esc(inv.customerName)} • ${U.formatDate(inv.date, 'full')}</p>
          <div class="amount">${U.money(inv.total)}</div>
          ${inv.due > 0.01 ? `<div class="change" style="color:var(--warning);background:var(--warning-soft)">المتبقي آجل: ${U.money(inv.due)}</div>` : change > 0 ? `<div class="change">الباقي للعميل: ${U.money(change)}</div>` : '<div class="change">تم سداد المبلغ بالكامل</div>'}
        </div>
        <div class="receipt-preview">
          <div class="rp-head"><strong>${U.esc(settings().company)}</strong><span>فاتورة ضريبية مبسطة — ZATCA Sandbox</span></div>
          <div class="rp-row"><span>رقم الفاتورة</span><b>${U.esc(inv.number)}</b></div>
          <div class="rp-row"><span>نوع الطلب</span><b>${U.esc(Orders.typeLabel(inv.orderType))}</b></div>
          <div class="rp-row"><span>طريقة الدفع</span><b>${Accounting.methodLabel(inv.method)}</b></div>
          <div class="rp-row"><span>الضريبة</span><b>${U.money(inv.tax)}</b></div>
          <div class="rp-row rp-total"><span>الإجمالي</span><b>${U.money(inv.total)}</b></div>
          ${qr ? `<div class="rp-qr">${qr}<small>رمز QR للفاتورة — TLV تجريبي</small></div>` : ''}
        </div>`,
      footer: `<button class="btn btn-secondary" data-thermal>${U.icon('print', 14)} طباعة حرارية</button>
        <button class="btn btn-secondary" data-print>${U.icon('print', 14)} طباعة الإيصال</button>
        <button class="btn btn-secondary" data-invoice>${U.icon('eye', 14)} عرض الفاتورة</button>
        <button class="btn btn-primary" data-new>${U.icon('pos', 14)} بيع جديد</button>`,
      onMount(modalEl, close) {
        modalEl.querySelector('[data-thermal]').addEventListener('click', () => Actions.thermalPrint(inv));
        modalEl.querySelector('[data-print]').addEventListener('click', () => Actions.printReceipt(inv));
        modalEl.querySelector('[data-invoice]').addEventListener('click', () => { close(); Actions.openInvoice(inv.id); });
        modalEl.querySelector('[data-new]').addEventListener('click', () => { close(); focusSearch(); });
        setTimeout(() => modalEl.querySelector('[data-new]').focus(), 100);
      }
    });
    const printerCfg = settings().printer || {};
    if (printerCfg.autoPrintReceipt && window.Printer) {
      try { Printer.receipt(inv); } catch (e) { console.warn('thermal auto print failed', e); }
    }
  }

  function focusSearch() {
    const input = viewRef && viewRef.querySelector('#pos-search');
    if (input) { input.focus(); input.select(); }
  }

  function bindKeys() {
    if (keysBound) return;
    keysBound = true;
    document.addEventListener('keydown', (e) => {
      if (App.currentRoute !== 'pos' || !viewRef) return;
      if (e.key === 'F2') { e.preventDefault(); focusSearch(); }
      if (e.key === 'F4') { e.preventDefault(); if (state.cart.length) openPayment(); }
      if (e.key === 'F8') { e.preventDefault(); holdSale(); }
    });
  }

  function handlePending() {
    if (window.__pendingQuote) {
      const q = Store.invoice(window.__pendingQuote);
      window.__pendingQuote = null;
      if (q && q.type === 'quote') {
        state.cart = (q.items || []).filter((it) => Store.product(it.productId)).map((it) => ({
          productId: it.productId, qty: it.qty, price: it.price, discount: it.discount || 0,
          taxRate: (Store.product(it.productId) || {}).taxRate || 0
        }));
        state.customerId = q.customerId || null;
        state.discount = q.discount || 0;
        state.notes = q.notes || '';
        state.quoteId = q.id;
        setTimeout(() => UI.toast(`تم تحميل عرض السعر ${q.number} — يمكنك تعديله وإتمام البيع`, 'info'), 200);
      }
    }
    if (window.__posOrder) {
      const order = Store.order(window.__posOrder);
      window.__posOrder = null;
      if (order) loadOrder(order);
    }
    if (window.__posTable) {
      state.tableId = window.__posTable; window.__posTable = null;
      state.orderType = window.__posType || 'dine_in'; window.__posType = null;
    }
    if (window.__posType) { state.orderType = window.__posType; window.__posType = null; }
    if (window.__posAdd) {
      const id = window.__posAdd; window.__posAdd = null;
      if (Store.product(id)) addProduct(id);
    }
  }

  Pages.pos = {
    title: 'نقطة البيع', icon: 'pos', perm: 'pos',
    render(view) {
      viewRef = view;
      const user = Store.currentUser || {};
      const branch = Store.branchName(App.branchId);
      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">نقطة البيع</div><div class="page-sub">${U.esc(branch)} • الكاشير: ${U.esc(user.name || '')} • ${U.formatDate(U.today(), 'long')}</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-held>${U.icon('clock', 14)} المعلقة <span class="badge badge-gray" id="held-count">${Store.data.holds.length}</span></button>
            <button class="btn btn-secondary btn-sm" data-go-tables>${U.icon('grid', 14)} الطاولات</button>
            <button class="btn btn-ghost btn-sm" data-go-sales>${U.icon('receipt', 14)} سجل المبيعات</button>
          </div>
        </div>
        <div class="pos-page" id="pos-page">
          <section class="pos-products">
            <div class="pos-searchbar">
              ${U.icon('barcode', 22, 'ps-ico')}
              <input class="input" id="pos-search" placeholder="ابحث بالاسم أو امسح الباركود ثم Enter..." value="${U.esc(state.search)}" autocomplete="off" />
              <span class="ps-hint kbd">F2</span>
            </div>
            <div class="pos-cats" id="pos-cats"></div>
            <div class="pos-grid" id="pos-grid"></div>
          </section>
          <aside class="pos-cart" id="pos-cart"></aside>
        </div>`;
      handlePending();
      renderAll();
      bindKeys();

      const search = view.querySelector('#pos-search');
      search.addEventListener('input', () => {
        state.search = search.value;
        renderProducts();
      });
      search.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const q = norm(search.value);
        if (!q) return;
        const exact = products().find((p) => String(p.barcode || '').toLowerCase() === q || norm(p.sku) === q);
        const single = filteredProducts();
        if (exact) { addProduct(exact.id); state.search = ''; search.value = ''; renderProducts(); }
        else if (single.length === 1) { addProduct(single[0].id); state.search = ''; search.value = ''; renderProducts(); }
        else UI.toast('لم يتم العثور على صنف مطابق', 'warning');
      });

      view.addEventListener('change', (e) => {
        if (e.target.id === 'pos-customer') {
          state.customerId = e.target.value || null;
          renderCart();
        }
        if (e.target.id === 'pos-table') {
          state.tableId = e.target.value || null;
          renderCart();
        }
      });

      view.addEventListener('click', (e) => {
        const cat = e.target.closest('[data-cat]');
        if (cat) { state.category = cat.dataset.cat; renderCats(); renderProducts(); return; }
        const type = e.target.closest('[data-order-type]');
        if (type) {
          state.orderType = type.dataset.orderType;
          if (state.orderType !== 'dine_in') state.tableId = null;
          renderCart();
          return;
        }
        if (e.target.closest('[data-unlink-order]')) {
          state.orderId = null;
          renderCart();
          return;
        }
        const add = e.target.closest('[data-add]');
        if (add && !add.disabled) { addProduct(add.dataset.add); return; }
        const inc = e.target.closest('[data-inc]');
        if (inc) { addProduct(inc.dataset.inc); return; }
        const dec = e.target.closest('[data-dec]');
        if (dec) {
          const line = state.cart.find((l) => l.productId === dec.dataset.dec);
          if (!line) return;
          if (line.qty <= 1) state.cart = state.cart.filter((l) => l.productId !== dec.dataset.dec);
          else line.qty = U.round2(line.qty - 1);
          renderCart();
          return;
        }
        const del = e.target.closest('[data-del]');
        if (del) { state.cart = state.cart.filter((l) => l.productId !== del.dataset.del); renderCart(); return; }
        if (e.target.closest('[data-pay]')) { openPayment(); return; }
        if (e.target.closest('[data-kitchen]')) { sendToKitchen(); return; }
        if (e.target.closest('[data-discount]')) { openDiscount(); return; }
        if (e.target.closest('[data-hold]')) { holdSale(); return; }
        if (e.target.closest('[data-held]')) { openHeld(); return; }
        if (e.target.closest('[data-quote]')) { saveQuote(); return; }
        if (e.target.closest('[data-go-sales]')) { App.navigate('#/sales'); return; }
        if (e.target.closest('[data-go-tables]')) { App.navigate('#/tables'); return; }
        if (e.target.closest('[data-clear]')) {
          if (!state.cart.length) return;
          UI.confirm({ title: 'مسح السلة', message: 'هل تريد مسح جميع الأصناف من سلة البيع؟', danger: true, confirmText: 'مسح' }).then((ok) => {
            if (ok) { resetState(); renderAll(); }
          });
        }
      });

      setTimeout(() => search.focus(), 120);
    }
  };
})();
