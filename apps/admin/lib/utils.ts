import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSAR(value: number | string | null | undefined, options: Intl.NumberFormatOptions = {}) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
    ...options
  }).format(amount);
}

export function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat('ar-SA').format(Number(value || 0));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    calendar: 'gregory',
    numberingSystem: 'latn'
  }).format(date);
}

export function shortDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-SA', {
    day: '2-digit',
    month: 'short',
    calendar: 'gregory',
    numberingSystem: 'latn'
  }).format(date);
}

export function statusLabel(status: string | null | undefined) {
  const map: Record<string, string> = {
    paid: 'مدفوعة',
    partial: 'جزئية',
    unpaid: 'غير مدفوعة',
    returned: 'مرتجعة',
    sale: 'بيع',
    return: 'مرتجع',
    new: 'جديد',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    served: 'مُقدّم',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    open: 'مفتوحة',
    closed: 'مغلقة',
    reported: 'مُبلّغ',
    cleared: 'مطابق',
    pending: 'معلّق',
    rejected: 'مرفوض',
    mock: 'محاكاة',
    sandbox: 'Sandbox',
    approved: 'ناجحة',
    declined: 'مرفوضة',
    received: 'مستلم',
    ordered: 'مطلوب',
    draft: 'مسودة'
  };
  return map[String(status || '').toLowerCase()] || status || '—';
}
