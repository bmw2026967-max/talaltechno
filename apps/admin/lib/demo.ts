const today = '2026-10-27';

const at = (dayOffset: number, hour: number, minute = 15) => {
  const date = new Date(`${today}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const demoDashboard = {
  data: {
    today: { sales: 4820.5, gross: 5100, refunds: 279.5, orders: 63, avgTicket: 80.95, tax: 723.08 },
    month: { sales: 128450.75, gross: 131980.25, refunds: 3529.5, cogs: 43820.4, profit: 81100.85 },
    openChecks: 7,
    kitchenQueue: 3,
    deliveryOrders: 4,
    lowStock: [
      { productId: 'raw_1', name: 'دجاج طازج', unit: 'كجم', stock: 6.5, minStock: 8 },
      { productId: 'raw_2', name: 'أرز بسمتي', unit: 'كجم', stock: 9.2, minStock: 10 },
      { productId: 'raw_3', name: 'جبن عكاوي', unit: 'كجم', stock: 1.8, minStock: 2 },
      { productId: 'raw_4', name: 'فستق حلبي', unit: 'كجم', stock: 0.6, minStock: 1 }
    ],
    zatca: { status: 'sandbox', reported: 284, cleared: 92, pending: 3, rejected: 0, chainValid: true, chainChecked: 379 },
    warning: 'لوحة تجريبية — بيانات Sandbox وليست اعتماداً رسمياً.'
  }
};

export const demoTrend = {
  data: [
    { date: '2026-10-21', sales: 9820, returns: 120, orders: 118, tax: 1473 },
    { date: '2026-10-22', sales: 11240, returns: 240, orders: 131, tax: 1686 },
    { date: '2026-10-23', sales: 14680, returns: 310, orders: 168, tax: 2202 },
    { date: '2026-10-24', sales: 17420, returns: 180, orders: 194, tax: 2613 },
    { date: '2026-10-25', sales: 13860, returns: 420, orders: 156, tax: 2079 },
    { date: '2026-10-26', sales: 12110, returns: 95, orders: 142, tax: 1817 },
    { date: '2026-10-27', sales: 5100, returns: 279.5, orders: 63, tax: 765 }
  ]
};

export const demoTopProducts = {
  data: [
    { productId: 'p1', name: 'كبسة دجاج', qty: 184, revenue: 5888, cost: 1995, profit: 3893 },
    { productId: 'p2', name: 'مندي لحم', qty: 96, revenue: 4608, cost: 1810, profit: 2798 },
    { productId: 'p3', name: 'شيش طاووق', qty: 128, revenue: 4864, cost: 1720, profit: 3144 },
    { productId: 'p4', name: 'حمص بالطحينة', qty: 210, revenue: 3780, cost: 945, profit: 2835 },
    { productId: 'p5', name: 'عصير ليمون بالنعناع', qty: 176, revenue: 2112, cost: 520, profit: 1592 },
    { productId: 'p6', name: 'كنافة بالجبن', qty: 88, revenue: 2112, cost: 760, profit: 1352 }
  ]
};

export const demoRecent = {
  data: {
    invoices: [
      { id: 'i1', number: 'TT-1042', type: 'sale', customerName: 'شركة الواحة للضيافة', total: 184, status: 'paid', createdAt: at(0, 21, 10) },
      { id: 'i2', number: 'TT-1041', type: 'sale', customerName: 'عميل نقدي', total: 73.6, status: 'paid', createdAt: at(0, 20, 42) },
      { id: 'i3', number: 'TT-1040', type: 'sale', customerName: 'نورة العتيبي', total: 115, status: 'paid', createdAt: at(0, 20, 5) },
      { id: 'i4', number: 'RET-1008', type: 'return', customerName: 'عبدالله القحطاني', total: 36.8, status: 'returned', createdAt: at(0, 19, 50) },
      { id: 'i5', number: 'TT-1039', type: 'sale', customerName: 'عميل نقدي', total: 46, status: 'paid', createdAt: at(0, 19, 22) }
    ],
    orders: [
      { id: 'o1', number: 'ORD-2018', type: 'dine_in', status: 'preparing', tableName: 'T03', total: 138, items: 4, createdAt: at(0, 21, 4) },
      { id: 'o2', number: 'ORD-2017', type: 'takeaway', status: 'new', tableName: null, total: 50, items: 2, createdAt: at(0, 20, 58) },
      { id: 'o3', number: 'ORD-2016', type: 'delivery', status: 'ready', tableName: null, total: 69, items: 3, createdAt: at(0, 20, 35) },
      { id: 'o4', number: 'ORD-2015', type: 'dine_in', status: 'served', tableName: 'T11', total: 246, items: 6, createdAt: at(0, 20, 2) }
    ]
  }
};

export const demoInvoices = {
  data: [
    { id: 'i1', number: 'TT-1042', type: 'sale', status: 'paid', date: today, createdAt: at(0, 21, 10), customerName: 'شركة الواحة للضيافة', subtotal: 160, discount: 0, serviceCharge: 0, deliveryFee: 0, tax: 24, total: 184, paid: 184, due: 0, method: 'mada', orderType: 'delivery', tableName: null, cogs: 55.4, profit: 104.6, zatca: { status: 'CLEARED', uuid: 'z1' } },
    { id: 'i2', number: 'TT-1041', type: 'sale', status: 'paid', date: today, createdAt: at(0, 20, 42), customerName: 'عميل نقدي', subtotal: 64, discount: 0, serviceCharge: 0, deliveryFee: 0, tax: 9.6, total: 73.6, paid: 73.6, due: 0, method: 'cash', orderType: 'takeaway', tableName: null, cogs: 21.7, profit: 42.3, zatca: { status: 'REPORTED', uuid: 'z2' } },
    { id: 'i3', number: 'TT-1040', type: 'sale', status: 'paid', date: today, createdAt: at(0, 20, 5), customerName: 'نورة العتيبي', subtotal: 100, discount: 0, serviceCharge: 0, deliveryFee: 0, tax: 15, total: 115, paid: 115, due: 0, method: 'applepay', orderType: 'dine_in', tableName: 'T05', cogs: 34.2, profit: 65.8, zatca: { status: 'CLEARED', uuid: 'z3' } },
    { id: 'i4', number: 'RET-1008', type: 'return', status: 'returned', date: today, createdAt: at(0, 19, 50), customerName: 'عبدالله القحطاني', subtotal: 32, discount: 0, serviceCharge: 0, deliveryFee: 0, tax: 4.8, total: 36.8, paid: 36.8, due: 0, method: 'cash', orderType: 'takeaway', tableName: null, cogs: 10.85, profit: -10.85, zatca: { status: 'REPORTED', uuid: 'z4' } },
    { id: 'i5', number: 'TT-1039', type: 'sale', status: 'paid', date: today, createdAt: at(0, 19, 22), customerName: 'عميل نقدي', subtotal: 40, discount: 0, serviceCharge: 0, deliveryFee: 0, tax: 6, total: 46, paid: 46, due: 0, method: 'stcpay', orderType: 'takeaway', tableName: null, cogs: 13.5, profit: 26.5, zatca: { status: 'REPORTED', uuid: 'z5' } },
    { id: 'i6', number: 'TT-1038', type: 'sale', status: 'partial', date: today, createdAt: at(0, 18, 40), customerName: 'مها الشهري', subtotal: 100, discount: 10, serviceCharge: 0, deliveryFee: 0, tax: 13.5, total: 103.5, paid: 50, due: 53.5, method: 'mixed', orderType: 'dine_in', tableName: 'T07', cogs: 35, profit: 55, zatca: { status: 'REPORTED', uuid: 'z6' } },
    { id: 'i7', number: 'TT-1037', type: 'sale', status: 'paid', date: '2026-10-26', createdAt: at(1, 22, 12), customerName: 'عميل نقدي', subtotal: 200, discount: 20, serviceCharge: 10, deliveryFee: 0, tax: 28.5, total: 218.5, paid: 218.5, due: 0, method: 'mada', orderType: 'dine_in', tableName: 'T11', cogs: 70, profit: 110, zatca: { status: 'CLEARED', uuid: 'z7' } },
    { id: 'i8', number: 'TT-1036', type: 'sale', status: 'paid', date: '2026-10-26', createdAt: at(1, 21, 45), customerName: 'شركة الواحة للضيافة', subtotal: 320, discount: 0, serviceCharge: 16, deliveryFee: 5, tax: 51.15, total: 392.15, paid: 392.15, due: 0, method: 'bank', orderType: 'delivery', tableName: null, cogs: 110.4, profit: 209.6, zatca: { status: 'CLEARED', uuid: 'z8' } }
  ],
  meta: { page: 1, pageSize: 50, total: 8, pages: 1 }
};

export const demoOrders = {
  data: [
    { id: 'o1', number: 'ORD-2018', type: 'DINE_IN', status: 'PREPARING', table: { name: 'T03' }, total: 138, platform: 'DIRECT', createdAt: at(0, 21, 4), items: [{ name: 'كبسة دجاج', qty: 2 }, { name: 'حمص بالطحينة', qty: 1 }, { name: 'عصير ليمون', qty: 2 }] },
    { id: 'o2', number: 'ORD-2017', type: 'TAKEAWAY', status: 'NEW', table: null, total: 50, platform: 'DIRECT', createdAt: at(0, 20, 58), items: [{ name: 'شيش طاووق', qty: 1 }, { name: 'بطاطس مقلية', qty: 1 }] },
    { id: 'o3', number: 'ORD-2016', type: 'DELIVERY', status: 'READY', table: null, total: 69, platform: 'JAHEZ', platformName: 'Jahez', createdAt: at(0, 20, 35), items: [{ name: 'مندي لحم', qty: 1 }, { name: 'مياه معدنية', qty: 2 }] },
    { id: 'o4', number: 'ORD-2015', type: 'DINE_IN', status: 'SERVED', table: { name: 'T11' }, total: 246, platform: 'DIRECT', createdAt: at(0, 20, 2), items: [{ name: 'كبسة دجاج', qty: 4 }, { name: 'مشاوي مشكلة', qty: 2 }] },
    { id: 'o5', number: 'ORD-2014', type: 'CURBSIDE', status: 'COMPLETED', table: null, total: 92, platform: 'DIRECT', createdAt: at(0, 19, 40), items: [{ name: 'مندي لحم', qty: 1 }, { name: 'كنافة', qty: 1 }] },
    { id: 'o6', number: 'ORD-2013', type: 'DELIVERY', status: 'PREPARING', table: null, total: 115, platform: 'HUNGERSTATION', platformName: 'HungerStation', createdAt: at(0, 19, 12), items: [{ name: 'كباب لحم', qty: 2 }, { name: 'فتوش', qty: 1 }] }
  ]
};

export const demoMaterials = {
  data: [
    { id: 'raw_1', name: 'دجاج طازج', sku: 'RAW-002', unit: 'كجم', cost: 18, stock: 6.5, minStock: 8, value: 117, low: true, out: false },
    { id: 'raw_2', name: 'أرز بسمتي', sku: 'RAW-001', unit: 'كجم', cost: 6, stock: 9.2, minStock: 10, value: 55.2, low: true, out: false },
    { id: 'raw_3', name: 'لحم غنم', sku: 'RAW-003', unit: 'كجم', cost: 45, stock: 14.4, minStock: 5, value: 648, low: false, out: false },
    { id: 'raw_4', name: 'حمص', sku: 'RAW-004', unit: 'كجم', cost: 8, stock: 18.2, minStock: 5, value: 145.6, low: false, out: false },
    { id: 'raw_5', name: 'طحينة', sku: 'RAW-005', unit: 'كجم', cost: 22, stock: 8.4, minStock: 3, value: 184.8, low: false, out: false },
    { id: 'raw_6', name: 'زيت زيتون', sku: 'RAW-006', unit: 'لتر', cost: 35, stock: 7.2, minStock: 2, value: 252, low: false, out: false },
    { id: 'raw_7', name: 'جبن عكاوي', sku: 'RAW-017', unit: 'كجم', cost: 28, stock: 1.8, minStock: 2, value: 50.4, low: true, out: false },
    { id: 'raw_8', name: 'فستق حلبي', sku: 'RAW-018', unit: 'كجم', cost: 90, stock: 0.6, minStock: 1, value: 54, low: true, out: false },
    { id: 'raw_9', name: 'مياه معدنية', sku: 'RAW-019', unit: 'حبة', cost: 1.5, stock: 96, minStock: 24, value: 144, low: false, out: false },
    { id: 'raw_10', name: 'زيت طبخ', sku: 'RAW-020', unit: 'لتر', cost: 9, stock: 16.5, minStock: 5, value: 148.5, low: false, out: false }
  ],
  meta: { total: 10, low: 4, out: 0, value: 1799.5 }
};

export const demoAvailability = {
  data: [
    { id: 'p1', name: 'كبسة دجاج', category: 'الأطباق الرئيسية', recipe: [{ materialId: 'raw_1', qty: 0.25 }, { materialId: 'raw_2', qty: 0.2 }, { materialId: 'raw_10', qty: 0.02 }], availableServings: 26, available: true },
    { id: 'p2', name: 'مندي لحم', category: 'الأطباق الرئيسية', recipe: [{ materialId: 'raw_3', qty: 0.25 }, { materialId: 'raw_2', qty: 0.2 }], availableServings: 46, available: true },
    { id: 'p3', name: 'شيش طاووق', category: 'المشاوي', recipe: [{ materialId: 'raw_1', qty: 0.2 }, { materialId: 'raw_6', qty: 0.01 }], availableServings: 32, available: true },
    { id: 'p4', name: 'حمص بالطحينة', category: 'المقبلات', recipe: [{ materialId: 'raw_4', qty: 0.1 }, { materialId: 'raw_5', qty: 0.03 }], availableServings: 182, available: true },
    { id: 'p5', name: 'عصير ليمون بالنعناع', category: 'المشروبات', recipe: [{ materialId: 'raw_9', qty: 1 }], availableServings: 96, available: true },
    { id: 'p6', name: 'كنافة بالجبن', category: 'الحلويات', recipe: [{ materialId: 'raw_7', qty: 0.08 }, { materialId: 'raw_8', qty: 0.02 }], availableServings: 22, available: true },
    { id: 'p7', name: 'مياه معدنية', category: 'المشروبات', recipe: [{ materialId: 'raw_9', qty: 1 }], availableServings: 96, available: true }
  ]
};

export const demoProducts = {
  data: [
    { id: 'p1', categoryId: 'cat_main', categoryName: 'الأطباق الرئيسية', name: 'كبسة دجاج', nameEn: 'Chicken Kabsa', sku: 'M-001', barcode: null, type: 'menu', price: 32, cost: 9.8, taxRate: 15, unit: 'طبق', emoji: '🍛', active: true, available: true, minStock: 0, stock: 26, recipe: [{ materialId: 'raw_1', materialName: 'دجاج طازج', qty: 0.25, unit: 'كجم', cost: 18 }, { materialId: 'raw_2', materialName: 'أرز بسمتي', qty: 0.2, unit: 'كجم', cost: 6 }, { materialId: 'raw_10', materialName: 'زيت طبخ', qty: 0.02, unit: 'لتر', cost: 9 }] },
    { id: 'p2', categoryId: 'cat_main', categoryName: 'الأطباق الرئيسية', name: 'مندي لحم', nameEn: 'Lamb Mandi', sku: 'M-002', barcode: null, type: 'menu', price: 48, cost: 15.5, taxRate: 15, unit: 'طبق', emoji: '🍖', active: true, available: true, minStock: 0, stock: 46, recipe: [{ materialId: 'raw_3', materialName: 'لحم غنم', qty: 0.25, unit: 'كجم', cost: 45 }, { materialId: 'raw_2', materialName: 'أرز بسمتي', qty: 0.2, unit: 'كجم', cost: 6 }] },
    { id: 'p3', categoryId: 'cat_grill', categoryName: 'المشاوي', name: 'شيش طاووق', nameEn: 'Shish Tawook', sku: 'M-003', barcode: null, type: 'menu', price: 38, cost: 11.2, taxRate: 15, unit: 'طبق', emoji: '🍢', active: true, available: true, minStock: 0, stock: 32, recipe: [{ materialId: 'raw_1', materialName: 'دجاج طازج', qty: 0.2, unit: 'كجم', cost: 18 }, { materialId: 'raw_6', materialName: 'زيت زيتون', qty: 0.01, unit: 'لتر', cost: 35 }] },
    { id: 'p4', categoryId: 'cat_starter', categoryName: 'المقبلات', name: 'حمص بالطحينة', nameEn: 'Hummus', sku: 'M-004', barcode: null, type: 'menu', price: 18, cost: 3.9, taxRate: 15, unit: 'طبق', emoji: '🥣', active: true, available: true, minStock: 0, stock: 182, recipe: [{ materialId: 'raw_4', materialName: 'حمص', qty: 0.1, unit: 'كجم', cost: 8 }, { materialId: 'raw_5', materialName: 'طحينة', qty: 0.03, unit: 'كجم', cost: 22 }] },
    { id: 'p5', categoryId: 'cat_drinks', categoryName: 'المشروبات', name: 'عصير ليمون بالنعناع', nameEn: 'Lemon Mint', sku: 'M-005', barcode: null, type: 'menu', price: 12, cost: 2.1, taxRate: 15, unit: 'كوب', emoji: '🍹', active: true, available: true, minStock: 0, stock: 96, recipe: [{ materialId: 'raw_9', materialName: 'مياه معدنية', qty: 1, unit: 'حبة', cost: 1.5 }] },
    { id: 'p6', categoryId: 'cat_dessert', categoryName: 'الحلويات', name: 'كنافة بالجبن', nameEn: 'Kunafa', sku: 'M-006', barcode: null, type: 'menu', price: 24, cost: 7.9, taxRate: 15, unit: 'طبق', emoji: '🍰', active: true, available: true, minStock: 0, stock: 22, recipe: [{ materialId: 'raw_7', materialName: 'جبن عكاوي', qty: 0.08, unit: 'كجم', cost: 28 }, { materialId: 'raw_8', materialName: 'فستق حلبي', qty: 0.02, unit: 'كجم', cost: 90 }] },
    { id: 'p7', categoryId: 'cat_drinks', categoryName: 'المشروبات', name: 'مياه معدنية', nameEn: 'Water', sku: 'M-007', barcode: null, type: 'menu', price: 3, cost: 1.5, taxRate: 15, unit: 'حبة', emoji: '💧', active: true, available: true, minStock: 0, stock: 96, recipe: [{ materialId: 'raw_9', materialName: 'مياه معدنية', qty: 1, unit: 'حبة', cost: 1.5 }] },
    { id: 'raw_1', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'دجاج طازج', nameEn: 'Fresh Chicken', sku: 'RAW-002', barcode: null, type: 'raw', price: 0, cost: 18, taxRate: 15, unit: 'كجم', emoji: '🍗', active: true, available: true, minStock: 8, stock: 6.5, recipe: [] },
    { id: 'raw_2', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'أرز بسمتي', nameEn: 'Basmati Rice', sku: 'RAW-001', barcode: null, type: 'raw', price: 0, cost: 6, taxRate: 15, unit: 'كجم', emoji: '🍚', active: true, available: true, minStock: 10, stock: 9.2, recipe: [] },
    { id: 'raw_3', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'لحم غنم', nameEn: 'Lamb', sku: 'RAW-003', barcode: null, type: 'raw', price: 0, cost: 45, taxRate: 15, unit: 'كجم', emoji: '🥩', active: true, available: true, minStock: 5, stock: 14.4, recipe: [] },
    { id: 'raw_4', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'حمص', nameEn: 'Chickpeas', sku: 'RAW-004', barcode: null, type: 'raw', price: 0, cost: 8, taxRate: 15, unit: 'كجم', emoji: '🫘', active: true, available: true, minStock: 5, stock: 18.2, recipe: [] },
    { id: 'raw_5', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'طحينة', nameEn: 'Tahini', sku: 'RAW-005', barcode: null, type: 'raw', price: 0, cost: 22, taxRate: 15, unit: 'كجم', emoji: '🥜', active: true, available: true, minStock: 3, stock: 8.4, recipe: [] },
    { id: 'raw_6', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'زيت زيتون', nameEn: 'Olive Oil', sku: 'RAW-006', barcode: null, type: 'raw', price: 0, cost: 35, taxRate: 15, unit: 'لتر', emoji: '🫒', active: true, available: true, minStock: 2, stock: 7.2, recipe: [] },
    { id: 'raw_7', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'جبن عكاوي', nameEn: 'Akkawi Cheese', sku: 'RAW-017', barcode: null, type: 'raw', price: 0, cost: 28, taxRate: 15, unit: 'كجم', emoji: '🧀', active: true, available: true, minStock: 2, stock: 1.8, recipe: [] },
    { id: 'raw_8', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'فستق حلبي', nameEn: 'Pistachio', sku: 'RAW-018', barcode: null, type: 'raw', price: 0, cost: 90, taxRate: 15, unit: 'كجم', emoji: '🌰', active: true, available: true, minStock: 1, stock: 0.6, recipe: [] },
    { id: 'raw_9', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'مياه معدنية', nameEn: 'Water', sku: 'RAW-019', barcode: null, type: 'raw', price: 0, cost: 1.5, taxRate: 15, unit: 'حبة', emoji: '💧', active: true, available: true, minStock: 24, stock: 96, recipe: [] },
    { id: 'raw_10', categoryId: 'cat_raw', categoryName: 'مواد خام', name: 'زيت طبخ', nameEn: 'Cooking Oil', sku: 'RAW-020', barcode: null, type: 'raw', price: 0, cost: 9, taxRate: 15, unit: 'لتر', emoji: '🛢️', active: true, available: true, minStock: 5, stock: 16.5, recipe: [] }
  ]
};

export const demoMoves = {
  data: [
    { id: 'm1', productName: 'دجاج طازج', warehouse: 'المخزن الرئيسي', type: 'sale', qty: -0.9, unitCost: 18, value: -16.2, referenceNumber: 'TT-1042', note: 'صرف وصفة BOM', createdAt: at(0, 21, 10) },
    { id: 'm2', productName: 'أرز بسمتي', warehouse: 'المخزن الرئيسي', type: 'sale', qty: -0.75, unitCost: 6, value: -4.5, referenceNumber: 'TT-1042', note: 'صرف وصفة BOM', createdAt: at(0, 21, 10) },
    { id: 'm3', productName: 'مياه معدنية', warehouse: 'المخزن الرئيسي', type: 'sale', qty: -2, unitCost: 1.5, value: -3, referenceNumber: 'TT-1042', note: 'صرف وصفة BOM', createdAt: at(0, 21, 10) },
    { id: 'm4', productName: 'خس', warehouse: 'المخزن الرئيسي', type: 'waste', qty: -1.2, unitCost: 4, value: -4.8, referenceNumber: 'WST-1004', note: 'تلف أوراق', createdAt: at(0, 18, 20) },
    { id: 'm5', productName: 'أرز بسمتي', warehouse: 'المخزن الرئيسي', type: 'purchase', qty: 50, unitCost: 6, value: 300, referenceNumber: 'PO-1001', note: 'استلام من مؤسسة الرياض', createdAt: at(2, 10, 0) }
  ]
};

export const demoAccounts = {
  data: [
    { id: 'a1101', code: '1101', name: 'الصندوق (النقدية)', type: 'asset' },
    { id: 'a1102', code: '1102', name: 'البنك / الشبكة', type: 'asset' },
    { id: 'a1103', code: '1103', name: 'المدينون (العملاء)', type: 'asset' },
    { id: 'a1104', code: '1104', name: 'المخزون', type: 'asset' },
    { id: 'a1105', code: '1105', name: 'ضريبة القيمة المضافة — مدخلات', type: 'asset' },
    { id: 'a2101', code: '2101', name: 'الدائنون (الموردون)', type: 'liability' },
    { id: 'a2102', code: '2102', name: 'ضريبة القيمة المضافة — مخرجات', type: 'liability' },
    { id: 'a3101', code: '3101', name: 'رأس المال', type: 'equity' },
    { id: 'a4101', code: '4101', name: 'إيرادات المبيعات', type: 'revenue' },
    { id: 'a4102', code: '4102', name: 'إيرادات أخرى (خدمة / توصيل)', type: 'revenue' },
    { id: 'a4103', code: '4103', name: 'مرتجعات المبيعات', type: 'revenue' },
    { id: 'a5101', code: '5101', name: 'تكلفة البضاعة المباعة', type: 'expense' },
    { id: 'a5108', code: '5108', name: 'فاقد المخزون', type: 'expense' },
    { id: 'a5109', code: '5109', name: 'مصروفات متنوعة', type: 'expense' }
  ]
};

export const demoJournal = {
  data: [
    { id: 'j1', number: 'JE-TT-1042', date: today, description: 'فاتورة بيع TT-1042 — شركة الواحة للضيافة', sourceType: 'sale', totalDebit: 239.4, totalCredit: 239.4, balanced: true, lines: [{ accountCode: '1102', accountName: 'البنك / الشبكة', debit: 184, credit: 0 }, { accountCode: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: 160 }, { accountCode: '2102', accountName: 'ضريبة مخرجات', debit: 0, credit: 24 }, { accountCode: '5101', accountName: 'تكلفة البضاعة المباعة', debit: 55.4, credit: 0 }, { accountCode: '1104', accountName: 'المخزون', debit: 0, credit: 55.4 }] },
    { id: 'j2', number: 'JE-TT-1041', date: today, description: 'فاتورة بيع TT-1041 — عميل نقدي', sourceType: 'sale', totalDebit: 95.3, totalCredit: 95.3, balanced: true, lines: [{ accountCode: '1101', accountName: 'الصندوق', debit: 73.6, credit: 0 }, { accountCode: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: 64 }, { accountCode: '2102', accountName: 'ضريبة مخرجات', debit: 0, credit: 9.6 }, { accountCode: '5101', accountName: 'تكلفة البضاعة المباعة', debit: 21.7, credit: 0 }, { accountCode: '1104', accountName: 'المخزون', debit: 0, credit: 21.7 }] },
    { id: 'j3', number: 'JE-RET-1008', date: today, description: 'مرتجع بيع RET-1008 — أصل TT-1039', sourceType: 'sale_return', totalDebit: 47.65, totalCredit: 47.65, balanced: true, lines: [{ accountCode: '4103', accountName: 'مرتجعات المبيعات', debit: 32, credit: 0 }, { accountCode: '2102', accountName: 'ضريبة مخرجات', debit: 4.8, credit: 0 }, { accountCode: '1104', accountName: 'المخزون', debit: 10.85, credit: 0 }, { accountCode: '5101', accountName: 'تكلفة البضاعة المباعة', debit: 0, credit: 10.85 }, { accountCode: '1101', accountName: 'الصندوق', debit: 0, credit: 36.8 }] }
  ],
  meta: { page: 1, pageSize: 50, total: 3, pages: 1 }
};

export const demoTrialBalance = {
  data: {
    rows: [
      { accountId: '1101', accountCode: '1101', accountName: 'الصندوق (النقدية)', debit: 58240.5, credit: 41220.25, balance: 17020.25 },
      { accountId: '1102', accountCode: '1102', accountName: 'البنك / الشبكة', debit: 96820.75, credit: 22440, balance: 74380.75 },
      { accountId: '1103', accountCode: '1103', accountName: 'المدينون (العملاء)', debit: 12400, credit: 9800, balance: 2600 },
      { accountId: '1104', accountCode: '1104', accountName: 'المخزون', debit: 43820.4, credit: 12150, balance: 31670.4 },
      { accountId: '1105', accountCode: '1105', accountName: 'ضريبة مدخلات', debit: 6720, credit: 0, balance: 6720 },
      { accountId: '2101', accountCode: '2101', accountName: 'الدائنون (الموردون)', debit: 0, credit: 18400, balance: -18400 },
      { accountId: '2102', accountCode: '2102', accountName: 'ضريبة مخرجات', debit: 0, credit: 19267.61, balance: -19267.61 },
      { accountId: '3101', accountCode: '3101', accountName: 'رأس المال', debit: 0, credit: 100000, balance: -100000 },
      { accountId: '4101', accountCode: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: 131980.25, balance: -131980.25 },
      { accountId: '4102', accountCode: '4102', accountName: 'إيرادات أخرى', debit: 0, credit: 2800, balance: -2800 },
      { accountId: '4103', accountCode: '4103', accountName: 'مرتجعات المبيعات', debit: 3529.5, credit: 0, balance: 3529.5 },
      { accountId: '5101', accountCode: '5101', accountName: 'تكلفة البضاعة المباعة', debit: 43820.4, credit: 0, balance: 43820.4 },
      { accountId: '5109', accountCode: '5109', accountName: 'مصروفات متنوعة', debit: 12600, credit: 0, balance: 12600 }
    ],
    totalDebit: 267952.55,
    totalCredit: 267952.55,
    balanced: true
  }
};

export const demoIncomeStatement = {
  data: {
    revenue: 131980.25,
    returns: 3529.5,
    discounts: 1280,
    otherIncome: 2800,
    netSales: 127170.75,
    cogs: 43820.4,
    grossProfit: 83350.35,
    operatingExpenses: 12600,
    netProfit: 70750.35,
    note: 'تقرير Sandbox تجريبي — يعتمد على القيود المسجلة.'
  }
};

export const demoBalanceSheet = {
  data: {
    asOf: today,
    assets: 132391.4,
    liabilities: 37667.61,
    equity: 94723.79,
    profit: 70750.35,
    balanced: true,
    lines: []
  }
};

export const demoExpenses = {
  data: [
    { id: 'e1', category: 'مشتريات تشغيلية', amount: 120, method: 'cash', notes: 'مستلزمات تنظيف', date: '2026-10-26', branchName: 'الفرع الرئيسي — العليا', createdByName: 'منى عبدالله' },
    { id: 'e2', category: 'كهرباء ومياه', amount: 1860, method: 'bank', notes: 'فاتورة شهر أكتوبر', date: '2026-10-25', branchName: 'الفرع الرئيسي — العليا', createdByName: 'سارة العلي' },
    { id: 'e3', category: 'إيجار', amount: 12000, method: 'bank', notes: 'إيجار شهري', date: '2026-10-01', branchName: 'الفرع الرئيسي — العليا', createdByName: 'سارة العلي' }
  ],
  meta: { total: 13980 }
};

export const demoZatcaStatus = {
  data: {
    environment: 'sandbox',
    certified: false,
    warning: 'محاكاة Sandbox فقط — ليست اعتماداً رسمياً من هيئة الزكاة والضريبة والجمارك.',
    counts: { reported: 284, cleared: 92, pending: 3, rejected: 0, total: 379 },
    lastHash: '9f2c8b1e4a6d7c3f5e8a1b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e',
    runtime: { environment: 'sandbox', vatNumber: '310123456700003', commonName: 'Talal Techno Sandbox CSID', serialNumber: '1-Talal-Techno|2-Sandbox|3-0001', hasPrivateKey: false, hasCertificate: false },
    checklist: [
      { key: 'sandbox', label: 'بيئة Sandbox وليس إنتاج', ok: true },
      { key: 'vat', label: 'الرقم الضريبي مُعرّف', ok: true },
      { key: 'csid', label: 'CSID تجريبي (اختياري للعرض)', ok: false },
      { key: 'key', label: 'مفتاح خاص (غير مطلوب في Mock)', ok: true },
      { key: 'certificate', label: 'شهادة (غير مطلوبة في Mock)', ok: true }
    ]
  }
};

export const demoZatcaInvoices = {
  data: [
    { id: 'z1', invoiceNumber: 'TT-1042', customerName: 'شركة الواحة للضيافة', total: 184, type: 'standard', uuid: '8f4a2c1e-11aa-4c2b-9d31-0a1b2c3d4e5f', invoiceHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809', previousHash: '9f2c8b1e4a6d7c3f5e8a1b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e', status: 'CLEARED', environment: 'sandbox', issuedAt: at(0, 21, 10), warning: 'Sandbox' },
    { id: 'z2', invoiceNumber: 'TT-1041', customerName: 'عميل نقدي', total: 73.6, type: 'simplified', uuid: '7e3b1d0f-22bb-4d3c-8e42-1b2c3d4e5f60', invoiceHash: 'b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a', previousHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f809', status: 'REPORTED', environment: 'sandbox', issuedAt: at(0, 20, 42), warning: 'Sandbox' },
    { id: 'z3', invoiceNumber: 'TT-1040', customerName: 'نورة العتيبي', total: 115, type: 'simplified', uuid: '6d2a0c9e-33cc-4e4d-9f53-2c3d4e5f6071', invoiceHash: 'c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b', previousHash: 'b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a', status: 'CLEARED', environment: 'sandbox', issuedAt: at(0, 20, 5), warning: 'Sandbox' },
    { id: 'z4', invoiceNumber: 'RET-1008', customerName: 'عبدالله القحطاني', total: 36.8, type: 'simplified', uuid: '5c1b9d8e-44dd-4f5e-8a64-3d4e5f607182', invoiceHash: 'd4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c', previousHash: 'c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b', status: 'REPORTED', environment: 'sandbox', issuedAt: at(0, 19, 50), warning: 'Sandbox' }
  ],
  meta: { page: 1, pageSize: 50, total: 4, pages: 1 }
};

export const demoChain = {
  data: { valid: true, checked: 379, broken: [], tampered: [], lastHash: '9f2c8b1e4a6d7c3f5e8a1b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e', environment: 'sandbox', note: 'تحقق سلسلة التجزئة Sandbox — لا يمثل اعتماداً رسمياً.' }
};

export const demoIntegrations = {
  data: {
    payments: {
      mode: 'mock',
      providers: [
        { provider: 'hyperpay', name: 'HyperPay', configured: true },
        { provider: 'geidea', name: 'Geidea', configured: true },
        { provider: 'moyasar', name: 'Moyasar', configured: true },
        { provider: 'paytabs', name: 'PayTabs', configured: true }
      ]
    },
    delivery: {
      mode: 'mock',
      providers: [
        { platform: 'hungerstation', name: 'HungerStation', configured: true },
        { platform: 'jahez', name: 'Jahez', configured: true },
        { platform: 'mrsool', name: 'Mrsool', configured: true },
        { platform: 'toyou', name: 'ToYou', configured: true },
        { platform: 'careem', name: 'Careem', configured: true }
      ]
    },
    printer: { mode: 'mock', name: 'Talal Techno Mock Printer', width: 32 },
    zatca: { environment: 'sandbox', certified: false },
    disclaimer: 'كل التكاملات تعمل Mock/Sandbox افتراضياً. لا توجد مفاتيح إنتاج ولا ادعاء باعتماد ZATCA أو مدى.'
  }
};

export const demoPaymentTransactions = {
  data: [
    { id: 'pt1', provider: 'moyasar', providerName: 'Moyasar', method: 'stcpay', amount: 23.5, status: 'approved', transactionId: 'MOCK-MOYASAR-8841', reference: 'sandbox-seed', mode: 'mock', invoiceNumber: 'TT-1039', createdAt: at(0, 19, 22) },
    { id: 'pt2', provider: 'hyperpay', providerName: 'HyperPay', method: 'mada', amount: 184, status: 'approved', transactionId: 'MOCK-HYPERPAY-8840', reference: 'sandbox', mode: 'mock', invoiceNumber: 'TT-1042', createdAt: at(0, 21, 10) },
    { id: 'pt3', provider: 'geidea', providerName: 'Geidea', method: 'visa', amount: 115, status: 'approved', transactionId: 'MOCK-GEIDEA-8839', reference: 'sandbox', mode: 'mock', invoiceNumber: 'TT-1040', createdAt: at(0, 20, 5) }
  ]
};

export const demoDeliveryOrders = {
  data: [
    { id: 'd1', platform: 'jahez', platformName: 'Jahez', externalOrderId: 'JH-88231', status: 'ready', total: 69, orderNumber: 'ORD-2016', branchName: 'الفرع الرئيسي — العليا', createdAt: at(0, 20, 35), syncedAt: at(0, 20, 36) },
    { id: 'd2', platform: 'hungerstation', platformName: 'HungerStation', externalOrderId: 'HS-55210', status: 'preparing', total: 115, orderNumber: 'ORD-2013', branchName: 'الفرع الرئيسي — العليا', createdAt: at(0, 19, 12), syncedAt: at(0, 19, 13) },
    { id: 'd3', platform: 'mrsool', platformName: 'Mrsool', externalOrderId: 'MR-11872', status: 'new', total: 46, orderNumber: null, branchName: 'الفرع الرئيسي — العليا', createdAt: at(0, 21, 2), syncedAt: at(0, 21, 3) }
  ]
};

export const demoPrinterJobs = {
  data: [
    { id: 'pj1', kind: 'receipt', number: 'TT-1042', printer: 'Talal Techno Mock Printer', bytes: 899, status: 'printed', preview: 'مطعم طلال تكنو\nالفرع الرئيسي — العليا\nفاتورة: TT-1042\nالإجمالي: 184.00\nمدى: 184.00\nشكراً لزيارتكم', createdAt: at(0, 21, 10) },
    { id: 'pj2', kind: 'kitchen', number: 'ORD-2018', printer: 'Talal Techno Mock Printer', bytes: 612, status: 'printed', preview: 'طلب مطبخ\nORD-2018\n2 × كبسة دجاج\n1 × حمص بالطحينة', createdAt: at(0, 21, 4) }
  ]
};

export const demoSettings = {
  data: {
    id: 'tenant_1',
    name: 'مطعم طلال تكنو',
    slug: 'talal-techno',
    vatNumber: '310123456700003',
    crNumber: '1010123456',
    phone: '0112345678',
    email: 'hello@talaltechno.dev',
    address: 'طريق العليا، حي الغدير',
    city: 'الرياض',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    vatRate: 15,
    settings: {
      brand: 'طلال تكنو',
      invoicePrefix: 'TT',
      receiptFooter: 'شكراً لزيارتكم — طلال تكنو',
      serviceChargeRate: 0,
      loyalty: { earnPerSar: 1, redeemValue: 0.05 },
      emenu: { enabled: true, allowSelfOrder: true, requireTable: true }
    }
  }
};

export const demoOrganization = {
  data: {
    tenant: demoSettings.data,
    branches: [
      { id: 'b1', name: 'الفرع الرئيسي — العليا', code: 'RUH-01', address: 'طريق العليا، الرياض', phone: '0112345678', active: true },
      { id: 'b2', name: 'فرع النخيل', code: 'RUH-02', address: 'حي النخيل، الرياض', phone: '0112223333', active: true }
    ],
    warehouses: [
      { id: 'w1', name: 'المخزن الرئيسي', code: 'WH-01', branchName: 'الفرع الرئيسي — العليا' },
      { id: 'w2', name: 'مخزن النخيل', code: 'WH-02', branchName: 'فرع النخيل' }
    ],
    devices: [
      { id: 'dev1', name: 'كاشير 1', type: 'pos', serial: 'POS-001', branchName: 'الفرع الرئيسي — العليا', lastSeenAt: at(0, 21, 12) },
      { id: 'dev2', name: 'شاشة المطبخ', type: 'kds', serial: 'KDS-001', branchName: 'الفرع الرئيسي — العليا', lastSeenAt: at(0, 21, 8) },
      { id: 'dev3', name: 'طابعة الكاشير', type: 'printer', serial: 'PRN-001', branchName: 'الفرع الرئيسي — العليا', lastSeenAt: at(0, 20, 55) }
    ],
    users: [
      { id: 'u1', name: 'أحمد الحميري', email: 'admin@talaltechno.dev', role: 'admin', branchName: 'الفرع الرئيسي — العليا', active: true, lastLoginAt: at(0, 21, 0) },
      { id: 'u2', name: 'منى عبدالله', email: 'manager@talaltechno.dev', role: 'manager', branchName: 'الفرع الرئيسي — العليا', active: true, lastLoginAt: at(0, 18, 30) },
      { id: 'u3', name: 'خالد الشامي', email: 'cashier@talaltechno.dev', role: 'cashier', branchName: 'الفرع الرئيسي — العليا', active: true, lastLoginAt: at(0, 20, 50) },
      { id: 'u4', name: 'سعيد الغامدي', email: 'waiter@talaltechno.dev', role: 'waiter', branchName: 'الفرع الرئيسي — العليا', active: true, lastLoginAt: at(0, 19, 10) },
      { id: 'u5', name: 'سارة العلي', email: 'accountant@talaltechno.dev', role: 'accountant', branchName: 'الفرع الرئيسي — العليا', active: true, lastLoginAt: at(1, 16, 0) }
    ]
  }
};

export const demoShifts = {
  data: [
    { id: 's1', number: 'SH-1001', branchId: 'b1', userId: 'u3', userName: 'خالد الشامي', status: 'open', openingCash: 500, closingCash: null, expectedCash: null, variance: null, sales: 4820.5, orders: 63, tax: 723.08, cogs: 1640, notes: '', openedAt: at(0, 8, 0), closedAt: null },
    { id: 's2', number: 'SH-1000', branchId: 'b1', userId: 'u2', userName: 'منى عبدالله', status: 'closed', openingCash: 300, closingCash: 300, expectedCash: 300, variance: 0, sales: 0, orders: 0, tax: 0, cogs: 0, notes: '', openedAt: at(1, 8, 0), closedAt: at(1, 23, 30) }
  ]
};

export const demoCustomers = {
  data: [
    { id: 'c1', code: 'C001', name: 'شركة الواحة للضيافة', phone: '0551234567', vatNumber: '310123456700003', loyaltyPoints: 4200, tier: 'platinum', totalSpent: 5250, invoices: 42, lastPurchaseAt: at(0, 21, 10) },
    { id: 'c2', code: 'C002', name: 'نورة العتيبي', phone: '0559876543', vatNumber: null, loyaltyPoints: 860, tier: 'gold', totalSpent: 1075, invoices: 18, lastPurchaseAt: at(0, 20, 5) },
    { id: 'c3', code: 'C003', name: 'عبدالله القحطاني', phone: '0501112233', vatNumber: null, loyaltyPoints: 320, tier: 'silver', totalSpent: 400, invoices: 9, lastPurchaseAt: at(0, 19, 50) },
    { id: 'c4', code: 'C004', name: 'ريم الحربي', phone: '0504445566', vatNumber: null, loyaltyPoints: 145, tier: 'bronze', totalSpent: 181, invoices: 5, lastPurchaseAt: at(2, 20, 30) }
  ],
  meta: { total: 4, points: 5525 }
};

export const demoCoupons = {
  data: [
    { id: 'cp1', code: 'TALAL20', type: 'percent', value: 20, minSpend: 50, usageLimit: 100, used: 24, active: true, expiresAt: '2026-11-30T00:00:00.000Z', remaining: 76 },
    { id: 'cp2', code: 'WELCOME10', type: 'fixed', value: 10, minSpend: 30, usageLimit: 200, used: 68, active: true, expiresAt: '2026-12-31T00:00:00.000Z', remaining: 132 },
    { id: 'cp3', code: 'FREEDEL', type: 'fixed', value: 15, minSpend: 80, usageLimit: 50, used: 12, active: true, expiresAt: '2026-11-15T00:00:00.000Z', remaining: 38 }
  ]
};

export const demoSuppliers = {
  data: [
    { id: 'sup1', name: 'مؤسسة الرياض للمواد الغذائية', phone: '0112223333', vatNumber: '311222333400003', balance: 1035 },
    { id: 'sup2', name: 'شركة الخير للخضار والفواكه', phone: '0114445555', vatNumber: null, balance: 480 }
  ]
};

export const demoPurchaseOrders = {
  data: [
    { id: 'po1', number: 'PO-1001', status: 'received', date: '2026-10-24', supplierName: 'مؤسسة الرياض للمواد الغذائية', subtotal: 900, tax: 135, total: 1035, notes: 'توريد أسبوعي', items: [{ name: 'أرز بسمتي', qty: 50, unitCost: 6, total: 300 }, { name: 'دجاج طازج', qty: 25, unitCost: 18, total: 450 }, { name: 'زيت طبخ', qty: 16.67, unitCost: 9, total: 150 }] },
    { id: 'po2', number: 'PO-1002', status: 'ordered', date: '2026-10-27', supplierName: 'شركة الخير للخضار والفواكه', subtotal: 420, tax: 63, total: 483, notes: 'خضار طازج', items: [{ name: 'طماطم', qty: 20, unitCost: 5, total: 100 }, { name: 'خس', qty: 10, unitCost: 4, total: 40 }, { name: 'ليمون', qty: 10, unitCost: 7, total: 70 }] }
  ]
};
