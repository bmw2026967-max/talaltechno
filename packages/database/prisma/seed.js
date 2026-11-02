/**
 * طلال تكنو — development seed.
 *
 * DESTRUCTIVE: truncates the Tenant table and every dependent table, then
 * recreates a complete restaurant demo. Never run against production.
 *
 * Run: pnpm db:seed  (after pnpm db:migrate / prisma db push)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  createSaleDraft,
  createReturnDraft,
  buildSaleJournal,
  buildReturnJournal,
  issueSandbox,
  consume,
  restore,
  recipeCost,
  normalizeLines,
  computeTotals,
  round2
} from '@talaltechno/domain';

const prisma = new PrismaClient();

const TENANT_SLUG = 'talal-techno';
const DEMO_PASSWORD = 'Talal@1234';
const VAT = 15;

const METHOD_ENUM = {
  cash: 'CASH',
  mada: 'MADA',
  applepay: 'APPLE_PAY',
  stcpay: 'STC_PAY',
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  card: 'CARD',
  bank: 'BANK',
  credit: 'CREDIT',
  wallet: 'WALLET',
  mixed: 'MIXED'
};

const statusEnum = (status) => String(status || 'paid').toUpperCase();

const now = new Date();
const day = (offset, hour = 12, minute = 15) => {
  const date = new Date(now);
  date.setDate(date.getDate() - offset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const dateOnly = (value) => new Date(value.toISOString().slice(0, 10));

const rawMaterials = [
  ['أرز بسمتي', 'كجم', 6, 50, 10],
  ['دجاج طازج', 'كجم', 18, 25, 8],
  ['لحم غنم', 'كجم', 45, 15, 5],
  ['حمص', 'كجم', 8, 20, 5],
  ['طحينة', 'كجم', 22, 10, 3],
  ['زيت زيتون', 'لتر', 35, 8, 2],
  ['باذنجان', 'كجم', 5, 15, 5],
  ['خس', 'كجم', 4, 10, 3],
  ['طماطم', 'كجم', 5, 20, 5],
  ['خيار', 'كجم', 4, 15, 4],
  ['ليمون', 'كجم', 7, 10, 3],
  ['نعناع', 'كجم', 20, 2, 1],
  ['سكر', 'كجم', 4, 25, 5],
  ['بطاطس', 'كجم', 4, 30, 8],
  ['بصل', 'كجم', 3, 20, 5],
  ['بهارات مشكلة', 'كجم', 40, 5, 1],
  ['جبن عكاوي', 'كجم', 28, 8, 2],
  ['فستق حلبي', 'كجم', 90, 3, 1],
  ['مياه معدنية', 'حبة', 1.5, 120, 24],
  ['زيت طبخ', 'لتر', 9, 20, 5]
];

const menu = [
  ['حمص بالطحينة', 'المقبلات', 18, '🫘', [['حمص', 0.12], ['طحينة', 0.05], ['زيت زيتون', 0.015], ['ليمون', 0.01]]],
  ['متبل باذنجان', 'المقبلات', 18, '🍆', [['باذنجان', 0.2], ['طحينة', 0.05], ['زيت زيتون', 0.015]]],
  ['فتوش', 'المقبلات', 22, '🥗', [['خس', 0.15], ['طماطم', 0.1], ['خيار', 0.08], ['زيت زيتون', 0.02], ['ليمون', 0.02]]],
  ['كبسة دجاج', 'الأطباق الرئيسية', 32, '🍛', [['أرز بسمتي', 0.25], ['دجاج طازج', 0.3], ['زيت طبخ', 0.04], ['بهارات مشكلة', 0.008]]],
  ['مندي لحم', 'الأطباق الرئيسية', 48, '🥘', [['أرز بسمتي', 0.3], ['لحم غنم', 0.28], ['زيت طبخ', 0.04], ['بهارات مشكلة', 0.01]]],
  ['شيش طاووق', 'المشاوي', 38, '🍢', [['دجاج طازج', 0.32], ['زيت زيتون', 0.02], ['بهارات مشكلة', 0.008]]],
  ['كباب لحم', 'المشاوي', 42, '🍖', [['لحم غنم', 0.3], ['بصل', 0.05], ['بهارات مشكلة', 0.01]]],
  ['بطاطس مقلية', 'الأطباق الجانبية', 12, '🍟', [['بطاطس', 0.25], ['زيت طبخ', 0.08]]],
  ['سلطة خضراء', 'الأطباق الجانبية', 14, '🥬', [['خس', 0.12], ['طماطم', 0.08], ['خيار', 0.08], ['ليمون', 0.015]]],
  ['مياه معدنية', 'المشروبات', 3, '💧', [['مياه معدنية', 1]]],
  ['عصير ليمون بالنعناع', 'المشروبات', 12, '🍋', [['ليمون', 0.12], ['نعناع', 0.01], ['سكر', 0.04]]],
  ['كنافة بالجبن', 'الحلويات', 24, '🍮', [['جبن عكاوي', 0.12], ['سكر', 0.06], ['فستق حلبي', 0.01]]]
];

const tableDefs = [
  ['T01', 'الصالة الرئيسية', 4], ['T02', 'الصالة الرئيسية', 4], ['T03', 'الصالة الرئيسية', 6],
  ['T04', 'الصالة الرئيسية', 6], ['T05', 'العائلات', 4], ['T06', 'العائلات', 4],
  ['T07', 'العائلات', 8], ['T08', 'التراس', 2], ['T09', 'التراس', 2],
  ['T10', 'التراس', 4], ['T11', 'VIP', 10], ['T12', 'VIP', 10]
];

const customers = [
  ['C001', 'شركة الواحة للضيافة', '0551234567', '310123456700003', 4200, 'platinum'],
  ['C002', 'نورة العتيبي', '0559876543', null, 860, 'gold'],
  ['C003', 'عبدالله القحطاني', '0501112233', null, 320, 'silver'],
  ['C004', 'ريم الحربي', '0504445566', null, 145, 'bronze'],
  ['C005', 'فهد الدوسري', '0537778899', null, 680, 'gold'],
  ['C006', 'مها الشهري', '0562223344', null, 95, 'bronze']
];

const users = [
  ['مالك المطعم', 'owner@talaltechno.dev', 'OWNER', '1111'],
  ['أحمد الحميري', 'admin@talaltechno.dev', 'ADMIN', '1234'],
  ['منى عبدالله', 'manager@talaltechno.dev', 'MANAGER', '2222'],
  ['خالد الشامي', 'cashier@talaltechno.dev', 'CASHIER', '4444'],
  ['سعيد الغامدي', 'waiter@talaltechno.dev', 'WAITER', '5555'],
  ['مطبخ طلال', 'kitchen@talaltechno.dev', 'KITCHEN', '6666'],
  ['سارة العلي', 'accountant@talaltechno.dev', 'ACCOUNTANT', '3333'],
  ['عمر الزهراني', 'delivery@talaltechno.dev', 'DELIVERY_MANAGER', '7777']
];

const chart = [
  ['1101', 'الصندوق (النقدية)', 'ASSET'],
  ['1102', 'البنك / الشبكة', 'ASSET'],
  ['1103', 'المدينون (العملاء)', 'ASSET'],
  ['1104', 'المخزون', 'ASSET'],
  ['1105', 'ضريبة القيمة المضافة — مدخلات', 'ASSET'],
  ['1201', 'الأصول الثابتة', 'ASSET'],
  ['2101', 'الدائنون (الموردون)', 'LIABILITY'],
  ['2102', 'ضريبة القيمة المضافة — مخرجات', 'LIABILITY'],
  ['2103', 'رواتب مستحقة', 'LIABILITY'],
  ['3101', 'رأس المال', 'EQUITY'],
  ['3102', 'الأرباح المحتجزة', 'EQUITY'],
  ['4101', 'إيرادات المبيعات', 'REVENUE'],
  ['4102', 'إيرادات أخرى (خدمة / توصيل)', 'REVENUE'],
  ['4103', 'مرتجعات المبيعات', 'REVENUE'],
  ['4104', 'خصم على المبيعات', 'REVENUE'],
  ['5101', 'تكلفة البضاعة المباعة', 'EXPENSE'],
  ['5102', 'الرواتب والأجور', 'EXPENSE'],
  ['5103', 'الإيجار', 'EXPENSE'],
  ['5108', 'فاقد المخزون', 'EXPENSE'],
  ['5109', 'مصروفات متنوعة', 'EXPENSE']
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Tenant" CASCADE');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'مطعم طلال تكنو',
      slug: TENANT_SLUG,
      vatNumber: '310123456700003',
      crNumber: '1010123456',
      email: 'hello@talaltechno.dev',
      phone: '0112345678',
      address: 'طريق العليا، حي الغدير',
      city: 'الرياض',
      settings: {
        brand: 'طلال تكنو',
        invoicePrefix: 'TT',
        receiptFooter: 'شكراً لزيارتكم — طلال تكنو',
        serviceChargeRate: 0,
        loyalty: { earnPerSar: 1, redeemValue: 0.05 },
        emenu: {
          enabled: true,
          allowSelfOrder: true,
          requireTable: false,
          welcomeText: 'أهلاً بكم في مطعم طلال تكنو — اختر أصنافك وسنبدأ التحضير فوراً.'
        }
      }
    }
  });

  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'الفرع الرئيسي — العليا',
      code: 'RUH-01',
      address: 'طريق العليا، الرياض',
      phone: '0112345678'
    }
  });

  const warehouse = await prisma.warehouse.create({
    data: { tenantId: tenant.id, branchId: branch.id, name: 'المخزن الرئيسي', code: 'WH-01' }
  });

  await prisma.device.createMany({
    data: [
      { tenantId: tenant.id, branchId: branch.id, name: 'كاشير 1', type: 'POS', serial: 'POS-001' },
      { tenantId: tenant.id, branchId: branch.id, name: 'شاشة المطبخ', type: 'KDS', serial: 'KDS-001' },
      { tenantId: tenant.id, branchId: branch.id, name: 'طابعة الكاشير', type: 'PRINTER', serial: 'PRN-001' }
    ]
  });

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const createdUsers = {};
  for (const [name, email, role, pin] of users) {
    createdUsers[role] = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name,
        email,
        phone: '05' + String(Math.floor(10000000 + Math.random() * 89999999)),
        role,
        passwordHash,
        pinHash: bcrypt.hashSync(pin, 10)
      }
    });
  }

  const accounts = {};
  for (const [code, name, type] of chart) {
    accounts[code] = await prisma.account.create({
      data: { tenantId: tenant.id, code, name, type }
    });
  }

  const categories = {};
  for (const [index, name] of ['المقبلات', 'المشاوي', 'الأطباق الرئيسية', 'الأطباق الجانبية', 'المشروبات', 'الحلويات'].entries()) {
    categories[name] = await prisma.category.create({
      data: { tenantId: tenant.id, name, sort: index + 1 }
    });
  }

  const rawByLabel = {};
  for (const [index, [name, unit, cost, stock, minStock]] of rawMaterials.entries()) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        sku: `RAW-${String(index + 1).padStart(3, '0')}`,
        type: 'RAW',
        price: 0,
        cost,
        unit,
        minStock,
        trackStock: true
      }
    });
    rawByLabel[name] = product;
    await prisma.stockLevel.create({
      data: { tenantId: tenant.id, warehouseId: warehouse.id, productId: product.id, qty: stock }
    });
    await prisma.stockMove.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        productId: product.id,
        type: 'OPENING',
        qty: stock,
        unitCost: cost,
        value: round2(stock * cost),
        referenceType: 'opening',
        referenceNumber: 'OPENING-001',
        note: 'رصيد افتتاحي تجريبي'
      }
    });
  }

  const menuByLabel = {};
  const productsForDomain = {};
  for (const [index, [name, category, price, emoji, recipe]] of menu.entries()) {
    const cost = round2(recipe.reduce((total, [material, qty]) => total + rawByLabel[material].cost * qty, 0));
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[category].id,
        name,
        sku: `MN-${String(index + 1).padStart(3, '0')}`,
        barcode: `628${String(1000000 + index)}`,
        type: 'MENU',
        price,
        cost,
        emoji,
        unit: 'حبة',
        available: true
      }
    });
    menuByLabel[name] = product;
    productsForDomain[product.id] = { id: product.id, name, type: 'menu', price, recipe: [] };
    for (const [material, qty] of recipe) {
      await prisma.recipeLine.create({
        data: { productId: product.id, materialId: rawByLabel[material].id, qty }
      });
      productsForDomain[product.id].recipe.push({ materialId: rawByLabel[material].id, qty });
    }
  }

  const materials = {};
  for (const [label, product] of Object.entries(rawByLabel)) {
    const level = await prisma.stockLevel.findUnique({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } }
    });
    materials[product.id] = {
      id: product.id,
      name: label,
      unit: product.unit,
      cost: Number(product.cost),
      stock: Number(level.qty)
    };
  }

  const tableRows = {};
  for (const [name, zone, seats] of tableDefs) {
    tableRows[name] = await prisma.diningTable.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        name,
        zone,
        seats,
        qrToken: `talal-${name.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`
      }
    });
  }

  const customerRows = {};
  for (const [code, name, phone, vatNumber, points, tier] of customers) {
    customerRows[code] = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        code,
        name,
        phone,
        vatNumber,
        loyaltyPoints: points,
        tier,
        totalSpent: round2(points * 1.25),
        lastPurchaseAt: day(2)
      }
    });
  }

  await prisma.coupon.createMany({
    data: [
      { tenantId: tenant.id, code: 'TALAL20', type: 'percent', value: 20, minSpend: 50, usageLimit: 100, active: true, expiresAt: day(-30) },
      { tenantId: tenant.id, code: 'WELCOME10', type: 'fixed', value: 10, minSpend: 30, usageLimit: 200, active: true, expiresAt: day(-60) },
      { tenantId: tenant.id, code: 'FREEDEL', type: 'fixed', value: 15, minSpend: 80, usageLimit: 50, active: true, expiresAt: day(-45) }
    ]
  });

  const supplierA = await prisma.supplier.create({
    data: { tenantId: tenant.id, name: 'مؤسسة الرياض للمواد الغذائية', phone: '0112223333', vatNumber: '311222333400003', balance: 0 }
  });
  const supplierB = await prisma.supplier.create({
    data: { tenantId: tenant.id, name: 'شركة الخير للخضار والفواكه', phone: '0114445555', balance: 0 }
  });

  const purchase = await prisma.purchaseOrder.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      warehouseId: warehouse.id,
      supplierId: supplierA.id,
      number: 'PO-1001',
      status: 'RECEIVED',
      date: dateOnly(day(3)),
      subtotal: 900,
      tax: 135,
      total: 1035,
      notes: 'توريد أسبوعي',
      items: {
        create: [
          { productId: rawByLabel['أرز بسمتي'].id, qty: 50, unitCost: 6, total: 300 },
          { productId: rawByLabel['دجاج طازج'].id, qty: 25, unitCost: 18, total: 450 },
          { productId: rawByLabel['زيت طبخ'].id, qty: 16.67, unitCost: 9, total: 150 }
        ]
      }
    }
  });

  const shiftOpen = await prisma.shift.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      userId: createdUsers.CASHIER.id,
      number: 'SH-1001',
      status: 'OPEN',
      openingCash: 500,
      openedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000)
    }
  });
  await prisma.shift.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      userId: createdUsers.MANAGER.id,
      number: 'SH-1000',
      status: 'CLOSED',
      openingCash: 300,
      closingCash: 300,
      expectedCash: 300,
      variance: 0,
      sales: 0,
      orders: 0,
      openedAt: day(1, 8, 0),
      closedAt: day(1, 23, 30)
    }
  });

  const domainSales = [];
  const dbInvoices = [];
  const saleMethods = ['cash', 'mada', 'applepay', 'stcpay', 'cash', 'mada'];
  const orderTypes = ['dine_in', 'takeaway', 'delivery', 'dine_in', 'takeaway', 'delivery'];
  let previousHash = '0'.repeat(64);
  let invoiceSequence = 1001;

  for (let d = 2; d >= 0; d -= 1) {
    for (let s = 0; s < 4; s += 1) {
      // Keep every seeded invoice in the past so the ZATCA hash chain stays
      // append-only relative to invoices created later by the API.
      const sequence = (2 - d) * 4 + s;
      const created = new Date(now.getTime() - (11 - sequence) * 2 * 60 * 60 * 1000 - 30 * 60 * 1000);
      const picks = [
        menu[(d * 4 + s) % menu.length],
        menu[(d * 4 + s + 4) % menu.length],
        menu[(d * 4 + s + 7) % menu.length]
      ];
      const items = picks.map(([name, , , , recipe], index) => {
        const product = menuByLabel[name];
        const cost = round2(recipe.reduce((total, [material, qty]) => total + rawByLabel[material].cost * qty, 0));
        return {
          productId: product.id,
          name,
          sku: product.sku,
          qty: index === 0 ? 2 : 1,
          price: Number(product.price),
          cost,
          taxRate: VAT
        };
      });
      const method = saleMethods[(d * 4 + s) % saleMethods.length];
      const orderType = orderTypes[(d * 4 + s) % orderTypes.length];
      const customer = s % 3 === 0 ? customerRows[['C001', 'C002', 'C005'][(d + s) % 3]] : null;
      const customerName = customer ? customer.name : 'عميل نقدي';
      const deliveryFee = orderType === 'delivery' ? 5 : 0;
      const number = `TT-${invoiceSequence++}`;

      const totals = computeTotals(normalizeLines(items, VAT), { deliveryFee, taxRate: VAT });

      const final = createSaleDraft({
        id: `seed_sale_${number}`,
        number,
        date: created.toISOString().slice(0, 10),
        createdAt: created.toISOString(),
        items,
        payments: [{ method, amount: totals.total }],
        customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone || '', vatNumber: customer.vatNumber || '' } : null,
        customerName,
        customerPhone: customer ? customer.phone : '',
        orderType,
        deliveryFee,
        tableName: orderType === 'dine_in' ? tableDefs[(d + s) % tableDefs.length][0] : '',
        branchId: branch.id,
        cashierId: createdUsers.CASHIER.id,
        cashierName: createdUsers.CASHIER.name,
        shiftId: d === 0 ? shiftOpen.id : null,
        source: 'seed'
      }).invoice;

      final.seller = {
        name: tenant.name,
        vatNumber: tenant.vatNumber,
        crNumber: tenant.crNumber,
        city: tenant.city,
        address: tenant.address
      };
      const zatca = issueSandbox(final, { previousHash, timestamp: final.createdAt });
      previousHash = zatca.invoiceHash;

      const dbInvoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          shiftId: final.shiftId,
          customerId: final.customerId,
          number: final.number,
          type: 'SALE',
          status: statusEnum(final.status),
          date: dateOnly(created),
          createdAt: created,
          customerName: final.customerName,
          customerPhone: final.customerPhone,
          subtotal: final.subtotal,
          discount: final.discount,
          serviceCharge: final.serviceCharge,
          deliveryFee: final.deliveryFee,
          tax: final.tax,
          total: final.total,
          paid: final.paid,
          due: final.due,
          method: METHOD_ENUM[final.method] || 'CASH',
          cogs: final.cogs,
          profit: final.profit,
          cashierId: createdUsers.CASHIER.id,
          syncStatus: 'SYNCED',
          snapshot: final,
          items: {
            create: final.items.map((item) => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku,
              type: 'MENU',
              qty: item.qty,
              price: item.price,
              discount: item.discount,
              net: item.net,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
              cost: item.cost
            }))
          },
          payments: {
            create: final.payments.map((payment) => ({
              method: METHOD_ENUM[payment.method] || 'CASH',
              amount: payment.amount,
              status: 'approved'
            }))
          },
          zatca: {
            create: {
              tenantId: tenant.id,
              uuid: zatca.uuid,
              type: zatca.type,
              invoiceHash: zatca.invoiceHash,
              previousHash: zatca.previousHash,
              qr: zatca.qr,
              signature: zatca.signature,
              xml: zatca.xml,
              status: zatca.status,
              environment: 'sandbox',
              warning: zatca.warning,
              issuedAt: new Date(zatca.issuedAt),
              reportedAt: new Date()
            }
          }
        }
      });

      const journal = buildSaleJournal(final);
      await prisma.journalEntry.create({
        data: {
          tenantId: tenant.id,
          number: `JE-${number}`,
          date: dateOnly(created),
          description: `فاتورة بيع ${number} — ${final.customerName}`,
          sourceType: 'sale',
          sourceId: dbInvoice.id,
          sourceNumber: number,
          totalDebit: journal.totalDebit,
          totalCredit: journal.totalCredit,
          createdById: createdUsers.CASHIER.id,
          lines: {
            create: journal.lines.map((row) => ({
              accountId: accounts[row.accountId].id,
              debit: row.debit,
              credit: row.credit,
              memo: row.memo
            }))
          }
        }
      });

      const consumed = consume(final.items, productsForDomain, materials, {
        referenceType: 'sale',
        referenceId: dbInvoice.id,
        referenceNumber: number
      });
      Object.assign(materials, consumed.materials);
      for (const move of consumed.moves) {
        await prisma.stockLevel.update({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: move.materialId } },
          data: { qty: materials[move.materialId].stock }
        });
        await prisma.stockMove.create({
          data: {
            tenantId: tenant.id,
            warehouseId: warehouse.id,
            productId: move.materialId,
            type: 'SALE',
            qty: move.qty,
            unitCost: move.unitCost,
            value: move.value,
            referenceType: 'sale',
            referenceId: dbInvoice.id,
            referenceNumber: number,
            note: move.note
          }
        });
      }

      if (customer) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: { increment: Math.floor(final.total) },
            totalSpent: { increment: final.total },
            lastPurchaseAt: created
          }
        });
        await prisma.loyaltyTransaction.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            invoiceId: dbInvoice.id,
            points: Math.floor(final.total),
            type: 'earn',
            note: `نقاط فاتورة ${number}`,
            createdAt: created
          }
        });
      }

      domainSales.push(final);
      dbInvoices.push(dbInvoice);
    }
  }

  // One partial return against the first sale.
  const originalDomain = domainSales[0];
  const originalDb = dbInvoices[0];
  const returnedItem = originalDomain.items[0];
  const lastSaleAt = new Date(domainSales[domainSales.length - 1].createdAt);
  const returnCreatedAt = new Date(lastSaleAt.getTime() + 15 * 60 * 1000);
  const returnDomain = createReturnDraft({
    original: originalDomain,
    items: [{ productId: returnedItem.productId, qty: 1 }],
    number: 'RET-1001',
    date: returnCreatedAt.toISOString().slice(0, 10),
    createdAt: returnCreatedAt.toISOString(),
    refundMethod: originalDomain.customerId ? 'credit' : 'cash',
    cashierId: createdUsers.CASHIER.id,
    cashierName: createdUsers.CASHIER.name,
    notes: 'مرتجع تجريبي — صنف واحد'
  });
  returnDomain.seller = {
    name: tenant.name,
    vatNumber: tenant.vatNumber,
    crNumber: tenant.crNumber,
    city: tenant.city,
    address: tenant.address
  };
  const returnZatca = issueSandbox(returnDomain, { previousHash, timestamp: returnDomain.createdAt });
  const dbReturn = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      shiftId: shiftOpen.id,
      customerId: returnDomain.customerId,
      originalInvoiceId: originalDb.id,
      number: returnDomain.number,
      type: 'RETURN',
      status: 'RETURNED',
      date: dateOnly(returnCreatedAt),
      createdAt: new Date(returnDomain.createdAt),
      customerName: returnDomain.customerName,
      subtotal: returnDomain.subtotal,
      tax: returnDomain.tax,
      total: returnDomain.total,
      paid: returnDomain.total,
      due: 0,
      method: METHOD_ENUM[returnDomain.refundMethod] || 'CASH',
      cogs: returnDomain.cogs,
      profit: returnDomain.profit,
      cashierId: createdUsers.CASHIER.id,
      syncStatus: 'SYNCED',
      snapshot: returnDomain,
      items: {
        create: returnDomain.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          type: 'MENU',
          qty: item.qty,
          price: item.price,
          net: item.net,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          total: item.total,
          cost: item.cost
        }))
      },
      payments: {
        create: returnDomain.payments.map((payment) => ({
          method: METHOD_ENUM[payment.method] || 'CASH',
          amount: payment.amount,
          status: 'approved'
        }))
      },
      zatca: {
        create: {
          tenantId: tenant.id,
          uuid: returnZatca.uuid,
          type: returnZatca.type,
          invoiceHash: returnZatca.invoiceHash,
          previousHash: returnZatca.previousHash,
          qr: returnZatca.qr,
          signature: returnZatca.signature,
          xml: returnZatca.xml,
          status: returnZatca.status,
          environment: 'sandbox',
          warning: returnZatca.warning,
          issuedAt: new Date(returnZatca.issuedAt),
          reportedAt: new Date()
        }
      }
    }
  });

  const returnJournal = buildReturnJournal(returnDomain);
  await prisma.journalEntry.create({
    data: {
      tenantId: tenant.id,
      number: 'JE-RET-1001',
      date: dateOnly(returnCreatedAt),
      description: `مرتجع بيع RET-1001 — أصل ${originalDomain.number}`,
      sourceType: 'sale_return',
      sourceId: dbReturn.id,
      sourceNumber: 'RET-1001',
      totalDebit: returnJournal.totalDebit,
      totalCredit: returnJournal.totalCredit,
      createdById: createdUsers.CASHIER.id,
      lines: {
        create: returnJournal.lines.map((row) => ({
          accountId: accounts[row.accountId].id,
          debit: row.debit,
          credit: row.credit,
          memo: row.memo
        }))
      }
    }
  });

  const restored = restore(returnDomain.items, productsForDomain, materials, {
    referenceType: 'sale_return',
    referenceId: dbReturn.id,
    referenceNumber: returnDomain.number
  });
  Object.assign(materials, restored.materials);
  for (const move of restored.moves) {
    await prisma.stockLevel.update({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: move.materialId } },
      data: { qty: materials[move.materialId].stock }
    });
    await prisma.stockMove.create({
      data: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        productId: move.materialId,
        type: 'SALE_RETURN',
        qty: move.qty,
        unitCost: move.unitCost,
        value: move.value,
        referenceType: 'sale_return',
        referenceId: dbReturn.id,
        referenceNumber: returnDomain.number,
        note: move.note
      }
    });
  }

  // Live kitchen / floor / delivery orders.
  const liveOrder = async ({ number, type, status, tableName, platform, platformName, items, externalOrderId }) => {
    const pricedItems = items.map((item) => {
      const menuItem = menuByLabel[item.name];
      if (!menuItem) throw new Error(`Seed order item not found in menu: ${item.name}`);
      return { ...item, price: menuItem.price, cost: menuItem.cost, productId: menuItem.id };
    });
    const subtotal = round2(pricedItems.reduce((total, item) => total + item.qty * item.price, 0));
    const tax = round2(subtotal * 0.15);
    const total = round2(subtotal + tax);
    const order = await prisma.order.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        branch: { connect: { id: branch.id } },
        number,
        type,
        status,
        ...(tableName ? { table: { connect: { id: tableRows[tableName].id } } } : {}),
        platform: platform || 'DIRECT',
        platformName: platformName || null,
        externalOrderId: externalOrderId || null,
        subtotal,
        tax,
        total,
        createdAt: new Date(now.getTime() - 20 * 60 * 1000),
        items: {
          create: pricedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            cost: item.cost,
            notes: item.notes || null,
            status: item.status || 'NEW',
            station: item.station || 'hot'
          }))
        }
      }
    });
    if (tableName) {
      await prisma.diningTable.update({ where: { id: tableRows[tableName].id }, data: { status: 'occupied' } });
    }
    return order;
  };

  const order1 = await liveOrder({
    number: 'ORD-2001',
    type: 'DINE_IN',
    status: 'PREPARING',
    tableName: 'T03',
    items: [
      { name: 'كبسة دجاج', qty: 2, status: 'PREPARING', station: 'hot' },
      { name: 'حمص بالطحينة', qty: 1, status: 'READY', station: 'cold' },
      { name: 'عصير ليمون بالنعناع', qty: 2, status: 'READY', station: 'bar' }
    ]
  });
  const order2 = await liveOrder({
    number: 'ORD-2002',
    type: 'TAKEAWAY',
    status: 'NEW',
    items: [{ name: 'شيش طاووق', qty: 1, status: 'NEW', station: 'grill' }, { name: 'بطاطس مقلية', qty: 1, status: 'NEW', station: 'hot' }]
  });
  const order3 = await liveOrder({
    number: 'ORD-2003',
    type: 'DELIVERY',
    status: 'READY',
    platform: 'JAHEZ',
    platformName: 'Jahez',
    externalOrderId: 'JH-88231',
    items: [{ name: 'مندي لحم', qty: 1, status: 'READY', station: 'hot' }, { name: 'مياه معدنية', qty: 2, status: 'READY', station: 'bar' }]
  });
  await prisma.deliveryOrder.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      orderId: order3.id,
      platform: 'JAHEZ',
      externalOrderId: 'JH-88231',
      status: 'ready',
      total: order3.total,
      payload: { source: 'seed', note: 'طلب تجريبي من جاهز' },
      syncedAt: new Date()
    }
  });
  await prisma.diningTable.update({ where: { id: tableRows.T08.id }, data: { status: 'reserved' } });
  await prisma.reservation.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      tableId: tableRows.T08.id,
      customerName: 'عائلة العمري',
      phone: '0553334444',
      partySize: 2,
      at: day(-1, 20, 30),
      status: 'BOOKED',
      notes: 'طاولة قريبة من النافذة'
    }
  });

  await prisma.printerJob.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      kind: 'kitchen',
      number: order1.number,
      printer: 'Talal Techno Mock Printer',
      bytes: 612,
      payload: '*** ESC/POS MOCK ***\nطلب مطبخ\nORD-2001\n2 × كبسة دجاج\n1 × حمص بالطحينة\n',
      status: 'printed'
    }
  });
  await prisma.printerJob.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      kind: 'receipt',
      number: originalDomain.number,
      printer: 'Talal Techno Mock Printer',
      bytes: 899,
      payload: `*** ESC/POS MOCK ***\nفاتورة ${originalDomain.number}\nالإجمالي ${originalDomain.total.toFixed(2)} SAR\n`,
      status: 'printed'
    }
  });

  await prisma.syncOperation.createMany({
    data: [
      { tenantId: tenant.id, deviceId: 'POS-001', entity: 'sale', entityType: 'create', entityId: originalDb.id, payload: { number: originalDomain.number }, status: 'SYNCED', syncedAt: new Date() },
      { tenantId: tenant.id, deviceId: 'POS-001', entity: 'sale', entityType: 'create', entityId: dbReturn.id, payload: { number: 'RET-1001' }, status: 'PENDING' }
    ]
  });

  await prisma.paymentTransaction.create({
    data: {
      tenantId: tenant.id,
      provider: 'moyasar',
      method: 'STC_PAY',
      amount: 23.5,
      status: 'approved',
      transactionId: 'TX-SEED-MOYASAR-001',
      reference: 'sandbox-seed',
      mode: 'MOCK',
      raw: { note: 'عملية تجريبية — ليست مدفوعات حقيقية' }
    }
  });

  await prisma.integrationConfig.createMany({
    data: [
      { tenantId: tenant.id, kind: 'PAYMENT', provider: 'hyperpay', mode: 'MOCK', enabled: true, config: { methods: ['mada', 'visa', 'mastercard', 'applepay'] } },
      { tenantId: tenant.id, kind: 'PAYMENT', provider: 'moyasar', mode: 'MOCK', enabled: true, config: { methods: ['mada', 'visa', 'mastercard', 'applepay', 'stcpay'] } },
      { tenantId: tenant.id, kind: 'DELIVERY', provider: 'hungerstation', mode: 'MOCK', enabled: true, config: {} },
      { tenantId: tenant.id, kind: 'DELIVERY', provider: 'jahez', mode: 'MOCK', enabled: true, config: {} },
      { tenantId: tenant.id, kind: 'DELIVERY', provider: 'mrsool', mode: 'MOCK', enabled: true, config: {} },
      { tenantId: tenant.id, kind: 'DELIVERY', provider: 'toyou', mode: 'MOCK', enabled: true, config: {} },
      { tenantId: tenant.id, kind: 'DELIVERY', provider: 'careem', mode: 'MOCK', enabled: true, config: {} },
      { tenantId: tenant.id, kind: 'PRINTER', provider: 'escpos', mode: 'MOCK', enabled: true, config: { width: 32, name: 'Talal Techno Mock Printer' } }
    ]
  });

  await prisma.expense.create({
    data: {
      tenantId: tenant.id,
      branchId: branch.id,
      category: 'مشتريات تشغيلية',
      amount: 120,
      method: 'CASH',
      notes: 'مستلزمات تنظيف',
      date: dateOnly(day(1)),
      createdById: createdUsers.MANAGER.id
    }
  });

  await prisma.auditLog.createMany({
    data: [
      { tenantId: tenant.id, userId: createdUsers.ADMIN.id, action: 'تهيئة بيانات تجريبية', entity: 'tenant', entityId: tenant.id, details: 'Seed كامل لمطعم طلال تكنو', ip: '127.0.0.1' },
      { tenantId: tenant.id, userId: createdUsers.CASHIER.id, action: 'إغلاق وردية', entity: 'shift', entityId: 'SH-1000', details: 'فارق 0.00', ip: '127.0.0.1' }
    ]
  });

  await prisma.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: createdUsers.MANAGER.id, channel: 'in_app', title: 'طلب جديد من جاهز', body: 'ORD-2003 — 69.00 ر.س', status: 'QUEUED' },
      { tenantId: tenant.id, userId: createdUsers.ADMIN.id, channel: 'in_app', title: 'فاتورة ZATCA Sandbox', body: `آخر تجزئة ${previousHash.slice(0, 12)}…`, status: 'QUEUED' }
    ]
  });

  const counts = {
    users: await prisma.user.count({ where: { tenantId: tenant.id } }),
    products: await prisma.product.count({ where: { tenantId: tenant.id } }),
    invoices: await prisma.invoice.count({ where: { tenantId: tenant.id } }),
    orders: await prisma.order.count({ where: { tenantId: tenant.id } }),
    journalEntries: await prisma.journalEntry.count({ where: { tenantId: tenant.id } }),
    zatcaInvoices: await prisma.zatcaInvoice.count({ where: { tenantId: tenant.id } })
  };

  console.log('✅ Talal Techno seed complete');
  console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   Branch: ${branch.name}`);
  console.log(`   Login : admin@talaltechno.dev / ${DEMO_PASSWORD}`);
  console.log('   Counts:', counts);
  console.log(`   ZATCA chain head: ${previousHash}`);
  console.log(`   Purchase order: ${purchase.number}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
