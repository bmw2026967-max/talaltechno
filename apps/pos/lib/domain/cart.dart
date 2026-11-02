import '../core/money.dart';
import '../data/models.dart';

class CartLine {
  CartLine({required this.product, this.qty = 1});

  final Product product;
  int qty;

  double get subtotal => round2(product.price * qty);
  double get tax => round2(subtotal * product.taxRate / 100);
  double get total => round2(subtotal + tax);
}

/// Pure, testable cart used by the POS screen and unit tests.
class Cart {
  final Map<String, CartLine> _lines = {};

  List<CartLine> get lines => List.unmodifiable(_lines.values);

  bool get isEmpty => _lines.isEmpty;
  bool get isNotEmpty => _lines.isNotEmpty;

  int get count => _lines.values.fold(0, (total, line) => total + line.qty);

  double get subtotal =>
      round2(_lines.values.fold(0.0, (total, line) => total + line.subtotal));

  double get tax =>
      round2(_lines.values.fold(0.0, (total, line) => total + line.tax));

  double get total => round2(subtotal + tax);

  void add(Product product) {
    if (!product.canSell) return;
    final existing = _lines[product.id];
    if (existing == null) {
      _lines[product.id] = CartLine(product: product);
    } else {
      existing.qty += 1;
    }
  }

  void increment(String productId, [int delta = 1]) {
    final line = _lines[productId];
    if (line == null) return;
    line.qty += delta;
    if (line.qty <= 0) _lines.remove(productId);
  }

  void remove(String productId) => _lines.remove(productId);

  void clear() => _lines.clear();

  List<SaleItem> toSaleItems() {
    return _lines.values
        .map(
          (line) => SaleItem(
            productId: line.product.id,
            name: line.product.name,
            qty: line.qty.toDouble(),
            price: line.product.price,
            taxRate: line.product.taxRate,
          ),
        )
        .toList(growable: false);
  }

  /// Payload accepted by `POST /sales` in the NestJS API.
  List<Map<String, Object?>> toApiItems() {
    return _lines.values
        .map(
          (line) => {
            'productId': line.product.id,
            'qty': line.qty,
            'price': line.product.price,
          },
        )
        .toList(growable: false);
  }
}
