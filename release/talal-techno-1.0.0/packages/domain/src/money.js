/**
 * Money helpers shared by every domain module.
 * Amounts are stored as numbers rounded to two decimals (SAR halalas).
 */

export const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

export const sum = (list, selector) => {
  const rows = Array.isArray(list) ? list : [];
  return round2(rows.reduce((total, row) => total + (Number(selector ? selector(row) : row) || 0), 0));
};

export const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);

export const formatSAR = (value, locale = 'ar-SA') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(round2(value));

export const percentOf = (value, rate) => round2((Number(value) || 0) * (Number(rate) || 0) / 100);
