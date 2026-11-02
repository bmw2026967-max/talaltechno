import type { MenuData } from './types';

export const demoMenu: MenuData = {
  tenant: {
    name: 'مطعم طلال تكنو',
    vatNumber: '310123456700003',
    currency: 'SAR',
    city: 'الرياض'
  },
  branch: { id: 'b1', name: 'الفرع الرئيسي — العليا', code: 'RUH-01' },
  table: { id: 't3', name: 'T03', token: 'demo-table-t03' },
  settings: {
    allowSelfOrder: true,
    requireTable: true,
    welcomeText: 'أهلاً بكم في مطعم طلال تكنو — اختر أصنافك المفضلة وسنبدأ التحضير فوراً.'
  },
  categories: [
    { id: 'cat_main', name: 'الأطباق الرئيسية', nameEn: 'Main Courses' },
    { id: 'cat_grill', name: 'المشاوي', nameEn: 'Grills' },
    { id: 'cat_starter', name: 'المقبلات', nameEn: 'Starters' },
    { id: 'cat_drinks', name: 'المشروبات', nameEn: 'Drinks' },
    { id: 'cat_dessert', name: 'الحلويات', nameEn: 'Desserts' },
    { id: 'cat_special', name: 'عروض العائلة', nameEn: 'Family Offers' }
  ],
  products: [
    { id: 'p1', name: 'كبسة دجاج', nameEn: 'Chicken Kabsa', price: 32, taxRate: 15, categoryId: 'cat_main', categoryName: 'الأطباق الرئيسية', emoji: '🍛', unit: 'طبق', available: true, availableServings: 26 },
    { id: 'p2', name: 'مندي لحم', nameEn: 'Lamb Mandi', price: 48, taxRate: 15, categoryId: 'cat_main', categoryName: 'الأطباق الرئيسية', emoji: '🍖', unit: 'طبق', available: true, availableServings: 18 },
    { id: 'p3', name: 'برياني دجاج', nameEn: 'Chicken Biryani', price: 34, taxRate: 15, categoryId: 'cat_main', categoryName: 'الأطباق الرئيسية', emoji: '🍚', unit: 'طبق', available: true, availableServings: 21 },
    { id: 'p4', name: 'شيش طاووق', nameEn: 'Shish Tawook', price: 38, taxRate: 15, categoryId: 'cat_grill', categoryName: 'المشاوي', emoji: '🍢', unit: 'طبق', available: true, availableServings: 32 },
    { id: 'p5', name: 'كباب لحم', nameEn: 'Lamb Kebab', price: 42, taxRate: 15, categoryId: 'cat_grill', categoryName: 'المشاوي', emoji: '🥩', unit: 'طبق', available: true, availableServings: 14 },
    { id: 'p6', name: 'دجاج مشوي', nameEn: 'Grilled Chicken', price: 36, taxRate: 15, categoryId: 'cat_grill', categoryName: 'المشاوي', emoji: '🍗', unit: 'نصف دجاجة', available: true, availableServings: 19 },
    { id: 'p7', name: 'حمص بالطحينة', nameEn: 'Hummus', price: 18, taxRate: 15, categoryId: 'cat_starter', categoryName: 'المقبلات', emoji: '🥣', unit: 'طبق', available: true, availableServings: 44 },
    { id: 'p8', name: 'متبل باذنجان', nameEn: 'Moutabal', price: 16, taxRate: 15, categoryId: 'cat_starter', categoryName: 'المقبلات', emoji: '🍆', unit: 'طبق', available: true, availableServings: 38 },
    { id: 'p9', name: 'سلطة فتوش', nameEn: 'Fattoush', price: 20, taxRate: 15, categoryId: 'cat_starter', categoryName: 'المقبلات', emoji: '🥗', unit: 'طبق', available: true, availableServings: 30 },
    { id: 'p10', name: 'سمبوسة جبن', nameEn: 'Cheese Sambosa', price: 14, taxRate: 15, categoryId: 'cat_starter', categoryName: 'المقبلات', emoji: '🥟', unit: '5 حبات', available: false, availableServings: 0 },
    { id: 'p11', name: 'عصير ليمون بالنعناع', nameEn: 'Lemon Mint', price: 12, taxRate: 15, categoryId: 'cat_drinks', categoryName: 'المشروبات', emoji: '🍹', unit: 'كوب', available: true, availableServings: 96 },
    { id: 'p12', name: 'كركديه بارد', nameEn: 'Hibiscus Cooler', price: 10, taxRate: 15, categoryId: 'cat_drinks', categoryName: 'المشروبات', emoji: '🧊', unit: 'كوب', available: true, availableServings: 60 },
    { id: 'p13', name: 'قهوة سعودية', nameEn: 'Saudi Coffee', price: 8, taxRate: 15, categoryId: 'cat_drinks', categoryName: 'المشروبات', emoji: '☕', unit: 'دلة صغيرة', available: true, availableServings: 48 },
    { id: 'p14', name: 'مياه معدنية', nameEn: 'Mineral Water', price: 3, taxRate: 15, categoryId: 'cat_drinks', categoryName: 'المشروبات', emoji: '💧', unit: 'حبة', available: true, availableServings: 96 },
    { id: 'p15', name: 'كنافة بالجبن', nameEn: 'Cheese Kunafa', price: 24, taxRate: 15, categoryId: 'cat_dessert', categoryName: 'الحلويات', emoji: '🍰', unit: 'طبق', available: true, availableServings: 22 },
    { id: 'p16', name: 'أم علي', nameEn: 'Umm Ali', price: 22, taxRate: 15, categoryId: 'cat_dessert', categoryName: 'الحلويات', emoji: '🥮', unit: 'طبق', available: true, availableServings: 16 },
    { id: 'p17', name: 'وجبة عائلية — 4 أشخاص', nameEn: 'Family Meal', price: 129, taxRate: 15, categoryId: 'cat_special', categoryName: 'عروض العائلة', emoji: '🍽️', unit: 'وجبة', available: true, availableServings: 12 },
    { id: 'p18', name: 'وجبة فردية سريعة', nameEn: 'Quick Combo', price: 45, taxRate: 15, categoryId: 'cat_special', categoryName: 'عروض العائلة', emoji: '🥡', unit: 'وجبة', available: true, availableServings: 20 }
  ],
  disclaimer: 'طلب تجريبي عبر القائمة الإلكترونية — الدفع عند الكاشير. لا تُجرى مدفوعات إلكترونية من هذه الصفحة.'
};
