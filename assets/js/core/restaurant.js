/* ==========================================================================
   طلال تكنو — Restaurant domain: tables, open checks, KDS orders, BOM,
   shifts, loyalty, waste and delivery intake.
   ========================================================================== */
(function () {
  'use strict';
  const round2 = U.round2;
  const today = () => U.today();
  const settings = () => Store.data.settings;
  const Orders = window.Orders = {};
  const Tables = window.Tables = {};
  const Shifts = window.Shifts = {};
  const Loyalty = window.Loyalty = {};
  const Waste = window.Waste = {};
  const BOM = window.BOM = {};

  const ORDER_TYPES = {
    dine_in: { label: 'محلي', icon: 'home', short: 'محلي' },
    takeaway: { label: 'سفري', icon: 'bag', short: 'سفري' },
    delivery: { label: 'توصيل', icon: 'truck', short: 'توصيل' },
    curbside: { label: 'استلام سيارة', icon: 'car', short: 'سيارة' }
  };
  const ORDER_STATUS = {
    open: { label: 'مفتوح', color: 'gray' },
    new: { label: 'جديد', color: 'blue' },
    preparing: { label: 'قيد التحضير', color: 'amber' },
    ready: { label: 'جاهز', color: 'green' },
    served: { label: 'تم التقديم', color: 'purple' },
    completed: { label: 'مكتمل', color: 'green' },
    cancelled: { label: 'ملغي', color: 'red' }
  };
  const STATIONS = {
    grill: { label: 'الشواية', icon: 'flame', color: '#b13a33' },
    fryer: { label: 'المقليات', icon: 'fry', color: '#a97c28' },
    cold: { label: 'البارد', icon: 'cold', color: '#2563a8' },
    drinks: { label: 'المشروبات', icon: 'cup', color: '#0f766e' },
    dessert: { label: 'الحلويات', icon: 'cake', color: '#6d4fa3' },
    pass: { label: 'التقديم', icon: 'bell', color: '#0e5a44' }
  };
  Orders.TYPES = ORDER_TYPES;
  Orders.STATUS = ORDER_STATUS;
  Orders.STATIONS = STATIONS;
  Orders.typeLabel = (t) => (ORDER_TYPES[t] || {}).label || t;
  Orders.statusLabel = (s) => (ORDER_STATUS[s] || {}).label || s;

  function productLine(it) {
    const p = Store.product(it.productId);
    if (!p) throw new Error('صنف غير موجود في القائمة.');
    const qty = round2(it.qty);
    if (!(qty > 0)) throw new Error('الكمية غير صحيحة.');
    const price = round2(it.price !== undefined && it.price !== null && it.price !== '' ? it.price : p.price);
    const rate = it.taxRate !== undefined ? Number(it.taxRate) : Number(p.taxRate !== undefined ? p.taxRate : settings().vatRate);
    return {
      productId: p.id, name: p.name, sku: p.sku, emoji: p.emoji || '🍽️',
      qty, price, discount: round2(it.discount || 0), taxRate: rate || 0,
      station: it.station || p.station || 'pass', notes: it.notes || '',
      cost: Store.costOf(p), categoryId: p.categoryId
    };
  }

  function calcTotals(items, opts) {
    const o = opts || {};
    const orderType = o.orderType || o.type;
    const subtotal = round2(U.sum(items, (i) => i.qty * i.price - (Number(i.discount) || 0)));
    const discount = round2(U.clamp(Number(o.discount) || 0, 0, subtotal));
    const serviceCharge = orderType === 'dine_in' && Number(settings().serviceChargeRate) > 0
      ? round2(subtotal * Number(settings().serviceChargeRate) / 100) : 0;
    const deliveryFee = orderType === 'delivery'
      ? round2(o.deliveryFee !== undefined ? o.deliveryFee : Number(settings().deliveryFee) || 0) : 0;
    let tax = 0;
    items.forEach((it) => {
      const share = subtotal ? ((it.qty * it.price - (Number(it.discount) || 0)) / subtotal) : 0;
      const taxable = round2((it.qty * it.price - (Number(it.discount) || 0)) - discount * share);
      tax += round2(taxable * (Number(it.taxRate) || 0) / 100);
    });
    const extra = round2(serviceCharge + deliveryFee);
    if (extra > 0) tax += round2(extra * (Number(settings().vatRate) || 0) / 100);
    tax = round2(tax);
    const total = round2(subtotal - discount + serviceCharge + deliveryFee + tax);
    return { subtotal, discount, serviceCharge, deliveryFee, tax, total };
  }
  Orders.calcTotals = calcTotals;

  function normalizeItems(items) {
    return (items || []).map(productLine).filter((i) => i.qty > 0);
  }
  Orders.normalizeItems = normalizeItems;

  /* ------------------------------------------------------------------
     BOM — recipe consumption & availability
     ------------------------------------------------------------------ */
  BOM.requirements = function (items) {
    const needs = {};
    (items || []).forEach((it) => {
      const p = Store.product(it.productId);
      if (!p) return;
      const recipe = Store.recipeOf(p);
      if (p.type === 'menu' && recipe.length) {
        recipe.forEach((line) => {
          const m = Store.product(line.materialId);
          if (!m) return;
          needs[m.id] = needs[m.id] || { product: m, qty: 0 };
          needs[m.id].qty = round2(needs[m.id].qty + (Number(line.qty) || 0) * (Number(it.qty) || 0));
        });
      } else {
        needs[p.id] = needs[p.id] || { product: p, qty: 0 };
        needs[p.id].qty = round2(needs[p.id].qty + (Number(it.qty) || 0));
      }
    });
    return Object.keys(needs).map((id) => needs[id]);
  };

  BOM.check = function (items) {
    if (settings().allowNegativeStock) return true;
    const shortages = BOM.requirements(items).filter((n) => (Number(n.product.stock) || 0) + 0.001 < n.qty);
    if (shortages.length) {
      const first = shortages[0];
      throw new Error(`الكمية المتاحة من «${first.product.name}» لا تكفي — المتاح ${U.num(first.product.stock, 2)} ${first.product.unit || ''} والمطلوب ${U.num(first.qty, 2)}.`);
    }
    return true;
  };

  BOM.consume = function (items, ref, date, createdAt) {
    const d = date || today();
    const at = createdAt || new Date().toISOString();
    const needs = BOM.requirements(items);
    needs.forEach((n) => {
      const m = n.product;
      m.stock = round2((Number(m.stock) || 0) - n.qty);
      Store.data.stockMoves.push({
        id: U.uid('sm'), date: d, productId: m.id, qty: -n.qty, type: 'sale_bom',
        refId: ref ? ref.id : null, refNumber: ref ? ref.number : '', note: ref ? `استهلاك وصفة — ${ref.number}` : 'استهلاك وصفة',
        createdAt: at
      });
    });
    return round2(U.sum(items, (it) => Store.costOf(Store.product(it.productId)) * it.qty));
  };

  BOM.restore = function (items, ref, date, createdAt) {
    const d = date || today();
    const at = createdAt || new Date().toISOString();
    BOM.requirements(items).forEach((n) => {
      const m = n.product;
      m.stock = round2((Number(m.stock) || 0) + n.qty);
      Store.data.stockMoves.push({
        id: U.uid('sm'), date: d, productId: m.id, qty: n.qty, type: 'sale_return_bom',
        refId: ref ? ref.id : null, refNumber: ref ? ref.number : '', note: ref ? `إرجاع وصفة — ${ref.number}` : 'إرجاع وصفة',
        createdAt: at
      });
    });
  };

  /* ------------------------------------------------------------------
     Orders & tables
     ------------------------------------------------------------------ */
  Orders.nextNumber = function () { return Store.nextNumber('order'); };

  Orders.create = function (opts) {
    const o = opts || {};
    const items = normalizeItems(o.items);
    if (!items.length) throw new Error('أضف صنفاً واحداً على الأقل.');
    const totals = calcTotals(items, o);
    const table = o.tableId ? Store.table(o.tableId) : null;
    const type = o.type || settings().defaultOrderType || 'dine_in';
    if (type === 'dine_in' && !table && !o.allowNoTable) throw new Error('اختر طاولة للطلب المحلي.');
    const number = o.number || Orders.nextNumber();
    const now = new Date().toISOString();
    const order = {
      id: U.uid('ord'), number, type,
      status: o.status || (o.sendToKitchen ? 'new' : 'open'),
      tableId: table ? table.id : null,
      tableName: table ? table.name : '',
      branchId: o.branchId || (Store.data.branches[0] || {}).id || null,
      customerId: o.customerId || null,
      customerName: o.customerName || (o.customerId && Store.customer(o.customerId) ? Store.customer(o.customerId).name : 'عميل نقدي'),
      customerPhone: o.customerPhone || '',
      waiterId: o.waiterId || (Store.currentUser ? Store.currentUser.id : null),
      waiterName: o.waiterName || (Store.currentUser ? Store.currentUser.name : ''),
      platform: o.platform || null,
      platformName: o.platform ? ((settings().delivery.platforms.find((p) => p.id === o.platform) || {}).name || o.platform) : null,
      externalOrderId: o.externalOrderId || null,
      source: o.source || 'pos',
      items, subtotal: totals.subtotal, discount: totals.discount,
      serviceCharge: totals.serviceCharge, deliveryFee: totals.deliveryFee,
      tax: totals.tax, total: totals.total,
      notes: o.notes || '',
      createdAt: o.createdAt || now,
      sentAt: o.sendToKitchen || ['new', 'preparing', 'ready'].includes(o.status) ? (o.createdAt || now) : null,
      acceptedAt: null, readyAt: null, servedAt: null,
      invoiceId: null,
      etaMinutes: Number(o.etaMinutes) || 20
    };
    Store.data.orders.unshift(order);
    if (table) {
      table.status = 'occupied';
      table.currentOrderId = order.id;
      table.occupiedAt = order.createdAt;
    }
    Store.audit('طلب جديد', `${number} — ${Orders.typeLabel(type)}${table ? ' — ' + table.name : ''} — ${U.money(totals.total)}`, 'receipt');
    Store.save();
    return order;
  };

  Orders.openForTable = function (tableId) {
    return Store.data.orders.find((o) => o.tableId === tableId && ['open', 'new', 'preparing', 'ready', 'served'].includes(o.status)) || null;
  };

  Orders.active = function () {
    return Store.data.orders.filter((o) => ['open', 'new', 'preparing', 'ready', 'served'].includes(o.status));
  };

  Orders.addItems = function (orderId, items, opts) {
    const order = Store.order(orderId);
    if (!order) throw new Error('الطلب غير موجود.');
    const lines = normalizeItems(items);
    if (!lines.length) return order;
    order.items = order.items.concat(lines);
    const totals = calcTotals(order.items, order);
    Object.assign(order, {
      subtotal: totals.subtotal, discount: totals.discount, serviceCharge: totals.serviceCharge,
      deliveryFee: totals.deliveryFee, tax: totals.tax, total: totals.total
    });
    if (opts && opts.sendToKitchen) {
      order.status = 'new';
      order.sentAt = new Date().toISOString();
    }
    Store.save();
    return order;
  };

  Orders.setStatus = function (orderId, status) {
    const order = Store.order(orderId);
    if (!order) throw new Error('الطلب غير موجود.');
    const now = new Date().toISOString();
    order.status = status;
    if (status === 'preparing') order.acceptedAt = order.acceptedAt || now;
    if (status === 'ready') order.readyAt = now;
    if (status === 'served') order.servedAt = now;
    if (status === 'completed') order.completedAt = now;
    if (status === 'cancelled') {
      order.cancelledAt = now;
      Orders.freeTable(order);
    }
    if (status === 'completed') Orders.freeTable(order);
    Store.audit('تحديث حالة طلب', `${order.number} — ${Orders.statusLabel(status)}`, 'chef');
    Store.save();
    return order;
  };

  Orders.freeTable = function (order) {
    if (!order || !order.tableId) return;
    const table = Store.table(order.tableId);
    if (!table) return;
    const other = Store.data.orders.find((o) => o.id !== order.id && o.tableId === table.id && ['open', 'new', 'preparing', 'ready', 'served'].includes(o.status));
    if (!other) {
      table.status = 'free';
      table.currentOrderId = null;
      table.occupiedAt = null;
    } else {
      table.currentOrderId = other.id;
      table.status = 'occupied';
    }
  };

  Orders.sendToKitchen = function (orderId) {
    return Orders.setStatus(orderId, 'new');
  };

  Orders.closeWithInvoice = function (orderId, invoice) {
    const order = Store.order(orderId);
    if (!order) return null;
    order.status = 'completed';
    order.invoiceId = invoice.id;
    order.invoiceNumber = invoice.number;
    order.completedAt = new Date().toISOString();
    Orders.freeTable(order);
    Store.save();
    return order;
  };

  Orders.transfer = function (orderId, toTableId) {
    const order = Store.order(orderId);
    const to = Store.table(toTableId);
    if (!order || !to) throw new Error('تعذر نقل الطلب.');
    if (to.currentOrderId && to.currentOrderId !== order.id) throw new Error('الطاولة الهدف مشغولة.');
    const from = order.tableId ? Store.table(order.tableId) : null;
    if (from && from.id !== to.id) {
      from.status = 'free';
      from.currentOrderId = null;
      from.occupiedAt = null;
    }
    order.tableId = to.id;
    order.tableName = to.name;
    to.status = 'occupied';
    to.currentOrderId = order.id;
    to.occupiedAt = to.occupiedAt || order.createdAt;
    Store.audit('نقل طلب', `${order.number} — إلى ${to.name}`, 'refresh');
    Store.save();
    return order;
  };

  Orders.split = function (orderId, itemIndexes) {
    const order = Store.order(orderId);
    if (!order) throw new Error('الطلب غير موجود.');
    const indexes = Array.from(new Set(itemIndexes || [])).sort((a, b) => a - b);
    if (!indexes.length) throw new Error('اختر صنفاً واحداً على الأقل للتقسيم.');
    if (indexes.length >= order.items.length) throw new Error('لا يمكن تقسيم الطلب بالكامل — أبقِ صنفاً واحداً على الأقل.');
    const moved = indexes.map((i) => order.items[i]).filter(Boolean);
    order.items = order.items.filter((_, i) => !indexes.includes(i));
    const newOrder = Orders.create({
      type: order.type, tableId: order.tableId, items: moved, customerId: order.customerId,
      notes: `تقسيم من ${order.number}`, source: 'split', status: order.status === 'open' ? 'open' : 'new',
      branchId: order.branchId, createdAt: new Date().toISOString()
    });
    const totals = calcTotals(order.items, order);
    Object.assign(order, {
      subtotal: totals.subtotal, discount: totals.discount, serviceCharge: totals.serviceCharge,
      deliveryFee: totals.deliveryFee, tax: totals.tax, total: totals.total
    });
    Store.audit('تقسيم فاتورة', `${order.number} — طلب جديد ${newOrder.number}`, 'copy');
    Store.save();
    return { original: order, split: newOrder };
  };

  Orders.cancel = function (orderId, reason) {
    const order = Store.order(orderId);
    if (!order) throw new Error('الطلب غير موجود.');
    order.status = 'cancelled';
    order.cancelReason = reason || '';
    order.cancelledAt = new Date().toISOString();
    Orders.freeTable(order);
    Store.audit('إلغاء طلب', `${order.number} — ${reason || 'بدون سبب'}`, 'x');
    Store.save();
    return order;
  };

  Orders.fromEmenu = function (payload) {
    const table = payload.tableId ? Store.table(payload.tableId) : null;
    const order = Orders.create({
      type: payload.type || 'dine_in', tableId: table ? table.id : null, allowNoTable: true,
      items: payload.items, customerName: payload.customerName || 'عميل القائمة', customerPhone: payload.customerPhone || '',
      notes: payload.notes || '', source: 'emenu', status: 'new', sendToKitchen: true,
      branchId: payload.branchId
    });
    order.emenu = true;
    Store.save();
    return order;
  };

  Orders.stats = function (from, to) {
    const list = Store.data.orders.filter((o) => U.inRange(String(o.createdAt || '').slice(0, 10), from, to));
    const active = list.filter((o) => ['open', 'new', 'preparing', 'ready', 'served'].includes(o.status));
    const completed = list.filter((o) => o.status === 'completed');
    const byType = {};
    list.forEach((o) => { byType[o.type] = (byType[o.type] || 0) + 1; });
    return {
      count: list.length, active: active.length, completed: completed.length,
      total: round2(U.sum(completed, (o) => o.total)), byType
    };
  };

  Tables.all = function (branchId) {
    return Store.data.tables.filter((t) => !branchId || t.branchId === branchId)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar', { numeric: true }));
  };
  Tables.status = function (table) {
    if (!table) return 'free';
    const order = table.currentOrderId ? Store.order(table.currentOrderId) : null;
    if (order && ['open', 'new', 'preparing', 'ready', 'served'].includes(order.status)) return 'occupied';
    if (table.status === 'reserved') return 'reserved';
    return 'free';
  };
  Tables.openOrder = function (tableId) { return Orders.openForTable(tableId); };
  Tables.free = function (tableId) {
    const t = Store.table(tableId);
    if (t) { t.status = 'free'; t.currentOrderId = null; t.occupiedAt = null; Store.save(); }
  };
  Tables.reserve = function (tableId, name, phone, at) {
    const t = Store.table(tableId);
    if (!t) return null;
    t.status = 'reserved'; t.reservation = { name, phone, at: at || new Date().toISOString() };
    Store.save(); return t;
  };

  /* ------------------------------------------------------------------
     Shifts & cash reconciliation
     ------------------------------------------------------------------ */
  Shifts.open = function (opts) {
    const o = opts || {};
    const userId = o.userId || (Store.currentUser ? Store.currentUser.id : null);
    if (!userId) throw new Error('اختر المستخدم.');
    if (Store.currentShift(userId)) throw new Error('لديك وردية مفتوحة بالفعل.');
    const shift = {
      id: U.uid('shift'), number: Store.nextNumber('shift'),
      branchId: o.branchId || (Store.data.branches[0] || {}).id,
      userId, userName: (Store.user(userId) || {}).name || '',
      openedAt: new Date().toISOString(), closedAt: null,
      openingCash: round2(o.openingCash), closingCash: null,
      expectedCash: null, variance: null, status: 'open',
      notes: o.notes || ''
    };
    Store.data.shifts.unshift(shift);
    Store.audit('فتح وردية', `${shift.number} — ${shift.userName} — نقدية ${U.money(shift.openingCash)}`, 'clock');
    Store.save();
    return shift;
  };

  Shifts.summary = function (shiftId) {
    const shift = Store.shift(shiftId);
    if (!shift) return null;
    const invoices = Store.data.invoices.filter((i) => i.shiftId === shiftId && i.type === 'sale');
    const returns = Store.data.invoices.filter((i) => i.shiftId === shiftId && i.type === 'return');
    const expenses = Store.data.expenses.filter((e) => e.shiftId === shiftId);
    const byMethod = {};
    invoices.forEach((inv) => (inv.payments || []).forEach((p) => {
      byMethod[p.method] = round2((byMethod[p.method] || 0) + (Number(p.amount) || 0));
    }));
    returns.forEach((ret) => (ret.payments || []).forEach((p) => {
      byMethod[p.method] = round2((byMethod[p.method] || 0) - (Number(p.amount) || 0));
    }));
    const cashSales = round2(byMethod.cash || 0);
    const cashExpenses = round2(U.sum(expenses.filter((e) => e.method === 'cash'), (e) => e.amount));
    const expectedCash = round2((Number(shift.openingCash) || 0) + cashSales - cashExpenses);
    return {
      shift, invoices, returns, expenses, byMethod, cashSales, cashExpenses, expectedCash,
      sales: round2(U.sum(invoices, (i) => i.total)),
      tax: round2(U.sum(invoices, (i) => i.tax)),
      discounts: round2(U.sum(invoices, (i) => i.discount)),
      cogs: round2(U.sum(invoices, (i) => i.cogs || 0)),
      count: invoices.length,
      avgTicket: invoices.length ? round2(U.sum(invoices, (i) => i.total) / invoices.length) : 0,
      refunds: round2(U.sum(returns, (r) => r.total))
    };
  };

  Shifts.close = function (shiftId, closingCash, notes) {
    const shift = Store.shift(shiftId);
    if (!shift) throw new Error('الوردية غير موجودة.');
    if (shift.status !== 'open') throw new Error('الوردية مغلقة بالفعل.');
    const s = Shifts.summary(shiftId);
    shift.status = 'closed';
    shift.closedAt = new Date().toISOString();
    shift.closingCash = round2(closingCash);
    shift.expectedCash = s.expectedCash;
    shift.variance = round2(shift.closingCash - s.expectedCash);
    shift.sales = s.sales;
    shift.orders = s.count;
    shift.tax = s.tax;
    shift.cogs = s.cogs;
    shift.byMethod = s.byMethod;
    shift.notes = notes || shift.notes || '';
    Store.audit('إغلاق وردية', `${shift.number} — فرق ${U.money(shift.variance)}`, 'lock');
    Store.save();
    return shift;
  };

  Shifts.history = function (branchId, limit) {
    return Store.data.shifts.filter((s) => !branchId || s.branchId === branchId)
      .slice().sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt))).slice(0, limit || 50);
  };

  /* ------------------------------------------------------------------
     Loyalty & CRM
     ------------------------------------------------------------------ */
  Loyalty.earn = function (customerId, amount, invoice) {
    const c = Store.customer(customerId);
    if (!c) return 0;
    const tier = Store.loyaltyTier(c.loyaltyPoints);
    const per = Number(settings().loyaltyPer) || 1;
    const points = Math.floor((Number(amount) || 0) / per * tier.multiplier);
    if (points <= 0) return 0;
    c.loyaltyPoints = (Number(c.loyaltyPoints) || 0) + points;
    c.lastPurchase = invoice ? invoice.date : today();
    c.lifetimeSpend = round2((Number(c.lifetimeSpend) || 0) + (Number(amount) || 0));
    Store.data.loyaltyHistory.unshift({
      id: U.uid('loy'), customerId, points, type: 'earn', amount: round2(amount),
      invoiceId: invoice ? invoice.id : null, invoiceNumber: invoice ? invoice.number : '',
      at: new Date().toISOString(), note: `كسب نقاط — ${tier.label}`
    });
    return points;
  };

  Loyalty.redeem = function (customerId, points, invoice) {
    const c = Store.customer(customerId);
    if (!c) throw new Error('العميل غير موجود.');
    const n = Math.floor(Number(points) || 0);
    if (n <= 0) throw new Error('أدخل عدد نقاط صحيح.');
    if (n > (Number(c.loyaltyPoints) || 0)) throw new Error('نقاط العميل غير كافية.');
    const value = round2(n * (Number(settings().loyaltyValue) || 0.05));
    c.loyaltyPoints -= n;
    Store.data.loyaltyHistory.unshift({
      id: U.uid('loy'), customerId, points: -n, type: 'redeem', amount: value,
      invoiceId: invoice ? invoice.id : null, invoiceNumber: invoice ? invoice.number : '',
      at: new Date().toISOString(), note: 'استبدال نقاط بخصم'
    });
    Store.save();
    return value;
  };

  Loyalty.adjust = function (customerId, points, note) {
    const c = Store.customer(customerId);
    if (!c) throw new Error('العميل غير موجود.');
    const n = Math.floor(Number(points) || 0);
    if (!n) throw new Error('أدخل عدد نقاط.');
    c.loyaltyPoints = Math.max(0, (Number(c.loyaltyPoints) || 0) + n);
    Store.data.loyaltyHistory.unshift({
      id: U.uid('loy'), customerId, points: n, type: 'adjust', amount: 0,
      at: new Date().toISOString(), note: note || 'تسوية نقاط يدوية'
    });
    Store.save();
    return c;
  };

  Loyalty.stats = function () {
    const customers = Store.data.customers;
    const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    customers.forEach((c) => { tiers[Store.loyaltyTier(c.loyaltyPoints).key]++; });
    const history = Store.data.loyaltyHistory || [];
    return {
      members: customers.length,
      points: Math.round(U.sum(customers, (c) => c.loyaltyPoints)),
      issued: Math.round(U.sum(history.filter((h) => h.points > 0), (h) => h.points)),
      redeemed: Math.round(Math.abs(U.sum(history.filter((h) => h.type === 'redeem'), (h) => h.points))),
      tiers,
      history
    };
  };

  Loyalty.createCoupon = function (opts) {
    const o = opts || {};
    if (!o.code) throw new Error('رمز الكوبون مطلوب.');
    if (Store.data.coupons.some((c) => c.code.toLowerCase() === String(o.code).toLowerCase())) throw new Error('رمز الكوبون مستخدم.');
    const coupon = {
      id: U.uid('cpn'), code: String(o.code).toUpperCase(), type: o.type || 'percent',
      value: round2(o.value), minSpend: round2(o.minSpend || 0),
      expiresAt: o.expiresAt || U.addDays(today(), 30), usageLimit: Number(o.usageLimit) || 100,
      used: 0, active: true, createdAt: new Date().toISOString()
    };
    Store.data.coupons.unshift(coupon);
    Store.save();
    return coupon;
  };

  Loyalty.applyCoupon = function (code, subtotal) {
    const c = Store.data.coupons.find((x) => x.active && x.code.toLowerCase() === String(code || '').toLowerCase());
    if (!c) throw new Error('الكوبون غير موجود أو غير فعّال.');
    if (c.expiresAt && c.expiresAt < today()) throw new Error('انتهت صلاحية الكوبون.');
    if (c.used >= c.usageLimit) throw new Error('تم استهلاك الكوبون بالكامل.');
    if (Number(subtotal) < c.minSpend) throw new Error(`الحد الأدنى لاستخدام الكوبون ${U.money(c.minSpend)}.`);
    const discount = c.type === 'percent' ? round2(Number(subtotal) * c.value / 100) : round2(c.value);
    return { coupon: c, discount: Math.min(discount, Number(subtotal)) };
  };

  /* ------------------------------------------------------------------
     Waste
     ------------------------------------------------------------------ */
  Waste.create = function (opts) {
    const o = opts || {};
    const p = Store.product(o.productId);
    if (!p) throw new Error('المادة غير موجودة.');
    const qty = round2(o.qty);
    if (!(qty > 0)) throw new Error('أدخل كمية صحيحة.');
    if (qty > (Number(p.stock) || 0) && !settings().allowNegativeStock) throw new Error('الكمية أكبر من المخزون المتاح.');
    const cost = round2(qty * (Number(p.cost) || 0));
    const date = o.date || today();
    const entry = Accounting.post({
      date, description: `تسجيل فاقد — ${p.name} (${qty} ${p.unit || ''})`,
      sourceType: 'waste', sourceNumber: Store.nextNumber('waste'),
      lines: [
        { accountId: Accounting.ACC.inventoryLoss, debit: cost, credit: 0, memo: `فاقد ${p.name}` },
        { accountId: Accounting.ACC.inventory, debit: 0, credit: cost, memo: 'صرف مخزون فاقد' }
      ]
    });
    p.stock = round2((Number(p.stock) || 0) - qty);
    const rec = {
      id: U.uid('waste'), number: entry.sourceNumber, date, productId: p.id, productName: p.name,
      qty, cost, reason: o.reason || 'فاقد تشغيلي', branchId: o.branchId || null,
      journalId: entry.id, at: new Date().toISOString()
    };
    Store.data.waste.unshift(rec);
    Store.data.stockMoves.push({
      id: U.uid('sm'), date, productId: p.id, qty: -qty, type: 'waste',
      refId: rec.id, refNumber: rec.number, note: rec.reason, createdAt: new Date().toISOString()
    });
    Store.audit('تسجيل فاقد', `${p.name} — ${qty} — ${U.money(cost)}`, 'trash');
    Store.save();
    return rec;
  };

  Waste.stats = function (from, to) {
    const list = Store.data.waste.filter((w) => U.inRange(w.date, from, to));
    return { count: list.length, cost: round2(U.sum(list, (w) => w.cost)), list };
  };

  /* ------------------------------------------------------------------
     Cash helpers
     ------------------------------------------------------------------ */
  Orders.cashCollected = function (order) {
    return round2(U.sum((order && order.payments) || [], (p) => p.amount));
  };
})();
