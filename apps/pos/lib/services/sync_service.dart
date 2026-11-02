import 'dart:convert';

import '../core/config.dart';
import '../data/models.dart';
import '../data/pos_repository.dart';
import 'api_client.dart';

class PushResult {
  const PushResult({required this.accepted, required this.failed, this.error});

  final int accepted;
  final int failed;
  final String? error;
}

class PullResult {
  const PullResult({required this.products, this.error});

  final int products;
  final String? error;
}

class SyncSummary {
  const SyncSummary({
    required this.accepted,
    required this.failed,
    required this.products,
    this.error,
  });

  final int accepted;
  final int failed;
  final int products;
  final String? error;
}

class SyncService {
  SyncService({PosRepository? repository})
      : repository = repository ?? PosRepository.instance;

  final PosRepository repository;

  Future<ApiClient> _client() async {
    final token = await repository.getSetting(AppConfig.tokenKey);
    if (token == null || token.isEmpty) {
      throw ApiException('سجّل الدخول أولاً لمزامنة البيانات مع الخادم.');
    }
    final baseUrl = await repository.apiBaseUrl();
    return ApiClient(baseUrl: baseUrl, token: token);
  }

  Future<PushResult> push() async {
    final operations = await repository.pendingOutbox();
    if (operations.isEmpty) {
      return const PushResult(accepted: 0, failed: 0);
    }

    final ApiClient api;
    try {
      api = await _client();
    } catch (error) {
      return PushResult(accepted: 0, failed: operations.length, error: error.toString());
    }

    var accepted = 0;
    var failed = 0;
    String? firstError;

    for (final operation in operations) {
      try {
        await _pushOperation(api, operation);
        accepted += 1;
      } catch (error) {
        failed += 1;
        firstError ??= error.toString();
        await repository.recordOutboxFailure(operation.id, error.toString());
      }
    }

    return PushResult(accepted: accepted, failed: failed, error: firstError);
  }

  Future<void> _pushOperation(ApiClient api, OutboxOperation operation) async {
    if (operation.action == 'sale.create') {
      final payload = _payload(operation);
      final localShiftId = payload['shiftId']?.toString();
      if (localShiftId != null) {
        final serverShiftId = await repository.serverShiftId(localShiftId);
        if (serverShiftId == null) {
          payload.remove('shiftId');
        } else {
          payload['shiftId'] = serverShiftId;
        }
      }
      payload.remove('clientSaleId');
      payload.remove('clientCreatedAt');
      final response = await api.post('/sales', payload);
      await repository.markOutboxSynced(
        operation.id,
        serverId: _dataId(response),
      );
      return;
    }

    if (operation.action == 'shift.open') {
      final payload = _payload(operation);
      final response = await api.post('/shifts/open', {
        'openingCash': payload['openingCash'],
        if (payload['notes'] != null) 'notes': payload['notes'],
      });
      await repository.markOutboxSynced(
        operation.id,
        serverId: _dataId(response),
      );
      return;
    }

    if (operation.action == 'shift.close') {
      final payload = _payload(operation);
      final localShiftId = payload['clientShiftId']?.toString();
      if (localShiftId == null) {
        throw ApiException('معرّف الوردية مفقود من عملية المزامنة.');
      }
      final serverShiftId = await repository.serverShiftId(localShiftId);
      if (serverShiftId == null) {
        throw ApiException('لم تُزامَن الوردية بعد. ستتم إعادة المحاولة تلقائياً.');
      }
      await api.post('/shifts/$serverShiftId/close', {
        'countedCash': payload['countedCash'],
        if (payload['notes'] != null) 'notes': payload['notes'],
      });
      await repository.markOutboxSynced(operation.id);
      return;
    }

    // Unknown operations are acknowledged so they do not block the queue.
    await repository.markOutboxSynced(operation.id);
  }

  Map<String, dynamic> _payload(OutboxOperation operation) {
    final decoded = jsonDecode(operation.payload);
    if (decoded is Map) return Map<String, dynamic>.from(decoded);
    throw ApiException('حمولة عملية المزامنة غير صالحة.');
  }

  String? _dataId(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map) return data['id']?.toString();
    return null;
  }

  Future<PullResult> pull() async {
    final ApiClient api;
    try {
      api = await _client();
    } catch (error) {
      return PullResult(products: 0, error: error.toString());
    }

    try {
      final since = await repository.getSetting(AppConfig.syncSinceKey);
      final response = await api.get(
        '/sync/pull',
        query: since != null && since.isNotEmpty ? {'since': since} : null,
      );
      final data = response['data'];
      if (data is! Map) throw ApiException('استجابة المزامنة غير صالحة.');
      final reference = data['reference'];
      final rawProducts = reference is Map ? reference['products'] : null;
      final products = rawProducts is List ? rawProducts : const [];
      await repository.upsertProducts(products);
      final serverTime = data['serverTime']?.toString();
      if (serverTime != null) {
        await repository.saveSetting(AppConfig.syncSinceKey, serverTime);
      }
      await repository.saveSetting(
        AppConfig.lastSyncKey,
        DateTime.now().toUtc().toIso8601String(),
      );
      return PullResult(products: products.length);
    } catch (error) {
      return PullResult(products: 0, error: error.toString());
    }
  }

  Future<SyncSummary> syncNow() async {
    final pushResult = await push();
    if (pushResult.error != null && pushResult.accepted == 0) {
      return SyncSummary(
        accepted: pushResult.accepted,
        failed: pushResult.failed,
        products: 0,
        error: pushResult.error,
      );
    }
    final pullResult = await pull();
    return SyncSummary(
      accepted: pushResult.accepted,
      failed: pushResult.failed,
      products: pullResult.products,
      error: pushResult.error ?? pullResult.error,
    );
  }
}
