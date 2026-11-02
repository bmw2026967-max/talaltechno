/* ==========================================================================
   Page — Reports center (sales, products, customers, purchases, inventory)
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const A = Accounting;
  const state = {
    tab: 'overview',
    from: U.startOfMonth(U.today()),
    to: U.today(),
    metric: 'total'
  };

  const COLORS = ['#0e5a44', '#2563a8', '#a97c28', '#6d4fa3', '#b13a33', '#0f766e', '#7c5c2e', '#c26a3d'];
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

  const rangeLabel = () => `${U.formatDate(state.from)} — ${U.formatDate(state.to)}`;

  function pctChange(cur, prev) {
    if (!prev) return cur ? 100 : 0;
    return U.round2((cur - prev) / Math.abs(prev) * 100);
  }

  function prevRange() {
    const days = Math.max(1, U.daysBetween(state.from, state.to) + 1);
    const prevTo = U.addDays(state.from, -1);
    return { from: U.addDays(prevTo, -(days - 1)), to: prevTo };
  }

  function rangeToolbar() {
    return `<div data-range>${PK.rangeInputs(state.from, state.to)}</div>`;
  }

  function headerHtml() {
    return `<div class="page-head">
      <div><div class="page-title">مركز التقارير</div><div class="page-sub">تحليلات المبيعات والأرباح والمخزون والعملاء والموردين — محدّثة لحظياً من قيودك</div></div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" data-export>${U.icon('download', 14)} تصدير CSV</button>
        <button class="btn btn-primary" data-print>${U.icon('print', 16)} طباعة التقرير</button>
      </div>
    </div>`;
  }

  function tabsHtml() {
    const tabs = [
      ['overview', 'نظرة عامة', 'pie', null],
      ['sales', 'المبيعات', 'receipt', null],
      ['products', 'المنتجات', 'tag', null],
      ['customers', 'العملاء', 'users', null],
      ['purchases', 'المشتريات', 'truck', null],
      ['inventory', 'المخزون', 'box', null]
    ];
    return `<div class="tabs">${tabs.map(([id, label, icon]) =>
      `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${U.icon(icon, 15)} ${label}</button>`).join('')}</div>`;
  }

  function statusOf(inv) {
    if (inv.type === 'return') return 'return';
    if ((inv.due || 0) <= 0.01) return 'paid';
    return (inv.paid || 0) > 0.01 ? 'partial' : 'unpaid';
  }

  function customerAgg(from, to) {
    const map = {};
    A.salesInvoices(from, to).forEach((inv) => {
      const key = inv.customerId || 'cash';
      if (!map[key]) map[key] = { id: inv.customerId, name: inv.customerName || 'عميل نقدي', phone: '', count: 0, total: 0, paid: 0, due: 0 };
      map[key].count += 1;
      map[key].total += inv.total || 0;
      map[key].paid += inv.paid || 0;
      map[key].due += inv.due || 0;
    });
    A.returnInvoices(from, to).forEach((inv) => {
      const key = inv.customerId || 'cash';
      if (!map[key]) map[key] = { id: inv.customerId, name: inv.customerName || 'عميل نقدي', phone: '', count: 0, total: 0, paid: 0, due: 0 };
      map[key].total -= inv.total || 0;
    });
    Object.values(map).forEach((r) => {
      r.total = U.round2(r.total); r.paid = U.round2(r.paid); r.due = U.round2(r.due);
      const customer = r.id ? Store.customer(r.id) : null;
      r.phone = customer ? customer.phone || '' : '';
      r.balance = r.id ? A.customerBalance(r.id) : 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  function supplierAgg(from, to) {
    const map = {};
    A.purchases(from, to).forEach((p) => {
      const key = p.supplierId || 'unknown';
      if (!map[key]) map[key] = { id: p.supplierId, name: p.supplierName || 'مورد', count: 0, total: 0, paid: 0, due: 0 };
      map[key].count += 1;
      map[key].total += p.total || 0;
      map[key].paid += p.paid || 0;
      map[key].due += p.due || 0;
    });
    A.purchaseReturns(from, to).forEach((p) => {
      const key = p.supplierId || 'unknown';
      if (!map[key]) map[key] = { id: p.supplierId, name: p.supplierName || 'مورد', count: 0, total: 0, paid: 0, due: 0 };
      map[key].total -= p.total || 0;
    });
    Object.values(map).forEach((r) => {
      r.total = U.round2(r.total); r.paid = U.round2(r.paid); r.due = U.round2(r.due);
      r.balance = r.id ? A.supplierBalance(r.id) : 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  /* ---------- Overview ---------- */
  function overviewContent() {
    const sum = A.salesSummary(state.from, state.to);
    const prev = prevRange();
    const prevSum = A.salesSummary(prev.from, prev.to);
    const trend = A.salesByDay(state.from, state.to);
    const cats = A.salesByCategory(state.from, state.to);
    const payments = A.paymentBreakdown(state.from, state.to);
    const branches = A.salesByBranch(state.from, state.to);
    const top = A.salesByProduct(state.from, state.to).slice(0, 6);
    const vat = A.vatReport(state.from, state.to);
    const inv = A.inventoryValuation();

    const catItems = cats.slice(0, 7).map((c, i) => ({ label: c.name, value: c.revenue, color: c.color || COLORS[i % COLORS.length], display: U.moneyShort(c.revenue) }));
    const payItems = payments.map((p, i) => ({ label: p.label, value: p.amount, color: COLORS[i % COLORS.length], display: U.moneyShort(p.amount) }));
    const topMax = top.length ? Math.max(...top.map((p) => p.revenue), 1) : 1;

    return `${rangeToolbar()}
      <div class="kpi-grid">
        ${PK.kpi({ label: 'صافي المبيعات', value: U.money(sum.netRevenue), icon: 'trendingUp', tone: 'green', sub: `${U.num(sum.count, 0)} فاتورة • متوسط ${U.money(sum.avgTicket)}`, delta: PK.delta(pctChange(sum.netRevenue, prevSum.netRevenue)) })}
        ${PK.kpi({ label: 'إجمالي الربح', value: U.money(sum.netProfit), icon: 'coins', tone: 'gold', sub: `هامش <b>${U.pct(sum.margin)}</b> • تكلفة ${U.moneyShort(sum.cogs)}`, delta: PK.delta(pctChange(sum.netProfit, prevSum.netProfit)) })}
        ${PK.kpi({ label: 'ضريبة القيمة المضافة', value: U.money(vat.net), icon: 'percent', tone: 'blue', sub: `مخرجات ${U.moneyShort(vat.output)} • مدخلات ${U.moneyShort(vat.input)}` })}
        ${PK.kpi({ label: 'قيمة المخزون', value: U.money(inv.costValue), icon: 'box', tone: 'purple', sub: `<b>${U.num(inv.units, 0)}</b> وحدة • ${inv.lowStock} منخفض` })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('chart', 18)} اتجاه المبيعات</div><div class="card-sub">${rangeLabel()}</div></div>
            <span class="badge badge-green">${U.icon('checkCircle', 11)} ${U.num(sum.count, 0)} فاتورة</span></div>
          <div class="card-body"><div id="rep-trend" class="chart-box"></div></div>
          <div class="card-foot"><div class="chart-legend"><span class="legend-item"><span class="legend-dot" style="background:var(--brand-2)"></span> إجمالي المبيعات</span></div>
            <span class="text-muted text-xs">الذروة ${U.moneyShort(Math.max(...trend.map((d) => d.total), 0))}</span></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('pie', 18)} المبيعات حسب الفئة</div><div class="card-sub">صافي الإيراد بعد المرتجعات</div></div></div>
          <div class="card-body">${catItems.length ? UI.donut(catItems, 'إجمالي المبيعات', U.moneyShort(sum.netRevenue)) : UI.empty('pie', 'لا توجد مبيعات', 'اختر فترة أخرى أو ابدأ البيع من نقطة البيع')}</div>
        </div>
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('tag', 18)} أفضل المنتجات</div><div class="card-sub">حسب صافي الإيراد</div></div>
            <span class="text-muted text-xs">${top.length} منتج</span></div>
          <div class="card-body">
            <div class="bar-list">${top.map((p) => `<div class="bar-row">
              <div class="bar-top"><span class="bar-name"><span class="em">${p.emoji || '📦'}</span> ${U.esc(p.name)}</span><span class="bar-value">${U.money(p.revenue)}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${U.clamp(p.revenue / topMax * 100, 2, 100)}%"></div></div>
            </div>`).join('') || UI.empty('tag', 'لا توجد مبيعات', 'لم تُبع أي منتجات في الفترة المحددة')}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('card', 18)} طرق الدفع</div><div class="card-sub">التحصيلات المسجلة على الفواتير</div></div></div>
          <div class="card-body">${payItems.length ? UI.donut(payItems, 'إجمالي المحصل', U.moneyShort(U.sum(payments, (p) => p.amount))) : UI.empty('card', 'لا توجد تحصيلات', 'كل الفواتير آجلة أو لم تُسجل مدفوعات')}</div>
          <div class="card-foot"><span class="text-muted text-xs">مستحق على العملاء</span><b class="text-danger">${U.money(A.receivables())}</b></div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('map', 18)} أداء الفروع</div><div class="card-sub">المبيعات والربح لكل فرع</div></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>الفرع</th><th>الفواتير</th><th>المبيعات</th><th>الربح</th><th>متوسط الفاتورة</th><th>المساهمة</th></tr></thead>
          <tbody>${branches.map((b) => {
            const share = sum.total ? b.total / sum.total * 100 : 0;
            return `<tr><td><div class="cell-main">${U.esc(b.name)}</div></td>
              <td>${U.num(b.count, 0)}</td>
              <td class="num fw-800">${U.money(b.total)}</td>
              <td class="num text-success">${U.money(b.profit)}</td>
              <td class="num">${U.money(b.count ? b.total / b.count : 0)}</td>
              <td style="min-width:130px"><div class="bar-track"><div class="bar-fill" style="width:${U.clamp(share, 2, 100)}%"></div></div><div class="cell-sub">${U.pct(share)}</div></td></tr>`;
          }).join('') || PK.emptyRow(6, 'map', 'لا توجد مبيعات', 'لم تُسجل فواتير في هذه الفترة')}</tbody>
        </table></div>
      </div>`;
  }

  /* ---------- Sales ---------- */
  function salesContent() {
    const sum = A.salesSummary(state.from, state.to);
    const prev = prevRange();
    const prevSum = A.salesSummary(prev.from, prev.to);
    const trend = A.salesByDay(state.from, state.to);
    const cashiers = A.salesByCashier(state.from, state.to);
    const branches = A.salesByBranch(state.from, state.to);
    const payments = A.paymentBreakdown(state.from, state.to);
    const invoices = Store.data.invoices.filter((i) => i.type !== 'quote' && U.inRange(i.date, state.from, state.to))
      .sort((a, b) => String(b.date + (b.createdAt || '')).localeCompare(String(a.date + (a.createdAt || ''))))
      .slice(0, 90);
    const metric = state.metric;
    const values = trend.map((d) => metric === 'profit' ? d.profit : metric === 'count' ? d.count : d.total);
    const metricLabel = metric === 'profit' ? 'الأرباح' : metric === 'count' ? 'عدد الفواتير' : 'المبيعات';

    return `${rangeToolbar()}
      <div class="kpi-grid">
        ${PK.kpi({ label: 'إجمالي المبيعات', value: U.money(sum.total), icon: 'receipt', tone: 'green', sub: `قبل الخصم ${U.moneyShort(sum.gross)} • ضريبة ${U.moneyShort(sum.tax)}`, delta: PK.delta(pctChange(sum.total, prevSum.total)) })}
        ${PK.kpi({ label: 'صافي المبيعات', value: U.money(sum.netRevenue), icon: 'trendingUp', tone: 'blue', sub: `خصومات <b>${U.moneyShort(sum.discount)}</b> • مرتجعات <b>${U.moneyShort(sum.returnTotal)}</b>` })}
        ${PK.kpi({ label: 'إجمالي الربح', value: U.money(sum.netProfit), icon: 'coins', tone: 'gold', sub: `هامش ${U.pct(sum.margin)} • تكلفة ${U.moneyShort(sum.cogs)}` })}
        ${PK.kpi({ label: 'المستحق على العملاء', value: U.money(sum.due), icon: 'clock', tone: 'red', sub: `محصل <b>${U.moneyShort(sum.paid)}</b> من أصل ${U.moneyShort(sum.total)}` })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('chart', 18)} حركة المبيعات اليومية</div><div class="card-sub">${rangeLabel()}</div></div>
            <div class="segmented" data-metric>
              <button class="${metric === 'total' ? 'active' : ''}" data-metric-value="total">المبيعات</button>
              <button class="${metric === 'profit' ? 'active' : ''}" data-metric-value="profit">الأرباح</button>
              <button class="${metric === 'count' ? 'active' : ''}" data-metric-value="count">الفواتير</button>
            </div></div>
          <div class="card-body"><div id="rep-sales-trend" class="chart-box"></div></div>
          <div class="card-foot"><span class="text-muted text-xs">المعروض: <b>${metricLabel}</b></span><span class="text-muted text-xs">${trend.length} يوم</span></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('card', 18)} طرق التحصيل</div></div></div>
            <div class="card-body">${payments.length ? UI.donut(payments.map((p, i) => ({ label: p.label, value: p.amount, color: COLORS[i % COLORS.length], display: U.moneyShort(p.amount) })), 'إجمالي المحصل', U.moneyShort(sum.paid)) : UI.empty('card', 'لا توجد تحصيلات')}</div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('percent', 18)} ملخص الضريبة</div></div></div>
            <div class="card-body">
              <div class="z-row"><span>وعاء المبيعات</span><b>${U.money(A.vatReport(state.from, state.to).salesBase)}</b></div>
              <div class="z-row"><span>ضريبة المخرجات</span><b>${U.money(A.vatReport(state.from, state.to).salesTax)}</b></div>
              <div class="z-row"><span>ضريبة المدخلات</span><b>${U.money(A.vatReport(state.from, state.to).input)}</b></div>
              <div class="z-row total"><span>صافي الضريبة</span><b>${U.money(A.vatReport(state.from, state.to).net)}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-2 mt-3">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('users', 18)} أداء الكاشير</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>الكاشير</th><th>الفواتير</th><th>المبيعات</th><th>الربح</th></tr></thead>
            <tbody>${cashiers.map((c) => `<tr><td><div class="product-cell">${UI.avatar(c.name, 'sm')}<div class="cell-main">${U.esc(c.name)}</div></div></td><td>${U.num(c.count, 0)}</td><td class="num fw-800">${U.money(c.total)}</td><td class="num text-success">${U.money(c.profit)}</td></tr>`).join('') || PK.emptyRow(4, 'users', 'لا توجد مبيعات')}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('map', 18)} أداء الفروع</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>الفرع</th><th>الفواتير</th><th>المبيعات</th><th>المساهمة</th></tr></thead>
            <tbody>${branches.map((b) => `<tr><td class="cell-main">${U.esc(b.name)}</td><td>${U.num(b.count, 0)}</td><td class="num fw-800">${U.money(b.total)}</td><td class="num">${U.pct(sum.total ? b.total / sum.total * 100 : 0)}</td></tr>`).join('') || PK.emptyRow(4, 'map', 'لا توجد مبيعات')}</tbody>
          </table></div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('receipt', 18)} تفاصيل الفواتير والمرتجعات</div><div class="card-sub">أحدث ${invoices.length} مستند في الفترة</div></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>المستند</th><th>التاريخ</th><th>العميل</th><th>الكاشير</th><th>الفرع</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
          <tbody>${invoices.map((i) => `<tr data-invoice="${i.id}" style="cursor:pointer">
            <td><div class="cell-main">${U.esc(i.number)}</div><div class="cell-sub">${i.type === 'return' ? 'مرتجع بيع' : 'فاتورة بيع'}</div></td>
            <td class="nowrap">${U.formatDate(i.date)}</td>
            <td><div class="cell-main">${U.esc(i.customerName || 'عميل نقدي')}</div></td>
            <td>${U.esc(i.cashierName || '—')}</td>
            <td>${U.esc(Store.branchName(i.branchId))}</td>
            <td class="num fw-800">${U.money(i.total)}</td>
            <td class="num">${U.money(i.paid)}</td>
            <td class="num ${i.due > 0.01 ? 'text-danger' : ''}">${U.money(i.due)}</td>
            <td>${UI.statusBadge(statusOf(i))}</td></tr>`).join('') || PK.emptyRow(9, 'receipt', 'لا توجد فواتير', 'لم تُسجل مبيعات في الفترة المحددة')}</tbody>
        </table></div>
      </div>`;
  }

  /* ---------- Products ---------- */
  function productsContent() {
    const products = A.salesByProduct(state.from, state.to);
    const cats = A.salesByCategory(state.from, state.to);
    const sum = A.salesSummary(state.from, state.to);
    const units = U.sum(products, (p) => p.qty);
    const maxRev = products.length ? Math.max(...products.map((p) => p.revenue), 1) : 1;
    const catItems = cats.slice(0, 8).map((c, i) => ({ label: c.name, value: c.revenue, color: c.color || COLORS[i % COLORS.length], display: U.moneyShort(c.revenue) }));

    return `${rangeToolbar()}
      <div class="kpi-grid">
        ${PK.kpi({ label: 'منتجات مباعة', value: U.num(products.length, 0), icon: 'tag', tone: 'green', sub: `<b>${U.num(units, 0)}</b> وحدة مباعة` })}
        ${PK.kpi({ label: 'صافي إيراد المنتجات', value: U.money(U.sum(products, (p) => p.revenue)), icon: 'trendingUp', tone: 'blue', sub: `إجمالي المبيعات ${U.moneyShort(sum.total)}` })}
        ${PK.kpi({ label: 'تكلفة المبيعات', value: U.money(U.sum(products, (p) => p.cost)), icon: 'box', tone: 'purple', sub: `هامش إجمالي <b>${U.pct(sum.margin)}</b>` })}
        ${PK.kpi({ label: 'ربح المنتجات', value: U.money(U.sum(products, (p) => p.profit)), icon: 'coins', tone: 'gold', sub: `متوسط ربح الوحدة ${U.money(units ? U.sum(products, (p) => p.profit) / units : 0)}` })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('tag', 18)} أداء المنتجات</div><div class="card-sub">مرتبة حسب صافي الإيراد</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>المنتج</th><th>الكمية</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>الهامش</th><th>الحصة</th></tr></thead>
            <tbody>${products.map((p) => `<tr>
              <td><div class="product-cell"><div class="thumb sm">${p.emoji || '📦'}</div><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub code">${U.esc(p.sku)}</div></div></div></td>
              <td>${U.num(p.qty, 0)}</td>
              <td class="num fw-800">${U.money(p.revenue)}</td>
              <td class="num">${U.money(p.cost)}</td>
              <td class="num text-success">${U.money(p.profit)}</td>
              <td><span class="badge ${p.margin >= 25 ? 'badge-green' : p.margin >= 10 ? 'badge-amber' : 'badge-red'}">${U.pct(p.margin)}</span></td>
              <td style="min-width:110px"><div class="bar-track"><div class="bar-fill" style="width:${U.clamp(p.revenue / maxRev * 100, 2, 100)}%"></div></div></td>
            </tr>`).join('') || PK.emptyRow(7, 'tag', 'لا توجد مبيعات منتجات', 'لم تُبع أي منتجات في الفترة')}</tbody>
          </table></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('pie', 18)} توزيع الفئات</div></div></div>
            <div class="card-body">${catItems.length ? UI.donut(catItems, 'إجمالي المبيعات', U.moneyShort(sum.netRevenue)) : UI.empty('pie', 'لا توجد بيانات')}</div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('layers', 18)} ملخص الفئات</div></div></div>
            <div class="card-body">
              <div class="mini-list">${cats.map((c) => `<div class="mini-list-item">
                <span class="mi-ico" style="background:${c.color}1a;color:${c.color}">${U.icon('tag', 15)}</span>
                <div class="mi-main"><strong>${U.esc(c.name)}</strong><span>${U.num(c.qty, 0)} وحدة</span></div>
                <div class="mi-val">${U.money(c.revenue)}</div></div>`).join('') || '<div class="text-muted text-sm">لا توجد بيانات</div>'}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Customers ---------- */
  function customersContent() {
    const customers = customerAgg(state.from, state.to);
    const aging = A.aging('customer');
    const top = customers.slice(0, 20);
    const totalSales = U.sum(customers, (c) => c.total);
    const totalDue = U.sum(customers, (c) => c.due);
    const withBalance = aging.rows.length;

    return `${rangeToolbar()}
      <div class="kpi-grid">
        ${PK.kpi({ label: 'عملاء نشطون', value: U.num(customers.length, 0), icon: 'users', tone: 'green', sub: `<b>${withBalance}</b> عميل عليه رصيد مستحق` })}
        ${PK.kpi({ label: 'مبيعات العملاء', value: U.money(totalSales), icon: 'trendingUp', tone: 'blue', sub: `مستحق من الفواتير ${U.moneyShort(totalDue)}` })}
        ${PK.kpi({ label: 'إجمالي المستحقات', value: U.money(aging.totals.total), icon: 'clock', tone: 'red', sub: `متأخر أكثر من 90 يوماً <b>${U.moneyShort(aging.totals.d90)}</b>` })}
        ${PK.kpi({ label: 'أعلى عميل', value: top.length ? U.esc(top[0].name.split(' ').slice(0, 2).join(' ')) : '—', icon: 'award', tone: 'gold', sub: top.length ? `مبيعات ${U.moneyShort(top[0].total)}` : 'لا توجد مبيعات' })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('users', 18)} أعلى العملاء</div><div class="card-sub">حسب المبيعات في الفترة</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>العميل</th><th>الفواتير</th><th>المبيعات</th><th>الرصيد الحالي</th><th></th></tr></thead>
            <tbody>${top.map((c) => `<tr>
              <td><div class="product-cell">${UI.avatar(c.name, 'sm')}<div><div class="cell-main">${U.esc(c.name)}</div><div class="cell-sub">${U.esc(c.phone || '—')}</div></div></div></td>
              <td>${U.num(c.count, 0)}</td>
              <td class="num fw-800">${U.money(c.total)}</td>
              <td class="num ${c.balance > 0 ? 'text-danger' : 'text-muted'}">${U.money(c.balance)}</td>
              <td class="actions-cell"><button class="btn-icon btn-ghost" data-customer-statement="${c.id || ''}" title="كشف الحساب" ${c.id ? '' : 'disabled'}>${U.icon('file', 15)}</button></td>
            </tr>`).join('') || PK.emptyRow(5, 'users', 'لا توجد مبيعات', 'لم تُسجل فواتير لعملاء في هذه الفترة')}</tbody>
          </table></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} أعمار الديون</div></div></div>
            <div class="card-body">
              <div class="aging-bar">
                <span style="width:${aging.totals.total ? aging.totals.current / aging.totals.total * 100 : 0}%;background:#0e5a44"></span>
                <span style="width:${aging.totals.total ? aging.totals.d30 / aging.totals.total * 100 : 0}%;background:#a97c28"></span>
                <span style="width:${aging.totals.total ? aging.totals.d60 / aging.totals.total * 100 : 0}%;background:#c26a3d"></span>
                <span style="width:${aging.totals.total ? aging.totals.d90 / aging.totals.total * 100 : 0}%;background:#b13a33"></span>
              </div>
              <div class="aging-legend">
                <span><i style="background:#0e5a44"></i> حتى 30 يوم</span>
                <span><i style="background:#a97c28"></i> 31–60</span>
                <span><i style="background:#c26a3d"></i> 61–90</span>
                <span><i style="background:#b13a33"></i> أكثر من 90</span>
              </div>
              <div class="z-report mt-3" style="max-width:none;padding:13px">
                <div class="z-row"><span>مستحق حالي</span><b>${U.money(aging.totals.current)}</b></div>
                <div class="z-row"><span>31–60 يوماً</span><b>${U.money(aging.totals.d30)}</b></div>
                <div class="z-row"><span>61–90 يوماً</span><b>${U.money(aging.totals.d60)}</b></div>
                <div class="z-row"><span>أكثر من 90 يوماً</span><b>${U.money(aging.totals.d90)}</b></div>
                <div class="z-row total"><span>إجمالي المستحق</span><b>${U.money(aging.totals.total)}</b></div>
              </div>
            </div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('alert', 18)} عملاء متأخرون</div></div></div>
            <div class="card-body"><div class="mini-list">${aging.rows.slice(0, 6).map((r) => `<div class="mini-list-item">
              <span class="mi-ico" style="background:var(--danger-soft);color:var(--danger)">${U.icon('clock', 15)}</span>
              <div class="mi-main"><strong>${U.esc(r.name)}</strong><span>${r.buckets.d90 > 0 ? 'تجاوز 90 يوماً' : 'مستحق خلال الفترة'}</span></div>
              <div class="mi-val text-danger">${U.money(r.balance)}</div></div>`).join('') || '<div class="text-muted text-sm">لا توجد أرصدة مستحقة</div>'}</div></div>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('scale', 18)} تفصيل أعمار الديون حسب العميل</div><div class="card-sub">مستحق حتى ${U.formatDate(U.today())}</div></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>العميل</th><th>الرصيد</th><th>حتى 30</th><th>31–60</th><th>61–90</th><th>+90</th><th></th></tr></thead>
          <tbody>${aging.rows.map((r) => `<tr>
            <td><div class="cell-main">${U.esc(r.name)}</div><div class="cell-sub">${U.esc(r.phone || '')}</div></td>
            <td class="num fw-800 text-danger">${U.money(r.balance)}</td>
            <td class="num">${U.money(r.buckets.current)}</td>
            <td class="num">${U.money(r.buckets.d30)}</td>
            <td class="num">${U.money(r.buckets.d60)}</td>
            <td class="num text-danger">${U.money(r.buckets.d90)}</td>
            <td class="actions-cell"><button class="btn-icon btn-ghost" data-customer-statement="${r.id}" title="كشف الحساب">${U.icon('file', 15)}</button></td>
          </tr>`).join('') || PK.emptyRow(7, 'checkCircle', 'لا توجد أرصدة مستحقة', 'جميع العملاء مسددون بالكامل')}</tbody>
        </table></div>
      </div>`;
  }

  /* ---------- Purchases ---------- */
  function purchasesContent() {
    const purchases = A.purchases(state.from, state.to);
    const returns = A.purchaseReturns(state.from, state.to);
    const suppliers = supplierAgg(state.from, state.to);
    const aging = A.aging('supplier');
    const total = U.sum(purchases, (p) => p.total);
    const tax = U.sum(purchases, (p) => p.tax);
    const paid = U.sum(purchases, (p) => p.paid);
    const due = U.sum(purchases, (p) => p.due);
    const returnTotal = U.sum(returns, (p) => p.total);
    const list = purchases.slice().sort((a, b) => String(b.date + (b.createdAt || '')).localeCompare(String(a.date + (a.createdAt || '')))).slice(0, 80);

    return `${rangeToolbar()}
      <div class="kpi-grid">
        ${PK.kpi({ label: 'إجمالي المشتريات', value: U.money(total), icon: 'truck', tone: 'blue', sub: `<b>${purchases.length}</b> فاتورة • ضريبة ${U.moneyShort(tax)}` })}
        ${PK.kpi({ label: 'المدفوع للموردين', value: U.money(paid), icon: 'upload', tone: 'green', sub: `${U.pct(total ? paid / total * 100 : 0)} من إجمالي المشتريات` })}
        ${PK.kpi({ label: 'المستحق للموردين', value: U.money(aging.totals.total), icon: 'clock', tone: 'red', sub: `مستحق الفترة <b>${U.moneyShort(due)}</b>` })}
        ${PK.kpi({ label: 'مرتجعات الشراء', value: U.money(returnTotal), icon: 'refresh', tone: 'gold', sub: `<b>${returns.length}</b> مستند مرتجع` })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('truck', 18)} أحدث فواتير الشراء</div><div class="card-sub">أحدث ${list.length} فاتورة في الفترة</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>المورد</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
            <tbody>${list.map((p) => `<tr>
              <td><div class="cell-main">${U.esc(p.number)}</div><div class="cell-sub">${U.esc(p.branchId ? Store.branchName(p.branchId) : '')}</div></td>
              <td class="nowrap">${U.formatDate(p.date)}</td>
              <td>${U.esc(p.supplierName || Store.partyName('supplier', p.supplierId))}</td>
              <td class="num fw-800">${U.money(p.total)}</td>
              <td class="num">${U.money(p.paid)}</td>
              <td class="num ${p.due > 0.01 ? 'text-danger' : ''}">${U.money(p.due)}</td>
              <td>${UI.statusBadge((p.due || 0) <= 0.01 ? 'paid' : (p.paid || 0) > 0.01 ? 'partial' : 'unpaid')}</td>
            </tr>`).join('') || PK.emptyRow(7, 'truck', 'لا توجد مشتريات', 'لم تُسجل فواتير شراء في الفترة')}</tbody>
          </table></div>
        </div>
        <div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('users', 18)} أكبر الموردين</div></div></div>
            <div class="card-body"><div class="mini-list">${suppliers.slice(0, 6).map((s) => `<div class="mini-list-item">
              <span class="mi-ico" style="background:var(--info-soft);color:var(--info)">${U.icon('truck', 15)}</span>
              <div class="mi-main"><strong>${U.esc(s.name)}</strong><span>${U.num(s.count, 0)} فاتورة • مستحق ${U.moneyShort(s.balance)}</span></div>
              <div class="mi-val">${U.moneyShort(s.total)}</div></div>`).join('') || '<div class="text-muted text-sm">لا توجد مشتريات</div>'}</div></div>
          </div>
          <div class="card mt-3">
            <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} أعمار مستحقات الموردين</div></div></div>
            <div class="card-body">
              <div class="z-report" style="max-width:none;padding:13px">
                <div class="z-row"><span>حتى 30 يوماً</span><b>${U.money(aging.totals.current)}</b></div>
                <div class="z-row"><span>31–60 يوماً</span><b>${U.money(aging.totals.d30)}</b></div>
                <div class="z-row"><span>61–90 يوماً</span><b>${U.money(aging.totals.d60)}</b></div>
                <div class="z-row"><span>أكثر من 90</span><b>${U.money(aging.totals.d90)}</b></div>
                <div class="z-row total"><span>إجمالي المستحق</span><b>${U.money(aging.totals.total)}</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('scale', 18)} ملخص الموردين</div></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>المورد</th><th>الفواتير</th><th>المشتريات</th><th>المدفوع</th><th>الرصيد المستحق</th></tr></thead>
          <tbody>${suppliers.map((s) => `<tr><td class="cell-main">${U.esc(s.name)}</td><td>${U.num(s.count, 0)}</td><td class="num fw-800">${U.money(s.total)}</td><td class="num">${U.money(s.paid)}</td><td class="num ${s.balance > 0 ? 'text-danger' : ''}">${U.money(s.balance)}</td></tr>`).join('') || PK.emptyRow(5, 'truck', 'لا توجد بيانات')}</tbody>
        </table></div>
      </div>`;
  }

  /* ---------- Inventory ---------- */
  function inventoryContent() {
    const inv = A.inventoryValuation();
    const cats = Store.data.categories.map((c) => {
      const products = Store.data.products.filter((p) => p.active !== false && p.categoryId === c.id);
      return { id: c.id, name: c.name, color: c.color, count: products.length, units: U.sum(products, (p) => p.stock), cost: U.sum(products, (p) => p.stock * p.cost), retail: U.sum(products, (p) => p.stock * p.price) };
    }).filter((c) => c.count).sort((a, b) => b.cost - a.cost);
    const catItems = cats.slice(0, 8).map((c, i) => ({ label: c.name, value: c.cost, color: c.color || COLORS[i % COLORS.length], display: U.moneyShort(c.cost) }));
    const low = Store.data.products.filter((p) => p.active !== false && p.stock <= (p.reorderLevel || 10))
      .sort((a, b) => a.stock - b.stock);
    const products = Store.data.products.filter((p) => p.active !== false)
      .map((p) => ({ ...p, value: p.stock * p.cost, retailValue: p.stock * p.price }))
      .sort((a, b) => b.value - a.value);

    return `<div class="kpi-grid">
        ${PK.kpi({ label: 'قيمة المخزون بالتكلفة', value: U.money(inv.costValue), icon: 'box', tone: 'green', sub: `<b>${U.num(inv.units, 0)}</b> وحدة في ${inv.products.length} منتج` })}
        ${PK.kpi({ label: 'قيمة المخزون بالبيع', value: U.money(inv.retailValue), icon: 'tag', tone: 'blue', sub: `ربح متوقع ${U.moneyShort(inv.potentialProfit)}` })}
        ${PK.kpi({ label: 'أصناف منخفضة', value: U.num(inv.lowStock, 0), icon: 'alert', tone: 'gold', sub: `حد إعادة الطلب الافتراضي ${Store.data.settings.lowStockGlobal || 10}` })}
        ${PK.kpi({ label: 'أصناف نافدة', value: U.num(inv.outOfStock, 0), icon: 'minusCircle', tone: 'red', sub: `إجمالي الأصناف <b>${Store.data.products.length}</b>` })}
      </div>

      <div class="report-grid">
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('box', 18)} قيمة المخزون حسب الفئة</div></div></div>
          <div class="table-wrap"><table class="table compact">
            <thead><tr><th>الفئة</th><th>الأصناف</th><th>الوحدات</th><th>التكلفة</th><th>قيمة البيع</th><th>الحصة</th></tr></thead>
            <tbody>${cats.map((c) => `<tr><td><span class="badge" style="background:${c.color}1a;color:${c.color}">${U.esc(c.name)}</span></td>
              <td>${U.num(c.count, 0)}</td><td>${U.num(c.units, 0)}</td><td class="num fw-800">${U.money(c.cost)}</td><td class="num">${U.money(c.retail)}</td>
              <td class="num">${U.pct(inv.costValue ? c.cost / inv.costValue * 100 : 0)}</td></tr>`).join('') || PK.emptyRow(6, 'box', 'لا توجد فئات')}</tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('pie', 18)} توزيع قيمة المخزون</div></div></div>
          <div class="card-body">${catItems.length ? UI.donut(catItems, 'قيمة المخزون', U.moneyShort(inv.costValue)) : UI.empty('box', 'لا توجد بيانات')}</div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('alert', 18)} أصناف تحتاج إعادة طلب</div><div class="card-sub">المخزون أقل من أو يساوي حد إعادة الطلب</div></div>
          <span class="badge badge-amber">${low.length} صنف</span></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>المنتج</th><th>الباركود</th><th>المخزون</th><th>حد الطلب</th><th>التكلفة</th><th>قيمة النقص</th></tr></thead>
          <tbody>${low.map((p) => `<tr>
            <td><div class="product-cell"><div class="thumb sm">${p.emoji || '📦'}</div><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${U.esc(p.sku)}</div></div></div></td>
            <td class="code">${U.esc(p.barcode || '—')}</td>
            <td class="num ${p.stock <= 0 ? 'text-danger' : 'text-warning'} fw-800">${U.num(p.stock, 0)}</td>
            <td>${U.num(p.reorderLevel || 10, 0)}</td>
            <td class="num">${U.money(p.cost)}</td>
            <td class="num">${U.money(Math.max(0, (p.reorderLevel || 10) - p.stock) * p.cost)}</td>
          </tr>`).join('') || PK.emptyRow(6, 'checkCircle', 'المخزون بحالة جيدة', 'لا توجد أصناف تحتاج إعادة طلب حالياً')}</tbody>
        </table></div>
      </div>

      <div class="card mt-3">
        <div class="card-head"><div><div class="card-title">${U.icon('list', 18)} جرد وتقييم المخزون</div><div class="card-sub">${products.length} منتج نشط</div></div></div>
        <div class="table-wrap"><table class="table compact">
          <thead><tr><th>المنتج</th><th>الفئة</th><th>المخزون</th><th>التكلفة</th><th>سعر البيع</th><th>قيمة التكلفة</th><th>قيمة البيع</th></tr></thead>
          <tbody>${products.map((p) => `<tr>
            <td><div class="product-cell"><div class="thumb sm">${p.emoji || '📦'}</div><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub code">${U.esc(p.sku)}</div></div></div></td>
            <td>${U.esc((Store.category(p.categoryId) || {}).name || 'غير مصنف')}</td>
            <td class="num ${p.stock <= (p.reorderLevel || 10) ? 'text-danger' : ''}">${U.num(p.stock, 0)}</td>
            <td class="num">${U.money(p.cost)}</td>
            <td class="num">${U.money(p.price)}</td>
            <td class="num fw-800">${U.money(p.value)}</td>
            <td class="num">${U.money(p.retailValue)}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="5">الإجمالي</td><td class="num">${U.money(inv.costValue)}</td><td class="num">${U.money(inv.retailValue)}</td></tr></tfoot>
        </table></div>
      </div>`;
  }

  function content() {
    switch (state.tab) {
      case 'sales': return salesContent();
      case 'products': return productsContent();
      case 'customers': return customersContent();
      case 'purchases': return purchasesContent();
      case 'inventory': return inventoryContent();
      default: return overviewContent();
    }
  }

  function mountCharts(view) {
    if (state.tab === 'overview') {
      const trend = A.salesByDay(state.from, state.to);
      UI.chartArea(view.querySelector('#rep-trend'), {
        values: trend.map((d) => d.total),
        labels: trend.map((d) => U.formatDate(d.date, 'day')),
        tooltip: (v) => U.money(v)
      });
    }
    if (state.tab === 'sales') {
      const trend = A.salesByDay(state.from, state.to);
      const metric = state.metric;
      UI.chartArea(view.querySelector('#rep-sales-trend'), {
        values: trend.map((d) => metric === 'profit' ? d.profit : metric === 'count' ? d.count : d.total),
        labels: trend.map((d) => U.formatDate(d.date, 'day')),
        tooltip: (v) => metric === 'count' ? U.num(v, 0) + ' فاتورة' : U.money(v)
      });
    }
  }

  /* ---------- Report data for print / export ---------- */
  function reportData() {
    const sum = A.salesSummary(state.from, state.to);
    if (state.tab === 'sales') {
      const rows = Store.data.invoices.filter((i) => i.type !== 'quote' && U.inRange(i.date, state.from, state.to))
        .sort((a, b) => String(a.date + (a.createdAt || '')).localeCompare(String(b.date + (b.createdAt || ''))))
        .map((i) => [i.number, U.formatDate(i.date), i.customerName || 'عميل نقدي', i.cashierName || '—', Store.branchName(i.branchId), U.money(i.total), U.money(i.paid), U.money(i.due), i.type === 'return' ? 'مرتجع' : (i.due <= 0.01 ? 'مدفوعة' : i.paid > 0 ? 'جزئية' : 'غير مدفوعة')]);
      return {
        title: 'تقرير المبيعات التفصيلي',
        headers: ['المستند', 'التاريخ', 'العميل', 'الكاشير', 'الفرع', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'],
        rows,
        totals: [
          { label: 'عدد الفواتير', value: U.num(sum.count, 0) },
          { label: 'إجمالي المبيعات', value: U.money(sum.total) },
          { label: 'صافي المبيعات', value: U.money(sum.netRevenue) },
          { label: 'المستحق', value: U.money(sum.due) },
          { label: 'إجمالي الربح', value: U.money(sum.netProfit), grand: true }
        ]
      };
    }
    if (state.tab === 'products') {
      const products = A.salesByProduct(state.from, state.to);
      return {
        title: 'تقرير أداء المنتجات',
        headers: ['المنتج', 'SKU', 'الكمية', 'الإيراد', 'التكلفة', 'الربح', 'الهامش'],
        rows: products.map((p) => [p.name, p.sku, U.num(p.qty, 0), U.money(p.revenue), U.money(p.cost), U.money(p.profit), U.pct(p.margin)]),
        totals: [
          { label: 'عدد المنتجات', value: U.num(products.length, 0) },
          { label: 'إجمالي الإيراد', value: U.money(U.sum(products, (p) => p.revenue)) },
          { label: 'إجمالي الربح', value: U.money(U.sum(products, (p) => p.profit)), grand: true }
        ]
      };
    }
    if (state.tab === 'customers') {
      const aging = A.aging('customer');
      return {
        title: 'تقرير العملاء وأعمار الديون',
        headers: ['العميل', 'الهاتف', 'الرصيد', 'حتى 30', '31–60', '61–90', '+90'],
        rows: aging.rows.map((r) => [r.name, r.phone || '', U.money(r.balance), U.money(r.buckets.current), U.money(r.buckets.d30), U.money(r.buckets.d60), U.money(r.buckets.d90)]),
        totals: [
          { label: 'عدد العملاء المدينين', value: U.num(aging.rows.length, 0) },
          { label: 'إجمالي المستحق', value: U.money(aging.totals.total), grand: true }
        ]
      };
    }
    if (state.tab === 'purchases') {
      const purchases = A.purchases(state.from, state.to);
      return {
        title: 'تقرير المشتريات والموردين',
        headers: ['الفاتورة', 'التاريخ', 'المورد', 'الإجمالي', 'المدفوع', 'المتبقي'],
        rows: purchases.slice().sort((a, b) => a.date.localeCompare(b.date)).map((p) => [p.number, U.formatDate(p.date), p.supplierName || Store.partyName('supplier', p.supplierId), U.money(p.total), U.money(p.paid), U.money(p.due)]),
        totals: [
          { label: 'عدد فواتير الشراء', value: U.num(purchases.length, 0) },
          { label: 'إجمالي المشتريات', value: U.money(U.sum(purchases, (p) => p.total)) },
          { label: 'المستحق للموردين', value: U.money(A.aging('supplier').totals.total), grand: true }
        ]
      };
    }
    if (state.tab === 'inventory') {
      const inv = A.inventoryValuation();
      return {
        title: 'تقرير جرد وتقييم المخزون',
        headers: ['المنتج', 'SKU', 'الفئة', 'المخزون', 'التكلفة', 'قيمة التكلفة', 'قيمة البيع'],
        rows: inv.products.slice().sort((a, b) => b.stock * b.cost - a.stock * a.cost).map((p) => [p.name, p.sku, (Store.category(p.categoryId) || {}).name || 'غير مصنف', U.num(p.stock, 0), U.money(p.cost), U.money(p.stock * p.cost), U.money(p.stock * p.price)]),
        totals: [
          { label: 'عدد الأصناف', value: U.num(inv.products.length, 0) },
          { label: 'الوحدات', value: U.num(inv.units, 0) },
          { label: 'قيمة المخزون بالتكلفة', value: U.money(inv.costValue), grand: true }
        ]
      };
    }
    const vat = A.vatReport(state.from, state.to);
    const inv = A.inventoryValuation();
    return {
      title: 'التقرير التنفيذي الموحد',
      headers: ['المؤشر', 'القيمة'],
      rows: [
        ['إجمالي المبيعات', U.money(sum.total)],
        ['الخصومات', U.money(sum.discount)],
        ['صافي المبيعات', U.money(sum.netRevenue)],
        ['ضريبة المبيعات', U.money(sum.tax)],
        ['تكلفة المبيعات', U.money(sum.cogs)],
        ['إجمالي الربح', U.money(sum.profit)],
        ['صافي الربح بعد المرتجعات', U.money(sum.netProfit)],
        ['عدد الفواتير', U.num(sum.count, 0)],
        ['عدد المرتجعات', U.num(sum.returnCount, 0)],
        ['متوسط الفاتورة', U.money(sum.avgTicket)],
        ['هامش الربح', U.pct(sum.margin)],
        ['صافي ضريبة القيمة المضافة', U.money(vat.net)],
        ['مستحقات العملاء', U.money(A.receivables())],
        ['مستحقات الموردين', U.money(A.payables())],
        ['قيمة المخزون بالتكلفة', U.money(inv.costValue)]
      ],
      totals: [
        { label: 'صافي المبيعات', value: U.money(sum.netRevenue) },
        { label: 'صافي الربح', value: U.money(sum.netProfit), grand: true }
      ]
    };
  }

  function doPrint() {
    const data = reportData();
    PK.printReport({
      title: data.title,
      subtitle: `الفترة: ${rangeLabel()} • ${Store.data.settings.company}`,
      headers: data.headers,
      rows: data.rows.map((r) => r.map((c) => U.esc(c))),
      totals: data.totals,
      date: U.today()
    });
  }

  function doExport() {
    const data = reportData();
    const filename = `TalalTechno-${state.tab}-${state.from}_${state.to}.csv`;
    PK.exportCSV(filename, data.headers, data.rows);
    Store.audit('تصدير تقرير', data.title, 'download');
    Store.save();
  }

  /* ---------- Render ---------- */
  Pages.reports = {
    title: 'مركز التقارير', icon: 'chart', perm: 'reports',
    render(view) {
      view.innerHTML = `${headerHtml()}
        <div class="card mt-3">
          ${tabsHtml()}
          <div class="card-body" style="padding:0">${content()}</div>
        </div>`;

      view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
        state.tab = b.dataset.tab;
        Pages.reports.render(view);
      }));

      const range = view.querySelector('[data-range]');
      if (range) PK.bindRange(range, (from, to) => {
        state.from = from; state.to = to;
        Pages.reports.render(view);
      });

      view.querySelectorAll('[data-metric-value]').forEach((b) => b.addEventListener('click', () => {
        state.metric = b.dataset.metricValue;
        Pages.reports.render(view);
      }));

      view.onclick = (e) => {
        if (e.target.closest('[data-tab]') || e.target.closest('[data-metric-value]')) return;
        if (e.target.closest('[data-print]')) { doPrint(); return; }
        if (e.target.closest('[data-export]')) { doExport(); return; }
        const inv = e.target.closest('[data-invoice]');
        if (inv) { Actions.openInvoice(inv.dataset.invoice); return; }
        const st = e.target.closest('[data-customer-statement]');
        if (st && st.dataset.customerStatement) { Actions.openStatement('customer', st.dataset.customerStatement); return; }
      };

      mountCharts(view);
    }
  };
})();
