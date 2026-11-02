/* ==========================================================================
   طلال تكنو — Local database, tenant settings, sequences & audit
   Offline-first store used by the browser demo. The production API mirrors
   this model in packages/database/prisma/schema.prisma.
   ========================================================================== */
(function () {
  'use strict';
  const KEY = 'talaltechno.db.v1';
  const LEGACY_KEY = 'mizan.db.v1';
  const SESSION = 'talaltechno.session.v1';
  const Store = window.Store = {
    data: null,
    currentUser: null,
    seedMode: false,
    batching: false,
    locked: false
  };

  Store.ROLES = {
    owner: {
      label: 'المالك', color: 'gold', icon: 'award',
      desc: 'وصول كامل لجميع الفروع والوحدات والتقارير المالية.',
      perms: ['*']
    },
    admin: {
      label: 'مدير النظام', color: 'green', icon: 'shield',
      desc: 'وصول كامل لجميع الوحدات والإعدادات والصلاحيات.',
      perms: ['*']
    },
    manager: {
      label: 'مدير الفرع', color: 'blue', icon: 'chart',
      desc: 'إدارة العمليات والمخزون والتقارير والمحاسبة والورديات.',
      perms: ['dashboard', 'pos', 'kds', 'tables', 'emenu', 'sales', 'purchases', 'inventory', 'products', 'contacts', 'accounting', 'treasury', 'reports', 'loyalty', 'shifts', 'zatca', 'integrations']
    },
    accountant: {
      label: 'محاسب', color: 'purple', icon: 'calculator',
      desc: 'القيود والحسابات والخزينة والتقارير المالية والضريبية.',
      perms: ['dashboard', 'sales', 'purchases', 'contacts', 'accounting', 'treasury', 'reports', 'zatca', 'shifts']
    },
    cashier: {
      label: 'كاشير', color: 'gold', icon: 'pos',
      desc: 'نقاط البيع وإصدار الفواتير وإدارة العملاء والطاولات.',
      perms: ['pos', 'tables', 'sales', 'contacts', 'shifts']
    },
    waiter: {
      label: 'نادل', color: 'teal', icon: 'users',
      desc: 'فتح الطاولات وإضافة الأصناف وإرسال الطلبات للمطبخ.',
      perms: ['pos', 'tables', 'emenu']
    },
    kitchen: {
      label: 'المطبخ', color: 'red', icon: 'chef',
      desc: 'شاشة المطبخ وتحديث حالات الطلبات وإخفاء الأصناف النافدة.',
      perms: ['kds']
    },
    delivery: {
      label: 'مدير التوصيل', color: 'blue', icon: 'truck',
      desc: 'متابعة طلبات تطبيقات التوصيل ومزامنة القوائم.',
      perms: ['dashboard', 'integrations', 'pos', 'sales']
    }
  };

  Store.defaultSettings = () => ({
    company: 'مطعم طلال تكنو',
    legalName: 'شركة طلال تكنو للمطاعم',
    taxNumber: '310123456700003',
    commercialRegister: '1010456789',
    phone: '+966 55 123 4567',
    email: 'info@talaltechno.sa',
    address: 'الرياض — حي العليا — طريق الملك فهد',
    website: 'www.talaltechno.sa',
    footer: 'شكراً لزيارتكم مطعم طلال تكنو — نراكم قريباً',
    invoiceTerms: 'هذه الفاتورة صادرة إلكترونياً وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك.',
    currency: 'ر.س',
    currencyCode: 'SAR',
    vatRate: 15,
    invoicePrefix: 'TT',
    purchasePrefix: 'PUR',
    allowNegativeStock: false,
    loyaltyPer: 1,
    loyaltyValue: 0.05,
    lowStockGlobal: 10,
    theme: 'light',
    receiptWidth: '80mm',
    posQuickCash: [50, 100, 200, 500],
    restaurantMode: true,
    serviceChargeRate: 0,
    deliveryFee: 0,
    defaultOrderType: 'dine_in',
    qrBaseUrl: '',
    selfOrdering: true,
    requireKitchenAccept: false,
    printer: {
      connection: 'mock',
      name: 'Talal Techno Mock Printer',
      ip: '192.168.1.50',
      port: 9100,
      width: 80,
      copies: 1,
      autoPrintKitchen: true,
      autoPrintReceipt: false
    },
    zatca: {
      environment: 'sandbox',
      csidType: 'compliance',
      commonName: 'Talal Techno Sandbox CSID',
      serialNumber: 'TT-SANDBOX-0001',
      vatNumber: '310123456700003',
      autoReport: true,
      invoiceType: 'simplified',
      lastHash: '',
      invoiceCounter: 0
    },
    payments: {
      provider: 'mock',
      providers: [
        { id: 'hyperpay', name: 'HyperPay', mode: 'mock', enabled: true, npg: true },
        { id: 'geidea', name: 'Geidea', mode: 'mock', enabled: true, npg: true },
        { id: 'moyasar', name: 'Moyasar', mode: 'mock', enabled: true, npg: false },
        { id: 'paytabs', name: 'PayTabs', mode: 'mock', enabled: true, npg: false }
      ],
      methods: { cash: true, mada: true, applepay: true, stcpay: true, visa: true, mastercard: true, credit: true }
    },
    delivery: {
      autoAccept: false,
      syncPrices: true,
      syncAvailability: true,
      platforms: [
        { id: 'hungerstation', name: 'HungerStation', color: '#e11d48', enabled: true, mode: 'mock' },
        { id: 'jahez', name: 'Jahez', color: '#7c3aed', enabled: true, mode: 'mock' },
        { id: 'mrsool', name: 'Mrsool', color: '#0f766e', enabled: true, mode: 'mock' },
        { id: 'toyou', name: 'ToYou', color: '#ea580c', enabled: true, mode: 'mock' },
        { id: 'careem', name: 'Careem', color: '#16a34a', enabled: true, mode: 'mock' }
      ]
    }
  });

  Store.blank = () => {
    const now = new Date().toISOString();
    return {
      meta: {
        version: 2,
        app: 'TalalTechno',
        createdAt: now,
        updatedAt: now,
        lastSync: null,
        pendingSync: 0,
        deviceId: 'POS-DEMO-01',
        tenant: 'demo-tenant',
        branch: 'b1'
      },
      settings: Store.defaultSettings(),
      accounts: [],
      branches: [],
      categories: [],
      products: [],
      customers: [],
      suppliers: [],
      users: [],
      invoices: [],
      purchases: [],
      expenses: [],
      payments: [],
      transfers: [],
      adjustments: [],
      journal: [],
      stockMoves: [],
      holds: [],
      audit: [],
      rolePerms: {},
      tables: [],
      orders: [],
      shifts: [],
      waste: [],
      loyaltyHistory: [],
      coupons: [],
      deliveryOrders: [],
      syncLogs: [],
      paymentLogs: [],
      zatcaLogs: [],
      printerJobs: [],
      notifications: [],
      integrations: {},
      sequences: {
        invoice: 1000, return: 0, quote: 0, purchase: 500, purchaseReturn: 0,
        expense: 0, receipt: 0, payment: 0, journal: 0, adjustment: 0, transfer: 0,
        order: 0, shift: 0, waste: 0, delivery: 0, coupon: 0, zatca: 0
      }
    };
  };

  function applyDefaults(data) {
    data.settings = Object.assign(Store.defaultSettings(), data.settings || {});
    data.settings.printer = Object.assign(Store.defaultSettings().printer, data.settings.printer || {});
    data.settings.zatca = Object.assign(Store.defaultSettings().zatca, data.settings.zatca || {});
    data.settings.payments = Object.assign(Store.defaultSettings().payments, data.settings.payments || {});
    data.settings.delivery = Object.assign(Store.defaultSettings().delivery, data.settings.delivery || {});
    ['holds', 'audit', 'transfers', 'tables', 'orders', 'shifts', 'waste', 'loyaltyHistory', 'coupons',
      'deliveryOrders', 'syncLogs', 'paymentLogs', 'zatcaLogs', 'printerJobs', 'notifications'].forEach((k) => {
      data[k] = data[k] || [];
    });
    data.rolePerms = data.rolePerms || {};
    data.integrations = data.integrations || {};
    data.meta = data.meta || {};
    data.meta.version = 2;
    data.meta.pendingSync = Number(data.meta.pendingSync) || 0;
    data.meta.deviceId = data.meta.deviceId || 'POS-DEMO-01';
    data.meta.tenant = data.meta.tenant || 'demo-tenant';
    data.sequences = Object.assign(Store.blank().sequences, data.sequences || {});
    (data.products || []).forEach((p) => {
      if (!p.type) p.type = p.isRaw ? 'raw' : 'menu';
      if (p.type === 'menu' && !Array.isArray(p.recipe)) p.recipe = [];
      if (p.available === undefined) p.available = p.active !== false;
    });
    return data;
  }

  Store.init = function () {
    let raw = null;
    try { raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.journal)) {
          this.data = applyDefaults(parsed);
          if (this.data.meta.app !== 'TalalTechno') {
            this.data.meta.app = 'TalalTechno';
            this.data.meta.migratedFrom = 'Mizan';
          }
        }
      } catch (e) {
        console.warn('تعذر قراءة قاعدة البيانات، سيتم إنشاء بيانات جديدة.', e);
        this.data = null;
      }
    }
    if (!this.data) {
      this.data = Store.blank();
      this.seedMode = true;
      try {
        if (window.Seed && typeof window.Seed.run === 'function') window.Seed.run();
      } catch (e) {
        console.error('Seed failed', e);
        this.seedMode = false;
        this.save();
      }
      this.seedMode = false;
    } else if (window.Seed && typeof window.Seed.ensureRestaurant === 'function') {
      this.seedMode = true;
      try { window.Seed.ensureRestaurant(); } catch (e) { console.warn('Restaurant migration skipped', e); }
      this.seedMode = false;
    }
    let sessionId = null;
    try { sessionId = localStorage.getItem(SESSION); } catch (e) {}
    this.currentUser = this.data.users.find((u) => u.id === sessionId && u.active !== false)
      || this.data.users.find((u) => u.role === 'admin' && u.active !== false)
      || this.data.users[0] || null;
    if (this.currentUser) this.setUser(this.currentUser.id, true);
    this.applyTheme();
    return this;
  };

  Store.save = function (opts) {
    this.data.meta.updatedAt = new Date().toISOString();
    if (!this.seedMode && !(opts && opts.noSync)) {
      this.data.meta.pendingSync = Math.min(999, (Number(this.data.meta.pendingSync) || 0) + 1);
    }
    if (this.batching) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Save failed', e);
      if (window.UI) UI.toast('تعذر حفظ البيانات — مساحة التخزين ممتلئة', 'error');
    }
  };

  Store.commit = function () { this.save(); };
  Store.batch = function (fn) {
    this.batching = true;
    try { return fn(); }
    finally { this.batching = false; this.save(); }
  };

  Store.setUser = function (id, silent) {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return false;
    this.currentUser = user;
    try { localStorage.setItem(SESSION, id); } catch (e) {}
    if (!silent && window.App) App.refreshChrome();
    return true;
  };

  Store.rolePerms = function (role) {
    if (role === 'admin' || role === 'owner') return ['*'];
    const custom = this.data && this.data.rolePerms && this.data.rolePerms[role];
    if (Array.isArray(custom)) return custom.slice();
    const def = Store.ROLES[role];
    return def ? def.perms.slice() : [];
  };

  Store.setRolePerms = function (role, perms) {
    if (!this.data || role === 'admin' || role === 'owner') return false;
    this.data.rolePerms = this.data.rolePerms || {};
    this.data.rolePerms[role] = Array.from(new Set((perms || []).filter(Boolean)));
    this.save();
    return true;
  };

  Store.resetRolePerms = function (role) {
    if (!this.data || !this.data.rolePerms) return false;
    delete this.data.rolePerms[role];
    this.save();
    return true;
  };

  Store.can = function (perm) {
    if (!this.currentUser) return false;
    const perms = Store.rolePerms(this.currentUser.role);
    return perms.includes('*') || perms.includes(perm);
  };

  Store.isAdmin = function () { return this.currentUser && ['admin', 'owner'].includes(this.currentUser.role); };

  Store.applyTheme = function () {
    const theme = (this.data && this.data.settings.theme) || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#071a15' : '#0a2b24');
  };

  Store.toggleTheme = function () {
    this.data.settings.theme = this.data.settings.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.save();
    if (window.App) App.refreshChrome();
  };

  Store.nextNumber = function (kind) {
    const s = this.data.sequences;
    const prefixes = {
      invoice: this.data.settings.invoicePrefix || 'TT',
      return: 'RET', quote: 'QUO',
      purchase: this.data.settings.purchasePrefix || 'PUR',
      purchaseReturn: 'PRT',
      expense: 'EXP', receipt: 'REC', payment: 'PAY',
      journal: 'JV', adjustment: 'ADJ', transfer: 'TRF',
      order: 'ORD', shift: 'SH', waste: 'WST', delivery: 'DLV', coupon: 'CPN', zatca: 'ZTC'
    };
    s[kind] = (Number(s[kind]) || 0) + 1;
    const pad = kind === 'journal' ? 5 : 4;
    return `${prefixes[kind] || kind.toUpperCase()}-${String(s[kind]).padStart(pad, '0')}`;
  };

  Store.audit = function (action, details, icon) {
    if (this.seedMode) return;
    this.data.audit.unshift({
      id: U.uid('aud'),
      at: new Date().toISOString(),
      user: this.currentUser ? this.currentUser.name : 'النظام',
      role: this.currentUser ? this.currentUser.role : 'system',
      action, details: details || '', icon: icon || 'info'
    });
    if (this.data.audit.length > 800) this.data.audit.length = 800;
  };

  Store.add = function (collection, item) {
    this.data[collection].push(item);
    this.save();
    return item;
  };
  Store.update = function (collection, id, patch) {
    const item = this.data[collection].find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, patch);
    this.save();
    return item;
  };
  Store.remove = function (collection, id) {
    const idx = this.data[collection].findIndex((x) => x.id === id);
    if (idx >= 0) this.data[collection].splice(idx, 1);
    this.save();
  };

  Store.product = function (id) { return this.data.products.find((p) => p.id === id); };
  Store.customer = function (id) { return this.data.customers.find((c) => c.id === id); };
  Store.supplier = function (id) { return this.data.suppliers.find((s) => s.id === id); };
  Store.user = function (id) { return this.data.users.find((u) => u.id === id); };
  Store.invoice = function (id) { return this.data.invoices.find((i) => i.id === id); };
  Store.purchase = function (id) { return this.data.purchases.find((p) => p.id === id); };
  Store.account = function (id) { return this.data.accounts.find((a) => a.id === id); };
  Store.category = function (id) { return this.data.categories.find((c) => c.id === id); };
  Store.branch = function (id) { return this.data.branches.find((b) => b.id === id); };
  Store.table = function (id) { return this.data.tables.find((t) => t.id === id); };
  Store.order = function (id) { return this.data.orders.find((o) => o.id === id); };
  Store.shift = function (id) { return this.data.shifts.find((s) => s.id === id); };
  Store.accountName = function (id) {
    const a = Store.account(id);
    return a ? a.name : id;
  };
  Store.partyName = function (type, id) {
    if (type === 'customer') return (Store.customer(id) || {}).name || 'عميل نقدي';
    if (type === 'supplier') return (Store.supplier(id) || {}).name || 'مورد';
    return '';
  };
  Store.leafAccounts = function () {
    return this.data.accounts.filter((a) => !a.isGroup).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  };
  Store.activeUsers = function () {
    return this.data.users.filter((u) => u.active !== false);
  };
  Store.branchName = function (id) {
    const b = Store.branch(id);
    return b ? b.name : 'الفرع الرئيسي';
  };

  /* ---------- Restaurant / BOM helpers ---------- */
  Store.isMenu = function (p) { return !!p && p.type !== 'raw'; };
  Store.menuProducts = function () { return this.data.products.filter((p) => p.active !== false && Store.isMenu(p)); };
  Store.rawMaterials = function () { return this.data.products.filter((p) => p.type === 'raw' && p.active !== false); };
  Store.recipeOf = function (id) {
    const p = typeof id === 'object' ? id : Store.product(id);
    return (p && Array.isArray(p.recipe)) ? p.recipe : [];
  };
  Store.recipeCost = function (id) {
    const p = typeof id === 'object' ? id : Store.product(id);
    const recipe = Store.recipeOf(p);
    if (!recipe.length) return Number(p && p.cost) || 0;
    return U.round2(recipe.reduce((sum, line) => {
      const m = Store.product(line.materialId);
      return sum + (m ? (Number(m.cost) || 0) * (Number(line.qty) || 0) : 0);
    }, 0));
  };
  Store.costOf = function (p) {
    if (!p) return 0;
    const recipe = Store.recipeOf(p);
    return recipe.length ? Store.recipeCost(p) : (Number(p.cost) || 0);
  };
  Store.stockOf = function (p) {
    if (!p) return 0;
    const recipe = Store.recipeOf(p);
    if (p.type === 'menu' && recipe.length) {
      const available = recipe.map((line) => {
        const m = Store.product(line.materialId);
        const need = Number(line.qty) || 0;
        if (!m || need <= 0) return 0;
        return (Number(m.stock) || 0) / need;
      });
      return U.round2(Math.max(0, Math.min.apply(null, available)));
    }
    return Number(p.stock) || 0;
  };
  Store.availableOf = function (id) {
    const p = typeof id === 'object' ? id : Store.product(id);
    return !!p && p.active !== false && p.available !== false && (Store.data.settings.allowNegativeStock || Store.stockOf(p) > 0);
  };
  Store.loyaltyTier = function (points) {
    const n = Number(points) || 0;
    if (n >= 2000) return { key: 'platinum', label: 'بلاتيني', color: '#6d4fa3', multiplier: 2, next: null, progress: 100 };
    if (n >= 800) return { key: 'gold', label: 'ذهبي', color: '#a97c28', multiplier: 1.5, next: 2000, progress: Math.round(n / 2000 * 100) };
    if (n >= 200) return { key: 'silver', label: 'فضي', color: '#64748b', multiplier: 1.2, next: 800, progress: Math.round(n / 800 * 100) };
    return { key: 'bronze', label: 'برونزي', color: '#9a6b3f', multiplier: 1, next: 200, progress: Math.round(n / 200 * 100) };
  };
  Store.currentShift = function (userId) {
    const uid = userId || (Store.currentUser ? Store.currentUser.id : null);
    return Store.data.shifts.find((s) => s.status === 'open' && (!uid || s.userId === uid)) || null;
  };
  Store.openOrders = function () {
    return Store.data.orders.filter((o) => ['new', 'preparing', 'ready', 'open', 'served'].includes(o.status));
  };
  Store.kitchenOrders = function () {
    return Store.data.orders.filter((o) => ['new', 'preparing', 'ready'].includes(o.status));
  };

  Store.notifications = function () {
    const list = [];
    const low = Store.rawMaterials().filter((p) => p.stock <= (p.reorderLevel || 10));
    if (low.length) {
      list.push({
        type: 'stock', icon: 'alert', tone: low.some((p) => p.stock <= 0) ? 'red' : 'amber',
        title: `${low.length} مادة خام تحتاج إعادة تعبئة`,
        sub: low.slice(0, 2).map((p) => p.name).join('، ') + (low.length > 2 ? '...' : ''),
        action: '#/inventory'
      });
    }
    const newOrders = Store.data.orders.filter((o) => o.status === 'new');
    if (newOrders.length) {
      list.push({
        type: 'orders', icon: 'chef', tone: 'blue',
        title: `${newOrders.length} طلب جديد في المطبخ`,
        sub: newOrders.slice(0, 2).map((o) => `${o.number} — ${o.tableName || o.platformName || 'سفري'}`).join(' • '),
        action: '#/kds'
      });
    }
    const pendingZatca = Store.data.invoices.filter((i) => i.zatca && ['PENDING', 'QUEUED'].includes(i.zatca.status));
    if (pendingZatca.length) {
      list.push({
        type: 'zatca', icon: 'file', tone: 'amber',
        title: `${pendingZatca.length} فاتورة بانتظار الإبلاغ الضريبي`,
        sub: 'الفاتورة المبسطة تُبلّغ خلال 24 ساعة — راجع مركز ZATCA',
        action: '#/zatca'
      });
    }
    const overdue = this.data.invoices.filter((i) => i.type === 'sale' && i.due > 0.01 && U.daysBetween(i.date, U.today()) > 30);
    if (overdue.length) {
      const total = U.sum(overdue, (i) => i.due);
      list.push({
        type: 'ar', icon: 'clock', tone: 'amber',
        title: `${overdue.length} فاتورة تجاوزت 30 يوماً`,
        sub: `إجمالي المستحق ${U.money(total)}`,
        action: '#/contacts'
      });
    }
    const unpaidPurchases = this.data.purchases.filter((p) => p.type !== 'return' && p.due > 0.01);
    if (unpaidPurchases.length) {
      list.push({
        type: 'ap', icon: 'truck', tone: 'blue',
        title: `${unpaidPurchases.length} فاتورة شراء غير مسددة`,
        sub: `المستحق للموردين ${U.money(U.sum(unpaidPurchases, (p) => p.due))}`,
        action: '#/purchases'
      });
    }
    if (!list.length) list.push({ type: 'ok', icon: 'checkCircle', tone: 'green', title: 'كل شيء تحت السيطرة', sub: 'لا توجد تنبيهات حالياً', action: '#/' });
    return list;
  };

  Store.exportJSON = function () {
    return JSON.stringify(this.data, null, 2);
  };
  Store.importJSON = function (text) {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.journal)) {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو لا ينتمي لنظام طلال تكنو.');
    }
    this.data = applyDefaults(parsed);
    this.data.meta.app = 'TalalTechno';
    this.save();
    const admin = this.data.users.find((u) => u.role === 'admin') || this.data.users[0];
    if (admin) this.setUser(admin.id, true);
    this.applyTheme();
    return true;
  };
  Store.resetDemo = function () {
    this.data = Store.blank();
    this.seedMode = true;
    try { window.Seed.run(); } finally { this.seedMode = false; }
    this.currentUser = this.data.users.find((u) => u.role === 'admin') || this.data.users[0];
    if (this.currentUser) this.setUser(this.currentUser.id, true);
    this.save();
    this.applyTheme();
  };

  Store.stats = function () {
    const d = this.data;
    return {
      products: d.products.length,
      customers: d.customers.length,
      suppliers: d.suppliers.length,
      invoices: d.invoices.length,
      journal: d.journal.length,
      users: d.users.length,
      tables: d.tables.length,
      orders: d.orders.length
    };
  };

  Store.applyDefaults = applyDefaults;
})();
