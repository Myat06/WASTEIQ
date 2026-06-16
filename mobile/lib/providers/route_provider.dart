import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../services/session.dart';

enum RouteStatus { initial, loading, active, noRoute, error, completing, completed }

class RouteState {
  final RouteStatus status;
  final String? error;
  final String? completionMessage;
  final int? cooldownHours;

  const RouteState({
    this.status = RouteStatus.initial,
    this.error,
    this.completionMessage,
    this.cooldownHours,
  });

  RouteState copyWith({
    RouteStatus? status,
    String? error,
    String? completionMessage,
    int? cooldownHours,
  }) =>
      RouteState(
        status: status ?? this.status,
        error: error ?? this.error,
        completionMessage: completionMessage ?? this.completionMessage,
        cooldownHours: cooldownHours ?? this.cooldownHours,
      );
}

class RouteNotifier extends Notifier<RouteState> {
  @override
  RouteState build() => const RouteState();

  /// Called on app start / route list open — checks if driver already has an active route.
  Future<void> checkMyRoute() async {
    if (Session.driverId == null) return;
    state = state.copyWith(status: RouteStatus.loading);
    try {
      final data = await ApiService.getMyRoute(Session.driverId!);
      if (data == null) {
        // No active route in backend — also clear any stale session data
        await Session.clearRoute();
        state = state.copyWith(status: RouteStatus.noRoute);
      } else {
        _applyAssignment(data);
        state = state.copyWith(status: RouteStatus.active);
      }
    } catch (e) {
      // If session already has a route cached, show it; otherwise show error
      if (Session.activeRouteId != null) {
        state = state.copyWith(status: RouteStatus.active);
      } else {
        state = state.copyWith(status: RouteStatus.error, error: e.toString());
      }
    }
  }

  /// Called when driver presses "Get Route" button.
  Future<void> requestRoute() async {
    if (Session.driverId == null) return;

    // Fallback coords: Jakarta center if vehicle GPS not saved
    final lat = Session.vehicleLat ?? -6.2088;
    final lng = Session.vehicleLng ?? 106.8456;

    state = state.copyWith(status: RouteStatus.loading, error: null);
    try {
      final data = await ApiService.requestRoute(
        driverId: Session.driverId!,
        vehicleLat: lat,
        vehicleLng: lng,
      );
      _applyAssignment(data);
      await Session.save();
      state = state.copyWith(status: RouteStatus.active);
      // Notify driver of new assignment
      final firstZone = Session.activeZones.isNotEmpty ? Session.activeZones.first.name : 'Zone';
      final stopCount = Session.activeZones.length;
      final riskLevel = Session.activeZones.isNotEmpty ? Session.activeZones.first.risk : 'low';
      await NotificationService.notifyRouteAssigned(
        firstZone: firstZone,
        stopCount: stopCount,
        riskLevel: riskLevel,
      );
    } catch (e) {
      state = state.copyWith(status: RouteStatus.noRoute, error: e.toString());
    }
  }

  /// Called when driver presses "Complete Route" button.
  Future<void> completeRoute() async {
    if (Session.activeRouteId == null) return;
    state = state.copyWith(status: RouteStatus.completing);
    try {
      final result = await ApiService.completeRoute(Session.activeRouteId!);
      final hours = result['cooldown_hours'] as int? ?? 4;
      final zoneName = Session.activeZoneName ?? 'Zone';
      await Session.clearRoute();
      await NotificationService.notifyRouteCompleted(zoneName);
      state = state.copyWith(
        status: RouteStatus.completed,
        completionMessage: '$zoneName cleaned! Next assignment available in ${hours}h.',
        cooldownHours: hours,
      );
    } catch (e) {
      state = state.copyWith(status: RouteStatus.active, error: 'Failed to complete: $e');
    }
  }

  /// After showing the completion message, move to noRoute so driver can request again.
  void resetAfterCompletion() {
    state = state.copyWith(status: RouteStatus.noRoute, completionMessage: null);
  }

  void _applyAssignment(Map<String, dynamic> data) {
    Session.activeRouteId = data['id'] as int?;
    Session.activeWorkersNeeded = data['workers_needed'] as int?;
    Session.activeDistanceKm = (data['distance_km'] as num?)?.toDouble();

    // Populate ordered zone stops
    final stopsRaw = data['stops'] as List?;
    if (stopsRaw != null && stopsRaw.isNotEmpty) {
      Session.activeZones = stopsRaw
          .map((s) => ActiveZone.fromJson(s as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.stopOrder.compareTo(b.stopOrder));
    } else {
      // Fallback: single zone from top-level fields (legacy assignment)
      final lat = (data['zone_lat'] as num?)?.toDouble();
      final lng = (data['zone_lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        Session.activeZones = [
          ActiveZone(
            id: data['zone'] as int? ?? 0,
            name: data['zone_name'] as String? ?? '',
            lat: lat,
            lng: lng,
            municipality: data['zone_municipality'] as String? ?? '',
            risk: data['risk_level'] as String? ?? 'low',
            wasteKg: (data['total_waste_kg'] as num?)?.toDouble() ?? 0,
            stopOrder: 1,
          ),
        ];
      }
    }

    if (data['vehicle_lat'] != null) Session.vehicleLat = (data['vehicle_lat'] as num).toDouble();
    if (data['vehicle_lng'] != null) Session.vehicleLng = (data['vehicle_lng'] as num).toDouble();
  }
}

final routeProvider = NotifierProvider<RouteNotifier, RouteState>(RouteNotifier.new);
