import 'dart:convert';
import 'dart:math';

import 'package:sqflite/sqflite.dart';

import '../core/config.dart';
import '../core/money.dart';
import '../domain/cart.dart';
import 'local_database.dart';
import 'models.dart';

class PosRepository {
  PosRepository._();

  static final PosRepository instance = PosRepository._();

  final LocalDatabase _local = LocalDatabase.instance;
  final Random _random = Random.secure();

  Future<Database> get _db => _local.database;

  Future<void> initialize() async {
    await _local.database;
    await _local.seedIfEmpty();
    await deviceId();
  }

  String _newId(String prefix) {
    return '$prefix-${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(9999)}';
  }

  String _now() => DateTime.now().toUtc().toIso8601String();

  Future<List<Product>> products() async {
    final db = await _db;
    final rows = await db.query(
      'products',
      orderBy: 'category ASC, name ASC',
    );
    return rows.map(Product.fromMap).toList(growable: false);
  }

  Future<List<String>> categories() async {
    final rows = await products();
    final unique = <String>{};
    for (final product in rows) {
      unique.add(product.category);
    }
    return unique.toList(growable: false);
  }

  Future<Sale> createSale({
    required Cart cart,
    required String paymentMethod,
    String orderType = 'takeaway',
    String? shiftId,
    String? notes,
  }) async {
    if (cart.isEmpty) {
      throw StateError('السلة فارغة — أضف صنفاً واحداً على الأقل.');
    }

    final db = await _db;
    final createdAt = _now();
    final saleId = _newId('sale');
    final number = 'POS-${DateTime.now().millisecondsSinceEpoch}';
    final items = cart.toSaleItems();
    final subtotal = cart.subtotal;
    final tax = cart.tax;
    final total = cart.total;

    final payload = <String, Object?>{
      'items': cart.toApiItems(),
      'payments': [
        {'method': paymentMethod, 'amount': total},
      ],
      'orderType': orderType,
      'source': 'pos',
      'notes': notes,
      'clientSaleId': saleId,
      'clientCreatedAt': createdAt,
      if (shiftId != null) 'shiftId': shiftId,
    };

    await db.transaction((txn) async {
      await txn.insert('sales', {
        'id': saleId,
        'number': number,
        'subtotal': subtotal,
        'tax': tax,
        'total': total,
        'payment_method': paymentMethod,
        'order_type': orderType,
        'shift_id': shiftId,
        'notes': notes,
        'created_at': createdAt,
        'synced': 0,
      });

      for (final item in items) {
        await txn.insert('sale_items', {
          'sale_id': saleId,
          'product_id': item.productId,
          'name': item.name,
          'qty': item.qty,
          'price': item.price,
          'tax_rate': item.taxRate,
        });
        await txn.rawUpdate(
          'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?',
          [item.qty, item.productId],
        );
      }

      await txn.insert('outbox', {
        'id': _newId('outbox'),
        'entity': 'sale',
        'action': 'sale.create',
        'entity_id': saleId,
        'payload': jsonEncode(payload),
        'attempts': 0,
        'created_at': createdAt,
      });
    });

    return Sale(
      id: saleId,
      number: number,
      subtotal: subtotal,
      tax: tax,
      total: total,
      paymentMethod: paymentMethod,
      orderType: orderType,
      createdAt: createdAt,
      items: items,
      shiftId: shiftId,
    );
  }

  Future<ShiftRecord?> currentShift() async {
    final db = await _db;
    final rows = await db.query(
      'shifts',
      where: 'status = ?',
      whereArgs: ['open'],
      orderBy: 'opened_at DESC',
      limit: 1,
    );
    return rows.isEmpty ? null : ShiftRecord.fromMap(rows.first);
  }

  Future<List<ShiftRecord>> shifts({int limit = 30}) async {
    final db = await _db;
    final rows = await db.query('shifts', orderBy: 'opened_at DESC', limit: limit);
    return rows.map(ShiftRecord.fromMap).toList(growable: false);
  }

  Future<ShiftRecord> openShift(double openingCash, {String? notes}) async {
    final existing = await currentShift();
    if (existing != null) {
      throw StateError('توجد وردية مفتوحة بالفعل (${existing.id}). أغلقها أولاً.');
    }
    final db = await _db;
    final id = _newId('shift');
    final openedAt = _now();
    final payload = {
      'openingCash': round2(openingCash),
      'notes': notes,
      'clientShiftId': id,
      'clientOpenedAt': openedAt,
    };

    await db.transaction((txn) async {
      await txn.insert('shifts', {
        'id': id,
        'opening_cash': round2(openingCash),
        'status': 'open',
        'opened_at': openedAt,
        'notes': notes,
        'synced': 0,
      });
      await txn.insert('outbox', {
        'id': _newId('outbox'),
        'entity': 'shift',
        'action': 'shift.open',
        'entity_id': id,
        'payload': jsonEncode(payload),
        'attempts': 0,
        'created_at': openedAt,
      });
    });

    return ShiftRecord(
      id: id,
      openingCash: round2(openingCash),
      status: 'open',
      openedAt: openedAt,
    );
  }

  Future<ShiftRecord> closeShift(
    String shiftId,
    double countedCash, {
    String? notes,
  }) async {
    final db = await _db;
    final rows = await db.query('shifts', where: 'id = ?', whereArgs: [shiftId], limit: 1);
    if (rows.isEmpty) throw StateError('الوردية غير موجودة محلياً.');
    final shift = ShiftRecord.fromMap(rows.first);
    if (!shift.isOpen) throw StateError('الوردية مغلقة بالفعل.');

    final cashRows = await db.rawQuery(
      "SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE shift_id = ? AND payment_method = 'cash'",
      [shiftId],
    );
    final cashSales = (cashRows.first['total'] as num?)?.toDouble() ?? 0;
    final expected = round2(shift.openingCash + cashSales);
    final counted = round2(countedCash);
    final variance = round2(counted - expected);
    final closedAt = _now();
    final payload = {
      'clientShiftId': shiftId,
      'countedCash': counted,
      'notes': notes,
    };

    await db.transaction((txn) async {
      final update = <String, Object?>{
        'counted_cash': counted,
        'expected_cash': expected,
        'variance': variance,
        'status': 'closed',
        'closed_at': closedAt,
      };
      if (notes != null) update['notes'] = notes;
      await txn.update(
        'shifts',
        update,
        where: 'id = ?',
        whereArgs: [shiftId],
      );
      await txn.insert('outbox', {
        'id': _newId('outbox'),
        'entity': 'shift',
        'action': 'shift.close',
        'entity_id': shiftId,
        'payload': jsonEncode(payload),
        'attempts': 0,
        'created_at': closedAt,
      });
    });

    return ShiftRecord(
      id: shift.id,
      openingCash: shift.openingCash,
      countedCash: counted,
      expectedCash: expected,
      variance: variance,
      status: 'closed',
      openedAt: shift.openedAt,
      closedAt: closedAt,
      serverId: shift.serverId,
    );
  }

  Future<int> pendingCount() async {
    final db = await _db;
    return Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM outbox WHERE synced_at IS NULL'),
        ) ??
        0;
  }

  Future<int> unsyncedSalesCount() async {
    final db = await _db;
    return Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM sales WHERE synced = 0'),
        ) ??
        0;
  }

  Future<List<OutboxOperation>> pendingOutbox() async {
    final db = await _db;
    final rows = await db.query(
      'outbox',
      where: 'synced_at IS NULL',
      orderBy: 'created_at ASC',
    );
    return rows.map(OutboxOperation.fromMap).toList(growable: false);
  }

  Future<void> markOutboxSynced(String outboxId, {String? serverId}) async {
    final db = await _db;
    final syncedAt = _now();
    await db.transaction((txn) async {
      final rows = await txn.query(
        'outbox',
        columns: ['entity', 'entity_id'],
        where: 'id = ?',
        whereArgs: [outboxId],
        limit: 1,
      );
      await txn.update(
        'outbox',
        {'synced_at': syncedAt, 'last_error': null},
        where: 'id = ?',
        whereArgs: [outboxId],
      );
      if (rows.isEmpty) return;
      final entity = rows.first['entity'] as String?;
      final entityId = rows.first['entity_id'] as String?;
      if (entity == 'sale' && entityId != null) {
        await txn.update(
          'sales',
          {'synced': 1, if (serverId != null) 'server_id': serverId},
          where: 'id = ?',
          whereArgs: [entityId],
        );
      }
      if (entity == 'shift' && entityId != null) {
        await txn.update(
          'shifts',
          {'synced': 1, if (serverId != null) 'server_id': serverId},
          where: 'id = ?',
          whereArgs: [entityId],
        );
      }
    });
  }

  Future<void> recordOutboxFailure(String outboxId, String error) async {
    final db = await _db;
    await db.rawUpdate(
      'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
      [error.length > 500 ? error.substring(0, 500) : error, outboxId],
    );
  }

  Future<String?> serverShiftId(String localShiftId) async {
    final db = await _db;
    final rows = await db.query(
      'shifts',
      columns: ['server_id'],
      where: 'id = ?',
      whereArgs: [localShiftId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return rows.first['server_id'] as String?;
  }

  Future<void> upsertProducts(List<dynamic> rows) async {
    if (rows.isEmpty) return;
    final db = await _db;
    await db.transaction((txn) async {
      for (final raw in rows) {
        if (raw is! Map) continue;
        final row = raw.map((key, value) => MapEntry(key.toString(), value));
        if (row['type'] != 'menu') continue;
        final id = row['id']?.toString();
        final name = row['name']?.toString();
        if (id == null || name == null) continue;
        await txn.insert(
          'products',
          {
            'id': id,
            'name': name,
            'name_en': row['nameEn']?.toString() ?? '',
            'price': (row['price'] as num?)?.toDouble() ?? 0,
            'tax_rate': (row['taxRate'] as num?)?.toDouble() ?? 15,
            'category': row['categoryName']?.toString() ?? 'أخرى',
            'emoji': row['emoji']?.toString() ?? '🍽️',
            'available': row['available'] == true ? 1 : 0,
            'stock': (row['stock'] as num?)?.toDouble() ?? 0,
            'updated_at': row['updatedAt']?.toString() ?? _now(),
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    });
  }

  Future<String> deviceId() async {
    final existing = await getSetting(AppConfig.deviceIdKey);
    if (existing != null && existing.isNotEmpty) return existing;
    final id = 'POS-${DateTime.now().millisecondsSinceEpoch}-${_random.nextInt(999)}';
    await saveSetting(AppConfig.deviceIdKey, id);
    return id;
  }

  Future<String> apiBaseUrl() async {
    final saved = await getSetting(AppConfig.apiUrlKey);
    if (saved != null && saved.trim().isNotEmpty) return saved.trim();
    return AppConfig.apiBaseUrl;
  }

  Future<String?> getSetting(String key) async {
    final db = await _db;
    final rows = await db.query(
      'app_settings',
      columns: ['value'],
      where: 'key = ?',
      whereArgs: [key],
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first['value'] as String?;
  }

  Future<void> saveSetting(String key, String? value) async {
    final db = await _db;
    await db.insert(
      'app_settings',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<void> clearSession() async {
    await saveSetting(AppConfig.tokenKey, null);
    await saveSetting(AppConfig.userKey, null);
  }

  Future<void> resetTransactionalData() async {
    final db = await _db;
    await db.transaction((txn) async {
      await txn.delete('sale_items');
      await txn.delete('sales');
      await txn.delete('outbox');
      await txn.delete('shifts');
    });
  }
}
