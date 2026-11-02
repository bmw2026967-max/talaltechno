/* ==========================================================================
   طلال تكنو — Restaurant demo seed
   A realistic Saudi casual-dining dataset: raw materials, recipes, tables,
   open checks, KDS tickets, delivery orders, shifts, loyalty and ZATCA
   sandbox invoices. All data is local and generated deterministically.
   ========================================================================== */
(function () {
  'use strict';
  const Seed = window.Seed = {};

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20261027);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (min, max) => min + Math.floor(rnd() * (max - min + 1));
  const round2 = U.round2;
  const today = () => U.today();

  Seed.accounts = () => [
    { id: '1000', code: '1000', name: 'الأصول', type: 'asset', isGroup: true, parent: null, normal: 'debit' },
    { id: '1100', code: '1100', name: 'الأصول المتداولة', type: 'asset', isGroup: true, parent: '1000', normal: 'debit' },
    { id: '1101', code: '1101', name: 'الصندوق (النقدية)', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1102', code: '1102', name: 'الحساب البنكي', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1103', code: '1103', name: 'العملاء والمدينون', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1104', code: '1104', name: 'المخزون', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1105', code: '1105', name: 'ضريبة القيمة المضافة — مدخلات', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1106', code: '1106', name: 'سلف ومدفوعات مقدمة', type: 'asset', parent: '1100', normal: 'debit' },
    { id: '1200', code: '1200', name: 'الأصول الثابتة', type: 'asset', isGroup: true, parent: '1000', normal: 'debit' },
    { id: '1201', code: '1201', name: 'الأثاث والمعدات', type: 'asset', parent: '1200', normal: 'debit' },
    { id: '1202', code: '1202', name: 'السيارات ووسائل النقل', type: 'asset', parent: '1200', normal: 'debit' },
    { id: '2000', code: '2000', name: 'الالتزامات', type: 'liability', isGroup: true, parent: null, normal: 'credit' },
    { id: '2100', code: '2100', name: 'الالتزامات المتداولة', type: 'liability', isGroup: true, parent: '2000', normal: 'credit' },
    { id: '2101', code: '2101', name: 'الموردون والدائنون', type: 'liability', parent: '2100', normal: 'credit' },
    { id: '2102', code: '2102', name: 'ضريبة القيمة المضافة — مخرجات', type: 'liability', parent: '2100', normal: 'credit' },
    { id: '2103', code: '2103', name: 'رواتب مستحقة', type: 'liability', parent: '2100', normal: 'credit' },
    { id: '2104', code: '2104', name: 'مصروفات مستحقة', type: 'liability', parent: '2100', normal: 'credit' },
    { id: '3000', code: '3000', name: 'حقوق الملكية', type: 'equity', isGroup: true, parent: null, normal: 'credit' },
    { id: '3100', code: '3100', name: 'رأس المال والاحتياطيات', type: 'equity', isGroup: true, parent: '3000', normal: 'credit' },
    { id: '3101', code: '3101', name: 'رأس المال', type: 'equity', parent: '3100', normal: 'credit' },
    { id: '3102', code: '3102', name: 'الأرباح المحتجزة', type: 'equity', parent: '3100', normal: 'credit' },
    { id: '3103', code: '3103', name: 'مسحوبات المالك', type: 'equity', parent: '3100', normal: 'debit' },
    { id: '4000', code: '4000', name: 'الإيرادات', type: 'revenue', isGroup: true, parent: null, normal: 'credit' },
    { id: '4100', code: '4100', name: 'إيرادات التشغيل', type: 'revenue', isGroup: true, parent: '4000', normal: 'credit' },
    { id: '4101', code: '4101', name: 'إيرادات المبيعات', type: 'revenue', parent: '4100', normal: 'credit' },
    { id: '4102', code: '4102', name: 'إيرادات أخرى', type: 'revenue', parent: '4100', normal: 'credit' },
    { id: '4103', code: '4103', name: 'مردودات المبيعات', type: 'revenue', parent: '4100', normal: 'debit' },
    { id: '4104', code: '4104', name: 'خصومات المبيعات', type: 'revenue', parent: '4100', normal: 'debit' },
    { id: '5000', code: '5000', name: 'المصروفات', type: 'expense', isGroup: true, parent: null, normal: 'debit' },
    { id: '5100', code: '5100', name: 'مصروفات التشغيل', type: 'expense', isGroup: true, parent: '5000', normal: 'debit' },
    { id: '5101', code: '5101', name: 'تكلفة المبيعات', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5102', code: '5102', name: 'الرواتب والأجور', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5103', code: '5103', name: 'الإيجار', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5104', code: '5104', name: 'الكهرباء والمياه', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5105', code: '5105', name: 'التسويق والإعلان', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5106', code: '5106', name: 'الصيانة والنظافة', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5107', code: '5107', name: 'المصروفات البنكية', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5108', code: '5108', name: 'فروقات الجرد والتلف', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5109', code: '5109', name: 'مصروفات متنوعة', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5110', code: '5110', name: 'الضيافة', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5111', code: '5111', name: 'الاتصالات والإنترنت', type: 'expense', parent: '5100', normal: 'debit' },
    { id: '5112', code: '5112', name: 'النقل والتوصيل', type: 'expense', parent: '5100', normal: 'debit' }
  ];

  Seed.categories = () => [
    { id: 'cat_starters', name: 'المقبلات', color: '#0f766e', emoji: '🥗', sortOrder: 1 },
    { id: 'cat_grills', name: 'المشاوي', color: '#b13a33', emoji: '🔥', sortOrder: 2 },
    { id: 'cat_mains', name: 'الأطباق الرئيسية', color: '#0e5a44', emoji: '🍛', sortOrder: 3 },
    { id: 'cat_sides', name: 'الأطباق الجانبية', color: '#a97c28', emoji: '🍟', sortOrder: 4 },
    { id: 'cat_drinks', name: 'المشروبات', color: '#2563a8', emoji: '🥤', sortOrder: 5 },
    { id: 'cat_desserts', name: 'الحلويات', color: '#6d4fa3', emoji: '🍰', sortOrder: 6 }
  ];

  const RAW_ROWS = [
    ['rm_rice', 'أرز بسمتي', 'kg', 6.50, 300, 50, '🍚'],
    ['rm_chicken', 'دجاج طازج', 'kg', 12.00, 260, 40, '🍗'],
    ['rm_beef', 'لحم بقري', 'kg', 38.00, 140, 25, '🥩'],
    ['rm_lamb', 'لحم غنم', 'kg', 52.00, 100, 20, '🍖'],
    ['rm_shrimp', 'روبيان طازج', 'kg', 45.00, 60, 12, '🍤'],
    ['rm_fish', 'هامور طازج', 'kg', 32.00, 70, 12, '🐟'],
    ['rm_onion', 'بصل', 'kg', 2.20, 180, 30, '🧅'],
    ['rm_tomato', 'طماطم', 'kg', 3.00, 180, 30, '🍅'],
    ['rm_potato', 'بطاطس', 'kg', 3.50, 260, 40, '🥔'],
    ['rm_lettuce', 'خس', 'kg', 4.00, 70, 12, '🥬'],
    ['rm_cucumber', 'خيار', 'kg', 3.00, 90, 15, '🥒'],
    ['rm_lemon', 'ليمون', 'kg', 5.00, 70, 12, '🍋'],
    ['rm_garlic', 'ثوم', 'kg', 12.00, 35, 6, '🧄'],
    ['rm_ginger', 'زنجبيل', 'kg', 14.00, 25, 5, '🫚'],
    ['rm_yogurt', 'زبادي', 'kg', 5.00, 90, 15, '🥣'],
    ['rm_cream', 'كريمة طبخ', 'L', 9.00, 70, 12, '🥛'],
    ['rm_cheese', 'جبنة موزاريلا', 'kg', 18.00, 60, 10, '🧀'],
    ['rm_flour', 'دقيق', 'kg', 3.00, 180, 30, '🌾'],
    ['rm_oil', 'زيت قلي', 'L', 8.00, 180, 30, '🫗'],
    ['rm_spices', 'بهارات مشكلة', 'kg', 35.00, 40, 8, '🧂'],
    ['rm_softdrink', 'مشروب غازي', 'can', 1.20, 500, 80, '🥤'],
    ['rm_water', 'مياه معدنية', 'bottle', 0.50, 600, 100, '💧'],
    ['rm_coffee', 'قهوة عربية', 'kg', 45.00, 30, 6, '☕'],
    ['rm_tea', 'شاي', 'kg', 30.00, 25, 5, '🍵'],
    ['rm_chocolate', 'شوكولاتة', 'kg', 28.00, 40, 8, '🍫'],
    ['rm_bread', 'خبز عربي', 'piece', 0.50, 400, 80, '🫓'],
    ['rm_saffron', 'زعفران', 'g', 8.00, 1000, 100, '🌺'],
    ['rm_milk', 'حليب', 'L', 4.00, 120, 20, '🥛'],
    ['rm_sugar', 'سكر', 'kg', 4.00, 120, 20, '🍬'],
    ['rm_chickpeas', 'حمص حبوب', 'kg', 7.00, 80, 15, '🫘'],
    ['rm_tahini', 'طحينة', 'kg', 18.00, 30, 6, '🥜'],
    ['rm_eggplant', 'باذنجان', 'kg', 3.50, 60, 10, '🍆'],
    ['rm_carrot', 'جزر', 'kg', 2.50, 60, 10, '🥕'],
    ['rm_butter', 'زبدة', 'kg', 22.00, 40, 8, '🧈'],
    ['rm_orange', 'برتقال', 'kg', 4.00, 100, 18, '🍊'],
    ['rm_mint', 'نعناع', 'kg', 8.00, 15, 3, '🌿'],
    ['rm_cardamom', 'هيل', 'kg', 60.00, 20, 4, '🫘'],
    ['rm_kunafa', 'كنافة', 'kg', 12.00, 50, 10, '🥮']
  ];

  Seed.rawMaterials = () => RAW_ROWS.map((r, i) => ({
    id: r[0], sku: 'RM-' + String(i + 1).padStart(3, '0'), name: r[1],
    categoryId: 'cat_raw', unit: r[2], cost: r[3], stock: r[4], reorderLevel: r[5],
    emoji: r[6], type: 'raw', price: 0, taxRate: 0, active: true,
    barcode: '629' + String(2000000 + i * 7919).padStart(10, '0').slice(0, 10),
    createdAt: new Date().toISOString()
  }));

  const MENU_ROWS = [
    ['m001', 'حمص بالطحينة', 'cat_starters', 18, 'cold', '🫘', [['rm_chickpeas', 0.12], ['rm_tahini', 0.03], ['rm_lemon', 0.02], ['rm_oil', 0.01], ['rm_garlic', 0.005]]],
    ['m002', 'متبل باذنجان', 'cat_starters', 18, 'cold', '🍆', [['rm_eggplant', 0.2], ['rm_tahini', 0.03], ['rm_yogurt', 0.03], ['rm_lemon', 0.01]]],
    ['m003', 'فتوش', 'cat_starters', 22, 'cold', '🥗', [['rm_lettuce', 0.12], ['rm_tomato', 0.08], ['rm_cucumber', 0.06], ['rm_bread', 0.5], ['rm_lemon', 0.02], ['rm_oil', 0.01]]],
    ['m004', 'رولات دجاج مقرمشة', 'cat_starters', 24, 'fryer', '🥟', [['rm_chicken', 0.12], ['rm_flour', 0.04], ['rm_oil', 0.04], ['rm_spices', 0.003]]],
    ['m005', 'روبيان تمبورا', 'cat_starters', 38, 'fryer', '🍤', [['rm_shrimp', 0.15], ['rm_flour', 0.05], ['rm_oil', 0.05]]],
    ['m006', 'شيش طاووق', 'cat_grills', 45, 'grill', '🍢', [['rm_chicken', 0.3], ['rm_yogurt', 0.05], ['rm_lemon', 0.01], ['rm_spices', 0.005]]],
    ['m007', 'مشاوي مشكلة', 'cat_grills', 95, 'grill', '🍖', [['rm_chicken', 0.15], ['rm_beef', 0.12], ['rm_lamb', 0.1], ['rm_rice', 0.15], ['rm_spices', 0.005]]],
    ['m008', 'ريش غنم مشوية', 'cat_grills', 110, 'grill', '🥩', [['rm_lamb', 0.35], ['rm_oil', 0.01], ['rm_spices', 0.004]]],
    ['m009', 'كباب لحم', 'cat_grills', 55, 'grill', '🍢', [['rm_beef', 0.25], ['rm_onion', 0.03], ['rm_spices', 0.004]]],
    ['m010', 'هامور مشوي', 'cat_grills', 85, 'grill', '🐟', [['rm_fish', 0.3], ['rm_lemon', 0.02], ['rm_oil', 0.01], ['rm_spices', 0.004]]],
    ['m011', 'صيادية روبيان', 'cat_mains', 90, 'pass', '🍚', [['rm_shrimp', 0.2], ['rm_rice', 0.18], ['rm_onion', 0.05], ['rm_spices', 0.004], ['rm_oil', 0.01]]],
    ['m012', 'مندي دجاج', 'cat_mains', 42, 'pass', '🍗', [['rm_chicken', 0.3], ['rm_rice', 0.2], ['rm_spices', 0.005], ['rm_oil', 0.005]]],
    ['m013', 'مندي لحم', 'cat_mains', 65, 'pass', '🍖', [['rm_lamb', 0.25], ['rm_rice', 0.2], ['rm_spices', 0.005]]],
    ['m014', 'برياني لحم', 'cat_mains', 48, 'pass', '🍛', [['rm_beef', 0.22], ['rm_rice', 0.2], ['rm_yogurt', 0.03], ['rm_spices', 0.004]]],
    ['m015', 'كبسة دجاج', 'cat_mains', 40, 'pass', '🍚', [['rm_chicken', 0.28], ['rm_rice', 0.2], ['rm_tomato', 0.05], ['rm_spices', 0.005]]],
    ['m016', 'كاري خضار', 'cat_mains', 32, 'pass', '🥘', [['rm_potato', 0.15], ['rm_carrot', 0.08], ['rm_tomato', 0.08], ['rm_yogurt', 0.04], ['rm_rice', 0.15], ['rm_spices', 0.003]]],
    ['m017', 'بيتزا مارغريتا', 'cat_mains', 38, 'pass', '🍕', [['rm_flour', 0.2], ['rm_cheese', 0.1], ['rm_tomato', 0.08], ['rm_oil', 0.01]]],
    ['m018', 'برجر دجاج', 'cat_mains', 35, 'pass', '🍔', [['rm_bread', 1], ['rm_chicken', 0.15], ['rm_lettuce', 0.02], ['rm_cheese', 0.02], ['rm_potato', 0.15], ['rm_oil', 0.02]]],
    ['m019', 'كلوب ساندويتش', 'cat_mains', 28, 'pass', '🥪', [['rm_bread', 2], ['rm_chicken', 0.1], ['rm_cheese', 0.03], ['rm_lettuce', 0.03], ['rm_tomato', 0.03], ['rm_potato', 0.12]]],
    ['m020', 'بطاطس مقلية', 'cat_sides', 15, 'fryer', '🍟', [['rm_potato', 0.25], ['rm_oil', 0.03]]],
    ['m021', 'خبز بالثوم', 'cat_sides', 14, 'pass', '🥖', [['rm_bread', 1], ['rm_butter', 0.02], ['rm_garlic', 0.01]]],
    ['m022', 'أرز أبيض', 'cat_sides', 12, 'pass', '🍚', [['rm_rice', 0.15], ['rm_oil', 0.005]]],
    ['m023', 'سلطة خضراء', 'cat_sides', 14, 'cold', '🥗', [['rm_lettuce', 0.1], ['rm_tomato', 0.06], ['rm_cucumber', 0.05], ['rm_lemon', 0.01]]],
    ['m024', 'مشروب غازي', 'cat_drinks', 8, 'drinks', '🥤', [['rm_softdrink', 1]]],
    ['m025', 'مياه معدنية', 'cat_drinks', 3, 'drinks', '💧', [['rm_water', 1]]],
    ['m026', 'عصير برتقال طازج', 'cat_drinks', 18, 'drinks', '🍊', [['rm_orange', 0.25]]],
    ['m027', 'ليمون بالنعناع', 'cat_drinks', 16, 'drinks', '🍋', [['rm_lemon', 0.05], ['rm_mint', 0.02], ['rm_sugar', 0.02]]],
    ['m028', 'قهوة عربية', 'cat_drinks', 12, 'drinks', '☕', [['rm_coffee', 0.012], ['rm_cardamom', 0.001], ['rm_saffron', 0.0005], ['rm_sugar', 0.005]]],
    ['m029', 'شاي كرك', 'cat_drinks', 8, 'drinks', '🍵', [['rm_tea', 0.005], ['rm_milk', 0.02], ['rm_sugar', 0.01]]],
    ['m030', 'كيك شوكولاتة', 'cat_desserts', 24, 'dessert', '🍰', [['rm_chocolate', 0.08], ['rm_flour', 0.06], ['rm_cream', 0.05], ['rm_sugar', 0.04], ['rm_butter', 0.03]]],
    ['m031', 'تشيز كيك', 'cat_desserts', 26, 'dessert', '🍰', [['rm_cheese', 0.08], ['rm_cream', 0.05], ['rm_sugar', 0.04], ['rm_flour', 0.03], ['rm_butter', 0.02]]],
    ['m032', 'كنافة بالجبن', 'cat_desserts', 28, 'dessert', '🥮', [['rm_kunafa', 0.1], ['rm_cheese', 0.08], ['rm_sugar', 0.05], ['rm_butter', 0.02]]],
    ['m033', 'آيس كريم شوكولاتة', 'cat_desserts', 18, 'dessert', '🍨', [['rm_milk', 0.1], ['rm_cream', 0.05], ['rm_sugar', 0.03], ['rm_chocolate', 0.02]]]
  ];

  Seed.menuProducts = () => MENU_ROWS.map((r, i) => ({
    id: r[0], sku: 'MN-' + String(i + 1).padStart(3, '0'), name: r[1], categoryId: r[2],
    price: r[3], cost: 0, stock: 0, type: 'menu', station: r[4], emoji: r[5],
    recipe: r[6].map((x) => ({ materialId: x[0], qty: x[1] })),
    description: r[2] === 'cat_grills' ? 'مشوي على الفحم مع أرز وسلطة' : r[2] === 'cat_desserts' ? 'محضّر يومياً في مطبخ الحلويات' : r[2] === 'cat_drinks' ? 'يقدم بارداً أو ساخناً حسب اختيارك' : 'طازج من مطبخ طلال تكنو',
    available: true, active: true, featured: ['m007', 'm012', 'm013', 'm006', 'm017'].includes(r[0]),
    isNew: ['m005', 'm011', 'm032'].includes(r[0]),
    taxRate: 15, barcode: '628' + String(3000000 + i * 7919).padStart(10, '0').slice(0, 10),
    createdAt: new Date().toISOString()
  }));

  Seed.products = () => Seed.rawMaterials().concat(Seed.menuProducts());

  Seed.customers = () => [
    { id: 'c001', code: 'C-001', name: 'شركة الواحة للضيافة', phone: '+966 55 110 2233', email: 'waha@example.com', address: 'الرياض — حي العليا', taxNumber: '310555111100003', creditLimit: 60000, loyaltyPoints: 1250, lifetimeSpend: 28450, lastPurchase: U.addDays(today(), -3), active: true },
    { id: 'c002', code: 'C-002', name: 'مؤسسة النخيل للمطاعم', phone: '+966 50 332 1144', email: 'nakheel@example.com', address: 'الرياض — حي النخيل', taxNumber: '310444222200003', creditLimit: 45000, loyaltyPoints: 640, lifetimeSpend: 16220, lastPurchase: U.addDays(today(), -5), active: true },
    { id: 'c003', code: 'C-003', name: 'محمد عبدالله العمري', phone: '+966 54 998 1122', email: 'm.omari@example.com', address: 'الرياض — حي الملقا', creditLimit: 5000, loyaltyPoints: 320, lifetimeSpend: 6840, lastPurchase: U.addDays(today(), -1), active: true },
    { id: 'c004', code: 'C-004', name: 'نورة سعد القحطاني', phone: '+966 59 223 4455', email: 'noura@example.com', address: 'الرياض — حي الياسمين', creditLimit: 3000, loyaltyPoints: 95, lifetimeSpend: 2480, lastPurchase: U.addDays(today(), -8), active: true },
    { id: 'c005', code: 'C-005', name: 'شركة درب الغذاء', phone: '+966 55 664 7788', email: 'darb@example.com', address: 'الرياض — حي الصناعية', taxNumber: '310333666600003', creditLimit: 80000, loyaltyPoints: 2100, lifetimeSpend: 49750, lastPurchase: U.addDays(today(), -2), active: true },
    { id: 'c006', code: 'C-006', name: 'فهد سعد الشمري', phone: '+966 57 112 3344', email: 'fahad@example.com', address: 'الرياض — حي قرطبة', creditLimit: 4000, loyaltyPoints: 480, lifetimeSpend: 8920, lastPurchase: U.addDays(today(), -4), active: true },
    { id: 'c007', code: 'C-007', name: 'ريم عبدالعزيز الحربي', phone: '+966 53 445 6677', email: 'reem@example.com', address: 'الرياض — حي السليمانية', creditLimit: 3000, loyaltyPoints: 160, lifetimeSpend: 3460, lastPurchase: U.addDays(today(), -6), active: true },
    { id: 'c008', code: 'C-008', name: 'مجموعة أفق للاستثمار', phone: '+966 56 778 9900', email: 'ofoq@example.com', address: 'الرياض — حي الملك فهد', taxNumber: '310222888800003', creditLimit: 70000, loyaltyPoints: 870, lifetimeSpend: 22100, lastPurchase: U.addDays(today(), -7), active: true },
    { id: 'c009', code: 'C-009', name: 'سعد علي الغامدي', phone: '+966 58 334 2211', email: 'saad@example.com', address: 'الرياض — حي العارض', creditLimit: 2500, loyaltyPoints: 45, lifetimeSpend: 1120, lastPurchase: U.addDays(today(), -12), active: true },
    { id: 'c010', code: 'C-010', name: 'ليلى محمد الزهراني', phone: '+966 55 889 3322', email: 'layla@example.com', address: 'الرياض — حي الملقا', creditLimit: 3000, loyaltyPoints: 1300, lifetimeSpend: 15300, lastPurchase: U.addDays(today(), -2), active: true }
  ];

  Seed.suppliers = () => [
    { id: 's001', code: 'S-001', name: 'شركة الوفاء للمواد الغذائية', phone: '+966 11 445 6677', email: 'wafa@example.com', address: 'الرياض — المنطقة الصناعية', taxNumber: '310555666700003', active: true },
    { id: 's002', code: 'S-002', name: 'مؤسسة الربيع للدواجن', phone: '+966 11 223 8899', email: 'rabee@example.com', address: 'الرياض — سوق الأنعام', taxNumber: '310444555600003', active: true },
    { id: 's003', code: 'S-003', name: 'شركة النور للمشروبات', phone: '+966 12 667 2233', email: 'noor@example.com', address: 'جدة — حي الصناعية', taxNumber: '310333444500003', active: true },
    { id: 's004', code: 'S-004', name: 'مصنع الحلويات الذهبية', phone: '+966 11 998 7766', email: 'golden@example.com', address: 'الرياض — حي السلي', taxNumber: '310222333400003', active: true },
    { id: 's005', code: 'S-005', name: 'شركة القمة للخضار والفواكه', phone: '+966 13 554 3322', email: 'qimma@example.com', address: 'الرياض — سوق الخضار المركزي', taxNumber: '310111222300003', active: true }
  ];

  Seed.users = () => [
    { id: 'u1', name: 'أحمد الحميري', username: 'admin', role: 'admin', pin: '1234', active: true, phone: '+966 55 100 2000', createdAt: new Date().toISOString() },
    { id: 'u2', name: 'منى عبدالله', username: 'mona', role: 'manager', pin: '2222', active: true, phone: '+966 55 100 2003', createdAt: new Date().toISOString() },
    { id: 'u3', name: 'خالد الشامي', username: 'khaled', role: 'cashier', pin: '4444', active: true, phone: '+966 55 100 2002', createdAt: new Date().toISOString() },
    { id: 'u4', name: 'ريم الحربي', username: 'reem', role: 'waiter', pin: '5555', active: true, phone: '+966 55 100 2004', createdAt: new Date().toISOString() },
    { id: 'u5', name: 'سامي القحطاني', username: 'chef', role: 'kitchen', pin: '6666', active: true, phone: '+966 55 100 2005', createdAt: new Date().toISOString() },
    { id: 'u6', name: 'سارة العلي', username: 'sara', role: 'accountant', pin: '3333', active: true, phone: '+966 55 100 2001', createdAt: new Date().toISOString() },
    { id: 'u7', name: 'فهد الدوسري', username: 'delivery', role: 'delivery', pin: '7777', active: true, phone: '+966 55 100 2006', createdAt: new Date().toISOString() }
  ];

  Seed.branches = () => [
    { id: 'b1', name: 'الفرع الرئيسي — العليا', address: 'الرياض — حي العليا — طريق الملك فهد', phone: '+966 11 200 3000', active: true },
    { id: 'b2', name: 'فرع النخيل', address: 'الرياض — حي النخيل — طريق أنس بن مالك', phone: '+966 11 200 3001', active: true }
  ];

  Seed.tables = () => {
    const rows = [];
    const zones = [
      ['الصالة الرئيسية', 6, 4],
      ['العائلات', 4, 6],
      ['التراس', 4, 4]
    ];
    let n = 1;
    zones.forEach(([zone, count, cap]) => {
      for (let i = 0; i < count; i++) {
        const id = 't' + String(n).padStart(2, '0');
        rows.push({
          id, name: 'T' + String(n).padStart(2, '0'), zone, capacity: cap,
          status: 'free', currentOrderId: null, occupiedAt: null,
          branchId: 'b1', shape: i % 3 === 0 ? 'round' : 'square'
        });
        n++;
      }
    });
    ['T15', 'T16'].forEach((name, i) => rows.push({
      id: 't' + (15 + i), name, zone: 'الصالة الرئيسية', capacity: 4,
      status: 'free', currentOrderId: null, occupiedAt: null, branchId: 'b2', shape: 'square'
    }));
    return rows;
  };

  Seed.coupons = () => [
    { id: 'cpn1', code: 'WELCOME10', type: 'percent', value: 10, minSpend: 50, expiresAt: U.addDays(today(), 45), usageLimit: 200, used: 12, active: true, createdAt: new Date().toISOString() },
    { id: 'cpn2', code: 'RAMADAN25', type: 'percent', value: 25, minSpend: 120, expiresAt: U.addDays(today(), 60), usageLimit: 100, used: 4, active: true, createdAt: new Date().toISOString() },
    { id: 'cpn3', code: 'FREEDESSERT', type: 'fixed', value: 24, minSpend: 80, expiresAt: U.addDays(today(), 20), usageLimit: 50, used: 9, active: true, createdAt: new Date().toISOString() },
    { id: 'cpn4', code: 'DELIVERY15', type: 'percent', value: 15, minSpend: 60, expiresAt: U.addDays(today(), 30), usageLimit: 100, used: 0, active: true, createdAt: new Date().toISOString() }
  ];

  function estimate(items, orderType, discount) {
    const subtotal = round2(U.sum(items, (i) => i.qty * i.price));
    const disc = round2(U.clamp(discount || 0, 0, subtotal));
    let tax = 0;
    items.forEach((it) => {
      const share = subtotal ? (it.qty * it.price) / subtotal : 0;
      const taxable = round2(it.qty * it.price - disc * share);
      tax += round2(taxable * (it.taxRate || 15) / 100);
    });
    const fee = orderType === 'delivery' ? round2(Number(Store.data.settings.deliveryFee) || 0) : 0;
    if (fee > 0) tax += round2(fee * Number(Store.data.settings.vatRate || 15) / 100);
    tax = round2(tax);
    return { subtotal, discount: disc, tax, fee, total: round2(subtotal - disc + fee + tax) };
  }

  function pickMenu(count) {
    const menu = Store.menuProducts();
    const items = [];
    const used = {};
    let guard = 0;
    while (items.length < count && guard++ < 40) {
      const p = pick(menu);
      if (used[p.id]) continue;
      used[p.id] = true;
      items.push({ productId: p.id, qty: between(1, 2), price: p.price, taxRate: p.taxRate || 15 });
    }
    return items;
  }

  Seed.run = function () {
    const d = Store.data;
    Store.seedMode = true;
    Store.batch(() => {
      const savedTheme = (d.settings && d.settings.theme) || 'light';
      d.settings = Object.assign(Store.defaultSettings(), {
        theme: savedTheme,
        company: 'مطعم طلال تكنو',
        legalName: 'شركة طلال تكنو للمطاعم',
        taxNumber: '310123456700003',
        commercialRegister: '1010456789',
        address: 'الرياض — حي العليا — طريق الملك فهد',
        phone: '+966 11 200 3000',
        email: 'hello@talaltechno.sa',
        website: 'www.talaltechno.sa',
        footer: 'شكراً لزيارتكم مطعم طلال تكنو — نراكم قريباً',
        vatRate: 15,
        serviceChargeRate: 0,
        deliveryFee: 7,
        defaultOrderType: 'dine_in',
        selfOrdering: true,
        restaurantMode: true,
        loyaltyPer: 1,
        loyaltyValue: 0.05,
        invoicePrefix: 'TT',
        purchasePrefix: 'PUR'
      });
      d.settings.zatca = Object.assign(Store.defaultSettings().zatca, {
        environment: 'sandbox', csidType: 'compliance', autoReport: true,
        invoiceType: 'simplified', lastHash: '', invoiceCounter: 0
      });
      d.settings.printer = Object.assign(Store.defaultSettings().printer, {
        connection: 'mock', name: 'Talal Techno Mock Printer', width: 80, copies: 1,
        autoPrintKitchen: true, autoPrintReceipt: false
      });

      d.accounts = Seed.accounts();
      d.categories = Seed.categories().concat([
        { id: 'cat_raw', name: 'مواد خام', color: '#64748b', emoji: '📦', sortOrder: 0 }
      ]);
      d.products = Seed.products();
      d.customers = Seed.customers();
      d.suppliers = Seed.suppliers();
      d.users = Seed.users();
      d.branches = Seed.branches();
      d.tables = Seed.tables();
      d.coupons = Seed.coupons();
      d.orders = [];
      d.invoices = [];
      d.purchases = [];
      d.expenses = [];
      d.payments = [];
      d.transfers = [];
      d.adjustments = [];
      d.journal = [];
      d.stockMoves = [];
      d.holds = [];
      d.audit = [];
      d.shifts = [];
      d.waste = [];
      d.loyaltyHistory = [];
      d.deliveryOrders = [];
      d.syncLogs = [];
      d.paymentLogs = [];
      d.zatcaLogs = [];
      d.printerJobs = [];
      d.notifications = [];
      d.sequences = Store.blank().sequences;
      d.meta.branch = 'b1';
      d.meta.deviceId = 'POS-B1-01';
      d.meta.pendingSync = 7;
      d.meta.lastSync = new Date(Date.now() - 12 * 60000).toISOString();

      const openingDate = U.addDays(today(), -60);
      const openingInventory = round2(U.sum(Seed.rawMaterials(), (p) => p.stock * p.cost));
      const openingCash = 45000;
      const openingBank = 210000;
      const openingFixed = 180000;
      const ar1 = 6500, ar2 = 3200;
      const ap1 = 8400, ap2 = 5100;
      const capital = round2(openingCash + openingBank + openingInventory + openingFixed + ar1 + ar2 - ap1 - ap2);
      const opening = Accounting.post({
        date: openingDate,
        description: 'الأرصدة الافتتاحية — مطعم طلال تكنو',
        sourceType: 'opening',
        createdAt: openingDate + 'T08:00:00',
        lines: [
          { accountId: '1101', debit: openingCash, credit: 0, memo: 'نقدية افتتاحية' },
          { accountId: '1102', debit: openingBank, credit: 0, memo: 'رصيد البنك الافتتاحي' },
          { accountId: '1104', debit: openingInventory, credit: 0, memo: 'مخزون المواد الخام' },
          { accountId: '1201', debit: openingFixed, credit: 0, memo: 'أثاث ومعدات المطعم' },
          { accountId: '1103', debit: ar1, credit: 0, partyId: 'c001', partyType: 'customer', memo: 'رصيد افتتاحي — شركة الواحة' },
          { accountId: '1103', debit: ar2, credit: 0, partyId: 'c002', partyType: 'customer', memo: 'رصيد افتتاحي — مؤسسة النخيل' },
          { accountId: '2101', debit: 0, credit: ap1, partyId: 's001', partyType: 'supplier', memo: 'رصيد افتتاحي — الوفاء' },
          { accountId: '2101', debit: 0, credit: ap2, partyId: 's002', partyType: 'supplier', memo: 'رصيد افتتاحي — الربيع' },
          { accountId: '3101', debit: 0, credit: capital, memo: 'رأس المال' }
        ]
      });
      d.meta.openingJournal = opening.id;

      /* ---------- Purchases of raw materials ---------- */
      const raws = d.products.filter((p) => p.type === 'raw');
      const suppliers = d.suppliers;
      for (let i = 0; i < 12; i++) {
        const date = U.addDays(today(), -31 + i * 2.5);
        if (date > today()) break;
        const items = [];
        const used = {};
        for (let j = 0; j < between(3, 5); j++) {
          const p = pick(raws);
          if (used[p.id]) continue;
          used[p.id] = true;
          const unitQty = p.unit === 'g' ? between(400, 900) : p.unit === 'piece' || p.unit === 'can' || p.unit === 'bottle' ? between(80, 240) : between(18, 60);
          items.push({ productId: p.id, qty: unitQty, cost: round2(p.cost * (0.94 + rnd() * 0.12)), taxRate: 15 });
        }
        if (!items.length) continue;
        const sub = round2(U.sum(items, (x) => x.qty * x.cost));
        const total = round2(sub * 1.15);
        const mode = rnd();
        let paid = total, method = 'bank';
        if (mode < 0.18) { paid = 0; method = 'credit'; }
        else if (mode < 0.52) { paid = round2(total * (0.35 + rnd() * 0.25)); method = 'bank'; }
        try {
          Business.createPurchase({
            supplierId: pick(suppliers).id, date, items,
            paid: Math.min(paid, total), method,
            notes: 'توريد مواد خام — أمر شراء ' + (i + 1),
            createdAt: date + 'T' + String(between(7, 10)).padStart(2, '0') + ':' + String(between(0, 59)).padStart(2, '0') + ':00'
          });
        } catch (e) { /* skip invalid purchase */ }
      }

      /* ---------- Shifts ---------- */
      let yShift = null, tShift = null;
      try {
        yShift = Shifts.open({ userId: 'u3', openingCash: 500, branchId: 'b1', notes: 'وردية مسائية — تسليم نقدية' });
        yShift.openedAt = new Date(Date.now() - 30 * 3600000).toISOString();
        tShift = Shifts.open({ userId: 'u2', openingCash: 600, branchId: 'b1', notes: 'وردية اليوم — مدير الفرع' });
        tShift.openedAt = new Date(Date.now() - 6 * 3600000).toISOString();
      } catch (e) { console.warn('Shift seed skipped', e); }

      /* ---------- Sales (28 days, chronological) ---------- */
      const menu = d.products.filter((p) => p.type === 'menu');
      const customers = d.customers;
      const cashiers = ['u3', 'u2', 'u1'];
      const tables = d.tables.filter((t) => t.branchId === 'b1');
      const platforms = d.settings.delivery.platforms.map((p) => p.id);
      const days = 28;

      for (let dayOffset = days; dayOffset >= 0; dayOffset--) {
        const date = U.addDays(today(), -dayOffset);
        const dow = U.parseISO(date).getDay();
        const weekend = [4, 5, 6].includes(dow);
        const count = weekend ? between(14, 19) : between(8, 13);
        for (let s = 0; s < count; s++) {
          const items = pickMenu(between(1, 4));
          if (!items.length) continue;
          const roll = rnd();
          const orderType = roll < 0.46 ? 'dine_in' : roll < 0.70 ? 'takeaway' : roll < 0.90 ? 'delivery' : 'curbside';
          const table = orderType === 'dine_in' ? pick(tables) : null;
          const platform = orderType === 'delivery' ? pick(platforms) : null;
          const approx = estimate(items, orderType, 0);
          const discount = rnd() < 0.07 ? round2(approx.subtotal * 0.05) : 0;
          const totals = estimate(items, orderType, discount);
          let customer = null;
          if (rnd() < 0.32) customer = pick(customers);
          let methodRoll = rnd();
          let method = 'cash';
          if (methodRoll < 0.30) method = 'cash';
          else if (methodRoll < 0.58) method = 'mada';
          else if (methodRoll < 0.68) method = 'applepay';
          else if (methodRoll < 0.76) method = 'stcpay';
          else if (methodRoll < 0.86) method = 'visa';
          else if (methodRoll < 0.94) method = 'mastercard';
          else method = 'credit';
          if (method === 'credit' && !customer) customer = customers[2];
          let payments = [];
          if (method === 'credit') {
            const ratio = rnd() < 0.55 ? 0 : (0.25 + rnd() * 0.35);
            if (ratio > 0) payments = [{ method: rnd() < 0.5 ? 'cash' : 'mada', amount: round2(totals.total * ratio) }];
          } else {
            payments = [{ method, amount: totals.total }];
          }
          let createdAt;
          if (dayOffset === 0) {
            createdAt = new Date(Date.now() - (count - s) * 5 * 60000).toISOString();
          } else {
            const start = 11 * 60 + 30, end = 22 * 60;
            const mins = Math.round(start + (end - start) * (count === 1 ? 0.5 : s / (count - 1)));
            createdAt = date + 'T' + String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0') + ':00';
          }
          try {
            Business.createSale({
              date, items, discount,
              orderType,
              tableName: table ? table.name : '',
              platform,
              deliveryFee: orderType === 'delivery' ? Number(d.settings.deliveryFee) || 0 : 0,
              customerId: customer ? customer.id : null,
              customerName: customer ? customer.name : (orderType === 'delivery' ? 'عميل توصيل' : 'عميل نقدي'),
              payments,
              cashierId: dayOffset === 0 && tShift ? tShift.userId : dayOffset === 1 && yShift ? yShift.userId : pick(cashiers),
              shiftId: dayOffset === 0 && tShift ? tShift.id : dayOffset === 1 && yShift ? yShift.id : null,
              branchId: orderType === 'delivery' ? 'b1' : (rnd() < 0.8 ? 'b1' : 'b2'),
              notes: orderType === 'delivery' ? 'طلب تطبيق توصيل — تجريبي' : '',
              createdAt
            });
          } catch (e) { /* stock guard — skip sale */ }
        }
      }

      /* ---------- Returns (issued last for a clean hash chain) ---------- */
      const recentSales = d.invoices.filter((i) => i.type === 'sale' && i.items.length > 0)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      recentSales.slice(0, 4).forEach((inv, idx) => {
        const item = inv.items[0];
        try {
          Business.createSaleReturn({
            invoiceId: inv.id,
            items: [{ productId: item.productId, qty: 1 }],
            refundMethod: inv.customerId ? 'credit' : 'cash',
            date: inv.date,
            notes: 'مرتجع — طلب غير مطابق',
            createdAt: new Date(Date.now() - (4 - idx) * 45000).toISOString()
          });
        } catch (e) {}
      });

      /* ---------- Close yesterday's shift ---------- */
      if (yShift) {
        try {
          const sum = Shifts.summary(yShift.id);
          Shifts.close(yShift.id, round2(sum.expectedCash + (rnd() < 0.5 ? -9 : 6)), 'تسليم وردية — مطابقة نقدية');
        } catch (e) {}
      }

      /* ---------- Expenses ---------- */
      const expenses = [
        [-30, '5103', 'إيجار المقر — الشهر الماضي', 12000, 0, 'bank'],
        [-2, '5103', 'إيجار المقر — الشهر الحالي', 12000, 0, 'bank'],
        [-29, '5102', 'رواتب فريق العمل', 18500, 0, 'bank'],
        [-3, '5102', 'رواتب فريق العمل — دفعة ثانية', 4200, 0, 'bank'],
        [-24, '5104', 'كهرباء ومياه', 1850, 15, 'bank'],
        [-9, '5104', 'كهرباء ومياه', 1640, 15, 'bank'],
        [-20, '5105', 'حملة إعلانية — سناب شات', 1500, 15, 'bank'],
        [-6, '5105', 'تصوير قائمة الطعام', 850, 15, 'bank'],
        [-15, '5106', 'صيانة معدات المطبخ', 620, 15, 'cash'],
        [-8, '5111', 'إنترنت واتصالات', 420, 15, 'bank'],
        [-5, '5112', 'عمولة توصيل — تطبيقات', 1180, 15, 'bank'],
        [-13, '5109', 'مصروفات نثرية', 260, 0, 'cash'],
        [-11, '5110', 'ضيافة عملاء', 190, 15, 'cash'],
        [-22, '5107', 'رسوم بنكية', 85, 0, 'bank']
      ];
      expenses.forEach(([offset, acc, desc, amount, rate, method]) => {
        const date = U.addDays(today(), offset);
        try {
          Business.createExpense({
            accountId: acc, description: desc, amount, taxRate: rate, method, date,
            createdAt: date + 'T10:30:00'
          });
        } catch (e) {}
      });

      /* ---------- Receipts & supplier payments ---------- */
      const debtors = d.customers.map((c) => ({ c, bal: Accounting.customerBalance(c.id) }))
        .filter((x) => x.bal > 300).sort((a, b) => b.bal - a.bal);
      debtors.slice(0, 6).forEach((x, idx) => {
        const amount = round2(Math.min(x.bal * (0.25 + rnd() * 0.25), 5000));
        if (amount <= 0) return;
        const date = U.addDays(today(), -between(1, 18));
        try {
          Business.createReceipt({
            customerId: x.c.id, amount, method: idx % 3 === 0 ? 'cash' : 'mada', date,
            notes: 'تحصيل دفعة من الرصيد', createdAt: date + 'T12:10:00'
          });
        } catch (e) {}
      });
      const creditors = d.suppliers.map((s) => ({ s, bal: Accounting.supplierBalance(s.id) }))
        .filter((x) => x.bal > 300).sort((a, b) => b.bal - a.bal);
      creditors.slice(0, 5).forEach((x, idx) => {
        const amount = round2(Math.min(x.bal * (0.2 + rnd() * 0.25), 6000));
        if (amount <= 0) return;
        const date = U.addDays(today(), -between(1, 16));
        try {
          Business.createSupplierPayment({
            supplierId: x.s.id, amount, method: idx % 4 === 0 ? 'cash' : 'bank', date,
            notes: 'سداد دفعة للمورد', createdAt: date + 'T11:40:00'
          });
        } catch (e) {}
      });

      /* ---------- Waste ---------- */
      [
        ['rm_tomato', 3.5, 'تلف طماطم — استلام غير مطابق', -2],
        ['rm_chicken', 2.0, 'تلف دجاج — سلسلة تبريد', -4],
        ['rm_bread', 14, 'خبز زائد — نهاية اليوم', -1]
      ].forEach(([productId, qty, reason, offset]) => {
        try { Waste.create({ productId, qty, reason, date: U.addDays(today(), offset) }); }
        catch (e) {}
      });

      /* ---------- Live floor / KDS / delivery orders ---------- */
      const byId = (id) => Store.product(id);
      const line = (id, qty) => ({ productId: id, qty: qty || 1, price: byId(id).price, taxRate: 15 });
      try {
        const openCheck = Orders.create({
          type: 'dine_in', tableId: 't01',
          items: [line('m006', 2), line('m020', 1), line('m024', 2)],
          customerName: 'عائلة العمري', waiterName: 'ريم الحربي', waiterId: 'u4',
          status: 'open', notes: 'طاولة عائلية — بدون بصل'
        });
        Orders.addItems(openCheck.id, [line('m003', 1)]);
      } catch (e) {}
      try {
        const k1 = Orders.create({
          type: 'dine_in', tableId: 't02',
          items: [line('m012', 2), line('m027', 2)],
          waiterName: 'ريم الحربي', waiterId: 'u4', sendToKitchen: true, status: 'new',
          notes: 'مندي دجاج — أرز زيادة'
        });
        Orders.setStatus(k1.id, 'preparing');
      } catch (e) {}
      try {
        Orders.create({
          type: 'takeaway',
          items: [line('m018', 1), line('m020', 1), line('m025', 1)],
          customerName: 'عبدالله الشهري', customerPhone: '+966 55 887 1122',
          sendToKitchen: true, status: 'new', notes: 'برجر بدون مخلل'
        });
      } catch (e) {}
      try {
        const k3 = Orders.create({
          type: 'dine_in', tableId: 't03',
          items: [line('m007', 1), line('m030', 2)],
          waiterName: 'ريم الحربي', waiterId: 'u4', sendToKitchen: true, status: 'new'
        });
        Orders.setStatus(k3.id, 'ready');
      } catch (e) {}
      try {
        Orders.fromEmenu({
          tableId: 't04',
          items: [line('m013', 1), line('m023', 1), line('m028', 2)],
          customerName: 'ضيف القائمة الإلكترونية', notes: 'طلب من QR الطاولة — بدون ملاحظات'
        });
      } catch (e) {}
      try {
        const d1 = Delivery.ingest('hungerstation', {
          externalOrderId: 'HS-88231', customerName: 'نورة العتيبي', customerPhone: '+966 50 112 3344',
          items: [line('m012', 1), line('m020', 1), line('m024', 1)],
          notes: 'طلب هنقرستيشن — تجريبي'
        });
        Delivery.updateStatus(d1.order.id, 'preparing');
      } catch (e) {}
      try {
        Delivery.ingest('jahez', {
          externalOrderId: 'JZ-44120', customerName: 'محمد الدوسري', customerPhone: '+966 56 778 2211',
          items: [line('m006', 1), line('m022', 1), line('m025', 1)],
          notes: 'طلب جاهز — تجريبي'
        });
      } catch (e) {}
      try { Tables.reserve('t12', 'عائلة العتيبي', '+966 55 334 8899', U.addDays(today(), 1) + 'T20:00:00'); } catch (e) {}

      /* ---------- Thermal printer & integration demo logs ---------- */
      try {
        const recent = d.invoices.filter((i) => i.type === 'sale').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
        if (recent) Printer.receipt(recent);
        const kds = Store.kitchenOrders()[0];
        if (kds) Printer.kitchen(kds);
        Printer.test();
      } catch (e) {}
      try { Delivery.syncMenu(); } catch (e) {}
      try { Integrations.seedDemoLogs(); } catch (e) {}

      d.paymentLogs = [
        { id: 'tx_demo_1', provider: 'hyperpay', providerName: 'HyperPay', method: 'mada', amount: 186.30, currency: 'SAR', orderId: null, invoiceId: null, phone: '', status: 'approved', transactionId: 'TX-HYPERPAY-DEMO01', reference: 'REF-MADA-DEMO01', message: 'تمت الموافقة التجريبية عبر HyperPay', sandbox: true, at: new Date(Date.now() - 35 * 60000).toISOString() },
        { id: 'tx_demo_2', provider: 'geidea', providerName: 'Geidea', method: 'applepay', amount: 92.00, currency: 'SAR', orderId: null, invoiceId: null, phone: '', status: 'approved', transactionId: 'TX-GEIDEA-DEMO02', reference: 'REF-APPLEPAY-DEMO02', message: 'تمت الموافقة التجريبية عبر Geidea', sandbox: true, at: new Date(Date.now() - 95 * 60000).toISOString() },
        { id: 'tx_demo_3', provider: 'moyasar', providerName: 'Moyasar', method: 'stcpay', amount: 48.30, currency: 'SAR', orderId: null, invoiceId: null, phone: '+966 55 000 1122', status: 'approved', transactionId: 'TX-MOYASAR-DEMO03', reference: 'REF-STCPAY-DEMO03', message: 'تمت الموافقة التجريبية عبر Moyasar', sandbox: true, at: new Date(Date.now() - 180 * 60000).toISOString() },
        { id: 'tx_demo_4', provider: 'mock', providerName: 'Mock Gateway', method: 'visa', amount: 0, currency: 'SAR', orderId: null, invoiceId: null, phone: '', status: 'failed', transactionId: null, reference: null, message: 'فشلت العملية التجريبية — تحقق من المبلغ', sandbox: true, at: new Date(Date.now() - 240 * 60000).toISOString() }
      ];

      d.meta.seededAt = new Date().toISOString();
      d.meta.pendingSync = between(5, 12);
    });
    Store.seedMode = false;
  };

  Seed.ensureRestaurant = function () {
    const d = Store.data;
    if (!d) return;
    const hasTables = Array.isArray(d.tables) && d.tables.length;
    const hasRaw = Array.isArray(d.products) && d.products.some((p) => p.type === 'raw');
    if (hasTables && hasRaw) {
      if (!Array.isArray(d.coupons) || !d.coupons.length) d.coupons = Seed.coupons();
      return;
    }
    if (!Array.isArray(d.invoices) || !d.invoices.length) {
      Seed.run();
      return;
    }
    /* Non-destructive upgrade for an existing non-restaurant demo store. */
    if (!hasTables) d.tables = Seed.tables();
    if (!hasRaw) d.products = d.products.concat(Seed.rawMaterials());
    if (!Array.isArray(d.coupons) || !d.coupons.length) d.coupons = Seed.coupons();
    d.products.forEach((p) => {
      if (!p.type) p.type = p.isRaw ? 'raw' : 'menu';
      if (p.type === 'menu' && !Array.isArray(p.recipe)) p.recipe = [];
    });
    Store.save();
  };
})();
