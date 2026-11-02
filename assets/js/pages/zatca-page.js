/* ==========================================================================
   Page — ZATCA Phase 2 sandbox center
   ========================================================================== */
(function () {
  const Pages = window.Pages = window.Pages || {};
  const state = { q: '', status: 'all' };

  function statusBadge(status) {
    const map = {
      CLEARED: ['badge-green', 'مطابقة'], REPORTED: ['badge-blue', 'تم الإبلاغ'],
      PENDING: ['badge-amber', 'بانتظار'], QUEUED: ['badge-amber', 'في القائمة'],
      REJECTED: ['badge-red', 'مرفوضة'], FAILED: ['badge-red', 'فشل']
    };
    const m = map[status] || ['badge-gray', status || '—'];
    return `<span class="badge ${m[0]}">${m[1]}</span>`;
  }

  function qrModal(invoice) {
    const z = invoice.zatca || {};
    UI.modal({
      title: 'رمز QR الضريبي', subtitle: `${invoice.number} • ${Zatca.typeLabel(z.type)}`, icon: 'qr', size: 'sm',
      body: `<div style="text-align:center">
        <div class="qr-box">${Zatca.qrSvg(z.qr || invoice.qrCode || '', 210)}</div>
        <div class="text-muted text-xs mt-2">TLV Base64 (5 حقول)</div>
        <div class="code-block">${U.esc(z.qr || invoice.qrCode || '—')}</div>
        <div class="detail-grid mt-2" style="text-align:right">
          <div class="detail-item"><div class="detail-label">Hash</div><div class="detail-value mono" style="font-size:10px;word-break:break-all">${U.esc(z.invoiceHash || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Previous Hash</div><div class="detail-value mono" style="font-size:10px;word-break:break-all">${U.esc(z.previousHash || '—')}</div></div>
        </div>
        <div class="info-banner warn mt-2" style="text-align:right">${U.icon('alert', 16)}<div>QR تجريبي لبيئة Sandbox — لا يصلح للفاتورة الضريبية الرسمية.</div></div>
      </div>`,
      footer: `<button class="btn btn-secondary" data-copy>${U.icon('copy', 15)} نسخ Base64</button><button class="btn btn-primary" data-close>إغلاق</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-close]').addEventListener('click', close);
        modal.querySelector('[data-copy]').addEventListener('click', async () => { await U.copy(z.qr || invoice.qrCode || ''); UI.toast('تم نسخ رمز QR', 'success'); });
      }
    });
  }

  function xmlModal(invoice) {
    const xml = (invoice.zatca || {}).xml || '';
    UI.modal({
      title: 'UBL 2.1 XML', subtitle: invoice.number, icon: 'file', size: 'lg',
      body: `<pre class="code-block" style="max-height:430px;white-space:pre-wrap;direction:ltr;text-align:left">${U.esc(xml)}</pre>
        <div class="info-banner warn mt-2">${U.icon('alert', 16)}<div>XML تجريبي غير موقّع بشهادة CSID حقيقية. لا يتم إرساله لهيئة الزكاة والضريبة والجمارك.</div></div>`,
      footer: `<button class="btn btn-secondary" data-copy>${U.icon('copy', 15)} نسخ XML</button><button class="btn btn-primary" data-download>${U.icon('download', 15)} تنزيل XML</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-copy]').addEventListener('click', async () => { await U.copy(xml); UI.toast('تم نسخ XML', 'success'); });
        modal.querySelector('[data-download]').addEventListener('click', () => { try { Zatca.downloadXml(invoice.id); } catch (e) { UI.toast(e.message, 'error'); } });
      }
    });
  }

  function verifyModal() {
    const r = Zatca.verifyChain();
    UI.modal({
      title: r.valid ? 'سلسلة التجزئة سليمة' : 'تم اكتشاف خلل في السلسلة', subtitle: `تم فحص ${r.checked} فاتورة`, icon: r.valid ? 'checkCircle' : 'alert', size: 'sm',
      body: `<div class="confirm-icon ${r.valid ? 'green' : 'danger'}">${U.icon(r.valid ? 'checkCircle' : 'alert', 26)}</div>
        <div class="confirm-text">${r.valid ? 'كل فاتورة ترتبط بتجزئة الفاتورة السابقة، ولم يتم اكتشاف تعديل.' : 'توجد فواتير لا ترتبط بالسلسلة أو تم تعديل بياناتها.'}</div>
        ${r.broken.length ? `<div class="info-banner warn mt-2">${U.icon('alert', 16)}<div>${r.broken.map((b) => `فاتورة ${U.esc(b.invoice)} — Previous Hash غير متطابق`).join('<br>')}</div></div>` : ''}
        ${r.tampered.length ? `<div class="info-banner warn mt-2">${U.icon('alert', 16)}<div>${r.tampered.map((b) => `فاتورة ${U.esc(b.invoice)} — Hash لا يطابق المحتوى`).join('<br>')}</div></div>` : ''}
        <div class="code-block mt-2" style="font-size:9px">${U.esc(r.lastHash || '—')}</div>`,
      footer: `<button class="btn btn-primary" data-close>حسناً</button>`,
      onMount(modal, close) { modal.querySelector('[data-close]').addEventListener('click', close); }
    });
  }

  Pages.zatca = {
    title: 'مركز ZATCA',
    icon: 'file',
    perm: 'zatca',
    render(view) {
      const z = Store.data.settings.zatca || {};
      const c = Zatca.compliance();
      const all = Store.data.invoices.filter((i) => i.zatca);
      const list = all.filter((i) => {
        if (state.status !== 'all' && i.zatca.status !== state.status) return false;
        const q = state.q.toLowerCase();
        return !q || String(i.number).toLowerCase().includes(q) || String(i.customerName || '').toLowerCase().includes(q);
      }).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 60);
      const logs = (Store.data.zatcaLogs || []).slice(0, 25);

      view.innerHTML = `
        <div class="page-head">
          <div><div class="page-title">مركز الامتثال الضريبي — ZATCA</div><div class="page-sub">UBL 2.1، رمز QR بصيغة TLV، سلسلة تجزئة SHA-256، ومحاكاة الإبلاغ والمطابقة</div></div>
          <div class="page-actions">
            <button class="btn btn-secondary" data-verify>${U.icon('shield', 16)} فحص السلسلة</button>
            <button class="btn btn-secondary" data-export>${U.icon('download', 16)} تصدير السجل</button>
          </div>
        </div>

        <div class="info-banner warn" style="margin-bottom:18px">${U.icon('alert', 18)}<div><strong>بيئة Sandbox تجريبية — غير معتمدة.</strong> هذه الوحدة تحاكي متطلبات المرحلة الثانية لأغراض التطوير والعرض فقط. لا تدّعي الحصول على اعتماد ZATCA، ولا يجوز استخدامها لإصدار فواتير ضريبية رسمية. الاعتماد الفعلي يتطلب CSID إنتاجي وتسجيلاً لدى الهيئة.</div></div>

        <div class="kpi-grid" style="margin-bottom:18px">
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon green">${U.icon('file', 20)}</div><span class="badge badge-gold">Sandbox</span></div><div class="kpi-label">فواتير ZATCA</div><div class="kpi-value">${U.num(c.withZatca)}</div><div class="kpi-foot"><span class="kpi-sub">من إجمالي ${U.num(c.invoices)} فاتورة بيع</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon blue">${U.icon('checkCircle', 20)}</div></div><div class="kpi-label">تم الإبلاغ/المطابقة</div><div class="kpi-value">${U.num(c.reported)}</div><div class="kpi-foot"><span class="kpi-sub">محاكاة ناجحة</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon ${c.pending ? 'gold' : 'green'}">${U.icon('clock', 20)}</div></div><div class="kpi-label">بانتظار الإرسال</div><div class="kpi-value">${U.num(c.pending)}</div><div class="kpi-foot"><span class="kpi-sub">مبسطة: خلال 24 ساعة</span></div></div>
          <div class="kpi"><div class="kpi-top"><div class="kpi-icon ${c.chainValid ? 'green' : 'red'}">${U.icon('shield', 20)}</div></div><div class="kpi-label">سلسلة التجزئة</div><div class="kpi-value" style="font-size:17px">${c.chainValid ? 'سليمة' : 'خلل'}</div><div class="kpi-foot"><span class="kpi-sub">${U.num(c.counter)} فاتورة موقعة تجريبياً</span></div></div>
        </div>

        <div class="grid grid-2-1" style="margin-bottom:18px">
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('settings', 18)} إعدادات CSID التجريبية</div><div class="card-sub">تُحفظ محلياً ولا تحتوي أي مفاتيح حقيقية</div></div><span class="badge badge-gold">Sandbox</span></div>
            <div class="card-body">
              <div class="form-grid form-grid-3">
                <div class="field"><label>البيئة</label><select class="select" data-env><option value="sandbox" ${z.environment === 'sandbox' ? 'selected' : ''}>Sandbox (محاكاة)</option><option value="simulation" ${z.environment === 'simulation' ? 'selected' : ''}>Simulation (محاكاة)</option></select></div>
                <div class="field"><label>نوع CSID</label><select class="select" data-csid><option value="compliance" ${z.csidType === 'compliance' ? 'selected' : ''}>Compliance</option><option value="production" ${z.csidType === 'production' ? 'selected' : ''}>Production (غير متاح)</option></select></div>
                <div class="field"><label>الرقم الضريبي</label><input class="input" data-vat value="${U.esc(z.vatNumber || Store.data.settings.taxNumber)}" dir="ltr" /></div>
                <div class="field"><label>الاسم الشائع (CN)</label><input class="input" data-cn value="${U.esc(z.commonName || '')}" /></div>
                <div class="field"><label>الرقم التسلسلي</label><input class="input" data-serial value="${U.esc(z.serialNumber || '')}" dir="ltr" /></div>
                <div class="field"><label>نوع الفاتورة الافتراضي</label><select class="select" data-type><option value="simplified" ${z.invoiceType !== 'standard' ? 'selected' : ''}>مبسطة B2C</option><option value="standard" ${z.invoiceType === 'standard' ? 'selected' : ''}>ضريبية B2B</option></select></div>
              </div>
              <div class="check-row ${z.autoReport ? 'ok' : ''}" style="margin-top:12px"><input type="checkbox" data-auto ${z.autoReport ? 'checked' : ''} /><span>إبلاغ/مطابقة تلقائية بعد كل فاتورة (محاكاة)</span></div>
              <div class="flex gap-2 mt-2"><button class="btn btn-primary" data-save>${U.icon('save', 15)} حفظ الإعدادات</button><button class="btn btn-secondary" data-reset>${U.icon('refresh', 15)} إعادة ضبط تجريبية</button></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">${U.icon('shield', 18)} قائمة الامتثال</div><div class="card-sub">فحص جاهزية Sandbox</div></div></div>
            <div class="card-body">
              <div class="check-list">${c.checks.map((ch) => `<div class="check-row ${ch.ok ? 'ok' : 'warn'}">${U.icon(ch.ok ? 'checkCircle' : 'alert', 16)}<span>${U.esc(ch.label)}</span></div>`).join('')}</div>
              <div class="info-banner mt-2" style="font-size:10.5px">${U.icon('info', 16)}<div>آخر تجزئة: <span class="mono" style="word-break:break-all">${U.esc((c.lastHash || '—').slice(0, 48))}${c.lastHash && c.lastHash.length > 48 ? '...' : ''}</span></div></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:18px">
          <div class="card-head"><div><div class="card-title">${U.icon('file', 18)} الفواتير الضريبية</div><div class="card-sub">آخر 60 فاتورة — إصدار XML وQR وإبلاغ تجريبي</div></div>
            <div class="flex gap-2"><select class="select" data-status style="height:34px;font-size:11px">
              <option value="all" ${state.status === 'all' ? 'selected' : ''}>كل الحالات</option>
              <option value="PENDING" ${state.status === 'PENDING' ? 'selected' : ''}>بانتظار</option>
              <option value="REPORTED" ${state.status === 'REPORTED' ? 'selected' : ''}>تم الإبلاغ</option>
              <option value="CLEARED" ${state.status === 'CLEARED' ? 'selected' : ''}>مطابقة</option>
            </select><div class="searchbox" style="position:relative"><input class="input" data-q placeholder="بحث..." value="${U.esc(state.q)}" style="height:34px;font-size:11px" /></div></div></div>
          <div class="card-body flush">
            ${list.length ? `<div class="table-wrap"><table class="table compact">
              <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>النوع</th><th>الإجمالي</th><th>الضريبة</th><th>الحالة</th><th>QR</th><th></th></tr></thead>
              <tbody>${list.map((i) => `<tr>
                <td class="mono">${U.esc(i.number)}</td><td>${U.formatDate(i.date)}</td><td>${U.esc(i.customerName || 'عميل نقدي')}</td>
                <td><span class="badge badge-outline">${Zatca.typeLabel(i.zatca.type)}</span></td>
                <td class="num">${U.money(i.total)}</td><td class="num">${U.money(i.tax)}</td>
                <td>${statusBadge(i.zatca.status)}</td>
                <td><button class="icon-btn" data-qr="${i.id}" title="QR">${U.icon('qr', 16)}</button></td>
                <td class="actions-cell"><div class="row-actions">
                  <button class="icon-btn" data-xml="${i.id}" title="XML">${U.icon('file', 15)}</button>
                  ${['PENDING', 'QUEUED'].includes(i.zatca.status) ? `<button class="icon-btn" data-report="${i.id}" title="إبلاغ">${U.icon('send', 15)}</button>` : ''}
                  ${i.zatca.type === 'standard' && i.zatca.status !== 'CLEARED' ? `<button class="icon-btn" data-clear="${i.id}" title="مطابقة">${U.icon('checkCircle', 15)}</button>` : ''}
                </div></td>
              </tr>`).join('')}</tbody></table></div>` : UI.empty('file', 'لا توجد فواتير ضريبية', 'ستظهر الفواتير هنا بعد إتمام عمليات البيع')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><div class="card-title">${U.icon('list', 18)} سجل عمليات ZATCA</div><div class="card-sub">آخر 25 عملية — بيئة Sandbox</div></div></div>
          <div class="card-body flush">${logs.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>الفاتورة</th><th>الحالة</th><th>البيئة</th><th>الرسالة</th><th>Hash</th><th>التاريخ</th></tr></thead><tbody>
            ${logs.map((l) => `<tr><td class="mono">${U.esc(l.invoiceNumber)}</td><td>${statusBadge(l.status)}</td><td><span class="badge badge-gold">${U.esc(l.environment)}</span></td><td>${U.esc(l.message)}</td><td class="mono" style="font-size:9.5px">${U.esc(String(l.invoiceHash || '').slice(0, 16))}...</td><td>${U.formatDateTime(l.at)}</td></tr>`).join('')}
          </tbody></table></div>` : UI.empty('list', 'لا توجد عمليات بعد')}</div>
        </div>`;

      view.querySelector('[data-verify]').addEventListener('click', verifyModal);
      view.querySelector('[data-export]').addEventListener('click', () => { try { Zatca.exportLogs(); } catch (e) { UI.toast(e.message, 'error'); } });
      view.querySelector('[data-save]').addEventListener('click', () => {
        const s = Store.data.settings.zatca;
        s.environment = view.querySelector('[data-env]').value;
        s.csidType = view.querySelector('[data-csid]').value;
        s.vatNumber = view.querySelector('[data-vat]').value.trim();
        s.commonName = view.querySelector('[data-cn]').value.trim();
        s.serialNumber = view.querySelector('[data-serial]').value.trim();
        s.invoiceType = view.querySelector('[data-type]').value;
        s.autoReport = view.querySelector('[data-auto]').checked;
        Store.audit('تحديث إعدادات ZATCA', `${s.environment} — ${s.csidType}`, 'settings');
        Store.save(); UI.toast('تم حفظ إعدادات Sandbox', 'success'); Pages.zatca.render(view);
      });
      view.querySelector('[data-reset]').addEventListener('click', () => {
        UI.confirm({ title: 'إعادة ضبط إعدادات ZATCA', message: 'سيتم مسح آخر تجزئة وعداد الفواتير التجريبي. لن تُحذف الفواتير.', warn: true, confirmText: 'إعادة الضبط' }).then((ok) => {
          if (!ok) return;
          Store.data.settings.zatca.lastHash = '';
          Store.data.settings.zatca.invoiceCounter = 0;
          Store.save(); UI.toast('تمت إعادة الضبط', 'success'); Pages.zatca.render(view);
        });
      });
      const q = view.querySelector('[data-q]');
      if (q) q.addEventListener('input', U.debounce(() => { state.q = q.value; Pages.zatca.render(view); }, 250));
      const st = view.querySelector('[data-status]');
      if (st) st.addEventListener('change', () => { state.status = st.value; Pages.zatca.render(view); });
      view.querySelectorAll('[data-qr]').forEach((b) => b.addEventListener('click', () => { const i = Store.invoice(b.dataset.qr); if (i) qrModal(i); }));
      view.querySelectorAll('[data-xml]').forEach((b) => b.addEventListener('click', () => { const i = Store.invoice(b.dataset.xml); if (i) xmlModal(i); }));
      view.querySelectorAll('[data-report]').forEach((b) => b.addEventListener('click', () => {
        try { Zatca.report(b.dataset.report); UI.toast('تم الإبلاغ التجريبي (Sandbox)', 'success'); Pages.zatca.render(view); } catch (e) { UI.toast(e.message, 'error'); }
      }));
      view.querySelectorAll('[data-clear]').forEach((b) => b.addEventListener('click', () => {
        try { Zatca.clear(b.dataset.clear); UI.toast('تمت المطابقة التجريبية (Sandbox)', 'success'); Pages.zatca.render(view); } catch (e) { UI.toast(e.message, 'error'); }
      }));
    }
  };
})();
