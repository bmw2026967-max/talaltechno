/* ==========================================================================
   Page — Integrations: payments, delivery, thermal printer, sync
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { tab: 'payments' };

  function providerCard(p) {
    const methods = (p.methods || []).map((m) => `<span class="badge badge-outline">${U.esc(Payments.methodLabel(m))}</span>`).join(' ');
    return `<div class="provider-card">
      <div class="provider-head"><div class="provider-logo" style="--pc:${p.id === 'hyperpay' ? '#0e5a44' : p.id === 'geidea' ? '#7c3aed' : p.id === 'moyasar' ? '#0ea5e9' : p.id === 'paytabs' ? '#ea580c' : '#64748b'}">${U.esc((p.name || '?').slice(0, 2))}</div>
        <div style="flex:1;min-width:0"><strong>${U.esc(p.name)}</strong><span>${U.esc(p.docs || 'Payment provider')}</span></div>
        <span class="badge ${p.enabled !== false ? 'badge-green' : 'badge-gray'}">${p.enabled !== false ? 'مفعّل' : 'موقوف'}</span></div>
      <div class="provider-body">
        <div class="provider-row"><span>الوضع</span><b><span class="badge badge-gold">${U.esc(p.mode || 'mock')}</span></b></div>
        <div class="provider-row"><span>NPG / SAMA</span><b>${p.npg ? U.icon('checkCircle', 14) + ' معتمد لدى المزود' : '—'}</b></div>
        <div class="provider-row"><span>طرق الدفع</span><div class="chips" style="gap:4px">${methods}</div></div>
      </div>
      <div class="provider-foot"><button class="btn btn-secondary btn-sm" data-test-pay="${p.id}">${U.icon('card', 14)} اختبار دفع</button></div>
    </div>`;
  }

  function paymentTestModal(providerId) {
    const provider = Payments.provider(providerId);
    const methods = (provider.methods || ['mada', 'visa', 'mastercard', 'applepay', 'stcpay']);
    UI.modal({
      title: 'اختبار بوابة دفع', subtitle: `${provider.name} — Mock / Sandbox`, icon: 'card', size: 'sm',
      body: `<div class="form-grid">
        <div class="field"><label>المزود</label><input class="input" value="${U.esc(provider.name)}" disabled /></div>
        <div class="field"><label>طريقة الدفع</label><select class="select" data-method>${methods.map((m) => `<option value="${m}">${U.esc(Payments.methodLabel(m))}</option>`).join('')}</select></div>
        <div class="field full"><label>المبلغ (ر.س)</label><input class="input num" type="number" min="1" step="0.01" data-amount value="115.00" /></div>
      </div>
      <div class="info-banner mt-2">${U.icon('info', 16)}<div>عملية تجريبية بالكامل. لا يتم الاتصال بأي بوابة حقيقية ولا تُخصم أي مبالغ.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-run>${U.icon('send', 15)} تنفيذ الاختبار</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        const run = modal.querySelector('[data-run]');
        run.addEventListener('click', async () => {
          run.disabled = true; run.textContent = 'جارٍ التنفيذ...';
          try {
            const tx = await Payments.charge({
              provider: provider.id, method: modal.querySelector('[data-method]').value,
              amount: modal.querySelector('[data-amount]').value
            });
            close();
            UI.toast(`${tx.message} — ${tx.transactionId}`, 'success', 'نجحت العملية التجريبية');
            Pages.integrations.render(document.getElementById('view'));
          } catch (e) { run.disabled = false; run.textContent = 'تنفيذ الاختبار'; UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function deliveryCard(p) {
    const stats = Delivery.stats().byPlatform.find((x) => x.id === p.id) || { count: 0, total: 0 };
    return `<div class="provider-card">
      <div class="provider-head"><div class="provider-logo" style="--pc:${p.color || '#0e5a44'}">${U.esc((p.name || '?').slice(0, 2))}</div>
        <div style="flex:1;min-width:0"><strong>${U.esc(p.name)}</strong><span>${p.lastSync ? 'آخر مزامنة ' + U.timeAgo(p.lastSync) : 'لم تتم مزامنة بعد'}</span></div>
        <label class="switch"><input type="checkbox" data-toggle-platform="${p.id}" ${p.enabled !== false ? 'checked' : ''} /><span></span></label></div>
      <div class="provider-body">
        <div class="provider-row"><span>الوضع</span><b><span class="badge badge-gold">${U.esc(p.mode || 'mock')}</span></b></div>
        <div class="provider-row"><span>طلبات اليوم</span><b>${U.num(stats.count)} طلب</b></div>
        <div class="provider-row"><span>مبيعات اليوم</span><b>${U.money(stats.total)}</b></div>
        <div class="provider-row"><span>مزامنة القائمة</span><b>${p.syncedItems ? U.num(p.syncedItems) + ' صنف' : '—'}</b></div>
      </div>
      <div class="provider-foot"><button class="btn btn-secondary btn-sm" data-sync-platform="${p.id}">${U.icon('refresh', 14)} مزامنة القائمة</button>
        <button class="btn btn-primary btn-sm" data-simulate="${p.id}">${U.icon('plus', 14)} طلب تجريبي</button></div>
    </div>`;
  }

  function renderPayments() {
    const stats = Payments.stats();
    return `<div class="grid grid-2" style="margin-bottom:18px">${Payments.providers().map(providerCard).join('')}</div>
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('list', 18)} سجل عمليات الدفع</div><div class="card-sub">آخر 30 عملية — كلها Mock</div></div><span class="badge badge-gray">${U.num(stats.count)} عملية</span></div>
        <div class="card-body flush">${(Store.data.paymentLogs || []).length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>المزود</th><th>الطريقة</th><th>المبلغ</th><th>الحالة</th><th>Transaction</th><th>التاريخ</th></tr></thead><tbody>
          ${(Store.data.paymentLogs || []).slice(0, 30).map((t) => `<tr><td>${U.esc(t.providerName)}</td><td>${U.esc(Payments.methodLabel(t.method))}</td><td class="num">${U.money(t.amount)}</td><td><span class="badge ${t.status === 'approved' ? 'badge-green' : 'badge-red'}">${t.status === 'approved' ? 'موافق' : 'فشل'}</span></td><td class="mono" style="font-size:10px">${U.esc(t.transactionId || '—')}</td><td>${U.formatDateTime(t.at)}</td></tr>`).join('')}
        </tbody></table></div>` : UI.empty('card', 'لا توجد عمليات دفع', 'استخدم زر اختبار دفع لتجربة بوابة')}</div></div>`;
  }

  function renderDelivery() {
    const active = Store.data.orders.filter((o) => o.platform && ['new', 'preparing', 'ready'].includes(o.status));
    return `<div class="grid grid-3" style="margin-bottom:18px">${Delivery.platforms().map(deliveryCard).join('')}</div>
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('truck', 18)} طلبات التوصيل النشطة</div><div class="card-sub">واردة من المنصات — محاكاة</div></div><span class="badge badge-gray">${active.length}</span></div>
        <div class="card-body flush">${active.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>الطلب</th><th>المنصة</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead><tbody>
          ${active.map((o) => `<tr><td class="mono">${U.esc(o.number)}</td><td><span class="badge badge-outline">${U.esc(o.platformName || o.platform)}</span></td><td>${U.esc(o.customerName)}</td><td class="num">${U.money(o.total)}</td><td><span class="badge ${o.status === 'new' ? 'badge-blue' : o.status === 'preparing' ? 'badge-amber' : 'badge-green'}">${Orders.statusLabel(o.status)}</span></td><td><button class="btn btn-secondary btn-sm" data-open-order="${o.id}">عرض</button></td></tr>`).join('')}
        </tbody></table></div>` : UI.empty('truck', 'لا توجد طلبات توصيل نشطة', 'استخدم «طلب تجريبي» لاستقبال طلب من إحدى المنصات')}</div></div>`;
  }

  function renderPrinter() {
    const cfg = Store.data.settings.printer || {};
    const jobs = Store.data.printerJobs || [];
    return `<div class="grid grid-1-2">
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('print', 18)} إعدادات الطابعة</div><div class="card-sub">Mock ESC/POS — USB / Bluetooth / TCP/IP</div></div><span class="badge badge-gold">Mock</span></div>
        <div class="card-body"><div class="form-grid">
          <div class="field"><label>الاتصال</label><select class="select" data-printer-connection>${['mock', 'usb', 'bluetooth', 'network'].map((c) => `<option value="${c}" ${cfg.connection === c ? 'selected' : ''}>${({ mock: 'Mock (افتراضي)', usb: 'USB', bluetooth: 'Bluetooth', network: 'شبكة TCP/IP' })[c]}</option>`).join('')}</select></div>
          <div class="field"><label>اسم الطابعة</label><input class="input" data-printer-name value="${U.esc(cfg.name || '')}" /></div>
          <div class="field"><label>IP</label><input class="input" data-printer-ip value="${U.esc(cfg.ip || '')}" dir="ltr" /></div>
          <div class="field"><label>المنفذ</label><input class="input num" data-printer-port value="${U.esc(cfg.port || 9100)}" dir="ltr" /></div>
          <div class="field"><label>عرض الورق</label><select class="select" data-printer-width><option value="80" ${Number(cfg.width) === 80 ? 'selected' : ''}>80mm</option><option value="58" ${Number(cfg.width) === 58 ? 'selected' : ''}>58mm</option></select></div>
          <div class="field"><label>النسخ</label><input class="input num" type="number" min="1" data-printer-copies value="${cfg.copies || 1}" /></div>
        </div>
        <div class="check-row ${cfg.autoPrintKitchen ? 'ok' : ''}"><input type="checkbox" data-printer-kitchen ${cfg.autoPrintKitchen ? 'checked' : ''} /><span>طباعة تذكرة المطبخ تلقائياً</span></div>
        <div class="check-row ${cfg.autoPrintReceipt ? 'ok' : ''}"><input type="checkbox" data-printer-receipt ${cfg.autoPrintReceipt ? 'checked' : ''} /><span>طباعة الفاتورة تلقائياً بعد الدفع</span></div>
        <div class="flex gap-2 mt-2"><button class="btn btn-primary" data-printer-save>${U.icon('save', 15)} حفظ</button><button class="btn btn-secondary" data-printer-test>${U.icon('print', 15)} فحص الطباعة</button><button class="btn btn-secondary" data-printer-drawer>${U.icon('wallet', 15)} فتح الدرج</button></div></div></div>
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('list', 18)} مهام الطباعة</div><div class="card-sub">آخر 25 مهمة تجريبية</div></div><span class="badge badge-gray">${U.num(jobs.length)}</span></div>
        <div class="card-body flush">${jobs.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>النوع</th><th>المستند</th><th>الطابعة</th><th>الحجم</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>
          ${jobs.slice(0, 25).map((j) => `<tr><td>${j.kind === 'kitchen' ? 'مطبخ' : j.kind === 'test' ? 'اختبار' : 'فاتورة'}</td><td class="mono">${U.esc(j.number || '—')}</td><td>${U.esc(j.printer)}</td><td class="num">${U.num(j.bytes)} B</td><td><span class="badge badge-green">${U.esc(j.status)}</span></td><td>${U.formatDateTime(j.at)}</td><td><div class="row-actions"><button class="icon-btn" data-view-job="${j.id}" title="عرض">${U.icon('eye', 14)}</button><button class="icon-btn" data-reprint="${j.id}" title="إعادة طباعة">${U.icon('refresh', 14)}</button></div></td></tr>`).join('')}
        </tbody></table></div>` : UI.empty('print', 'لا توجد مهام طباعة', 'ستظهر المهام عند طباعة فاتورة أو تذكرة مطبخ')}</div></div>
    </div>`;
  }

  function renderSync() {
    const s = Sync.status();
    return `<div class="grid grid-2" style="margin-bottom:18px">
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('cloud', 18)} المزامنة السحابية</div><div class="card-sub">Offline-First • Outbox Pattern</div></div><span class="badge ${s.online ? 'badge-green' : 'badge-red'}">${s.online ? 'متصل' : 'غير متصل'}</span></div>
        <div class="card-body">
          <div class="sync-hero"><div class="sync-ring ${s.online ? 'on' : 'off'}">${U.icon(s.online ? 'cloud' : 'wifi', 26)}</div>
            <div><strong>${s.pending ? U.num(s.pending) + ' تغيير بانتظار المزامنة' : 'كل البيانات متزامنة'}</strong><span>${s.lastSync ? 'آخر مزامنة ' + U.timeAgo(s.lastSync) : 'لم تتم مزامنة بعد'}</span></div></div>
          <div class="detail-grid mt-2">
            <div class="detail-item"><div class="detail-label">معرّف الجهاز</div><div class="detail-value mono">${U.esc(s.deviceId)}</div></div>
            <div class="detail-item"><div class="detail-label">المستأجر</div><div class="detail-value mono">${U.esc(s.tenant)}</div></div>
            <div class="detail-item"><div class="detail-label">صندوق الصادر</div><div class="detail-value">${U.num(s.outbox)} فاتورة</div></div>
            <div class="detail-item"><div class="detail-label">التخزين المحلي</div><div class="detail-value">localStorage</div></div>
          </div>
          <div class="flex gap-2 mt-2"><button class="btn btn-primary" data-sync-push>${U.icon('upload', 15)} مزامنة الآن</button><button class="btn btn-secondary" data-sync-pull>${U.icon('download', 15)} سحب التحديثات</button></div>
          <div class="info-banner mt-2">${U.icon('info', 16)}<div>المزامنة محاكاة محلياً. في نسخة الإنتاج تُرسل العمليات إلى PostgreSQL عبر Outbox مع حل التعارضات.</div></div>
        </div></div>
      <div class="card"><div class="card-head"><div><div class="card-title">${U.icon('list', 18)} سجل المزامنة والتكاملات</div><div class="card-sub">آخر 25 عملية</div></div></div>
        <div class="card-body flush">${s.logs.length ? `<div class="mini-list">${s.logs.slice(0, 25).map((l) => `<div class="mini-list-item"><span class="mi-ico ${l.status === 'ok' ? 'green' : 'red'}">${U.icon(l.kind === 'payment' ? 'card' : l.kind === 'delivery' ? 'truck' : l.kind === 'printer' ? 'print' : 'cloud', 14)}</span><div class="mi-main"><strong>${U.esc(l.provider)} — ${U.esc(l.action)}</strong><span>${U.esc(l.details || '')}</span></div><span class="mi-val text-xs">${U.formatTime(l.at)}</span></div>`).join('')}</div>` : UI.empty('cloud', 'لا توجد عمليات')}</div></div>
    </div>`;
  }

  function jobModal(job) {
    UI.modal({
      title: 'محتوى مهمة الطباعة', subtitle: `${job.printer} • ${job.bytes} بايت`, icon: 'print', size: 'lg',
      body: `<pre class="code-block" style="direction:ltr;text-align:left;white-space:pre-wrap;max-height:420px">${U.esc(job.text || '')}</pre>
        <div class="info-banner warn mt-2">${U.icon('alert', 16)}<div>هذه طابعة وهمية (Mock). لم يتم إرسال أي بيانات إلى جهاز فعلي.</div></div>`,
      footer: `<button class="btn btn-secondary" data-reprint>${U.icon('refresh', 15)} إعادة طباعة</button><button class="btn btn-primary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-reprint]').addEventListener('click', () => { try { Printer.reprint(job.id); close(); UI.toast('تمت إعادة الطباعة التجريبية', 'success'); Pages.integrations.render(document.getElementById('view')); } catch (e) { UI.toast(e.message, 'error'); } });
      }
    });
  }

  Pages.integrations = {
    title: 'التكاملات والتوصيل',
    icon: 'cloud',
    perm: 'integrations',
    render(view) {
      const tabs = [['payments', 'المدفوعات', 'card'], ['delivery', 'التوصيل', 'truck'], ['printer', 'الطباعة الحرارية', 'print'], ['sync', 'المزامنة', 'cloud']];
      const summary = Integrations.summary();
      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">التكاملات والتوصيل</div><div class="page-sub">بوابات دفع سعودية، منصات توصيل، طباعة ESC/POS ومزامنة Offline-First — جميعها Mock افتراضياً</div></div>
          <div class="page-actions"><span class="badge badge-gold">Sandbox / Mock</span><button class="btn btn-secondary" data-refresh>${U.icon('refresh', 16)} تحديث</button></div>
        </div>
        <div class="kpi-grid" style="margin-bottom:18px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('card', 20)}</div></div><div class="kpi-label">حجم المدفوعات التجريبية</div><div class="kpi-value">${U.money(summary.payments.volume)}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(summary.payments.approved)} عملية موافق عليها</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('truck', 20)}</div></div><div class="kpi-label">طلبات التوصيل اليوم</div><div class="kpi-value">${U.num(summary.delivery.today)}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(summary.delivery.active)} طلب نشط</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('print', 20)}</div></div><div class="kpi-label">مهام الطباعة</div><div class="kpi-value">${U.num(summary.printer.jobs)}</div><div class="kpi-foot"><span class="kpi-sub">Mock ESC/POS</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon ${summary.sync.online ? 'green' : 'red'}">${U.icon('cloud', 20)}</div></div><div class="kpi-label">صندوق الصادر</div><div class="kpi-value">${U.num(summary.sync.pending)}</div><div class="kpi-foot"><span class="kpi-sub">${summary.sync.online ? 'متصل — جاهز للمزامنة' : 'غير متصل — وضع محلي'}</span></div></div>
        </div>
        <div class="tabs" style="margin-bottom:16px">${tabs.map(([id, label, icon]) => `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}</button>`).join('')}</div>
        <div id="integrations-content">${state.tab === 'payments' ? renderPayments() : state.tab === 'delivery' ? renderDelivery() : state.tab === 'printer' ? renderPrinter() : renderSync()}</div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; Pages.integrations.render(view); }));
      view.querySelectorAll('[data-refresh]').forEach((b) => b.addEventListener('click', () => App.refresh()));
      view.querySelectorAll('[data-test-pay]').forEach((b) => b.addEventListener('click', () => paymentTestModal(b.dataset.testPay)));
      view.querySelectorAll('[data-sync-platform]').forEach((b) => b.addEventListener('click', () => {
        try { Delivery.syncMenu(b.dataset.syncPlatform); UI.toast('تمت مزامنة القائمة (محاكاة)', 'success'); Pages.integrations.render(view); } catch (e) { UI.toast(e.message, 'error'); }
      }));
      view.querySelectorAll('[data-simulate]').forEach((b) => b.addEventListener('click', () => {
        try { const r = Delivery.ingest(b.dataset.simulate); UI.toast(`تم استقبال الطلب ${r.order.number} من ${r.record.platformName}`, 'success'); Pages.integrations.render(view); } catch (e) { UI.toast(e.message, 'error'); }
      }));
      view.querySelectorAll('[data-toggle-platform]').forEach((input) => input.addEventListener('change', () => {
        const p = Delivery.platform(input.dataset.togglePlatform);
        if (p) { p.enabled = input.checked; Store.save(); UI.toast(input.checked ? 'تم تفعيل المنصة' : 'تم إيقاف المنصة', 'success'); }
      }));
      view.querySelectorAll('[data-open-order]').forEach((b) => b.addEventListener('click', () => { window.__posOrder = b.dataset.openOrder; App.navigate('#/pos'); }));
      view.querySelectorAll('[data-printer-save]').forEach((b) => b.addEventListener('click', () => {
        const cfg = Store.data.settings.printer;
        cfg.connection = view.querySelector('[data-printer-connection]').value;
        cfg.name = view.querySelector('[data-printer-name]').value.trim();
        cfg.ip = view.querySelector('[data-printer-ip]').value.trim();
        cfg.port = Number(view.querySelector('[data-printer-port]').value) || 9100;
        cfg.width = Number(view.querySelector('[data-printer-width]').value) || 80;
        cfg.copies = Math.max(1, Number(view.querySelector('[data-printer-copies]').value) || 1);
        cfg.autoPrintKitchen = view.querySelector('[data-printer-kitchen]').checked;
        cfg.autoPrintReceipt = view.querySelector('[data-printer-receipt]').checked;
        Store.save(); UI.toast('تم حفظ إعدادات الطابعة', 'success');
      }));
      view.querySelectorAll('[data-printer-test]').forEach((b) => b.addEventListener('click', () => { try { Printer.test(); UI.toast('تمت طباعة صفحة الاختبار التجريبية', 'success'); Pages.integrations.render(view); } catch (e) { UI.toast(e.message, 'error'); } }));
      view.querySelectorAll('[data-printer-drawer]').forEach((b) => b.addEventListener('click', () => { Printer.openDrawer(); UI.toast('تم إرسال أمر فتح الدرج (محاكاة)', 'success'); }));
      view.querySelectorAll('[data-view-job]').forEach((b) => b.addEventListener('click', () => { const j = Store.data.printerJobs.find((x) => x.id === b.dataset.viewJob); if (j) jobModal(j); }));
      view.querySelectorAll('[data-reprint]').forEach((b) => b.addEventListener('click', () => { try { Printer.reprint(b.dataset.reprint); UI.toast('تمت إعادة الطباعة التجريبية', 'success'); Pages.integrations.render(view); } catch (e) { UI.toast(e.message, 'error'); } }));
      const push = view.querySelector('[data-sync-push]');
      if (push) push.addEventListener('click', async () => {
        push.disabled = true;
        try { const r = await Sync.push(); UI.toast(`تمت مزامنة ${r.pending} تغييراً مع السحابة (محاكاة)`, 'success'); Pages.integrations.render(view); }
        catch (e) { push.disabled = false; UI.toast(e.message, 'error'); }
      });
      const pull = view.querySelector('[data-sync-pull]');
      if (pull) pull.addEventListener('click', async () => {
        pull.disabled = true;
        try { await Sync.pull(); UI.toast('تم سحب تحديثات السحابة (محاكاة)', 'success'); Pages.integrations.render(view); }
        catch (e) { pull.disabled = false; UI.toast(e.message, 'error'); }
      });
    }
  };
})();
