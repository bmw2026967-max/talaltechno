/* ==========================================================================
   طلال تكنو — Double-entry accounting engine & business transactions
   ========================================================================== */
(function () {
  'use strict';
  const A = window.Accounting = {};
  const B = window.Business = {};

  const ACC = A.ACC = {
    cash: '1101', bank: '1102', ar: '1103', inventory: '1104', vatInput: '1105', advances: '1106',
    fixedAssets: '1201', vehicles: '1202',
    ap: '2101', vatOutput: '2102', salariesPayable: '2103', accrued: '2104',
    capital: '3101', retained: '3102', drawings: '3103',
    sales: '4101', otherIncome: '4102', salesReturns: '4103', salesDiscount: '4104',
    cogs: '5101', salaries: '5102', rent: '5103', utilities: '5104', marketing: '5105',
    maintenance: '5106', bankFees: '5107', inventoryLoss: '5108', misc: '5109',
    hospitality: '5110', telecom: '5111', delivery: '5112'
  };
  A.ACC = ACC;

  const round2 = U.round2;
  const sum = U.sum;
  const today = () => U.today();
  const settings = () => Store.data.settings;
  const vatRate = (r) => (r === undefined || r === null || r === '' ? Number(settings().vatRate) || 0 : Number(r) || 0);
  const accountForMethod = (m) => (m === 'cash' ? ACC.cash : ACC.bank);
  const methodLabel = (m) => ({
    cash: 'نقدي', card: 'شبكة / بطاقة', mada: 'مدى', applepay: 'Apple Pay',
    stcpay: 'STC Pay', visa: 'Visa', mastercard: 'Mastercard',
    bank: 'تحويل بنكي', wallet: 'محفظة إلكترونية', credit: 'آجل', mixed: 'مختلط'
  }[m] || m);

  /* ------------------------------------------------------------------
     Journal posting
     ------------------------------------------------------------------ */
  A.post = function (opts) {
    const date = opts.date || today();
    const lines = (opts.lines || []).map((l) => {
      const account = Store.account(l.accountId);
      if (!account) throw new Error('حساب غير موجود في دليل الحسابات: ' + l.accountId);
      if (account.isGroup) throw new Error('لا يمكن الترحيل إلى حساب رئيسي: ' + account.name);
      return {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debit: round2(l.debit || 0),
        credit: round2(l.credit || 0),
        partyId: l.partyId || null,
        partyType: l.partyType || null,
        memo: l.memo || ''
      };
    }).filter((l) => l.debit > 0.004 || l.credit > 0.004);

    if (!lines.length) throw new Error('القيد لا يحتوي على أي مبالغ.');
    const debit = round2(sum(lines, (l) => l.debit));
    const credit = round2(sum(lines, (l) => l.credit));
    if (Math.abs(debit - credit) > 0.01) {
      throw new Error(`القيد غير متوازن — مدين ${U.money(debit)} / دائن ${U.money(credit)}`);
    }
    // Force exact balance: absorb sub-cent rounding into the largest line on the
    // deficient side so the ledger never accumulates fractional differences.
    const diff = round2(debit - credit);
    if (Math.abs(diff) > 0.0001) {
      const side = diff > 0 ? 'credit' : 'debit';
      let idx = -1, max = -1;
      lines.forEach((l, i) => {
        if ((Number(l[side]) || 0) > max) { max = Number(l[side]) || 0; idx = i; }
      });
      if (idx < 0) idx = lines.length - 1;
      lines[idx][side] = round2((Number(lines[idx][side]) || 0) + Math.abs(diff));
    }

    const entry = {
      id: U.uid('jv'),
      number: Store.nextNumber('journal'),
      date,
      description: opts.description || 'قيد يومية',
      lines,
      sourceType: opts.sourceType || 'manual',
      sourceId: opts.sourceId || null,
      sourceNumber: opts.sourceNumber || '',
      createdAt: opts.createdAt || (date === today() ? new Date().toISOString() : date + 'T12:00:00'),
      createdBy: Store.currentUser ? Store.currentUser.name : 'النظام'
    };
    Store.data.journal.push(entry);
    return entry;
  };

  A.manualJournal = function (opts) {
    const entry = A.post({
      date: opts.date, description: opts.description, lines: opts.lines,
      sourceType: 'manual', createdAt: new Date().toISOString()
    });
    Store.audit('قيد يومية جديد', `${entry.number} — ${entry.description}`, 'book');
    Store.save();
    return entry;
  };

  /* ------------------------------------------------------------------
     Balances & ledgers
     ------------------------------------------------------------------ */
  A.balances = function (from, to) {
    const map = {};
    Store.data.accounts.forEach((a) => { map[a.id] = { debit: 0, credit: 0 }; });
    Store.data.journal.forEach((entry) => {
      if (from && entry.date < from) return;
      if (to && entry.date > to) return;
      entry.lines.forEach((l) => {
        if (!map[l.accountId]) map[l.accountId] = { debit: 0, credit: 0 };
        map[l.accountId].debit += Number(l.debit) || 0;
        map[l.accountId].credit += Number(l.credit) || 0;
      });
    });
    Object.keys(map).forEach((id) => {
      map[id].debit = round2(map[id].debit);
      map[id].credit = round2(map[id].credit);
      map[id].balance = round2(map[id].debit - map[id].credit);
    });
    return map;
  };

  A.accountBalance = function (accountId, asOf, from) {
    const map = A.balances(from, asOf);
    const acc = Store.account(accountId);
    if (!acc) return 0;
    if (!acc.isGroup) return map[accountId] ? map[accountId].balance : 0;
    const leaves = A.leafIdsUnder(accountId);
    return round2(sum(leaves, (id) => (map[id] ? map[id].balance : 0)));
  };

  A.leafIdsUnder = function (accountId) {
    const accounts = Store.data.accounts;
    const ids = [];
    const walk = (parentId) => {
      accounts.filter((a) => a.parent === parentId).forEach((a) => {
        if (a.isGroup) walk(a.id); else ids.push(a.id);
      });
    };
    const acc = Store.account(accountId);
    if (!acc) return ids;
    if (!acc.isGroup) return [acc.id];
    walk(accountId);
    return ids;
  };

  A.accountDebitCredit = function (accountId, from, to) {
    const map = A.balances(from, to);
    if (Store.account(accountId) && !Store.account(accountId).isGroup) {
      return map[accountId] || { debit: 0, credit: 0, balance: 0 };
    }
    const leaves = A.leafIdsUnder(accountId);
    return {
      debit: round2(sum(leaves, (id) => (map[id] ? map[id].debit : 0))),
      credit: round2(sum(leaves, (id) => (map[id] ? map[id].credit : 0))),
      balance: round2(sum(leaves, (id) => (map[id] ? map[id].balance : 0)))
    };
  };

  A.customerBalance = function (customerId, asOf) {
    let bal = 0;
    Store.data.journal.forEach((entry) => {
      if (asOf && entry.date > asOf) return;
      entry.lines.forEach((l) => {
        if (l.accountId === ACC.ar && l.partyId === customerId) bal += (Number(l.debit) || 0) - (Number(l.credit) || 0);
      });
    });
    return round2(bal);
  };

  A.supplierBalance = function (supplierId, asOf) {
    let bal = 0;
    Store.data.journal.forEach((entry) => {
      if (asOf && entry.date > asOf) return;
      entry.lines.forEach((l) => {
        if (l.accountId === ACC.ap && l.partyId === supplierId) bal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
      });
    });
    return round2(bal);
  };

  A.partyLedger = function (type, partyId, from, to) {
    const accountId = type === 'customer' ? ACC.ar : ACC.ap;
    const rows = [];
    let opening = 0;
    Store.data.journal.forEach((entry) => {
      entry.lines.forEach((l) => {
        if (l.accountId !== accountId || l.partyId !== partyId) return;
        const dr = Number(l.debit) || 0;
        const cr = Number(l.credit) || 0;
        const net = type === 'customer' ? dr - cr : cr - dr;
        if (from && entry.date < from) { opening += net; return; }
        if (to && entry.date > to) return;
        rows.push({
          id: entry.id, date: entry.date, number: entry.number,
          description: entry.description, sourceType: entry.sourceType,
          sourceId: entry.sourceId, sourceNumber: entry.sourceNumber,
          debit: dr, credit: cr, net, memo: l.memo
        });
      });
    });
    rows.sort((a, b) => (a.date === b.date ? String(a.number).localeCompare(String(b.number)) : a.date.localeCompare(b.date)));
    let running = opening;
    rows.forEach((r) => { running += r.net; r.balance = round2(running); });
    return { opening: round2(opening), rows, closing: round2(running) };
  };

  A.customerInvoices = function (customerId) {
    return Store.data.invoices.filter((i) => i.customerId === customerId && i.type === 'sale');
  };

  /* ------------------------------------------------------------------
     Helpers for sale calculations
     ------------------------------------------------------------------ */
  function saleLineNet(inv, item) {
    const gross = (Number(item.qty) || 0) * (Number(item.price) || 0) - (Number(item.discount) || 0);
    const share = inv.subtotal ? (Number(inv.discount) || 0) / inv.subtotal : 0;
    return round2(gross * (1 - share));
  }
  A.saleLineNet = saleLineNet;

  function deriveMethod(payments, due) {
    if (due > 0.01) return 'credit';
    const methods = U.unique((payments || []).filter((p) => p.amount > 0).map((p) => p.method));
    if (!methods.length) return 'cash';
    if (methods.length === 1) return methods[0];
    return 'mixed';
  }
  A.methodLabel = methodLabel;

  function createdAtFor(date, opts) {
    if (opts && opts.createdAt) return opts.createdAt;
    if (date === today()) return new Date().toISOString();
    return `${date}T12:00:00`;
  }

  function stockMove(date, productId, qty, type, refId, refNumber, note, createdAt) {
    Store.data.stockMoves.push({
      id: U.uid('sm'), date, productId, qty: round2(qty), type,
      refId, refNumber, note: note || '', createdAt: createdAt || new Date().toISOString()
    });
  }

  function requireProduct(id) {
    const p = Store.product(id);
    if (!p) throw new Error('المنتج غير موجود.');
    return p;
  }
  function requireCustomer(id) {
    const c = Store.customer(id);
    if (!c) throw new Error('العميل غير موجود.');
    return c;
  }
  function requireSupplier(id) {
    const s = Store.supplier(id);
    if (!s) throw new Error('المورد غير موجود.');
    return s;
  }

  function normalizeSaleItems(items, checkStock) {
    if (!items || !items.length) throw new Error('الفاتورة لا تحتوي على أصناف.');
    return items.map((it) => {
      const p = requireProduct(it.productId);
      const qty = round2(it.qty);
      if (!(qty > 0)) throw new Error(`الكمية غير صحيحة للمنتج ${p.name}.`);
      if (checkStock && !settings().allowNegativeStock && p.type !== 'menu' && Number(p.stock) < qty) {
        throw new Error(`الكمية المتاحة من «${p.name}» هي ${U.num(p.stock, 0)} فقط.`);
      }
      const price = round2(it.price !== undefined && it.price !== null && it.price !== '' ? it.price : p.price);
      const lineDiscount = round2(it.discount || 0);
      const gross = round2(qty * price);
      const net = round2(Math.max(0, gross - lineDiscount));
      const rate = vatRate(it.taxRate !== undefined ? it.taxRate : p.taxRate);
      return {
        productId: p.id, name: p.name, sku: p.sku, unit: p.unit || 'حبة',
        emoji: p.emoji || '📦', categoryId: p.categoryId, type: p.type || 'menu',
        qty, price, discount: lineDiscount, gross, net, cost: round2(Store.costOf(p)), taxRate: rate
      };
    });
  }

  function computeSaleTotals(items, discount, opts) {
    const o = opts || {};
    const subtotal = round2(sum(items, (i) => i.net));
    const invDiscount = round2(U.clamp(discount || 0, 0, subtotal));
    const serviceCharge = round2(Math.max(0, Number(o.serviceCharge) || 0));
    const deliveryFee = round2(Math.max(0, Number(o.deliveryFee) || 0));
    let tax = 0;
    items.forEach((it) => {
      const share = subtotal ? it.net / subtotal : 0;
      const taxable = round2(it.net - invDiscount * share);
      it.taxable = taxable;
      it.taxAmount = round2(taxable * (it.taxRate || 0) / 100);
      tax += it.taxAmount;
    });
    const extras = round2(serviceCharge + deliveryFee);
    const extrasTax = extras > 0 ? round2(extras * (Number(settings().vatRate) || 0) / 100) : 0;
    tax = round2(tax + extrasTax);
    const total = round2(subtotal - invDiscount + extras + tax);
    return { subtotal, discount: invDiscount, serviceCharge, deliveryFee, extras, extrasTax, tax, total };
  }

  /* ------------------------------------------------------------------
     SALES
     ------------------------------------------------------------------ */
  B.createSale = function (opts) {
    const o = opts || {};
    const date = o.date || today();
    const items = normalizeSaleItems(o.items, true);
    if (!settings().allowNegativeStock && window.BOM) BOM.check(items);

    const customer = o.customerId ? requireCustomer(o.customerId) : null;
    const orderType = o.orderType || (o.tableId ? 'dine_in' : 'takeaway');
    const baseSubtotal = round2(sum(items, (i) => i.net));

    /* Coupon & loyalty redemption are folded into the invoice discount. */
    let coupon = null, couponDiscount = 0;
    if (o.couponCode) {
      const applied = Loyalty.applyCoupon(o.couponCode, baseSubtotal);
      coupon = applied.coupon;
      couponDiscount = applied.discount;
    }
    const loyaltyPoints = Math.floor(Number(o.loyaltyPoints) || 0);
    if (loyaltyPoints > 0 && !customer) throw new Error('استبدال نقاط الولاء يتطلب اختيار عميل.');
    if (customer && loyaltyPoints > (Number(customer.loyaltyPoints) || 0)) throw new Error('نقاط العميل غير كافية.');
    const loyaltyDiscount = loyaltyPoints > 0
      ? round2(loyaltyPoints * (Number(settings().loyaltyValue) || 0.05)) : 0;
    const manualDiscount = round2(o.discount || 0);
    const totalDiscount = round2(manualDiscount + couponDiscount + loyaltyDiscount);

    const serviceCharge = o.serviceCharge !== undefined
      ? round2(o.serviceCharge)
      : (orderType === 'dine_in' && Number(settings().serviceChargeRate) > 0
        ? round2(baseSubtotal * Number(settings().serviceChargeRate) / 100) : 0);
    const deliveryFee = o.deliveryFee !== undefined
      ? round2(o.deliveryFee)
      : (orderType === 'delivery' ? round2(Number(settings().deliveryFee) || 0) : 0);
    const totals = computeSaleTotals(items, totalDiscount, { serviceCharge, deliveryFee });

    let payments = (o.payments || []).filter((p) => Number(p.amount) > 0)
      .map((p) => ({ method: p.method || 'cash', amount: round2(p.amount) }));
    let paid = round2(sum(payments, (p) => p.amount));
    if (paid > totals.total + 0.01) throw new Error('المبلغ المدفوع أكبر من إجمالي الفاتورة.');
    if (paid > totals.total) paid = totals.total;
    if (sum(payments, (p) => p.amount) > paid) {
      let remaining = paid;
      payments = payments.map((p) => {
        const amount = Math.min(p.amount, remaining);
        remaining = round2(remaining - amount);
        return { method: p.method, amount };
      }).filter((p) => p.amount > 0);
    }
    const due = round2(totals.total - paid);
    if (due > 0.01 && !customer) throw new Error('البيع الآجل يتطلب اختيار عميل مسجّل.');

    const cost = round2(sum(items, (i) => i.cost * i.qty));
    const number = Store.nextNumber('invoice');
    const branchId = o.branchId || (Store.data.branches[0] || {}).id || null;
    const cashierId = o.cashierId || (Store.currentUser ? Store.currentUser.id : null);
    const cashierName = (Store.user(cashierId) || {}).name || (Store.currentUser ? Store.currentUser.name : 'الكاشير');
    const createdAt = createdAtFor(date, o);
    const table = o.tableId ? Store.table(o.tableId) : null;
    const linkedOrder = o.orderId ? Store.order(o.orderId) : null;
    const shift = o.shiftId ? Store.shift(o.shiftId) : Store.currentShift(cashierId);
    const platform = o.platform || (linkedOrder && linkedOrder.platform) || null;
    const platformName = platform ? (Delivery.platformName(platform) || (linkedOrder && linkedOrder.platformName) || platform) : null;

    const lines = [];
    if (paid > 0) {
      const byMethod = {};
      payments.forEach((p) => { byMethod[p.method] = round2((byMethod[p.method] || 0) + p.amount); });
      Object.keys(byMethod).forEach((m) => {
        lines.push({ accountId: accountForMethod(m), debit: byMethod[m], credit: 0, memo: `تحصيل ${methodLabel(m)} — ${number}` });
      });
    }
    if (due > 0.01) {
      lines.push({ accountId: ACC.ar, debit: due, credit: 0, partyId: customer.id, partyType: 'customer', memo: `مستحق على ${customer.name}` });
    }
    if (totals.discount > 0) lines.push({ accountId: ACC.salesDiscount, debit: totals.discount, credit: 0, memo: 'خصم على الفاتورة' });
    lines.push({ accountId: ACC.sales, debit: 0, credit: totals.subtotal, memo: 'إيراد مبيعات' });
    if (totals.extras > 0) {
      lines.push({ accountId: ACC.otherIncome, debit: 0, credit: totals.extras, memo: `إيرادات خدمة/توصيل — ${number}` });
    }
    if (totals.tax > 0) lines.push({ accountId: ACC.vatOutput, debit: 0, credit: totals.tax, memo: 'ضريبة القيمة المضافة (مخرجات)' });
    lines.push({ accountId: ACC.cogs, debit: cost, credit: 0, memo: 'تكلفة البضاعة المباعة' });
    lines.push({ accountId: ACC.inventory, debit: 0, credit: cost, memo: 'صرف مخزون' });

    const entry = A.post({
      date, description: `فاتورة بيع ${number} — ${customer ? customer.name : 'عميل نقدي'}`,
      lines, sourceType: 'sale', sourceId: null, sourceNumber: number, createdAt
    });

    const invoice = {
      id: U.uid('inv'), number, type: 'sale', date, createdAt,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : (o.customerName || 'عميل نقدي'),
      customerPhone: o.customerPhone || (customer && customer.phone) || '',
      items, subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax,
      serviceCharge: totals.serviceCharge, deliveryFee: totals.deliveryFee,
      total: totals.total, paid, due, payments,
      method: deriveMethod(payments, due),
      status: due <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      branchId, cashierId, cashierName,
      shiftId: shift ? shift.id : null,
      orderType, tableId: table ? table.id : null, tableName: table ? table.name : (o.tableName || ''),
      orderId: linkedOrder ? linkedOrder.id : null,
      orderNumber: linkedOrder ? linkedOrder.number : (o.orderNumber || ''),
      platform, platformName,
      couponCode: coupon ? coupon.code : '',
      couponDiscount, loyaltyPoints, loyaltyDiscount,
      loyaltyEarned: 0,
      notes: o.notes || '', journalId: entry.id,
      cogs: cost,
      profit: round2(totals.subtotal - totals.discount - cost),
      source: o.source || 'pos'
    };

    if (window.Zatca) {
      try { Zatca.issue(invoice, { silent: true }); }
      catch (e) { console.warn('ZATCA sandbox issue skipped', e); }
    }
    entry.sourceId = invoice.id;
    entry.sourceNumber = number;
    Store.data.invoices.push(invoice);

    if (window.BOM) BOM.consume(items, invoice, date, createdAt);
    else {
      items.forEach((it) => {
        const p = requireProduct(it.productId);
        p.stock = round2((Number(p.stock) || 0) - it.qty);
        stockMove(date, p.id, -it.qty, 'sale', invoice.id, number, `بيع — ${number}`, createdAt);
      });
    }

    if (coupon) {
      coupon.used = (Number(coupon.used) || 0) + 1;
      coupon.lastUsedAt = createdAt;
    }
    if (customer) {
      if (loyaltyPoints > 0 && window.Loyalty) {
        try { Loyalty.redeem(customer.id, loyaltyPoints, invoice); } catch (e) { console.warn(e); }
      }
      if (window.Loyalty) invoice.loyaltyEarned = Loyalty.earn(customer.id, totals.total, invoice);
      customer.lastPurchase = date;
    }
    if (linkedOrder && window.Orders) {
      Orders.closeWithInvoice(linkedOrder.id, invoice);
    }

    Store.audit('فاتورة بيع جديدة', `${number} — ${invoice.customerName} — ${U.money(totals.total)}`, 'receipt');
    Store.save();
    return invoice;
  };

  B.createSaleReturn = function (opts) {
    const original = Store.invoice(opts.invoiceId);
    if (!original || original.type !== 'sale') throw new Error('الفاتورة الأصلية غير موجودة أو غير قابلة للإرجاع.');
    const date = opts.date || today();
    const customer = original.customerId ? Store.customer(original.customerId) : null;
    const refundMethod = opts.refundMethod || (customer ? 'credit' : 'cash');
    if (refundMethod === 'credit' && !customer) throw new Error('الاسترداد الآجل يتطلب عميلاً مسجلاً.');
    const reqItems = (opts.items || []).filter((i) => round2(i.qty) > 0);
    if (!reqItems.length) throw new Error('حدد الكميات المراد إرجاعها.');

    const returnedBefore = {};
    Store.data.invoices.filter((i) => i.type === 'return' && i.originalInvoiceId === original.id)
      .forEach((ret) => ret.items.forEach((it) => {
        returnedBefore[it.productId] = round2((returnedBefore[it.productId] || 0) + it.qty);
      }));

    const lines = [];
    let subtotal = 0, tax = 0, cost = 0;
    reqItems.forEach((req) => {
      const item = original.items.find((x) => x.productId === req.productId);
      if (!item) throw new Error('صنف غير موجود في الفاتورة الأصلية.');
      const available = round2(item.qty - (returnedBefore[item.productId] || 0));
      const qty = round2(req.qty);
      if (qty > available + 0.001) throw new Error(`الكمية القابلة للإرجاع من «${item.name}» هي ${U.num(available, 0)}.`);
      const netTotal = saleLineNet(original, item);
      const unitNet = round2(netTotal / item.qty);
      const lineNet = round2(unitNet * qty);
      const lineTax = round2(lineNet * (Number(item.taxRate) || 0) / 100);
      const lineCost = round2((Number(item.cost) || 0) * qty);
      subtotal = round2(subtotal + lineNet);
      tax = round2(tax + lineTax);
      cost = round2(cost + lineCost);
      lines.push({
        productId: item.productId, name: item.name, sku: item.sku, unit: item.unit,
        emoji: item.emoji, qty, price: unitNet, discount: 0, taxRate: Number(item.taxRate) || 0,
        taxAmount: lineTax, cost: Number(item.cost) || 0
      });
    });

    const total = round2(subtotal + tax);
    const number = Store.nextNumber('return');
    const createdAt = createdAtFor(date, opts);
    const journalLines = [
      { accountId: ACC.salesReturns, debit: subtotal, credit: 0, memo: `مردودات مبيعات — ${number}` },
      { accountId: ACC.inventory, debit: cost, credit: 0, memo: 'إرجاع مخزون' }
    ];
    if (tax > 0) journalLines.push({ accountId: ACC.vatOutput, debit: tax, credit: 0, memo: 'تسوية ضريبة مخرجات' });
    if (refundMethod === 'credit') {
      journalLines.push({ accountId: ACC.ar, debit: 0, credit: total, partyId: customer.id, partyType: 'customer', memo: `رصيد دائن — ${customer.name}` });
    } else {
      journalLines.push({ accountId: accountForMethod(refundMethod), debit: 0, credit: total, memo: `استرداد ${methodLabel(refundMethod)}` });
    }
    journalLines.push({ accountId: ACC.cogs, debit: 0, credit: cost, memo: 'عكس تكلفة البضاعة المرتجعة' });

    const entry = A.post({
      date, description: `مرتجع بيع ${number} — أصل ${original.number}`,
      lines: journalLines, sourceType: 'sale_return', sourceId: null, sourceNumber: number, createdAt
    });

    const ret = {
      id: U.uid('inv'), number, type: 'return', date, createdAt,
      originalInvoiceId: original.id, originalNumber: original.number,
      customerId: original.customerId, customerName: original.customerName,
      items: lines, subtotal, discount: 0, tax, total, paid: total, due: 0,
      payments: [{ method: refundMethod, amount: total }],
      method: refundMethod, status: 'return', refundMethod,
      branchId: original.branchId, cashierId: Store.currentUser ? Store.currentUser.id : original.cashierId,
      cashierName: Store.currentUser ? Store.currentUser.name : original.cashierName,
      shiftId: original.shiftId || (Store.currentShift() ? Store.currentShift().id : null),
      orderType: original.orderType || 'takeaway',
      tableName: original.tableName || '', orderNumber: original.orderNumber || '',
      notes: opts.notes || '', journalId: entry.id,
      cogs: cost,
      profit: round2(-(subtotal - cost))
    };
    if (window.Zatca) {
      try { Zatca.issue(ret, { silent: true }); }
      catch (e) { console.warn('ZATCA sandbox return issue skipped', e); }
    }
    entry.sourceId = ret.id;
    Store.data.invoices.push(ret);

    if (window.BOM) BOM.restore(lines, ret, date, createdAt);
    else {
      lines.forEach((it) => {
        const p = requireProduct(it.productId);
        p.stock = round2((Number(p.stock) || 0) + it.qty);
        stockMove(date, p.id, it.qty, 'sale_return', ret.id, number, `مرتجع بيع — ${number}`, createdAt);
      });
    }
    if (customer) {
      const points = Math.floor(total / (Number(settings().loyaltyPer) || 10));
      if (points > 0) {
        customer.loyaltyPoints = Math.max(0, (Number(customer.loyaltyPoints) || 0) - points);
        Store.data.loyaltyHistory.unshift({
          id: U.uid('loy'), customerId: customer.id, points: -points, type: 'return',
          amount: 0, invoiceId: ret.id, invoiceNumber: number,
          at: new Date().toISOString(), note: `خصم نقاط مرتجع ${original.number}`
        });
      }
    }
    Store.audit('مرتجع مبيعات', `${number} — أصل ${original.number} — ${U.money(total)}`, 'refresh');
    Store.save();
    return ret;
  };

  B.saveQuote = function (opts) {
    const date = opts.date || today();
    const items = normalizeSaleItems(opts.items, false);
    const totals = computeSaleTotals(items, opts.discount);
    const customer = opts.customerId ? requireCustomer(opts.customerId) : null;
    const number = Store.nextNumber('quote');
    const quote = {
      id: U.uid('inv'), number, type: 'quote', date, createdAt: createdAtFor(date, opts),
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : 'عميل نقدي',
      items, subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax,
      total: totals.total, paid: 0, due: totals.total, payments: [],
      method: 'quote', status: 'quote',
      branchId: opts.branchId || (Store.data.branches[0] || {}).id || null,
      cashierId: Store.currentUser ? Store.currentUser.id : null,
      cashierName: Store.currentUser ? Store.currentUser.name : '—',
      notes: opts.notes || '', journalId: null,
      profit: round2(totals.subtotal - totals.discount - sum(items, (i) => i.cost * i.qty)),
      validUntil: opts.validUntil || U.addDays(date, 14)
    };
    Store.data.invoices.push(quote);
    Store.audit('عرض سعر جديد', `${number} — ${quote.customerName} — ${U.money(totals.total)}`, 'file');
    Store.save();
    return quote;
  };

  B.markQuoteConverted = function (quoteId, invoiceId) {
    const quote = Store.invoice(quoteId);
    if (!quote) return;
    quote.status = 'converted';
    quote.convertedTo = invoiceId;
    Store.save();
  };

  /* ------------------------------------------------------------------
     PURCHASES
     ------------------------------------------------------------------ */
  B.createPurchase = function (opts) {
    const date = opts.date || today();
    const supplier = requireSupplier(opts.supplierId);
    if (!opts.items || !opts.items.length) throw new Error('فاتورة الشراء لا تحتوي على أصناف.');
    const items = opts.items.map((it) => {
      const p = requireProduct(it.productId);
      const qty = round2(it.qty);
      const cost = round2(it.cost !== undefined ? it.cost : p.cost);
      if (!(qty > 0)) throw new Error(`الكمية غير صحيحة للمنتج ${p.name}.`);
      const rate = vatRate(it.taxRate);
      return {
        productId: p.id, name: p.name, sku: p.sku, unit: p.unit || 'حبة', emoji: p.emoji,
        qty, cost, taxRate: rate, gross: round2(qty * cost), discount: 0, net: round2(qty * cost)
      };
    });
    const subtotal = round2(sum(items, (i) => i.net));
    const discount = round2(U.clamp(opts.discount || 0, 0, subtotal));
    let tax = 0;
    items.forEach((it) => {
      const share = subtotal ? it.net / subtotal : 0;
      const taxable = round2(it.net - discount * share);
      it.taxable = taxable;
      it.taxAmount = round2(taxable * (it.taxRate || 0) / 100);
      tax += it.taxAmount;
    });
    tax = round2(tax);
    const total = round2(subtotal - discount + tax);
    let paid = round2(opts.paid || 0);
    if (paid > total) paid = total;
    const due = round2(total - paid);
    const method = opts.method || (due > 0 ? 'credit' : 'bank');
    const number = Store.nextNumber('purchase');
    const createdAt = createdAtFor(date, opts);
    const netInventory = round2(subtotal - discount);

    const lines = [
      { accountId: ACC.inventory, debit: netInventory, credit: 0, memo: 'إضافة مخزون' }
    ];
    if (tax > 0) lines.push({ accountId: ACC.vatInput, debit: tax, credit: 0, memo: 'ضريبة القيمة المضافة (مدخلات)' });
    if (paid > 0) lines.push({ accountId: accountForMethod(method), debit: 0, credit: paid, memo: `سداد ${methodLabel(method)}` });
    if (due > 0.01) lines.push({ accountId: ACC.ap, debit: 0, credit: due, partyId: supplier.id, partyType: 'supplier', memo: `مستحق للمورد ${supplier.name}` });

    const entry = A.post({
      date, description: `فاتورة شراء ${number} — ${supplier.name}`,
      lines, sourceType: 'purchase', sourceId: null, sourceNumber: number, createdAt
    });

    items.forEach((it) => {
      const p = requireProduct(it.productId);
      const share = subtotal ? it.net / subtotal : 0;
      const lineNet = round2(it.net - discount * share);
      const unitNet = round2(lineNet / it.qty);
      const oldStock = p.stock || 0;
      const oldCost = p.cost || 0;
      const newStock = round2(oldStock + it.qty);
      p.cost = newStock > 0 ? round2(((oldStock * oldCost) + (it.qty * unitNet)) / newStock) : unitNet;
      p.stock = newStock;
      it.unitNet = unitNet;
      stockMove(date, p.id, it.qty, 'purchase', entry.sourceId, number, `شراء — ${number}`, createdAt);
    });

    const purchase = {
      id: U.uid('pur'), number, type: 'purchase', date, createdAt,
      supplierId: supplier.id, supplierName: supplier.name,
      items, subtotal, discount, tax, total, paid, due,
      method: due > 0.01 ? 'credit' : method,
      status: due <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      notes: opts.notes || '', journalId: entry.id
    };
    entry.sourceId = purchase.id;
    Store.data.purchases.push(purchase);
    Store.audit('فاتورة شراء جديدة', `${number} — ${supplier.name} — ${U.money(total)}`, 'truck');
    Store.save();
    return purchase;
  };

  B.createPurchaseReturn = function (opts) {
    const original = Store.purchase(opts.purchaseId);
    if (!original || original.type !== 'purchase') throw new Error('فاتورة الشراء الأصلية غير موجودة.');
    const date = opts.date || today();
    const supplier = requireSupplier(original.supplierId);
    const refundMethod = opts.refundMethod || 'credit';
    const reqItems = (opts.items || []).filter((i) => round2(i.qty) > 0);
    if (!reqItems.length) throw new Error('حدد الكميات المراد إرجاعها.');

    const returnedBefore = {};
    Store.data.purchases.filter((p) => p.type === 'return' && p.originalPurchaseId === original.id)
      .forEach((ret) => ret.items.forEach((it) => {
        returnedBefore[it.productId] = round2((returnedBefore[it.productId] || 0) + it.qty);
      }));

    const lines = [];
    let subtotal = 0, tax = 0;
    reqItems.forEach((req) => {
      const item = original.items.find((x) => x.productId === req.productId);
      if (!item) throw new Error('صنف غير موجود في فاتورة الشراء.');
      const available = round2(item.qty - (returnedBefore[item.productId] || 0));
      const qty = round2(req.qty);
      if (qty > available + 0.001) throw new Error(`الكمية القابلة للإرجاع من «${item.name}» هي ${U.num(available, 0)}.`);
      const lineNet = round2((Number(item.unitNet || item.cost) || 0) * qty);
      const lineTax = round2(lineNet * (Number(item.taxRate) || 0) / 100);
      subtotal = round2(subtotal + lineNet);
      tax = round2(tax + lineTax);
      lines.push({
        productId: item.productId, name: item.name, sku: item.sku, unit: item.unit,
        emoji: item.emoji, qty, cost: Number(item.unitNet || item.cost) || 0,
        taxRate: Number(item.taxRate) || 0, taxAmount: lineTax, net: lineNet
      });
    });
    const total = round2(subtotal + tax);
    const number = Store.nextNumber('purchaseReturn');
    const createdAt = createdAtFor(date, opts);
    const journalLines = [
      { accountId: ACC.inventory, debit: 0, credit: subtotal, memo: `إرجاع مخزون — ${number}` }
    ];
    if (tax > 0) journalLines.push({ accountId: ACC.vatInput, debit: 0, credit: tax, memo: 'تسوية ضريبة مدخلات' });
    if (refundMethod === 'credit') {
      journalLines.push({ accountId: ACC.ap, debit: total, credit: 0, partyId: supplier.id, partyType: 'supplier', memo: `تخفيض مستحق ${supplier.name}` });
    } else {
      journalLines.push({ accountId: accountForMethod(refundMethod), debit: total, credit: 0, memo: `استلام ${methodLabel(refundMethod)}` });
    }
    const entry = A.post({
      date, description: `مرتجع شراء ${number} — أصل ${original.number}`,
      lines: journalLines, sourceType: 'purchase_return', sourceId: null, sourceNumber: number, createdAt
    });

    lines.forEach((it) => {
      const p = requireProduct(it.productId);
      if (!settings().allowNegativeStock && p.stock < it.qty) throw new Error(`لا يمكن إرجاع كمية أكبر من مخزون «${p.name}».`);
      p.stock = round2(p.stock - it.qty);
      stockMove(date, p.id, -it.qty, 'purchase_return', entry.sourceId, number, `مرتجع شراء — ${number}`, createdAt);
    });

    const ret = {
      id: U.uid('pur'), number, type: 'return', date, createdAt,
      originalPurchaseId: original.id, originalNumber: original.number,
      supplierId: supplier.id, supplierName: supplier.name,
      items: lines, subtotal, discount: 0, tax, total, paid: 0, due: 0,
      method: refundMethod, status: 'return', refundMethod,
      notes: opts.notes || '', journalId: entry.id
    };
    entry.sourceId = ret.id;
    Store.data.purchases.push(ret);
    Store.audit('مرتجع شراء', `${number} — أصل ${original.number} — ${U.money(total)}`, 'refresh');
    Store.save();
    return ret;
  };

  /* ------------------------------------------------------------------
     EXPENSES, RECEIPTS, PAYMENTS, TRANSFERS, ADJUSTMENTS
     ------------------------------------------------------------------ */
  B.createExpense = function (opts) {
    const date = opts.date || today();
    const account = Store.account(opts.accountId);
    if (!account || account.isGroup || account.type !== 'expense') throw new Error('اختر حساب مصروف صحيحاً.');
    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new Error('أدخل مبلغ المصروف.');
    const rate = vatRate(opts.taxRate);
    const tax = round2(amount * rate / 100);
    const total = round2(amount + tax);
    const method = opts.method === 'cash' ? 'cash' : 'bank';
    const number = Store.nextNumber('expense');
    const createdAt = createdAtFor(date, opts);
    const lines = [
      { accountId: account.id, debit: amount, credit: 0, memo: opts.description || account.name }
    ];
    if (tax > 0) lines.push({ accountId: ACC.vatInput, debit: tax, credit: 0, memo: 'ضريبة مدخلات على مصروف' });
    lines.push({ accountId: accountForMethod(method), debit: 0, credit: total, memo: `سداد مصروف ${methodLabel(method)}` });
    const entry = A.post({
      date, description: `مصروف ${number} — ${opts.description || account.name}`,
      lines, sourceType: 'expense', sourceId: null, sourceNumber: number, createdAt
    });
    const expense = {
      id: U.uid('exp'), number, date, createdAt,
      accountId: account.id, accountName: account.name,
      description: opts.description || account.name,
      amount, tax, total, method, notes: opts.notes || '',
      journalId: entry.id
    };
    entry.sourceId = expense.id;
    Store.data.expenses.push(expense);
    Store.audit('مصروف جديد', `${number} — ${expense.description} — ${U.money(total)}`, 'wallet');
    Store.save();
    return expense;
  };

  B.createReceipt = function (opts) {
    const date = opts.date || today();
    const customer = requireCustomer(opts.customerId);
    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new Error('أدخل مبلغ التحصيل.');
    const method = opts.method === 'cash' ? 'cash' : 'card';
    const number = Store.nextNumber('receipt');
    const createdAt = createdAtFor(date, opts);
    const entry = A.post({
      date, description: `سند قبض ${number} — ${customer.name}`,
      lines: [
        { accountId: accountForMethod(method), debit: amount, credit: 0, memo: `تحصيل ${methodLabel(method)}` },
        { accountId: ACC.ar, debit: 0, credit: amount, partyId: customer.id, partyType: 'customer', memo: `سداد من ${customer.name}` }
      ],
      sourceType: 'receipt', sourceId: null, sourceNumber: number, createdAt
    });
    const payment = {
      id: U.uid('rcp'), number, date, createdAt, type: 'receipt',
      partyType: 'customer', partyId: customer.id, partyName: customer.name,
      amount, method, notes: opts.notes || '', journalId: entry.id
    };
    entry.sourceId = payment.id;
    Store.data.payments.push(payment);
    Store.audit('سند قبض', `${number} — ${customer.name} — ${U.money(amount)}`, 'download');
    Store.save();
    return payment;
  };

  B.createSupplierPayment = function (opts) {
    const date = opts.date || today();
    const supplier = requireSupplier(opts.supplierId);
    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new Error('أدخل مبلغ السداد.');
    const method = opts.method === 'cash' ? 'cash' : 'card';
    const number = Store.nextNumber('payment');
    const createdAt = createdAtFor(date, opts);
    const entry = A.post({
      date, description: `سند صرف ${number} — ${supplier.name}`,
      lines: [
        { accountId: ACC.ap, debit: amount, credit: 0, partyId: supplier.id, partyType: 'supplier', memo: `سداد للمورد ${supplier.name}` },
        { accountId: accountForMethod(method), debit: 0, credit: amount, memo: `دفع ${methodLabel(method)}` }
      ],
      sourceType: 'payment', sourceId: null, sourceNumber: number, createdAt
    });
    const payment = {
      id: U.uid('pay'), number, date, createdAt, type: 'payment',
      partyType: 'supplier', partyId: supplier.id, partyName: supplier.name,
      amount, method, notes: opts.notes || '', journalId: entry.id
    };
    entry.sourceId = payment.id;
    Store.data.payments.push(payment);
    Store.audit('سند صرف', `${number} — ${supplier.name} — ${U.money(amount)}`, 'upload');
    Store.save();
    return payment;
  };

  B.createTransfer = function (opts) {
    const date = opts.date || today();
    const amount = round2(opts.amount);
    if (!(amount > 0)) throw new Error('أدخل مبلغ التحويل.');
    if (opts.fromAccountId === opts.toAccountId) throw new Error('اختر حسابين مختلفين للتحويل.');
    const from = Store.account(opts.fromAccountId);
    const to = Store.account(opts.toAccountId);
    if (!from || !to) throw new Error('حساب التحويل غير موجود.');
    const number = Store.nextNumber('transfer');
    const createdAt = createdAtFor(date, opts);
    const entry = A.post({
      date, description: `تحويل ${number} — من ${from.name} إلى ${to.name}`,
      lines: [
        { accountId: to.id, debit: amount, credit: 0, memo: 'تحويل وارد' },
        { accountId: from.id, debit: 0, credit: amount, memo: 'تحويل صادر' }
      ],
      sourceType: 'transfer', sourceId: null, sourceNumber: number, createdAt
    });
    const transfer = {
      id: U.uid('trf'), number, date, createdAt,
      fromAccountId: from.id, fromName: from.name,
      toAccountId: to.id, toName: to.name,
      amount, notes: opts.notes || '', journalId: entry.id
    };
    entry.sourceId = transfer.id;
    Store.data.transfers.push(transfer);
    Store.audit('تحويل بين الحسابات', `${number} — ${from.name} ← ${to.name} — ${U.money(amount)}`, 'refresh');
    Store.save();
    return transfer;
  };

  B.createAdjustment = function (opts) {
    const date = opts.date || today();
    const product = requireProduct(opts.productId);
    const newQty = opts.newQty !== undefined ? round2(opts.newQty) : round2(product.stock + Number(opts.delta || 0));
    const delta = round2(newQty - product.stock);
    if (Math.abs(delta) < 0.001) throw new Error('لا يوجد فرق في الكمية.');
    const cost = round2(Math.abs(delta) * (Number(product.cost) || 0));
    const number = Store.nextNumber('adjustment');
    const createdAt = createdAtFor(date, opts);
    const reason = opts.reason || 'تسوية جرد';
    const lines = delta > 0
      ? [
        { accountId: ACC.inventory, debit: cost, credit: 0, memo: `زيادة جرد — ${product.name}` },
        { accountId: ACC.otherIncome, debit: 0, credit: cost, memo: 'فائض جرد' }
      ]
      : [
        { accountId: ACC.inventoryLoss, debit: cost, credit: 0, memo: `نقص/تلف جرد — ${product.name}` },
        { accountId: ACC.inventory, debit: 0, credit: cost, memo: 'نقص مخزون' }
      ];
    const entry = A.post({
      date, description: `تسوية مخزون ${number} — ${product.name}`,
      lines, sourceType: 'adjustment', sourceId: null, sourceNumber: number, createdAt
    });
    product.stock = newQty;
    stockMove(date, product.id, delta, 'adjustment', entry.sourceId, number, `${reason} — ${number}`, createdAt);
    const adj = {
      id: U.uid('adj'), number, date, createdAt,
      productId: product.id, productName: product.name,
      delta, newQty, cost, reason, journalId: entry.id
    };
    entry.sourceId = adj.id;
    Store.data.adjustments.push(adj);
    Store.audit('تسوية مخزون', `${number} — ${product.name} (${delta > 0 ? '+' : ''}${U.num(delta, 0)})`, 'sliders');
    Store.save();
    return adj;
  };

  /* ------------------------------------------------------------------
     REPORTS
     ------------------------------------------------------------------ */
  A.salesInvoices = function (from, to) {
    return Store.data.invoices.filter((i) => i.type === 'sale' && U.inRange(i.date, from, to));
  };
  A.returnInvoices = function (from, to) {
    return Store.data.invoices.filter((i) => i.type === 'return' && U.inRange(i.date, from, to));
  };
  A.purchases = function (from, to) {
    return Store.data.purchases.filter((p) => p.type === 'purchase' && U.inRange(p.date, from, to));
  };
  A.purchaseReturns = function (from, to) {
    return Store.data.purchases.filter((p) => p.type === 'return' && U.inRange(p.date, from, to));
  };
  A.expenses = function (from, to) {
    return Store.data.expenses.filter((e) => U.inRange(e.date, from, to));
  };

  A.salesSummary = function (from, to) {
    const sales = A.salesInvoices(from, to);
    const returns = A.returnInvoices(from, to);
    const gross = round2(sum(sales, (i) => i.subtotal));
    const discount = round2(sum(sales, (i) => i.discount));
    const tax = round2(sum(sales, (i) => i.tax));
    const total = round2(sum(sales, (i) => i.total));
    const paid = round2(sum(sales, (i) => i.paid));
    const due = round2(sum(sales, (i) => i.due));
    const cogs = round2(sum(sales, (i) => sum(i.items, (it) => it.cost * it.qty)));
    const netSales = round2(gross - discount);
    const profit = round2(netSales - cogs);
    const returnTotal = round2(sum(returns, (i) => i.total));
    const returnNet = round2(sum(returns, (i) => i.subtotal));
    const returnCost = round2(sum(returns, (i) => sum(i.items, (it) => it.cost * it.qty)));
    return {
      count: sales.length, gross, discount, tax, total, paid, due, cogs, netSales, profit,
      returnCount: returns.length, returnTotal, returnNet, returnCost,
      netRevenue: round2(netSales - returnNet),
      netProfit: round2(profit - (returnNet - returnCost)),
      avgTicket: sales.length ? round2(total / sales.length) : 0,
      margin: netSales ? round2(profit / netSales * 100) : 0
    };
  };

  A.salesByDay = function (from, to) {
    const days = U.daysRange(from, to);
    const sales = A.salesInvoices(from, to);
    const returns = A.returnInvoices(from, to);
    const map = {};
    days.forEach((d) => { map[d] = { date: d, total: 0, net: 0, count: 0, profit: 0, returns: 0 }; });
    sales.forEach((i) => {
      if (!map[i.date]) map[i.date] = { date: i.date, total: 0, net: 0, count: 0, profit: 0, returns: 0 };
      map[i.date].total += i.total;
      map[i.date].net += i.subtotal - i.discount;
      map[i.date].count += 1;
      map[i.date].profit += i.profit || 0;
    });
    returns.forEach((i) => {
      if (!map[i.date]) map[i.date] = { date: i.date, total: 0, net: 0, count: 0, profit: 0, returns: 0 };
      map[i.date].returns += i.total;
    });
    return Object.values(map).map((r) => ({
      ...r, total: round2(r.total), net: round2(r.net), profit: round2(r.profit), returns: round2(r.returns)
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  A.salesByProduct = function (from, to) {
    const map = {};
    const add = (inv, sign) => {
      inv.items.forEach((item) => {
        const key = item.productId;
        const net = saleLineNet(inv, item) * sign;
        const qty = item.qty * sign;
        const cost = (Number(item.cost) || 0) * item.qty * sign;
        if (!map[key]) map[key] = {
          productId: key, name: item.name, emoji: item.emoji || '📦', sku: item.sku,
          categoryId: item.categoryId, qty: 0, revenue: 0, cost: 0, profit: 0
        };
        map[key].qty += qty;
        map[key].revenue += net;
        map[key].cost += cost;
      });
    };
    A.salesInvoices(from, to).forEach((i) => add(i, 1));
    A.returnInvoices(from, to).forEach((i) => add(i, -1));
    return Object.values(map).map((r) => ({
      ...r, qty: round2(r.qty), revenue: round2(r.revenue), cost: round2(r.cost),
      profit: round2(r.revenue - r.cost), margin: r.revenue ? round2((r.revenue - r.cost) / r.revenue * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);
  };

  A.salesByCategory = function (from, to) {
    const products = A.salesByProduct(from, to);
    const map = {};
    products.forEach((p) => {
      const cat = Store.category(p.categoryId);
      const key = cat ? cat.id : 'other';
      if (!map[key]) map[key] = { id: key, name: cat ? cat.name : 'غير مصنف', color: cat ? cat.color : '#7d8d85', revenue: 0, qty: 0, profit: 0 };
      map[key].revenue += p.revenue;
      map[key].qty += p.qty;
      map[key].profit += p.profit;
    });
    return Object.values(map).map((r) => ({
      ...r, revenue: round2(r.revenue), qty: round2(r.qty), profit: round2(r.profit)
    })).sort((a, b) => b.revenue - a.revenue);
  };

  A.salesByCashier = function (from, to) {
    const map = {};
    A.salesInvoices(from, to).forEach((i) => {
      const key = i.cashierId || 'unknown';
      if (!map[key]) map[key] = { id: key, name: i.cashierName || 'غير محدد', total: 0, count: 0, profit: 0 };
      map[key].total += i.total;
      map[key].count += 1;
      map[key].profit += i.profit || 0;
    });
    return Object.values(map).map((r) => ({ ...r, total: round2(r.total), profit: round2(r.profit) })).sort((a, b) => b.total - a.total);
  };

  A.salesByBranch = function (from, to) {
    const map = {};
    A.salesInvoices(from, to).forEach((i) => {
      const key = i.branchId || 'main';
      if (!map[key]) map[key] = { id: key, name: Store.branchName(key), total: 0, count: 0, profit: 0 };
      map[key].total += i.total;
      map[key].count += 1;
      map[key].profit += i.profit || 0;
    });
    return Object.values(map).map((r) => ({ ...r, total: round2(r.total), profit: round2(r.profit) })).sort((a, b) => b.total - a.total);
  };

  A.paymentBreakdown = function (from, to) {
    const map = {};
    A.salesInvoices(from, to).forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        const key = p.method || 'cash';
        map[key] = map[key] || { method: key, label: methodLabel(key), amount: 0, count: 0 };
        map[key].amount += p.amount;
        map[key].count += 1;
      });
    });
    return Object.values(map).map((r) => ({ ...r, amount: round2(r.amount) })).sort((a, b) => b.amount - a.amount);
  };

  A.expenseBreakdown = function (from, to) {
    const map = {};
    A.expenses(from, to).forEach((e) => {
      const key = e.accountId;
      if (!map[key]) map[key] = { id: key, name: e.accountName || Store.accountName(key), total: 0, count: 0 };
      map[key].total += e.total;
      map[key].count += 1;
    });
    return Object.values(map).map((r) => ({ ...r, total: round2(r.total) })).sort((a, b) => b.total - a.total);
  };

  A.inventoryValuation = function () {
    const products = Store.data.products.filter((p) => p.active !== false);
    return {
      products,
      units: round2(sum(products, (p) => p.stock)),
      costValue: round2(sum(products, (p) => p.stock * p.cost)),
      retailValue: round2(sum(products, (p) => p.stock * p.price)),
      potentialProfit: round2(sum(products, (p) => p.stock * (p.price - p.cost))),
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= (p.reorderLevel || 10)).length,
      outOfStock: products.filter((p) => p.stock <= 0).length
    };
  };

  A.aging = function (type) {
    const isCustomer = type === 'customer';
    const parties = isCustomer ? Store.data.customers : Store.data.suppliers;
    const docs = isCustomer ? Store.data.invoices.filter((i) => i.type === 'sale') : Store.data.purchases.filter((p) => p.type === 'purchase');
    const rows = [];
    const totals = { current: 0, d30: 0, d60: 0, d90: 0, total: 0 };
    parties.forEach((party) => {
      const balance = isCustomer ? A.customerBalance(party.id) : A.supplierBalance(party.id);
      if (balance <= 0.01) return;
      const partyDocs = docs.filter((d) => (isCustomer ? d.customerId : d.supplierId) === party.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      let remaining = balance;
      const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
      const items = [];
      partyDocs.forEach((doc) => {
        if (remaining <= 0.01) return;
        const open = round2((doc.total || 0) - (doc.paid || 0));
        if (open <= 0) return;
        const alloc = round2(Math.min(remaining, open));
        const age = U.daysBetween(doc.date, U.today());
        const bucket = age <= 30 ? 'current' : age <= 60 ? 'd30' : age <= 90 ? 'd60' : 'd90';
        buckets[bucket] += alloc;
        items.push({ number: doc.number, date: doc.date, age, amount: alloc, total: open });
        remaining = round2(remaining - alloc);
      });
      if (remaining > 0.01) {
        buckets.d90 += remaining;
        items.push({ number: 'رصيد افتتاحي', date: null, age: 999, amount: remaining, total: remaining });
      }
      Object.keys(buckets).forEach((k) => { buckets[k] = round2(buckets[k]); totals[k] += buckets[k]; });
      totals.total += balance;
      rows.push({ id: party.id, name: party.name, phone: party.phone, balance: round2(balance), buckets, items });
    });
    Object.keys(totals).forEach((k) => { totals[k] = round2(totals[k]); });
    return { rows: rows.sort((a, b) => b.balance - a.balance), totals };
  };

  A.trialBalance = function (from, to) {
    const map = A.balances(from, to);
    const rows = Store.data.accounts.filter((a) => !a.isGroup).map((a) => {
      const m = map[a.id] || { debit: 0, credit: 0, balance: 0 };
      return {
        id: a.id, code: a.code, name: a.name, type: a.type,
        debit: round2(m.debit), credit: round2(m.credit),
        balance: round2(m.balance),
        debitBalance: m.balance > 0 ? round2(m.balance) : 0,
        creditBalance: m.balance < 0 ? round2(-m.balance) : 0
      };
    }).filter((r) => r.debit || r.credit);
    return {
      rows,
      totals: {
        debit: round2(sum(rows, (r) => r.debit)),
        credit: round2(sum(rows, (r) => r.credit)),
        debitBalance: round2(sum(rows, (r) => r.debitBalance)),
        creditBalance: round2(sum(rows, (r) => r.creditBalance))
      }
    };
  };

  A.incomeStatement = function (from, to) {
    const map = A.balances(from, to);
    const revenueAccounts = Store.data.accounts.filter((a) => !a.isGroup && a.type === 'revenue');
    const expenseAccounts = Store.data.accounts.filter((a) => !a.isGroup && a.type === 'expense');
    const revenue = revenueAccounts.map((a) => ({
      account: a, amount: round2(-(map[a.id] ? map[a.id].balance : 0))
    })).filter((r) => r.amount !== 0);
    const expenses = expenseAccounts.map((a) => ({
      account: a, amount: round2(map[a.id] ? map[a.id].balance : 0)
    })).filter((r) => r.amount !== 0);
    const totalRevenue = round2(sum(revenue, (r) => r.amount));
    const cogsRow = expenses.find((e) => e.account.id === ACC.cogs);
    const cogs = cogsRow ? cogsRow.amount : 0;
    const operating = expenses.filter((e) => e.account.id !== ACC.cogs);
    const totalExpenses = round2(sum(operating, (e) => e.amount));
    const grossProfit = round2(totalRevenue - cogs);
    const netProfit = round2(grossProfit - totalExpenses);
    return {
      revenue, totalRevenue, cogs, grossProfit, operating, totalExpenses, netProfit,
      margin: totalRevenue ? round2(netProfit / totalRevenue * 100) : 0,
      grossMargin: totalRevenue ? round2(grossProfit / totalRevenue * 100) : 0
    };
  };

  A.balanceSheet = function (asOf) {
    const map = A.balances(null, asOf);
    const leaf = (type) => Store.data.accounts.filter((a) => !a.isGroup && a.type === type)
      .map((a) => ({ account: a, amount: round2(map[a.id] ? map[a.id].balance : 0) }))
      .filter((r) => Math.abs(r.amount) > 0.004);
    const assets = leaf('asset').map((r) => ({ ...r, display: r.amount }));
    const liabilities = leaf('liability').map((r) => ({ ...r, display: round2(-r.amount) }));
    const equity = leaf('equity').map((r) => ({ ...r, display: round2(-r.amount) }));
    const totalAssets = round2(sum(assets, (r) => r.display));
    const totalLiabilities = round2(sum(liabilities, (r) => r.display));
    const totalEquity = round2(sum(equity, (r) => r.display));
    const inc = A.incomeStatement(null, asOf);
    const currentEarnings = inc.netProfit;
    return {
      assets, liabilities, equity, currentEarnings,
      totalAssets, totalLiabilities, totalEquity,
      totalLiabilitiesEquity: round2(totalLiabilities + totalEquity + currentEarnings),
      difference: round2(totalAssets - (totalLiabilities + totalEquity + currentEarnings)),
      asOf
    };
  };

  A.vatReport = function (from, to) {
    const output = round2(-A.accountBalance(ACC.vatOutput, to, from));
    const input = round2(A.accountBalance(ACC.vatInput, to, from));
    const sales = A.salesInvoices(from, to);
    const returns = A.returnInvoices(from, to);
    const purchases = A.purchases(from, to);
    const pReturns = A.purchaseReturns(from, to);
    const salesBase = round2(sum(sales, (i) => i.subtotal - i.discount) - sum(returns, (i) => i.subtotal));
    const purchasesBase = round2(sum(purchases, (i) => i.subtotal - i.discount) - sum(pReturns, (i) => i.subtotal));
    return {
      output, input, net: round2(output - input),
      salesBase, purchasesBase,
      salesTax: round2(sum(sales, (i) => i.tax) - sum(returns, (i) => i.tax)),
      purchasesTax: round2(sum(purchases, (i) => i.tax) - sum(pReturns, (i) => i.tax)),
      salesCount: sales.length, purchasesCount: purchases.length
    };
  };

  A.ledger = function (accountId, from, to) {
    const account = Store.account(accountId);
    if (!account) return { account: null, opening: 0, rows: [], closing: 0 };
    const ids = account.isGroup ? A.leafIdsUnder(accountId) : [accountId];
    const rows = [];
    let opening = 0;
    Store.data.journal.forEach((entry) => {
      entry.lines.forEach((l) => {
        if (!ids.includes(l.accountId)) return;
        const dr = Number(l.debit) || 0;
        const cr = Number(l.credit) || 0;
        const net = dr - cr;
        if (from && entry.date < from) { opening += net; return; }
        if (to && entry.date > to) return;
        rows.push({
          id: entry.id + l.accountId, entryId: entry.id, date: entry.date, number: entry.number,
          description: entry.description, sourceType: entry.sourceType,
          accountName: l.accountName, memo: l.memo, debit: dr, credit: cr, net
        });
      });
    });
    rows.sort((a, b) => (a.date === b.date ? String(a.number).localeCompare(String(b.number)) : a.date.localeCompare(b.date)));
    let running = opening;
    rows.forEach((r) => { running += r.net; r.balance = round2(running); });
    return { account, opening: round2(opening), rows, closing: round2(running) };
  };

  A.dailyClose = function (date) {
    date = date || U.today();
    const prev = U.addDays(date, -1);
    const openingCash = A.accountBalance(ACC.cash, prev);
    const sales = Store.data.invoices.filter((i) => i.type === 'sale' && i.date === date);
    const returns = Store.data.invoices.filter((i) => i.type === 'return' && i.date === date);
    const expenses = Store.data.expenses.filter((e) => e.date === date);
    const receipts = Store.data.payments.filter((p) => p.type === 'receipt' && p.date === date);
    const supplierPays = Store.data.payments.filter((p) => p.type === 'payment' && p.date === date);
    const transfers = Store.data.transfers.filter((t) => t.date === date);
    const cashSales = round2(sum(sales, (i) => sum((i.payments || []).filter((p) => p.method === 'cash'), (p) => p.amount)));
    const cardSales = round2(sum(sales, (i) => sum((i.payments || []).filter((p) => p.method !== 'cash'), (p) => p.amount)));
    const creditSales = round2(sum(sales, (i) => i.due));
    const cashReturns = round2(sum(returns, (i) => i.refundMethod === 'cash' ? i.total : 0));
    const cashExpenses = round2(sum(expenses.filter((e) => e.method === 'cash'), (e) => e.total));
    const cashReceipts = round2(sum(receipts.filter((p) => p.method === 'cash'), (p) => p.amount));
    const cashSupplier = round2(sum(supplierPays.filter((p) => p.method === 'cash'), (p) => p.amount));
    const cashIn = round2(sum(transfers.filter((t) => t.toAccountId === ACC.cash), (t) => t.amount));
    const cashOut = round2(sum(transfers.filter((t) => t.fromAccountId === ACC.cash), (t) => t.amount));
    const expected = round2(openingCash + cashSales - cashReturns + cashReceipts - cashExpenses - cashSupplier + cashIn - cashOut);
    const actual = A.accountBalance(ACC.cash, date);
    const byMethod = A.paymentBreakdown(date, date);
    return {
      date, openingCash, cashSales, cardSales, creditSales, cashReturns, cashExpenses,
      cashReceipts, cashSupplier, cashIn, cashOut, expected, actual,
      difference: round2(actual - expected),
      salesCount: sales.length, returnCount: returns.length,
      totalSales: round2(sum(sales, (i) => i.total)),
      totalReturns: round2(sum(returns, (i) => i.total)),
      totalTax: round2(sum(sales, (i) => i.tax)),
      totalDiscount: round2(sum(sales, (i) => i.discount)),
      byMethod, expenses: round2(sum(expenses, (e) => e.total)),
      topProducts: A.salesByProduct(date, date).slice(0, 5)
    };
  };

  A.topCustomers = function (from, to, limit = 5) {
    const map = {};
    A.salesInvoices(from, to).forEach((i) => {
      if (!i.customerId) return;
      if (!map[i.customerId]) map[i.customerId] = { id: i.customerId, name: i.customerName, total: 0, count: 0 };
      map[i.customerId].total += i.total;
      map[i.customerId].count += 1;
    });
    return Object.values(map).map((r) => ({ ...r, total: round2(r.total) })).sort((a, b) => b.total - a.total).slice(0, limit);
  };

  A.receivables = function () {
    return round2(sum(Store.data.customers, (c) => A.customerBalance(c.id)));
  };
  A.payables = function () {
    return round2(sum(Store.data.suppliers, (s) => A.supplierBalance(s.id)));
  };
  A.cashBalance = function () { return A.accountBalance(ACC.cash); };
  A.bankBalance = function () { return A.accountBalance(ACC.bank); };
  A.inventoryValue = function () {
    return round2(sum(Store.data.products, (p) => p.stock * p.cost));
  };

  A.todayStats = function () {
    const today = U.today();
    const yesterday = U.addDays(today, -1);
    const t = A.salesSummary(today, today);
    const y = A.salesSummary(yesterday, yesterday);
    const month = A.salesSummary(U.startOfMonth(today), today);
    const lastMonthDate = U.addMonths(today, -1);
    const lm = A.salesSummary(U.startOfMonth(lastMonthDate), U.endOfMonth(lastMonthDate));
    return { today: t, yesterday: y, month, lastMonth: lm };
  };

  A.totalJournalDebit = function () {
    return round2(sum(Store.data.journal, (e) => sum(e.lines, (l) => l.debit)));
  };
  A.totalJournalCredit = function () {
    return round2(sum(Store.data.journal, (e) => sum(e.lines, (l) => l.credit)));
  };
})();
