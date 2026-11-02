import 'core/money.dart';

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.taxRate,
    required this.category,
    this.nameEn = '',
    this.emoji = '🍽️',
    this.available = true,
    this.stock = 0,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String nameEn;
  final double price;
  final double taxRate;
  final String category;
  final String emoji;
  final bool available;
  final double stock;
  final String? updatedAt;

  bool get canSell => available;

  factory Product.fromMap(Map<String, Object?> map) {
    return Product(
      id: map['id'] as String,
      name: (map['name'] ?? '') as String,
      nameEn: (map['name_en'] ?? '') as String,
      price: (map['price'] as num?)?.toDouble() ?? 0,
      taxRate: (map['tax_rate'] as num?)?.toDouble() ?? 15,
      category: (map['category'] ?? 'أخرى') as String,
      emoji: (map['emoji'] ?? '🍽️') as String,
      available: ((map['available'] as num?)?.toInt() ?? 1) == 1,
      stock: (map['stock'] as num?)?.toDouble() ?? 0,
      updatedAt: map['updated_at'] as String?,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'name': name,
      'name_en': nameEn,
      'price': price,
      'tax_rate': taxRate,
      'category': category,
      'emoji': emoji,
      'available': available ? 1 : 0,
      'stock': stock,
      'updated_at': updatedAt ?? DateTime.now().toUtc().toIso8601String(),
    };
  }

  Product copyWith({double? stock, bool? available}) {
    return Product(
      id: id,
      name: name,
      nameEn: nameEn,
      price: price,
      taxRate: taxRate,
      category: category,
      emoji: emoji,
      available: available ?? this.available,
      stock: stock ?? this.stock,
      updatedAt: updatedAt,
    );
  }
}

class SaleItem {
  const SaleItem({
    required this.productId,
    required this.name,
    required this.qty,
    required this.price,
    required this.taxRate,
  });

  final String productId;
  final String name;
  final double qty;
  final double price;
  final double taxRate;

  double get subtotal => round2(price * qty);
  double get tax => round2(subtotal * taxRate / 100);
  double get total => round2(subtotal + tax);

  factory SaleItem.fromMap(Map<String, Object?> map) {
    return SaleItem(
      productId: map['product_id'] as String,
      name: map['name'] as String,
      qty: (map['qty'] as num).toDouble(),
      price: (map['price'] as num).toDouble(),
      taxRate: (map['tax_rate'] as num?)?.toDouble() ?? 15,
    );
  }
}

class Sale {
  const Sale({
    required this.id,
    required this.number,
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.paymentMethod,
    required this.orderType,
    required this.createdAt,
    required this.items,
    this.shiftId,
    this.synced = false,
    this.serverId,
  });

  final String id;
  final String number;
  final double subtotal;
  final double tax;
  final double total;
  final String paymentMethod;
  final String orderType;
  final String createdAt;
  final List<SaleItem> items;
  final String? shiftId;
  final bool synced;
  final String? serverId;

  factory Sale.fromMap(
    Map<String, Object?> map, {
    List<SaleItem> items = const [],
  }) {
    return Sale(
      id: map['id'] as String,
      number: map['number'] as String,
      subtotal: (map['subtotal'] as num).toDouble(),
      tax: (map['tax'] as num).toDouble(),
      total: (map['total'] as num).toDouble(),
      paymentMethod: map['payment_method'] as String,
      orderType: (map['order_type'] ?? 'takeaway') as String,
      createdAt: map['created_at'] as String,
      shiftId: map['shift_id'] as String?,
      synced: ((map['synced'] as num?)?.toInt() ?? 0) == 1,
      serverId: map['server_id'] as String?,
      items: items,
    );
  }
}

class OutboxOperation {
  const OutboxOperation({
    required this.id,
    required this.entity,
    required this.action,
    required this.entityId,
    required this.payload,
    required this.attempts,
    required this.createdAt,
    this.lastError,
  });

  final String id;
  final String entity;
  final String action;
  final String entityId;
  final String payload;
  final int attempts;
  final String? lastError;
  final String createdAt;

  factory OutboxOperation.fromMap(Map<String, Object?> map) {
    return OutboxOperation(
      id: map['id'] as String,
      entity: map['entity'] as String,
      action: map['action'] as String,
      entityId: (map['entity_id'] ?? '') as String,
      payload: (map['payload'] ?? '{}') as String,
      attempts: ((map['attempts'] as num?)?.toInt() ?? 0),
      lastError: map['last_error'] as String?,
      createdAt: map['created_at'] as String,
    );
  }
}

class ShiftRecord {
  const ShiftRecord({
    required this.id,
    required this.openingCash,
    required this.status,
    required this.openedAt,
    this.countedCash,
    this.expectedCash,
    this.variance,
    this.closedAt,
    this.synced = false,
    this.serverId,
  });

  final String id;
  final double openingCash;
  final String status;
  final String openedAt;
  final double? countedCash;
  final double? expectedCash;
  final double? variance;
  final String? closedAt;
  final bool synced;
  final String? serverId;

  bool get isOpen => status == 'open';

  factory ShiftRecord.fromMap(Map<String, Object?> map) {
    return ShiftRecord(
      id: map['id'] as String,
      openingCash: (map['opening_cash'] as num?)?.toDouble() ?? 0,
      countedCash: (map['counted_cash'] as num?)?.toDouble(),
      expectedCash: (map['expected_cash'] as num?)?.toDouble(),
      variance: (map['variance'] as num?)?.toDouble(),
      status: (map['status'] ?? 'open') as String,
      openedAt: map['opened_at'] as String,
      closedAt: map['closed_at'] as String?,
      synced: ((map['synced'] as num?)?.toInt() ?? 0) == 1,
      serverId: map['server_id'] as String?,
    );
  }
}
