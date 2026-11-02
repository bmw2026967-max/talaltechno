/* ==========================================================================
   Page — CRM, loyalty tiers, points & coupons
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { tab: 'members', q: '' };

  const tierBadge = (points) => {
    const t = Store.loyaltyTier(points);
    return `<span class="badge" style="background:${t.color}18;color:${t.color}">${U.icon('award', 11)} ${t.label}</span>`;
  };

  function members() {
    const q = String(state.q || '').toLowerCase();
    return Store.data.customers.filter((c) => c.active !== false && (!q ||
      String(c.name).toLowerCase().includes(q) || String(c.phone || '').includes(q) || String(c.code || '').toLowerCase().includes(q)));
  }

  function newCustomerModal() {
    UI.modal({
      title: 'عميل جديد', subtitle: 'ملف CRM مع نقاط الولاء', icon: 'user', size: 'sm',
      body: `<div class="form-grid">
        <div class="field"><label>الاسم <span class="req">*</span></label><input class="input" data-name placeholder="اسم العميل" /></div>
        <div class="field"><label>الجوال <span class="req">*</span></label><input class="input" data-phone placeholder="+966 5x xxx xxxx" dir="ltr" /></div>
        <div class="field"><label>البريد الإلكتروني</label><input class="input" type="email" data-email placeholder="name@example.com" dir="ltr" /></div>
        <div class="field"><label>المدينة / العنوان</label><input class="input" data-address placeholder="الرياض — حي..." /></div>
        <div class="field"><label>نقاط ولاء افتتاحية</label><input class="input num" type="number" min="0" data-points value="0" /></div>
        <div class="field"><label>ملاحظات</label><input class="input" data-notes placeholder="تفضيلات، حساسية غذائية..." /></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('check', 15)} حفظ العميل</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const name = modal.querySelector('[data-name]').value.trim();
          const phone = modal.querySelector('[data-phone]').value.trim();
          if (!name || !phone) { UI.toast('الاسم والجوال مطلوبان', 'error'); return; }
          if (Store.data.customers.some((c) => String(c.phone).replace(/\s/g, '') === phone.replace(/\s/g, ''))) {
            UI.toast('رقم الجوال مسجل لعميل آخر', 'error'); return;
          }
          const points = Math.max(0, Math.floor(Number(modal.querySelector('[data-points]').value) || 0));
          const c = {
            id: U.uid('cus'), code: 'C-' + String(Store.data.customers.length + 1).padStart(3, '0'),
            name, phone, email: modal.querySelector('[data-email]').value.trim(),
            address: modal.querySelector('[data-address]').value.trim(), loyaltyPoints: points,
            notes: modal.querySelector('[data-notes]').value.trim(), active: true,
            createdAt: new Date().toISOString(), lifetimeSpend: 0
          };
          Store.data.customers.unshift(c);
          if (points > 0) {
            Store.data.loyaltyHistory.unshift({ id: U.uid('loy'), customerId: c.id, points, type: 'adjust', amount: 0, at: new Date().toISOString(), note: 'رصيد افتتاحي' });
          }
          Store.audit('عميل جديد', `${name} — ${phone}`, 'user');
          Store.save();
          close(); UI.toast('تم إضافة العميل', 'success'); App.refresh();
        });
      }
    });
  }

  function adjustModal(customer) {
    UI.modal({
      title: 'تسوية نقاط الولاء', subtitle: `${customer.name} • الرصيد ${U.num(customer.loyaltyPoints)} نقطة`, icon: 'award', size: 'sm',
      body: `<div class="field"><label>عدد النقاط (موجب للإضافة، سالب للخصم)</label><input class="input num" type="number" data-points value="50" /></div>
        <div class="field mt-2"><label>السبب</label><input class="input" data-note placeholder="مكافأة، تصحيح..." /></div>
        <div class="info-banner mt-2">${U.icon('info', 16)}<div>قيمة النقطة الحالية ${U.money(Store.data.settings.loyaltyValue)} — كل ${U.num(Store.data.settings.loyaltyPer)} ر.س = نقطة.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>تطبيق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          try {
            Loyalty.adjust(customer.id, modal.querySelector('[data-points]').value, modal.querySelector('[data-note]').value.trim());
            close(); UI.toast('تم تحديث نقاط العميل', 'success'); App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function customerModal(customer) {
    const orders = Store.data.invoices.filter((i) => i.customerId === customer.id && i.type === 'sale');
    const history = Store.data.loyaltyHistory.filter((h) => h.customerId === customer.id).slice(0, 20);
    const tier = Store.loyaltyTier(customer.loyaltyPoints);
    UI.modal({
      title: customer.name, subtitle: `${customer.phone || ''} • ${customer.code || ''}`, icon: 'user', size: 'lg',
      body: `<div class="balance-hero" style="margin-bottom:14px">
          <div><div class="bh-lbl">رصيد نقاط الولاء</div><div class="bh-val">${U.num(customer.loyaltyPoints)}</div>
            <div class="text-muted text-xs">${tier.label} • قيمة تقديرية ${U.money(customer.loyaltyPoints * (Store.data.settings.loyaltyValue || 0.05))}</div></div>
          <div class="bh-icon">${U.icon('award', 22)}</div>
        </div>
        <div class="detail-grid" style="margin-bottom:14px">
          <div class="detail-item"><div class="detail-label">إجمالي الإنفاق</div><div class="detail-value">${U.money(customer.lifetimeSpend || U.sum(orders, (o) => o.total))}</div></div>
          <div class="detail-item"><div class="detail-label">عدد الطلبات</div><div class="detail-value">${orders.length}</div></div>
          <div class="detail-item"><div class="detail-label">آخر زيارة</div><div class="detail-value">${customer.lastPurchase ? U.formatDate(customer.lastPurchase) : '—'}</div></div>
          <div class="detail-item"><div class="detail-label">العنوان</div><div class="detail-value">${U.esc(customer.address || '—')}</div></div>
        </div>
        <div class="card" style="margin-bottom:12px"><div class="card-head"><div class="card-title">${U.icon('receipt', 16)} آخر الطلبات</div></div>
          <div class="card-body flush">${orders.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>
            ${orders.slice(0, 6).map((o) => `<tr><td class="mono">${U.esc(o.number)}</td><td>${U.formatDate(o.date)}</td><td class="num">${U.money(o.total)}</td><td>${UI.statusBadge(o.status)}</td></tr>`).join('')}
          </tbody></table></div>` : `<div class="empty" style="padding:20px"><strong>لا توجد طلبات</strong></div>`}</div></div>
        <div class="card"><div class="card-head"><div class="card-title">${U.icon('clock', 16)} سجل النقاط</div></div>
          <div class="card-body flush">${history.length ? `<div class="mini-list">${history.map((h) => `<div class="mini-list-item"><span class="mi-ico ${h.points >= 0 ? 'green' : 'red'}">${U.icon(h.points >= 0 ? 'plus' : 'minus', 14)}</span><div class="mi-main"><strong>${U.esc(h.note || h.type)}</strong><span>${U.formatDateTime(h.at)}</span></div><span class="mi-val ${h.points >= 0 ? 'text-success' : 'text-danger'}">${h.points > 0 ? '+' : ''}${U.num(h.points)}</span></div>`).join('')}</div>` : `<div class="empty" style="padding:20px"><strong>لا توجد حركات نقاط</strong></div>`}</div></div>`,
      footer: `<button class="btn btn-secondary" data-adjust>${U.icon('award', 15)} تسوية النقاط</button>
        <button class="btn btn-primary" data-new-order>${U.icon('pos', 15)} طلب جديد</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-adjust]').addEventListener('click', () => { close(); adjustModal(customer); });
        modal.querySelector('[data-new-order]').addEventListener('click', () => { close(); window.__posCustomer = customer.id; App.navigate('#/pos'); });
      }
    });
  }

  function couponModal() {
    UI.modal({
      title: 'كوبون خصم جديد', subtitle: 'كوبون قابل للاستخدام في نقاط البيع', icon: 'gift', size: 'sm',
      body: `<div class="form-grid">
        <div class="field"><label>الرمز <span class="req">*</span></label><input class="input" data-code placeholder="WELCOME15" style="text-transform:uppercase" dir="ltr" /></div>
        <div class="field"><label>النوع</label><select class="select" data-type><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت</option></select></div>
        <div class="field"><label>القيمة <span class="req">*</span></label><input class="input num" type="number" min="0" step="0.01" data-value value="15" /></div>
        <div class="field"><label>الحد الأدنى للطلب</label><input class="input num" type="number" min="0" step="0.01" data-min value="50" /></div>
        <div class="field"><label>حد الاستخدام</label><input class="input num" type="number" min="1" data-limit value="100" /></div>
        <div class="field"><label>ينتهي في</label><input class="input" type="date" data-expiry value="${U.addDays(U.today(), 30)}" /></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('gift', 15)} إنشاء الكوبون</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          try {
            Loyalty.createCoupon({
              code: modal.querySelector('[data-code]').value.trim(),
              type: modal.querySelector('[data-type]').value,
              value: modal.querySelector('[data-value]').value,
              minSpend: modal.querySelector('[data-min]').value,
              usageLimit: modal.querySelector('[data-limit]').value,
              expiresAt: modal.querySelector('[data-expiry]').value
            });
            close(); UI.toast('تم إنشاء الكوبون', 'success'); App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function renderMembers(view) {
    const list = members();
    return `<div class="card">
      <div class="toolbar"><div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="بحث بالاسم أو الجوال..." value="${U.esc(state.q)}" /></div>
        <div class="toolbar-spacer"></div><span class="badge badge-gray">${list.length} عميل</span>
        <button class="btn btn-primary btn-sm" data-new-customer>${U.icon('plus', 14)} عميل جديد</button></div>
      <div class="card-body flush">${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>العميل</th><th>الجوال</th><th>المستوى</th><th>النقاط</th><th>الإنفاق</th><th>آخر زيارة</th><th></th></tr></thead>
        <tbody>${list.map((c) => `<tr>
          <td><div class="party-box">${UI.avatar(c.name, 'sm')}<div class="pb-main"><strong>${U.esc(c.name)}</strong><span>${U.esc(c.code || '')}</span></div></div></td>
          <td dir="ltr">${U.esc(c.phone || '—')}</td>
          <td>${tierBadge(c.loyaltyPoints)}</td>
          <td class="num">${U.num(c.loyaltyPoints)}</td>
          <td class="num">${U.money(c.lifetimeSpend || 0)}</td>
          <td>${c.lastPurchase ? U.formatDate(c.lastPurchase) : '—'}</td>
          <td class="actions-cell"><div class="row-actions"><button class="icon-btn" data-view="${c.id}" title="الملف">${U.icon('eye', 15)}</button><button class="icon-btn" data-points="${c.id}" title="تسوية">${U.icon('award', 15)}</button></div></td>
        </tr>`).join('')}</tbody></table></div>` : UI.empty('users', 'لا يوجد عملاء', 'أضف أول عميل لبدء برنامج الولاء')}</div></div>`;
  }

  function renderCoupons() {
    const coupons = Store.data.coupons || [];
    return `<div class="grid grid-3">${coupons.length ? coupons.map((c) => `<div class="coupon-card">
        <div class="coupon-top"><span class="coupon-code">${U.esc(c.code)}</span><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'فعّال' : 'موقوف'}</span></div>
        <div class="coupon-value">${c.type === 'percent' ? U.num(c.value) + '%' : U.money(c.value)}</div>
        <div class="coupon-meta">حد أدنى ${U.money(c.minSpend)} • ${U.num(c.used)}/${U.num(c.usageLimit)} استخدام</div>
        <div class="progress" style="margin-top:8px"><span style="width:${Math.min(100, c.used / c.usageLimit * 100)}%"></span></div>
        <div class="coupon-foot"><span>${c.expiresAt ? 'ينتهي ' + U.formatDate(c.expiresAt) : 'بدون انتهاء'}</span>
          <button class="btn btn-secondary btn-sm" data-toggle-coupon="${c.id}">${c.active ? 'إيقاف' : 'تفعيل'}</button></div>
      </div>`).join('') : `<div class="card" style="grid-column:1/-1">${UI.empty('gift', 'لا توجد كوبونات', 'أنشئ كوبوناً لجذب العملاء', `<button class="btn btn-primary btn-sm" data-new-coupon>كوبون جديد</button>`)}</div>`}</div>
      <div class="mt-2"><button class="btn btn-primary" data-new-coupon>${U.icon('plus', 15)} كوبون جديد</button></div>`;
  }

  function renderHistory() {
    const history = (Store.data.loyaltyHistory || []).slice(0, 80);
    return `<div class="card"><div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} سجل حركات النقاط</div><div class="card-sub">كسب، استبدال، تسويات ومرتجعات</div></div></div>
      <div class="card-body flush">${history.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>العميل</th><th>الحركة</th><th>النقاط</th><th>القيمة</th><th>الفاتورة</th><th>التاريخ</th></tr></thead><tbody>
        ${history.map((h) => { const c = Store.customer(h.customerId); return `<tr><td>${U.esc(c ? c.name : '—')}</td><td>${U.esc(h.note || h.type)}</td><td class="num ${h.points >= 0 ? 'text-success' : 'text-danger'}">${h.points > 0 ? '+' : ''}${U.num(h.points)}</td><td class="num">${U.money(h.amount || 0)}</td><td class="mono">${U.esc(h.invoiceNumber || '—')}</td><td>${U.formatDateTime(h.at)}</td></tr>`; }).join('')}
      </tbody></table></div>` : UI.empty('award', 'لا توجد حركات نقاط', 'ستظهر الحركات عند إتمام عمليات بيع أو استبدال')}</div></div>`;
  }

  Pages.loyalty = {
    title: 'العملاء والولاء',
    icon: 'heart',
    perm: 'loyalty',
    render(view) {
      const stats = Loyalty.stats();
      const tabs = [['members', 'الأعضاء', 'users'], ['coupons', 'الكوبونات', 'gift'], ['history', 'سجل النقاط', 'clock']];
      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">العملاء والولاء</div><div class="page-sub">ملفات CRM، مستويات العضوية، نقاط الولاء والكوبونات</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary" data-new-coupon>${U.icon('gift', 16)} كوبون</button>
            <button class="btn btn-primary" data-new-customer>${U.icon('plus', 16)} عميل جديد</button>
          </div>
        </div>
        <div class="kpi-grid" style="margin-bottom:18px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('users', 20)}</div></div><div class="kpi-label">أعضاء الولاء</div><div class="kpi-value">${U.num(stats.members)}</div><div class="kpi-foot"><span class="kpi-sub">عملاء مسجلون في CRM</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('award', 20)}</div></div><div class="kpi-label">رصيد النقاط</div><div class="kpi-value">${U.num(stats.points)}</div><div class="kpi-foot"><span class="kpi-sub">قيمة تقديرية ${U.money(stats.points * (Store.data.settings.loyaltyValue || 0.05))}</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('trendingUp', 20)}</div></div><div class="kpi-label">نقاط ممنوحة</div><div class="kpi-value">${U.num(stats.issued)}</div><div class="kpi-foot"><span class="kpi-sub">إجمالي ما تم كسبه</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon purple">${U.icon('gift', 20)}</div></div><div class="kpi-label">نقاط مستبدلة</div><div class="kpi-value">${U.num(stats.redeemed)}</div><div class="kpi-foot"><span class="kpi-sub">كوبونات وخصومات</span></div></div>
        </div>
        <div class="grid grid-4" style="margin-bottom:18px">
          ${Object.keys(stats.tiers).map((k) => {
            const meta = { bronze: ['برونزي', '#9a6b3f'], silver: ['فضي', '#64748b'], gold: ['ذهبي', '#a97c28'], platinum: ['بلاتيني', '#6d4fa3'] }[k];
            return `<div class="tier-card" style="--tier:${meta[1]}"><div class="tier-ico">${U.icon('award', 18)}</div><div><strong>${meta[0]}</strong><span>${U.num(stats.tiers[k])} عميل</span></div></div>`;
          }).join('')}
        </div>
        <div class="tabs" style="margin-bottom:16px">${tabs.map(([id, label, icon]) => `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}</button>`).join('')}</div>
        <div id="loyalty-content">${state.tab === 'members' ? renderMembers(view) : state.tab === 'coupons' ? renderCoupons() : renderHistory()}</div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; Pages.loyalty.render(view); }));
      view.querySelectorAll('[data-new-customer]').forEach((b) => b.addEventListener('click', newCustomerModal));
      view.querySelectorAll('[data-new-coupon]').forEach((b) => b.addEventListener('click', couponModal));
      view.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { const c = Store.customer(b.dataset.view); if (c) customerModal(c); }));
      view.querySelectorAll('[data-points]').forEach((b) => b.addEventListener('click', () => { const c = Store.customer(b.dataset.points); if (c) adjustModal(c); }));
      view.querySelectorAll('[data-toggle-coupon]').forEach((b) => b.addEventListener('click', () => {
        const c = Store.data.coupons.find((x) => x.id === b.dataset.toggleCoupon);
        if (c) { c.active = !c.active; Store.save(); UI.toast(c.active ? 'تم تفعيل الكوبون' : 'تم إيقاف الكوبون', 'success'); Pages.loyalty.render(view); }
      }));
      const q = view.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => { state.q = q.value; const box = view.querySelector('#loyalty-content'); if (box) box.innerHTML = renderMembers(view); Pages.loyalty.render(view); }, 200));
    }
  };
})();
