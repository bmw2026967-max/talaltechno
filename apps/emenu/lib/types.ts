export type MenuProduct = {
  id: string;
  name: string;
  nameEn?: string | null;
  price: number;
  taxRate?: number;
  categoryId?: string | null;
  categoryName?: string | null;
  emoji?: string | null;
  unit?: string;
  available: boolean;
  availableServings?: number | null;
};

export type MenuCategory = { id: string; name: string; nameEn?: string | null };

export type MenuData = {
  tenant: { name: string; vatNumber?: string | null; currency: string; city?: string | null };
  branch: { id: string; name: string; code: string };
  table: { id: string; name: string; token: string } | null;
  settings: { allowSelfOrder: boolean; requireTable: boolean; welcomeText: string };
  categories: MenuCategory[];
  products: MenuProduct[];
  disclaimer: string;
};

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  emoji?: string | null;
  qty: number;
  notes?: string;
};

export type PublicOrder = {
  id: string;
  number: string;
  status: string;
  type: string;
  tableName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
  message: string;
};
