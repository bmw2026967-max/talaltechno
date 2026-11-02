import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../data/pos_repository.dart';
import '../../services/api_client.dart';
import '../../widgets/brand.dart';
import '../home/home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.onSuccess, this.showSkip = true});

  final VoidCallback? onSuccess;
  final bool showSkip;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _apiController = TextEditingController();
  final _tenantController = TextEditingController(text: AppConfig.defaultTenantSlug);
  final _email = TextEditingController(text: 'admin@talaltechno.dev');
  final _password = TextEditingController();

  bool _busy = false;
  bool _checking = false;
  String? _error;
  String? _connectionMessage;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    final repository = PosRepository.instance;
    final apiUrl = await repository.apiBaseUrl();
    final tenant = await repository.getSetting(AppConfig.tenantSlugKey);
    if (!mounted) return;
    setState(() {
      _apiController.text = apiUrl;
      if (tenant != null && tenant.trim().isNotEmpty) {
        _tenantController.text = tenant.trim();
      }
    });
  }

  @override
  void dispose() {
    _apiController.dispose();
    _tenantController.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String get _platformLabel {
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'iPad / iPhone';
      case TargetPlatform.android:
        return 'Android';
      case TargetPlatform.windows:
        return 'Windows';
      case TargetPlatform.macOS:
        return 'macOS';
      case TargetPlatform.linux:
        return 'Linux';
      default:
        return 'جهاز POS';
    }
  }

  bool _validApiUrl(String value) {
    return value.startsWith('https://') || value.startsWith('http://');
  }

  Future<void> _saveConnection() async {
    final repository = PosRepository.instance;
    final apiUrl = _apiController.text.trim().replaceAll(RegExp(r'/$'), '');
    if (!_validApiUrl(apiUrl)) {
      throw ApiException('أدخل رابط API يبدأ بـ https:// أو http://');
    }
    await repository.saveSetting(AppConfig.apiUrlKey, apiUrl);
    await repository.saveSetting(AppConfig.tenantSlugKey, _tenantController.text.trim());
  }

  Future<void> _testConnection() async {
    setState(() {
      _checking = true;
      _connectionMessage = null;
      _error = null;
    });
    try {
      final api = ApiClient(baseUrl: _apiController.text.trim());
      final response = await api.get('/health');
      final version = response['version']?.toString() ?? '—';
      if (!mounted) return;
      setState(() => _connectionMessage = 'الاتصال ناجح · API $version');
    } catch (error) {
      if (mounted) setState(() => _error = 'تعذر الاتصال: $error');
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    if (!_validApiUrl(_apiController.text.trim())) {
      setState(() => _error = 'أدخل رابط API السحابي أولاً.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _connectionMessage = null;
    });
    try {
      final repository = PosRepository.instance;
      await _saveConnection();
      final tenantSlug = _tenantController.text.trim();
      final api = ApiClient(baseUrl: await repository.apiBaseUrl());
      final response = await api.post('/auth/login', {
        'email': _email.text.trim(),
        'password': _password.text,
        if (tenantSlug.isNotEmpty) 'tenantSlug': tenantSlug,
      });
      final data = response['data'];
      if (data is! Map) throw ApiException('استجابة دخول غير صالحة.');
      final token = data['accessToken']?.toString();
      if (token == null || token.isEmpty) {
        throw ApiException('لم يُرجع الخادم رمز دخول صالحاً.');
      }
      final user = data['user'];
      final name = user is Map ? user['name']?.toString() : null;
      await repository.saveSetting(AppConfig.tokenKey, token);
      await repository.saveSetting(AppConfig.userKey, name ?? _email.text.trim());
      await repository.saveSetting(AppConfig.tenantSlugKey, tenantSlug);
      if (!mounted) return;
      if (widget.onSuccess != null) {
        widget.onSuccess!();
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeShell()),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _skip() {
    if (widget.onSuccess != null) {
      widget.onSuccess!();
      return;
    }
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomeShell()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: brandDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                children: [
                  const BrandLockup(),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: brandCream,
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: brandGold.withValues(alpha: 0.25)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'دخول نقطة البيع السحابية',
                                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: brandGreen),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                              decoration: BoxDecoration(
                                color: brandGreen.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: brandGreen.withValues(alpha: 0.18)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.cloud_done_outlined, size: 14, color: brandGreen),
                                  SizedBox(width: 4),
                                  Text('Cloud', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: brandGreen)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'يعمل على $_platformLabel · بيع دون اتصال · مزامنة تلقائية عند عودة الشبكة.',
                          style: TextStyle(fontSize: 12, height: 1.7, color: brandGreen.withValues(alpha: 0.65)),
                        ),
                        const SizedBox(height: 18),
                        TextField(
                          controller: _apiController,
                          textDirection: TextDirection.ltr,
                          keyboardType: TextInputType.url,
                          decoration: const InputDecoration(
                            labelText: 'رابط API السحابي',
                            hintText: 'https://erp.example.sa/api',
                            prefixIcon: Icon(Icons.dns_outlined),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _tenantController,
                          textDirection: TextDirection.ltr,
                          decoration: const InputDecoration(
                            labelText: 'رمز المنشأة (Tenant Slug)',
                            hintText: 'talal-techno',
                            prefixIcon: Icon(Icons.storefront_outlined),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textDirection: TextDirection.ltr,
                          decoration: const InputDecoration(
                            labelText: 'البريد الإلكتروني',
                            prefixIcon: Icon(Icons.mail_outline),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'كلمة المرور',
                            prefixIcon: Icon(Icons.lock_outline),
                          ),
                          onSubmitted: (_) => _submit(),
                        ),
                        if (_connectionMessage != null) ...[
                          const SizedBox(height: 10),
                          Text(
                            _connectionMessage!,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF1F7A4D)),
                          ),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.withValues(alpha: 0.07),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.error_outline, size: 18, color: Colors.red),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: const TextStyle(fontSize: 11, height: 1.6, color: Colors.red),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: _busy ? null : _submit,
                          icon: _busy
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.login),
                          label: Text(_busy ? 'جارٍ الدخول…' : 'دخول إلى السحابة'),
                        ),
                        const SizedBox(height: 6),
                        OutlinedButton.icon(
                          onPressed: _busy || _checking ? null : _testConnection,
                          icon: _checking
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.wifi_tethering, size: 17),
                          label: Text(_checking ? 'جارٍ الاختبار…' : 'اختبار الاتصال'),
                        ),
                        if (widget.showSkip) ...[
                          const SizedBox(height: 4),
                          TextButton(
                            onPressed: _busy ? null : _skip,
                            child: const Text('متابعة دون اتصال — وضع العرض'),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Text(
                          'بيانات البذرة التجريبية: admin@talaltechno.dev / Talal@1234',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 9, height: 1.8, color: brandGreen.withValues(alpha: 0.45)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'طلال تكنو · نسخة ${AppConfig.appVersion} · ${AppConfig.cloudMode ? 'سحابي' : 'محلي'} · Sandbox',
                    style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.45)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
