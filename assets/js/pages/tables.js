/* ==========================================================================
   Page — Tables, floor plan & open checks
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { filter: 'all', q: '' };

  function elapsed(order) {
    if (!order) return '';
    const start = new Date(order.createdAt || Date.now()).getTime();
    const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
    return mins < 60 ? `${mins} د` : `${Math.floor(mins / 60)} س ${mins % 60} د`;
  }

  function tableStatusMeta(status) {
    return {
      free: { label: 'متاحة', cls: 'free', icon: 'checkCircle' },
      occupied: { label: 'مشغولة', cls: 'occupied', icon: 'users' },
      reserved: { label: 'محجوزة', cls: 'reserved', icon: 'clock' }
    }[status] || { label: status, cls: 'free', icon: 'grid' };
  }

  function gotoPos(opts) {
    window.__posTable = opts.tableId || null;
    window.__posOrder = opts.orderId || null;
    window.__posType = opts.type || 'dine_in';
    App.navigate('#/pos');
  }

  function transferModal(order) {
    const free = Tables.all(order.branchId).filter((t) => t.id !== order.tableId && Tables.status(t) === 'free');
    UI.modal({
      title: 'نقل الطلب', subtitle: `${order.number} — من ${order.tableName || 'بدون طاولة'}`, icon: 'refresh', size: 'sm',
      body: free.length ? `<div class="field"><label>الطاولة الهدف</label><select class="select" data-table>${free.map((t) => `<option value="${t.id}">${U.esc(t.name)} — ${U.num(t.capacity)} مقاعد</option>`).join('')}</select></div>`
        : `<div class="info-banner warn">${U.icon('alert', 16)}<div>لا توجد طاولات متاحة للنقل.</div></div>`,
      footer: free.length ? `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('refresh', 15)} نقل الطلب</button>` : `<button class="btn btn-primary" data-cancel>حسناً</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        const save = modal.querySelector('[data-save]');
        if (save) save.addEventListener('click', () => {
          try { Orders.transfer(order.id, modal.querySelector('[data-table]').value); close(); UI.toast('تم نقل الطلب', 'success'); App.refresh(); }
          catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function splitModal(order) {
    UI.modal({
      title: 'تقسيم الفاتورة', subtitle: `${order.number} — اختر الأصناف للطلب الجديد`, icon: 'copy', size: 'sm',
      body: `<div class="split-list">${order.items.map((it, i) => `<label class="split-row"><input type="checkbox" value="${i}" /><span style="flex:1"><strong>${U.esc(it.name)}</strong><span>${U.num(it.qty)} × ${U.money(it.price)}</span></span><b>${U.money(it.qty * it.price)}</b></label>`).join('')}</div>
        <div class="info-banner mt-2">${U.icon('info', 16)}<div>سيُنشأ طلب جديد بنفس الطاولة مع الأصناف المحددة، ويبقى الباقي في الطلب الأصلي.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('copy', 15)} تقسيم</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const indexes = Array.from(modal.querySelectorAll('input[type=checkbox]:checked')).map((x) => Number(x.value));
          try { const r = Orders.split(order.id, indexes); close(); UI.toast(`تم إنشاء طلب ${r.split.number}`, 'success'); App.refresh(); }
          catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function orderModal(order) {
    const table = order.tableId ? Store.table(order.tableId) : null;
    const status = Orders.STATUS[order.status] || { label: order.status };
    UI.modal({
      title: `طلب ${order.number}`, subtitle: `${Orders.typeLabel(order.type)}${table ? ' • ' + table.name : ''} • ${status.label}`, icon: 'receipt', size: 'lg',
      body: `<div class="order-detail-head">
          <div class="order-total-hero"><span>الإجمالي</span><strong>${U.money(order.total)}</strong><small>${order.items.length} صنف • ${elapsed(order)}</small></div>
          <div class="detail-grid" style="flex:1">
            <div class="detail-item"><div class="detail-label">النادل</div><div class="detail-value">${U.esc(order.waiterName || '—')}</div></div>
            <div class="detail-item"><div class="detail-label">العميل</div><div class="detail-value">${U.esc(order.customerName || 'عميل نقدي')}</div></div>
            <div class="detail-item"><div class="detail-label">المصدر</div><div class="detail-value">${U.esc(order.platformName || (order.source === 'emenu' ? 'القائمة الإلكترونية' : 'نقطة البيع'))}</div></div>
            <div class="detail-item"><div class="detail-label">وقت الفتح</div><div class="detail-value">${U.formatDateTime(order.createdAt)}</div></div>
          </div>
        </div>
        <div class="table-wrap mt-2"><table class="table compact"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>المحطة</th></tr></thead><tbody>
          ${order.items.map((it) => `<tr><td>${it.emoji || ''} ${U.esc(it.name)}${it.notes ? `<div class="text-muted text-xs">${U.esc(it.notes)}</div>` : ''}</td><td>${U.num(it.qty)}</td><td class="num">${U.money(it.price)}</td><td class="num">${U.money(it.qty * it.price - (it.discount || 0))}</td><td><span class="badge badge-outline">${U.esc((Orders.STATIONS[it.station] || {}).label || 'التقديم')}</span></td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">المجموع قبل الضريبة</td><td class="num">${U.money(order.subtotal)}</td><td></td></tr>
          ${order.discount ? `<tr><td colspan="3">الخصم</td><td class="num">-${U.money(order.discount)}</td><td></td></tr>` : ''}
          ${order.serviceCharge ? `<tr><td colspan="3">خدمة</td><td class="num">${U.money(order.serviceCharge)}</td><td></td></tr>` : ''}
          <tr><td colspan="3">الضريبة</td><td class="num">${U.money(order.tax)}</td><td></td></tr>
          <tr><td colspan="3"><strong>الإجمالي</strong></td><td class="num"><strong>${U.money(order.total)}</strong></td><td></td></tr></tfoot></table></div>
        ${order.notes ? `<div class="info-banner mt-2">${U.icon('info', 16)}<div>${U.esc(order.notes)}</div></div>` : ''}`,
      footer: `<div class="foot-info">${U.esc(order.number)}</div>
        <button class="btn btn-secondary btn-sm" data-add>${U.icon('plus', 14)} إضافة أصناف</button>
        <button class="btn btn-secondary btn-sm" data-kitchen>${U.icon('chef', 14)} إرسال للمطبخ</button>
        <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
        <button class="btn btn-secondary btn-sm" data-transfer>${U.icon('refresh', 14)} نقل</button>
        <button class="btn btn-secondary btn-sm" data-split>${U.icon('copy', 14)} تقسيم</button>
        <button class="btn btn-primary btn-sm" data-checkout>${U.icon('pos', 14)} الدفع</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-add]').addEventListener('click', () => { close(); gotoPos({ orderId: order.id, tableId: order.tableId, type: order.type }); });
        modal.querySelector('[data-kitchen]').addEventListener('click', () => { try { Orders.sendToKitchen(order.id); UI.toast('تم إرسال الطلب للمطبخ', 'success'); close(); App.refresh(); } catch (e) { UI.toast(e.message, 'error'); } });
        modal.querySelector('[data-print]').addEventListener('click', () => { try { Printer.kitchen(order); UI.toast('تمت طباعة تذكرة المطبخ (محاكاة)', 'success'); } catch (e) { UI.toast(e.message, 'error'); } });
        modal.querySelector('[data-transfer]').addEventListener('click', () => { close(); transferModal(order); });
        modal.querySelector('[data-split]').addEventListener('click', () => { close(); splitModal(order); });
        modal.querySelector('[data-checkout]').addEventListener('click', () => { close(); gotoPos({ orderId: order.id, tableId: order.tableId, type: order.type }); });
      }
    });
  }

  function reservationModal(table) {
    UI.modal({
      title: 'حجز طاولة', subtitle: table.name, icon: 'calendar', size: 'sm',
      body: `<div class="form-grid"><div class="field"><label>اسم الضيف</label><input class="input" data-name placeholder="اسم الحاجز" /></div>
        <div class="field"><label>الجوال</label><input class="input" data-phone placeholder="+966 5x xxx xxxx" dir="ltr" /></div>
        <div class="field full"><label>وقت الحجز</label><input class="input" type="datetime-local" data-at value="${new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}" /></div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('calendar', 15)} حجز</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const name = modal.querySelector('[data-name]').value.trim();
          if (!name) { UI.toast('أدخل اسم الضيف', 'error'); return; }
          Tables.reserve(table.id, name, modal.querySelector('[data-phone]').value.trim(), modal.querySelector('[data-at]').value);
          close(); UI.toast('تم حجز الطاولة', 'success'); App.refresh();
        });
      }
    });
  }

  function tableModal(table) {
    const status = Tables.status(table);
    if (status === 'occupied') {
      const order = Tables.openOrder(table.id);
      if (order) orderModal(order);
      else { Tables.free(table.id); App.refresh(); }
      return;
    }
    if (status === 'reserved') {
      UI.modal({
        title: `طاولة ${table.name} — محجوزة`, subtitle: table.reservation ? `${table.reservation.name} • ${table.reservation.phone || ''}` : '', icon: 'calendar', size: 'sm',
        body: `<div class="info-banner">${U.icon('calendar', 16)}<div>الحجز: ${table.reservation && table.reservation.at ? U.formatDateTime(table.reservation.at) : '—'}</div></div>`,
        footer: `<button class="btn btn-secondary" data-free>${U.icon('x', 14)} إلغاء الحجز</button><button class="btn btn-primary" data-seat>${U.icon('users', 15)} إجلاس الضيف</button>`,
        onMount(modal, close) {
          modal.querySelector('[data-free]').addEventListener('click', () => { Tables.free(table.id); close(); UI.toast('تم إلغاء الحجز', 'success'); App.refresh(); });
          modal.querySelector('[data-seat]').addEventListener('click', () => { close(); gotoPos({ tableId: table.id, type: 'dine_in' }); });
        }
      });
      return;
    }
    UI.modal({
      title: `طاولة ${table.name}`, subtitle: `${U.num(table.capacity)} مقاعد • ${U.esc(Store.branchName(table.branchId))}`, icon: 'grid', size: 'sm',
      body: `<div class="table-hero free">${U.icon('checkCircle', 30)}<strong>الطاولة متاحة</strong><span>ابدأ طلباً محلياً أو احجز الطاولة</span></div>
        <div class="detail-grid mt-2"><div class="detail-item"><div class="detail-label">السعة</div><div class="detail-value">${U.num(table.capacity)} أشخاص</div></div><div class="detail-item"><div class="detail-label">المنطقة</div><div class="detail-value">${U.esc(table.zone || 'الصالة الرئيسية')}</div></div></div>`,
      footer: `<button class="btn btn-secondary" data-reserve>${U.icon('calendar', 15)} حجز</button><button class="btn btn-primary" data-open>${U.icon('pos', 15)} فتح طلب</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-reserve]').addEventListener('click', () => { close(); reservationModal(table); });
        modal.querySelector('[data-open]').addEventListener('click', () => { close(); gotoPos({ tableId: table.id, type: 'dine_in' }); });
      }
    });
  }

  Pages.tables = {
    title: 'الطاولات والطلبات',
    icon: 'grid',
    perm: 'tables',
    render(view) {
      const tables = Tables.all(App.branchId);
      const filtered = tables.filter((t) => {
        const st = Tables.status(t);
        if (state.filter !== 'all' && st !== state.filter) return false;
        const q = state.q.toLowerCase();
        return !q || String(t.name).toLowerCase().includes(q) || String(t.zone || '').toLowerCase().includes(q);
      });
      const counts = { free: 0, occupied: 0, reserved: 0 };
      tables.forEach((t) => { counts[Tables.status(t)]++; });
      const activeOrders = Orders.active().filter((o) => !o.platform || o.status !== 'completed');

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">الطاولات والطلبات المفتوحة</div><div class="page-sub">خريطة الصالة، فتح الحساب، النقل، التقسيم وإرسال الطلبات للمطبخ</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary" data-reserve-any>${U.icon('calendar', 16)} حجز</button>
            <button class="btn btn-primary" data-new-order>${U.icon('plus', 16)} طلب جديد</button>
          </div>
        </div>

        <div class="kpi-grid" style="margin-bottom:18px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('grid', 20)}</div></div><div class="kpi-label">إجمالي الطاولات</div><div class="kpi-value">${U.num(tables.length)}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(counts.free)} متاحة</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon red">${U.icon('users', 20)}</div></div><div class="kpi-label">طاولات مشغولة</div><div class="kpi-value">${U.num(counts.occupied)}</div><div class="kpi-foot"><span class="kpi-sub">${U.pct(tables.length ? counts.occupied / tables.length * 100 : 0)} إشغال</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('clock', 20)}</div></div><div class="kpi-label">محجوزة</div><div class="kpi-value">${U.num(counts.reserved)}</div><div class="kpi-foot"><span class="kpi-sub">بانتظار وصول الضيوف</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('receipt', 20)}</div></div><div class="kpi-label">قيمة الطلبات المفتوحة</div><div class="kpi-value">${U.money(U.sum(activeOrders, (o) => o.total))}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(activeOrders.length)} طلب نشط</span></div></div>
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="toolbar">
            <div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="بحث عن طاولة أو منطقة..." value="${U.esc(state.q)}" /></div>
            <div class="segmented" data-filter>
              <button class="${state.filter === 'all' ? 'active' : ''}" data-status="all">الكل <span class="count">${tables.length}</span></button>
              <button class="${state.filter === 'free' ? 'active' : ''}" data-status="free">متاحة <span class="count">${counts.free}</span></button>
              <button class="${state.filter === 'occupied' ? 'active' : ''}" data-status="occupied">مشغولة <span class="count">${counts.occupied}</span></button>
              <button class="${state.filter === 'reserved' ? 'active' : ''}" data-status="reserved">محجوزة <span class="count">${counts.reserved}</span></button>
            </div>
          </div>
          <div class="card-body">
            ${filtered.length ? `<div class="floor-grid">${filtered.map((t) => {
              const st = Tables.status(t);
              const meta = tableStatusMeta(st);
              const order = Tables.openOrder(t.id);
              const total = order ? order.total : 0;
              return `<button class="table-card ${meta.cls}" data-table="${t.id}">
                <div class="table-card-top"><span class="table-zone">${U.esc(t.zone || 'الصالة')}</span><span class="table-state">${U.icon(meta.icon, 12)} ${meta.label}</span></div>
                <div class="table-name">${U.esc(t.name)}</div>
                <div class="table-meta">${U.icon('users', 12)} ${U.num(t.capacity)} • ${st === 'occupied' ? elapsed(order) : st === 'reserved' ? 'محجوزة' : 'جاهزة'}</div>
                <div class="table-foot">${st === 'occupied' ? `<strong>${U.money(total)}</strong><span>${order ? order.items.length : 0} صنف</span>` : st === 'reserved' ? `<strong>${U.esc((t.reservation || {}).name || '')}</strong><span>حجز</span>` : `<strong>متاحة</strong><span>اضغط للفتح</span>`}</div>
              </button>`;
            }).join('')}</div>` : UI.empty('grid', 'لا توجد طاولات مطابقة', 'غيّر الفلتر أو أضف طاولات من الإعدادات')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('receipt', 18)} الطلبات النشطة</div><div class="card-sub">محلي، سفري، توصيل واستلام سيارة</div></div><span class="badge badge-gray">${activeOrders.length}</span></div>
          <div class="card-body flush">${activeOrders.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>الطلب</th><th>النوع</th><th>الطاولة</th><th>المصدر</th><th>الأصناف</th><th>الإجمالي</th><th>الحالة</th><th>الوقت</th><th></th></tr></thead><tbody>
            ${activeOrders.slice(0, 30).map((o) => `<tr><td class="mono">${U.esc(o.number)}</td><td>${U.esc(Orders.typeLabel(o.type))}</td><td>${U.esc(o.tableName || '—')}</td><td>${U.esc(o.platformName || (o.source === 'emenu' ? 'E-Menu' : 'POS'))}</td><td>${o.items.length}</td><td class="num">${U.money(o.total)}</td><td><span class="badge ${o.status === 'new' ? 'badge-blue' : o.status === 'preparing' ? 'badge-amber' : o.status === 'ready' ? 'badge-green' : 'badge-gray'}">${Orders.statusLabel(o.status)}</span></td><td>${elapsed(o)}</td><td><button class="btn btn-secondary btn-sm" data-order="${o.id}">عرض</button></td></tr>`).join('')}
          </tbody></table></div>` : UI.empty('receipt', 'لا توجد طلبات نشطة', 'ابدأ طلباً جديداً من الطاولات أو نقطة البيع')}</div>
        </div>`;

      view.querySelectorAll('[data-table]').forEach((b) => b.addEventListener('click', () => { const t = Store.table(b.dataset.table); if (t) tableModal(t); }));
      view.querySelectorAll('[data-order]').forEach((b) => b.addEventListener('click', () => { const o = Store.order(b.dataset.order); if (o) orderModal(o); }));
      view.querySelector('[data-new-order]').addEventListener('click', () => gotoPos({ type: 'takeaway' }));
      view.querySelector('[data-reserve-any]').addEventListener('click', () => {
        const free = tables.find((t) => Tables.status(t) === 'free');
        if (free) reservationModal(free); else UI.toast('لا توجد طاولات متاحة للحجز', 'error');
      });
      view.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => { state.filter = b.dataset.status; Pages.tables.render(view); }));
      const q = view.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => { state.q = q.value; Pages.tables.render(view); }, 220));
    }
  };
})();
