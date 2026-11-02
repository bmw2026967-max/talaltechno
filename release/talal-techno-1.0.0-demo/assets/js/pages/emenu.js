/* ==========================================================================
   Page — QR e-menu (digital menu) management
   Table QR codes, self-ordering settings and live e-menu orders.
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { zone: 'all' };

  function baseUrl() {
    const custom = String((Store.data.settings.qrBaseUrl || '')).trim();
    if (custom) return custom.replace(/\/+$/, '') + '/emenu.html';
    try { return new URL('emenu.html', window.location.href).href; }
    catch (e) { return 'emenu.html'; }
  }
  function menuUrl(table) {
    const u = baseUrl();
    return table ? `${u}?table=${encodeURIComponent(table.id)}` : u;
  }
  function qrSvg(text, size) {
    const px = size || 150;
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true, alt: 'QR' })
        .replace('<svg', `<svg style="width:${px}px;height:${px}px"`);
    } catch (e) {
      return `<div class="qr-fallback">${U.icon('qr', 40)}</div>`;
    }
  }
  function emenuOrders() {
    return Store.data.orders.filter((o) => o.source === 'emenu');
  }
  function zones() {
    const set = {};
    Store.data.tables.forEach((t) => { set[t.zone || 'الصالة الرئيسية'] = true; });
    return Object.keys(set);
  }

  function printCards(tables) {
    const s = Store.data.settings;
    const cards = tables.map((t) => `<div class="qr-print-card">
      <div class="qr-print-brand">${U.icon('qr', 18)} ${U.esc(s.company)}</div>
      <h3>${U.esc(t.name)}</h3>
      <div class="qr-print-code">${qrSvg(menuUrl(t), 190)}</div>
      <p>امسح الرمز لعرض القائمة والطلب مباشرة</p>
      <small>${U.esc((t.zone || 'الصالة الرئيسية'))} • ${U.num(t.capacity)} مقاعد</small>
      <div class="qr-print-url" dir="ltr">${U.esc(menuUrl(t))}</div>
    </div>`).join('');
    const win = window.open('', '_blank');
    if (!win) { UI.toast('اسمح بالنوافذ المنبثقة للطباعة', 'warning'); return; }
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقات QR — ${U.esc(s.company)}</title>
      <style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:'Cairo',Tahoma,sans-serif;margin:0;background:#fff;color:#0a2b24;display:grid;grid-template-columns:1fr 1fr;gap:8mm;padding:8mm}
      .qr-print-card{border:1.5px solid #0e5a44;border-radius:6mm;padding:7mm;text-align:center;break-inside:avoid}
      .qr-print-brand{display:flex;align-items:center;justify-content:center;gap:2mm;color:#0e5a44;font-weight:800;font-size:11pt;border-bottom:1px dashed #cbd5d1;padding-bottom:3mm;margin-bottom:4mm}
      h3{margin:0 0 3mm;font-size:20pt;color:#0a2b24}.qr-print-code svg{width:52mm;height:52mm}
      p{margin:3mm 0 1mm;font-weight:700;color:#0e5a44;font-size:11pt}small{color:#64748b;font-size:9pt}
      .qr-print-url{margin-top:3mm;font-size:7pt;color:#94a3b8;direction:ltr;word-break:break-all}
      .qr-fallback{padding:20mm;color:#0e5a44}</style></head><body>${cards}</body></html>`);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch (e) {} }, 400);
  }

  function settingsModal() {
    const s = Store.data.settings;
    UI.modal({
      title: 'إعدادات القائمة الإلكترونية', subtitle: 'الطلب الذاتي، رابط الاستضافة والرسوم', icon: 'smartphone', size: 'md',
      body: `<div class="form-grid">
        <div class="field full"><label>الرابط الأساسي (اختياري)</label><input class="input" data-base dir="ltr" placeholder="${U.esc(baseUrl())}" value="${U.esc(s.qrBaseUrl || '')}" />
          <div class="hint">اتركه فارغاً لاستخدام رابط الصفحة الحالي. عند النشر على الإنترنت ضع رابط النطاق، مثل https://pos.example.com/emenu.html</div></div>
        <div class="field"><label>تفعيل الطلب الذاتي</label><label class="switch-row"><span class="switch"><input type="checkbox" data-self ${s.selfOrdering ? 'checked' : ''} /><span></span></span><span>يستطيع الضيف إرسال الطلب للمطبخ</span></label></div>
        <div class="field"><label>رسوم الخدمة %</label><input class="input" type="number" min="0" max="30" step="0.5" data-service value="${U.num(s.serviceChargeRate || 0, 2)}" /></div>
        <div class="field"><label>رسوم التوصيل</label><input class="input" type="number" min="0" step="0.5" data-delivery value="${U.num(s.deliveryFee || 0, 2)}" /></div>
        <div class="field"><label>ضريبة القيمة المضافة %</label><input class="input" type="number" min="0" max="50" step="0.5" data-vat value="${U.num(s.vatRate, 2)}" /></div>
        <div class="field full"><label>ملاحظة تظهر أسفل القائمة</label><input class="input" data-footer value="${U.esc(s.footer || '')}" /></div>
      </div>
      <div class="info-banner mt-2">${U.icon('info', 16)}<div>الطلب الذاتي يعمل دون إنترنت بعد تحميل الصفحة، ويُزامن الطلبات عند عودة الاتصال. جميع المدفوعات في القائمة تجريبية.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ الإعدادات</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const st = Store.data.settings;
          st.qrBaseUrl = modal.querySelector('[data-base]').value.trim();
          st.selfOrdering = modal.querySelector('[data-self]').checked;
          st.serviceChargeRate = U.round2(modal.querySelector('[data-service]').value);
          st.deliveryFee = U.round2(modal.querySelector('[data-delivery]').value);
          st.vatRate = U.round2(modal.querySelector('[data-vat]').value);
          st.footer = modal.querySelector('[data-footer]').value.trim();
          Store.audit('تحديث إعدادات القائمة الإلكترونية', st.selfOrdering ? 'الطلب الذاتي مفعّل' : 'الطلب الذاتي موقوف', 'smartphone');
          Store.save();
          close(); UI.toast('تم حفظ إعدادات القائمة الإلكترونية', 'success'); App.refresh();
        });
      }
    });
  }

  function previewModal(table) {
    const url = menuUrl(table);
    UI.modal({
      title: table ? `معاينة قائمة ${table.name}` : 'معاينة القائمة الإلكترونية',
      subtitle: 'تفتح في تبويب جديد — تعمل على الجوال والكمبيوتر',
      icon: 'qr', size: 'sm',
      body: `<div class="qr-box">${qrSvg(url, 210)}</div>
        <div class="code-block" dir="ltr">${U.esc(url)}</div>
        <div class="info-banner mt-2">${U.icon('info', 16)}<div>لتجربة الطلب الذاتي افتح الرابط في تبويب جديد. الطلبات تظهر في شاشة المطبخ مباشرة.</div></div>`,
      footer: `<button class="btn btn-secondary" data-copy>${U.icon('copy', 14)} نسخ الرابط</button><button class="btn btn-primary" data-open>${U.icon('external', 15)} فتح القائمة</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-copy]').addEventListener('click', () => {
          navigator.clipboard.writeText(url).then(() => UI.toast('تم نسخ الرابط', 'success')).catch(() => UI.toast('تعذر النسخ', 'error'));
        });
        modal.querySelector('[data-open]').addEventListener('click', () => { window.open(url, '_blank'); close(); });
      }
    });
  }

  Pages.emenu = {
    title: 'القائمة الإلكترونية',
    icon: 'smartphone',
    perm: 'emenu',
    render(view) {
      const s = Store.data.settings;
      const tables = Tables.all(App.branchId).filter((t) => state.zone === 'all' || (t.zone || 'الصالة الرئيسية') === state.zone);
      const menu = Store.menuProducts();
      const available = menu.filter((p) => Store.availableOf(p));
      const orders = emenuOrders();
      const todayOrders = orders.filter((o) => U.inRange(String(o.createdAt).slice(0, 10), U.today(), U.today()));
      const todaySales = U.sum(todayOrders, (o) => o.total);
      const zonesList = ['all'].concat(zones());
      const url = menuUrl(null);

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">القائمة الإلكترونية والطلب الذاتي</div><div class="page-sub">رموز QR لكل طاولة، قائمة جوال عربية، وطلب مباشر يصل للمطبخ</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary" data-settings>${U.icon('settings', 16)} إعدادات القائمة</button>
            <button class="btn btn-secondary" data-preview>${U.icon('eye', 16)} معاينة</button>
            <button class="btn btn-primary" data-print-all>${U.icon('print', 16)} طباعة بطاقات QR</button>
          </div>
        </div>

        <div class="kpi-grid" style="margin-bottom:16px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('qr', 20)}</div><span class="badge ${s.selfOrdering ? 'badge-green' : 'badge-red'}">${s.selfOrdering ? 'الطلب الذاتي مفعّل' : 'موقوف'}</span></div><div class="kpi-label">أصناف القائمة</div><div class="kpi-value">${U.num(menu.length)}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(available.length)} متاح للبيع</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('grid', 20)}</div></div><div class="kpi-label">طاولات برمز QR</div><div class="kpi-value">${U.num(tables.length)}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(zonesList.length - 1)} منطقة صالة</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('smartphone', 20)}</div></div><div class="kpi-label">طلبات القائمة اليوم</div><div class="kpi-value">${U.num(todayOrders.length)}</div><div class="kpi-foot"><span class="kpi-sub">${U.money(todaySales)} مبيعات</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon purple">${U.icon('clock', 20)}</div></div><div class="kpi-label">طلبات نشطة</div><div class="kpi-value">${U.num(orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status)).length)}</div><div class="kpi-foot"><span class="kpi-sub">داخل المطبخ الآن</span></div></div>
        </div>

        <div class="grid-2-1">
          <div class="card">
            <div class="card-head">
              <div><div class="card-title">رموز QR للطاولات</div><div class="card-sub">امسح الرمز لفتح القائمة وربط الطلب بالطاولة تلقائياً</div></div>
              <div class="chips">${zonesList.map((z) => `<button class="chip ${state.zone === z ? 'active' : ''}" data-zone="${U.esc(z)}">${U.esc(z === 'all' ? 'كل المناطق' : z)}</button>`).join('')}</div>
            </div>
            <div class="qr-grid">
              <div class="qr-card main">
                <div class="qr-card-code">${qrSvg(url, 132)}</div>
                <div class="qr-card-body"><strong>${U.icon('qr', 14)} قائمة عامة</strong><span>تفتح بدون ربط طاولة — للطلبات السفرية</span>
                  <div class="qr-card-actions"><button class="btn btn-secondary btn-xs" data-preview>${U.icon('eye', 12)} معاينة</button><button class="btn btn-secondary btn-xs" data-copy="${U.esc(url)}">${U.icon('copy', 12)} نسخ</button></div>
                </div>
              </div>
              ${tables.map((t) => `<div class="qr-card">
                <div class="qr-card-code">${qrSvg(menuUrl(t), 118)}</div>
                <div class="qr-card-body"><strong>${U.esc(t.name)}</strong><span>${U.esc(t.zone || 'الصالة الرئيسية')} • ${U.num(t.capacity)} مقاعد</span>
                  <div class="qr-card-actions"><button class="btn btn-secondary btn-xs" data-preview-table="${t.id}">${U.icon('eye', 12)} معاينة</button><button class="btn btn-secondary btn-xs" data-print-one="${t.id}">${U.icon('print', 12)} طباعة</button></div>
                </div>
              </div>`).join('')}
            </div>
            ${!tables.length ? `<div class="empty-state">${U.icon('grid', 28)}<strong>لا توجد طاولات في هذه المنطقة</strong><span>أضف الطاولات من صفحة الطاولات أولاً</span></div>` : ''}
          </div>

          <div class="stack">
            <div class="card">
              <div class="card-head"><div><div class="card-title">حالة القائمة</div><div class="card-sub">القنوات المتاحة للطلب الذاتي</div></div></div>
              <div class="check-list">
                <div class="check-row"><span class="check-ico ${s.selfOrdering ? 'ok' : 'off'}">${U.icon(s.selfOrdering ? 'check' : 'x', 13)}</span><span style="flex:1">الطلب الذاتي من الجوال</span><b>${s.selfOrdering ? 'مفعّل' : 'موقوف'}</b></div>
                <div class="check-row"><span class="check-ico ok">${U.icon('check', 13)}</span><span style="flex:1">أسعار الضريبة والرسوم</span><b>${U.num(s.vatRate)}%</b></div>
                <div class="check-row"><span class="check-ico ok">${U.icon('check', 13)}</span><span style="flex:1">العملة</span><b>${U.esc(s.currency)}</b></div>
                <div class="check-row"><span class="check-ico ok">${U.icon('check', 13)}</span><span style="flex:1">تحديث التوفر تلقائياً</span><b>${U.num(available.length)}/${U.num(menu.length)}</b></div>
              </div>
              <div class="code-block mt-2" dir="ltr">${U.esc(url)}</div>
              <button class="btn btn-soft w-full mt-2" data-copy="${U.esc(url)}">${U.icon('copy', 15)} نسخ رابط القائمة</button>
            </div>
            <div class="card">
              <div class="card-head"><div><div class="card-title">آخر طلبات القائمة</div><div class="card-sub">تصل مباشرة إلى شاشة المطبخ</div></div><a class="link" href="#/kds">المطبخ ${U.icon('chevronLeft', 13)}</a></div>
              ${orders.slice(0, 5).map((o) => `<div class="detail-row"><div class="detail-row-main"><strong>${U.esc(o.number)}</strong><span>${U.esc(o.tableName || 'سفري')} • ${U.formatTime(o.createdAt)}</span></div><div class="detail-row-side"><b>${U.money(o.total)}</b><span class="badge ${o.status === 'new' ? 'badge-blue' : o.status === 'preparing' ? 'badge-amber' : o.status === 'ready' ? 'badge-green' : 'badge-gray'}">${U.esc(Orders.statusLabel(o.status))}</span></div></div>`).join('') || `<div class="empty-state compact">${U.icon('smartphone', 26)}<strong>لا توجد طلبات بعد</strong><span>افتح القائمة من أحد رموز QR لتجربة الطلب</span></div>`}
            </div>
          </div>
        </div>

        <div class="info-banner mt-2">${U.icon('info', 16)}<div>الطلبات الواردة من القائمة تُنشأ كطلبات محلية مرتبطة بالطاولة. المدفوعات في نسخة العرض تجريبية ولا تتصل ببوابات دفع حقيقية.</div></div>`;

      view.querySelectorAll('[data-zone]').forEach((b) => b.addEventListener('click', () => { state.zone = b.dataset.zone; Pages.emenu.render(view); }));
      view.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => previewModal(null)));
      view.querySelectorAll('[data-preview-table]').forEach((b) => b.addEventListener('click', () => previewModal(Store.table(b.dataset.previewTable))));
      view.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => {
        navigator.clipboard.writeText(b.dataset.copy).then(() => UI.toast('تم نسخ الرابط', 'success')).catch(() => UI.toast('تعذر النسخ', 'error'));
      }));
      view.querySelectorAll('[data-print-one]').forEach((b) => b.addEventListener('click', () => printCards([Store.table(b.dataset.printOne)].filter(Boolean))));
      view.querySelector('[data-print-all]').addEventListener('click', () => printCards(tables));
      view.querySelector('[data-settings]').addEventListener('click', settingsModal);
    }
  };
})();
