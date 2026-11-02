/* ==========================================================================
   Page — Kitchen Display System (KDS)
   Live order board, station filters, timers, 86-ing and kitchen printing.
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { station: 'all', auto: true, timer: null, sound: true };

  const COLUMNS = [
    { id: 'new', label: 'طلبات جديدة', icon: 'bell', tone: 'blue' },
    { id: 'preparing', label: 'قيد التحضير', icon: 'flame', tone: 'amber' },
    { id: 'ready', label: 'جاهزة للتقديم', icon: 'checkCircle', tone: 'green' }
  ];

  function minsSince(iso) {
    const t = new Date(iso || Date.now()).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((Date.now() - t) / 60000));
  }
  function timerText(iso) {
    const m = minsSince(iso);
    if (m < 60) return `${m} د`;
    return `${Math.floor(m / 60)} س ${m % 60} د`;
  }
  function timerTone(order) {
    const m = minsSince(order.sentAt || order.createdAt);
    if (m >= 25) return 'late';
    if (m >= 12) return 'warn';
    return 'ok';
  }

  function stationItems(order) {
    const items = (order.items || []).filter((it) => state.station === 'all' || (it.station || 'pass') === state.station);
    return items;
  }

  function orderCard(order) {
    const items = stationItems(order);
    if (!items.length && state.station !== 'all') return '';
    const tone = timerTone(order);
    const stationLabel = state.station === 'all' ? '' : (Orders.STATIONS[state.station] || {}).label;
    const next = order.status === 'new' ? 'preparing' : order.status === 'preparing' ? 'ready' : order.status === 'ready' ? 'served' : null;
    const nextLabel = order.status === 'new' ? 'بدء التحضير' : order.status === 'preparing' ? 'جاهز' : 'تم التقديم';
    const nextIcon = order.status === 'new' ? 'flame' : order.status === 'preparing' ? 'checkCircle' : 'bell';
    return `<article class="kds-card ${order.status} ${tone}" data-order="${order.id}">
      <div class="kds-card-top">
        <div class="kds-order-id"><strong>${U.esc(order.number)}</strong><span>${U.esc(Orders.typeLabel(order.type))}${order.tableName ? ' • ' + U.esc(order.tableName) : ''}</span></div>
        <div class="kds-timer ${tone}" data-timer="${U.esc(order.sentAt || order.createdAt)}">${U.icon('clock', 12)} ${timerText(order.sentAt || order.createdAt)}</div>
      </div>
      <div class="kds-meta">
        ${order.platformName ? `<span class="badge badge-outline">${U.icon('truck', 10)} ${U.esc(order.platformName)}</span>` : ''}
        ${order.source === 'emenu' ? `<span class="badge badge-outline">${U.icon('qr', 10)} قائمة إلكترونية</span>` : ''}
        ${order.waiterName ? `<span class="kds-waiter">${U.icon('user', 11)} ${U.esc(order.waiterName)}</span>` : ''}
        ${stationLabel ? `<span class="kds-station">${U.icon((Orders.STATIONS[state.station] || {}).icon || 'chef', 11)} ${U.esc(stationLabel)}</span>` : ''}
      </div>
      <div class="kds-items">
        ${items.map((it) => `<div class="kds-item">
          <span class="kds-qty">${U.num(it.qty, 0)}×</span>
          <span class="kds-item-main"><strong>${U.esc(it.name)}</strong>${it.notes ? `<small>${U.icon('info', 10)} ${U.esc(it.notes)}</small>` : ''}</span>
          <span class="kds-station-dot" style="background:${(Orders.STATIONS[it.station] || {}).color || '#0e5a44'}" title="${U.esc((Orders.STATIONS[it.station] || {}).label || 'التقديم')}"></span>
        </div>`).join('')}
      </div>
      ${order.notes ? `<div class="kds-note">${U.icon('info', 12)} ${U.esc(order.notes)}</div>` : ''}
      <div class="kds-card-foot">
        <span class="kds-total">${U.money(order.total)}</span>
        <div class="kds-actions">
          <button class="icon-btn" data-print-order="${order.id}" title="طباعة تذكرة">${U.icon('print', 15)}</button>
          <button class="icon-btn" data-cancel-order="${order.id}" title="إلغاء">${U.icon('x', 15)}</button>
          ${next ? `<button class="btn ${order.status === 'ready' ? 'btn-soft' : 'btn-primary'} btn-sm" data-next="${order.id}" data-status="${next}">${U.icon(nextIcon, 14)} ${nextLabel}</button>` : ''}
        </div>
      </div>
    </article>`;
  }

  function renderBoard(view) {
    const orders = Store.kitchenOrders().sort((a, b) => String(a.sentAt || a.createdAt).localeCompare(String(b.sentAt || b.createdAt)));
    COLUMNS.forEach((col) => {
      const list = orders.filter((o) => o.status === col.id).map(orderCard).filter(Boolean);
      const box = view.querySelector(`#kds-${col.id}`);
      if (box) box.innerHTML = list.length ? list.join('') : `<div class="kds-empty">${U.icon(col.icon, 24)}<span>لا توجد طلبات</span></div>`;
      const count = view.querySelector(`#kds-count-${col.id}`);
      if (count) count.textContent = list.length;
    });
    const all = orders.length;
    const avg = all ? Math.round(U.avg(orders, (o) => minsSince(o.sentAt || o.createdAt))) : 0;
    const set = (id, v) => { const el = view.querySelector(id); if (el) el.textContent = v; };
    set('#kds-kpi-new', orders.filter((o) => o.status === 'new').length);
    set('#kds-kpi-prep', orders.filter((o) => o.status === 'preparing').length);
    set('#kds-kpi-ready', orders.filter((o) => o.status === 'ready').length);
    set('#kds-kpi-avg', `${avg} د`);
  }

  function tickTimers(view) {
    if (App.currentRoute !== 'kds') { clearInterval(state.timer); state.timer = null; return; }
    view.querySelectorAll('[data-timer]').forEach((el) => {
      const m = minsSince(el.dataset.timer);
      el.innerHTML = `${U.icon('clock', 12)} ${timerText(el.dataset.timer)}`;
      el.classList.toggle('warn', m >= 12 && m < 25);
      el.classList.toggle('late', m >= 25);
    });
  }

  function open86Modal() {
    const menu = Store.menuProducts();
    UI.modal({
      title: 'إدارة توفر الأصناف (86)', subtitle: 'أخفِ الأصناف النافدة فوراً من نقطة البيع والقائمة الإلكترونية', icon: 'alert', size: 'lg',
      body: `<div class="info-banner warn">${U.icon('alert', 16)}<div>إخفاء الصنف يمنع بيعه من جميع القنوات حتى إعادة تفعيله. لا يؤثر على المخزون أو الوصفات.</div></div>
        <div class="kds-86-list mt-2">${menu.map((p) => `<label class="kds-86-row ${p.available === false ? 'off' : ''}">
          <span class="thumb sm">${p.emoji || '🍽️'}</span>
          <span class="kds-86-main"><strong>${U.esc(p.name)}</strong><span>${U.esc(p.sku)} • متاح ${U.num(Store.stockOf(p), 0)} حصة</span></span>
          <span class="badge ${p.available === false ? 'badge-red' : 'badge-green'}">${p.available === false ? 'موقوف' : 'متاح'}</span>
          <span class="switch"><input type="checkbox" data-86="${p.id}" ${p.available !== false ? 'checked' : ''} /><span></span></span>
        </label>`).join('')}</div>`,
      footer: `<span class="foot-info">${menu.filter((p) => p.available === false).length} صنف موقوف</span><button class="btn btn-primary" data-close>تم</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelectorAll('[data-86]').forEach((input) => input.addEventListener('change', () => {
          const p = Store.product(input.dataset.omit || input.dataset['86']);
          if (!p) return;
          p.available = input.checked;
          Store.audit(input.checked ? 'إعادة تفعيل صنف' : 'إيقاف صنف (86)', p.name, 'alert');
          Store.save();
          const row = input.closest('.kds-86-row');
          if (row) row.classList.toggle('off', !input.checked);
          const badge = row && row.querySelector('.badge');
          if (badge) { badge.className = 'badge ' + (input.checked ? 'badge-green' : 'badge-red'); badge.textContent = input.checked ? 'متاح' : 'موقوف'; }
          UI.toast(input.checked ? `تم تفعيل «${p.name}»` : `تم إيقاف «${p.name}» — 86`, input.checked ? 'success' : 'warning');
        }));
      }
    });
  }

  function cancelModal(order) {
    UI.confirm({
      title: 'إلغاء الطلب', message: `هل تريد إلغاء الطلب <strong>${U.esc(order.number)}</strong>؟ سيتم تحرير الطاولة إن وجدت.`,
      danger: true, confirmText: 'إلغاء الطلب', icon: 'x'
    }).then((ok) => {
      if (!ok) return;
      try { Orders.cancel(order.id, 'إلغاء من شاشة المطبخ'); UI.toast('تم إلغاء الطلب', 'success'); App.refresh(); }
      catch (e) { UI.toast(e.message, 'error'); }
    });
  }

  Pages.kds = {
    title: 'شاشة المطبخ', icon: 'chef', perm: 'kds',
    render(view) {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      const orders = Store.kitchenOrders();
      const stations = [{ id: 'all', label: 'كل المحطات', icon: 'chef' }].concat(Object.keys(Orders.STATIONS).map((k) => ({ id: k, label: Orders.STATIONS[k].label, icon: Orders.STATIONS[k].icon })));
      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">شاشة المطبخ — KDS</div><div class="page-sub">لوحة مباشرة للطلبات، مؤقتات التحضير، تنبيهات التأخير وإدارة توفر الأصناف</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-86>${U.icon('alert', 15)} إدارة 86</button>
            <button class="btn btn-secondary btn-sm" data-print-all>${U.icon('print', 15)} طباعة الطلبات</button>
            <button class="btn btn-primary btn-sm" data-refresh>${U.icon('refresh', 15)} تحديث</button>
          </div>
        </div>
        <div class="kpi-grid" style="margin-bottom:16px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('bell', 20)}</div></div><div class="kpi-label">طلبات جديدة</div><div class="kpi-value" id="kds-kpi-new">0</div><div class="kpi-foot"><span class="kpi-sub">بانتظار بدء التحضير</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('flame', 20)}</div></div><div class="kpi-label">قيد التحضير</div><div class="kpi-value" id="kds-kpi-prep">0</div><div class="kpi-foot"><span class="kpi-sub">على المحطات الآن</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('checkCircle', 20)}</div></div><div class="kpi-label">جاهزة</div><div class="kpi-value" id="kds-kpi-ready">0</div><div class="kpi-foot"><span class="kpi-sub">بانتظار النادل</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon purple">${U.icon('clock', 20)}</div></div><div class="kpi-label">متوسط الانتظار</div><div class="kpi-value" id="kds-kpi-avg">0 د</div><div class="kpi-foot"><span class="kpi-sub">من وقت الإرسال للمطبخ</span></div></div>
        </div>
        <div class="kds-toolbar">
          <div class="kds-stations">${stations.map((s) => `<button class="kds-station-btn ${state.station === s.id ? 'active' : ''}" data-station="${s.id}">${U.icon(s.icon, 15)} ${U.esc(s.label)}</button>`).join('')}</div>
          <div class="toolbar-spacer"></div>
          <label class="kds-auto"><span class="switch"><input type="checkbox" data-auto ${state.auto ? 'checked' : ''} /><span></span></span> تحديث تلقائي</label>
        </div>
        <div class="kds-board">
          ${COLUMNS.map((col) => `<section class="kds-col ${col.tone}">
            <header class="kds-col-head"><span>${U.icon(col.icon, 16)} ${col.label}</span><span class="kds-col-count" id="kds-count-${col.id}">0</span></header>
            <div class="kds-list" id="kds-${col.id}"></div>
          </section>`).join('')}
        </div>
        <div class="kds-footnote">${U.icon('info', 13)} اضغط على «بدء التحضير» عند استلام الطلب، و«جاهز» عند اكتمال جميع الأصناف. تتحدث المؤقتات كل ثانية.</div>`;

      renderBoard(view);

      view.querySelectorAll('[data-station]').forEach((b) => b.addEventListener('click', () => { state.station = b.dataset.station; Pages.kds.render(view); }));
      view.querySelector('[data-86]').addEventListener('click', open86Modal);
      view.querySelector('[data-refresh]').addEventListener('click', () => { renderBoard(view); UI.toast('تم تحديث الشاشة', 'success'); });
      view.querySelector('[data-print-all]').addEventListener('click', () => {
        const list = Store.kitchenOrders();
        if (!list.length) { UI.toast('لا توجد طلبات للطباعة', 'warning'); return; }
        list.forEach((o) => { try { Printer.kitchen(o); } catch (e) {} });
        UI.toast(`تم إرسال ${list.length} تذكرة للمطبخ (محاكاة)`, 'success');
      });
      const auto = view.querySelector('[data-auto]');
      if (auto) auto.addEventListener('change', () => { state.auto = auto.checked; UI.toast(auto.checked ? 'التحديث التلقائي مفعّل' : 'التحديث التلقائي موقوف', 'info'); });

      view.addEventListener('click', (e) => {
        const next = e.target.closest('[data-next]');
        if (next) {
          try {
            Orders.setStatus(next.dataset.next, next.dataset.status);
            if (next.dataset.status === 'preparing') UI.toast('بدأ تحضير الطلب', 'success');
            else if (next.dataset.status === 'ready') UI.toast('الطلب جاهز للتقديم', 'success');
            else UI.toast('تم تقديم الطلب', 'success');
            renderBoard(view);
          } catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        const print = e.target.closest('[data-print-order]');
        if (print) {
          const o = Store.order(print.dataset.printOrder);
          try { Printer.kitchen(o); UI.toast('تمت طباعة تذكرة المطبخ (محاكاة)', 'success'); }
          catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        const cancel = e.target.closest('[data-cancel-order]');
        if (cancel) { const o = Store.order(cancel.dataset.cancelOrder); if (o) cancelModal(o); }
      });

      if (state.auto) {
        state.timer = setInterval(() => {
          if (App.currentRoute !== 'kds') { clearInterval(state.timer); state.timer = null; return; }
          tickTimers(view);
          const before = view.dataset.sig || '';
          const sig = Store.kitchenOrders().map((o) => o.id + o.status).join('|');
          if (sig !== before) { view.dataset.sig = sig; renderBoard(view); }
        }, 1000);
      }
      view.dataset.sig = orders.map((o) => o.id + o.status).join('|');
    }
  };
})();
