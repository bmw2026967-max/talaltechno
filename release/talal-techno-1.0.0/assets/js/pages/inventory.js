/* ==========================================================================
   Page — Inventory: raw materials, recipes (BOM), waste and stock moves
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = {
    tab: 'stock', q: '', category: 'all', status: 'all', sort: 'stock',
    movesFrom: U.addDays(U.today(), -30), movesTo: U.today(), moveType: 'all', moveQ: '',
    adjQ: '', wasteQ: '', recipeQ: ''
  };
  let viewRef = null;

  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const MOVE_TYPES = {
    purchase: ['شراء', 'badge-blue', 'truck'],
    purchase_return: ['مرتجع شراء', 'badge-amber', 'upload'],
    sale_bom: ['صرف وصفة بيع', 'badge-green', 'chef'],
    sale_return_bom: ['استرجاع وصفة', 'badge-purple', 'refresh'],
    sale: ['بيع مباشر', 'badge-green', 'pos'],
    sale_return: ['مرتجع بيع', 'badge-purple', 'refresh'],
    adjustment: ['تسوية جرد', 'badge-gold', 'sliders'],
    waste: ['فاقد / هالك', 'badge-red', 'trash'],
    transfer: ['تحويل بين الفروع', 'badge-blue', 'truck'],
    opening: ['رصيد افتتاحي', 'badge-gray', 'archive']
  };

  function rawOptions(selected) {
    return Store.rawMaterials().sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((p) => `<option value="${p.id}" ${String(p.id) === String(selected) ? 'selected' : ''}>${U.esc(p.name)} — ${U.esc(p.sku)} (${U.num(p.stock, 2)} ${U.esc(p.unit || '')})</option>`).join('');
  }

  function filteredProducts() {
    let list = Store.rawMaterials().slice();
    const q = norm(state.q);
    if (q) list = list.filter((p) => norm(p.name).includes(q) || norm(p.sku).includes(q) || String(p.barcode || '').includes(q));
    if (state.category !== 'all') list = list.filter((p) => p.categoryId === state.category);
    if (state.status === 'low') list = list.filter((p) => p.stock > 0 && p.stock <= (p.reorderLevel || 10));
    else if (state.status === 'out') list = list.filter((p) => p.stock <= 0);
    else if (state.status === 'ok') list = list.filter((p) => p.stock > (p.reorderLevel || 10));
    else if (state.status === 'inactive') list = Store.data.products.filter((p) => p.type === 'raw' && p.active === false);
    if (state.sort === 'stock') list.sort((a, b) => a.stock - b.stock);
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (state.sort === 'value') list.sort((a, b) => b.stock * b.cost - a.stock * a.cost);
    else if (state.sort === 'reorder') list.sort((a, b) => (a.stock / (a.reorderLevel || 10)) - (b.stock / (b.reorderLevel || 10)));
    return list;
  }

  function recipes() {
    let list = Store.menuProducts().filter((p) => Store.recipeOf(p).length);
    const q = norm(state.recipeQ);
    if (q) list = list.filter((p) => norm(p.name).includes(q) || norm(p.sku).includes(q));
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }

  function stockBadge(p) {
    if (p.active === false) return '<span class="badge badge-gray">موقوف</span>';
    if (p.stock <= 0) return '<span class="badge badge-red">نفد</span>';
    if (p.stock <= (p.reorderLevel || 10)) return '<span class="badge badge-amber">منخفض</span>';
    return '<span class="badge badge-green">متوفر</span>';
  }

  function moves() {
    let list = Store.data.stockMoves.slice();
    if (state.moveType !== 'all') list = list.filter((m) => m.type === state.moveType);
    if (state.movesFrom) list = list.filter((m) => m.date >= state.movesFrom);
    if (state.movesTo) list = list.filter((m) => m.date <= state.movesTo);
    const q = norm(state.moveQ);
    if (q) list = list.filter((m) => {
      const p = Store.product(m.productId);
      return norm(p ? p.name : '').includes(q) || norm(p ? p.sku : '').includes(q)
        || norm(m.refNumber).includes(q) || norm(m.note).includes(q);
    });
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function adjustments() {
    let list = Store.data.adjustments.slice();
    const q = norm(state.adjQ);
    if (q) list = list.filter((a) => norm(a.productName).includes(q) || norm(a.number).includes(q) || norm(a.reason).includes(q));
    return list.sort((a, b) => String(b.createdAt || b.date).localeCompare(String(a.createdAt || a.date)));
  }

  function wasteList() {
    let list = Store.data.waste.slice();
    const q = norm(state.wasteQ);
    if (q) list = list.filter((w) => norm(w.productName).includes(q) || norm(w.number).includes(q) || norm(w.reason).includes(q));
    return list.sort((a, b) => String(b.at || b.date).localeCompare(String(a.at || a.date)));
  }

  /* ---------- Adjustment ---------- */
  function openAdjustment(productId) {
    if (!Store.rawMaterials().length) { UI.toast('أضف مادة خاماً أولاً', 'warning'); return; }
    const firstId = productId || (Store.rawMaterials()[0] || {}).id;
    const first = Store.product(firstId);
    const modal = UI.modal({
      size: 'md',
      title: 'تسوية جرد المخزون',
      subtitle: 'تُنشئ قيداً محاسبياً تلقائياً لفروقات الكمية',
      icon: 'sliders',
      body: `<div class="form-grid">
        <div class="field full"><label>المادة الخام <span class="req">*</span></label><select class="select" name="productId">${rawOptions(firstId)}</select></div>
        <div class="field full"><div class="info-banner success">${U.icon('box', 17)}<div>الكمية الحالية: <strong data-current>${U.num(first ? first.stock : 0, 2)} ${U.esc(first ? first.unit : '')}</strong> • التكلفة ${U.money(first ? first.cost : 0)}</div></div></div>
        <div class="field"><label>الكمية الفعلية بعد الجرد <span class="req">*</span></label><input class="input num" type="number" name="newQty" min="0" step="0.01" value="${first ? first.stock : 0}" /></div>
        <div class="field"><label>الفرق</label><input class="input num" data-diff value="0" disabled /></div>
        <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field"><label>سبب التسوية</label><select class="select" name="reason">
          <option>جرد دوري — فروقات كمية</option>
          <option>تلف أو كسر</option>
          <option>فقدان / سرقة</option>
          <option>خطأ في الإدخال</option>
          <option>إرجاع غير مسجل</option>
          <option>أخرى</option>
        </select></div>
        <div class="field full"><label>ملاحظات</label><input class="input" name="notes" placeholder="اختياري" /></div>
      </div>`,
      footer: `<span class="foot-info">سيُسجّل القيد في حساب فروقات الجرد 5108</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ التسوية</button>`,
      onMount(modalEl, close) {
        const sel = modalEl.querySelector('[name=productId]');
        const qty = modalEl.querySelector('[name=newQty]');
        const diff = modalEl.querySelector('[data-diff]');
        const current = modalEl.querySelector('[data-current]');
        const recalc = () => {
          const p = Store.product(sel.value);
          const d = U.round2(U.parseNum(qty.value) - (p ? p.stock : 0));
          diff.value = (d > 0 ? '+' : '') + U.num(d, 2);
          diff.style.color = d < 0 ? 'var(--danger)' : d > 0 ? 'var(--brand)' : '';
        };
        sel.addEventListener('change', () => {
          const p = Store.product(sel.value);
          if (p) {
            current.innerHTML = `الكمية الحالية: <strong>${U.num(p.stock, 2)} ${U.esc(p.unit || '')}</strong> • التكلفة ${U.money(p.cost)}`;
            qty.value = p.stock;
          }
          recalc();
        });
        qty.addEventListener('input', recalc);
        recalc();
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          try {
            const adj = Business.createAdjustment({
              productId: data.productId, newQty: U.parseNum(data.newQty),
              reason: data.reason, date: data.date
            });
            close();
            UI.toast(`تم حفظ تسوية المخزون ${adj.number}`, 'success');
            App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
    return modal;
  }

  /* ---------- Waste ---------- */
  function openWaste(productId) {
    const raw = Store.rawMaterials();
    if (!raw.length) { UI.toast('أضف مادة خاماً أولاً', 'warning'); return; }
    const firstId = productId || (raw[0] || {}).id;
    const first = Store.product(firstId);
    UI.modal({
      size: 'md', title: 'تسجيل فاقد / هالك', subtitle: 'يُخصم من المخزون ويُسجّل في حساب 5108', icon: 'trash',
      body: `<div class="form-grid">
        <div class="field full"><label>المادة الخام <span class="req">*</span></label><select class="select" name="productId">${rawOptions(firstId)}</select></div>
        <div class="field full"><div class="info-banner warn" data-waste-info>${U.icon('alert', 16)}<div>المخزون الحالي: <strong>${U.num(first ? first.stock : 0, 2)} ${U.esc(first ? first.unit || '' : '')}</strong> • تكلفة الوحدة ${U.money(first ? first.cost : 0)}</div></div></div>
        <div class="field"><label>الكمية التالفة <span class="req">*</span></label><input class="input num" name="qty" type="number" min="0.01" step="0.01" value="" placeholder="0" /></div>
        <div class="field"><label>قيمة الفاقد</label><input class="input num" data-waste-cost value="0.00 ر.س" disabled /></div>
        <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${U.today()}" /></div>
        <div class="field"><label>السبب</label><select class="select" name="reason">
          <option>تلف أثناء التخزين</option>
          <option>خطأ في التحضير</option>
          <option>انتهاء الصلاحية</option>
          <option>كسر / سقوط</option>
          <option>إرجاع من العميل</option>
          <option>أخرى</option>
        </select></div>
        <div class="field full"><label>ملاحظات</label><input class="input" name="notes" placeholder="اختياري" /></div>
      </div>`,
      footer: `<span class="foot-info">سيُسجّل قيد فاقد ويُخصم من قيمة المخزون</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-save>${U.icon('trash', 15)} تسجيل الفاقد</button>`,
      onMount(modalEl, close) {
        const sel = modalEl.querySelector('[name=productId]');
        const qty = modalEl.querySelector('[name=qty]');
        const costEl = modalEl.querySelector('[data-waste-cost]');
        const info = modalEl.querySelector('[data-waste-info]');
        const recalc = () => {
          const p = Store.product(sel.value);
          const q = Math.max(0, U.parseNum(qty.value));
          costEl.value = U.money(q * (p ? p.cost : 0));
        };
        sel.addEventListener('change', () => {
          const p = Store.product(sel.value);
          info.innerHTML = `${U.icon('alert', 16)}<div>المخزون الحالي: <strong>${U.num(p ? p.stock : 0, 2)} ${U.esc(p ? p.unit || '' : '')}</strong> • تكلفة الوحدة ${U.money(p ? p.cost : 0)}</div>`;
          recalc();
        });
        qty.addEventListener('input', recalc);
        modalEl.querySelector('[data-cancel]').addEventListener('click', close);
        modalEl.querySelector('[data-save]').addEventListener('click', () => {
          const data = UI.values(modalEl);
          try {
            const rec = Waste.create({
              productId: data.productId, qty: U.parseNum(data.qty),
              reason: data.reason, date: data.date, branchId: App.branchId
            });
            close();
            UI.toast(`تم تسجيل الفاقد ${rec.number} — ${U.money(rec.cost)}`, 'success');
            App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  /* ---------- Printing & export ---------- */
  function exportStock() {
    const list = filteredProducts();
    PK.exportCSV('raw-materials-' + U.today() + '.csv',
      ['SKU', 'المادة الخام', 'الفئة', 'الوحدة', 'المخزون', 'حد الطلب', 'التكلفة', 'القيمة الدفترية', 'الوصفات', 'الحالة'],
      list.map((p) => {
        const cat = Store.category(p.categoryId);
        return [p.sku, p.name, cat ? cat.name : '', p.unit || '', p.stock, p.reorderLevel || 0, p.cost,
          U.round2(p.stock * p.cost), recipeUses(p.id),
          p.active === false ? 'موقوف' : p.stock <= 0 ? 'نفد' : p.stock <= (p.reorderLevel || 10) ? 'منخفض' : 'متوفر'];
      }));
  }

  function printStock() {
    const list = filteredProducts();
    PK.printReport({
      title: 'تقرير المواد الخام والتقييم',
      subtitle: `${list.length} مادة • ${U.num(U.sum(list, (p) => p.stock), 0)} وحدة`,
      headers: ['SKU', 'المادة', 'المخزون', 'حد الطلب', 'التكلفة', 'قيمة التكلفة', 'الوصفات'],
      rows: list.map((p) => [U.esc(p.sku), U.esc(p.name), U.num(p.stock, 2), U.num(p.reorderLevel || 0, 0),
        U.money(p.cost), U.money(p.stock * p.cost), U.num(recipeUses(p.id), 0)]),
      totals: [
        { label: 'عدد المواد', value: U.num(list.length, 0) },
        { label: 'إجمالي قيمة التكلفة', value: U.money(U.sum(list, (p) => p.stock * p.cost)), grand: true }
      ]
    });
  }

  function printMoves() {
    const list = moves();
    PK.printReport({
      title: 'حركة المخزون',
      subtitle: `${U.formatDate(state.movesFrom)} — ${U.formatDate(state.movesTo)} • ${list.length} حركة`,
      headers: ['التاريخ', 'الصنف', 'نوع الحركة', 'الكمية', 'المستند', 'البيان'],
      rows: list.slice(0, 500).map((m) => {
        const p = Store.product(m.productId);
        return [U.formatDate(m.date), U.esc(p ? p.name : '—'), U.esc((MOVE_TYPES[m.type] || [m.type])[0]),
          (m.qty > 0 ? '+' : '') + U.num(m.qty, 2), U.esc(m.refNumber || '—'), U.esc(m.note || '')];
      })
    });
  }

  function exportMoves() {
    const list = moves();
    PK.exportCSV('stock-moves-' + U.today() + '.csv',
      ['التاريخ', 'الصنف', 'SKU', 'النوع', 'الكمية', 'المستند', 'البيان'],
      list.map((m) => {
        const p = Store.product(m.productId);
        return [m.date, p ? p.name : '', p ? p.sku : '', (MOVE_TYPES[m.type] || [m.type])[0], m.qty, m.refNumber || '', m.note || ''];
      }));
  }

  function recipeUses(materialId) {
    return Store.data.products.filter((p) => Store.recipeOf(p).some((l) => l.materialId === materialId)).length;
  }

  /* ---------- Draw sections ---------- */
  function stockTable() {
    const list = filteredProducts();
    const body = list.map((p) => {
      const cat = Store.category(p.categoryId);
      const ratio = (p.reorderLevel || 10) ? Math.min(100, (p.stock / (p.reorderLevel || 10)) * 100) : 100;
      return `<tr>
        <td><div class="product-cell"><div class="thumb">${p.emoji || '📦'}</div><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${U.esc(p.sku)} • <span class="mono">${U.esc(p.barcode || '—')}</span></div></div></div></td>
        <td>${cat ? `<span class="badge" style="background:${cat.color}18;color:${cat.color}">${U.esc(cat.name)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td style="min-width:120px"><div class="cell-main ${p.stock <= 0 ? 'text-danger' : p.stock <= (p.reorderLevel || 10) ? 'text-warning' : ''}">${U.num(p.stock, 2)} ${U.esc(p.unit || '')}</div>
          <div class="progress ${p.stock <= 0 ? 'danger' : p.stock <= (p.reorderLevel || 10) ? 'warn' : ''}" style="margin-top:5px;height:5px"><span style="width:${Math.max(3, ratio)}%"></span></div></td>
        <td class="num text-muted">${U.num(p.reorderLevel || 0, 0)}</td>
        <td class="num">${U.money(p.cost)}</td>
        <td class="num fw-800">${U.money(p.stock * p.cost)}</td>
        <td><span class="badge badge-gray">${U.icon('chef', 11)} ${U.num(recipeUses(p.id), 0)}</span></td>
        <td>${stockBadge(p)}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-adjust="${p.id}" title="تسوية جرد">${U.icon('sliders', 15)}</button>
          <button class="btn-icon btn-ghost" data-waste="${p.id}" title="تسجيل فاقد">${U.icon('trash', 15)}</button>
          <button class="btn-icon btn-ghost" data-view="${p.id}" title="تفاصيل الصنف">${U.icon('eye', 15)}</button>
          <button class="btn-icon btn-ghost" data-label="${p.id}" title="بطاقة الصنف">${U.icon('barcode', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(9, 'box', 'لا توجد مواد خام مطابقة', 'جرّب تغيير البحث أو الفلاتر');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>المادة الخام</th><th>الفئة</th><th>المخزون</th><th>حد الطلب</th><th>التكلفة</th><th>قيمة التكلفة</th><th>الوصفات</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">عرض <b>${list.length}</b> من ${Store.rawMaterials().length} مادة • ${U.num(U.sum(list, (p) => p.stock), 0)} وحدة</span>
        <span class="text-muted text-xs">قيمة التكلفة: <b class="text-success">${U.money(U.sum(list, (p) => p.stock * p.cost))}</b></span></div>`;
  }

  function recipesTable() {
    const list = recipes();
    const body = list.map((p) => {
      const cat = Store.category(p.categoryId);
      const cost = Store.costOf(p);
      const margin = p.price ? (p.price - cost) / p.price * 100 : 0;
      const available = Store.stockOf(p);
      const limited = Store.recipeOf(p).filter((l) => {
        const m = Store.product(l.materialId);
        return !m || m.stock < l.qty;
      }).length;
      return `<tr>
        <td><div class="product-cell"><div class="thumb">${p.emoji || '🍽️'}</div><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${U.esc(p.sku)} • ${U.num(Store.recipeOf(p).length, 0)} مكوّن</div></div></div></td>
        <td>${cat ? `<span class="badge" style="background:${cat.color}18;color:${cat.color}">${U.esc(cat.name)}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="num">${U.money(cost)}</td>
        <td class="num fw-800">${U.money(p.price)}</td>
        <td class="num ${margin < 15 ? 'text-warning' : 'text-success'}">${U.num(margin, 1)}%</td>
        <td class="num">${U.num(available, 0)} حصة</td>
        <td>${limited ? `<span class="badge badge-amber">${U.num(limited, 0)} مكوّن منخفض</span>` : '<span class="badge badge-green">جاهز</span>'}</td>
        <td class="actions-cell"><div class="row-actions">
          <button class="btn-icon btn-ghost" data-recipe="${p.id}" title="عرض الوصفة">${U.icon('eye', 15)}</button>
          <button class="btn-icon btn-ghost" data-edit-recipe="${p.id}" title="تعديل الصنف والوصفة">${U.icon('edit', 15)}</button>
        </div></td>
      </tr>`;
    }).join('') || PK.emptyRow(8, 'chef', 'لا توجد وصفات معرّفة', 'أضف مكونات من شاشة القائمة والوصفات');
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>الصنف</th><th>الفئة</th><th>تكلفة الوصفة</th><th>سعر البيع</th><th>الهامش</th><th>الحصص المتاحة</th><th>حالة المكونات</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(list.length, 0)} صنف بوصفة • تُحسب الحصص من أرصدة المواد الخام</span>
        <span class="text-muted text-xs">متوسط الهامش: <b>${U.num(list.length ? U.sum(list, (p) => p.price ? (p.price - Store.costOf(p)) / p.price * 100 : 0) / list.length : 0, 1)}%</b></span></div>`;
  }

  function movesTable() {
    const list = moves();
    const body = list.slice(0, 400).map((m) => {
      const p = Store.product(m.productId);
      const t = MOVE_TYPES[m.type] || [m.type, 'badge-gray', 'info'];
      return `<tr>
        <td class="nowrap"><div class="cell-main">${U.formatDate(m.date)}</div><div class="cell-sub">${U.formatTime(m.createdAt)}</div></td>
        <td><div class="product-cell"><div class="thumb sm">${p ? p.emoji || '📦' : '📦'}</div><div><div class="cell-main">${U.esc(p ? p.name : 'صنف محذوف')}</div><div class="cell-sub">${U.esc(p ? p.sku : '')}</div></div></div></td>
        <td><span class="badge ${t[1]}">${U.icon(t[2], 11)}${U.esc(t[0])}</span></td>
        <td class="num fw-800 ${m.qty < 0 ? 'text-danger' : 'text-success'}">${m.qty > 0 ? '+' : ''}${U.num(m.qty, 2)}</td>
        <td><span class="code">${U.esc(m.refNumber || '—')}</span></td>
        <td class="text-muted text-sm">${U.esc(m.note || '—')}</td>
      </tr>`;
    }).join('') || PK.emptyRow(6, 'refresh', 'لا توجد حركات في الفترة', 'غيّر الفترة أو نوع الحركة');
    return `<div class="table-wrap"><table class="table compact">
      <thead><tr><th>التاريخ</th><th>الصنف</th><th>نوع الحركة</th><th>الكمية</th><th>المستند</th><th>البيان</th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(list.length, 0)} حركة — تُعرض أحدث 400 حركة</span>
        <span class="text-muted text-xs">صافي الوارد/الصادر: <b class="${U.sum(list, (m) => m.qty) < 0 ? 'text-danger' : 'text-success'}">${U.num(U.sum(list, (m) => m.qty), 0)} وحدة</b></span></div>`;
  }

  function wasteTable() {
    const list = wasteList();
    const body = list.map((w) => `<tr>
      <td><span class="code">${U.esc(w.number)}</span></td>
      <td class="nowrap">${U.formatDate(w.date)}</td>
      <td><div class="cell-main">${U.esc(w.productName)}</div><div class="cell-sub">${U.esc(w.reason || '')}</div></td>
      <td class="num text-danger fw-800">-${U.num(w.qty, 2)}</td>
      <td class="num">${U.money(w.cost)}</td>
      <td class="actions-cell"><div class="row-actions">
        ${w.journalId ? `<button class="btn-icon btn-ghost" data-journal="${w.journalId}" title="القيد المحاسبي">${U.icon('book', 15)}</button>` : ''}
        <button class="btn-icon btn-ghost" data-view-product="${w.productId}" title="تفاصيل المادة">${U.icon('eye', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(6, 'trash', 'لا توجد سجلات فاقد', 'سجّل الهالك لخصم قيمته من المخزون والأرباح');
    const total = U.sum(list, (w) => w.cost);
    return `<div class="table-wrap"><table class="table compact">
      <thead><tr><th>المستند</th><th>التاريخ</th><th>المادة / السبب</th><th>الكمية</th><th>القيمة</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(list.length, 0)} سجل فاقد</span>
        <span class="text-muted text-xs">إجمالي قيمة الفاقد: <b class="text-danger">${U.money(total)}</b></span></div>`;
  }

  function adjustmentsTable() {
    const list = adjustments();
    const body = list.map((a) => `<tr>
      <td><span class="code">${U.esc(a.number)}</span></td>
      <td class="nowrap">${U.formatDate(a.date)}</td>
      <td><div class="cell-main">${U.esc(a.productName)}</div><div class="cell-sub">${U.esc(a.reason || '')}</div></td>
      <td class="num fw-800 ${a.delta < 0 ? 'text-danger' : 'text-success'}">${a.delta > 0 ? '+' : ''}${U.num(a.delta, 2)}</td>
      <td class="num">${U.num(a.newQty, 2)}</td>
      <td class="num">${U.money(a.cost)}</td>
      <td class="actions-cell"><div class="row-actions">
        ${a.journalId ? `<button class="btn-icon btn-ghost" data-journal="${a.journalId}" title="القيد المحاسبي">${U.icon('book', 15)}</button>` : ''}
        <button class="btn-icon btn-ghost" data-view-product="${a.productId}" title="تفاصيل الصنف">${U.icon('eye', 15)}</button>
      </div></td>
    </tr>`).join('') || PK.emptyRow(7, 'sliders', 'لا توجد تسويات جرد', 'أنشئ تسوية لمطابقة الكميات الفعلية');
    return `<div class="table-wrap"><table class="table compact">
      <thead><tr><th>المستند</th><th>التاريخ</th><th>الصنف / السبب</th><th>الفرق</th><th>الكمية بعد التسوية</th><th>قيمة الفرق</th><th></th></tr></thead>
      <tbody>${body}</tbody></table></div>
      <div class="card-foot"><span class="text-muted text-xs">${U.num(list.length, 0)} تسوية مسجلة</span>
        <span class="text-muted text-xs">صافي فروقات الجرد: <b class="${U.sum(list, (a) => a.delta) < 0 ? 'text-danger' : 'text-success'}">${U.num(U.sum(list, (a) => a.delta), 2)} وحدة</b></span></div>`;
  }

  Pages.inventory = {
    title: 'المخزون والمواد الخام', icon: 'box', perm: 'inventory',
    render(view) {
      viewRef = view;
      const inv = Accounting.inventoryValuation();
      const raw = Store.rawMaterials();
      const menu = Store.menuProducts();
      const movesList = Store.data.stockMoves;
      const adjList = Store.data.adjustments;
      const waste = Store.data.waste;
      const low = raw.filter((p) => p.stock > 0 && p.stock <= (p.reorderLevel || 10));
      const out = raw.filter((p) => p.stock <= 0);
      const unavailableMenu = menu.filter((p) => !Store.availableOf(p));
      const monthWaste = Waste.stats(U.startOfMonth(U.today()), U.today());

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">المخزون والمواد الخام</div><div class="page-sub">أرصدة المواد الخام، وصفات القائمة، الفاقد، وحركات المخزون — ${raw.length} مادة</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير</button>
            <button class="btn btn-secondary btn-sm" data-print>${U.icon('print', 14)} طباعة</button>
            <button class="btn btn-secondary btn-sm" data-waste-new>${U.icon('trash', 14)} تسجيل فاقد</button>
            <button class="btn btn-primary" data-adjust-new>${U.icon('sliders', 16)} تسوية جرد</button>
          </div>
        </div>
        <div class="kpi-grid">
          ${PK.kpi({ label: 'قيمة المواد الخام', value: U.money(inv.costValue), icon: 'box', tone: 'green', sub: `<b>${U.num(inv.units, 0)}</b> وحدة في ${raw.length} مادة` })}
          ${PK.kpi({ label: 'مواد تحت حد الطلب', value: U.num(low.length + out.length, 0), icon: 'alert', tone: low.length + out.length ? 'red' : 'green', sub: `<b>${out.length}</b> نفد • <b>${low.length}</b> منخفض` })}
          ${PK.kpi({ label: 'فاقد الشهر', value: U.money(monthWaste.cost), icon: 'trash', tone: monthWaste.cost ? 'gold' : 'green', sub: `<b>${U.num(monthWaste.count, 0)}</b> سجل فاقد هذا الشهر` })}
          ${PK.kpi({ label: 'أصناف غير متاحة', value: U.num(unavailableMenu.length, 0), icon: 'chef', tone: unavailableMenu.length ? 'red' : 'green', sub: `من ${menu.length} صنف في القائمة` })}
        </div>
        <div class="card mt-3">
          <div class="tabs">
            <button class="tab ${state.tab === 'stock' ? 'active' : ''}" data-tab="stock">${U.icon('box', 15)} أرصدة المواد <span class="count">${raw.length}</span></button>
            <button class="tab ${state.tab === 'recipes' ? 'active' : ''}" data-tab="recipes">${U.icon('chef', 15)} الوصفات والحصص <span class="count">${menu.filter((p) => Store.recipeOf(p).length).length}</span></button>
            <button class="tab ${state.tab === 'moves' ? 'active' : ''}" data-tab="moves">${U.icon('refresh', 15)} الحركات <span class="count">${movesList.length}</span></button>
            <button class="tab ${state.tab === 'waste' ? 'active' : ''}" data-tab="waste">${U.icon('trash', 15)} الفاقد <span class="count">${waste.length}</span></button>
            <button class="tab ${state.tab === 'adjustments' ? 'active' : ''}" data-tab="adjustments">${U.icon('sliders', 15)} التسويات <span class="count">${adjList.length}</span></button>
          </div>
          ${state.tab === 'stock' ? `
            <div class="info-banner success" style="margin:10px 12px 0">${U.icon('info', 16)}<div>أصناف القائمة لا تحمل مخزوناً مباشراً؛ يُحسب المتاح منها من أرصدة المواد الخام عبر الوصفات. عدّل الأرصدة بالمشتريات أو تسوية الجرد أو الفاقد.</div></div>
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-q placeholder="ابحث بالاسم أو SKU أو الباركود..." value="${U.esc(state.q)}" /></div>
              <select class="select" data-category><option value="all">كل الفئات</option>${Store.data.categories.map((c) => `<option value="${c.id}" ${state.category === c.id ? 'selected' : ''}>${U.esc(c.name)}</option>`).join('')}</select>
              <select class="select" data-status>
                <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل الحالات</option>
                <option value="ok" ${state.status === 'ok' ? 'selected' : ''}>متوفر</option>
                <option value="low" ${state.status === 'low' ? 'selected' : ''}>منخفض</option>
                <option value="out" ${state.status === 'out' ? 'selected' : ''}>نفد</option>
                <option value="inactive" ${state.status === 'inactive' ? 'selected' : ''}>موقوف</option>
              </select>
              <select class="select" data-sort>
                <option value="stock" ${state.sort === 'stock' ? 'selected' : ''}>الأقل مخزوناً</option>
                <option value="name" ${state.sort === 'name' ? 'selected' : ''}>الاسم</option>
                <option value="value" ${state.sort === 'value' ? 'selected' : ''}>أعلى قيمة</option>
                <option value="reorder" ${state.sort === 'reorder' ? 'selected' : ''}>الأقرب لحد الطلب</option>
              </select>
              <div class="toolbar-spacer"></div>
              <span class="text-muted text-xs" data-count>${U.num(filteredProducts().length, 0)} نتيجة</span>
            </div>
            <div id="inventory-list">${stockTable()}</div>` : ''}
          ${state.tab === 'recipes' ? `
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-recipe-q placeholder="ابحث باسم الصنف أو SKU..." value="${U.esc(state.recipeQ)}" /></div>
              <div class="toolbar-spacer"></div>
              <button class="btn btn-secondary btn-sm" data-go-products>${U.icon('chef', 14)} إدارة القائمة والوصفات</button>
            </div>
            <div id="inventory-recipes">${recipesTable()}</div>` : ''}
          ${state.tab === 'moves' ? `
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-move-q placeholder="ابحث بالصنف أو رقم المستند..." value="${U.esc(state.moveQ)}" /></div>
              <select class="select" data-move-type>
                <option value="all" ${state.moveType === 'all' ? 'selected' : ''}>كل الحركات</option>
                ${Object.keys(MOVE_TYPES).map((k) => `<option value="${k}" ${state.moveType === k ? 'selected' : ''}>${U.esc(MOVE_TYPES[k][0])}</option>`).join('')}
              </select>
              <input class="input" type="date" data-move-from value="${state.movesFrom}" />
              <span class="text-muted text-xs">إلى</span>
              <input class="input" type="date" data-move-to value="${state.movesTo}" />
              <button class="btn btn-secondary btn-sm" data-move-apply>${U.icon('refresh', 14)} تحديث</button>
              <div class="toolbar-spacer"></div>
              <span class="text-muted text-xs">${U.num(moves().length, 0)} حركة</span>
            </div>
            <div id="inventory-moves">${movesTable()}</div>` : ''}
          ${state.tab === 'waste' ? `
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-waste-q placeholder="ابحث برقم المستند أو المادة..." value="${U.esc(state.wasteQ)}" /></div>
              <div class="toolbar-spacer"></div>
              <button class="btn btn-secondary btn-sm" data-waste-export>${U.icon('download', 14)} تصدير</button>
              <button class="btn btn-primary btn-sm" data-waste-new>${U.icon('plus', 14)} تسجيل فاقد</button>
            </div>
            <div id="inventory-waste">${wasteTable()}</div>` : ''}
          ${state.tab === 'adjustments' ? `
            <div class="toolbar">
              <div class="searchbox">${U.icon('search', 15)}<input class="input" data-adj-q placeholder="ابحث برقم التسوية أو الصنف..." value="${U.esc(state.adjQ)}" /></div>
              <div class="toolbar-spacer"></div>
              <button class="btn btn-secondary btn-sm" data-adj-export>${U.icon('download', 14)} تصدير</button>
              <button class="btn btn-primary btn-sm" data-adjust-new>${U.icon('plus', 14)} تسوية جديدة</button>
            </div>
            <div id="inventory-adjustments">${adjustmentsTable()}</div>` : ''}
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; Pages.inventory.render(view); }));

      const q = view.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => {
        state.q = q.value;
        const box = view.querySelector('#inventory-list');
        if (box) box.innerHTML = stockTable();
        const c = view.querySelector('[data-count]');
        if (c) c.textContent = `${U.num(filteredProducts().length, 0)} نتيجة`;
      }, 120));
      const cat = view.querySelector('[data-category]');
      if (cat) cat.addEventListener('change', () => { state.category = cat.value; const box = view.querySelector('#inventory-list'); if (box) box.innerHTML = stockTable(); });
      const st = view.querySelector('[data-status]');
      if (st) st.addEventListener('change', () => { state.status = st.value; const box = view.querySelector('#inventory-list'); if (box) box.innerHTML = stockTable(); });
      const sort = view.querySelector('[data-sort]');
      if (sort) sort.addEventListener('change', () => { state.sort = sort.value; const box = view.querySelector('#inventory-list'); if (box) box.innerHTML = stockTable(); });

      const rq = view.querySelector('[data-recipe-q]');
      if (rq) rq.addEventListener('input', U.debounce(() => { state.recipeQ = rq.value; const box = view.querySelector('#inventory-recipes'); if (box) box.innerHTML = recipesTable(); }, 120));
      const gp = view.querySelector('[data-go-products]');
      if (gp) gp.addEventListener('click', () => App.navigate('#/products'));

      const mq = view.querySelector('[data-move-q]');
      if (mq) mq.addEventListener('input', U.debounce(() => { state.moveQ = mq.value; const box = view.querySelector('#inventory-moves'); if (box) box.innerHTML = movesTable(); }, 120));
      const mt = view.querySelector('[data-move-type]');
      if (mt) mt.addEventListener('change', () => { state.moveType = mt.value; const box = view.querySelector('#inventory-moves'); if (box) box.innerHTML = movesTable(); });
      const mf = view.querySelector('[data-move-from]');
      const mto = view.querySelector('[data-move-to]');
      const applyMoves = () => {
        state.movesFrom = mf.value; state.movesTo = mto.value;
        const box = view.querySelector('#inventory-moves'); if (box) box.innerHTML = movesTable();
      };
      if (mf) mf.addEventListener('change', applyMoves);
      if (mto) mto.addEventListener('change', applyMoves);
      const ma = view.querySelector('[data-move-apply]');
      if (ma) ma.addEventListener('click', applyMoves);

      const wq = view.querySelector('[data-waste-q]');
      if (wq) wq.addEventListener('input', U.debounce(() => { state.wasteQ = wq.value; const box = view.querySelector('#inventory-waste'); if (box) box.innerHTML = wasteTable(); }, 120));
      const aq = view.querySelector('[data-adj-q]');
      if (aq) aq.addEventListener('input', U.debounce(() => { state.adjQ = aq.value; const box = view.querySelector('#inventory-adjustments'); if (box) box.innerHTML = adjustmentsTable(); }, 120));

      view.querySelectorAll('[data-adjust-new]').forEach((b) => b.addEventListener('click', () => openAdjustment()));
      view.querySelectorAll('[data-waste-new]').forEach((b) => b.addEventListener('click', () => openWaste()));
      const exp = view.querySelector('[data-export]');
      if (exp) exp.addEventListener('click', () => {
        if (state.tab === 'moves') exportMoves();
        else if (state.tab === 'adjustments') {
          const list = adjustments();
          PK.exportCSV('adjustments-' + U.today() + '.csv', ['المستند', 'التاريخ', 'الصنف', 'الفرق', 'الكمية بعد التسوية', 'قيمة الفرق', 'السبب'],
            list.map((a) => [a.number, a.date, a.productName, a.delta, a.newQty, a.cost, a.reason]));
        } else if (state.tab === 'waste') {
          const list = wasteList();
          PK.exportCSV('waste-' + U.today() + '.csv', ['المستند', 'التاريخ', 'المادة', 'الكمية', 'القيمة', 'السبب'],
            list.map((w) => [w.number, w.date, w.productName, w.qty, w.cost, w.reason]));
        } else if (state.tab === 'recipes') {
          const list = recipes();
          PK.exportCSV('recipes-' + U.today() + '.csv', ['SKU', 'الصنف', 'المكونات', 'تكلفة الوصفة', 'السعر', 'الهامش %', 'الحصص'],
            list.map((p) => [p.sku, p.name, Store.recipeOf(p).length, Store.costOf(p), p.price, U.round2(p.price ? (p.price - Store.costOf(p)) / p.price * 100 : 0), Store.stockOf(p)]));
        } else exportStock();
      });
      const pr = view.querySelector('[data-print]');
      if (pr) pr.addEventListener('click', () => { if (state.tab === 'moves') printMoves(); else printStock(); });
      const ae = view.querySelector('[data-adj-export]');
      if (ae) ae.addEventListener('click', () => {
        const list = adjustments();
        PK.exportCSV('adjustments-' + U.today() + '.csv', ['المستند', 'التاريخ', 'الصنف', 'الفرق', 'الكمية بعد التسوية', 'قيمة الفرق', 'السبب'],
          list.map((a) => [a.number, a.date, a.productName, a.delta, a.newQty, a.cost, a.reason]));
      });
      const we = view.querySelector('[data-waste-export]');
      if (we) we.addEventListener('click', () => {
        const list = wasteList();
        PK.exportCSV('waste-' + U.today() + '.csv', ['المستند', 'التاريخ', 'المادة', 'الكمية', 'القيمة', 'السبب'],
          list.map((w) => [w.number, w.date, w.productName, w.qty, w.cost, w.reason]));
      });

      view.onclick = (e) => {
        const adj = e.target.closest('[data-adjust]');
        if (adj) { openAdjustment(adj.dataset.adjust); return; }
        const waste = e.target.closest('[data-waste]');
        if (waste) { openWaste(waste.dataset.waste); return; }
        const rec = e.target.closest('[data-recipe]');
        if (rec) { if (Pages.products.openRecipe) Pages.products.openRecipe(rec.dataset.recipe); return; }
        const er = e.target.closest('[data-edit-recipe]');
        if (er) { window.__editProduct = er.dataset.editRecipe; App.navigate('#/products'); return; }
        const vp = e.target.closest('[data-view], [data-view-product]');
        if (vp) { App.openProductQuick(vp.dataset.view || vp.dataset.viewProduct); return; }
        const lab = e.target.closest('[data-label]');
        if (lab) { const p = Store.product(lab.dataset.label); if (p) PK.barcodeLabel(p); return; }
        const j = e.target.closest('[data-journal]');
        if (j) { Actions.openJournal(j.dataset.journal); return; }
      };
    }
  };
})();
