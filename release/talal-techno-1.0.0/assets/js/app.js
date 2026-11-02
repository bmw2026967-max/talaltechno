/* ==========================================================================
   طلال تكنو — Application shell, navigation, routing, search, lock screen
   ========================================================================== */
(function () {
  'use strict';
  const Pages = window.Pages = window.Pages || {};
  const App = window.App = {
    pages: Pages,
    currentRoute: null,
    branchId: null,
    _bound: false
  };

  const NAV = [
    {
      group: 'الرئيسية', items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard', perm: 'dashboard' }
      ]
    },
    {
      group: 'العمليات', items: [
        { id: 'pos', label: 'نقطة البيع', icon: 'pos', perm: 'pos' },
        { id: 'tables', label: 'الطاولات والطلبات', icon: 'grid', perm: 'tables', badge: 'tables' },
        { id: 'kds', label: 'شاشة المطبخ', icon: 'chef', perm: 'kds', badge: 'kds' },
        { id: 'emenu', label: 'القائمة الإلكترونية', icon: 'smartphone', perm: 'emenu' },
        { id: 'sales', label: 'المبيعات', icon: 'receipt', perm: 'sales', badge: 'due' },
        { id: 'purchases', label: 'المشتريات', icon: 'truck', perm: 'purchases' },
        { id: 'products', label: 'القائمة والوصفات', icon: 'tag', perm: 'products' },
        { id: 'inventory', label: 'المخزون والمواد الخام', icon: 'box', perm: 'inventory', badge: 'stock' }
      ]
    },
    {
      group: 'النمو والمالية', items: [
        { id: 'loyalty', label: 'العملاء والولاء', icon: 'heart', perm: 'loyalty' },
        { id: 'contacts', label: 'العملاء والموردون', icon: 'users', perm: 'contacts' },
        { id: 'accounting', label: 'المحاسبة', icon: 'book', perm: 'accounting' },
        { id: 'treasury', label: 'الخزينة والمصروفات', icon: 'wallet', perm: 'treasury' },
        { id: 'shifts', label: 'الورديات والصندوق', icon: 'clock', perm: 'shifts' },
        { id: 'reports', label: 'التقارير', icon: 'chart', perm: 'reports' },
        { id: 'zatca', label: 'مركز ZATCA', icon: 'file', perm: 'zatca', badge: 'zatca' }
      ]
    },
    {
      group: 'التكاملات والإدارة', items: [
        { id: 'integrations', label: 'التكاملات والتوصيل', icon: 'cloud', perm: 'integrations' },
        { id: 'users', label: 'المستخدمون والصلاحيات', icon: 'shield', perm: 'users' },
        { id: 'settings', label: 'الإعدادات', icon: 'settings', perm: 'settings' }
      ]
    }
  ];
  App.NAV = NAV;

  const ROLE_LABEL = (role) => (Store.ROLES[role] || {}).label || role;

  function routeFromHash() {
    const h = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return h || 'dashboard';
  }

  function firstAllowed() {
    for (const group of NAV) {
      for (const item of group.items) {
        if (Store.can(item.perm)) return item.id;
      }
    }
    return 'pos';
  }

  App.can = (perm) => Store.can(perm);

  App.navigate = function (hash) {
    const target = hash.startsWith('#') ? hash : '#/' + hash;
    if (location.hash === target) { App.renderPage(routeFromHash()); return; }
    location.hash = target;
  };

  App.refresh = function () {
    App.renderPage(App.currentRoute || routeFromHash());
    App.refreshChrome();
  };

  App.refreshChrome = function () {
    if (!Store.data) return;
    App.renderNav();
    const branch = Store.branch(App.branchId) || Store.data.branches[0] || { name: 'الفرع الرئيسي' };
    const bl = document.getElementById('branch-label');
    if (bl) bl.textContent = branch.name;
    const bm = document.getElementById('branch-menu');
    if (bm) {
      bm.innerHTML = `<div class="dropdown-head">فرع العمل الحالي</div>` +
        Store.data.branches.filter((b) => b.active !== false).map((b) => `<button class="dropdown-item" data-app-action="set-branch" data-id="${b.id}">
          ${U.icon('map', 17)}<span style="flex:1">${U.esc(b.name)}</span>${b.id === App.branchId ? U.icon('check', 15) : ''}
        </button>`).join('');
    }
    const u = Store.currentUser;
    if (u) {
      const av = document.getElementById('user-avatar');
      if (av) { av.textContent = U.initials(u.name); av.style.background = U.colorFor(u.name); }
      const un = document.getElementById('user-name');
      if (un) un.textContent = u.name;
      const ur = document.getElementById('user-role');
      if (ur) ur.textContent = ROLE_LABEL(u.role);
      const um = document.getElementById('user-menu');
      if (um) {
        um.innerHTML = `<div class="user-menu-head">${UI.avatar(u.name, 'lg')}<div><strong>${U.esc(u.name)}</strong><span>${U.esc(ROLE_LABEL(u.role))} • ${U.esc(u.username || '')}</span></div></div>
          <button class="dropdown-item" data-app-action="lock">${U.icon('lock', 17)} قفل الشاشة</button>
          <button class="dropdown-item" data-app-action="lock">${U.icon('users', 17)} تبديل المستخدم</button>
          ${Store.isAdmin() ? `<button class="dropdown-item" data-app-action="goto" data-href="#/users">${U.icon('shield', 17)} إدارة المستخدمين</button>
          <button class="dropdown-item" data-app-action="goto" data-href="#/settings">${U.icon('settings', 17)} إعدادات النظام</button>` : ''}
          <div class="dropdown-sep"></div>
          <button class="dropdown-item" data-app-action="about">${U.icon('info', 17)} عن النظام <span class="text-muted text-xs" style="margin-inline-start:auto">v1.0</span></button>
          <button class="dropdown-item danger" data-app-action="lock">${U.icon('logout', 17)} تسجيل الخروج</button>`;
      }
    }
    const themeBtn = document.getElementById('theme-icon');
    if (themeBtn) themeBtn.innerHTML = U.icon(Store.data.settings.theme === 'dark' ? 'sun' : 'moon', 17);
    const notifDot = document.getElementById('notif-dot');
    const notes = Store.notifications();
    if (notifDot) notifDot.style.display = notes.some((n) => n.type !== 'ok') ? '' : 'none';
    const nm = document.getElementById('notif-menu');
    if (nm) {
      nm.innerHTML = `<div class="dropdown-head">التنبيهات <span class="badge badge-gray">${notes.length}</span></div>
        <div class="notif-list">${notes.map((n) => `<button class="notif-item" data-app-action="goto" data-href="${n.action || '#/'}">
          <span class="notif-ico ${n.tone || 'green'}">${U.icon(n.icon || 'info', 16)}</span>
          <span style="flex:1;min-width:0"><strong>${U.esc(n.title)}</strong><span>${U.esc(n.sub)}</span></span>
        </button>`).join('')}</div>`;
    }
    const cashCard = document.getElementById('cash-card');
    if (cashCard) {
      const cash = Accounting.cashBalance();
      const today = Accounting.salesSummary(U.today(), U.today());
      cashCard.innerHTML = `<div class="label">${U.icon('wallet', 13)} نقدية الصندوق</div>
        <div class="value">${U.money(cash)}</div>
        <div class="sub">مبيعات اليوم <b>${U.money(today.total)}</b></div>`;
    }
  };

  App.renderNav = function () {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    let html = '';
    NAV.forEach((group) => {
      const items = group.items.filter((i) => Store.can(i.perm));
      if (!items.length) return;
      html += `<div class="nav-group"><div class="nav-label">${U.esc(group.group)}</div>`;
      items.forEach((item) => {
        let badge = '';
        if (item.badge === 'stock') {
          const count = Store.rawMaterials().filter((p) => Number(p.stock) <= (p.reorderLevel || 10)).length;
          if (count) badge = `<span class="nav-badge alert">${count}</span>`;
        }
        if (item.badge === 'due') {
          const count = Store.data.invoices.filter((i) => i.type === 'sale' && i.due > 0.01).length;
          if (count) badge = `<span class="nav-badge">${count}</span>`;
        }
        if (item.badge === 'kds') {
          const count = Store.data.orders.filter((o) => ['new', 'preparing'].includes(o.status)).length;
          if (count) badge = `<span class="nav-badge alert">${count}</span>`;
        }
        if (item.badge === 'tables') {
          const count = Store.data.tables.filter((t) => Tables.status(t) === 'occupied').length;
          if (count) badge = `<span class="nav-badge">${count}</span>`;
        }
        if (item.badge === 'zatca') {
          const count = Store.data.invoices.filter((i) => i.zatca && ['PENDING', 'QUEUED'].includes(i.zatca.status)).length;
          if (count) badge = `<span class="nav-badge alert">${count}</span>`;
        }
        html += `<a class="nav-item ${App.currentRoute === item.id ? 'active' : ''}" href="#/${item.id}">
          ${U.icon(item.icon, 19)}<span>${U.esc(item.label)}</span>${badge}</a>`;
      });
      html += `</div>`;
    });
    nav.innerHTML = html;
    const foot = document.getElementById('sidebar-foot');
    if (foot) {
      foot.innerHTML = `<div class="cash-card" id="cash-card"></div>`;
      const cash = Accounting.cashBalance();
      const today = Accounting.salesSummary(U.today(), U.today());
      foot.querySelector('#cash-card').innerHTML = `<div class="label">${U.icon('wallet', 13)} نقدية الصندوق</div>
        <div class="value">${U.money(cash)}</div>
        <div class="sub">مبيعات اليوم <b>${U.money(today.total)}</b></div>`;
    }
  };

  App.renderShell = function () {
    const app = document.getElementById('app');
    app.innerHTML = `
      <aside class="sidebar" id="sidebar">
        <button class="sidebar-collapse" data-app-action="collapse" title="طي القائمة">${U.icon('chevronRight', 15)}</button>
        <div class="sidebar-brand">
          <div class="brand-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 6h14M8 6 4 14h8L8 6Zm8 0-4 8h8l-4-8Z"/></svg></div>
          <div class="brand-text"><strong>طلال تكنو</strong><span>ERP سحابي • مطاعم • نقاط بيع</span></div>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
        <div class="sidebar-foot" id="sidebar-foot"></div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" data-app-action="mobile-menu" aria-label="القائمة">${U.icon('menu', 18)}</button>
          <div class="topbar-search">
            ${U.icon('search', 17, 'search-ico')}
            <input class="input" id="global-search" placeholder="بحث عن منتج، عميل، فاتورة..." autocomplete="off" />
            <span class="kbd">Ctrl K</span>
            <div class="search-results" id="search-results"></div>
          </div>
          <div class="topbar-spacer"></div>
          <div class="topbar-actions">
            <div class="dropdown" id="branch-dd">
              <button class="branch-chip" data-app-action="toggle-dropdown" data-target="branch-dd">${U.icon('map', 15)}<span id="branch-label">الفرع الرئيسي</span>${U.icon('chevronDown', 13)}</button>
              <div class="dropdown-menu" id="branch-menu" style="min-width:250px"></div>
            </div>
            <button class="icon-btn" data-app-action="theme" title="تبديل المظهر"><span id="theme-icon">${U.icon('moon', 17)}</span></button>
            <div class="dropdown" id="notif-dd">
              <button class="icon-btn" data-app-action="toggle-dropdown" data-target="notif-dd" title="التنبيهات">${U.icon('bell', 17)}<span class="dot" id="notif-dot"></span></button>
              <div class="dropdown-menu wide" id="notif-menu"></div>
            </div>
            <div class="dropdown" id="user-dd">
              <button class="user-chip" data-app-action="toggle-dropdown" data-target="user-dd">
                <span class="avatar" id="user-avatar">؟</span>
                <div class="u-info" style="text-align:right"><div class="u-name" id="user-name">—</div><div class="u-role" id="user-role">—</div></div>
                ${U.icon('chevronDown', 13)}
              </button>
              <div class="dropdown-menu" id="user-menu" style="min-width:260px"></div>
            </div>
          </div>
        </header>
        <main class="view" id="view"></main>
      </div>`;
  };

  function freshView() {
    const old = document.getElementById('view');
    if (!old || !old.parentNode) return old;
    const next = old.cloneNode(false);
    old.parentNode.replaceChild(next, old);
    return next;
  }

  App.renderPage = function (route) {
    const page = Pages[route] || Pages.dashboard;
    if (!page) return;
    App.currentRoute = Pages[route] ? route : firstAllowed();
    if (!Store.can(page.perm)) {
      const view = freshView();
      view.innerHTML = `<div class="empty" style="padding-top:80px">
        <div class="empty-icon">${U.icon('lock', 28)}</div>
        <strong>لا تملك صلاحية الوصول</strong>
        <p>دورك الحالي (${U.esc(ROLE_LABEL(Store.currentUser ? Store.currentUser.role : ''))}) لا يسمح بالدخول إلى هذه الصفحة.</p>
        <button class="btn btn-primary" data-app-action="goto" data-href="#/${firstAllowed()}">الانتقال إلى الصفحة المتاحة</button>
      </div>`;
      App.renderNav();
      return;
    }
    document.title = `${page.title || 'طلال تكنو'} | طلال تكنو`;
    const view = freshView();
    view.innerHTML = '';
    try {
      page.render(view);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="empty" style="padding-top:70px"><div class="empty-icon">${U.icon('alert', 28)}</div>
        <strong>حدث خطأ أثناء عرض الصفحة</strong><p>${U.esc(e.message || '')}</p>
        <button class="btn btn-primary" onclick="location.reload()">إعادة تحميل النظام</button></div>`;
    }
    App.renderNav();
    App.refreshChrome();
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  };

  /* ---------- Global search ---------- */
  function closeSearch() {
    const r = document.getElementById('search-results');
    if (r) r.classList.remove('open');
  }

  function doSearch(q) {
    const box = document.getElementById('search-results');
    if (!box) return;
    q = q.trim().toLowerCase();
    if (q.length < 1) { box.classList.remove('open'); box.innerHTML = ''; return; }
    const products = Store.data.products.filter((p) => p.active !== false &&
      (p.name.toLowerCase().includes(q) || String(p.sku).toLowerCase().includes(q) || String(p.barcode).includes(q))).slice(0, 5);
    const customers = Store.data.customers.filter((c) => c.active !== false &&
      (c.name.toLowerCase().includes(q) || String(c.phone || '').includes(q) || String(c.code || '').toLowerCase().includes(q))).slice(0, 4);
    const suppliers = Store.data.suppliers.filter((s) => s.active !== false &&
      (s.name.toLowerCase().includes(q) || String(s.phone || '').includes(q))).slice(0, 3);
    const invoices = Store.data.invoices.filter((i) =>
      String(i.number).toLowerCase().includes(q) || String(i.customerName || '').toLowerCase().includes(q)).slice(0, 5);
    let html = '';
    if (products.length) {
      html += `<div class="search-group-label">المنتجات</div>` + products.map((p) => `<button class="search-result" data-search-type="product" data-id="${p.id}">
        <span class="s-ico">${p.emoji || '📦'}</span><span style="flex:1;min-width:0"><strong>${U.esc(p.name)}</strong><span>${U.esc(p.sku)} • المخزون ${U.num(p.stock, 0)}</span></span>
        <span class="s-val">${U.money(p.price)}</span></button>`).join('');
    }
    if (customers.length) {
      html += `<div class="search-group-label">العملاء</div>` + customers.map((c) => `<button class="search-result" data-search-type="customer" data-id="${c.id}">
        ${UI.avatar(c.name, 'sm')}<span style="flex:1;min-width:0"><strong>${U.esc(c.name)}</strong><span>${U.esc(c.phone || '')}</span></span>
        <span class="s-val">${U.money(Accounting.customerBalance(c.id))}</span></button>`).join('');
    }
    if (suppliers.length) {
      html += `<div class="search-group-label">الموردون</div>` + suppliers.map((s) => `<button class="search-result" data-search-type="supplier" data-id="${s.id}">
        ${UI.avatar(s.name, 'sm')}<span style="flex:1;min-width:0"><strong>${U.esc(s.name)}</strong><span>${U.esc(s.phone || '')}</span></span>
        <span class="s-val">${U.money(Accounting.supplierBalance(s.id))}</span></button>`).join('');
    }
    if (invoices.length) {
      html += `<div class="search-group-label">المستندات</div>` + invoices.map((i) => `<button class="search-result" data-search-type="invoice" data-id="${i.id}">
        <span class="s-ico">${U.icon(i.type === 'return' ? 'refresh' : i.type === 'quote' ? 'file' : 'receipt', 16)}</span>
        <span style="flex:1;min-width:0"><strong>${U.esc(i.number)} — ${U.esc(i.customerName || 'عميل نقدي')}</strong><span>${U.formatDate(i.date)} • ${i.type === 'return' ? 'مرتجع' : i.type === 'quote' ? 'عرض سعر' : 'فاتورة'}</span></span>
        <span class="s-val">${U.money(i.total)}</span></button>`).join('');
    }
    if (!html) html = `<div class="search-empty">لا توجد نتائج مطابقة لـ «${U.esc(q)}»</div>`;
    box.innerHTML = html;
    box.classList.add('open');
  }

  App.openProductQuick = function (id) {
    const p = Store.product(id);
    if (!p) return;
    const cat = Store.category(p.categoryId);
    const margin = p.price ? ((p.price - p.cost) / p.price * 100) : 0;
    UI.modal({
      size: 'sm', title: p.name, subtitle: `${p.sku} • ${cat ? cat.name : 'غير مصنف'}`, icon: 'tag',
      body: `<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">
          <div class="thumb lg" style="width:64px;height:64px;font-size:34px">${p.emoji || '📦'}</div>
          <div style="flex:1"><div class="kpi-value" style="font-size:22px">${U.money(p.price)}</div><div class="cell-sub">سعر البيع • التكلفة ${U.money(p.cost)}</div></div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">المخزون الحالي</div><div class="detail-value ${p.stock <= (p.reorderLevel || 10) ? 'text-danger' : 'text-success'}">${U.num(p.stock, 0)} ${U.esc(p.unit || '')}</div></div>
          <div class="detail-item"><div class="detail-label">حد إعادة الطلب</div><div class="detail-value">${U.num(p.reorderLevel || 10, 0)}</div></div>
          <div class="detail-item"><div class="detail-label">هامش الربح</div><div class="detail-value">${U.pct(margin)}</div></div>
          <div class="detail-item"><div class="detail-label">الباركود</div><div class="detail-value mono">${U.esc(p.barcode || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">قيمة المخزون بالتكلفة</div><div class="detail-value">${U.money(p.stock * p.cost)}</div></div>
          <div class="detail-item"><div class="detail-label">الضريبة</div><div class="detail-value">${U.num(p.taxRate || Store.data.settings.vatRate, 0)}%</div></div>
        </div>`,
      footer: `<button class="btn btn-secondary btn-sm" data-edit>${U.icon('edit', 14)} تعديل المنتج</button>
        <button class="btn btn-primary btn-sm" data-sell>${U.icon('pos', 14)} بيع المنتج</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-edit]').addEventListener('click', () => {
          close(); window.__editProduct = p.id; App.navigate('#/products');
        });
        modal.querySelector('[data-sell]').addEventListener('click', () => {
          close(); window.__posAdd = p.id; App.navigate('#/pos');
        });
      }
    });
  };

  /* ---------- Lock screen ---------- */
  App.lock = function () {
    const root = document.getElementById('lock-root');
    if (!root) return;
    const users = Store.activeUsers();
    let selected = Store.currentUser ? Store.currentUser.id : users[0].id;
    root.innerHTML = `<div class="lock-screen"><div class="lock-card">
      <div class="lock-brand"><div class="brand-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 6h14M8 6 4 14h8L8 6Zm8 0-4 8h8l-4-8Z"/></svg></div><strong>طلال تكنو</strong></div>
      <h2>مرحباً بعودتك</h2><p>اختر المستخدم وأدخل رمز الدخول للمتابعة</p>
      <div class="lock-users">${users.map((u) => `<button class="lock-user ${u.id === selected ? 'active' : ''}" data-lock-user="${u.id}">${UI.avatar(u.name, 'sm')}<span>${U.esc(u.name.split(' ')[0])}</span></button>`).join('')}</div>
      <div class="field"><input class="input pin-input" id="lock-pin" type="password" inputmode="numeric" maxlength="8" placeholder="••••" autocomplete="off" /></div>
      <button class="btn btn-primary btn-lg btn-block" id="lock-submit" style="margin-top:12px">${U.icon('lock', 17)} دخول النظام</button>
      <div class="lock-hint">وضع تجريبي — رمز المدير: 1234 • المحاسب: 3333 • الكاشير: 4444</div>
    </div></div>`;
    const input = root.querySelector('#lock-pin');
    const submit = () => {
      const user = Store.user(selected);
      if (!user) return;
      if (String(input.value) !== String(user.pin)) {
        input.style.borderColor = 'var(--danger)';
        input.style.boxShadow = '0 0 0 3px var(--danger-soft)';
        input.value = '';
        UI.toast('رمز الدخول غير صحيح', 'error');
        setTimeout(() => { input.style.borderColor = ''; input.style.boxShadow = ''; }, 1200);
        return;
      }
      Store.setUser(user.id, true);
      root.innerHTML = '';
      UI.toast(`مرحباً ${user.name}`, 'success');
      if (!Store.can((Pages[App.currentRoute] || {}).perm)) App.navigate('#/' + firstAllowed());
      else App.refresh();
    };
    root.querySelectorAll('[data-lock-user]').forEach((btn) => btn.addEventListener('click', () => {
      selected = btn.dataset.lockUser;
      root.querySelectorAll('[data-lock-user]').forEach((b) => b.classList.toggle('active', b === btn));
      input.focus();
    }));
    root.querySelector('#lock-submit').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    setTimeout(() => input.focus(), 80);
  };

  App.about = function () {
    UI.modal({
      size: 'sm', title: 'عن نظام طلال تكنو', subtitle: 'الإصدار 1.0 — نسخة تجريبية متكاملة', icon: 'scale',
      body: `<div style="text-align:center;padding:6px 0 12px">
          <div class="brand-mark" style="margin:0 auto 10px;width:58px;height:58px;border-radius:17px"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 6h14M8 6 4 14h8L8 6Zm8 0-4 8h8l-4-8Z"/></svg></div>
          <h3 style="font-size:18px">طلال تكنو</h3><p class="text-muted text-sm">منظومة المحاسبة ونقاط البيع وإدارة المبيعات المتكاملة</p>
        </div>
        <div class="summary-strip">
          <div><div class="ss-lbl">المنتجات</div><div class="ss-val">${Store.data.products.length}</div></div>
          <div><div class="ss-lbl">الفواتير</div><div class="ss-val">${Store.data.invoices.length}</div></div>
          <div><div class="ss-lbl">القيود</div><div class="ss-val">${Store.data.journal.length}</div></div>
        </div>
        <div class="info-banner success mt-2">${U.icon('shield', 17)}<div><strong>بياناتك محفوظة محلياً</strong><br>يعمل النظام بالكامل دون إنترنت، ويمكنك تصدير نسخة احتياطية من الإعدادات.</div></div>
        <div class="text-muted text-xs mt-2" style="text-align:center">جميع البيانات المعروضة تجريبية لأغراض العرض • ${U.formatDate(U.today(), 'full')}</div>`,
      footer: `<button class="btn btn-primary" data-close>حسناً</button>`,
      onMount(modal, close) { modal.querySelector('[data-close]').addEventListener('click', close); }
    });
  };

  /* ---------- Dropdowns ---------- */
  function closeDropdowns(except) {
    document.querySelectorAll('.dropdown.open').forEach((d) => {
      if (!except || d.id !== except) d.classList.remove('open');
    });
  }

  function bindGlobal() {
    if (App._bound) return;
    App._bound = true;

    document.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-app-action]');
      if (actionEl) {
        const action = actionEl.dataset.appAction;
        if (action === 'toggle-dropdown') {
          const id = actionEl.dataset.target;
          const dd = document.getElementById(id);
          const willOpen = !dd.classList.contains('open');
          closeDropdowns(id);
          dd.classList.toggle('open', willOpen);
          return;
        }
        if (action === 'collapse') {
          document.getElementById('app').classList.toggle('collapsed');
          localStorage.setItem('talaltechno.collapsed', document.getElementById('app').classList.contains('collapsed') ? '1' : '0');
          return;
        }
        if (action === 'mobile-menu') {
          document.getElementById('app').classList.toggle('mobile-open');
          return;
        }
        if (action === 'theme') { Store.toggleTheme(); return; }
        if (action === 'set-branch') {
          App.branchId = actionEl.dataset.id;
          try { localStorage.setItem('talaltechno.branch', App.branchId); } catch (err) {}
          closeDropdowns();
          App.refreshChrome();
          UI.toast('تم تغيير فرع العمل', 'success');
          return;
        }
        if (action === 'goto') {
          closeDropdowns();
          App.navigate(actionEl.dataset.href);
          return;
        }
        if (action === 'lock') { closeDropdowns(); App.lock(); return; }
        if (action === 'about') { closeDropdowns(); App.about(); return; }
      }
      const searchEl = e.target.closest('[data-search-type]');
      if (searchEl) {
        const type = searchEl.dataset.searchType, id = searchEl.dataset.id;
        closeSearch();
        const input = document.getElementById('global-search');
        if (input) input.value = '';
        if (type === 'product') App.openProductQuick(id);
        else if (type === 'customer') Actions.openStatement('customer', id);
        else if (type === 'supplier') Actions.openStatement('supplier', id);
        else if (type === 'invoice') Actions.openInvoice(id);
        return;
      }
      if (e.target.closest('.nav-item')) {
        document.getElementById('app').classList.remove('mobile-open');
      }
      if (!e.target.closest('.dropdown')) closeDropdowns();
      if (!e.target.closest('.topbar-search')) closeSearch();
    });

    const search = document.getElementById('global-search');
    if (search) {
      const handler = U.debounce(() => doSearch(search.value), 160);
      search.addEventListener('input', handler);
      search.addEventListener('focus', () => { if (search.value.trim()) doSearch(search.value); });
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeSearch(); search.blur(); }
        if (e.key === 'Enter') {
          const first = document.querySelector('#search-results .search-result');
          if (first) first.click();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const s = document.getElementById('global-search');
        if (s) { s.focus(); s.select(); }
      }
      if (e.key === 'Escape') { closeDropdowns(); closeSearch(); }
    });

    window.addEventListener('hashchange', () => {
      const route = routeFromHash();
      if (!Pages[route]) { App.navigate('#/' + firstAllowed()); return; }
      App.renderPage(route);
    });
  }

  /* ---------- Init ---------- */
  App.init = function () {
    try {
      Store.init();
      App.branchId = localStorage.getItem('talaltechno.branch') || (Store.data.branches[0] || {}).id;
      if (!Store.branch(App.branchId)) App.branchId = (Store.data.branches[0] || {}).id;
      App.renderShell();
      bindGlobal();
      if (localStorage.getItem('talaltechno.collapsed') === '1' && window.innerWidth > 900) {
        document.getElementById('app').classList.add('collapsed');
      }
      let route = routeFromHash();
      if (!Pages[route]) route = firstAllowed();
      if (!Store.can((Pages[route] || {}).perm)) route = firstAllowed();
      if (location.hash !== '#/' + route) history.replaceState(null, '', '#/' + route);
      App.renderPage(route);
      document.getElementById('app').hidden = false;
      const boot = document.getElementById('boot');
      if (boot) {
        boot.classList.add('out');
        setTimeout(() => boot.remove(), 500);
      }
      setTimeout(() => {
        const s = Store.data.settings;
        if (s.company) document.title = 'لوحة التحكم | طلال تكنو';
      }, 50);
    } catch (e) {
      console.error(e);
      const boot = document.getElementById('boot');
      if (boot) {
        boot.innerHTML = `<div class="boot-logo" style="flex-direction:column;text-align:center;gap:8px">
          <svg viewBox="0 0 48 48" width="46" height="46" style="color:#f07a72"><path d="M24 6v36M12 12h24M9 38h30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          <strong style="font-size:22px">تعذر تشغيل النظام</strong>
          <span style="max-width:420px;font-size:12px;color:#9ab3a7;line-height:1.8">${U.esc(e.message || 'حدث خطأ غير متوقع')}<br>جرّب مسح بيانات المتصفح وإعادة التحميل.</span>
          <button onclick="localStorage.clear();location.reload()" style="margin-top:14px;background:#d9bb75;color:#0a1e17;border:0;border-radius:10px;padding:10px 18px;font-weight:800;cursor:pointer">إعادة تهيئة البيانات</button>
        </div>`;
      }
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.init);
  else App.init();
})();
