/* ==========================================================================
   طلال تكنو — Integration adapters
   Payments (Mada / Apple Pay / STC Pay / cards via Saudi PSPs),
   delivery platforms, ESC/POS thermal printing and offline sync.

   Every adapter has a working Mock implementation. Sandbox/Production
   adapters are selected by settings but are not shipped with live keys.
   ========================================================================== */
(function () {
  'use strict';
  const round2 = U.round2;
  const settings = () => Store.data.settings;
  const now = () => new Date().toISOString();
  const Payments = window.Payments = {};
  const Delivery = window.Delivery = {};
  const Printer = window.Printer = {};
  const Sync = window.Sync = {};
  const Integrations = window.Integrations = {};

  Integrations.log = function (kind, provider, action, status, details) {
    const row = {
      id: U.uid('int'), kind, provider, action, status: status || 'ok',
      details: details || '', at: now()
    };
    Store.data.syncLogs.unshift(row);
    if (Store.data.syncLogs.length > 400) Store.data.syncLogs.length = 400;
    return row;
  };

  /* ==================================================================
     PAYMENTS
     ================================================================== */
  const PAYMENT_METHODS = {
    cash: { label: 'نقدي', icon: 'cash', kind: 'cash' },
    mada: { label: 'مدى', icon: 'card', kind: 'card' },
    applepay: { label: 'Apple Pay', icon: 'smartphone', kind: 'card' },
    stcpay: { label: 'STC Pay', icon: 'phone', kind: 'wallet' },
    visa: { label: 'Visa', icon: 'credit', kind: 'card' },
    mastercard: { label: 'Mastercard', icon: 'credit', kind: 'card' },
    card: { label: 'شبكة / بطاقة', icon: 'card', kind: 'card' },
    bank: { label: 'تحويل بنكي', icon: 'bank', kind: 'bank' },
    credit: { label: 'آجل', icon: 'clock', kind: 'credit' },
    wallet: { label: 'محفظة', icon: 'wallet', kind: 'wallet' }
  };
  Payments.METHODS = PAYMENT_METHODS;
  Payments.methodLabel = (m) => (PAYMENT_METHODS[m] || {}).label || m;
  Payments.methods = function () {
    const enabled = (settings().payments || {}).methods || {};
    return Object.keys(PAYMENT_METHODS).filter((m) => enabled[m] !== false);
  };

  const PROVIDERS = {
    hyperpay: { name: 'HyperPay', npg: true, methods: ['mada', 'visa', 'mastercard', 'applepay'], docs: 'NPG / SAMA' },
    geidea: { name: 'Geidea', npg: true, methods: ['mada', 'visa', 'mastercard', 'applepay'], docs: 'NPG eMSP' },
    moyasar: { name: 'Moyasar', npg: false, methods: ['mada', 'visa', 'mastercard', 'applepay', 'stcpay'], docs: 'SAMA licensed PSP' },
    paytabs: { name: 'PayTabs', npg: false, methods: ['mada', 'visa', 'mastercard'], docs: 'SAMA licensed PSP' },
    mock: { name: 'Mock Gateway', npg: true, methods: ['mada', 'visa', 'mastercard', 'applepay', 'stcpay'], docs: 'Development only' }
  };
  Payments.PROVIDERS = PROVIDERS;
  Payments.providers = function () {
    const cfg = settings().payments || {};
    return (cfg.providers || []).map((p) => Object.assign({}, PROVIDERS[p.id] || {}, p));
  };
  Payments.provider = function (id) {
    const list = Payments.providers();
    return list.find((p) => p.id === id) || list[0] || Object.assign({ id: 'mock' }, PROVIDERS.mock);
  };

  Payments.charge = function (opts) {
    const o = opts || {};
    const amount = round2(o.amount);
    const method = o.method || 'mada';
    const provider = Payments.provider(o.provider || (settings().payments || {}).provider);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const failed = o.fail === true || !(amount > 0);
        const tx = {
          id: U.uid('tx'), provider: provider.id, providerName: provider.name,
          method, amount, currency: 'SAR', orderId: o.orderId || null,
          invoiceId: o.invoiceId || null, phone: o.phone || '',
          status: failed ? 'failed' : 'approved',
          transactionId: failed ? null : `TX-${provider.id.toUpperCase()}-${Date.now().toString().slice(-8)}`,
          reference: failed ? null : `REF-${method.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          message: failed ? 'فشلت العملية التجريبية — تحقق من المبلغ' : `تمت الموافقة التجريبية عبر ${provider.name}`,
          sandbox: true, at: now()
        };
        Store.data.paymentLogs.unshift(tx);
        if (Store.data.paymentLogs.length > 400) Store.data.paymentLogs.length = 400;
        Integrations.log('payment', provider.name, `تحصيل ${Payments.methodLabel(method)}`, failed ? 'failed' : 'ok', `${U.money(amount)} — ${tx.transactionId || '—'}`);
        Store.save();
        if (failed) reject(new Error(tx.message));
        else resolve(tx);
      }, o.instant ? 0 : 380);
    });
  };

  Payments.stats = function () {
    const list = Store.data.paymentLogs || [];
    const approved = list.filter((p) => p.status === 'approved');
    const byMethod = {};
    approved.forEach((p) => { byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount); });
    return {
      count: list.length, approved: approved.length,
      failed: list.filter((p) => p.status === 'failed').length,
      volume: round2(U.sum(approved, (p) => p.amount)), byMethod
    };
  };

  /* ==================================================================
     DELIVERY PLATFORMS
     ================================================================== */
  Delivery.platforms = function () { return (settings().delivery || {}).platforms || []; };
  Delivery.platform = function (id) {
    return Delivery.platforms().find((p) => p.id === id) || Delivery.platforms()[0] || null;
  };
  Delivery.platformName = (id) => (Delivery.platform(id) || {}).name || id;

  function mockItems() {
    const menu = Store.menuProducts().filter((p) => Store.availableOf(p));
    const pool = menu.length ? menu : Store.menuProducts();
    const count = Math.min(pool.length, 2 + Math.floor(Math.random() * 2));
    const picked = [];
    const used = {};
    while (picked.length < count && pool.length) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (used[p.id]) continue;
      used[p.id] = true;
      picked.push({ productId: p.id, qty: 1 + Math.floor(Math.random() * 2), price: p.price });
    }
    return picked;
  }

  Delivery.ingest = function (platformId, opts) {
    const o = opts || {};
    const platform = Delivery.platform(platformId);
    if (!platform) throw new Error('منصة التوصيل غير مهيأة.');
    if (platform.enabled === false) throw new Error('المنصة موقوفة من الإعدادات.');
    const items = o.items && o.items.length ? o.items : mockItems();
    if (!items.length) throw new Error('لا توجد أصناف متاحة لمزامنة الطلب.');
    const externalId = o.externalOrderId || `${platform.id.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-7)}`;
    const order = Orders.create({
      type: 'delivery', items, platform: platform.id,
      externalOrderId: externalId, source: 'delivery',
      customerName: o.customerName || 'عميل توصيل',
      customerPhone: o.customerPhone || '+966 5x xxx xxxx',
      notes: o.notes || `طلب وارد من ${platform.name} — تجريبي`,
      sendToKitchen: true, status: 'new',
      deliveryFee: o.deliveryFee !== undefined ? o.deliveryFee : Number(settings().deliveryFee) || 0
    });
    const record = {
      id: U.uid('dlv'), platformId: platform.id, platformName: platform.name,
      externalOrderId: externalId, orderId: order.id, orderNumber: order.number,
      status: 'received', total: order.total, at: now(), items: order.items.length
    };
    Store.data.deliveryOrders.unshift(record);
    Integrations.log('delivery', platform.name, 'استقبال طلب', 'ok', `${externalId} → ${order.number} — ${U.money(order.total)}`);
    if ((settings().delivery || {}).autoAccept) {
      Orders.setStatus(order.id, 'preparing');
      record.status = 'accepted';
      Integrations.log('delivery', platform.name, 'قبول تلقائي', 'ok', order.number);
    }
    Store.save();
    return { order, record };
  };

  Delivery.updateStatus = function (orderId, status) {
    const order = Store.order(orderId);
    if (!order) throw new Error('الطلب غير موجود.');
    if (order.platform) {
      Orders.setStatus(orderId, status);
      const rec = Store.data.deliveryOrders.find((d) => d.orderId === orderId);
      if (rec) rec.status = status;
      Integrations.log('delivery', Delivery.platformName(order.platform), 'تحديث حالة', 'ok', `${order.number} — ${Orders.statusLabel(status)}`);
      Store.save();
    }
    return order;
  };

  Delivery.syncMenu = function (platformId) {
    const platform = platformId ? Delivery.platform(platformId) : null;
    const list = platform ? [platform] : Delivery.platforms().filter((p) => p.enabled !== false);
    if (!list.length) throw new Error('لا توجد منصات مفعّلة.');
    const menu = Store.menuProducts();
    list.forEach((p) => {
      p.lastSync = now();
      p.syncedItems = menu.length;
      Integrations.log('delivery', p.name, 'مزامنة القائمة', 'ok', `${menu.length} صنف — الأسعار والتوفر`);
    });
    Store.save();
    return list;
  };

  Delivery.stats = function () {
    const list = Store.data.deliveryOrders || [];
    const todayList = list.filter((d) => String(d.at || '').slice(0, 10) === U.today());
    return {
      count: list.length,
      today: todayList.length,
      active: Store.data.orders.filter((o) => o.platform && ['new', 'preparing', 'ready'].includes(o.status)).length,
      sales: round2(U.sum(todayList, (d) => d.total)),
      byPlatform: Delivery.platforms().map((p) => ({
        id: p.id, name: p.name, color: p.color,
        count: todayList.filter((d) => d.platformId === p.id).length,
        total: round2(U.sum(todayList.filter((d) => d.platformId === p.id), (d) => d.total))
      }))
    };
  };

  /* ==================================================================
     THERMAL PRINTER (ESC/POS mock)
     ================================================================== */
  const ESC = { init: '\x1B@', alignRight: '\x1B\x61\x02', alignCenter: '\x1B\x61\x01', alignLeft: '\x1B\x61\x00', boldOn: '\x1B\x45\x01', boldOff: '\x1B\x45\x00', cut: '\x1D\x56\x00', drawer: '\x1B\x70\x00\x19\xFA' };
  Printer.ESC = ESC;

  function line(ch, width) { return new Array((width || 42) + 1).join(ch || '-'); }
  function pad(text, width) {
    const s = String(text == null ? '' : text);
    return s.length >= width ? s.slice(0, width) : s + new Array(width - s.length + 1).join(' ');
  }

  Printer.receiptText = function (invoice) {
    if (!invoice) return '';
    const s = settings();
    const width = Number((s.printer || {}).width) || 80;
    const cols = width === 58 ? 32 : 42;
    const z = invoice.zatca || {};
    const lines = [];
    lines.push(ESC.init + ESC.alignCenter + ESC.boldOn);
    lines.push(s.company || 'طلال تكنو');
    lines.push(ESC.boldOff);
    lines.push('TALAL TECHNO • CLOUD ERP + POS');
    lines.push(s.address || '');
    lines.push('VAT: ' + (s.taxNumber || ''));
    lines.push('CR: ' + (s.commercialRegister || ''));
    lines.push(line('=', cols));
    lines.push(ESC.alignRight + ESC.boldOn + (invoice.type === 'return' ? 'مرتجع بيع' : 'فاتورة ضريبية مبسطة') + ESC.boldOff);
    lines.push('رقم: ' + invoice.number);
    lines.push('التاريخ: ' + invoice.date + ' ' + String(invoice.createdAt || '').slice(11, 16));
    if (invoice.tableName) lines.push('الطاولة: ' + invoice.tableName);
    if (invoice.orderType) lines.push('النوع: ' + (Orders.typeLabel(invoice.orderType) || invoice.orderType));
    lines.push('الكاشير: ' + (invoice.cashierName || '—'));
    lines.push(line('-', cols));
    (invoice.items || []).forEach((it) => {
      lines.push(pad(it.name, cols - 10) + pad(U.num(it.qty, 2), 4) + pad(U.num(it.price, 2), 6));
    });
    lines.push(line('-', cols));
    lines.push(pad('الإجمالي قبل الضريبة', cols - 10) + pad(U.num(invoice.subtotal, 2), 10));
    if (invoice.discount) lines.push(pad('الخصم', cols - 10) + pad(U.num(invoice.discount, 2), 10));
    if (invoice.serviceCharge) lines.push(pad('خدمة', cols - 10) + pad(U.num(invoice.serviceCharge, 2), 10));
    if (invoice.deliveryFee) lines.push(pad('توصيل', cols - 10) + pad(U.num(invoice.deliveryFee, 2), 10));
    lines.push(pad('ضريبة القيمة المضافة 15%', cols - 10) + pad(U.num(invoice.tax, 2), 10));
    lines.push(ESC.boldOn + pad('الإجمالي', cols - 10) + pad(U.num(invoice.total, 2), 10) + ESC.boldOff);
    lines.push(line('=', cols));
    lines.push('طريقة الدفع: ' + (Payments.methodLabel(invoice.method) || invoice.method || '—'));
    lines.push(ESC.alignCenter);
    lines.push('ZATCA QR (TLV Base64)');
    lines.push(z.qr || invoice.qrCode || '—');
    lines.push(z.invoiceHash ? 'Hash: ' + z.invoiceHash.slice(0, 24) + '...' : 'Hash: —');
    lines.push('بيئة تجريبية Sandbox — غير معتمدة');
    lines.push(line('-', cols));
    lines.push(s.footer || 'شكراً لزيارتكم');
    lines.push(ESC.cut);
    return lines.join('\n');
  };

  Printer.kitchenText = function (order) {
    if (!order) return '';
    const cols = 42;
    const lines = [ESC.init + ESC.alignCenter + ESC.boldOn, 'تذكرة مطبخ', ESC.boldOff, line('=', cols)];
    lines.push('طلب: ' + order.number);
    lines.push('النوع: ' + Orders.typeLabel(order.type) + (order.tableName ? ' — ' + order.tableName : ''));
    if (order.platformName) lines.push('المنصة: ' + order.platformName);
    lines.push('الوقت: ' + String(order.createdAt || '').slice(11, 16));
    lines.push(line('-', cols));
    (order.items || []).forEach((it) => {
      lines.push(ESC.boldOn + `${it.qty} × ${it.name}` + ESC.boldOff);
      if (it.notes) lines.push('  ملاحظة: ' + it.notes);
      lines.push('  محطة: ' + ((Orders.STATIONS[it.station] || {}).label || it.station || 'التقديم'));
    });
    lines.push(line('=', cols));
    if (order.notes) lines.push('ملاحظات: ' + order.notes);
    lines.push(ESC.cut);
    return lines.join('\n');
  };

  Printer.print = function (kind, payload, opts) {
    const o = opts || {};
    const cfg = settings().printer || {};
    const text = kind === 'kitchen' ? Printer.kitchenText(payload) : Printer.receiptText(payload);
    if (!text) throw new Error('لا توجد بيانات للطباعة.');
    const job = {
      id: U.uid('prn'), kind, targetId: payload && payload.id, number: payload && payload.number,
      connection: cfg.connection || 'mock', printer: cfg.name || 'Mock Printer',
      ip: cfg.ip || '', port: cfg.port || 9100, width: cfg.width || 80,
      copies: o.copies || cfg.copies || 1, status: 'printed', mock: true,
      bytes: text.length, text, at: now()
    };
    Store.data.printerJobs.unshift(job);
    if (Store.data.printerJobs.length > 200) Store.data.printerJobs.length = 200;
    Integrations.log('printer', job.printer, kind === 'kitchen' ? 'طباعة مطبخ' : 'طباعة فاتورة', 'ok', `${job.number || ''} — ${job.bytes} بايت — Mock`);
    Store.save();
    return job;
  };

  Printer.receipt = function (invoice, opts) { return Printer.print('receipt', invoice, opts); };
  Printer.kitchen = function (order, opts) { return Printer.print('kitchen', order, opts); };
  Printer.reprint = function (jobId) {
    const job = Store.data.printerJobs.find((j) => j.id === jobId);
    if (!job) throw new Error('مهمة الطباعة غير موجودة.');
    const copy = Object.assign({}, job, { id: U.uid('prn'), at: now(), copies: 1 });
    Store.data.printerJobs.unshift(copy);
    Integrations.log('printer', job.printer, 'إعادة طباعة', 'ok', job.number || '');
    Store.save();
    return copy;
  };
  Printer.test = function () {
    const text = [ESC.init + ESC.alignCenter + ESC.boldOn, 'طلال تكنو — اختبار الطابعة', ESC.boldOff,
      line('=', 42), 'TALAL TECHNO • CLOUD ERP + POS', 'ESC/POS Mock Printer',
      'USB / Bluetooth / TCP/IP', 'الطباعة التجريبية تعمل بنجاح', line('-', 42),
      'هذه طابعة وهمية — لا يتم إرسال بيانات لجهاز فعلي', ESC.cut].join('\n');
    const job = {
      id: U.uid('prn'), kind: 'test', targetId: null, number: 'PRINTER-TEST',
      connection: (settings().printer || {}).connection || 'mock',
      printer: (settings().printer || {}).name || 'Mock Printer',
      width: (settings().printer || {}).width || 80, copies: 1,
      status: 'printed', mock: true, bytes: text.length, text, at: now()
    };
    Store.data.printerJobs.unshift(job);
    Integrations.log('printer', job.printer, 'فحص الاتصال', 'ok', 'Mock printer ready');
    Store.save();
    return job;
  };
  Printer.openDrawer = function () {
    Integrations.log('printer', (settings().printer || {}).name || 'Mock Printer', 'فتح درج النقود', 'ok', 'ESC p 0 25 250 (mock)');
    Store.save();
    return true;
  };
  Printer.stats = function () {
    const list = Store.data.printerJobs || [];
    return { jobs: list.length, today: list.filter((j) => String(j.at).slice(0, 10) === U.today()).length, last: list[0] || null };
  };

  /* ==================================================================
     OFFLINE SYNC / OUTBOX
     ================================================================== */
  Sync.online = function () { return typeof navigator === 'undefined' ? true : navigator.onLine !== false; };
  Sync.status = function () {
    const meta = Store.data.meta;
    return {
      online: Sync.online(),
      pending: Number(meta.pendingSync) || 0,
      lastSync: meta.lastSync || null,
      deviceId: meta.deviceId,
      tenant: meta.tenant,
      logs: Store.data.syncLogs || [],
      outbox: Store.data.invoices.filter((i) => i.syncStatus !== 'synced').length
    };
  };
  Sync.push = function () {
    return new Promise((resolve, reject) => {
      if (!Sync.online()) { reject(new Error('لا يوجد اتصال بالإنترنت — ستبقى العمليات في صندوق الصادر.')); return; }
      const pending = Number(Store.data.meta.pendingSync) || 0;
      setTimeout(() => {
        const stamp = now();
        Store.data.meta.lastSync = stamp;
        Store.data.meta.pendingSync = 0;
        Store.data.invoices.forEach((i) => { i.syncStatus = 'synced'; });
        Store.data.syncLogs.unshift({
          id: U.uid('sync'), kind: 'sync', provider: 'Talal Cloud',
          action: 'مزامنة صندوق الصادر', status: 'ok',
          details: `${pending} تغييراً تمت مزامنته — PostgreSQL (محاكاة)`, at: stamp
        });
        if (Store.data.syncLogs.length > 400) Store.data.syncLogs.length = 400;
        Store.save({ noSync: true });
        resolve({ pending, at: stamp });
      }, 600);
    });
  };
  Sync.pull = function () {
    return new Promise((resolve, reject) => {
      if (!Sync.online()) { reject(new Error('لا يوجد اتصال بالإنترنت.')); return; }
      setTimeout(() => {
        Store.data.meta.lastPull = now();
        Store.data.syncLogs.unshift({
          id: U.uid('sync'), kind: 'sync', provider: 'Talal Cloud',
          action: 'سحب تحديثات السحابة', status: 'ok',
          details: 'القوائم والأسعار والصلاحيات — محاكاة', at: now()
        });
        Store.save({ noSync: true });
        resolve({ at: now() });
      }, 500);
    });
  };
  Sync.logs = function (limit) { return (Store.data.syncLogs || []).slice(0, limit || 50); };

  /* ==================================================================
     SUMMARY
     ================================================================== */
  Integrations.summary = function () {
    const p = Payments.stats();
    const d = Delivery.stats();
    const pr = Printer.stats();
    const s = Sync.status();
    return { payments: p, delivery: d, printer: pr, sync: s };
  };

  Integrations.seedDemoLogs = function () {
    if ((Store.data.syncLogs || []).length) return;
    Integrations.log('sync', 'Talal Cloud', 'مزامنة أولية', 'ok', 'بيانات تجريبية — PostgreSQL (محاكاة)');
    Integrations.log('printer', 'Talal Techno Mock Printer', 'فحص الاتصال', 'ok', 'Mock printer ready');
  };
})();
