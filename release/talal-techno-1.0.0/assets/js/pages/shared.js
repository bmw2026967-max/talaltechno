/* ==========================================================================
   طلال تكنو — Shared page helpers
   ========================================================================== */
(function () {
  'use strict';
  const PK = window.PK = {};

  PK.kpi = function (opts) {
    const tone = opts.tone || 'green';
    return `<div class="kpi">
      <div class="kpi-top"><div class="kpi-icon ${tone}">${U.icon(opts.icon || 'chart', 20)}</div>
        ${opts.delta || ''}</div>
      <div class="kpi-label">${U.esc(opts.label || '')}</div>
      <div class="kpi-value">${opts.value || '—'}</div>
      <div class="kpi-foot"><div class="kpi-sub">${opts.sub || ''}</div>${opts.spark || ''}</div>
    </div>`;
  };

  PK.delta = function (value, label) {
    const v = Number(value) || 0;
    return `<span class="kpi-delta ${v > 0.5 ? 'up' : v < -0.5 ? 'down' : 'flat'}">${U.icon(v >= 0 ? 'arrowUpRight' : 'arrowDownRight', 11)} ${U.num(Math.abs(v), 1)}%${label ? ' ' + U.esc(label) : ''}</span>`;
  };

  PK.emptyRow = function (cols, icon, title, text) {
    return `<tr><td colspan="${cols}" style="padding:0">${UI.empty(icon || 'box', title || 'لا توجد بيانات', text || '')}</td></tr>`;
  };

  PK.filterList = function (list, q, fields) {
    const norm = (s) => String(s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
    const needle = norm(q);
    if (!needle) return list;
    return list.filter((item) => (fields || []).some((f) => norm(typeof f === 'function' ? f(item) : item[f]).includes(needle)));
  };

  PK.accountOptions = function (type, selected, opts = {}) {
    let accounts = Store.data.accounts.filter((a) => !a.isGroup && (!type || a.type === type));
    if (opts.exclude) accounts = accounts.filter((a) => !opts.exclude.includes(a.id));
    return accounts.sort((a, b) => String(a.code).localeCompare(String(b.code)))
      .map((a) => `<option value="${a.id}" ${String(a.id) === String(selected) ? 'selected' : ''}>${U.esc(a.code)} — ${U.esc(a.name)}</option>`).join('');
  };

  PK.productOptions = function (selected) {
    return Store.data.products.filter((p) => p.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((p) => `<option value="${p.id}" ${String(p.id) === String(selected) ? 'selected' : ''}>${U.esc(p.name)} — ${U.esc(p.sku)}</option>`).join('');
  };

  PK.customerOptions = function (selected, blank) {
    const rows = Store.data.customers.filter((c) => c.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((c) => `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${U.esc(c.name)}${c.phone ? ' — ' + U.esc(c.phone) : ''}</option>`);
    if (blank) rows.unshift(`<option value="">${U.esc(blank)}</option>`);
    return rows.join('');
  };

  PK.supplierOptions = function (selected) {
    return Store.data.suppliers.filter((s) => s.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      .map((s) => `<option value="${s.id}" ${String(s.id) === String(selected) ? 'selected' : ''}>${U.esc(s.name)}${s.phone ? ' — ' + U.esc(s.phone) : ''}</option>`).join('');
  };

  PK.categoryOptions = function (selected, blank) {
    const rows = Store.data.categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(selected) ? 'selected' : ''}>${U.esc(c.name)}</option>`);
    if (blank) rows.unshift(`<option value="">${U.esc(blank)}</option>`);
    return rows.join('');
  };

  PK.branchOptions = function (selected) {
    return Store.data.branches.filter((b) => b.active !== false)
      .map((b) => `<option value="${b.id}" ${String(b.id) === String(selected) ? 'selected' : ''}>${U.esc(b.name)}</option>`).join('');
  };

  /* ---------- Generic form modal ---------- */
  PK.formModal = function (opts) {
    const values = opts.values || {};
    const fields = (opts.fields || []).map((f) => {
      const raw = values[f.name] !== undefined ? values[f.name] : (f.value !== undefined ? f.value : '');
      const value = raw == null ? '' : raw;
      const attrs = [
        f.required ? 'required' : '',
        f.disabled ? 'disabled' : '',
        f.min !== undefined ? `min="${f.min}"` : '',
        f.max !== undefined ? `max="${f.max}"` : '',
        f.step !== undefined ? `step="${f.step}"` : '',
        f.maxlength ? `maxlength="${f.maxlength}"` : ''
      ].filter(Boolean).join(' ');
      let input;
      if (f.type === 'select') {
        input = `<select class="select" name="${f.name}" ${attrs}>${(f.options || []).map((o) =>
          `<option value="${U.esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${U.esc(o.label)}</option>`).join('')}</select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea class="textarea" name="${f.name}" placeholder="${U.esc(f.placeholder || '')}" ${attrs}>${U.esc(value)}</textarea>`;
      } else if (f.type === 'checkbox') {
        input = `<label class="checkline" style="height:42px"><input type="checkbox" name="${f.name}" ${value ? 'checked' : ''} ${f.disabled ? 'disabled' : ''}/> ${U.esc(f.text || f.label || '')}</label>`;
      } else {
        input = `<input class="input ${f.num ? 'num' : ''}" type="${f.type || 'text'}" name="${f.name}" value="${U.esc(value)}" placeholder="${U.esc(f.placeholder || '')}" ${attrs} />`;
      }
      return `<div class="field ${f.full ? 'full' : ''}">
        ${f.type === 'checkbox' ? '' : `<label>${U.esc(f.label || '')}${f.required ? ' <span class="req">*</span>' : ''}</label>`}
        ${input}${f.help ? `<div class="help">${f.help}</div>` : ''}
      </div>`;
    }).join('');
    return UI.modal({
      size: opts.size || 'md',
      title: opts.title || 'نموذج',
      subtitle: opts.subtitle || '',
      icon: opts.icon || 'edit',
      body: `<div class="form-grid">${fields}</div>${opts.extraBody || ''}`,
      footer: `<span class="foot-info">${opts.footInfo || ''}</span>
        <button class="btn btn-secondary" data-cancel>إلغاء</button>
        <button class="btn btn-primary" data-submit>${U.icon(opts.submitIcon || 'save', 15)} ${U.esc(opts.submitText || 'حفظ')}</button>`,
      onMount(modal, close) {
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        const submit = modal.querySelector('[data-submit]');
        submit.addEventListener('click', () => {
          const data = UI.values(modal);
          try {
            const result = opts.onSubmit ? opts.onSubmit(data, modal, close) : true;
            if (result !== false) {
              close();
              if (opts.toast !== false) UI.toast(opts.successMessage || 'تم الحفظ بنجاح', 'success');
              if (opts.onDone) opts.onDone(result);
            }
          } catch (e) {
            console.error(e);
            UI.toast(e.message || 'تعذر حفظ البيانات', 'error');
          }
        });
        if (opts.onMount) opts.onMount(modal, close);
      }
    });
  };

  /* ---------- Print helpers ---------- */
  function docBrand() {
    const s = Store.data.settings;
    return `<div class="doc-brand"><div class="doc-logo">م</div><div><strong>${U.esc(s.company)}</strong><span>${U.esc(s.legalName)} • الرقم الضريبي: ${U.esc(s.taxNumber)}</span><span>${U.esc(s.address)} • ${U.esc(s.phone)}</span></div></div>`;
  }

  PK.printReport = function (opts) {
    const s = Store.data.settings;
    const rows = (opts.rows || []).map((row) => `<tr>${row.map((cell, i) =>
      `<td class="${i > 0 ? 'num' : ''}">${cell == null ? '' : cell}</td>`).join('')}</tr>`).join('');
    const totals = opts.totals ? `<div class="totals">${opts.totals.map((t) =>
      `<div class="row ${t.grand ? 'grand' : ''}"><span>${U.esc(t.label)}</span><b>${t.value}</b></div>`).join('')}</div>` : '';
    const body = `<div class="doc-head">${docBrand()}
      <div class="doc-meta"><h2>${U.esc(opts.title || 'تقرير')}</h2>
        ${opts.subtitle ? `<div>${U.esc(opts.subtitle)}</div>` : ''}
        <div>${U.formatDate(opts.date || U.today(), 'full')}</div>
      </div></div>
      ${opts.note ? `<div class="party" style="margin-bottom:12px"><div class="lbl">ملاحظات</div><strong>${U.esc(opts.note)}</strong></div>` : ''}
      <table class="items"><thead><tr>${(opts.headers || []).map((h) => `<th>${U.esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows || '<tr><td colspan="' + (opts.headers || []).length + '" style="text-align:center;padding:18px">لا توجد بيانات في الفترة المحددة</td></tr>'}</tbody></table>
      ${totals}
      <div class="doc-foot"><div>${U.esc(s.company)} — ${U.esc(s.phone)}</div><div>${U.esc(s.website || '')}</div></div>`;
    U.printDoc(opts.title || 'تقرير', body, { width: '210mm' });
  };

  PK.exportCSV = function (filename, headers, rows) {
    UI.exportCSV(filename, headers, rows);
  };

  /* ---------- Date range helpers ---------- */
  PK.rangeInputs = function (from, to, extra) {
    return `<div class="toolbar" style="border:1px solid var(--line);border-radius:12px;margin-bottom:16px">
      ${extra || ''}
      <div class="toolbar-spacer"></div>
      <div class="segmented" data-presets>
        <button type="button" data-preset="today">اليوم</button>
        <button type="button" data-preset="7">7 أيام</button>
        <button type="button" data-preset="30">30 يوماً</button>
        <button type="button" data-preset="month">هذا الشهر</button>
      </div>
      <input type="date" class="input" data-from value="${from}" />
      <span class="text-muted text-xs">إلى</span>
      <input type="date" class="input" data-to value="${to}" />
      <button class="btn btn-secondary btn-sm" data-apply>${U.icon('refresh', 14)} تحديث</button>
    </div>`;
  };

  PK.bindRange = function (root, onChange) {
    const from = root.querySelector('[data-from]');
    const to = root.querySelector('[data-to]');
    const fire = () => { if (from && to && from.value && to.value) onChange(from.value, to.value); };
    root.querySelectorAll('[data-presets] button').forEach((b) => b.addEventListener('click', () => {
      const r = U.presetRange(b.dataset.preset);
      if (from) from.value = r.from;
      if (to) to.value = r.to;
      root.querySelectorAll('[data-presets] button').forEach((x) => x.classList.toggle('active', x === b));
      fire();
    }));
    const apply = root.querySelector('[data-apply]');
    if (apply) apply.addEventListener('click', fire);
    if (from) from.addEventListener('change', fire);
    if (to) to.addEventListener('change', fire);
  };

  PK.barcodeLabel = function (p) {
    U.printDoc('بطاقة صنف — ' + p.name, `<div style="text-align:center;padding:10px">
      <div style="font-weight:800;font-size:14px">${U.esc(Store.data.settings.company)}</div>
      <div style="font-size:12px;margin-top:2px">${U.esc(p.name)}</div>
      <div style="font-size:10px;color:#6d7f76">${U.esc(p.sku)} • ${U.money(p.price)}</div>
      ${U.barcodeHtml(p.barcode || p.sku)}
      <div style="font-size:9px;color:#6d7f76">${U.esc(p.unit || '')} • ${U.esc(Store.category(p.categoryId) ? Store.category(p.categoryId).name : '')}</div>
    </div>`, { width: '80mm' });
  };
})();
