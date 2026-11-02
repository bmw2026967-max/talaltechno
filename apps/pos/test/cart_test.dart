import 'package:flutter_test/flutter_test.dart';
import 'package:talaltechno_pos/data/models.dart';
import 'package:talaltechno_pos/domain/cart.dart';

Product product({
  String id = 'p1',
  double price = 32,
  double taxRate = 15,
  bool available = true,
}) {
  return Product(
    id: id,
    name: 'كبسة دجاج',
    price: price,
    taxRate: taxRate,
    category: 'الأطباق الرئيسية',
    available: available,
    stock: 10,
  );
}

void main() {
  group('Cart', () {
    test('computes subtotal, VAT and total', () {
      final cart = Cart()..add(product());
      expect(cart.count, 1);
      expect(cart.subtotal, 32);
      expect(cart.tax, 4.8);
      expect(cart.total, 36.8);
    });

    test('increments and removes lines', () {
      final cart = Cart()..add(product());
      cart.increment('p1');
      expect(cart.count, 2);
      expect(cart.total, 73.6);
      cart.increment('p1', -1);
      expect(cart.count, 1);
      cart.increment('p1', -1);
      expect(cart.isEmpty, isTrue);
    });

    test('ignores unavailable products', () {
      final cart = Cart()..add(product(available: false));
      expect(cart.isEmpty, isTrue);
    });

    test('builds API items with product price', () {
      final cart = Cart()..add(product(price: 12, taxRate: 15));
      final items = cart.toApiItems();
      expect(items, hasLength(1));
      expect(items.first['productId'], 'p1');
      expect(items.first['qty'], 1);
      expect(items.first['price'], 12);
    });

    test('builds sale items with tax per line', () {
      final cart = Cart()
        ..add(product(price: 10, taxRate: 15))
        ..add(product(id: 'p2', price: 20, taxRate: 15));
      final items = cart.toSaleItems();
      expect(items, hasLength(2));
      expect(items.first.total, 11.5);
      expect(items.last.total, 23);
    });
  });
}
