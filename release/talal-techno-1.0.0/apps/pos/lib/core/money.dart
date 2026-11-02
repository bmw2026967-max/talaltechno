import 'package:intl/intl.dart';

double round2(num value) => (value * 100).roundToDouble() / 100;

final NumberFormat _sarFormat = NumberFormat.currency(
  locale: 'ar_SA',
  symbol: 'ر.س',
  decimalDigits: 2,
);

String sar(num value) => _sarFormat.format(round2(value));

final NumberFormat _numberFormat = NumberFormat.decimalPattern('ar_SA');

String arNumber(num value) => _numberFormat.format(value);
