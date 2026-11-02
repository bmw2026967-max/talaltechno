import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({required this.baseUrl, this.token, this.timeout = const Duration(seconds: 12)});

  final String baseUrl;
  final String? token;
  final Duration timeout;

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final uri = Uri.parse('$normalized$path');
    return query == null ? uri : uri.replace(queryParameters: {...uri.queryParameters, ...query});
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    final response = await http
        .get(_uri(path, query), headers: _headers)
        .timeout(timeout, onTimeout: () => throw ApiException('انتهت مهلة الاتصال بالخادم.'));
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http
        .post(_uri(path), headers: _headers, body: jsonEncode(body))
        .timeout(timeout, onTimeout: () => throw ApiException('انتهت مهلة الاتصال بالخادم.'));
    return _decode(response);
  }

  Map<String, dynamic> _decode(http.Response response) {
    dynamic json;
    try {
      final text = utf8.decode(response.bodyBytes);
      json = text.isEmpty ? <String, dynamic>{} : jsonDecode(text);
    } catch (_) {
      json = <String, dynamic>{};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_message(json) ?? 'تعذر تنفيذ الطلب (${response.statusCode}).', statusCode: response.statusCode);
    }
    if (json is Map<String, dynamic>) return json;
    throw ApiException('استجابة غير متوقعة من الخادم.');
  }

  String? _message(dynamic json) {
    if (json is Map<String, dynamic>) {
      final message = json['message'];
      if (message is String) return message;
      if (message is List) return message.map((item) => item.toString()).join('، ');
    }
    return null;
  }
}
