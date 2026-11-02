/* ==========================================================================
   طلال تكنو — standalone QR e-menu client
   Mobile-first menu, cart, self-ordering and live order status.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const CART_KEY = 'talaltechno.emenu.cart.v1';
  const THEME_KEY = 'talaltechno.emenu.theme.v1';

  const state = {
    table: null,
    category: 'all',
    q: '',
    cart: {},
    orderType: 'takeaway',
    customerName: '',
    customerPhone: '',
    orderNotes: '',
    lastOrderId: null,
    poll: null
  };

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim();

  const settings = () => Store.data.settings;
  const vatRate = () => Number(settings().vatRate) || 0;
  const taxRateOf = (p) => Number(p.taxRate !== undefined ? p.taxRate : vatRate()) || 0;
  const priceIncl = (p) => U.round2((Number(p.price) || 0) * (1 + taxRateOf(p) / 100));

  function toast(message, type) {
    const root = $('#e-toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'e-toast ' + (type || '');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      el.style.transition = 'all .25s';
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  /* ---------- Data ---------- */
  function refreshFromStorage() {
    try {
      const raw = localStorage.getItem('talaltechno.db.v1');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.products)) Store.data = Store.applyDefaults(parsed);
    } catch (e) { /* keep in-memory copy */ }
  }

  function resolveTable() {
    let id = null;
    try { id = new URLSearchParams(window.location.search).get('table'); } catch (e) {}
    if (!id) return null;
    const table = Store.table(id);
    if (!table) {
      toast('رابط الطاولة غير صالح — يمكنك الطلب سفري.', 'warn');
      return null;
    }
    return table;
  }

  function categories() {
    const used = {};
    Store.menuProducts().forEach((p) => { used[p.categoryId] = true; });
    const list = (Store.data.categories || []).filter((c) => used[c.id]);
    return list.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  }

  function filteredProducts() {
    const q = norm(state.q);
    return Store.menuProducts().filter((p) => {
      if (state.category !== 'all' && p.categoryId !== state.category) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || norm(p.description || p.desc || '').includes(q) || norm(p.sku).includes(q);
    });
  }

  function categoryName(id) {
    const c = Store.category(id);
    return c ? c.name : 'أطباق';
  }

  function cartLines() {
    return Object.keys(state.cart)
      .map((id) => ({ product: Store.product(id), entry: state.cart[id] }))
      .filter((x) => x.product && x.entry && x.entry.qty > 0);
  }

  function totals() {
    const lines = cartLines();
    let pre = 0;
    let tax = 0;
    lines.forEach((l) => {
      const line = (Number(l.product.price) || 0) * l.entry.qty;
      pre += line;
      tax += line * taxRateOf(l.product) / 100;
    });
    pre = U.round2(pre);
    const serviceRate = state.table && state.orderType === 'dine_in' ? (Number(settings().serviceChargeRate) || 0) : 0;
    const service = U.round2(pre * serviceRate / 100);
    tax = U.round2(tax + service * vatRate() / 100);
    return { pre, service, tax, total: U.round2(pre + service + tax), count: U.round2(U.sum(lines, (l) => l.entry.qty)) };
  }

  /* ---------- Chrome ---------- */
  function renderChrome() {
    const s = settings();
    $('#e-company').textContent = s.company || 'طلال تكنو';
    $('#e-tagline').textContent = 'TALAL TECHNO • DIGITAL MENU';
    $('#e-footer-company').textContent = s.company || 'طلال تكنو';
    $('#e-footer-text').textContent = s.footer || 'شكراً لزيارتكم — نراكم قريباً';
    $('#e-branch').textContent = Store.branchName(Store.data.meta.branch);
    $('#e-hero-title').textContent = state.table ? `أهلاً بكم في ${state.table.name}` : 'قائمة المطعم';
    $('#e-hero-sub').textContent = state.table
      ? `أنت تطلب من ${state.table.name} — ${state.table.zone || 'الصالة الرئيسية'}. اختر أطباقك وأرسلها للمطبخ.`
      : 'اختر أطباقك المفضلة وأرسل الطلب مباشرة إلى المطبخ للاستلام أو الطلب السفري.';
    const heroMeta = $('.e-hero-meta');
    if (heroMeta) heroMeta.innerHTML = `<span>${U.esc(Store.branchName(Store.data.meta.branch))}</span><span class="e-dot"></span><span>ضريبة القيمة المضافة ${U.num(vatRate())}%</span>`;
    const openText = $('#e-open-text');
    if (s.selfOrdering) {
      openText.textContent = 'نستقبل الطلبات الآن';
    } else {
      openText.textContent = 'الطلب الذاتي غير متاح حالياً — يرجى الطلب من فريق الخدمة';
    }
    const chip = $('#e-table-chip');
    if (state.table) {
      chip.hidden = false;
      chip.innerHTML = `🍽️ ${U.esc(state.table.name)}`;
    } else {
      chip.hidden = true;
    }
    const theme = document.documentElement.getAttribute('data-theme');
    $('#e-theme').textContent = theme === 'dark' ? '☀' : '☾';
  }

  function renderCats() {
    const cats = categories();
    $('#e-cats').innerHTML = [
      `<button class="e-cat ${state.category === 'all' ? 'active' : ''}" data-cat="all"><span>🍽️</span> الكل</button>`
    ].concat(cats.map((c) => `<button class="e-cat ${state.category === c.id ? 'active' : ''}" data-cat="${U.esc(c.id)}"><span>${U.esc(c.emoji || '🍴')}</span> ${U.esc(c.name)}</button>`)).join('');
    $$('[data-cat]', $('#e-cats')).forEach((b) => b.addEventListener('click', () => {
      state.category = b.dataset.cat;
      renderCats();
      renderGrid();
      const title = state.category === 'all' ? 'كل الأصناف' : categoryName(state.category);
      $('#e-section-title').textContent = title;
    }));
  }

  function renderGrid() {
    const list = filteredProducts();
    const grid = $('#e-grid');
    $('#e-count').textContent = `${U.num(list.length)} صنف`;
    $('#e-section-title').textContent = state.category === 'all' ? 'كل الأصناف' : categoryName(state.category);
    $('#e-empty').hidden = list.length > 0;
    grid.innerHTML = list.map((p) => {
      const available = Store.availableOf(p);
      const qty = state.cart[p.id] ? state.cart[p.id].qty : 0;
      const badges = [];
      if (p.featured) badges.push('<span class="e-badge">الأكثر طلباً</span>');
      if (p.isNew) badges.push('<span class="e-badge green">جديد</span>');
      if (!available) badges.push('<span class="e-badge gray">غير متوفر</span>');
      const desc = p.description || p.desc || 'محضّر طازجاً في مطبخنا';
      return `<article class="e-card ${available ? '' : 'off'}" data-product="${U.esc(p.id)}">
        <div class="e-card-img">${U.esc(p.emoji || '🍽️')}
          <div class="e-card-badges">${badges.join('')}</div>
          ${qty ? `<span class="e-qty-pill">${U.num(qty)}</span>` : ''}
        </div>
        <div class="e-card-body">
          <h3>${U.esc(p.name)}</h3>
          <p class="e-card-desc">${U.esc(desc)}</p>
          <div class="e-card-foot">
            <div class="e-price"><strong>${U.money(priceIncl(p))}</strong><small>شامل الضريبة</small></div>
            <button class="e-add" data-add="${U.esc(p.id)}" ${available ? '' : 'disabled'} aria-label="أضف ${U.esc(p.name)}">${available ? '+' : '×'}</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderCartbar() {
    const t = totals();
    const bar = $('#e-cartbar');
    if (!t.count) { bar.hidden = true; return; }
    bar.hidden = false;
    $('#e-cart-count').textContent = U.num(t.count);
    $('#e-cart-total').textContent = U.money(t.total);
  }

  /* ---------- Cart ---------- */
  function loadCart() {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const tableId = state.table ? state.table.id : null;
      if (parsed && parsed.tableId === tableId && parsed.cart) state.cart = parsed.cart;
    } catch (e) { state.cart = {}; }
  }
  function saveCart() {
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify({ tableId: state.table ? state.table.id : null, cart: state.cart }));
    } catch (e) {}
  }
  function setCart(productId, qty, note) {
    const n = Math.max(0, Math.floor(Number(qty) || 0));
    if (!n) delete state.cart[productId];
    else state.cart[productId] = { qty: n, note: note || '' };
    saveCart();
    renderGrid();
    renderCartbar();
  }

  /* ---------- Sheet ---------- */
  function openSheet(html, className) {
    const root = $('#e-sheet-root');
    root.innerHTML = `<div class="e-backdrop" data-close></div><section class="e-sheet ${className || ''}" role="dialog" aria-modal="true">${html}</section>`;
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    $$('[data-close]', root).forEach((el) => el.addEventListener('click', closeSheet));
    setTimeout(() => {
      const focusable = $('input, textarea, button:not([data-close])', root);
      if (focusable) { try { focusable.focus({ preventScroll: true }); } catch (e) {} }
    }, 320);
  }
  function closeSheet() {
    const root = $('#e-sheet-root');
    root.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 300);
  }

  function itemSheet(productId) {
    const p = Store.product(productId);
    if (!p) return;
    const available = Store.availableOf(p);
    const existing = state.cart[p.id];
    let qty = existing ? existing.qty : 1;
    let note = existing ? existing.note : '';
    const render = () => {
      openSheet(`
        <div class="e-sheet-grab"></div>
        <div class="e-sheet-head">
          <div><h3>${U.esc(p.name)}</h3><p>${U.esc(categoryName(p.categoryId))}</p></div>
          <button class="e-close" data-close aria-label="إغلاق">×</button>
        </div>
        <div class="e-sheet-body">
          <div class="e-item-hero">${U.esc(p.emoji || '🍽️')}</div>
          <h2 class="e-item-title">${U.esc(p.name)}</h2>
          <p class="e-item-desc">${U.esc(p.description || p.desc || 'محضّر طازجاً في مطبخنا')}</p>
          <div class="e-item-price"><strong>${U.money(priceIncl(p))}</strong><small>شامل ضريبة القيمة المضافة</small></div>
          ${available ? '' : '<div class="e-offline" style="margin:10px 0 0">هذا الصنف غير متوفر حالياً. يرجى اختيار صنف آخر.</div>'}
          <div class="e-field"><label>ملاحظات خاصة (اختياري)</label><textarea data-note maxlength="160" placeholder="مثال: بدون بصل، حار قليلاً، تقطيع للأطفال…">${U.esc(note)}</textarea></div>
          <div class="e-big-stepper"><button data-dec aria-label="تقليل">−</button><b data-qty>${U.num(qty)}</b><button data-inc aria-label="زيادة">+</button></div>
        </div>
        <div class="e-sheet-foot">
          <div class="e-item-foot">
            <div class="e-item-total">الإجمالي<b data-total>${U.money(priceIncl(p) * qty)}</b></div>
            <button class="e-btn" data-confirm ${available ? '' : 'disabled'}>${existing ? 'تحديث السلة' : 'أضف إلى السلة'}</button>
          </div>
        </div>`);
      const sheet = $('#e-sheet-root .e-sheet');
      $('[data-note]', sheet).value = note;
      $('[data-note]', sheet).addEventListener('input', (e) => { note = e.target.value; });
      $('[data-dec]', sheet).addEventListener('click', () => { qty = Math.max(1, qty - 1); update(); });
      $('[data-inc]', sheet).addEventListener('click', () => { qty = Math.min(99, qty + 1); update(); });
      $('[data-confirm]', sheet).addEventListener('click', () => {
        if (!available) return;
        setCart(p.id, qty, note);
        closeSheet();
        toast(`تمت إضافة «${p.name}» إلى السلة`);
      });
      function update() {
        $('[data-qty]', sheet).textContent = U.num(qty);
        $('[data-total]', sheet).textContent = U.money(priceIncl(p) * qty);
      }
    };
    render();
  }

  function cartSheet() {
    const t = totals();
    if (!t.count) { toast('السلة فارغة — أضف صنفاً أولاً', 'warn'); return; }
    const lines = cartLines();
    const tableMode = !!state.table;
    if (!tableMode && state.orderType === 'dine_in') state.orderType = 'takeaway';
    if (tableMode) state.orderType = 'dine_in';
    const typeButtons = tableMode
      ? `<div class="e-seg"><button class="active" disabled>🍽️ على الطاولة — ${U.esc(state.table.name)}</button></div>`
      : `<div class="e-seg"><button class="${state.orderType === 'takeaway' ? 'active' : ''}" data-type="takeaway">🥡 استلام سفري</button><button class="${state.orderType === 'curbside' ? 'active' : ''}" data-type="curbside">🚗 استلام سيارة</button></div>`;
    const body = `
      <div class="e-sheet-grab"></div>
      <div class="e-sheet-head">
        <div><h3>سلة الطلب</h3><p>${U.num(t.count)} صنف • ${tableMode ? 'طاولة ' + U.esc(state.table.name) : 'طلب سفري'}</p></div>
        <button class="e-close" data-close aria-label="إغلاق">×</button>
      </div>
      <div class="e-sheet-body">
        ${lines.map((l) => `<div class="e-line" data-line="${U.esc(l.product.id)}">
          <div class="e-line-thumb">${U.esc(l.product.emoji || '🍽️')}</div>
          <div class="e-line-main">
            <strong>${U.esc(l.product.name)}</strong>
            <small>${U.money(priceIncl(l.product))} شامل الضريبة</small>
            ${l.entry.note ? `<small style="display:block;color:var(--e-gold)">📝 ${U.esc(l.entry.note)}</small>` : ''}
            <div class="e-stepper"><button data-dec="${U.esc(l.product.id)}" aria-label="تقليل">−</button><b>${U.num(l.entry.qty)}</b><button data-inc="${U.esc(l.product.id)}" aria-label="زيادة">+</button></div>
          </div>
          <div class="e-line-side"><b>${U.money(priceIncl(l.product) * l.entry.qty)}</b><button class="e-line-remove" data-remove="${U.esc(l.product.id)}">حذف</button></div>
        </div>`).join('')}
        <div class="e-field"><label>نوع الطلب</label>${typeButtons}</div>
        <div class="e-two">
          <div class="e-field"><label>الاسم (اختياري)</label><input data-name maxlength="50" placeholder="اسم الضيف" value="${U.esc(state.customerName)}" /></div>
          <div class="e-field"><label>الجوال (اختياري)</label><input data-phone maxlength="20" dir="ltr" inputmode="tel" placeholder="05x xxx xxxx" value="${U.esc(state.customerPhone)}" /></div>
        </div>
        <div class="e-field"><label>ملاحظات على الطلب (اختياري)</label><textarea data-order-note maxlength="180" placeholder="أي تعليمات إضافية للمطبخ أو الخدمة…">${U.esc(state.orderNotes)}</textarea></div>
        <div style="height:12px"></div>
        <div class="e-summary">
          <div class="e-sum-row"><span>المجموع (قبل الضريبة)</span><b>${U.money(t.pre)}</b></div>
          ${t.service ? `<div class="e-sum-row"><span>رسوم الخدمة (${U.num(settings().serviceChargeRate)}%)</span><b>${U.money(t.service)}</b></div>` : ''}
          <div class="e-sum-row"><span>ضريبة القيمة المضافة ${U.num(vatRate())}%</span><b>${U.money(t.tax)}</b></div>
          <div class="e-sum-row total"><span>الإجمالي المستحق</span><b>${U.money(t.total)}</b></div>
        </div>
      </div>
      <div class="e-sheet-foot">
        <button class="e-btn" data-submit ${settings().selfOrdering ? '' : 'disabled'}>${settings().selfOrdering ? 'إرسال الطلب إلى المطبخ' : 'الطلب الذاتي غير متاح حالياً'}</button>
        <div class="e-success-note" style="text-align:center">الدفع لدى الاستلام أو مع النادل — لا يتم سحب أي مبلغ الآن.</div>
      </div>`;
    openSheet(body);
    const sheet = $('#e-sheet-root .e-sheet');
    const bindInput = (sel, key) => {
      const el = $(sel, sheet);
      if (!el) return;
      el.addEventListener('input', () => { state[key] = el.value; });
    };
    bindInput('[data-name]', 'customerName');
    bindInput('[data-phone]', 'customerPhone');
    bindInput('[data-order-note]', 'orderNotes');
    $$('[data-type]', sheet).forEach((b) => b.addEventListener('click', () => {
      state.orderType = b.dataset.type;
      $$('[data-type]', sheet).forEach((x) => x.classList.toggle('active', x === b));
    }));
    $$('[data-inc]', sheet).forEach((b) => b.addEventListener('click', () => {
      const entry = state.cart[b.dataset.inc];
      if (entry) { entry.qty = Math.min(99, entry.qty + 1); saveCart(); cartSheet(); }
    }));
    $$('[data-dec]', sheet).forEach((b) => b.addEventListener('click', () => {
      const entry = state.cart[b.dataset.dec];
      if (!entry) return;
      if (entry.qty <= 1) delete state.cart[b.dataset.dec];
      else entry.qty -= 1;
      saveCart(); renderGrid(); renderCartbar();
      if (!totals().count) closeSheet(); else cartSheet();
    }));
    $$('[data-remove]', sheet).forEach((b) => b.addEventListener('click', () => {
      delete state.cart[b.dataset.remove];
      saveCart(); renderGrid(); renderCartbar();
      if (!totals().count) closeSheet(); else cartSheet();
    }));
    $('[data-submit]', sheet).addEventListener('click', submitOrder);
  }

  function submitOrder() {
    if (!settings().selfOrdering) { toast('الطلب الذاتي غير متاح حالياً', 'warn'); return; }
    const lines = cartLines();
    if (!lines.length) { toast('السلة فارغة', 'warn'); return; }
    const items = lines.map((l) => ({ productId: l.product.id, qty: l.entry.qty, notes: l.entry.note || '' }));
    try { BOM.check(items); }
    catch (e) { toast(e.message, 'error'); return; }
    try {
      const order = Orders.fromEmenu({
        tableId: state.table ? state.table.id : null,
        type: state.table ? 'dine_in' : (state.orderType === 'curbside' ? 'curbside' : 'takeaway'),
        items,
        customerName: state.customerName.trim() || (state.table ? 'ضيف الطاولة' : 'عميل سفري'),
        customerPhone: state.customerPhone.trim(),
        notes: state.orderNotes.trim()
      });
      state.lastOrderId = order.id;
      state.cart = {};
      state.orderNotes = '';
      saveCart();
      renderGrid();
      renderCartbar();
      showSuccess(order);
      toast('تم إرسال طلبك إلى المطبخ');
    } catch (e) {
      toast(e.message || 'تعذر إرسال الطلب', 'error');
    }
  }

  function statusIndex(status) {
    return { new: 0, preparing: 1, ready: 2, served: 3, completed: 3 }[status] !== undefined
      ? { new: 0, preparing: 1, ready: 2, served: 3, completed: 3 }[status] : 0;
  }

  function showSuccess(order) {
    const labels = ['تم الإرسال', 'قيد التحضير', 'جاهز', 'تم التقديم'];
    const icons = ['✓', '♨', '✓', '★'];
    const render = (o) => {
      const active = statusIndex(o.status);
      const cancelled = o.status === 'cancelled';
      return `<div class="e-sheet-grab"></div>
        <div class="e-sheet-body">
          <div class="e-success">
            <div class="e-success-ico">${cancelled ? '×' : '✓'}</div>
            <h3>${cancelled ? 'تم إلغاء الطلب' : 'تم إرسال طلبك!'}</h3>
            <p>${cancelled ? 'يرجى التواصل مع فريق الخدمة للمزيد.' : 'استلمنا طلبك وأرسلناه إلى المطبخ. تابع الحالة هنا.'}</p>
            <div class="e-order-no">${U.esc(o.number)}</div>
            <div class="e-order-total">${U.money(o.total)} • ${U.esc(o.tableName || (o.type === 'curbside' ? 'استلام سيارة' : 'استلام سفري'))}</div>
            ${cancelled ? '' : `<div class="e-steps">${labels.map((l, i) => `<div class="e-step ${i <= active ? 'done' : ''}"><i>${i <= active ? icons[i] : i + 1}</i><span>${l}</span></div>`).join('')}</div>
              <div class="e-success-note" data-live-status>الحالة الآن: ${U.esc(Orders.statusLabel(o.status))} — تتحدث تلقائياً</div>`}
          </div>
        </div>
        <div class="e-sheet-foot">
          <div class="e-success-actions">
            <button class="e-btn ghost" data-close>إغلاق</button>
            <button class="e-btn" data-new>طلب جديد</button>
          </div>
        </div>`;
    };
    openSheet(render(order), 'e-success-sheet');
    const sheet = $('#e-sheet-root .e-sheet');
    const newBtn = $('[data-new]', sheet);
    if (newBtn) newBtn.addEventListener('click', () => { closeSheet(); renderGrid(); renderCartbar(); });
    if (state.poll) clearInterval(state.poll);
    state.poll = setInterval(() => {
      if (!state.lastOrderId) { clearInterval(state.poll); state.poll = null; return; }
      refreshFromStorage();
      const current = Store.order(state.lastOrderId);
      if (!current) return;
      const live = $('[data-live-status]');
      if (live) live.textContent = `الحالة الآن: ${Orders.statusLabel(current.status)} — تتحدث تلقائياً`;
      if (current.status !== order.status) {
        order = current;
        if (current.status === 'cancelled') toast('تم إلغاء طلبك — راجع فريق الخدمة', 'warn');
        const root = $('#e-sheet-root');
        if (root && root.classList.contains('open') && $('.e-success')) {
          const scroll = $('.e-sheet-body');
          const top = scroll ? scroll.scrollTop : 0;
          openSheet(render(current), 'e-success-sheet');
          $$('[data-close]', root).forEach((el) => el.addEventListener('click', closeSheet));
          const nb = $('[data-new]', root);
          if (nb) nb.addEventListener('click', () => { closeSheet(); renderGrid(); renderCartbar(); });
          const body = $('.e-sheet-body');
          if (body) body.scrollTop = top;
        }
      }
    }, 5000);
  }

  /* ---------- Boot ---------- */
  function bind() {
    $('#e-search').addEventListener('input', (e) => {
      state.q = e.target.value;
      $('#e-search-clear').hidden = !state.q;
      renderGrid();
    });
    $('#e-search-clear').addEventListener('click', () => {
      state.q = '';
      $('#e-search').value = '';
      $('#e-search-clear').hidden = true;
      renderGrid();
    });
    $('#e-theme').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      $('#e-theme').textContent = next === 'dark' ? '☀' : '☾';
    });
    $('#e-open-cart').addEventListener('click', cartSheet);
    $('#e-grid').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) {
        e.stopPropagation();
        const p = Store.product(add.dataset.add);
        if (!p) return;
        if (!Store.availableOf(p)) { toast('هذا الصنف غير متوفر حالياً', 'warn'); return; }
        const entry = state.cart[p.id] || { qty: 0, note: '' };
        setCart(p.id, entry.qty + 1, entry.note);
        toast(`أضيف «${p.name}» إلى السلة`);
        return;
      }
      const card = e.target.closest('[data-product]');
      if (card) itemSheet(card.dataset.product);
    });
    window.addEventListener('online', updateOffline);
    window.addEventListener('offline', updateOffline);
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.indexOf('talaltechno.db') !== 0) return;
      refreshFromStorage();
      renderGrid();
      renderCartbar();
    });
    window.addEventListener('scroll', () => {
      $('#emenu').classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  function updateOffline() {
    $('#e-offline').hidden = navigator.onLine !== false;
  }

  function boot() {
    try {
      Store.init();
    } catch (e) {
      console.error(e);
      $('#boot').innerHTML = '<strong>تعذر تحميل القائمة</strong><span>يرجى تحديث الصفحة أو المحاولة لاحقاً.</span>';
      return;
    }
    let savedTheme = null;
    try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
    document.documentElement.setAttribute('data-theme', savedTheme || (Store.data.settings.theme === 'dark' ? 'dark' : 'light'));
    state.table = resolveTable();
    if (state.table) state.orderType = 'dine_in';
    loadCart();
    renderChrome();
    renderCats();
    renderGrid();
    renderCartbar();
    updateOffline();
    bind();
    $('#boot').hidden = true;
    $('#emenu').hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
