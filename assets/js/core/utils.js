/* ==========================================================================
   طلال تكنو — Utilities, icons, formatting, dates, print & export helpers
   ========================================================================== */
(function () {
  'use strict';
  const U = window.U = {};

  /* ---------- DOM ---------- */
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  U.uid = (prefix = 'id') => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------- Numbers & money ---------- */
  U.round = (v, d = 2) => {
    const n = Number(v) || 0;
    const f = Math.pow(10, d);
    return Math.round((n + Number.EPSILON) * f) / f;
  };
  U.round2 = (v) => U.round(v, 2);
  U.num = (v, d = 0) => {
    const n = Number(v) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  U.money = (v, symbol) => {
    const sym = symbol !== undefined ? symbol : U.currency();
    const n = U.round2(v);
    const sign = n < 0 ? '-' : '';
    return sign + U.num(Math.abs(n), 2) + (sym ? ' ' + sym : '');
  };
  U.moneyShort = (v) => {
    const n = Number(v) || 0;
    const sym = U.currency();
    if (Math.abs(n) >= 1000000) return U.num(n / 1000000, 1) + ' م ' + sym;
    if (Math.abs(n) >= 1000) return U.num(n / 1000, 1) + ' ألف ' + sym;
    return U.money(n);
  };
  U.currency = () => (window.Store && Store.data && Store.data.settings && Store.data.settings.currency) || 'ر.س';
  U.pct = (v, d = 1) => U.num(v, d) + '%';
  U.parseNum = (v) => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const cleaned = String(v).replace(/[٬,\s]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };
  U.clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  U.sum = (arr, fn) => arr.reduce((a, b) => a + (fn ? (Number(fn(b)) || 0) : (Number(b) || 0)), 0);
  U.avg = (arr, fn) => arr.length ? U.sum(arr, fn) / arr.length : 0;
  U.max = (arr, fn) => arr.length ? Math.max(...arr.map((x) => Number(fn ? fn(x) : x) || 0)) : 0;
  U.unique = (arr) => Array.from(new Set(arr));
  U.groupBy = (arr, fn) => {
    const out = {};
    arr.forEach((item) => {
      const key = fn(item);
      (out[key] = out[key] || []).push(item);
    });
    return out;
  };
  U.sortBy = (arr, fn, desc = false) => arr.slice().sort((a, b) => {
    const av = fn(a), bv = fn(b);
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (desc ? -1 : 1);
  });
  U.initials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '؟';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return (parts[0][0] || '') + (parts[1][0] || '');
  };
  U.colorFor = (str) => {
    const colors = ['#0e5a44', '#2563a8', '#6d4fa3', '#a97c28', '#b13a33', '#0f766e', '#7c5c2e', '#3d5a80'];
    let h = 0;
    for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  };

  /* ---------- Dates ---------- */
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  U.MONTHS = MONTHS;
  U.DAYS = DAYS;
  U.iso = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt)) return '';
    const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  U.parseISO = (iso) => {
    if (!iso) return null;
    if (iso instanceof Date) return new Date(iso.getTime());
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return new Date(iso);
    return new Date(y, m - 1, d);
  };
  U.today = () => U.iso(new Date());
  U.nowISO = () => new Date().toISOString();
  U.addDays = (iso, days) => {
    const d = U.parseISO(iso) || new Date();
    d.setDate(d.getDate() + days);
    return U.iso(d);
  };
  U.addMonths = (iso, months) => {
    const d = U.parseISO(iso) || new Date();
    d.setMonth(d.getMonth() + months);
    return U.iso(d);
  };
  U.startOfMonth = (iso) => {
    const d = U.parseISO(iso) || new Date();
    return U.iso(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  U.endOfMonth = (iso) => {
    const d = U.parseISO(iso) || new Date();
    return U.iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  };
  U.startOfYear = (iso) => {
    const d = U.parseISO(iso) || new Date();
    return U.iso(new Date(d.getFullYear(), 0, 1));
  };
  U.daysBetween = (a, b) => {
    const d1 = U.parseISO(a), d2 = U.parseISO(b);
    if (!d1 || !d2) return 0;
    return Math.round((d2 - d1) / 86400000);
  };
  U.formatDate = (iso, style = 'short') => {
    if (!iso) return '—';
    const d = U.parseISO(iso);
    if (!d || isNaN(d)) return '—';
    const dd = d.getDate(), mm = MONTHS[d.getMonth()], yy = d.getFullYear();
    if (style === 'long') return `${DAYS[d.getDay()]} ${dd} ${mm} ${yy}`;
    if (style === 'full') return `${dd} ${mm} ${yy}`;
    if (style === 'month') return `${mm} ${yy}`;
    if (style === 'day') return `${dd} ${mm}`;
    if (style === 'numeric') return `${String(dd).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${yy}`;
    return `${dd} ${mm} ${yy}`;
  };
  U.formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    let h = d.getHours(); const m = d.getMinutes();
    const am = h < 12 ? 'ص' : 'م';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${am}`;
  };
  U.formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return U.formatDate(iso);
    return U.formatDate(U.iso(d)) + ' • ' + U.formatTime(iso);
  };
  U.timeAgo = (iso) => {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 172800) return 'أمس';
    if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} أيام`;
    return U.formatDate(U.iso(d));
  };
  U.monthKey = (iso) => String(iso || '').slice(0, 7);
  U.monthLabel = (key) => {
    const [y, m] = String(key).split('-').map(Number);
    return m ? `${MONTHS[m - 1]} ${y}` : key;
  };
  U.lastNDays = (n, end = U.today()) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(U.addDays(end, -i));
    return out;
  };
  U.daysRange = (from, to) => {
    const out = [];
    let d = from, guard = 0;
    while (d <= to && guard < 400) { out.push(d); d = U.addDays(d, 1); guard++; }
    return out;
  };
  U.presetRange = (key) => {
    const today = U.today();
    switch (key) {
      case 'today': return { from: today, to: today, label: 'اليوم' };
      case 'yesterday': { const y = U.addDays(today, -1); return { from: y, to: y, label: 'أمس' }; }
      case '7': return { from: U.addDays(today, -6), to: today, label: 'آخر 7 أيام' };
      case '30': return { from: U.addDays(today, -29), to: today, label: 'آخر 30 يوماً' };
      case 'month': return { from: U.startOfMonth(today), to: U.endOfMonth(today), label: 'هذا الشهر' };
      case 'lastMonth': { const lm = U.addMonths(today, -1); return { from: U.startOfMonth(lm), to: U.endOfMonth(lm), label: 'الشهر الماضي' }; }
      case 'year': return { from: U.startOfYear(today), to: today, label: 'هذا العام' };
      default: return { from: U.addDays(today, -29), to: today, label: 'آخر 30 يوماً' };
    }
  };
  U.inRange = (date, from, to) => (!from || date >= from) && (!to || date <= to);

  /* ---------- Arrays / files ---------- */
  U.debounce = (fn, ms = 220) => {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };
  U.csv = (rows) => rows.map((row) => row.map((cell) => {
    const s = String(cell == null ? '' : cell);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
  U.download = (filename, content, type = 'application/json;charset=utf-8') => {
    const blob = new Blob(['\ufeff' + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  U.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
      return true;
    }
  };
  U.barcode = () => {
    let code = '2';
    for (let i = 0; i < 11; i++) code += Math.floor(Math.random() * 10);
    // EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(code[i]) * (i % 2 === 0 ? 1 : 3);
    const check = (10 - (sum % 10)) % 10;
    return code + check;
  };
  U.range = (n) => Array.from({ length: n }, (_, i) => i);
  U.safe = (fn, fallback = '—') => { try { return fn(); } catch (e) { return fallback; } };

  /* ---------- Icons ---------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    pos: '<path d="M4 5h3l2.2 10.2a2 2 0 0 0 2 1.6h6.9a2 2 0 0 0 2-1.6L21 8H7"/><circle cx="10" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/>',
    cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h2.2l2.5 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L21 7H5.2"/>',
    receipt: '<path d="M5 3v18l2.5-1.6L10 21l2-1.6L14 21l2.5-1.6L19 21V3l-2.5 1.6L14 3l-2 1.6L10 3 7.5 4.6 5 3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    box: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
    bookOpen: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2V4Z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8V4Z"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M16 12h4M3 9h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    shield: '<path d="M12 3 5 6v6c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.6.77 1 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowDownRight: '<path d="M7 7l10 10M17 8v9H8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.3 3.3M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.5 10.5 0 0 0 4.1-.8"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 21v-5h5M21 3v5h-5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    credit: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M15 15h3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    barcode: '<path d="M4 6v12M8 6v12M11 6v12M14 6v12M17 6v12M20 6v12"/>',
    tag: '<path d="M20 13 13 20a2 2 0 0 1-2.8 0L3 12.8V3h9.8L20 10.2a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h4"/>',
    coins: '<circle cx="8" cy="8" r="5"/><path d="M13 13.5A5 5 0 1 1 8.5 19M8 6v4M6.5 8h3"/>',
    bank: '<path d="m3 9 9-6 9 6M4 9v9M20 9v9M2 21h20M8 12v3M12 12v3M16 12v3"/>',
    trendingUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    trendingDown: '<path d="m3 7 6 6 4-4 8 8"/><path d="M21 11v6h-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9L12 3Z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    map: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10Z"/><path d="M9 22V12h6v10"/>',
    bag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    scale: '<path d="M12 3v18M7 21h10M5 6h14M8 6 4 14h8L8 6Zm8 0-4 8h8l-4-8Z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9h9Z"/><path d="M21 8a9 9 0 0 0-5-5v5h5Z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8H7.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h4.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8Z"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m8.2 13.9-1.7 8 5.5-3 5.5 3-1.7-8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 17h.01"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
    package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    shoppingBag: '<path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M16 5l3 3M14 7l2 2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    minusCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M9 12h6"/>',
    wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.3a10 10 0 0 1 14 0M8.5 15.8a5 5 0 0 1 7 0M12 19h.01"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    cloud: '<path d="M17.5 19H6a4 4 0 0 1-.4-8A6 6 0 0 1 17.3 9a5 5 0 0 1 .2 10Z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    chef: '<path d="M7 13a4 4 0 1 1 2.2-7.3A4.5 4.5 0 0 1 17 7a4 4 0 1 1 0 8H7Z"/><path d="M7 13v7h10v-7M9 16h6"/>',
    flame: '<path d="M12 22c4 0 6.5-2.6 6.5-6.2 0-2.7-1.6-5.1-3.5-7.1-.9-1-1.8-2.2-2.2-3.7-2.8 1.7-4.5 4.5-4.5 7.4 0 1.2.3 2.2.8 3.1-1.2-.2-2-1.1-2.3-2.3C5.5 14.6 5.5 16 5.5 17c0 3 2.6 5 6.5 5Z"/>',
    fry: '<path d="M5 9h14l-1.2 11H6.2L5 9Z"/><path d="M8 9V6M12 9V4M16 9V6M3 21h18"/>',
    cold: '<path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5l-15.6 11"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M4 10l3.5 1L8 7.5M20 10l-3.5 1L16 7.5M4 14l3.5-1L8 16.5M20 14l-3.5-1L16 16.5"/>',
    cup: '<path d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z"/><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17M7 3v2M11 3v2M15 3v2"/>',
    cake: '<path d="M4 21h16V11H4v10Z"/><path d="M4 15c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M8 11V7M12 11V7M16 11V7"/><path d="M8 4.5c0 .8-.8 1.5-.8 1.5S6.4 5.3 6.4 4.5a.8.8 0 0 1 1.6 0ZM12 4.5c0 .8-.8 1.5-.8 1.5s-.8-.7-.8-1.5a.8.8 0 0 1 1.6 0ZM16 4.5c0 .8-.8 1.5-.8 1.5s-.8-.7-.8-1.5a.8.8 0 0 1 1.6 0Z"/>',
    car: '<path d="m5 11 1.5-5h11L19 11M3 11h18v7H3v-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M6 14h2M16 14h2"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM21 14v3M14 21h3M21 18v3"/>'
  };
  U.icon = (name, size = 18, cls = '') => {
    const inner = ICONS[name] || ICONS.info;
    return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  };
  U.icons = ICONS;

  /* ---------- Print ---------- */
  U.printDoc = function (title, bodyHtml, opts = {}) {
    const width = opts.width === '80mm' ? '80mm' : opts.width === '58mm' ? '58mm' : '210mm';
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return false;
    const pageCss = width === '210mm'
      ? '@page{size:A4;margin:12mm}'
      : `@page{size:${width} auto;margin:4mm}`;
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${U.esc(title)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        ${pageCss}
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:"Cairo","Segoe UI",Tahoma,sans-serif;color:#16211c;font-size:12px;line-height:1.6;padding:${width === '210mm' ? '0' : '0'};width:${width === '210mm' ? '100%' : 'auto'};max-width:${width === '210mm' ? '100%' : width};margin:0 auto;background:#fff}
        h1,h2,h3,h4{line-height:1.4}
        table{width:100%;border-collapse:collapse}
        .doc-head{display:flex;justify-content:space-between;gap:18px;border-bottom:2px solid #0e5a44;padding-bottom:14px;margin-bottom:16px}
        .doc-brand{display:flex;gap:10px;align-items:center}
        .doc-logo{width:46px;height:46px;border-radius:12px;background:#0e5a44;color:#eed9a9;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900}
        .doc-brand strong{display:block;font-size:18px;color:#0e5a44}
        .doc-brand span{display:block;font-size:9px;color:#6d7f76}
        .doc-meta{text-align:left;font-size:10px;color:#6d7f76}
        .doc-meta h2{font-size:17px;color:#16211c;margin-bottom:4px}
        .doc-meta b{color:#16211c}
        .doc-parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
        .party{border:1px solid #e3eae2;border-radius:8px;padding:9px 11px}
        .party .lbl{font-size:8px;color:#6d7f76;font-weight:700;letter-spacing:.5px;margin-bottom:2px}
        .party strong{display:block;font-size:12px}
        .party span{display:block;font-size:9.5px;color:#6d7f76}
        .items{width:100%;font-size:10.5px;margin-bottom:14px}
        .items th{background:#f3f6f2;color:#31463c;padding:7px 8px;text-align:right;border-bottom:1px solid #d4ded4;font-size:9.5px}
        .items td{padding:6px 8px;border-bottom:1px solid #edf1ec}
        .items .num{text-align:left;direction:ltr;font-variant-numeric:tabular-nums}
        .totals{margin-inline-start:auto;width:260px;font-size:10.5px}
        .totals .row{display:flex;justify-content:space-between;padding:3px 0;color:#6d7f76}
        .totals .row b{color:#16211c;direction:ltr}
        .totals .grand{border-top:2px solid #0e5a44;margin-top:5px;padding-top:6px;font-size:13px;font-weight:800;color:#0e5a44}
        .totals .grand b{color:#0e5a44;font-size:16px}
        .doc-foot{margin-top:22px;padding-top:12px;border-top:1px dashed #d4ded4;font-size:9px;color:#6d7f76;display:flex;justify-content:space-between;gap:12px}
        .badge-doc{display:inline-block;background:#e6f4ee;color:#0e5a44;font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:4px}
        .receipt{width:100%;font-size:10px}
        .receipt .r-head{text-align:center;padding-bottom:8px;border-bottom:1px dashed #b9c6bd}
        .receipt .r-head strong{display:block;font-size:14px}
        .receipt .r-head span{display:block;font-size:8.5px;color:#6d7f76}
        .receipt .r-meta{display:flex;justify-content:space-between;font-size:8.5px;padding:5px 0;color:#6d7f76;border-bottom:1px dashed #b9c6bd}
        .receipt table{font-size:8.8px;margin:6px 0}
        .receipt th{text-align:right;padding:3px 0;border-bottom:1px solid #d4ded4;font-size:8px}
        .receipt td{padding:3px 0}
        .receipt .num{text-align:left;direction:ltr}
        .receipt .r-tot{display:flex;justify-content:space-between;padding:2px 0;font-size:9px;color:#6d7f76}
        .receipt .r-tot b{color:#16211c}
        .receipt .r-grand{border-top:1px dashed #b9c6bd;margin-top:4px;padding-top:5px;font-size:12px;font-weight:800;color:#0e5a44}
        .receipt .r-grand b{font-size:15px}
        .receipt .r-foot{text-align:center;font-size:8px;color:#6d7f76;margin-top:10px;padding-top:7px;border-top:1px dashed #b9c6bd}
        .doc-zatca{display:flex;align-items:center;gap:10px;margin-top:14px;padding:9px 11px;border:1px dashed #b9c6bd;border-radius:8px;background:#f8faf7}
        .doc-zatca .dz-qr{flex:0 0 auto;width:92px;height:92px;background:#fff;padding:2px;line-height:0}
        .doc-zatca .dz-qr svg{width:100%;height:100%;display:block}
        .doc-zatca .dz-title{font-size:10px;font-weight:800}
        .doc-zatca .dz-meta{font-size:8px;color:#6d7f76;word-break:break-all}
        .doc-zatca .dz-note{font-size:7.5px;color:#a97c28;margin-top:2px}
        .receipt .r-qr{display:flex;flex-direction:column;align-items:center;gap:2px;margin:7px 0 2px}
        .receipt .r-qr svg{width:104px;height:104px}
        .receipt .r-qr span{font-size:7px;color:#6d7f76}
        .barcode{display:flex;gap:1.5px;justify-content:center;align-items:flex-end;height:34px;margin:8px 0 2px}
        .barcode i{display:block;background:#16211c;width:2px}
        .barcode-txt{text-align:center;font-size:8px;letter-spacing:3px;direction:ltr;color:#6d7f76}
        .sig{display:flex;justify-content:space-between;margin-top:34px;font-size:9px;color:#6d7f76}
        .sig div{text-align:center;width:30%;border-top:1px solid #d4ded4;padding-top:5px}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>${bodyHtml}
      <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
      </body></html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
    return true;
  };

  U.barcodeHtml = (code) => {
    const s = String(code || '');
    let bars = '';
    for (let i = 0; i < s.length; i++) {
      const n = Number(s[i]) || 0;
      for (let j = 0; j < 4; j++) {
        bars += `<i style="height:${18 + ((n + j) % 4) * 5}px;width:${1 + ((n + j) % 2)}px"></i>`;
      }
    }
    return `<div class="barcode">${bars}</div><div class="barcode-txt">${U.esc(s)}</div>`;
  };
})();
