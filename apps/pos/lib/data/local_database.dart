import 'dart:io';

import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'models.dart';

/// Local SQLite database for the offline-first POS.
///
/// WAL mode keeps reads available while a sale is being committed. Every
/// business write also inserts an outbox row in the same transaction, so a
/// crash cannot lose a sale between "saved locally" and "queued for sync".
class LocalDatabase {
  LocalDatabase._();

  static final LocalDatabase instance = LocalDatabase._();

  Database? _database;

  Future<Database> get database async {
    final existing = _database;
    if (existing != null) return existing;
    final opened = await _open();
    _database = opened;
    return opened;
  }

  Future<Database> _open() async {
    // sqflite ships with Android/iOS/macOS implementations. Windows and Linux
    // use the FFI implementation backed by the bundled SQLite library.
    if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }
    final directory = await databaseFactory.getDatabasesPath();
    final path = p.join(directory, 'talaltechno_pos.db');
    return databaseFactory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
      onConfigure: (db) async {
        await db.rawQuery('PRAGMA journal_mode=WAL');
        await db.execute('PRAGMA foreign_keys = ON');
      },
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_en TEXT NOT NULL DEFAULT '',
            price REAL NOT NULL DEFAULT 0,
            tax_rate REAL NOT NULL DEFAULT 15,
            category TEXT NOT NULL DEFAULT 'أخرى',
            emoji TEXT NOT NULL DEFAULT '🍽️',
            available INTEGER NOT NULL DEFAULT 1,
            stock REAL NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE sales (
            id TEXT PRIMARY KEY,
            number TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            order_type TEXT NOT NULL DEFAULT 'takeaway',
            shift_id TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0,
            server_id TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            name TEXT NOT NULL,
            qty REAL NOT NULL,
            price REAL NOT NULL,
            tax_rate REAL NOT NULL DEFAULT 15,
            FOREIGN KEY (sale_id) REFERENCES sales (id) ON DELETE CASCADE
          )
        ''');
        await db.execute('''
          CREATE TABLE outbox (
            id TEXT PRIMARY KEY,
            entity TEXT NOT NULL,
            action TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            created_at TEXT NOT NULL,
            synced_at TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE shifts (
            id TEXT PRIMARY KEY,
            opening_cash REAL NOT NULL,
            counted_cash REAL,
            expected_cash REAL,
            variance REAL,
            status TEXT NOT NULL DEFAULT 'open',
            opened_at TEXT NOT NULL,
            closed_at TEXT,
            notes TEXT,
            synced INTEGER NOT NULL DEFAULT 0,
            server_id TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        ''');
        await db.execute('''
          CREATE TABLE sync_state (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        ''');
        await db.execute('CREATE INDEX idx_sales_created ON sales (created_at)');
        await db.execute('CREATE INDEX idx_sales_shift ON sales (shift_id)');
        await db.execute('CREATE INDEX idx_outbox_synced ON outbox (synced_at)');
        await db.execute('CREATE INDEX idx_sale_items_sale ON sale_items (sale_id)');
        },
      ),
    );
  }

  Future<void> seedIfEmpty() async {
    final db = await database;
    final count = Sqflite.firstIntValue(
      await db.rawQuery('SELECT COUNT(*) FROM products'),
    );
    if ((count ?? 0) > 0) return;
    await db.transaction((txn) async {
      final batch = txn.batch();
      final now = DateTime.now().toUtc().toIso8601String();
      for (final product in _demoProducts) {
        batch.insert('products', {
          ...product.toMap(),
          'updated_at': now,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
      await batch.commit(noResult: true);
    });
  }

  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
      _database = null;
    }
  }
}

const List<Product> _demoProducts = [
  Product(
    id: 'p1',
    name: 'كبسة دجاج',
    nameEn: 'Chicken Kabsa',
    price: 32,
    taxRate: 15,
    category: 'الأطباق الرئيسية',
    emoji: '🍛',
    stock: 26,
  ),
  Product(
    id: 'p2',
    name: 'مندي لحم',
    nameEn: 'Lamb Mandi',
    price: 48,
    taxRate: 15,
    category: 'الأطباق الرئيسية',
    emoji: '🍖',
    stock: 18,
  ),
  Product(
    id: 'p3',
    name: 'برياني دجاج',
    nameEn: 'Chicken Biryani',
    price: 34,
    taxRate: 15,
    category: 'الأطباق الرئيسية',
    emoji: '🍚',
    stock: 21,
  ),
  Product(
    id: 'p4',
    name: 'شيش طاووق',
    nameEn: 'Shish Tawook',
    price: 38,
    taxRate: 15,
    category: 'المشاوي',
    emoji: '🍢',
    stock: 32,
  ),
  Product(
    id: 'p5',
    name: 'كباب لحم',
    nameEn: 'Lamb Kebab',
    price: 42,
    taxRate: 15,
    category: 'المشاوي',
    emoji: '🥩',
    stock: 14,
  ),
  Product(
    id: 'p6',
    name: 'حمص بالطحينة',
    nameEn: 'Hummus',
    price: 18,
    taxRate: 15,
    category: 'المقبلات',
    emoji: '🥣',
    stock: 44,
  ),
  Product(
    id: 'p7',
    name: 'سلطة فتوش',
    nameEn: 'Fattoush',
    price: 20,
    taxRate: 15,
    category: 'المقبلات',
    emoji: '🥗',
    stock: 30,
  ),
  Product(
    id: 'p8',
    name: 'عصير ليمون بالنعناع',
    nameEn: 'Lemon Mint',
    price: 12,
    taxRate: 15,
    category: 'المشروبات',
    emoji: '🍹',
    stock: 96,
  ),
  Product(
    id: 'p9',
    name: 'قهوة سعودية',
    nameEn: 'Saudi Coffee',
    price: 8,
    taxRate: 15,
    category: 'المشروبات',
    emoji: '☕',
    stock: 48,
  ),
  Product(
    id: 'p10',
    name: 'كنافة بالجبن',
    nameEn: 'Cheese Kunafa',
    price: 24,
    taxRate: 15,
    category: 'الحلويات',
    emoji: '🍰',
    stock: 22,
  ),
];
