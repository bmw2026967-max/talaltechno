/**
 * Bill-of-materials inventory. Menu items never hold stock directly; their
 * availability is derived from raw-material balances. All functions are pure:
 * they return a new materials map and a list of stock moves.
 */

import { round2, sum } from './money.js';

export function cloneMaterials(materials) {
  return Object.fromEntries(
    Object.entries(materials || {}).map(([id, material]) => [id, { ...material }])
  );
}

export function recipeCost(recipe, materials) {
  return round2(sum(recipe || [], (line) => {
    const material = materials[line.materialId];
    return (Number(material && material.cost) || 0) * (Number(line.qty) || 0);
  }));
}

export function availableServings(recipe, materials) {
  if (!Array.isArray(recipe) || recipe.length === 0) return 0;
  return Math.max(0, Math.floor(Math.min(...recipe.map((line) => {
    const material = materials[line.materialId];
    if (!material || !(Number(line.qty) > 0)) return 0;
    return (Number(material.stock) || 0) / Number(line.qty);
  }))));
}

function productFor(products, productId) {
  const product = products[productId];
  if (!product) throw new Error(`PRODUCT_NOT_FOUND:${productId}`);
  return product;
}

function materialFor(materials, materialId) {
  const material = materials[materialId];
  if (!material) throw new Error(`MATERIAL_NOT_FOUND:${materialId}`);
  return material;
}

export function checkAvailability(items, products, materials) {
  (items || []).forEach((item) => {
    const product = productFor(products, item.productId);
    const qty = Number(item.qty) || 0;
    if (qty <= 0) throw new Error(`INVALID_QTY:${item.productId}`);

    if (product.type === 'menu' || product.recipe) {
      if (!Array.isArray(product.recipe) || product.recipe.length === 0) {
        throw new Error(`RECIPE_MISSING:${item.productId}`);
      }
      const available = availableServings(product.recipe, materials);
      if (available < qty) throw new Error(`INSUFFICIENT_STOCK:${product.name || item.productId}`);
    } else {
      const material = materialFor(materials, product.id);
      if ((Number(material.stock) || 0) < qty) {
        throw new Error(`INSUFFICIENT_STOCK:${product.name || item.productId}`);
      }
    }
  });
  return true;
}

/**
 * Consume raw materials for a list of sold menu items. Returns a new materials
 * map; the caller persists it atomically with the sale.
 */
export function consume(items, products, materials, ref = {}) {
  const next = cloneMaterials(materials);
  const moves = [];

  (items || []).forEach((item) => {
    const product = productFor(products, item.productId);
    const qty = Number(item.qty) || 0;
    if (qty <= 0) throw new Error(`INVALID_QTY:${item.productId}`);

    if (product.type === 'menu' || product.recipe) {
      if (!Array.isArray(product.recipe) || product.recipe.length === 0) {
        throw new Error(`RECIPE_MISSING:${item.productId}`);
      }
      product.recipe.forEach((line) => {
        const material = materialFor(next, line.materialId);
        const used = round2((Number(line.qty) || 0) * qty);
        if ((Number(material.stock) || 0) + 1e-9 < used) {
          throw new Error(`INSUFFICIENT_STOCK:${material.name || line.materialId}`);
        }
        material.stock = round2((Number(material.stock) || 0) - used);
        moves.push({
          materialId: line.materialId,
          productId: product.id,
          qty: -used,
          unitCost: round2(material.cost),
          value: round2(-used * (Number(material.cost) || 0)),
          type: 'sale_bom',
          referenceType: ref.referenceType || 'sale',
          referenceId: ref.referenceId || null,
          referenceNumber: ref.referenceNumber || '',
          note: `صرف وصفة ${product.name} — ${ref.referenceNumber || ''}`
        });
      });
    } else {
      const material = materialFor(next, product.id);
      if ((Number(material.stock) || 0) + 1e-9 < qty) {
        throw new Error(`INSUFFICIENT_STOCK:${material.name || product.id}`);
      }
      material.stock = round2((Number(material.stock) || 0) - qty);
      moves.push({
        materialId: material.id,
        productId: product.id,
        qty: -qty,
        unitCost: round2(material.cost),
        value: round2(-qty * (Number(material.cost) || 0)),
        type: 'sale',
        referenceType: ref.referenceType || 'sale',
        referenceId: ref.referenceId || null,
        referenceNumber: ref.referenceNumber || '',
        note: `بيع ${product.name} — ${ref.referenceNumber || ''}`
      });
    }
  });

  return { materials: next, moves };
}

export function restore(items, products, materials, ref = {}) {
  const next = cloneMaterials(materials);
  const moves = [];

  (items || []).forEach((item) => {
    const product = productFor(products, item.productId);
    const qty = Number(item.qty) || 0;
    if (qty <= 0) throw new Error(`INVALID_QTY:${item.productId}`);

    if (product.type === 'menu' || product.recipe) {
      (product.recipe || []).forEach((line) => {
        const material = materialFor(next, line.materialId);
        const restored = round2((Number(line.qty) || 0) * qty);
        material.stock = round2((Number(material.stock) || 0) + restored);
        moves.push({
          materialId: line.materialId,
          productId: product.id,
          qty: restored,
          unitCost: round2(material.cost),
          value: round2(restored * (Number(material.cost) || 0)),
          type: 'sale_return_bom',
          referenceType: ref.referenceType || 'sale_return',
          referenceId: ref.referenceId || null,
          referenceNumber: ref.referenceNumber || '',
          note: `استرجاع وصفة ${product.name} — ${ref.referenceNumber || ''}`
        });
      });
    } else {
      const material = materialFor(next, product.id);
      material.stock = round2((Number(material.stock) || 0) + qty);
      moves.push({
        materialId: material.id,
        productId: product.id,
        qty,
        unitCost: round2(material.cost),
        value: round2(qty * (Number(material.cost) || 0)),
        type: 'sale_return',
        referenceType: ref.referenceType || 'sale_return',
        referenceId: ref.referenceId || null,
        referenceNumber: ref.referenceNumber || '',
        note: `استرجاع ${product.name} — ${ref.referenceNumber || ''}`
      });
    }
  });

  return { materials: next, moves };
}

export function recordWaste(materials, materialId, qty, reason = '', ref = {}) {
  const next = cloneMaterials(materials);
  const material = materialFor(next, materialId);
  const amount = round2(qty);
  if (!(amount > 0)) throw new Error('WASTE_QTY_INVALID');
  if ((Number(material.stock) || 0) + 1e-9 < amount) throw new Error(`INSUFFICIENT_STOCK:${material.name}`);

  material.stock = round2((Number(material.stock) || 0) - amount);
  return {
    materials: next,
    move: {
      materialId,
      qty: -amount,
      unitCost: round2(material.cost),
      value: round2(-amount * (Number(material.cost) || 0)),
      type: 'waste',
      referenceType: 'waste',
      referenceId: ref.id || null,
      referenceNumber: ref.number || '',
      note: reason || 'فاقد / هالك'
    }
  };
}

export function adjustStock(materials, materialId, newQty, reason = '', ref = {}) {
  const next = cloneMaterials(materials);
  const material = materialFor(next, materialId);
  const target = round2(newQty);
  if (target < 0) throw new Error('STOCK_NEGATIVE');
  const delta = round2(target - (Number(material.stock) || 0));
  material.stock = target;
  return {
    materials: next,
    move: {
      materialId,
      qty: delta,
      unitCost: round2(material.cost),
      value: round2(delta * (Number(material.cost) || 0)),
      type: 'adjustment',
      referenceType: 'adjustment',
      referenceId: ref.id || null,
      referenceNumber: ref.number || '',
      note: reason || 'تسوية مخزون'
    }
  };
}

export function valuation(materials) {
  return round2(sum(Object.values(materials || {}), (material) => (Number(material.stock) || 0) * (Number(material.cost) || 0)));
}
