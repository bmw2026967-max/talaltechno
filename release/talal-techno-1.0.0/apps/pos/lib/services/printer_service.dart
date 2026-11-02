import 'dart:convert';

import '../core/money.dart';
import '../data/models.dart';

/// Transport abstraction so a real Bluetooth/USB ESC/POS printer can be added
/// without changing receipt layout code. The default is always a mock.
abstract class PrinterTransport {
  String get name;

  Future<void> write(List<int> bytes);
}

class MockPrinterTransport implements PrinterTransport {
  final List<String> receipts = [];
  int writes = 0;
  String? lastReceipt;

  @override
  String get name => 'Mock ESC/POS';

  @override
  Future<void> write(List<int> bytes) async {
    writes += 1;
    final text = utf8
        .decode(bytes, allowMalformed: true)
        .replaceAll(RegExp(r'[\x00-\x09\x0B-\x1F]'), '');
    lastReceipt = text;
    receipts.add(text);
  }
}

class EscPosBuilder {
  final List<int> _buffer = [];

  void init() => _buffer.addAll([0x1B, 0x40]);
  void alignLeft() => _buffer.addAll([0x1B, 0x61, 0]);
  void alignCenter() => _buffer.addAll([0x1B, 0x61, 1]);
  void alignRight() => _buffer.addAll([0x1B, 0x61, 2]);
  void bold(bool enabled) => _buffer.addAll([0x1B, 0x45, enabled ? 1 : 0]);

  void text(String value) => _buffer.addAll(utf8.encode(value));

  void line([String value = '']) {
    text(value);
    _buffer.add(0x0A);
  }

  void separator({String character = '-', int width = 42}) {
    line(List.filled(width, character).join());
  }

  void feed([int lines = 1]) => _buffer.addAll(List.filled(lines, 0x0A));

  void cut() => _buffer.addAll([0x1D, 0x56, 0x00]);

  List<int> build() => List.unmodifiable(_buffer);
}

class ReceiptPrinter {
  ReceiptPrinter({PrinterTransport? transport})
      : transport = transport ?? MockPrinterTransport();

  final PrinterTransport transport;

  static const Map<String, String> _methods = {
    'cash': 'نقدي',
    'mada': 'مدى',
    'applepay': 'Apple Pay',
    'stcpay': 'STC Pay',
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'card': 'شبكة',
    'bank': 'تحويل بنكي',
    'credit': 'آجل',
    'wallet': 'محفظة',
  };

  Future<List<int>> printSale(Sale sale) async {
    final builder = EscPosBuilder()
      ..init()
      ..alignCenter()
      ..bold(true)
      ..line('طلال تكنو')
      ..bold(false)
      ..line('TALAL TECHNO · CLOUD ERP + POS')
      ..line('فاتورة تجريبية — Sandbox')
      ..separator()
      ..alignLeft()
      ..line('رقم الفاتورة: ${sale.number}')
      ..line('التاريخ: ${sale.createdAt}')
      ..line('طريقة الدفع: ${_methods[sale.paymentMethod] ?? sale.paymentMethod}')
      ..line('نوع الطلب: ${sale.orderType}')
      ..separator();

    for (final item in sale.items) {
      builder.line('${item.name} × ${item.qty}');
      builder.line('  ${sar(item.total)}');
    }

    builder
      ..separator()
      ..line('قبل الضريبة: ${sar(sale.subtotal)}')
      ..line('ضريبة القيمة المضافة: ${sar(sale.tax)}')
      ..bold(true)
      ..line('الإجمالي: ${sar(sale.total)}')
      ..bold(false)
      ..feed(2)
      ..alignCenter()
      ..line('شكراً لزيارتكم')
      ..line('هذه طباعة تجريبية — Mock Printer')
      ..feed(3)
      ..cut();

    final bytes = builder.build();
    await transport.write(bytes);
    return bytes;
  }

  Future<List<int>> printTest() async {
    final builder = EscPosBuilder()
      ..init()
      ..alignCenter()
      ..bold(true)
      ..line('طلال تكنو')
      ..bold(false)
      ..line('اختبار طابعة ESC/POS تجريبية')
      ..separator()
      ..line('الطابعة: ${transport.name}')
      ..line('الوقت: ${DateTime.now().toIso8601String()}')
      ..feed(3)
      ..cut();
    final bytes = builder.build();
    await transport.write(bytes);
    return bytes;
  }
}
