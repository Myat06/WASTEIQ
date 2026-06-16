import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _plugin.initialize(
      const InitializationSettings(android: android, iOS: ios),
    );
    _initialized = true;
  }

  static Future<void> show({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await init();
    const android = AndroidNotificationDetails(
      'wasteiq_alerts',
      'WasteIQ Alerts',
      channelDescription: 'Critical zone and route alerts',
      importance: Importance.high,
      priority: Priority.high,
      color: Color(0xFF1D9E75),
    );
    const ios = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    await _plugin.show(
      id,
      title,
      body,
      const NotificationDetails(android: android, iOS: ios),
      payload: payload,
    );
  }

  /// Check predictions list and fire a notification for critical zones.
  static Future<void> checkAndNotifyCritical(
      List<Map<String, dynamic>> predictions) async {
    final critical =
        predictions.where((p) => p['risk_level'] == 'critical').toList();
    if (critical.isEmpty) return;

    if (critical.length == 1) {
      final zone = critical.first['zone_name'] as String? ?? 'Unknown Zone';
      final kg = (critical.first['predicted_waste_kg'] as num?)?.toInt() ?? 0;
      await show(
        id: 1001,
        title: '🚨 Critical Zone Alert',
        body: '$zone requires immediate collection — $kg kg predicted',
        payload: 'critical',
      );
    } else {
      final names = critical
          .take(3)
          .map((p) => p['zone_name'] as String? ?? '')
          .join(', ');
      final extra = critical.length > 3 ? ' +${critical.length - 3} more' : '';
      await show(
        id: 1001,
        title: '🚨 ${critical.length} Critical Zones',
        body: '$names$extra need immediate attention',
        payload: 'critical',
      );
    }
  }

  /// Notify driver when a new route is assigned.
  static Future<void> notifyRouteAssigned({
    required String firstZone,
    required int stopCount,
    required String riskLevel,
  }) async {
    final emoji =
        riskLevel == 'critical' ? '🚨' : riskLevel == 'high' ? '⚠️' : '📍';
    await show(
      id: 2001,
      title: '$emoji New Route Assigned',
      body:
          'Head to $firstZone first — $stopCount stop${stopCount > 1 ? 's' : ''} total',
      payload: 'route',
    );
  }

  /// Notify when route is completed.
  static Future<void> notifyRouteCompleted(String zoneName) async {
    await show(
      id: 2002,
      title: '✅ Route Completed',
      body: '$zoneName cleaned. Cooldown active — request next route when ready.',
      payload: 'completed',
    );
  }
}
