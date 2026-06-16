import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ActiveZone {
  final int id;
  final String name;
  final double lat;
  final double lng;
  final String municipality;
  final String risk;
  final double wasteKg;
  final int stopOrder;

  const ActiveZone({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    required this.municipality,
    required this.risk,
    required this.wasteKg,
    required this.stopOrder,
  });

  factory ActiveZone.fromJson(Map<String, dynamic> j) => ActiveZone(
        id: j['zone_id'] as int? ?? 0,
        name: j['zone_name'] as String? ?? '',
        lat: (j['zone_lat'] as num).toDouble(),
        lng: (j['zone_lng'] as num).toDouble(),
        municipality: j['zone_municipality'] as String? ?? '',
        risk: j['risk_level'] as String? ?? 'low',
        wasteKg: (j['total_waste_kg'] as num?)?.toDouble() ?? 0,
        stopOrder: j['stop_order'] as int? ?? 1,
      );

  Map<String, dynamic> toJson() => {
        'zone_id': id,
        'zone_name': name,
        'zone_lat': lat,
        'zone_lng': lng,
        'zone_municipality': municipality,
        'risk_level': risk,
        'total_waste_kg': wasteKg,
        'stop_order': stopOrder,
      };
}

class Session {
  // Auth
  static int? driverId;
  static String? driverName;
  static String? employeeId;
  static int? assignedZoneId;
  static String? assignedZoneName;

  // Vehicle GPS
  static double? vehicleLat;
  static double? vehicleLng;

  // Active route assignment
  static int? activeRouteId;
  static List<ActiveZone> activeZones = [];

  // Convenience getters — derived from first stop
  static int? get activeZoneId => activeZones.isNotEmpty ? activeZones.first.id : null;
  static String? get activeZoneName => activeZones.isNotEmpty ? activeZones.first.name : null;
  static String? get activeZoneMunicipality => activeZones.isNotEmpty ? activeZones.first.municipality : null;
  static double? get activeZoneLat => activeZones.isNotEmpty ? activeZones.first.lat : null;
  static double? get activeZoneLng => activeZones.isNotEmpty ? activeZones.first.lng : null;
  static String? get activeRiskLevel => activeZones.isNotEmpty ? activeZones.first.risk : null;
  static double? get activeWasteKg => activeZones.isNotEmpty ? activeZones.first.wasteKg : null;

  // Legacy fields kept for route_provider compatibility
  static int? activeWorkersNeeded;
  static double? activeDistanceKm;

  static Future<void> save() async {
    final prefs = await SharedPreferences.getInstance();
    if (driverId != null) await prefs.setInt('driver_id', driverId!);
    if (driverName != null) await prefs.setString('driver_name', driverName!);
    if (employeeId != null) await prefs.setString('employee_id', employeeId!);
    if (assignedZoneId != null) await prefs.setInt('zone_id', assignedZoneId!);
    if (assignedZoneName != null) await prefs.setString('zone_name', assignedZoneName!);
    if (vehicleLat != null) await prefs.setDouble('vehicle_lat', vehicleLat!);
    if (vehicleLng != null) await prefs.setDouble('vehicle_lng', vehicleLng!);
    await _saveRoute(prefs);
  }

  static Future<void> _saveRoute(SharedPreferences prefs) async {
    if (activeRouteId != null) await prefs.setInt('route_id', activeRouteId!);
    if (activeWorkersNeeded != null) await prefs.setInt('active_workers', activeWorkersNeeded!);
    if (activeDistanceKm != null) await prefs.setDouble('active_distance_km', activeDistanceKm!);
    await prefs.setString('active_zones', jsonEncode(activeZones.map((z) => z.toJson()).toList()));
  }

  static Future<bool> load() async {
    final prefs = await SharedPreferences.getInstance();
    driverId = prefs.getInt('driver_id');
    driverName = prefs.getString('driver_name');
    employeeId = prefs.getString('employee_id');
    assignedZoneId = prefs.getInt('zone_id');
    assignedZoneName = prefs.getString('zone_name');
    vehicleLat = prefs.getDouble('vehicle_lat');
    vehicleLng = prefs.getDouble('vehicle_lng');
    activeRouteId = prefs.getInt('route_id');
    activeWorkersNeeded = prefs.getInt('active_workers');
    activeDistanceKm = prefs.getDouble('active_distance_km');
    final zonesJson = prefs.getString('active_zones');
    if (zonesJson != null) {
      final list = jsonDecode(zonesJson) as List;
      activeZones = list.map((j) => ActiveZone.fromJson(j as Map<String, dynamic>)).toList();
    }
    return driverId != null;
  }

  static Future<void> clearRoute() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('route_id');
    await prefs.remove('active_zones');
    await prefs.remove('active_workers');
    await prefs.remove('active_distance_km');
    activeRouteId = null;
    activeZones = [];
    activeWorkersNeeded = null;
    activeDistanceKm = null;
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    driverId = null;
    driverName = null;
    employeeId = null;
    assignedZoneId = null;
    assignedZoneName = null;
    vehicleLat = null;
    vehicleLng = null;
    activeRouteId = null;
    activeZones = [];
    activeWorkersNeeded = null;
    activeDistanceKm = null;
  }
}
