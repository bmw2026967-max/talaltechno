import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/money.dart';
import '../../core/theme.dart';
import '../../data/models.dart';
import '../../data/pos_repository.dart';

class ShiftScreen extends StatefulWidget {
  const ShiftScreen({super.key});

  @override
  State<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends State<ShiftScreen> {
  final PosRepository _repository = PosRepository.instance;
  late Future<_ShiftData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_ShiftData> _load() async {
    final current = await _repository.currentShift();
    final history = await _repository.shifts();
    return _ShiftData(current: current, history: history);
  }

  void _refresh() {
    setState(() => _future = _load());
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  String _date(String iso) {
    final parsed = DateTime.tryParse(iso)?.toLocal();
    if (parsed == null) return iso;
    return DateFormat('yyyy/MM/dd HH:mm', 'ar_SA').format(parsed);
  }

  Future<void> _openShift() async {
    final controller = TextEditingController(text: '500');
    final value = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('فتح وردية جديدة'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'أدخل النقدية الافتتاحية الموجودة فعلياً في درج النقدية.',
              style: TextStyle(fontSize: 12, height: 1.6),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'النقدية الافتتاحية (ر.س)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(double.tryParse(controller.text)),
            child: const Text('فتح الوردية'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || value < 0) {
      _notify('أدخل مبلغاً صحيحاً غير سالب.');
      return;
    }
    try {
      await _repository.openShift(value);
      _notify('تم فتح الوردية وحفظها محلياً. ستُزامن عند توفر الشبكة.');
      _refresh();
    } catch (error) {
      _notify(error.toString());
    }
  }

  Future<void> _closeShift(ShiftRecord shift) async {
    final controller = TextEditingController(text: shift.openingCash.toStringAsFixed(2));
    final value = await showDialog<double>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('إغلاق الوردية ${shift.id.split('-').last}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('الافتتاحي: ${sar(shift.openingCash)}', style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 4),
            const Text(
              'أدخل النقدية المعدودة فعلياً. سيُحسب الفرق مقابل المتوقع تلقائياً.',
              style: TextStyle(fontSize: 12, height: 1.6),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'النقدية المعدودة (ر.س)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(double.tryParse(controller.text)),
            child: const Text('إغلاق الوردية'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || value < 0) {
      _notify('أدخل النقدية المعدودة بشكل صحيح.');
      return;
    }
    try {
      final closed = await _repository.closeShift(shift.id, value);
      _refresh();
      if (!mounted) return;
      showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('تم إغلاق الوردية'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _SummaryRow(label: 'الافتتاحي', value: sar(closed.openingCash)),
              _SummaryRow(label: 'المتوقع', value: sar(closed.expectedCash ?? 0)),
              _SummaryRow(label: 'المعدود', value: sar(closed.countedCash ?? 0)),
              const Divider(),
              _SummaryRow(
                label: 'الفرق',
                value: sar(closed.variance ?? 0),
                color: (closed.variance ?? 0).abs() < 0.01 ? Colors.green : Colors.orange,
                bold: true,
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('تم'),
            ),
          ],
        ),
      );
    } catch (error) {
      _notify(error.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_ShiftData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data;
        if (data == null) {
          return Center(child: Text(snapshot.error?.toString() ?? 'تعذر تحميل الورديات.'));
        }
        final current = data.current;
        return RefreshIndicator(
          onRefresh: () async {
            _refresh();
            await _future;
          },
          child: ListView(
            padding: const EdgeInsets.all(14),
            children: [
              if (current == null)
                _OpenShiftCard(onOpen: _openShift)
              else
                _CurrentShiftCard(
                  shift: current,
                  openedAt: _date(current.openedAt),
                  onClose: () => _closeShift(current),
                ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Text(
                    'سجل الورديات',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: brandGreen),
                  ),
                  const Spacer(),
                  Text(
                    '${data.history.length} وردية',
                    style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.5)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (data.history.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
                  ),
                  child: const Text(
                    'لا توجد ورديات مسجلة بعد. افتح وردية قبل بدء البيع النقدي.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, height: 1.7),
                  ),
                )
              else
                ...data.history.map(
                  (shift) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _ShiftTile(shift: shift, openedAt: _date(shift.openedAt)),
                  ),
                ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: brandGreen.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: brandGreen.withValues(alpha: 0.08)),
                ),
                child: Text(
                  'الورديات تُحفظ في SQLite وتُضاف إلى صندوق المزامنة. الفرق يُحسب من النقدية الافتتاحية + مبيعات النقدي فقط.',
                  style: TextStyle(fontSize: 10, height: 1.7, color: brandGreen.withValues(alpha: 0.55)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _OpenShiftCard extends StatelessWidget {
  const _OpenShiftCard({required this.onOpen});

  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [brandGreen, brandDark]),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_balance_wallet_outlined, color: brandGold),
              SizedBox(width: 8),
              Text(
                'لا توجد وردية مفتوحة',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'افتح وردية لتسجيل النقدية الافتتاحية وربط المبيعات بها. يمكنك البيع دون وردية، لكن التقارير النقدية لن تكون دقيقة.',
            style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 11, height: 1.7),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: onOpen,
            style: FilledButton.styleFrom(backgroundColor: brandGold, foregroundColor: brandDark),
            icon: const Icon(Icons.add),
            label: const Text('فتح وردية الآن'),
          ),
        ],
      ),
    );
  }
}

class _CurrentShiftCard extends StatelessWidget {
  const _CurrentShiftCard({
    required this.shift,
    required this.openedAt,
    required this.onClose,
  });

  final ShiftRecord shift;
  final String openedAt;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.green.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.timer_outlined, color: Colors.green),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'وردية مفتوحة',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: brandGreen),
                    ),
                    Text(
                      'بدأت $openedAt',
                      style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55)),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'مفتوحة',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.green),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _Metric(
                  label: 'النقدية الافتتاحية',
                  value: sar(shift.openingCash),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _Metric(
                  label: 'المعرّف المحلي',
                  value: shift.id.split('-').last,
                  mono: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onClose,
              icon: const Icon(Icons.lock_outline),
              label: const Text('إغلاق الوردية'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, this.mono = false});

  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: brandSand,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.55))),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: mono ? 11 : 14,
              fontWeight: FontWeight.w800,
              color: brandGreen,
              fontFamily: mono ? 'monospace' : null,
            ),
          ),
        ],
      ),
    );
  }
}

class _ShiftTile extends StatelessWidget {
  const _ShiftTile({required this.shift, required this.openedAt});

  final ShiftRecord shift;
  final String openedAt;

  @override
  Widget build(BuildContext context) {
    final closed = !shift.isOpen;
    final variance = shift.variance ?? 0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: (closed ? brandGreen : Colors.green).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              closed ? Icons.check : Icons.timer_outlined,
              size: 20,
              color: closed ? brandGreen : Colors.green,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'وردية ${shift.id.split('-').last}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                ),
                Text(
                  openedAt,
                  style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.5)),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                sar(shift.openingCash),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: brandGreen),
              ),
              Text(
                closed ? 'الفرق ${sar(variance)}' : 'مفتوحة',
                style: TextStyle(
                  fontSize: 9,
                  color: closed && variance.abs() >= 0.01 ? Colors.orange : brandGreen.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.color,
    this.bold = false,
  });

  final String label;
  final String value;
  final Color? color;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Text(label, style: const TextStyle(fontSize: 12)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: bold ? 15 : 12,
              fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _ShiftData {
  const _ShiftData({required this.current, required this.history});

  final ShiftRecord? current;
  final List<ShiftRecord> history;
}
