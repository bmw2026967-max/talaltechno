import { createSaleDraft } from '../src/sale.js';
import { issueSandbox } from '../src/zatca.js';

export const VAT = 15;

export const materials = {
  mat_rice: { id: 'mat_rice', name: 'أرز بسمتي', unit: 'كجم', cost: 6, stock: 50 },
  mat_chicken: { id: 'mat_chicken', name: 'دجاج طازج', unit: 'كجم', cost: 18, stock: 20 },
  mat_oil: { id: 'mat_oil', name: 'زيت طبخ', unit: 'لتر', cost: 9, stock: 12 }
};

export const products = {
  m_kabsa: {
    id: 'm_kabsa',
    name: 'كبسة دجاج',
    type: 'menu',
    price: 32,
    recipe: [
      { materialId: 'mat_rice', qty: 0.25 },
      { materialId: 'mat_chicken', qty: 0.3 },
      { materialId: 'mat_oil', qty: 0.05 }
    ]
  },
  m_water: {
    id: 'm_water',
    name: 'مياه معدنية',
    type: 'menu',
    price: 3,
    recipe: [{ materialId: 'mat_oil', qty: 0.001 }]
  }
};

export function makeSale(overrides = {}) {
  const { invoice } = createSaleDraft({
    id: 'inv_test_1',
    number: 'TT-9001',
    date: '2026-10-27',
    createdAt: '2026-10-27T10:00:00.000Z',
    items: [{
      productId: 'm_kabsa',
      name: 'كبسة دجاج',
      qty: 2,
      price: 32,
      cost: 10.85,
      taxRate: VAT
    }],
    payments: [{ method: 'cash', amount: 73.6 }],
    customerName: 'عميل نقدي',
    orderType: 'takeaway',
    cashierName: 'أحمد الحميري',
    ...overrides
  });
  return invoice;
}

export function makeZatcaInvoice(number = 'TT-9001', previousHash, createdAt = '2026-10-27T10:00:00.000Z') {
  const invoice = makeSale({ number, createdAt, date: createdAt.slice(0, 10) });
  invoice.seller = {
    name: 'مطعم طلال تكنو',
    vatNumber: '310123456700003',
    crNumber: '1010123456',
    city: 'الرياض',
    address: 'العليا'
  };
  const zatca = issueSandbox(invoice, { previousHash, timestamp: createdAt });
  invoice.zatca = zatca;
  return invoice;
}
