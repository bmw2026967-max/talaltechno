import 'package:flutter/material.dart';

import '../../core/money.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../domain/cart.dart';

class CartSheet extends StatefulWidget {
  const CartSheet({
    super.key,
    required this.cart,
    required this.onCheckout,
  });

  final Cart cart;
  final Future<Sale?> Function(String method) onCheckout;

  @override
  State<CartSheet> createState() => _CartSheetState();
}

class _CartSheetState extends State<CartSheet> {
  static const _methods = [
    ('cash', 'نقدي', Icons.payments_outlined),
    ('mada', 'مدى', Icons.credit_card),
    ('applepay', 'Apple Pay', Icons.phone_iphone),
    ('card', 'شبكة', Icons.contactless_outlined),
  ];

  String _method = 'cash';
  bool _busy = false;
  String? _error;

  Future<void> _checkout() async {
    if (widget.cart.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final sale = await widget.onCheckout(_method);
      if (!mounted) return;
      Navigator.of(context).pop(sale);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.88;
    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: brandCream,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 8),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 4,
                    margin: const EdgeInsets.only(left: 12),
                    decoration: BoxDecoration(
                      color: brandGreen.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const Expanded(
                    child: Text(
                      'سلة البيع',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: brandGreen),
                    ),
                  ),
                  IconButton(
                    onPressed: _busy ? null : () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                    tooltip: 'إغلاق',
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: widget.cart.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.shopping_cart_outlined, size: 56, color: brandGreen.withValues(alpha: 0.25)),
                          const SizedBox(height: 12),
                          const Text('السلة فارغة', style: TextStyle(fontWeight: FontWeight.w700)),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(14),
                      itemCount: widget.cart.lines.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final line = widget.cart.lines[index];
                        return Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 46,
                                height: 46,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: brandSand,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(line.product.emoji, style: const TextStyle(fontSize: 24)),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      line.product.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${sar(line.product.price)} · ${line.product.taxRate.toStringAsFixed(0)}% ضريبة',
                                      style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55)),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      sar(line.total),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                        color: brandGreen,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              _QtyButton(
                                icon: Icons.remove,
                                onTap: () {
                                  setState(() => widget.cart.increment(line.product.id, -1));
                                },
                              ),
                              SizedBox(
                                width: 28,
                                child: Text(
                                  arNumber(line.qty),
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ),
                              _QtyButton(
                                icon: Icons.add,
                                filled: true,
                                onTap: () {
                                  setState(() => widget.cart.increment(line.product.id, 1));
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: brandGreen.withValues(alpha: 0.10))),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _methods
                        .map(
                          (method) => ChoiceChip(
                            label: Text(method.$2),
                            avatar: Icon(method.$3, size: 15),
                            selected: _method == method.$1,
                            onSelected: _busy ? null : (_) => setState(() => _method = method.$1),
                          ),
                        )
                        .toList(growable: false),
                  ),
                  const SizedBox(height: 10),
                  _TotalRow(label: 'قبل الضريبة', value: sar(widget.cart.subtotal)),
                  _TotalRow(label: 'الضريبة', value: sar(widget.cart.tax)),
                  const Divider(height: 16),
                  _TotalRow(
                    label: 'الإجمالي',
                    value: sar(widget.cart.total),
                    bold: true,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.07),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(fontSize: 11, color: Colors.red, height: 1.5),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy || widget.cart.isEmpty ? null : _checkout,
                      icon: _busy
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.check_circle_outline),
                      label: Text(_busy ? 'جارٍ حفظ البيع…' : 'إتمام البيع — ${sar(widget.cart.total)}'),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'يُحفظ البيع محلياً أولاً ويُطبع إيصال تجريبي. المزامنة عند توفر الشبكة.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.5)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({required this.icon, required this.onTap, this.filled = false});

  final IconData icon;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: IconButton(
        onPressed: onTap,
        iconSize: 16,
        padding: EdgeInsets.zero,
        style: IconButton.styleFrom(
          backgroundColor: filled ? brandGreen : brandGreen.withValues(alpha: 0.06),
          foregroundColor: filled ? Colors.white : brandGreen,
        ),
        icon: Icon(icon),
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow({required this.label, required this.value, this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1.5),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: bold ? 14 : 11,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              color: bold ? brandGreen : brandGreen.withValues(alpha: 0.6),
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 17 : 11,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
              color: brandGreen,
            ),
          ),
        ],
      ),
    );
  }
}
