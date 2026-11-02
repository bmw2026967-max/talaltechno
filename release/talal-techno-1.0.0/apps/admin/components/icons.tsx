import type { ReactNode } from 'react';

export type IconName =
  | 'dashboard'
  | 'sales'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'accounting'
  | 'zatca'
  | 'integrations'
  | 'loyalty'
  | 'shifts'
  | 'purchasing'
  | 'settings'
  | 'menu'
  | 'close'
  | 'sun'
  | 'moon'
  | 'logout'
  | 'search'
  | 'plus'
  | 'arrow-left'
  | 'arrow-up'
  | 'check'
  | 'alert'
  | 'printer'
  | 'download'
  | 'refresh'
  | 'external'
  | 'chevron-down'
  | 'sparkles'
  | 'branch'
  | 'users'
  | 'device'
  | 'wallet'
  | 'trend'
  | 'shield'
  | 'clock'
  | 'cart'
  | 'qr'
  | 'flame'
  | 'receipt'
  | 'filter'
  | 'copy'
  | 'eye';

const paths: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  sales: (
    <>
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M8 8h8M8 12h8M8 16h4" />
    </>
  ),
  orders: (
    <>
      <path d="M8 3h8l2 3h3v15H3V6h3l2-3Z" />
      <path d="M8 3v4h8V3" />
      <path d="M8 12h8M8 16h5" />
    </>
  ),
  products: (
    <>
      <path d="M4 10h16" />
      <path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M9 14h6" />
    </>
  ),
  inventory: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4.3 7.7 7.7 4.4 7.7-4.4M12 12.1V21" />
    </>
  ),
  accounting: (
    <>
      <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v18l-3-2-3 2-2-2-2 2-3-2-3 2V4Z" />
      <path d="M8 7h8M8 11h8M8 15h3" />
    </>
  ),
  zatca: (
    <>
      <path d="M12 3 4.5 6v6c0 4.4 3.2 8 7.5 9 4.3-1 7.5-4.6 7.5-9V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  integrations: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" />
      <path d="M12 17v4" />
    </>
  ),
  loyalty: (
    <>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M3 12h18M12 8v13" />
      <path d="M12 8H8a2.5 2.5 0 1 1 0-5c2 0 4 5 4 5Zm0 0h4a2.5 2.5 0 1 0 0-5c-2 0-4 5-4 5Z" />
    </>
  ),
  shifts: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  purchasing: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-left': <path d="M19 12H5m6-6-6 6 6 6" />,
  'arrow-up': <path d="M12 19V5m-6 6 6-6 6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M10.3 3.9 2.4 17.4A1.7 1.7 0 0 0 3.9 20h16.2a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7M21 3l-9 9" />
      <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </>
  ),
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  sparkles: (
    <>
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 6h7M7.2 8.3l3.4 7M16.8 8.3l-3.4 7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <path d="M16 4.5a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 5.7V21" />
    </>
  ),
  device: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M10 18h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h14v4" />
      <path d="M3 7v11a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2Z" />
      <path d="M17 14h.01" />
    </>
  ),
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v6c0 4.4 3.2 8 7.5 9 4.3-1 7.5-4.6 7.5-9V6L12 3Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cart: (
    <>
      <path d="M2 3h2.5l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h9.3a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z" />
    </>
  ),
  flame: <path d="M12 22c4 0 6-2.6 6-6 0-4-3-6.5-4.5-10C12 8 10 8.5 10 12c-1.5-1-2-2.5-2-4-1.5 2-2 4-2 7 0 4.4 2.5 7 6 7Z" />,
  receipt: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  )
};

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.7
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
