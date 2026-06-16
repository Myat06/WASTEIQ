import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../services/api_service.dart';
import '../services/session.dart';

final routePolylineProvider = FutureProvider.autoDispose<OsrmRoute?>((ref) async {
  final hasZones = Session.activeZones.isNotEmpty;
  final hasVehicle = Session.vehicleLat != null && Session.vehicleLng != null;
  if (!hasZones) return null;

  // Build waypoints: driver position (if known) → stop1 → stop2 → ...
  final waypoints = <LatLng>[];
  if (hasVehicle) {
    waypoints.add(LatLng(Session.vehicleLat!, Session.vehicleLng!));
  }
  for (final zone in Session.activeZones) {
    waypoints.add(LatLng(zone.lat, zone.lng));
  }

  if (waypoints.length < 2) return null;

  return ApiService.fetchRoadRoute(waypoints: waypoints);
});
