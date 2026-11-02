import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableServings,
  recipeCost,
  checkAvailability,
  consume,
  restore,
  recordWaste,
  adjustStock,
  valuation
} from '../src/inventory.js';
import { materials, products } from './helpers.js';

test('recipe cost and available servings derive from raw materials', () => {
  assert.equal(recipeCost(products.m_kabsa.recipe, materials), 7.35);
  assert.equal(availableServings(products.m_kabsa.recipe, materials), 66);
});

test('availability check uses the limiting ingredient', () => {
  const low = { ...materials, mat_chicken: { ...materials.mat_chicken, stock: 0.6 } };
  assert.equal(availableServings(products.m_kabsa.recipe, low), 2);
  assert.doesNotThrow(() => checkAvailability([{ productId: 'm_kabsa', qty: 2 }], products, low));
  assert.throws(
    () => checkAvailability([{ productId: 'm_kabsa', qty: 3 }], products, low),
    /INSUFFICIENT_STOCK/
  );
});

test('consuming a menu item decrements every recipe material', () => {
  const { materials: next, moves } = consume(
    [{ productId: 'm_kabsa', qty: 2 }],
    products,
    materials,
    { referenceNumber: 'TT-1' }
  );

  assert.equal(next.mat_rice.stock, 49.5);
  assert.equal(next.mat_chicken.stock, 19.4);
  assert.equal(next.mat_oil.stock, 11.9);
  assert.equal(materials.mat_rice.stock, 50, 'input map is not mutated');
  assert.equal(moves.length, 3);
  assert.equal(moves[0].type, 'sale_bom');
  assert.equal(moves[0].qty, -0.5);
  assert.match(moves[0].note, /TT-1/);
});

test('consuming beyond stock is rejected atomically', () => {
  const low = { ...materials, mat_chicken: { ...materials.mat_chicken, stock: 0.2 } };
  assert.throws(() => consume([{ productId: 'm_kabsa', qty: 1 }], products, low), /INSUFFICIENT_STOCK/);
});

test('returns restore recipe materials', () => {
  const { materials: next, moves } = restore(
    [{ productId: 'm_kabsa', qty: 1 }],
    products,
    materials,
    { referenceNumber: 'RET-1' }
  );
  assert.equal(next.mat_rice.stock, 50.25);
  assert.equal(next.mat_chicken.stock, 20.3);
  assert.equal(moves[0].type, 'sale_return_bom');
  assert.equal(moves[0].qty, 0.25);
});

test('waste decrements stock and records a move', () => {
  const { materials: next, move } = recordWaste(materials, 'mat_rice', 2, 'تلف', { number: 'WST-1' });
  assert.equal(next.mat_rice.stock, 48);
  assert.equal(move.type, 'waste');
  assert.equal(move.qty, -2);
  assert.equal(move.value, -12);
  assert.match(move.note, /تلف/);
});

test('waste above stock is rejected', () => {
  assert.throws(() => recordWaste(materials, 'mat_oil', 100), /INSUFFICIENT_STOCK/);
  assert.throws(() => recordWaste(materials, 'mat_oil', 0), /WASTE_QTY_INVALID/);
});

test('stock adjustment sets an absolute balance', () => {
  const { materials: next, move } = adjustStock(materials, 'mat_oil', 15, 'جرد');
  assert.equal(next.mat_oil.stock, 15);
  assert.equal(move.qty, 3);
  assert.equal(move.value, 27);
});

test('negative adjustments and unknown materials are rejected', () => {
  assert.throws(() => adjustStock(materials, 'mat_oil', -1), /STOCK_NEGATIVE/);
  assert.throws(() => adjustStock(materials, 'missing', 1), /MATERIAL_NOT_FOUND/);
});

test('inventory valuation sums stock at cost', () => {
  assert.equal(valuation(materials), 50 * 6 + 20 * 18 + 12 * 9);
});
