import { demoMenu } from './demo';
import type { MenuData, PublicOrder } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type MenuResponse = { data: MenuData };

export async function fetchMenu(tableToken?: string, branchCode?: string): Promise<{ data: MenuData; source: 'api' | 'demo' }> {
  const params = new URLSearchParams();
  if (tableToken) params.set('table', tableToken);
  if (branchCode) params.set('branch', branchCode);
  const query = params.toString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const response = await fetch(`${API_URL}/public/menu${query ? `?${query}` : ''}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error('menu unavailable');
    const json = (await response.json()) as MenuResponse;
    if (!json?.data?.products) throw new Error('invalid menu payload');
    return { data: json.data, source: 'api' };
  } catch {
    return { data: demoMenu, source: 'demo' };
  }
}

export type PublicOrderPayload = {
  table?: string;
  branch?: string;
  type: 'dine_in' | 'takeaway';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: Array<{ productId: string; qty: number; notes?: string }>;
};

export async function submitPublicOrder(payload: PublicOrderPayload): Promise<PublicOrder> {
  const response = await fetch(`${API_URL}/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = (await response.json().catch(() => null)) as { data?: PublicOrder; message?: string | string[] } | null;
  if (!response.ok) {
    const message = Array.isArray(json?.message) ? json?.message.join('، ') : json?.message;
    throw new Error(message || 'تعذر إرسال الطلب. تأكد من الاتصال أو اطلب من الكاشير.');
  }
  if (!json?.data) throw new Error('استجابة غير متوقعة من الخادم.');
  return json.data;
}
