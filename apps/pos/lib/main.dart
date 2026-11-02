import 'package:flutter/material.dart';

import 'app.dart';
import 'data/pos_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await PosRepository.instance.initialize();
  runApp(const TalalPosApp());
}
