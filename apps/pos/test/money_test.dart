import 'package:flutter_test/flutter_test.dart';
import 'package:talaltechno_pos/core/money.dart';

void main() {
  group('money helpers', () {
    test('rounds to two decimals', () {
      expect(round2(36.799999), 36.8);
      expect(round2(4.8), 4.8);
      expect(round2(0), 0);
    });

    test('formats SAR without throwing', () {
      expect(sar(36.8), contains('36'));
      expect(sar(0), isNotEmpty);
    });
  });
}
