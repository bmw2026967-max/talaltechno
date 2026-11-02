/* ==========================================================================
   Page — Users, roles & permissions, audit trail
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = {
    tab: 'users',
    q: '',
    role: 'all',
    auditQ: '',
    permDraft: null
  };
  let viewRef = null;

  const ROLE_ORDER = ['admin', 'manager', 'accountant', 'cashier'];
  const EDITABLE_ROLES = ['manager', 'accountant', 'cashier'];
  const MODULE_GROUPS = [
    { group: 'الرئيسية', items: [{ id: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard' }] },
    { group: 'العمليات', items: [
      { id: 'pos', label: 'نقطة البيع', icon: 'pos' },
      { id: 'sales', label: 'المبيعات', icon: 'receipt' },
      { id: 'purchases', label: 'المشتريات', icon: 'truck' },
      { id: 'products', label: 'المنتجات', icon: 'tag' },
      { id: 'inventory', label: 'المخزون', icon: 'box' }
    ] },
    { group: 'المالية', items: [
      { id: 'contacts', label: 'العملاء والموردون', icon: 'users' },
      { id: 'accounting', label: 'المحاسبة', icon: 'book' },
      { id: 'treasury', label: 'الخزينة والمصروفات', icon: 'wallet' },
      { id: 'reports', label: 'التقارير', icon: 'chart' }
    ] },
    { group: 'الإدارة', items: [
      { id: 'users', label: 'المستخدمون والصلاحيات', icon: 'shield' },
      { id: 'settings', label: 'الإعدادات', icon: 'settings' }
    ] }
  ];
  const MODULES = MODULE_GROUPS.reduce((acc, g) => acc.concat(g.items), []);

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  const roleInfo = (role) => Store.ROLES[role] || { label: role, color: 'gray', icon: 'user', desc: '' };
  const moduleLabel = (key) => (MODULES.find((m) => m.id === key) || {}).label || key;

  function roleBadge(role) {
    const r = roleInfo(role);
    return `<span class="badge badge-${r.color || 'gray'}">${U.icon(r.icon || 'user', 11)} ${U.esc(r.label)}</span>`;
  }

  function lastActivity(user) {
    const audit = Store.data.audit.find((a) => a.user === user.name);
    const inv = Store.data.invoices.filter((i) => i.cashierId === user.id)
      .sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)))[0];
    const at = audit ? audit.at : inv ? (inv.createdAt || inv.date) : null;
    return at ? { at, text: U.timeAgo(at) } : { at: null, text: 'لا يوجد نشاط' };
  }

  function headerHtml() {
    const actions = [];
    if (state.tab === 'users') actions.push(`<button class="btn btn-primary" data-new-user>${U.icon('plus', 16)} مستخدم جديد</button>`);
    if (state.tab === 'roles') actions.push(`<button class="btn btn-primary" data-save-perms>${U.icon('save', 16)} حفظ الصلاحيات</button>`);
    if (state.tab === 'audit') {
      actions.push(`<button class="btn btn-secondary btn-sm" data-audit-export>${U.icon('download', 14)} تصدير</button>`);
      actions.push(`<button class="btn btn-danger btn-sm" data-audit-clear>${U.icon('trash', 14)} مسح السجل</button>`);
    }
    return `<div class="page-head">
      <div><div class="page-title">المستخدمون والصلاحيات</div><div class="page-sub">إدارة فريق العمل والأدوار وصلاحيات الوصول وسجل التدقيق الكامل</div></div>
      <div class="page-actions">${actions.join('')}</div>
    </div>`;
  }

  function tabsHtml() {
    const tabs = [
      ['users', 'المستخدمون', 'users', Store.data.users.length],
      ['roles', 'الأدوار والصلاحيات', 'shield', null],
      ['audit', 'سجل التدقيق', 'clipboard', Store.data.audit.length]
    ];
    return `<div class="tabs">${tabs.map(([id, label, icon, count]) =>
      `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}${count !== null ? `<span class="count">${U.num(count, 0)}</span>` : ''}</button>`).join('')}</div>`;
  }

  /* ---------- Users ---------- */
  function filteredUsers() {
    let list = Store.data.users.slice();
    if (state.role !== 'all') list = list.filter((u) => u.role === state.role);
    const q = norm(state.q);
    if (q) list = list.filter((u) => norm(u.name).includes(q) || norm(u.username).includes(q) || norm(u.phone).includes(q) || norm(roleInfo(u.role).label).includes(q));
    return list.sort((a, b) => {
      const ai = ROLE_ORDER.indexOf(a.role), bi = ROLE_ORDER.indexOf(b.role);
      return (ai - bi) || String(a.name).localeCompare(String(b.name), 'ar');
    });
  }

  function usersContent() {
    const users = filteredUsers();
    const active = Store.data.users.filter((u) => u.active !== false).length;
    const admins = Store.data.users.filter((u) => u.role === 'admin' && u.active !== false).length;
    const cashiers = Store.data.users.filter((u) => u.role === 'cashier').length;
    const custom = EDITABLE_ROLES.filter((r) => Store.data.rolePerms && Array.isArray(Store.data.rolePerms[r])).length;

    const rows = users.map((u) => {
      const act = lastActivity(u);
      const self = Store.currentUser && Store.currentUser.id === u.id;
      return `<tr>
        <td><div class="product-cell">${UI.avatar(u.name)}<div><div class="cell-main">${U.esc(u.name)} ${self ? '<span class="badge badge-green" style="margin-inline-start:4px">أنت</span>' : ''}</div><div class="cell-sub">@${U.esc(u.username || '')}</div></div></div></td>
        <td>${roleBadge(u.role)}</td>
        <td><div class="cell-main ltr" style="text-align:right">${U.esc(u.phone || '—')}</div></td>
        <td><div class="cell-main">${U.esc(act.text)}</div><div class="cell-sub">${act.at ? U.formatDateTime(act.at) : 'لم يسجل دخولاً بعد'}</div></td>
        <td>${UI.statusBadge(u.active === false ? 'inactive' : 'active')}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-user-edit="${u.id}" title="تعديل">${U.icon('edit', 15)}</button>
          <button class="btn-icon btn-ghost" data-user-pin="${u.id}" title="تغيير رمز الدخول">${U.icon('key', 15)}</button>
          <button class="btn-icon btn-ghost" data-user-toggle="${u.id}" title="${u.active === false ? 'تفعيل' : 'إيقاف'}" ${self ? 'disabled' : ''}>${U.icon(u.active === false ? 'checkCircle' : 'lock', 15)}</button>
          <button class="btn-icon btn-ghost" data-user-del="${u.id}" title="حذف" ${self ? 'disabled' : ''}>${U.icon('trash', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(6, 'users', 'لا يوجد مستخدمون', 'أضف مستخدماً جديداً للبدء');

    return `<div class="kpi-grid">
        ${PK.kpi({ label: 'إجمالي المستخدمين', value: U.num(Store.data.users.length, 0), icon: 'users', tone: 'green', sub: `<b>${active}</b> مستخدم نشط` })}
        ${PK.kpi({ label: 'مديرو النظام', value: U.num(admins, 0), icon: 'shield', tone: 'purple', sub: 'وصول كامل لجميع الوحدات' })}
        ${PK.kpi({ label: 'الكاشير', value: U.num(cashiers, 0), icon: 'pos', tone: 'gold', sub: 'نقاط البيع والفواتير' })}
        ${PK.kpi({ label: 'أدوار بصلاحيات مخصصة', value: U.num(custom, 0), icon: 'sliders', tone: 'blue', sub: `من أصل ${EDITABLE_ROLES.length} أدوار قابلة للتعديل` })}
      </div>

      <div class="card mt-3">
        <div class="toolbar">
          <div class="searchbox">${U.icon('search', 15)}<input class="input" data-user-q value="${U.esc(state.q)}" placeholder="بحث بالاسم أو اسم المستخدم أو الهاتف..." /></div>
          <select class="select" data-user-role>
            <option value="all" ${state.role === 'all' ? 'selected' : ''}>كل الأدوار</option>
            ${ROLE_ORDER.map((r) => `<option value="${r}" ${state.role === r ? 'selected' : ''}>${U.esc(roleInfo(r).label)}</option>`).join('')}
          </select>
          <div class="toolbar-spacer"></div>
          <span class="text-muted text-xs">${users.length} مستخدم</span>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>المستخدم</th><th>الدور</th><th>الهاتف</th><th>آخر نشاط</th><th>الحالة</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }

  function openUserForm(user) {
    const isNew = !user;
    const self = !isNew && Store.currentUser && Store.currentUser.id === user.id;
    const isLastAdmin = !isNew && user.role === 'admin' && user.active !== false &&
      Store.data.users.filter((u) => u.role === 'admin' && u.active !== false).length <= 1;
    PK.formModal({
      title: isNew ? 'إضافة مستخدم جديد' : 'تعديل بيانات المستخدم',
      subtitle: isNew ? 'أنشئ حساباً جديداً وحدد دوره وصلاحياته' : `@${user.username}`,
      icon: isNew ? 'user' : 'edit',
      submitText: isNew ? 'إنشاء المستخدم' : 'حفظ التعديلات',
      fields: [
        { name: 'name', label: 'الاسم الكامل', required: true, placeholder: 'مثال: محمد أحمد العلي', full: true },
        { name: 'username', label: 'اسم المستخدم', required: true, placeholder: 'mohammed', value: isNew ? '' : user.username },
        { name: 'phone', label: 'رقم الهاتف', placeholder: '+966 55 000 0000', value: isNew ? '' : user.phone },
        { name: 'role', label: 'الدور', type: 'select', required: true, disabled: self, value: isNew ? 'cashier' : user.role,
          options: ROLE_ORDER.map((r) => ({ value: r, label: roleInfo(r).label })) },
        ...(isNew ? [{ name: 'pin', label: 'رمز الدخول (4–8 أرقام)', required: true, type: 'password', maxlength: 8, placeholder: '••••' }] : []),
        { name: 'active', label: 'الحساب نشط', type: 'checkbox', text: 'السماح للمستخدم بالدخول إلى النظام', value: isNew ? true : user.active !== false, disabled: self || isLastAdmin, full: true }
      ],
      footInfo: isNew ? 'سيتمكن المستخدم من الدخول برمز PIN الخاص به.' : (self ? 'لا يمكنك تغيير دورك أو إيقاف حسابك الحالي.' : ''),
      onSubmit(data) {
        const name = String(data.name || '').trim();
        const username = String(data.username || '').trim().toLowerCase();
        if (name.length < 3) throw new Error('يرجى إدخال الاسم الكامل (3 أحرف على الأقل).');
        if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new Error('اسم المستخدم يجب أن يكون 3–24 حرفاً إنجليزياً أو رقماً (بدون مسافات).');
        if (Store.data.users.some((u) => u.username.toLowerCase() === username && u.id !== (user && user.id))) throw new Error('اسم المستخدم مستخدم بالفعل، اختر اسماً آخر.');
        if (!Store.ROLES[data.role]) throw new Error('يرجى اختيار دور صالح.');
        if (isNew && !/^\d{4,8}$/.test(String(data.pin || ''))) throw new Error('رمز الدخول يجب أن يكون من 4 إلى 8 أرقام.');
        if (self && data.role !== user.role) throw new Error('لا يمكنك تغيير دور حسابك الحالي.');
        if (self && data.active === false) throw new Error('لا يمكنك إيقاف حسابك الحالي.');
        if (isLastAdmin && (data.role !== 'admin' || data.active === false)) throw new Error('يجب أن يبقى مدير نظام واحد نشط على الأقل.');
        if (isNew) {
          Store.data.users.push({
            id: U.uid('usr'), name, username, phone: String(data.phone || '').trim(),
            role: data.role, pin: String(data.pin), active: data.active !== false,
            createdAt: new Date().toISOString()
          });
          Store.audit('إضافة مستخدم', `${name} (@${username}) — ${roleInfo(data.role).label}`, 'user');
        } else {
          Object.assign(user, {
            name, username, phone: String(data.phone || '').trim(), role: data.role,
            active: data.active !== false
          });
          Store.audit('تعديل مستخدم', `${name} (@${username}) — ${roleInfo(data.role).label}`, 'edit');
        }
        Store.save();
        return true;
      },
      onDone() { Pages.users.render(viewRef); App.refreshChrome(); }
    });
  }

  function openPinForm(user) {
    PK.formModal({
      title: 'تغيير رمز الدخول',
      subtitle: `${user.name} — @${user.username}`,
      icon: 'key',
      submitText: 'تحديث الرمز',
      fields: [
        { name: 'pin', label: 'رمز الدخول الجديد', type: 'password', required: true, maxlength: 8, placeholder: '4–8 أرقام', full: true },
        { name: 'confirm', label: 'تأكيد الرمز الجديد', type: 'password', required: true, maxlength: 8, placeholder: 'أعد إدخال الرمز', full: true }
      ],
      footInfo: 'سيُطلب الرمز الجديد عند تسجيل دخول المستخدم.',
      onSubmit(data) {
        const pin = String(data.pin || '');
        if (!/^\d{4,8}$/.test(pin)) throw new Error('رمز الدخول يجب أن يكون من 4 إلى 8 أرقام.');
        if (pin !== String(data.confirm || '')) throw new Error('الرمز الجديد وتأكيده غير متطابقين.');
        user.pin = pin;
        Store.audit('تغيير رمز الدخول', user.name, 'key');
        Store.save();
        return true;
      },
      onDone() { Pages.users.render(viewRef); }
    });
  }

  /* ---------- Roles & permissions ---------- */
  function initDraft() {
    if (!state.permDraft) {
      state.permDraft = {};
      EDITABLE_ROLES.forEach((r) => { state.permDraft[r] = Store.rolePerms(r); });
    }
  }

  function roleCards() {
    return `<div class="role-grid">${ROLE_ORDER.map((role) => {
      const info = roleInfo(role);
      const perms = Store.rolePerms(role);
      const isAdmin = role === 'admin';
      const labels = isAdmin ? ['كل الصلاحيات'] : perms.map(moduleLabel);
      return `<div class="role-card">
        <div class="rc-head">
          <span class="kpi-icon ${info.color || 'green'}" style="width:34px;height:34px;border-radius:10px">${U.icon(info.icon || 'user', 17)}</span>
          <div style="flex:1"><strong>${U.esc(info.label)}</strong><span class="text-muted text-xs">${isAdmin ? 'وصول غير مقيد' : `${perms.length} صلاحية`}</span></div>
          ${isAdmin ? `<span class="badge badge-green">${U.icon('lock', 10)} محمي</span>` : ''}
        </div>
        <p>${U.esc(info.desc || '')}</p>
        <div class="perm-list">${labels.slice(0, 8).map((l) => `<span>${U.esc(l)}</span>`).join('')}${labels.length > 8 ? `<span>+${labels.length - 8}</span>` : ''}</div>
        ${isAdmin ? '' : `<button class="btn btn-ghost btn-sm mt-2" data-reset-role="${role}">${U.icon('refresh', 13)} استعادة الافتراضي</button>`}
      </div>`;
    }).join('')}</div>`;
  }

  function rolesContent() {
    initDraft();
    const draft = state.permDraft;
    const rows = MODULE_GROUPS.map((group) => {
      const head = `<tr><td colspan="5" style="background:var(--card-2);font-weight:800;font-size:10.5px;color:var(--muted);letter-spacing:.4px">${U.esc(group.group)}</td></tr>`;
      const items = group.items.map((item) => {
        const cells = EDITABLE_ROLES.map((role) => {
          const checked = (draft[role] || []).includes(item.id);
          return `<td class="center"><input type="checkbox" data-perm-role="${role}" data-perm-key="${item.id}" ${checked ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--brand);cursor:pointer" /></td>`;
        }).join('');
        return `<tr><td><div class="flex items-center gap-1">${U.icon(item.icon, 15)}<span style="font-weight:600">${U.esc(item.label)}</span></div></td>
          <td class="center"><span class="badge badge-green">${U.icon('check', 11)} كامل</span></td>${cells}</tr>`;
      }).join('');
      return head + items;
    }).join('');

    return `<div class="info-banner">${U.icon('info', 17)}<div><strong>الصلاحيات تُطبق فوراً</strong><br>حدد الوحدات التي يستطيع كل دور الوصول إليها. مدير النظام يملك دائماً جميع الصلاحيات ولا يمكن تقييده.</div></div>
      <div class="mt-3">${roleCards()}</div>
      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('sliders', 18)} مصفوفة الصلاحيات</div><div class="card-sub">اختر الوحدات المتاحة لكل دور ثم اضغط حفظ الصلاحيات</div></div>
          <button class="btn btn-primary btn-sm" data-save-perms>${U.icon('save', 14)} حفظ</button></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th style="min-width:190px">الوحدة / الصفحة</th><th class="center">مدير النظام</th>
            ${EDITABLE_ROLES.map((r) => `<th class="center">${U.esc(roleInfo(r).label)}</th>`).join('')}</tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <div class="card-foot"><span class="text-muted text-xs">${MODULES.length} وحدة متاحة • تُطبق التغييرات على جميع مستخدمي الدور</span>
          <span class="text-muted text-xs">آخر تحديث: ${Store.data.meta.updatedAt ? U.formatDateTime(Store.data.meta.updatedAt) : '—'}</span></div>
      </div>`;
  }

  function savePermissions() {
    const map = {};
    EDITABLE_ROLES.forEach((r) => { map[r] = []; });
    viewRef.querySelectorAll('[data-perm-role]').forEach((box) => {
      if (box.checked) {
        const role = box.dataset.permRole;
        if (map[role]) map[role].push(box.dataset.permKey);
      }
    });
    const empty = EDITABLE_ROLES.filter((r) => !map[r].length);
    if (empty.length) {
      UI.toast(`يجب اختيار صلاحية واحدة على الأقل للدور: ${empty.map((r) => roleInfo(r).label).join('، ')}`, 'error');
      return;
    }
    Store.batch(() => {
      EDITABLE_ROLES.forEach((role) => Store.setRolePerms(role, map[role]));
      Store.audit('تحديث صلاحيات الأدوار', EDITABLE_ROLES.map((r) => `${roleInfo(r).label}: ${map[r].length}`).join(' • '), 'shield');
    });
    state.permDraft = map;
    UI.toast('تم حفظ الصلاحيات وتطبيقها على المستخدمين', 'success');
    App.refresh();
  }

  /* ---------- Audit ---------- */
  function auditRows() {
    const q = norm(state.auditQ);
    let list = Store.data.audit.slice();
    if (q) list = list.filter((a) => norm(a.action).includes(q) || norm(a.details).includes(q) || norm(a.user).includes(q) || norm(roleInfo(a.role).label).includes(q));
    return list;
  }

  function auditContent() {
    const list = auditRows();
    const today = U.today();
    const todayCount = Store.data.audit.filter((a) => a.at && U.iso(a.at) === today).length;
    const users = U.unique(Store.data.audit.map((a) => a.user)).length;
    const shown = list.slice(0, 160);

    return `<div class="kpi-grid">
        ${PK.kpi({ label: 'إجمالي السجلات', value: U.num(Store.data.audit.length, 0), icon: 'clipboard', tone: 'green', sub: 'آخر 600 عملية محفوظة' })}
        ${PK.kpi({ label: 'عمليات اليوم', value: U.num(todayCount, 0), icon: 'clock', tone: 'blue', sub: U.formatDate(today, 'full') })}
        ${PK.kpi({ label: 'مستخدمون نشطون في السجل', value: U.num(users, 0), icon: 'users', tone: 'purple', sub: 'قاموا بعمليات مسجلة' })}
        ${PK.kpi({ label: 'نتائج البحث', value: U.num(list.length, 0), icon: 'search', tone: 'gold', sub: state.auditQ ? `بحث: ${U.esc(state.auditQ)}` : 'جميع السجلات' })}
      </div>

      <div class="card mt-3">
        <div class="toolbar">
          <div class="searchbox">${U.icon('search', 15)}<input class="input" data-audit-q value="${U.esc(state.auditQ)}" placeholder="بحث في الإجراء أو التفاصيل أو المستخدم..." /></div>
          <div class="toolbar-spacer"></div>
          <span class="text-muted text-xs">${list.length} نتيجة${list.length > shown.length ? ` • تُعرض ${shown.length}` : ''}</span>
        </div>
        <div class="card-body">
          ${shown.length ? `<div>${shown.map((a) => `<div class="audit-row">
            <span class="audit-ico">${U.icon(a.icon || 'info', 15)}</span>
            <div class="audit-main"><strong>${U.esc(a.action)}</strong><span>${U.esc(a.details || '')}</span>
              <div class="text-muted text-xs" style="margin-top:3px">${U.esc(a.user || 'النظام')} • ${U.esc(roleInfo(a.role).label)}</div></div>
            <span class="audit-time" title="${U.esc(U.formatDateTime(a.at))}">${U.esc(U.timeAgo(a.at))}<br>${U.esc(U.formatTime(a.at))}</span>
          </div>`).join('')}</div>` : UI.empty('clipboard', 'لا توجد سجلات', state.auditQ ? 'جرّب كلمة بحث أخرى' : 'ستظهر هنا كل العمليات التي يقوم بها المستخدمون')}
        </div>
        ${list.length > shown.length ? `<div class="card-foot"><span class="text-muted text-xs">تُعرض أحدث ${shown.length} عملية من ${list.length}</span></div>` : ''}
      </div>`;
  }

  function content() {
    switch (state.tab) {
      case 'roles': return rolesContent();
      case 'audit': return auditContent();
      default: return usersContent();
    }
  }

  function exportAudit() {
    const list = auditRows();
    PK.exportCSV(`TalalTechno-audit-${U.today()}.csv`, ['التاريخ', 'المستخدم', 'الدور', 'الإجراء', 'التفاصيل'], list.map((a) => [
      U.formatDateTime(a.at), a.user || 'النظام', roleInfo(a.role).label, a.action, a.details || ''
    ]));
    Store.audit('تصدير سجل التدقيق', `${list.length} سجل`, 'download');
    Store.save();
  }

  function clearAudit() {
    UI.confirm({
      title: 'مسح سجل التدقيق',
      message: 'سيتم حذف <strong>جميع سجلات التدقيق</strong> نهائياً. لا يمكن التراجع عن هذه العملية. هل أنت متأكد؟',
      danger: true, confirmText: 'مسح السجل', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.data.audit = [];
      Store.audit('مسح سجل التدقيق', 'تم حذف جميع السجلات السابقة', 'trash');
      Store.save();
      UI.toast('تم مسح سجل التدقيق', 'success');
      Pages.users.render(viewRef);
    });
  }

  /* ---------- Render ---------- */
  Pages.users = {
    title: 'المستخدمون والصلاحيات', icon: 'shield', perm: 'users',
    render(view) {
      viewRef = view;
      view.innerHTML = `${headerHtml()}
        <div class="card mt-3" style="overflow:visible">
          ${tabsHtml()}
          <div style="padding:${state.tab === 'audit' ? '0' : '18px'}">${content()}</div>
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab;
        if (state.tab === 'roles') state.permDraft = null;
        Pages.users.render(view);
      }));

      const uq = view.querySelector('[data-user-q]');
      if (uq) uq.addEventListener('input', U.debounce(() => { state.q = uq.value; Pages.users.render(view); }, 180));
      const ur = view.querySelector('[data-user-role]');
      if (ur) ur.addEventListener('change', () => { state.role = ur.value; Pages.users.render(view); });
      const aq = view.querySelector('[data-audit-q]');
      if (aq) aq.addEventListener('input', U.debounce(() => { state.auditQ = aq.value; Pages.users.render(view); }, 180));

      view.onclick = (e) => {
        if (e.target.closest('[data-tab]')) return;
        if (e.target.closest('[data-new-user]')) { openUserForm(null); return; }
        if (e.target.closest('[data-save-perms]')) { savePermissions(); return; }
        if (e.target.closest('[data-audit-export]')) { exportAudit(); return; }
        if (e.target.closest('[data-audit-clear]')) { clearAudit(); return; }
        const edit = e.target.closest('[data-user-edit]');
        if (edit) { const u = Store.user(edit.dataset.userEdit); if (u) openUserForm(u); return; }
        const pin = e.target.closest('[data-user-pin]');
        if (pin) { const u = Store.user(pin.dataset.userPin); if (u) openPinForm(u); return; }
        const toggle = e.target.closest('[data-user-toggle]');
        if (toggle) { toggleUser(toggle.dataset.userToggle); return; }
        const del = e.target.closest('[data-user-del]');
        if (del) { deleteUser(del.dataset.userDel); return; }
        const reset = e.target.closest('[data-reset-role]');
        if (reset) { resetRole(reset.dataset.resetRole); return; }
      };
    }
  };

  function toggleUser(id) {
    const user = Store.user(id);
    if (!user) return;
    if (Store.currentUser && Store.currentUser.id === user.id) { UI.toast('لا يمكنك إيقاف حسابك الحالي', 'error'); return; }
    const activeAdmins = Store.data.users.filter((u) => u.role === 'admin' && u.active !== false);
    if (user.role === 'admin' && user.active !== false && activeAdmins.length <= 1) {
      UI.toast('يجب أن يبقى مدير نظام واحد نشط على الأقل', 'error');
      return;
    }
    user.active = user.active === false;
    Store.audit(user.active ? 'تفعيل مستخدم' : 'إيقاف مستخدم', user.name, user.active ? 'checkCircle' : 'lock');
    Store.save();
    UI.toast(user.active ? 'تم تفعيل المستخدم' : 'تم إيقاف المستخدم', 'success');
    Pages.users.render(viewRef);
  }

  function deleteUser(id) {
    const user = Store.user(id);
    if (!user) return;
    if (Store.currentUser && Store.currentUser.id === user.id) { UI.toast('لا يمكنك حذف حسابك الحالي', 'error'); return; }
    const activeAdmins = Store.data.users.filter((u) => u.role === 'admin' && u.active !== false);
    if (user.role === 'admin' && activeAdmins.length <= 1) { UI.toast('لا يمكن حذف آخر مدير نظام نشط', 'error'); return; }
    UI.confirm({
      title: 'حذف المستخدم',
      message: `هل تريد حذف المستخدم <strong>${U.esc(user.name)}</strong> (@${U.esc(user.username)})؟ ستبقى الفواتير والعمليات المرتبطة به في السجلات.`,
      danger: true, confirmText: 'حذف المستخدم', icon: 'trash'
    }).then((ok) => {
      if (!ok) return;
      Store.data.users = Store.data.users.filter((u) => u.id !== id);
      Store.audit('حذف مستخدم', `${user.name} (@${user.username})`, 'trash');
      Store.save();
      UI.toast('تم حذف المستخدم', 'success');
      Pages.users.render(viewRef);
      App.refreshChrome();
    });
  }

  function resetRole(role) {
    UI.confirm({
      title: 'استعادة الصلاحيات الافتراضية',
      message: `سيتم استعادة الصلاحيات الافتراضية لدور <strong>${U.esc(roleInfo(role).label)}</strong> وحفظها فوراً.`,
      confirmText: 'استعادة', icon: 'refresh'
    }).then((ok) => {
      if (!ok) return;
      Store.resetRolePerms(role);
      state.permDraft = null;
      Store.audit('استعادة صلاحيات افتراضية', roleInfo(role).label, 'refresh');
      Store.save();
      UI.toast('تمت استعادة الصلاحيات الافتراضية', 'success');
      Pages.users.render(viewRef);
      App.refreshChrome();
    });
  }
})();
