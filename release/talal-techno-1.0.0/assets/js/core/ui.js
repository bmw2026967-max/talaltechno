/* ==========================================================================
   طلال تكنو — UI primitives: modals, toasts, charts, confirmations
   ========================================================================== */
(function () {
  'use strict';
  const UI = window.UI = {};

  /* ---------- Toast ---------- */
  UI.toast = function (message, type = 'success', title) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const icons = { success: 'checkCircle', error: 'alert', warning: 'alert', info: 'info' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `<div class="toast-ico">${U.icon(icons[type] || 'info', 15)}</div>
      <div style="flex:1;min-width:0">${title ? `<div style="font-weight:800;margin-bottom:1px">${U.esc(title)}</div>` : ''}<div style="font-weight:500;color:var(--muted);font-size:11.5px;line-height:1.55">${U.esc(message)}</div></div>
      <button class="modal-close" style="width:24px;height:24px;flex:0 0 24px" aria-label="إغلاق">${U.icon('x', 13)}</button>`;
    root.appendChild(el);
    const remove = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    el.querySelector('button').addEventListener('click', remove);
    setTimeout(remove, type === 'error' ? 5500 : 3800);
  };

  /* ---------- Modal ---------- */
  UI.modal = function (opts) {
    const root = document.getElementById('modal-root');
    if (!root) return { close() {} };
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const size = opts.size ? ' ' + opts.size : '';
    overlay.innerHTML = `<div class="modal${size}" role="dialog" aria-modal="true">
      ${opts.title ? `<div class="modal-head">
        ${opts.icon ? `<div class="m-ico">${U.icon(opts.icon, 19)}</div>` : ''}
        <div style="min-width:0"><div class="modal-title">${opts.title}</div>${opts.subtitle ? `<div class="modal-sub">${opts.subtitle}</div>` : ''}</div>
        <button class="modal-close" type="button" aria-label="إغلاق">${U.icon('x', 17)}</button>
      </div>` : ''}
      <div class="modal-body${opts.flush ? ' flush' : ''}">${opts.body || ''}</div>
      ${opts.footer !== undefined ? `<div class="modal-foot">${opts.footer}</div>` : ''}
    </div>`;
    root.appendChild(overlay);
    document.body.classList.add('modal-open');
    const modal = overlay.querySelector('.modal');
    const closeBtn = overlay.querySelector('.modal-close');
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity .15s';
      setTimeout(() => {
        overlay.remove();
        if (!document.querySelector('.modal-overlay')) document.body.classList.remove('modal-open');
        if (opts.onClose) opts.onClose();
      }, 150);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    document.addEventListener('keydown', onKey);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay && opts.closeOnBackdrop !== false) close();
    });
    if (opts.onMount) {
      try { opts.onMount(modal, close); } catch (e) { console.error(e); }
    }
    setTimeout(() => {
      const focusable = modal.querySelector('input:not([type=hidden]), select, textarea, button.btn-primary');
      if (focusable && opts.autoFocus !== false) { try { focusable.focus(); } catch (e) {} }
    }, 80);
    return { el: modal, overlay, close };
  };

  /* ---------- Confirm ---------- */
  UI.confirm = function (opts) {
    return new Promise((resolve) => {
      let answered = false;
      const m = UI.modal({
        size: 'sm',
        title: opts.title || 'تأكيد العملية',
        body: `<div class="confirm-icon ${opts.danger ? 'danger' : opts.warn ? 'warn' : 'green'}">${U.icon(opts.icon || (opts.danger ? 'trash' : 'help'), 26)}</div>
          <div class="confirm-text">${opts.message || ''}</div>`,
        footer: `<button class="btn btn-secondary" data-act="no">${U.esc(opts.cancelText || 'إلغاء')}</button>
          <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-act="yes">${U.esc(opts.confirmText || 'تأكيد')}</button>`,
        onMount(modal, close) {
          modal.querySelector('[data-act="no"]').addEventListener('click', () => { answered = true; resolve(false); close(); });
          modal.querySelector('[data-act="yes"]').addEventListener('click', () => { answered = true; resolve(true); close(); });
        },
        onClose() { if (!answered) resolve(false); }
      });
      return m;
    });
  };

  /* ---------- Charts ---------- */
  function niceMax(v) {
    if (v <= 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  UI.chartArea = function (el, opts) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return;
    const values = (opts.values || []).map((v) => Number(v) || 0);
    const labels = opts.labels || values.map((_, i) => String(i + 1));
    if (!values.length) { el.innerHTML = UI.empty('chart', 'لا توجد بيانات', 'لم تُسجل حركات في هذه الفترة'); return; }
    const W = 760, H = opts.height || 240;
    const pad = { top: 18, right: 14, bottom: 30, left: 52 };
    const iw = W - pad.left - pad.right;
    const ih = H - pad.top - pad.bottom;
    const maxVal = niceMax(Math.max(...values, 1));
    const x = (i) => pad.left + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw);
    const y = (v) => pad.top + ih - (v / maxVal) * ih;
    const points = values.map((v, i) => [x(i), y(v)]);
    let path = '';
    points.forEach((p, i) => { path += (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1); });
    const area = path + `L${points[points.length - 1][0].toFixed(1)},${(pad.top + ih).toFixed(1)}L${points[0][0].toFixed(1)},${(pad.top + ih).toFixed(1)}Z`;
    const gid = 'ag_' + Math.random().toString(36).slice(2, 8);
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const yy = pad.top + (ih / 4) * i;
      const val = maxVal - (maxVal / 4) * i;
      grid += `<line class="chart-grid-line" x1="${pad.left}" y1="${yy}" x2="${W - pad.right}" y2="${yy}"/>
        <text class="chart-axis-text" x="${pad.left - 8}" y="${yy + 3}" text-anchor="end">${U.num(val, 0)}</text>`;
    }
    let xLabels = '';
    const step = Math.max(1, Math.ceil(values.length / (opts.maxLabels || 7)));
    labels.forEach((lab, i) => {
      if (i % step !== 0 && i !== values.length - 1) return;
      xLabels += `<text class="chart-axis-text" x="${x(i)}" y="${H - 8}" text-anchor="middle">${U.esc(lab)}</text>`;
    });
    let dots = '';
    points.forEach((p, i) => {
      dots += `<g class="chart-point">
        <line class="chart-hover-line" x1="${p[0]}" y1="${pad.top}" x2="${p[0]}" y2="${pad.top + ih}"/>
        <circle cx="${p[0]}" cy="${p[1]}" r="12" fill="transparent"/>
        <circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="3.6"/>
        <title>${U.esc(labels[i])}: ${U.esc((opts.tooltip ? opts.tooltip(values[i], i) : U.money(values[i])))}</title>
      </g>`;
    });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${U.esc(opts.title || 'مخطط')}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--brand-2)" stop-opacity=".28"/>
        <stop offset="100%" stop-color="var(--brand-2)" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}${xLabels}
      <path d="${area}" fill="url(#${gid})"/>
      <path class="chart-line-path" d="${path}"/>
      ${dots}
    </svg>`;
  };

  UI.sparkline = function (values, tone = '') {
    const vals = (values || []).map((v) => Number(v) || 0);
    if (vals.length < 2) vals.push(0);
    const W = 82, H = 30, pad = 3;
    const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
    const range = max - min || 1;
    const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (W - pad * 2), H - pad - ((v - min) / range) * (H - pad * 2)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const area = line + `L${pts[pts.length - 1][0].toFixed(1)},${H}L${pts[0][0].toFixed(1)},${H}Z`;
    return `<svg class="spark ${tone}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path class="area" d="${area}"/><path class="line" d="${line}"/></svg>`;
  };

  UI.donut = function (items, centerLabel, centerValue) {
    const list = (items || []).filter((i) => Number(i.value) > 0);
    const total = U.sum(list, (i) => i.value);
    let acc = 0;
    const stops = list.map((i) => {
      const start = acc / total * 100;
      acc += i.value;
      const end = acc / total * 100;
      return `${i.color || '#0e5a44'} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });
    const bg = total ? `conic-gradient(${stops.join(',')})` : 'var(--card-3)';
    const legend = list.map((i) => {
      const pct = total ? (i.value / total * 100) : 0;
      return `<div class="legend-row"><span class="dot" style="background:${i.color || '#0e5a44'}"></span>
        <span class="lbl">${U.esc(i.label)}</span>
        <span class="pct">${U.num(pct, 0)}%</span>
        <span class="val">${U.esc(i.display !== undefined ? i.display : U.money(i.value))}</span></div>`;
    }).join('');
    return `<div class="donut-wrap">
      <div class="donut" style="background:${bg}">
        <div class="donut-center"><strong>${U.esc(centerValue !== undefined ? centerValue : U.moneyShort(total))}</strong><span>${U.esc(centerLabel || 'الإجمالي')}</span></div>
      </div>
      <div class="legend-list">${legend || '<div class="text-muted text-sm">لا توجد بيانات</div>'}</div>
    </div>`;
  };

  /* ---------- Common HTML ---------- */
  UI.avatar = function (name, cls = '', size) {
    const color = U.colorFor(name);
    return `<span class="avatar ${cls}" ${size ? `style="width:${size}px;height:${size}px;font-size:${Math.round(size / 3.4)}px;background:${color}"` : `style="background:${color}"`}>${U.esc(U.initials(name))}</span>`;
  };

  UI.empty = function (icon, title, text, action) {
    return `<div class="empty"><div class="empty-icon">${U.icon(icon || 'box', 26)}</div>
      <strong>${U.esc(title || 'لا توجد بيانات')}</strong>
      ${text ? `<p>${U.esc(text)}</p>` : ''}
      ${action || ''}</div>`;
  };

  UI.statusBadge = function (status) {
    const map = {
      paid: ['badge-green', 'مدفوعة'], partial: ['badge-amber', 'جزئية'], unpaid: ['badge-red', 'غير مدفوعة'],
      return: ['badge-purple', 'مرتجع'], quote: ['badge-blue', 'عرض سعر'], converted: ['badge-gray', 'محوّل'],
      active: ['badge-green', 'نشط'], inactive: ['badge-gray', 'موقوف']
    };
    const s = map[status] || ['badge-gray', status || '—'];
    return `<span class="badge ${s[0]}">${s[1]}</span>`;
  };

  UI.methodBadge = function (method) {
    const map = {
      cash: ['badge-green', 'نقدي', 'cash'], card: ['badge-blue', 'شبكة', 'card'], bank: ['badge-blue', 'بنكي', 'bank'],
      mada: ['badge-green', 'مدى', 'card'], applepay: ['badge-gray', 'Apple Pay', 'smartphone'],
      stcpay: ['badge-purple', 'STC Pay', 'phone'], visa: ['badge-blue', 'Visa', 'credit'],
      mastercard: ['badge-amber', 'Mastercard', 'credit'],
      wallet: ['badge-purple', 'محفظة', 'wallet'], credit: ['badge-amber', 'آجل', 'credit'], mixed: ['badge-purple', 'مختلط', 'credit'],
      quote: ['badge-blue', 'عرض سعر', 'file']
    };
    const m = map[method] || ['badge-gray', method || '—', 'info'];
    return `<span class="badge ${m[0]}">${U.icon(m[2], 11)}${m[1]}</span>`;
  };

  UI.rangeToolbar = function (from, to, extra = '') {
    return `<div class="toolbar" style="border:1px solid var(--line);border-radius:12px;margin-bottom:16px">
      <div class="searchbox">${U.icon('search', 15)}<input class="input" data-range-search placeholder="بحث..." /></div>
      ${extra}
      <div class="toolbar-spacer"></div>
      <div class="segmented" data-range-presets>
        <button type="button" data-preset="today">اليوم</button>
        <button type="button" data-preset="7">7 أيام</button>
        <button type="button" data-preset="30">30 يوماً</button>
        <button type="button" data-preset="month">هذا الشهر</button>
      </div>
      <input type="date" class="input" data-range-from value="${from}" />
      <span class="text-muted text-xs">إلى</span>
      <input type="date" class="input" data-range-to value="${to}" />
    </div>`;
  };

  UI.exportCSV = function (filename, headers, rows) {
    const content = U.csv([headers, ...rows]);
    U.download(filename, content, 'text/csv;charset=utf-8');
    UI.toast('تم تصدير الملف بنجاح', 'success');
  };

  UI.confirmDelete = function (message, onConfirm) {
    return UI.confirm({
      title: 'تأكيد الحذف', message, danger: true, confirmText: 'حذف',
      icon: 'trash'
    }).then((ok) => { if (ok) onConfirm(); });
  };

  /* ---------- Form helpers ---------- */
  UI.values = function (root) {
    const out = {};
    root.querySelectorAll('[name]').forEach((el) => {
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
      else out[el.name] = el.value;
    });
    return out;
  };

  UI.setBusy = function (btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>${label || 'جارٍ الحفظ...'}`;
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
  };

  UI.safe = function (fn) {
    try { return fn(); } catch (e) {
      console.error(e);
      UI.toast(e.message || 'حدث خطأ غير متوقع', 'error');
      return null;
    }
  };
})();
