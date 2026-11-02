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
  final _email = TextEditingController(text: 'admin@talaltechno.dev');
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  String? _apiUrl;

  @override
  void initState() {
    super.initState();
    PosRepository.instance.apiBaseUrl().then((value) {
      if (mounted) setState(() => _apiUrl = value);
    });
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repository = PosRepository.instance;
      final api = ApiClient(baseUrl: await repository.apiBaseUrl());
      final response = await api.post('/auth/login', {
        'email': _email.text.trim(),
        'password': _password.text,
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
              constraints: const BoxConstraints(maxWidth: 440),
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
                        const Text(
                          'تسجيل الدخول إلى نقطة البيع',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: brandGreen),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'يمكنك البيع دون اتصال بعد الدخول. المزامنة تعمل عند توفر الشبكة.',
                          style: TextStyle(fontSize: 12, height: 1.7, color: brandGreen.withValues(alpha: 0.65)),
                        ),
                        const SizedBox(height: 20),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textDirection: TextDirection.ltr,
                          decoration: const InputDecoration(
                            labelText: 'البريد الإلكتروني',
                            prefixIcon: Icon(Icons.mail_outline),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'كلمة المرور',
                            prefixIcon: Icon(Icons.lock_outline),
                          ),
                          onSubmitted: (_) => _submit(),
                        ),
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
                        const SizedBox(height: 18),
                        FilledButton.icon(
                          onPressed: _busy ? null : _submit,
                          icon: _busy
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Icon(Icons.login),
                          label: Text(_busy ? 'جارٍ الدخول…' : 'دخول'),
                        ),
                        if (widget.showSkip) ...[
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _busy ? null : _skip,
                            child: const Text('متابعة بدون اتصال — وضع العرض'),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Text(
                          'بيانات البذرة التجريبية: admin@talaltechno.dev / Talal@1234\n${_apiUrl ?? AppConfig.apiBaseUrl}',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 9, height: 1.8, color: brandGreen.withValues(alpha: 0.45)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'طلال تكنو · نسخة ${AppConfig.appVersion} · Sandbox',
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
