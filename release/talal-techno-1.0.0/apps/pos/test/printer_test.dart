import 'package:flutter_test/flutter_test.dart';
import 'package:talaltechno_pos/data/models.dart';
import 'package:talaltechno_pos/services/printer_service.dart';

void main() {
  group('ESC/POS mock printer', () {
    test('builds an ESC/POS receipt and writes it to the mock transport', () async {
      final transport = MockPrinterTransport();
      final printer = ReceiptPrinter(transport: transport);
      final sale = Sale(
        id: 'sale-1',
        number: 'POS-1001',
        subtotal: 32,
        tax: 4.8,
        total: 36.8,
        paymentMethod: 'cash',
        orderType: 'takeaway',
        createdAt: '2026-10-27T12:00:00.000Z',
        items: const [
          SaleItem(
            productId: 'p1',
            name: 'كبسة دجاج',
            qty: 1,
            price: 32,
            taxRate: 15,
          ),
        ],
      );

      final bytes = await printer.printSale(sale);

      expect(bytes, isNotEmpty);
      expect(bytes.first, 0x1B);
      expect(transport.writes, 1);
      expect(transport.lastReceipt, contains('طلال تكنو'));
      expect(transport.lastReceipt, contains('TALAL TECHNO'));
      expect(transport.lastReceipt, contains('POS-1001'));
      expect(transport.lastReceipt, contains('Mock Printer'));
    });

    test('builder emits init, alignment and cut commands', () {
      final builder = EscPosBuilder()
        ..init()
        ..alignCenter()
        ..line('اختبار')
        ..cut();
      final bytes = builder.build();
      expect(bytes.take(2), [0x1B, 0x40]);
      expect(bytes, contains(0x1D));
      expect(bytes, contains(0x56));
    });
  });
}
