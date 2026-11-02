import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../data/pos_repository.dart';
import '../../services/sync_service.dart';
import '../auth/login_screen.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  final PosRepository _repository = PosRepository.instance;
  final SyncService _sync = SyncService();

  bool _loading = true;
  bool _busy = false;
  int _pending = 0;
  int _unsyncedSales = 0;
  String? _deviceId;
  String? _apiUrl;
  String? _lastSync;
  String? _token;
  String? _message;
  bool _messageIsError = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool showSpinner = true}) async {
    if (showSpinner && mounted) setState(() => _loading = true);
    final pending = await _repository.pendingCount();
    final unsynced = await _repository.unsyncedSalesCount();
    final deviceId = await _repository.deviceId();
    final apiUrl = await _repository.apiBaseUrl();
    final lastSync = await _repository.getSetting(AppConfig.lastSyncKey);
    final token = await _repository.getSetting(AppConfig.tokenKey);
    if (!mounted) return;
    setState(() {
      _pending = pending;
      _unsyncedSales = unsynced;
      _deviceId = deviceId;
      _apiUrl = apiUrl;
      _lastSync = lastSync;
      _token = token;
      _loading = false;
    });
  }

  void _setMessage(String message, {bool error = false}) {
    if (!mounted) return;
    setState(() {
      _message = message;
      _messageIsError = error;
    });
  }

  Future<void> _syncNow() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    final result = await _sync.syncNow();
    if (!mounted) return;
    final failed = result.failed > 0;
    _setMessage(
      'تمت المزامنة: ${result.accepted} عملية مقبولة، ${result.failed} فاشلة، ${result.products} صنف مسحوب.'
      '${result.error != null ? '\n${result.error}' : ''}',
      error: failed && result.accepted == 0,
    );
    await _load(showSpinner: false);
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _pullOnly() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    final result = await _sync.pull();
    if (!mounted) return;
    _setMessage(
      result.error == null
          ? 'تم سحب ${result.products} صنف من الخادم إلى SQLite.'
          : result.error!,
      error: result.error != null,
    );
    await _load(showSpinner: false);
    if (mounted) setState(() => _busy = false);
  }

  Future<void> _login() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (routeContext) => LoginScreen(
          showSkip: false,
          onSuccess: () {
            Navigator.of(routeContext).pop();
            _load(showSpinner: false);
          },
        ),
      ),
    );
    await _load(showSpinner: false);
  }

  String _date(String? iso) {
    if (iso == null) return 'لم تتم بعد';
    final parsed = DateTime.tryParse(iso)?.toLocal();
    if (parsed == null) return iso;
    return '${parsed.year}/${parsed.month.toString().padLeft(2, '0')}/${parsed.day.toString().padLeft(2, '0')} '
        '${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    final hasToken = _token != null && _token!.isNotEmpty;
    return RefreshIndicator(
      onRefresh: () => _load(showSpinner: false),
      child: ListView(
        padding: const EdgeInsets.all(14),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [brandGreen, brandDark]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.cloud_sync, color: brandGold, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'مزامنة دون فقدان المبيعات',
                        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'كل بيع يُحفظ في SQLite داخل معاملة واحدة مع صف في صندوق الصادر. المزامنة تعيد المحاولة دون تكرار.',
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 10, height: 1.7),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatBox(
                  label: 'عمليات معلّقة',
                  value: '$_pending',
                  icon: Icons.outbox_outlined,
                  tone: _pending > 0 ? brandGold : Colors.green,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatBox(
                  label: 'فواتير غير مزامنة',
                  value: '$_unsyncedSales',
                  icon: Icons.receipt_long_outlined,
                  tone: _unsyncedSales > 0 ? Colors.orange : Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (!hasToken)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.orange.withValues(alpha: 0.25)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.lock_outline, size: 18, color: Colors.orange),
                      SizedBox(width: 8),
                      Text(
                        'يلزم تسجيل الدخول للمزامنة',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'البيع دون اتصال يعمل الآن. سجّل الدخول عند توفر الشبكة لرفع الفواتير وسحب القائمة.',
                    style: TextStyle(fontSize: 10, height: 1.7),
                  ),
                  const SizedBox(height: 8),
                  FilledButton.icon(
                    onPressed: _busy ? null : _login,
                    icon: const Icon(Icons.login, size: 18),
                    label: const Text('تسجيل الدخول'),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
            ),
            child: Column(
              children: [
                _InfoRow(label: 'الجهاز', value: _deviceId ?? '—', ltr: true),
                _InfoRow(label: 'الخادم', value: _apiUrl ?? '—', ltr: true),
                _InfoRow(label: 'آخر مزامنة', value: _date(_lastSync)),
                _InfoRow(
                  label: 'حالة الدخول',
                  value: hasToken ? 'مسجل الدخول' : 'وضع دون اتصال',
                ),
              ],
            ),
          ),
          if (_message != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: (_messageIsError ? Colors.red : Colors.green).withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: (_messageIsError ? Colors.red : Colors.green).withValues(alpha: 0.22),
                ),
              ),
              child: Text(
                _message!,
                style: TextStyle(
                  fontSize: 11,
                  height: 1.7,
                  color: _messageIsError ? Colors.red : Colors.green.shade800,
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _busy || !hasToken ? null : _syncNow,
            icon: _busy
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.sync),
            label: Text(_busy ? 'جارٍ المزامنة…' : 'مزامنة الآن (رفع + سحب)'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _busy || !hasToken ? null : _pullOnly,
            icon: const Icon(Icons.download_outlined),
            label: const Text('سحب القائمة فقط'),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: brandSand,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              'ترتيب المزامنة: تُرفع الورديات أولاً، ثم الفواتير، ثم إغلاق الوردية. '
              'إذا فشلت عملية تبقى في الصندوق مع عدد المحاولات وآخر خطأ، وتُعاد تلقائياً في المزامنة التالية.',
              style: TextStyle(fontSize: 10, height: 1.8, color: brandGreen.withValues(alpha: 0.6)),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({
    required this.label,
    required this.value,
    required this.icon,
    required this.tone,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color tone;

  @override
  Widget build(BuildContext context) {
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
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: tone.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 19, color: tone),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: tone)),
              Text(label, style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.5))),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.ltr = false});

  final String label;
  final String value;
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55))),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.left,
              textDirection: ltr ? TextDirection.ltr : TextDirection.rtl,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
