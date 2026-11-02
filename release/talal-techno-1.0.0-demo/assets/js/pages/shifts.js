/* ==========================================================================
   Page — Shifts & cash reconciliation
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};

  function methodRows(byMethod) {
    const entries = Object.keys(byMethod || {}).filter((m) => Math.abs(byMethod[m]) > 0.001);
    if (!entries.length) return '<div class="text-muted text-sm">لا توجد تحصيلات بعد.</div>';
    return entries.map((m) => `<div class="sum-row"><span>${U.esc(Payments.methodLabel(m))}</span><b>${U.money(byMethod[m])}</b></div>`).join('');
  }

  function openShiftModal() {
    const branches = Store.data.branches.filter((b) => b.active !== false);
    UI.modal({
      title: 'فتح وردية جديدة', subtitle: 'ابدأ الصندوق برصيد افتتاحي واضح', icon: 'clock', size: 'sm',
      body: `<div class="form-grid">
        <div class="field full"><label>الفرع</label><select class="select" data-branch>${branches.map((b) => `<option value="${b.id}">${U.esc(b.name)}</option>`).join('')}</select></div>
        <div class="field full"><label>الرصيد الافتتاحي <span class="req">*</span></label><input class="input num" type="number" step="0.01" min="0" data-cash value="500" /></div>
        <div class="field full"><label>ملاحظات</label><input class="input" data-notes placeholder="اختياري" /></div>
      </div>
      <div class="info-banner mt-2">${U.icon('info', 16)}<div>تُحتسب النقدية المتوقعة من مبيعات الوردية النقدية بعد خصم المصروفات النقدية.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('check', 15)} فتح الوردية</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          try {
            Shifts.open({
              branchId: modal.querySelector('[data-branch]').value,
              openingCash: modal.querySelector('[data-cash]').value,
              notes: modal.querySelector('[data-notes]').value.trim()
            });
            close(); UI.toast('تم فتح الوردية بنجاح', 'success'); App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  function closeShiftModal(shift) {
    const s = Shifts.summary(shift.id);
    if (!s) return;
    UI.modal({
      title: 'إغلاق الوردية وتسوية الصندوق', subtitle: `${shift.number} • ${shift.userName}`, icon: 'lock', size: 'sm',
      body: `<div class="pay-summary" style="margin-bottom:14px">
        <div class="ps-row"><span>مبيعات الوردية</span><b>${U.money(s.sales)}</b></div>
        <div class="ps-row"><span>المرتجعات</span><b>${U.money(s.refunds)}</b></div>
        <div class="ps-row"><span>النقدية المتوقعة</span><b>${U.money(s.expectedCash)}</b></div>
      </div>
      <div class="field"><label>النقدية الفعلية المعدودة <span class="req">*</span></label><input class="input num" type="number" step="0.01" data-cash value="${s.expectedCash.toFixed(2)}" /></div>
      <div class="field mt-2"><label>ملاحظات الإغلاق</label><textarea class="input" rows="2" data-notes placeholder="أي فرق أو ملاحظة..."></textarea></div>
      <div class="info-banner warn mt-2">${U.icon('alert', 16)}<div>سيتم تثبيت ملخص الوردية ولا يمكن إعادة فتحها.</div></div>`,
      footer: `<button class="btn btn-secondary" data-cancel>إلغاء</button><button class="btn btn-primary" data-save>${U.icon('lock', 15)} إغلاق الوردية</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.querySelector('[data-save]').addEventListener('click', () => {
          try {
            Shifts.close(shift.id, modal.querySelector('[data-cash]').value, modal.querySelector('[data-notes]').value.trim());
            close(); UI.toast('تم إغلاق الوردية وتسوية الصندوق', 'success'); App.refresh();
          } catch (e) { UI.toast(e.message, 'error'); }
        });
      }
    });
  }

  Pages.shifts = {
    title: 'الورديات والصندوق',
    icon: 'clock',
    perm: 'shifts',
    render(view) {
      const current = Store.currentShift();
      const todaySummary = Shifts.history(null, 200).filter((s) => String(s.openedAt || '').slice(0, 10) === U.today());
      const todaySales = U.sum(todaySummary.filter((s) => s.status === 'closed'), (s) => s.sales || 0);
      const history = Shifts.history(null, 40);
      const sum = current ? Shifts.summary(current.id) : null;

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">الورديات وتسوية الصندوق</div><div class="page-sub">فتح وإغلاق الورديات، متابعة التحصيل حسب طريقة الدفع، وتسوية النقدية</div></div>
          <div class="page-actions">
            ${current ? `<button class="btn btn-secondary" data-refresh>${U.icon('refresh', 16)} تحديث</button>
              <button class="btn btn-danger" data-close-shift>${U.icon('lock', 16)} إغلاق الوردية</button>`
              : `<button class="btn btn-primary" data-open-shift>${U.icon('plus', 16)} فتح وردية</button>`}
          </div>
        </div>

        <div class="kpi-grid" style="margin-bottom:18px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('clock', 20)}</div><span class="badge ${current ? 'badge-green' : 'badge-gray'}">${current ? 'مفتوحة' : 'مغلقة'}</span></div>
            <div class="kpi-label">الوردية الحالية</div><div class="kpi-value">${current ? U.esc(current.number) : '—'}</div>
            <div class="kpi-foot"><span class="kpi-sub">${current ? U.esc(current.userName) + ' • ' + U.timeAgo(current.openedAt) : 'لا توجد وردية مفتوحة'}</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon gold">${U.icon('receipt', 20)}</div></div>
            <div class="kpi-label">مبيعات الوردية</div><div class="kpi-value">${U.money(sum ? sum.sales : 0)}</div>
            <div class="kpi-foot"><span class="kpi-sub">${sum ? U.num(sum.count) + ' فاتورة • متوسط ' + U.money(sum.avgTicket) : 'ابدأ وردية لتسجيل المبيعات'}</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('cash', 20)}</div></div>
            <div class="kpi-label">النقدية المتوقعة</div><div class="kpi-value">${U.money(sum ? sum.expectedCash : 0)}</div>
            <div class="kpi-foot"><span class="kpi-sub">افتتاحي ${U.money(current ? current.openingCash : 0)} + نقدي ${U.money(sum ? sum.cashSales : 0)}</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon ${sum && sum.byMethod && Object.keys(sum.byMethod).length ? 'purple' : 'red'}">${U.icon('card', 20)}</div></div>
            <div class="kpi-label">التحصيل الإلكتروني</div><div class="kpi-value">${U.money(sum ? U.sum(Object.keys(sum.byMethod || {}).filter((m) => m !== 'cash'), (m) => sum.byMethod[m]) : 0)}</div>
            <div class="kpi-foot"><span class="kpi-sub">مدى • Apple Pay • STC Pay • بطاقات</span></div></div>
        </div>

        <div class="grid grid-2-1" style="margin-bottom:18px">
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('clock', 18)} ملخص الوردية الحالية</div><div class="card-sub">${current ? U.formatDateTime(current.openedAt) + ' — ' + U.esc(Store.branchName(current.branchId)) : 'افتح وردية جديدة للبدء'}</div></div>
              ${current ? `<span class="badge badge-green">${U.esc(current.number)}</span>` : ''}</div>
            <div class="card-body">
              ${sum ? `<div class="grid grid-2">
                <div class="detail-box">
                  <div class="detail-label">طرق الدفع</div>
                  <div style="margin-top:8px">${methodRows(sum.byMethod)}</div>
                  <div class="sum-row" style="margin-top:8px;border-top:1px dashed var(--line-2);padding-top:8px"><span>المصروفات النقدية</span><b>${U.money(sum.cashExpenses)}</b></div>
                </div>
                <div class="detail-box">
                  <div class="detail-row"><span>الضريبة المحصلة</span><b>${U.money(sum.tax)}</b></div>
                  <div class="detail-row"><span>الخصومات</span><b>${U.money(sum.discounts)}</b></div>
                  <div class="detail-row"><span>تكلفة المبيعات</span><b>${U.money(sum.cogs)}</b></div>
                  <div class="detail-row"><span>المرتجعات</span><b>${U.money(sum.refunds)}</b></div>
                  <div class="detail-row"><span>عدد الفواتير</span><b>${U.num(sum.count)}</b></div>
                  <div class="detail-row total"><span>المتوقع في الصندوق</span><b>${U.money(sum.expectedCash)}</b></div>
                </div>
              </div>` : UI.empty('clock', 'لا توجد وردية مفتوحة', 'افتح وردية لتتمكن من البيع وتسوية الصندوق', `<button class="btn btn-primary btn-sm" data-open-shift>فتح وردية</button>`)}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('checkCircle', 18)} جاهزية الصندوق</div><div class="card-sub">التحقق قبل الإغلاق</div></div></div>
            <div class="card-body">
              <div class="check-list">
                <div class="check-row ${current ? 'ok' : ''}">${U.icon(current ? 'checkCircle' : 'alert', 16)}<span>وردية مفتوحة</span></div>
                <div class="check-row ${sum && sum.count ? 'ok' : ''}">${U.icon(sum && sum.count ? 'checkCircle' : 'alert', 16)}<span>فواتير مسجلة</span></div>
                <div class="check-row ${sum && Math.abs((sum.byMethod.cash || 0)) >= 0 ? 'ok' : ''}">${U.icon('checkCircle', 16)}<span>النقدية قابلة للتسوية</span></div>
                <div class="check-row ${sum && sum.expectedCash >= 0 ? 'ok' : 'warn'}">${U.icon(sum && sum.expectedCash >= 0 ? 'checkCircle' : 'alert', 16)}<span>رصيد صندوق غير سالب</span></div>
              </div>
              ${current ? `<button class="btn btn-primary btn-block mt-2" data-close-shift>${U.icon('lock', 16)} إغلاق وتسوية الوردية</button>` : `<button class="btn btn-primary btn-block mt-2" data-open-shift>${U.icon('plus', 16)} فتح وردية جديدة</button>`}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('list', 18)} سجل الورديات</div><div class="card-sub">آخر ${history.length} وردية — الفروقات محسوبة تلقائياً</div></div>
            <span class="badge badge-gray">${history.length}</span></div>
          <div class="card-body flush">
            ${history.length ? `<div class="table-wrap"><table class="table compact">
              <thead><tr><th>الوردية</th><th>المستخدم</th><th>الفرع</th><th>الفتح</th><th>الإغلاق</th><th>المبيعات</th><th>المتوقع</th><th>الفعلي</th><th>الفرق</th><th>الحالة</th></tr></thead>
              <tbody>${history.map((s) => {
                const diff = Number(s.variance) || 0;
                return `<tr>
                  <td class="mono">${U.esc(s.number)}</td>
                  <td>${U.esc(s.userName || '—')}</td>
                  <td>${U.esc(Store.branchName(s.branchId))}</td>
                  <td>${U.formatDateTime(s.openedAt)}</td>
                  <td>${s.closedAt ? U.formatDateTime(s.closedAt) : '—'}</td>
                  <td class="num">${U.money(s.sales || 0)}</td>
                  <td class="num">${s.expectedCash !== null && s.expectedCash !== undefined ? U.money(s.expectedCash) : '—'}</td>
                  <td class="num">${s.closingCash !== null && s.closingCash !== undefined ? U.money(s.closingCash) : '—'}</td>
                  <td class="num ${Math.abs(diff) < 0.01 ? 'text-success' : 'text-danger'}">${s.status === 'closed' ? U.money(diff) : '—'}</td>
                  <td><span class="badge ${s.status === 'open' ? 'badge-green' : 'badge-gray'}">${s.status === 'open' ? 'مفتوحة' : 'مغلقة'}</span></td>
                </tr>`;
              }).join('')}</tbody>
            </table></div>` : UI.empty('clock', 'لا توجد ورديات بعد', 'افتح أول وردية لبدء تسجيل المبيعات')}
          </div>
        </div>`;

      view.querySelectorAll('[data-open-shift]').forEach((b) => b.addEventListener('click', openShiftModal));
      view.querySelectorAll('[data-close-shift]').forEach((b) => b.addEventListener('click', () => { if (current) closeShiftModal(current); }));
      view.querySelectorAll('[data-refresh]').forEach((b) => b.addEventListener('click', () => App.refresh()));
    }
  };
})();
