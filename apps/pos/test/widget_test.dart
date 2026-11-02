import 'package:flutter_test/flutter_test.dart';
import 'package:talaltechno_pos/core/money.dart';
import 'package:talaltechno_pos/services/printer_service.dart';

void main() {
  test('round2 keeps two decimal places', () {
    expect(round2(10.456), 10.46);
    expect(round2(10.454), 10.45);
    expect(round2(0), 0);
  });

  test('EscPosBuilder wraps commands correctly', () {
    final bytes = (EscPosBuilder()
          ..init()
          ..line('طلال تكنو')
          ..cut())
        .build();

    expect(bytes.take(2).toList(), [0x1B, 0x40]);
    expect(bytes.skip(bytes.length - 3).toList(), [0x1D, 0x56, 0x00]);
  });

  test('mock printer records a receipt', () async {
    final transport = MockPrinterTransport();
    final printer = ReceiptPrinter(transport: transport);

    await printer.printTest();

    expect(transport.writes, 1);
    expect(transport.lastReceipt, contains('طلال تكنو'));
    expect(transport.lastReceipt, contains('ESC/POS'));
  });
}
