import 'package:flutter/material.dart';

import '../../widgets/brand.dart';
import '../pos/pos_screen.dart';
import '../settings/settings_screen.dart';
import '../shifts/shift_screen.dart';
import '../sync/sync_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _pages = [
    PosScreen(),
    ShiftScreen(),
    SyncScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const BrandLockup(compact: true),
        actions: [
          IconButton(
            tooltip: 'المزامنة',
            onPressed: () => setState(() => _index = 2),
            icon: const Icon(Icons.sync),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.point_of_sale_outlined),
            selectedIcon: Icon(Icons.point_of_sale),
            label: 'البيع',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'الوردية',
          ),
          NavigationDestination(
            icon: Icon(Icons.cloud_sync_outlined),
            selectedIcon: Icon(Icons.cloud_sync),
            label: 'المزامنة',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'الإعدادات',
          ),
        ],
      ),
    );
  }
}
