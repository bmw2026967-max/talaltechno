import 'package:flutter/material.dart';

import '../core/theme.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 44});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0F5138), Color(0xFF082A20)],
        ),
        borderRadius: BorderRadius.circular(size * 0.28),
        border: Border.all(color: brandGold.withValues(alpha: 0.55), width: 1.4),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Text(
            'T',
            style: TextStyle(
              color: const Color(0xFFD8B13A),
              fontSize: size * 0.52,
              fontWeight: FontWeight.w900,
              height: 1,
            ),
          ),
          Positioned(
            top: size * 0.14,
            right: size * 0.14,
            child: Container(
              width: size * 0.11,
              height: size * 0.11,
              decoration: const BoxDecoration(color: Color(0xFFD8B13A), shape: BoxShape.circle),
            ),
          ),
        ],
      ),
    );
  }
}

class BrandLockup extends StatelessWidget {
  const BrandLockup({super.key, this.compact = false, this.light = true});

  final bool compact;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final color = light ? Colors.white : brandGreen;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        BrandMark(size: compact ? 34 : 42),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'طلال تكنو',
              style: TextStyle(color: color, fontSize: compact ? 15 : 17, fontWeight: FontWeight.w800),
            ),
            Text(
              'TALAL TECHNO · POS',
              style: TextStyle(
                color: brandGold,
                fontSize: compact ? 7 : 8,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.6,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
