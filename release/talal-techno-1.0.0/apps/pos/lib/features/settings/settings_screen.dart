import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../data/pos_repository.dart';
import '../../services/printer_service.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final PosRepository _repository = PosRepository.instance;
  final ReceiptPrinter _printer = ReceiptPrinter();
  final TextEditingController _apiController = TextEditingController();

  bool _loading = true;
  bool _busy = false;
  String? _deviceId;
  String? _user;
  String? _token;
  String? _lastSync;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _apiController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final apiUrl = await _repository.apiBaseUrl();
    final deviceId = await _repository.deviceId();
    final user = await _repository.getSetting(AppConfig.userKey);
    final token = await _repository.getSetting(AppConfig.tokenKey);
    final lastSync = await _repository.getSetting(AppConfig.lastSyncKey);
    if (!mounted) return;
    setState(() {
      _apiController.text = apiUrl;
      _deviceId = deviceId;
      _user = user;
      _token = token;
      _lastSync = lastSync;
      _loading = false;
    });
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _saveApiUrl() async {
    final value = _apiController.text.trim();
    if (value.isEmpty || !(value.startsWith('http://') || value.startsWith('https://'))) {
      _notify('أدخل رابطاً يبدأ بـ http:// أو https://');
      return;
    }
    await _repository.saveSetting(AppConfig.apiUrlKey, value);
    _notify('تم حفظ رابط الخادم محلياً.');
  }

  Future<void> _testPrinter() async {
    setState(() => _busy = true);
    try {
      final bytes = await _printer.printTest();
      _notify('تمت طباعة إيصال تجريبي (${bytes.length} بايت) عبر ${_printer.transport.name}.');
    } catch (error) {
      _notify(error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resetData() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('مسح البيانات المحلية؟'),
        content: const Text(
          'سيتم حذف الفواتير والورديات وصندوق المزامنة المحلي فقط. القائمة والإعدادات تبقى كما هي. لا يمكن التراجع.',
          style: TextStyle(fontSize: 12, height: 1.7),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('مسح البيانات'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _repository.resetTransactionalData();
    _notify('تم مسح البيانات المحلية. القائمة التجريبية ما زالت متاحة.');
    await _load();
  }

  Future<void> _logout() async {
    await _repository.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen(showSkip: true)),
      (route) => false,
    );
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
    final signedIn = _token != null && _token!.isNotEmpty;
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'اتصال الخادم',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: brandGreen),
              ),
              const SizedBox(height: 4),
              Text(
                'يُستخدم لعملية المزامنة فقط. البيع يعمل دون اتصال دائماً.',
                style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _apiController,
                textDirection: TextDirection.ltr,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(
                  labelText: 'API Base URL',
                  hintText: 'http://10.0.2.2:4000',
                  prefixIcon: Icon(Icons.dns_outlined),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _saveApiUrl,
                      icon: const Icon(Icons.save_outlined, size: 18),
                      label: const Text('حفظ الرابط'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _testPrinter,
                      icon: const Icon(Icons.print_outlined, size: 18),
                      label: const Text('اختبار الطابعة'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
          ),
          child: Column(
            children: [
              _Row(label: 'الجهاز', value: _deviceId ?? '—'),
              _Row(label: 'المستخدم', value: _user ?? 'وضع دون اتصال'),
              _Row(label: 'حالة الدخول', value: signedIn ? 'مسجل الدخول' : 'غير مسجل'),
              _Row(label: 'آخر مزامنة', value: _date(_lastSync)),
              _Row(label: 'إصدار التطبيق', value: AppConfig.appVersion),
              _Row(label: 'الوضع', value: 'Sandbox / Mock'),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: brandGold.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: brandGold.withValues(alpha: 0.25)),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: Color(0xFF8A6A0F)),
                  SizedBox(width: 8),
                  Text(
                    'حدود النسخة التجريبية',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF6B520C)),
                  ),
                ],
              ),
              SizedBox(height: 6),
              Text(
                'الطابعة وهمية (Mock ESC/POS) ولا تتصل بجهاز فعلي. '
                'المدفوعات وZATCA غير مفعّلة في تطبيق POS هذا؛ تُدار عبر الـ API ولوحة التحكم في وضع Sandbox. '
                'لا توجد شهادة ZATCA أو SAMA حقيقية.',
                style: TextStyle(fontSize: 10, height: 1.8, color: Color(0xFF6B520C)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: brandGreen.withValues(alpha: 0.10)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'البيانات المحلية',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: brandGreen),
              ),
              const SizedBox(height: 4),
              Text(
                'SQLite WAL + صندوق صادر. مسح البيانات لا يؤثر على الخادم.',
                style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55)),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: _resetData,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
                ),
                icon: const Icon(Icons.delete_outline, size: 18),
                label: const Text('مسح الفواتير والورديات المحلية'),
              ),
              if (signedIn) ...[
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: _logout,
                  icon: const Icon(Icons.logout, size: 18),
                  label: const Text('تسجيل الخروج'),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 18),
        Center(
          child: Text(
            'طلال تكنو · نقطة بيع دون اتصال · AGPL-3.0',
            style: TextStyle(fontSize: 9, color: brandGreen.withValues(alpha: 0.4)),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: brandGreen.withValues(alpha: 0.55))),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.left,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
