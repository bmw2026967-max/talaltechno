import 'package:flutter/material.dart';

import '../../core/money.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/pos_repository.dart';
import '../../domain/cart.dart';
import '../../services/printer_service.dart';
import 'cart_sheet.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final PosRepository _repository = PosRepository.instance;
  final ReceiptPrinter _printer = ReceiptPrinter();
  final Cart _cart = Cart();

  late Future<List<Product>> _productsFuture;
  String _category = 'all';

  @override
  void initState() {
    super.initState();
    _productsFuture = _repository.products();
  }

  Future<void> _reload() async {
    if (!mounted) return;
    final future = _repository.products();
    setState(() => _productsFuture = future);
    await future;
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<Sale?> _checkout(String method) async {
    final shift = await _repository.currentShift();
    final sale = await _repository.createSale(
      cart: _cart,
      paymentMethod: method,
      orderType: 'takeaway',
      shiftId: shift?.id,
    );
    await _printer.printSale(sale);
    return sale;
  }

  Future<void> _openCart() async {
    if (_cart.isEmpty) return;
    final shift = await _repository.currentShift();
    if (shift == null && mounted) {
      _notify('تنبيه: لا توجد وردية مفتوحة — ستُسجل الفاتورة دون ربطها بوردية.');
    }
    if (!mounted) return;
    final sale = await showModalBottomSheet<Sale>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CartSheet(cart: _cart, onCheckout: _checkout),
    );
    if (sale == null) {
      if (mounted) setState(() {});
      return;
    }
    _cart.clear();
    await _reload();
    if (!mounted) return;
    _showSuccess(sale);
  }

  void _showSuccess(Sale sale) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Text('تم حفظ البيع'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('الفاتورة ${sale.number}', style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('الإجمالي: ${sar(sale.total)}'),
            const SizedBox(height: 4),
            const Text('تم حفظ العملية في SQLite وإضافتها لصندوق المزامنة.'),
            const SizedBox(height: 4),
            const Text(
              'طُبع إيصال ESC/POS تجريبي — لا توجد طابعة حقيقية متصلة.',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await _printer.printSale(sale);
              if (dialogContext.mounted) {
                Navigator.of(dialogContext).pop();
                _notify('تمت إعادة الطباعة التجريبية.');
              }
            },
            child: const Text('طباعة مجدداً'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('طلب جديد'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: FutureBuilder<List<Product>>(
            future: _productsFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _ErrorState(
                  message: snapshot.error.toString(),
                  onRetry: _reload,
                );
              }
              final products = snapshot.data ?? const <Product>[];
              final categories = <String>[
                'all',
                ...{for (final product in products) product.category},
              ];
              final filtered = _category == 'all'
                  ? products
                  : products.where((product) => product.category == _category).toList(growable: false);

              return Column(
                children: [
                  SizedBox(
                    height: 58,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      scrollDirection: Axis.horizontal,
                      itemCount: categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final value = categories[index];
                        final selected = _category == value;
                        return ChoiceChip(
                          label: Text(value == 'all' ? 'كل الأصناف' : value),
                          selected: selected,
                          onSelected: (_) => setState(() => _category = value),
                          selectedColor: brandGreen,
                          labelStyle: TextStyle(
                            color: selected ? Colors.white : brandGreen,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                          side: BorderSide(color: brandGreen.withValues(alpha: 0.18)),
                          backgroundColor: Colors.white,
                        );
                      },
                    ),
                  ),
                  Expanded(
                    child: filtered.isEmpty
                        ? const Center(child: Text('لا توجد أصناف في هذه الفئة.'))
                        : GridView.builder(
                            padding: const EdgeInsets.fromLTRB(14, 4, 14, 14),
                            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 210,
                              mainAxisSpacing: 10,
                              crossAxisSpacing: 10,
                              childAspectRatio: 0.80,
                            ),
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final product = filtered[index];
                              return _ProductCard(
                                product: product,
                                onTap: () {
                                  setState(() => _cart.add(product));
                                  _notify('أُضيف ${product.name} إلى السلة.');
                                },
                              );
                            },
                          ),
                  ),
                ],
              );
            },
          ),
        ),
        _CartBar(
          count: _cart.count,
          total: _cart.total,
          onOpen: _cart.isEmpty ? null : _openCart,
        ),
      ],
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: product.canSell ? onTap : null,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Container(
                  width: double.infinity,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: brandSand,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(product.emoji, style: const TextStyle(fontSize: 40)),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                product.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, height: 1.3),
              ),
              const SizedBox(height: 2),
              Text(
                product.stock > 0 ? 'المخزون: ${arNumber(product.stock)}' : 'متوفر',
                style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.5)),
              ),
              const SizedBox(height: 5),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      sar(product.price),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: brandGreen),
                    ),
                  ),
                  Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(color: brandGold, shape: BoxShape.circle),
                    child: const Icon(Icons.add, size: 18, color: brandDark),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CartBar extends StatelessWidget {
  const _CartBar({required this.count, required this.total, this.onOpen});

  final int count;
  final double total;
  final VoidCallback? onOpen;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: brandGreen.withValues(alpha: 0.10))),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: brandGreen.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.shopping_bag_outlined, color: brandGreen),
                  if (count > 0)
                    Positioned(
                      top: -6,
                      left: -8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: const BoxDecoration(color: brandGold, shape: BoxShape.circle),
                        child: Text(
                          arNumber(count),
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: brandDark),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    count == 0 ? 'السلة فارغة' : '$count صنف في السلة',
                    style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55)),
                  ),
                  Text(
                    sar(total),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: brandGreen),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: onOpen,
              icon: const Icon(Icons.point_of_sale),
              label: const Text('الدفع'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
          ],
        ),
      ),
    );
  }
}
