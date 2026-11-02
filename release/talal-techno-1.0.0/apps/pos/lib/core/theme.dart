import 'package:flutter/material.dart';

const Color brandGreen = Color(0xFF0B3D2E);
const Color brandDark = Color(0xFF07241B);
const Color brandGold = Color(0xFFC9A227);
const Color brandSand = Color(0xFFF6F1E6);
const Color brandCream = Color(0xFFFBF8F1);

ThemeData buildPosTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: brandGreen,
    brightness: Brightness.light,
  ).copyWith(
    primary: brandGreen,
    onPrimary: Colors.white,
    secondary: brandGold,
    onSecondary: brandDark,
    surface: Colors.white,
    onSurface: const Color(0xFF16231D),
    outline: const Color(0xFFB9C4BD),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: brandCream,
    fontFamilyFallback: const ['Tajawal', 'Segoe UI', 'Tahoma', 'Arial'],
    appBarTheme: const AppBarTheme(
      backgroundColor: brandDark,
      foregroundColor: Colors.white,
      centerTitle: false,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: brandGreen.withValues(alpha: 0.12),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(64, 52),
        backgroundColor: brandGreen,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(64, 52),
        foregroundColor: brandGreen,
        side: BorderSide(color: brandGreen.withValues(alpha: 0.25)),
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: brandGreen.withValues(alpha: 0.18)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: brandGreen.withValues(alpha: 0.18)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: brandGreen, width: 1.6),
      ),
    ),
  );
}
