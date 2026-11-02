/// Compile-time configuration for the Talal Techno POS.
///
/// Override the API URL at build time:
/// `flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000`
class AppConfig {
  const AppConfig._();

  static const String appName = 'طلال تكنو';
  static const String appVersion = '1.1.0';

  /// Cloud build example:
  /// `flutter build apk --dart-define=API_BASE_URL=https://erp.example.sa/api`
  ///
  /// Android emulator reaches the host machine through 10.0.2.2.
  /// On a physical device use the LAN IP of the API server.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  /// Default tenant slug baked into a branded build. The cashier can still
  /// change it from the login screen or settings.
  static const String defaultTenantSlug = String.fromEnvironment(
    'TENANT_SLUG',
    defaultValue: '',
  );

  static const bool cloudMode = bool.fromEnvironment('CLOUD_MODE', defaultValue: true);

  static const String currency = 'SAR';
  static const double vatRate = 15;
  static const Duration syncInterval = Duration(minutes: 5);

  static const String tokenKey = 'pos_token';
  static const String userKey = 'pos_user';
  static const String apiUrlKey = 'api_base_url';
  static const String tenantSlugKey = 'tenant_slug';
  static const String deviceIdKey = 'pos_device_id';
  static const String syncSinceKey = 'sync_since';
  static const String lastSyncKey = 'last_sync_at';
  static const String lastSyncErrorKey = 'last_sync_error';
}
