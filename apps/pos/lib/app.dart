import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/config.dart';
import 'core/theme.dart';
import 'data/pos_repository.dart';
import 'features/auth/login_screen.dart';
import 'features/home/home_shell.dart';
import 'widgets/brand.dart';

class TalalPosApp extends StatelessWidget {
  const TalalPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: buildPosTheme(),
      locale: const Locale('ar', 'SA'),
      supportedLocales: const [Locale('ar', 'SA'), Locale('en', 'US')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const StartGate(),
    );
  }
}

class StartGate extends StatefulWidget {
  const StartGate({super.key});

  @override
  State<StartGate> createState() => _StartGateState();
}

class _StartGateState extends State<StartGate> {
  late Future<String?> _tokenFuture;

  @override
  void initState() {
    super.initState();
    _tokenFuture = PosRepository.instance.getSetting(AppConfig.tokenKey);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: _tokenFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _Splash();
        }
        final token = snapshot.data;
        if (token != null && token.isNotEmpty) {
          return const HomeShell();
        }
        return const LoginScreen(showSkip: true);
      },
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: brandDark,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandMark(size: 72),
            const SizedBox(height: 20),
            const Text(
              'طلال تكنو',
              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              'نقطة البيع — تهيئة قاعدة البيانات المحلية…',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 12),
            ),
            const SizedBox(height: 18),
            const SizedBox(
              width: 160,
              child: LinearProgressIndicator(
                minHeight: 4,
                backgroundColor: Color(0x33FFFFFF),
                color: brandGold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
