/* ==========================================================================
   Page — Dashboard
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};

  Pages.dashboard = {
    title: 'لوحة التحكم',
    icon: 'dashboard',
    perm: 'dashboard',
    render(view) {
      const s = Store.data.settings;
      const now = new Date();
      const hour = now.getHours();
      const greet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
      const user = Store.currentUser || { name: 'بك' };
      const today = U.today();
      const stats = Accounting.todayStats();
      const monthFrom = U.startOfMonth(today);
      const lastMonthStart = U.startOfMonth(U.addMonths(today, -1));
      const lastMonthSameEnd = U.addDays(lastMonthStart, U.parseISO(today).getDate() - 1);
      const lastMonth = Accounting.salesSummary(lastMonthStart, lastMonthSameEnd);
      const receivables = Accounting.receivables();
      const payables = Accounting.payables();
      const cash = Accounting.cashBalance();
      const bank = Accounting.bankBalance();
      const inv = Accounting.inventoryValuation();
      const overdue = Store.data.invoices.filter((i) => i.type === 'sale' && i.due > 0.01 && U.daysBetween(i.date, today) > 30);
      const low = Store.rawMaterials().filter((p) => p.active !== false && p.stock <= (p.reorderLevel || 10)).sort((a, b) => a.stock - b.stock);
      const trend = Accounting.salesByDay(U.addDays(today, -13), today);
      const catShare = Accounting.salesByCategory(monthFrom, today);
      const topProducts = Accounting.salesByProduct(monthFrom, today).slice(0, 5);
      const topCustomers = Accounting.topCustomers(monthFrom, today, 5);
      const recent = Store.data.invoices.filter((i) => i.type !== 'quote').sort((a, b) => {
        const ac = a.createdAt || a.date, bc = b.createdAt || b.date;
        return String(bc).localeCompare(String(ac));
      }).slice(0, 6);
      const todayDelta = stats.yesterday.total ? ((stats.today.total - stats.yesterday.total) / stats.yesterday.total * 100) : 0;
      const monthDelta = lastMonth.total ? ((stats.month.total - lastMonth.total) / lastMonth.total * 100) : 0;
      const vat = Accounting.vatReport(monthFrom, today);

      const floorTables = Store.data.tables.filter((t) => t.branchId === App.branchId);
      const occupiedTables = floorTables.filter((t) => Tables.status(t) !== 'free').length;
      const kitchen = Store.kitchenOrders();
      const kitchenLate = kitchen.filter((o) => {
        const mins = (Date.now() - new Date(o.sentAt || o.createdAt).getTime()) / 60000;
        return mins > (Number(o.etaMinutes) || 20);
      }).length;
      const todayOrders = Store.data.orders.filter((o) => U.inRange(String(o.createdAt).slice(0, 10), today, today));
      const deliveryToday = todayOrders.filter((o) => o.platform);
      const emenuToday = todayOrders.filter((o) => o.source === 'emenu');
      const zatca = Zatca.todayStats();
      const zatcaCompliance = Zatca.compliance();

      const deltaHtml = (v) => `<span class="kpi-delta ${v > 0.5 ? 'up' : v < -0.5 ? 'down' : 'flat'}">${U.icon(v >= 0 ? 'arrowUpRight' : 'arrowDownRight', 11)} ${U.num(Math.abs(v), 1)}%</span>`;

      view.innerHTML = `
        <div class="hero">
          <div class="hero-main">
            <div class="hero-kicker">${U.icon('calendar', 12)} ${U.formatDate(today, 'long')}</div>
            <h1>${greet}، <b>${U.esc(user.name.split(' ')[0])}</b> 👋</h1>
            <p>إليك ملخص أداء ${U.esc(s.company)}. كل المؤشرات محدثة لحظياً من قيودك المحاسبية.</p>
            <div class="hero-actions">
              <button class="btn btn-light" data-go="#/pos">${U.icon('pos', 15)} بيع جديد</button>
              <button class="btn btn-outline" data-go="#/tables">${U.icon('grid', 15)} الطاولات</button>
              <button class="btn btn-outline" data-go="#/kds">${U.icon('chef', 15)} شاشة المطبخ</button>
              <button class="btn btn-outline" data-purchase>${U.icon('truck', 15)} فاتورة شراء</button>
              <button class="btn btn-outline" data-expense>${U.icon('wallet', 15)} تسجيل مصروف</button>
              <button class="btn btn-outline" data-journal>${U.icon('book', 15)} قيد يومية</button>
            </div>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><div class="lbl">نقدية الصندوق</div><div class="val">${U.moneyShort(cash)}</div><div class="up">${U.icon('checkCircle', 10)} متاح</div></div>
            <div class="hero-stat"><div class="lbl">الرصيد البنكي</div><div class="val">${U.moneyShort(bank)}</div><div class="up">${U.icon('bank', 10)} الحساب الرئيسي</div></div>
            <div class="hero-stat"><div class="lbl">قيمة المخزون</div><div class="val">${U.moneyShort(inv.costValue)}</div><div class="up">${U.num(inv.units, 0)} وحدة</div></div>
          </div>
        </div>

        <div class="kpi-grid" style="margin-top:18px">
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-icon green">${U.icon('trendingUp', 20)}</div>${deltaHtml(todayDelta)}</div>
            <div class="kpi-label">مبيعات اليوم</div>
            <div class="kpi-value">${U.money(stats.today.total)}</div>
            <div class="kpi-foot"><div class="kpi-sub"><b>${stats.today.count}</b> فاتورة • متوسط ${U.money(stats.today.avgTicket)}</div>${UI.sparkline(Accounting.salesByDay(U.addDays(today, -6), today).map((d) => d.total))}</div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-icon gold">${U.icon('chart', 20)}</div>${deltaHtml(monthDelta)}</div>
            <div class="kpi-label">مبيعات الشهر حتى اليوم</div>
            <div class="kpi-value">${U.money(stats.month.total)}</div>
            <div class="kpi-foot"><div class="kpi-sub"><b>${stats.month.count}</b> فاتورة • ${U.num(stats.month.netRevenue, 0)} صافي</div>${UI.sparkline(trend.map((d) => d.total), 'gold')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-icon blue">${U.icon('coins', 20)}</div><span class="kpi-delta up">${U.num(stats.month.margin, 1)}% هامش</span></div>
            <div class="kpi-label">أرباح الشهر (إجمالي)</div>
            <div class="kpi-value">${U.money(stats.month.profit)}</div>
            <div class="kpi-foot"><div class="kpi-sub">تكلفة المبيعات <b>${U.moneyShort(stats.month.cogs)}</b></div>${UI.sparkline(trend.map((d) => d.profit), 'blue')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-top"><div class="kpi-icon red">${U.icon('clock', 20)}</div><span class="kpi-delta ${overdue.length ? 'down' : 'up'}">${overdue.length} متأخرة</span></div>
            <div class="kpi-label">مستحقات العملاء</div>
            <div class="kpi-value">${U.money(receivables)}</div>
            <div class="kpi-foot"><div class="kpi-sub">مستحقات الموردين <b>${U.moneyShort(payables)}</b></div><button class="btn btn-ghost btn-sm" data-go="#/contacts" style="height:26px;font-size:10px">الكشف ${U.icon('chevronLeft', 12)}</button></div>
          </div>
        </div>

        <div class="grid grid-4" style="margin-top:16px">
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('grid', 17)} الصالة والطاولات</div><div class="card-sub">الإشغال الآن — ${U.esc(Store.branchName(App.branchId))}</div></div><span class="badge ${occupiedTables ? 'badge-amber' : 'badge-green'}">${U.num(occupiedTables)} مشغولة</span></div>
            <div class="card-body">
              <div style="display:flex;align-items:baseline;gap:6px"><div class="kpi-value" style="font-size:26px">${U.num(occupiedTables)}<span style="font-size:13px;color:var(--muted)"> / ${U.num(floorTables.length)}</span></div><span class="text-muted text-xs">طاولة</span></div>
              <div class="progress mt-2"><span style="width:${floorTables.length ? Math.round(occupiedTables / floorTables.length * 100) : 0}%"></span></div>
              <div class="detail-row"><span>متاحة</span><b>${U.num(floorTables.filter((t) => Tables.status(t) === 'free').length)}</b></div>
              <div class="detail-row"><span>محجوزة</span><b>${U.num(floorTables.filter((t) => Tables.status(t) === 'reserved').length)}</b></div>
              <button class="btn btn-soft btn-block mt-2" data-go="#/tables">${U.icon('grid', 14)} فتح خريطة الطاولات</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('chef', 17)} طابور المطبخ</div><div class="card-sub">تذاكر نشطة على الشاشة</div></div><span class="badge ${kitchenLate ? 'badge-red' : 'badge-green'}">${kitchenLate ? U.num(kitchenLate) + ' متأخرة' : 'في الوقت'}</span></div>
            <div class="card-body">
              <div class="kpi-value" style="font-size:26px">${U.num(kitchen.length)} <span style="font-size:13px;color:var(--muted)">تذكرة</span></div>
              <div class="detail-row"><span>جديدة</span><b>${U.num(kitchen.filter((o) => o.status === 'new').length)}</b></div>
              <div class="detail-row"><span>قيد التحضير</span><b>${U.num(kitchen.filter((o) => o.status === 'preparing').length)}</b></div>
              <div class="detail-row"><span>جاهزة للتقديم</span><b>${U.num(kitchen.filter((o) => o.status === 'ready').length)}</b></div>
              <button class="btn btn-soft btn-block mt-2" data-go="#/kds">${U.icon('chef', 14)} فتح شاشة المطبخ</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('truck', 17)} التوصيل والقائمة</div><div class="card-sub">طلبات اليوم من كل القنوات</div></div><span class="badge badge-blue">${U.num(deliveryToday.length)} توصيل</span></div>
            <div class="card-body">
              <div class="kpi-value" style="font-size:26px">${U.money(U.sum(deliveryToday, (o) => o.total))}</div>
              <div class="detail-row"><span>هنقرستيشن / جاهز / مرسول</span><b>${U.num(deliveryToday.filter((o) => ['hungerstation', 'jahez', 'mrsool'].includes(o.platform)).length)}</b></div>
              <div class="detail-row"><span>طلبات QR من الطاولات</span><b>${U.num(emenuToday.length)}</b></div>
              <div class="detail-row"><span>طلبات التوصيل النشطة</span><b>${U.num(Store.data.orders.filter((o) => o.platform && ['new', 'preparing', 'ready'].includes(o.status)).length)}</b></div>
              <button class="btn btn-soft btn-block mt-2" data-go="#/integrations">${U.icon('truck', 14)} إدارة التكاملات</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('shield', 17)} ZATCA Sandbox</div><div class="card-sub">الفوترة الإلكترونية — بيئة تجريبية</div></div><span class="badge ${zatcaCompliance.chainValid ? 'badge-green' : 'badge-red'}">${zatcaCompliance.chainValid ? 'السلسلة سليمة' : 'تحقق مطلوب'}</span></div>
            <div class="card-body">
              <div class="kpi-value" style="font-size:26px">${U.num(zatca.count)} <span style="font-size:13px;color:var(--muted)">فاتورة اليوم</span></div>
              <div class="detail-row"><span>تم الإبلاغ</span><b>${U.num(zatca.reported)}</b></div>
              <div class="detail-row"><span>قيد الإرسال</span><b>${U.num(zatca.pending)}</b></div>
              <div class="detail-row"><span>ضريبة اليوم</span><b>${U.money(zatca.tax)}</b></div>
              <button class="btn btn-soft btn-block mt-2" data-go="#/zatca">${U.icon('shield', 14)} مركز الامتثال</button>
            </div>
          </div>
        </div>

        <div class="dash-split">
          <div class="card">
            <div class="card-head">
              <div><div class="card-title">${U.icon('chart', 18)} حركة المبيعات</div><div class="card-sub">آخر 14 يوماً — ${U.formatDate(U.addDays(today, -13), 'day')} إلى ${U.formatDate(today, 'day')}</div></div>
              <div class="segmented" data-chart-metric>
                <button class="active" data-metric="total">المبيعات</button>
                <button data-metric="profit">الأرباح</button>
                <button data-metric="count">الفواتير</button>
              </div>
            </div>
            <div class="card-body"><div id="sales-chart" class="chart-box"></div></div>
            <div class="card-foot"><div class="chart-legend"><span class="legend-item"><span class="legend-dot" style="background:var(--brand-2)"></span> إجمالي المبيعات</span></div><span class="text-muted text-xs">تحديث لحظي من الفواتير</span></div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('pie', 18)} توزيع المبيعات</div><div class="card-sub">حسب فئة المنتجات — هذا الشهر</div></div></div>
            <div class="card-body">${catShare.length ? UI.donut(catShare.map((c) => ({ label: c.name, value: c.revenue, color: c.color, display: U.moneyShort(c.revenue) })), 'إجمالي المبيعات', U.moneyShort(stats.month.total)) : UI.empty('pie', 'لا توجد مبيعات', 'ابدأ بإصدار فاتورة من نقطة البيع')}</div>
          </div>
        </div>

        <div class="dash-split">
          <div class="card">
            <div class="card-head">
              <div><div class="card-title">${U.icon('receipt', 18)} أحدث الفواتير</div><div class="card-sub">آخر الحركات المسجلة</div></div>
              <button class="btn btn-ghost btn-sm" data-go="#/sales">عرض الكل ${U.icon('chevronLeft', 13)}</button>
            </div>
            <div class="table-wrap">
              <table class="table compact">
                <thead><tr><th>الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                <tbody>${recent.map((i) => `<tr data-invoice="${i.id}" style="cursor:pointer">
                  <td><div class="cell-main">${U.esc(i.number)}</div><div class="cell-sub">${i.type === 'return' ? 'مرتجع' : i.type === 'quote' ? 'عرض سعر' : U.esc(i.cashierName || '')}</div></td>
                  <td><div class="cell-main" style="font-weight:600">${U.esc(i.customerName || 'عميل نقدي')}</div></td>
                  <td class="num fw-800">${U.money(i.total)}</td>
                  <td>${UI.statusBadge(i.status)}</td>
                  <td class="nowrap text-muted text-xs">${U.timeAgo(i.createdAt || i.date)}</td>
                </tr>`).join('') || `<tr><td colspan="5">${UI.empty('receipt', 'لا توجد فواتير', 'ابدأ من نقطة البيع')}</td></tr>`}</tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('alert', 18)} تحت حد الطلب</div><div class="card-sub">${low.length} منتج يحتاج إعادة تعبئة</div></div><button class="btn btn-ghost btn-sm" data-go="#/inventory">المخزون ${U.icon('chevronLeft', 13)}</button></div>
            <div class="card-body tight" style="padding:8px 18px">
              ${low.slice(0, 6).map((p) => `<div class="low-stock-item">
                <div class="thumb sm">${p.emoji || '📦'}</div>
                <div class="ls-main"><strong>${U.esc(p.name)}</strong><span>${U.esc(p.sku)} • حد الطلب ${U.num(p.reorderLevel || 10, 0)}</span></div>
                <div class="ls-qty ${p.stock > 0 ? 'ok' : ''}">${U.num(p.stock, 0)} ${U.esc(p.unit || '')}</div>
              </div>`).join('') || UI.empty('checkCircle', 'المخزون بحالة جيدة', 'لا توجد منتجات تحت حد الطلب')}
            </div>
            ${low.length ? `<div class="card-foot"><span class="text-muted text-xs">القيمة الدفترية ${U.money(low.reduce((a, p) => a + p.stock * p.cost, 0))}</span><button class="btn btn-soft btn-sm" data-go="#/purchases">إنشاء أمر شراء</button></div>` : ''}
          </div>
        </div>

        <div class="grid grid-3" style="margin-top:18px">
          <div class="card">
            <div class="card-head"><div class="card-title">${U.icon('award', 18)} الأكثر مبيعاً</div><span class="pill">هذا الشهر</span></div>
            <div class="card-body">
              <div class="bar-list">${topProducts.map((p) => {
                const max = topProducts[0] ? topProducts[0].revenue : 1;
                return `<div class="bar-row"><div class="bar-top"><span class="bar-name"><span class="em">${p.emoji || '📦'}</span>${U.esc(p.name)}</span><span class="bar-value">${U.moneyShort(p.revenue)}</span></div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, p.revenue / max * 100)}%"></div></div></div>`;
              }).join('') || UI.empty('award', 'لا توجد مبيعات', 'ستظهر المنتجات الأكثر مبيعاً هنا')}</div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">${U.icon('users', 18)} أفضل العملاء</div><span class="pill">هذا الشهر</span></div>
            <div class="card-body tight" style="padding:6px 18px">
              ${topCustomers.map((c, i) => `<div class="mini-list-item">
                ${UI.avatar(c.name, 'sm')}
                <div class="mi-main"><strong>${U.esc(c.name)}</strong><span>${c.count} فاتورة</span></div>
                <div class="mi-val">${U.money(c.total)}</div>
              </div>`).join('') || UI.empty('users', 'لا يوجد عملاء', 'سجّل عملاءك لمتابعة مبيعاتهم')}
            </div>
            <div class="card-foot"><button class="btn btn-ghost btn-sm" data-go="#/contacts">إدارة العملاء ${U.icon('chevronLeft', 13)}</button></div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">${U.icon('scale', 18)} الملخص المالي</div><span class="pill">لحظي</span></div>
            <div class="card-body tight" style="padding:6px 18px">
              <div class="mini-list-item"><div class="mi-ico" style="background:var(--brand-soft);color:var(--brand)">${U.icon('wallet', 16)}</div><div class="mi-main"><strong>نقدية الصندوق</strong><span>الحساب 1101</span></div><div class="mi-val">${U.money(cash)}</div></div>
              <div class="mini-list-item"><div class="mi-ico" style="background:var(--info-soft);color:var(--info)">${U.icon('bank', 16)}</div><div class="mi-main"><strong>الرصيد البنكي</strong><span>الحساب 1102</span></div><div class="mi-val">${U.money(bank)}</div></div>
              <div class="mini-list-item"><div class="mi-ico" style="background:var(--gold-soft);color:var(--gold)">${U.icon('box', 16)}</div><div class="mi-main"><strong>قيمة المخزون</strong><span>${U.num(inv.units, 0)} وحدة</span></div><div class="mi-val">${U.money(inv.costValue)}</div></div>
              <div class="mini-list-item"><div class="mi-ico" style="background:var(--danger-soft);color:var(--danger)">${U.icon('truck', 16)}</div><div class="mi-main"><strong>مستحقات الموردين</strong><span>${Store.data.suppliers.length} مورد</span></div><div class="mi-val">${U.money(payables)}</div></div>
              <div class="mini-list-item"><div class="mi-ico" style="background:var(--purple-soft);color:var(--purple)">${U.icon('percent', 16)}</div><div class="mi-main"><strong>صافي ضريبة الشهر</strong><span>مخرجات ${U.moneyShort(vat.output)}</span></div><div class="mi-val">${U.money(vat.net)}</div></div>
            </div>
            <div class="card-foot"><button class="btn btn-ghost btn-sm" data-go="#/accounting">فتح المحاسبة ${U.icon('chevronLeft', 13)}</button></div>
          </div>
        </div>
      `;

      // chart
      const chartEl = view.querySelector('#sales-chart');
      let metric = 'total';
      const draw = () => {
        UI.chartArea(chartEl, {
          values: trend.map((d) => d[metric]),
          labels: trend.map((d) => d.date.slice(8, 10) + '/' + d.date.slice(5, 7)),
          tooltip: (v, i) => `${U.formatDate(trend[i].date, 'full')} — ${metric === 'count' ? U.num(v, 0) + ' فاتورة' : U.money(v)}`,
          maxLabels: 7
        });
      };
      draw();
      view.querySelectorAll('[data-chart-metric] button').forEach((btn) => btn.addEventListener('click', () => {
        view.querySelectorAll('[data-chart-metric] button').forEach((b) => b.classList.toggle('active', b === btn));
        metric = btn.dataset.metric;
        draw();
      }));

      view.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => App.navigate(b.dataset.go)));
      view.querySelectorAll('[data-invoice]').forEach((tr) => tr.addEventListener('click', () => Actions.openInvoice(tr.dataset.invoice)));
      view.querySelector('[data-expense]').addEventListener('click', () => Actions.openExpense());
      view.querySelector('[data-purchase]').addEventListener('click', () => { window.__newPurchase = true; App.navigate('#/purchases'); });
      view.querySelector('[data-journal]').addEventListener('click', () => { window.__newJournal = true; App.navigate('#/accounting'); });
    }
  };
})();
