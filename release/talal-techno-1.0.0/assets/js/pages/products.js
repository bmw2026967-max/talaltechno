/* ==========================================================================
   Page — Menu items, recipes (BOM) and raw materials
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};

  const state = { q: '', category: 'all', status: 'all', sort: 'name', type: 'menu' };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const isRaw = (p) => p.type === 'raw';

  function filtered() {
    let list = Store.data.products.filter((p) => (state.type === 'raw' ? isRaw(p) : !isRaw(p)));
    const q = norm(state.q);
    if (q) list = list.filter((p) => norm(p.name).includes(q) || norm(p.sku).includes(q) || String(p.barcode || '').includes(q));
    if (state.category !== 'all') list = list.filter((p) => p.categoryId === state.category);
    if (state.status === 'active') list = list.filter((p) => p.active !== false);
    else if (state.status === 'inactive') list = list.filter((p) => p.active === false);
    else if (state.status === 'low') list = list.filter((p) => p.active !== false && p.stock > 0 && p.stock <= (p.reorderLevel || 10));
    else if (state.status === 'out') list = list.filter((p) => p.active !== false && Store.stockOf(p) <= 0);
    if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (state.sort === 'stock') list.sort((a, b) => Store.stockOf(a) - Store.stockOf(b));
    else if (state.sort === 'price') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'margin') list.sort((a, b) => marginOf(b) - marginOf(a));
    else if (state.sort === 'value') list.sort((a, b) => b.stock * b.cost - a.stock * a.cost);
    return list;
  }

  function marginOf(p) {
    const cost = Store.costOf(p);
    return p.price ? (p.price - cost) / p.price * 100 : 0;
  }

  function stockBadge(p) {
    if (p.active === false) return '<span class="badge badge-gray">موقوف</span>';
    if (isRaw(p)) {
      if (p.stock <= 0) return '<span class="badge badge-red">نفد</span>';
      if (p.stock <= (p.reorderLevel || 10)) return '<span class="badge badge-amber">منخفض</span>';
      return '<span class="badge badge-green">متوفر</span>';
    }
    if (p.available === false) return '<span class="badge badge-gray">مخفي</span>';
    const available = Store.stockOf(p);
    if (available <= 0) return '<span class="badge badge-red">غير متوفر</span>';
    if (available <= 5) return '<span class="badge badge-amber">كمية محدودة</span>';
    return '<span class="badge badge-green">متوفر</span>';
  }

  function draw() {
    if (!viewRef) return;
    const list = filtered();
    const body = viewRef.querySelector('#products-body');
    const foot = viewRef.querySelector('#products-foot');
    const head = viewRef.querySelector('#products-head');
    const tabs = viewRef.querySelectorAll('[data-type]');
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.type === state.type));
    if (!body) return;
    if (state.type === 'raw') {
      if (head) head.innerHTML = '<tr><th>المادة الخام</th><th>الفئة</th><th>المخزون</th><th>حد الطلب</th><th>تكلفة الوحدة</th><th>القيمة الدفترية</th><th>الحالة</th><th></th></tr>';
      body.innerHTML = list.map((p) => {
        const cat = Store.category(p.categoryId);
        const value = p.stock * p.cost;
        return `<tr>
          <td><div class="product-cell"><div class="thumb">${p.emoji || '📦'}</div>
            <div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${U.esc(p.sku)} • <span class="mono">${U.esc(p.barcode || '—')}</span></div></div></div></td>
          <td>${cat ? `<span class="badge" style="background:${cat.color}18;color:${cat.color}">${U.esc(cat.name)}</span>` : '<span class="text-muted">غير مصنف</span>'}</td>
          <td><div class="cell-main ${p.stock <= 0 ? 'text-danger' : p.stock <= (p.reorderLevel || 10) ? 'text-warning' : ''}">${U.num(p.stock, 2)} ${U.esc(p.unit || '')}</div>
            <div class="cell-sub">${U.num(recipeUses(p.id), 0)} وصفة تستخدمه</div></td>
          <td class="num text-muted">${U.num(p.reorderLevel || 0, 0)}</td>
          <td class="num">${U.money(p.cost)}</td>
          <td class="num fw-800">${U.money(value)}</td>
          <td>${stockBadge(p)}</td>
          <td class="actions-cell"><div class="row-actions">
            <button class="btn-icon btn-ghost" data-edit="${p.id}" title="تعديل">${U.icon('edit', 15)}</button>
            <button class="btn-icon btn-ghost" data-adjust="${p.id}" title="تسوية جرد">${U.icon('sliders', 15)}</button>
            <button class="btn-icon btn-ghost" data-more="${p.id}" title="تفاصيل">${U.icon('eye', 15)}</button>
            <button class="btn-icon btn-ghost" data-del="${p.id}" title="حذف / إيقاف">${U.icon('trash', 15)}</button>
          </div></td>
        </tr>`;
      }).join('') || PK.emptyRow(8, 'box', 'لا توجد مواد خام مطابقة', 'أضف مادة خاماً جديدة لبناء وصفات القائمة');
      if (foot) {
        const units = U.sum(list, (p) => p.stock);
        const cost = U.sum(list, (p) => p.stock * p.cost);
        foot.innerHTML = `<span class="text-muted text-xs">عرض <b>${list.length}</b> من ${Store.rawMaterials().length} مادة خام • ${U.num(units, 0)} وحدة</span>
          <span class="text-muted text-xs">القيمة الدفترية: <b class="text-success">${U.money(cost)}</b></span>`;
      }
      return;
    }

    if (head) head.innerHTML = '<tr><th>الصنف</th><th>الفئة</th><th>تكلفة الوصفة</th><th>سعر البيع</th><th>الهامش</th><th>المتاح</th><th>الحالة</th><th></th></tr>';
    body.innerHTML = list.map((p) => {
      const cat = Store.category(p.categoryId);
      const cost = Store.costOf(p);
      const margin = marginOf(p);
      const available = Store.stockOf(p);
      const lines = Store.recipeOf(p).length;
      return `<tr>
        <td><div class="product-cell"><div class="thumb">${p.emoji || '🍽️'}</div>
          <div><div class="cell-main">${U.esc(p.name)} ${p.featured ? '<span class="badge badge-gold" style="font-size:8px">مميز</span>' : ''}</div>
          <div class="cell-sub">${U.esc(p.sku)} • ${lines ? `<b>${U.num(lines, 0)}</b> مكوّن` : '<span class="text-warning">بدون وصفة</span>'}</div></div></div></td>
        <td>${cat ? `<span class="badge" style="background:${cat.color}18;color:${cat.color}">${U.esc(cat.name)}</span>` : '<span class="text-muted">غير مصنف</span>'}</td>
        <td class="num">${U.money(cost)}</td>
        <td class="num fw-800">${U.money(p.price)}</td>
        <td class="num ${margin < 15 ? 'text-warning' : 'text-success'}">${U.num(margin, 1)}%</td>
        <td><div class="cell-main">${U.num(available, 0)} حصة</div><div class="cell-sub">من المواد الخام</div></td>
        <td>${stockBadge(p)}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-edit="${p.id}" title="تعديل">${U.icon('edit', 15)}</button>
          <button class="btn-icon btn-ghost" data-recipe="${p.id}" title="الوصفة والمكونات">${U.icon('chef', 15)}</button>
          <button class="btn-icon btn-ghost" data-toggle-available="${p.id}" title="${p.available === false ? 'إظهار في القائمة' : 'إخفاء من القائمة'}">${U.icon(p.available === false ? 'eye' : 'eyeOff', 15)}</button>
          <button class="btn-icon btn-ghost" data-label="${p.id}" title="طباعة بطاقة">${U.icon('barcode', 15)}</button>
          <button class="btn-icon btn-ghost" data-del="${p.id}" title="حذف / إيقاف">${U.icon('trash', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(8, 'chef', 'لا توجد أصناف مطابقة', 'جرّب تغيير البحث أو أضف صنفاً جديداً للقائمة');
    if (foot) {
      const availableCount = list.filter((p) => Store.availableOf(p)).length;
      const avgMargin = list.length ? U.sum(list, marginOf) / list.length : 0;
      foot.innerHTML = `<span class="text-muted text-xs">عرض <b>${list.length}</b> من ${Store.menuProducts().length} صنف • <b class="text-success">${availableCount}</b> متاح للبيع</span>
        <span class="text-muted text-xs">متوسط الهامش: <b>${U.num(avgMargin, 1)}%</b></span>`;
    }
  }

  function recipeUses(materialId) {
    return Store.data.products.filter((p) => Store.recipeOf(p).some((l) => l.materialId === materialId)).length;
  }

  /* ---------- Recipe editor ---------- */
  function recipeRowHtml(line, materials) {
    const material = line ? Store.product(line.materialId) : null;
    const qty = line ? Number(line.qty) || 0 : 0;
    return `<div class="recipe-row" data-recipe-row>
      <select class="select" data-material>
        <option value="">اختر مادة خام…</option>
        ${materials.map((m) => `<option value="${m.id}" ${material && material.id === m.id ? 'selected' : ''}>${U.esc(m.name)} (${U.esc(m.unit || 'وحدة')})</option>`).join('')}
      </select>
      <input class="input num" data-qty type="number" min="0" step="0.01" value="${qty || ''}" placeholder="0" />
      <span class="recipe-unit" data-unit>${U.esc(material ? material.unit || '' : '')}</span>
      <span class="recipe-cost" data-line-cost>${U.money(material ? material.cost * qty : 0)}</span>
      <button type="button" class="btn-icon btn-ghost" data-remove-line title="حذف المكوّن">${U.icon('x', 13)}</button>
    </div>`;
  }

  function recipeEditor(lines, materials) {
    return `<div class="recipe-editor" data-recipe-editor>
      <div class="recipe-head"><strong>${U.icon('chef', 14)} مكوّنات الوصفة (BOM)</strong>
        <span class="text-muted text-xs">تُخصم تلقائياً من المخزون عند كل بيع</span></div>
      <div class="recipe-labels"><span>المادة الخام</span><span>الكمية</span><span>الوحدة</span><span>التكلفة</span><span></span></div>
      <div data-recipe-lines>${(lines.length ? lines : [null]).map((l) => recipeRowHtml(l, materials)).join('')}</div>
      <div class="recipe-foot">
        <button type="button" class="btn btn-ghost btn-sm" data-add-line>${U.icon('plus', 13)} إضافة مكوّن</button>
        <span class="toolbar-spacer"></span>
        <span class="text-muted text-xs">إجمالي تكلفة الوصفة: <b data-recipe-total>0.00 ر.س</b></span>
      </div>
    </div>`;
  }

  function collectRecipe(modal) {
    const rows = Array.from(modal.querySelectorAll('[data-recipe-row]'));
    const lines = [];
    rows.forEach((row) => {
      const materialId = row.querySelector('[data-material]').value;
      const qty = U.parseNum(row.querySelector('[data-qty]').value);
      if (!materialId || !(qty > 0)) return;
      const dup = lines.find((l) => l.materialId === materialId);
      if (dup) dup.qty = U.round2(dup.qty + qty);
      else lines.push({ materialId, qty: U.round2(qty) });
    });
    return lines;
  }

  function recipeTotal(modal) {
    return U.round2(collectRecipe(modal).reduce((sum, l) => {
      const m = Store.product(l.materialId);
      return sum + (m ? m.cost * l.qty : 0);
    }, 0));
  }

  /* ---------- Product form ---------- */
  function openForm(id) {
    const p = id ? Store.product(id) : null;
    const isEdit = !!p;
    const type = p ? (isRaw(p) ? 'raw' : 'menu') : state.type;
    const materials = Store.rawMaterials().sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const cats = Store.data.categories;
    const recipe = p ? Store.recipeOf(p) : [];

    const body = `<div class="form-grid">
      <div class="field full"><label>اسم ${type === 'raw' ? 'المادة الخام' : 'الصنف'} <span class="req">*</span></label>
        <input class="input" name="name" value="${U.esc(p ? p.name : '')}" placeholder="${type === 'raw' ? 'مثال: صدور دجاج طازجة' : 'مثال: شيش طاووق'}" /></div>
      <div class="field"><label>رمز الصنف (SKU) <span class="req">*</span></label><input class="input" name="sku" value="${U.esc(p ? p.sku : '')}" placeholder="${type === 'raw' ? 'RM-001' : 'MN-001'}" /></div>
      <div class="field"><label>الباركود</label><input class="input" name="barcode" value="${U.esc(p ? p.barcode || '' : '')}" placeholder="اتركه فارغاً للتوليد التلقائي" /></div>
      <div class="field"><label>الفئة</label><select class="select" name="categoryId">${cats.map((c) => `<option value="${c.id}" ${p && p.categoryId === c.id ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>الوحدة</label><input class="input" name="unit" value="${U.esc(p ? p.unit || '' : type === 'raw' ? 'كجم' : 'حبة')}" placeholder="كجم / حبة / علبة" /></div>
      <div class="field"><label>${type === 'raw' ? 'تكلفة الوحدة' : 'تكلفة تقديرية (بدون وصفة)'} <span class="req">${type === 'raw' ? '*' : ''}</span></label>
        <input class="input num" name="cost" type="number" min="0" step="0.01" value="${p ? p.cost : ''}" placeholder="0.00" /></div>
      <div class="field"><label>${type === 'raw' ? 'حد إعادة الطلب' : 'سعر البيع'} <span class="req">${type === 'raw' ? '' : '*'}</span></label>
        <input class="input num" name="${type === 'raw' ? 'reorderLevel' : 'price'}" type="number" min="0" step="0.01" value="${p ? (type === 'raw' ? p.reorderLevel || 0 : p.price) : type === 'raw' ? Store.data.settings.lowStockGlobal || 10 : ''}" placeholder="0.00" /></div>
      ${type === 'menu' ? `<div class="field"><label>نسبة الضريبة %</label><input class="input num" name="taxRate" type="number" min="0" max="100" step="0.01" value="${p ? p.taxRate : Store.data.settings.vatRate}" /></div>
        <div class="field"><label>محطة التحضير</label><select class="select" name="station">${Object.keys(Orders.STATIONS).map((k) => `<option value="${k}" ${p && (p.station || 'pass') === k ? 'selected' : ''}>${U.esc(Orders.STATIONS[k].label)}</option>`).join('')}</select></div>` : `<div class="field"><label>المورد الافتراضي</label><select class="select" name="supplierId"><option value="">بدون مورد محدد</option>${PK.supplierOptions(p ? p.supplierId : '')}</select></div>`}
      ${!isEdit ? `<div class="field"><label>${type === 'raw' ? 'الكمية الافتتاحية' : 'المخزون الافتتاحي (غير مستخدم)'}</label>
        <input class="input num" name="stock" type="number" min="0" step="0.01" value="0" ${type === 'raw' ? '' : 'disabled'} />
        <div class="help">${type === 'raw' ? 'تُسجَّل كتسوية مخزون افتتاحية' : 'أصناف القائمة تُحسب من المواد الخام'}</div></div>` : ''}
      <div class="field"><label>رمز تعبيري</label><input class="input" name="emoji" value="${U.esc(p ? p.emoji || '' : type === 'raw' ? '📦' : '🍽️')}" maxlength="4" /></div>
      <div class="field full"><label>الوصف</label><input class="input" name="description" value="${U.esc(p ? p.description || '' : '')}" placeholder="وصف قصير يظهر في القائمة الإلكترونية" /></div>
      <div class="field"><label class="checkline" style="height:38px"><input type="checkbox" name="active" ${!p || p.active !== false ? 'checked' : ''}/> ${type === 'raw' ? 'مادة نشطة' : 'صنف نشط'}</label></div>
      ${type === 'menu' ? `<div class="field"><label class="checkline" style="height:38px"><input type="checkbox" name="available" ${!p || p.available !== false ? 'checked' : ''}/> متاح في القائمة الإلكترونية</label></div>` : ''}
    </div>
    ${type === 'menu' ? recipeEditor(recipe, materials) : `<div class="info-banner mt-2">${U.icon('box', 16)}<div>المواد الخام تُشترى وتُستهلك عبر الوصفات. رصيدها الحالي: <b>${U.num(p ? p.stock : 0, 2)}</b> ${U.esc(p ? p.unit || '' : '')}.</div></div>`}`;

    UI.modal({
      size: 'lg',
      title: isEdit ? `تعديل ${type === 'raw' ? 'المادة الخام' : 'صنف القائمة'}` : `إضافة ${type === 'raw' ? 'مادة خام' : 'صنف للقائمة'}`,
      subtitle: isEdit ? p.name : type === 'raw' ? 'مادة تُشترى وتُستهلك في الوصفات' : 'صنف يظهر في POS والقائمة الإلكترونية',
      icon: type === 'raw' ? 'box' : 'chef',
      body,
      footer: `<span class="foot-info">${type === 'raw' ? 'تُسجّل فروقات المخزون في حساب 5108' : 'تُخصم مكونات الوصفة من المخزون عند البيع'}</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-save>${U.icon(isEdit ? 'save' : 'plus', 15)} ${isEdit ? 'حفظ التعديلات' : 'إضافة'}</button>`,
      onMount(modal, close) {
        const totalEl = modal.querySelector('[data-recipe-total]');
        const recalc = () => {
          const rows = Array.from(modal.querySelectorAll('[data-recipe-row]'));
          rows.forEach((row) => {
            const m = Store.product(row.querySelector('[data-material]').value);
            const qty = U.parseNum(row.querySelector('[data-qty]').value);
            row.querySelector('[data-unit]').textContent = m ? m.unit || '' : '';
            row.querySelector('[data-line-cost]').textContent = U.money(m ? m.cost * qty : 0);
          });
          if (totalEl) totalEl.textContent = U.money(recipeTotal(modal));
        };
        modal.addEventListener('change', (e) => {
          if (e.target.matches('[data-material]')) recalc();
        });
        modal.addEventListener('input', (e) => {
          if (e.target.matches('[data-qty]')) recalc();
        });
        modal.addEventListener('click', (e) => {
          const add = e.target.closest('[data-add-line]');
          if (add) {
            const lines = modal.querySelector('[data-recipe-lines]');
            lines.insertAdjacentHTML('beforeend', recipeRowHtml(null, materials));
            recalc();
            return;
          }
          const rm = e.target.closest('[data-remove-line]');
          if (rm) {
            const rows = modal.querySelectorAll('[data-recipe-row]');
            if (rows.length <= 1) {
              const row = rm.closest('[data-recipe-row]');
              row.querySelector('[data-material]').value = '';
              row.querySelector('[data-qty]').value = '';
              recalc();
            } else {
              rm.closest('[data-recipe-row]').remove();
              recalc();
            }
          }
        });
        recalc();
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modal);
          try {
            const name = String(data.name || '').trim();
            const sku = String(data.sku || '').trim();
            if (!name) throw new Error('الاسم مطلوب.');
            if (!sku) throw new Error('رمز الصنف مطلوب.');
            const dup = Store.data.products.find((x) => x.id !== (p ? p.id : '') && norm(x.sku) === norm(sku));
            if (dup) throw new Error('رمز الصنف مستخدم بالفعل.');
            const barcode = String(data.barcode || '').trim() || (p ? p.barcode : '') || U.barcode();
            const barcodeDup = Store.data.products.find((x) => x.id !== (p ? p.id : '') && String(x.barcode) === String(barcode));
            if (barcodeDup) throw new Error('الباركود مستخدم بالفعل.');
            const lines = type === 'menu' ? collectRecipe(modal) : [];
            const manualCost = Math.max(0, U.round2(data.cost));
            if (type === 'raw' && !(manualCost > 0)) throw new Error('تكلفة المادة الخام مطلوبة.');
            const computedCost = lines.length ? recipeTotal(modal) : manualCost;
            const price = type === 'menu' ? Math.max(0, U.round2(data.price)) : 0;
            if (type === 'menu' && !(price > 0)) throw new Error('سعر البيع مطلوب.');
            const patch = {
              name, sku, barcode, categoryId: data.categoryId,
              unit: String(data.unit || 'حبة').trim() || 'حبة',
              cost: computedCost, price,
              taxRate: type === 'menu' ? Number(data.taxRate) || 0 : 0,
              reorderLevel: Number(data.reorderLevel) || 0,
              emoji: String(data.emoji || '').trim() || (type === 'raw' ? '📦' : '🍽️'),
              description: String(data.description || '').trim(),
              active: !!data.active,
              type
            };
            if (type === 'menu') {
              patch.station = data.station || 'pass';
              patch.available = !!data.available;
              patch.recipe = lines;
            } else {
              patch.supplierId = data.supplierId || null;
            }
            if (isEdit) {
              Store.update('products', p.id, patch);
              Store.audit('تعديل ' + (type === 'raw' ? 'مادة خام' : 'صنف قائمة'), `${name} — ${sku}`, type === 'raw' ? 'box' : 'chef');
              Store.save();
              close();
              UI.toast('تم حفظ التعديلات', 'success');
              App.refresh();
              return;
            }
            const product = Object.assign({
              id: U.uid('p'), stock: 0, createdAt: new Date().toISOString()
            }, patch);
            Store.data.products.push(product);
            const opening = type === 'raw' ? Math.max(0, U.round2(data.stock)) : 0;
            if (opening > 0) {
              Business.createAdjustment({
                productId: product.id, newQty: opening,
                reason: 'رصيد افتتاحي — مادة خام جديدة', date: U.today()
              });
            } else {
              Store.save();
            }
            Store.audit(type === 'raw' ? 'مادة خام جديدة' : 'صنف قائمة جديد', `${name} — ${sku}`, 'plus');
            close();
            UI.toast(type === 'raw' ? 'تمت إضافة المادة الخام' : 'تمت إضافة الصنف إلى القائمة', 'success');
            App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  /* ---------- Recipe view ---------- */
  function openRecipe(id) {
    const p = Store.product(id);
    if (!p) return;
    const lines = Store.recipeOf(p);
    const total = Store.costOf(p);
    const margin = marginOf(p);
    UI.modal({
      size: 'md', title: 'وصفة الصنف', subtitle: `${p.name} — ${p.sku}`, icon: 'chef',
      body: `<div class="recipe-view">
        ${lines.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>المكوّن</th><th>الكمية</th><th>تكلفة الوحدة</th><th>التكلفة</th><th>المخزون</th></tr></thead><tbody>
          ${lines.map((l) => {
            const m = Store.product(l.materialId);
            return `<tr><td>${U.esc(m ? m.name : 'مكوّن محذوف')}</td><td class="num">${U.num(l.qty, 2)} ${U.esc(m ? m.unit || '' : '')}</td><td class="num">${U.money(m ? m.cost : 0)}</td><td class="num fw-800">${U.money(m ? m.cost * l.qty : 0)}</td><td class="num ${m && m.stock <= (m.reorderLevel || 10) ? 'text-warning' : ''}">${U.num(m ? m.stock : 0, 2)}</td></tr>`;
          }).join('')}</tbody></table></div>` : `<div class="info-banner warn">${U.icon('alert', 16)}<div>لا توجد وصفة معرّفة لهذا الصنف. يُستخدم المخزون المباشر إن وُجد.</div></div>`}
        <div class="recipe-summary">
          <div><span>تكلفة الوصفة</span><b>${U.money(total)}</b></div>
          <div><span>سعر البيع</span><b>${U.money(p.price)}</b></div>
          <div><span>هامش الربح</span><b class="${margin < 15 ? 'text-warning' : 'text-success'}">${U.num(margin, 1)}%</b></div>
          <div><span>الحصص المتاحة</span><b>${U.num(Store.stockOf(p), 0)}</b></div>
        </div>
        <div class="info-banner success mt-2">${U.icon('shield', 16)}<div>عند بيع هذا الصنف تُخصم المكوّنات أعلاه من مخزون المواد الخام ويُسجّل قيد تكلفة المبيعات تلقائياً.</div></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-close>إغلاق</button><button class="btn btn-primary" data-edit-recipe>${U.icon('edit', 15)} تعديل الوصفة</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-edit-recipe]').addEventListener('click', () => { close(); setTimeout(() => openForm(id), 160); });
      }
    });
  }

  function removeProduct(id) {
    const p = Store.product(id);
    if (!p) return;
    const usedInRecipe = Store.data.products.some((x) => x.id !== id && Store.recipeOf(x).some((l) => l.materialId === id));
    const used = Store.data.invoices.some((i) => (i.items || []).some((it) => it.productId === id))
      || Store.data.purchases.some((x) => (x.items || []).some((it) => it.productId === id))
      || Store.data.stockMoves.some((m) => m.productId === id)
      || Store.data.adjustments.some((a) => a.productId === id)
      || usedInRecipe;
    UI.confirm({
      title: used ? 'إيقاف الصنف' : 'حذف الصنف',
      message: used
        ? `${usedInRecipe ? 'هذه المادة مستخدمة في وصفات القائمة. ' : ''}الصنف «<strong>${U.esc(p.name)}</strong>» مرتبط بحركات أو مستندات سابقة. سيتم إيقافه مع الاحتفاظ بتاريخه.`
        : `هل تريد حذف «<strong>${U.esc(p.name)}</strong>» نهائياً؟ لا يمكن التراجع.`,
      danger: !used, confirmText: used ? 'إيقاف' : 'حذف نهائي', icon: used ? 'archive' : 'trash'
    }).then((ok) => {
      if (!ok) return;
      if (used) {
        Store.update('products', id, { active: false });
        Store.audit('إيقاف صنف', p.name, 'archive');
      } else {
        Store.remove('products', id);
        Store.audit('حذف صنف', p.name, 'trash');
      }
      Store.save();
      UI.toast(used ? 'تم إيقاف الصنف' : 'تم حذف الصنف', 'success');
      App.refresh();
    });
  }

  function exportList() {
    const list = filtered();
    if (state.type === 'raw') {
      PK.exportCSV('raw-materials-' + U.today() + '.csv',
        ['SKU', 'المادة الخام', 'الفئة', 'الوحدة', 'المخزون', 'حد الطلب', 'التكلفة', 'القيمة', 'الحالة'],
        list.map((p) => {
          const cat = Store.category(p.categoryId);
          return [p.sku, p.name, cat ? cat.name : '', p.unit || '', p.stock, p.reorderLevel || 0, p.cost,
            U.round2(p.stock * p.cost), p.active === false ? 'موقوف' : p.stock <= 0 ? 'نفد' : p.stock <= (p.reorderLevel || 10) ? 'منخفض' : 'متوفر'];
        }));
      return;
    }
    PK.exportCSV('menu-' + U.today() + '.csv',
      ['SKU', 'الصنف', 'الفئة', 'تكلفة الوصفة', 'السعر', 'الهامش %', 'المكونات', 'المتاح', 'الحالة'],
      list.map((p) => {
        const cat = Store.category(p.categoryId);
        return [p.sku, p.name, cat ? cat.name : '', Store.costOf(p), p.price, U.round2(marginOf(p)),
          Store.recipeOf(p).length, Store.stockOf(p), p.active === false ? 'موقوف' : Store.availableOf(p) ? 'متاح' : 'غير متاح'];
      }));
  }

  function printList() {
    const list = filtered();
    if (state.type === 'raw') {
      PK.printReport({
        title: 'المواد الخام وتقييم المخزون',
        subtitle: `${list.length} مادة • ${U.num(U.sum(list, (p) => p.stock), 0)} وحدة`,
        headers: ['SKU', 'المادة', 'الفئة', 'المخزون', 'حد الطلب', 'التكلفة', 'القيمة'],
        rows: list.map((p) => {
          const cat = Store.category(p.categoryId);
          return [U.esc(p.sku), U.esc(p.name), U.esc(cat ? cat.name : '—'), U.num(p.stock, 2), U.num(p.reorderLevel || 0, 0), U.money(p.cost), U.money(p.stock * p.cost)];
        }),
        totals: [{ label: 'قيمة المواد الخام', value: U.money(U.sum(list, (p) => p.stock * p.cost)), grand: true }]
      });
      return;
    }
    PK.printReport({
      title: 'قائمة الطعام والأسعار',
      subtitle: `${list.length} صنف • ${U.num(list.filter((p) => Store.availableOf(p)).length, 0)} متاح`,
      headers: ['SKU', 'الصنف', 'الفئة', 'التكلفة', 'السعر', 'الهامش', 'المكونات'],
      rows: list.map((p) => {
        const cat = Store.category(p.categoryId);
        return [U.esc(p.sku), U.esc(p.name), U.esc(cat ? cat.name : '—'), U.money(Store.costOf(p)), U.money(p.price), U.num(marginOf(p), 1) + '%', U.num(Store.recipeOf(p).length, 0)];
      }),
      totals: [
        { label: 'عدد الأصناف', value: U.num(list.length, 0) },
        { label: 'متوسط الهامش', value: U.num(list.length ? U.sum(list, marginOf) / list.length : 0, 1) + '%', grand: true }
      ]
    });
  }

  Pages.products = {
    title: 'القائمة والوصفات', icon: 'chef', perm: 'products',
    render(view) {
      viewRef = view;
      const menu = Store.menuProducts();
      const raw = Store.rawMaterials();
      const withRecipe = menu.filter((p) => Store.recipeOf(p).length);
      const avgMargin = menu.length ? U.sum(menu, marginOf) / menu.length : 0;
      const lowRaw = raw.filter((p) => p.stock > 0 && p.stock <= (p.reorderLevel || 10)).length;
      const outRaw = raw.filter((p) => p.stock <= 0).length;
      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">القائمة والوصفات</div><div class="page-sub">أصناف البيع، مكوّناتها من المواد الخام، والتكلفة الفعلية — ${menu.length} صنف • ${raw.length} مادة خام</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير CSV</button>
            <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
            <button class="btn btn-primary" data-new>${U.icon('plus', 16)} ${state.type === 'raw' ? 'مادة خام' : 'صنف جديد'}</button>
          </div>
        </div>
        <div class="kpi-grid">
          ${PK.kpi({ label: 'أصناف القائمة', value: U.num(menu.length, 0), icon: 'chef', tone: 'green', sub: `<b>${withRecipe.length}</b> صنف بوصفة معرّفة` })}
          ${PK.kpi({ label: 'المواد الخام', value: U.num(raw.length, 0), icon: 'box', tone: 'blue', sub: `<b>${outRaw}</b> نفد • <b>${lowRaw}</b> منخفض` })}
          ${PK.kpi({ label: 'متوسط هامش القائمة', value: U.num(avgMargin, 1) + '%', icon: 'chart', tone: avgMargin < 20 ? 'gold' : 'green', sub: 'بعد تكلفة المكونات الفعلية' })}
          ${PK.kpi({ label: 'قيمة المواد الخام', value: U.money(Accounting.inventoryValuation().costValue), icon: 'coins', tone: 'gold', sub: `تقييم ${U.num(Accounting.inventoryValuation().units, 0)} وحدة` })}
        </div>
        <div class="card mt-3">
          <div class="tabs">
            <button class="tab ${state.type === 'menu' ? 'active' : ''}" data-type="menu">${U.icon('chef', 15)} قائمة الطعام <span class="count">${menu.length}</span></button>
            <button class="tab ${state.type === 'raw' ? 'active' : ''}" data-type="raw">${U.icon('box', 15)} المواد الخام <span class="count">${raw.length}</span></button>
          </div>
          <div class="toolbar">
            <div class="searchbox">${U.icon('search', 15)}<input class="input" data-search placeholder="ابحث بالاسم أو SKU أو الباركود..." value="${U.esc(state.q)}" /></div>
            <select class="select" data-category><option value="all">كل الفئات</option>${Store.data.categories.map((c) => `<option value="${c.id}" ${state.category === c.id ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select>
            <select class="select" data-status>
              <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل الحالات</option>
              <option value="active" ${state.status === 'active' ? 'selected' : ''}>نشط</option>
              <option value="low" ${state.status === 'low' ? 'selected' : ''}>منخفض</option>
              <option value="out" ${state.status === 'out' ? 'selected' : ''}>نفد / غير متوفر</option>
              <option value="inactive" ${state.status === 'inactive' ? 'selected' : ''}>موقوف</option>
            </select>
            <select class="select" data-sort>
              <option value="name" ${state.sort === 'name' ? 'selected' : ''}>ترتيب: الاسم</option>
              <option value="stock" ${state.sort === 'stock' ? 'selected' : ''}>الأقل مخزوناً</option>
              <option value="price" ${state.sort === 'price' ? 'selected' : ''}>الأعلى سعراً</option>
              <option value="margin" ${state.sort === 'margin' ? 'selected' : ''}>أعلى هامش</option>
              <option value="value" ${state.sort === 'value' ? 'selected' : ''}>أعلى قيمة مخزون</option>
            </select>
            <div class="toolbar-spacer"></div>
            <span class="text-muted text-xs">${U.num(filtered().length, 0)} نتيجة</span>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead id="products-head"></thead>
              <tbody id="products-body"></tbody>
            </table>
          </div>
          <div class="card-foot" id="products-foot"></div>
        </div>`;
      draw();

      view.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        state.type = b.dataset.type;
        state.status = 'all';
        Pages.products.render(view);
      }));
      view.querySelector('[data-new]').addEventListener('click', () => openForm());
      view.querySelector('[data-export]').addEventListener('click', exportList);
      view.querySelector('[data-print]').addEventListener('click', printList);
      view.querySelector('[data-search]').addEventListener('input', U.debounce((e) => { state.q = e.target.value; draw(); }, 120));
      view.querySelector('[data-category]').addEventListener('change', (e) => { state.category = e.target.value; draw(); });
      view.querySelector('[data-status]').addEventListener('change', (e) => { state.status = e.target.value; draw(); });
      view.querySelector('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; draw(); });
      view.querySelector('#products-body').addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) { openForm(edit.dataset.edit); return; }
        const recipe = e.target.closest('[data-recipe]');
        if (recipe) { openRecipe(recipe.dataset.recipe); return; }
        const more = e.target.closest('[data-more]');
        if (more) { App.openProductQuick(more.dataset.more); return; }
        const label = e.target.closest('[data-label]');
        if (label) { const p = Store.product(label.dataset.label); if (p) PK.barcodeLabel(p); return; }
        const toggle = e.target.closest('[data-toggle-available]');
        if (toggle) {
          const p = Store.product(toggle.dataset.toggleAvailable);
          if (!p) return;
          const nextAvailable = p.available === false;
          Store.update('products', p.id, { available: nextAvailable });
          Store.save();
          UI.toast(nextAvailable ? 'تم إظهار الصنف في القائمة' : 'تم إخفاء الصنف من القائمة', 'success');
          draw();
          return;
        }
        const del = e.target.closest('[data-del]');
        if (del) { removeProduct(del.dataset.del); return; }
        const adjust = e.target.closest('[data-adjust]');
        if (adjust) { App.navigate('#/inventory'); return; }
      });

      if (window.__editProduct) {
        const id = window.__editProduct;
        window.__editProduct = null;
        if (Store.product(id)) setTimeout(() => openForm(id), 120);
      }
    }
  };
  Pages.products.openRecipe = openRecipe;
})();
