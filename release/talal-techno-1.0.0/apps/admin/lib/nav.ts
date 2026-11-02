import type { IconName } from '@/components/icons';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: 'نظرة عامة',
    items: [{ href: '/', label: 'لوحة التحكم', icon: 'dashboard' }]
  },
  {
    label: 'العمليات اليومية',
    items: [
      { href: '/sales', label: 'المبيعات والفواتير', icon: 'sales' },
      { href: '/orders', label: 'الطلبات والمطبخ', icon: 'orders' },
      { href: '/shifts', label: 'الورديات والصندوق', icon: 'shifts' }
    ]
  },
  {
    label: 'القائمة والمخزون',
    items: [
      { href: '/products', label: 'الأصناف والوصفات', icon: 'products' },
      { href: '/inventory', label: 'المخزون والهوالك', icon: 'inventory' },
      { href: '/purchasing', label: 'المشتريات والموردون', icon: 'purchasing' }
    ]
  },
  {
    label: 'المالية والامتثال',
    items: [
      { href: '/accounting', label: 'المحاسبة والتقارير', icon: 'accounting' },
      { href: '/zatca', label: 'ZATCA Sandbox', icon: 'zatca' },
      { href: '/integrations', label: 'التكاملات والطباعة', icon: 'integrations' }
    ]
  },
  {
    label: 'العملاء والنمو',
    items: [{ href: '/loyalty', label: 'الولاء والعروض', icon: 'loyalty' }]
  },
  {
    label: 'الإدارة',
    items: [{ href: '/settings', label: 'الإعدادات', icon: 'settings' }]
  }
];

export const allNavItems = navGroups.flatMap((group) => group.items);
