import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

const String baseUrl = 'http://127.0.0.1:8000/api';         // iOS simulator
// const String baseUrl = 'http://10.0.2.2:8000/api';     // Android emulator
// const String baseUrl = 'http://10.9.10.55:8000/api';   // Real device (Mac WiFi IP)

const _timeout = Duration(seconds: 10);

class ApiService {
  static Future<List<dynamic>> getDrivers() async {
    final res = await http.get(Uri.parse('$baseUrl/drivers/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load drivers');
  }

  static Future<List<dynamic>> getZones() async {
    final res = await http.get(Uri.parse('$baseUrl/zones/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load zones');
  }

  static Future<List<dynamic>> getPredictions({String? zone, String? date}) async {
    var url = '$baseUrl/predictions/';
    final params = <String, String>{};
    if (zone != null) params['zone'] = zone;
    if (date != null) params['date'] = date;
    if (params.isNotEmpty) url += '?${Uri(queryParameters: params).query}';
    final res = await http.get(Uri.parse(url)).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load predictions');
  }

  static Future<List<dynamic>> getHeatmap() async {
    final res = await http.get(Uri.parse('$baseUrl/predictions/heatmap/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load heatmap');
  }

  static Future<Map<String, dynamic>> submitReport({
    required int driverId,
    required int zoneId,
    required String reportType,
    required String description,
    double? latitude,
    double? longitude,
    String? photoPath,
  }) async {
    final uri = Uri.parse('$baseUrl/drivers/$driverId/report/');

    if (photoPath != null) {
      // Multipart request with photo
      final req = http.MultipartRequest('POST', uri);
      req.fields['zone'] = zoneId.toString();
      req.fields['report_type'] = reportType;
      req.fields['description'] = description;
      if (latitude != null) req.fields['latitude'] = latitude.toString();
      if (longitude != null) req.fields['longitude'] = longitude.toString();
      req.files.add(await http.MultipartFile.fromPath('photo', photoPath));
      final streamed = await req.send();
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode == 201) return jsonDecode(res.body);
      throw Exception('Failed to submit report: ${res.body}');
    } else {
      // JSON request without photo
      final body = {
        'zone': zoneId,
        'report_type': reportType,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
      };
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      if (res.statusCode == 201) return jsonDecode(res.body);
      throw Exception('Failed to submit report: ${res.body}');
    }
  }

  static Future<List<dynamic>> getDriverReports(int driverId) async {
    final res = await http.get(Uri.parse('$baseUrl/drivers/$driverId/report/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load reports');
  }

  static Future<Map<String, dynamic>> getSummary() async {
    final res = await http.get(Uri.parse('$baseUrl/reports/summary/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to load summary');
  }

  static Future<Map<String, dynamic>?> getMyRoute(int driverId) async {
    final res = await http.get(Uri.parse('$baseUrl/routes/my/?driver_id=$driverId')).timeout(_timeout);
    if (res.statusCode == 200) {
      if (res.body.isEmpty) return null;
      final body = jsonDecode(res.body);
      if (body == null) return null;
      return body as Map<String, dynamic>;
    }
    throw Exception('Failed to load route');
  }

  static Future<Map<String, dynamic>> requestRoute({
    required int driverId,
    required double vehicleLat,
    required double vehicleLng,
    int zoneCount = 3,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/routes/request/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'driver_id': driverId,
        'vehicle_lat': vehicleLat,
        'vehicle_lng': vehicleLng,
        'zone_count': zoneCount,
      }),
    ).timeout(_timeout);
    if (res.statusCode == 201) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw Exception(err['error'] ?? 'Failed to request route');
  }

  static Future<Map<String, dynamic>> completeRoute(int routeId) async {
    final res = await http.put(Uri.parse('$baseUrl/routes/$routeId/complete/')).timeout(_timeout);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception('Failed to complete route');
  }

  // ── OSRM Road Routing (free, no key) ──────────────────────────────────────

  /// Fetch road route through multiple waypoints: driver → stop1 → stop2 → ...
  /// Waypoints must be at least 2 points (from + at least one destination).
  static Future<OsrmRoute> fetchRoadRoute({required List<LatLng> waypoints}) async {
    assert(waypoints.length >= 2);
    final coords = waypoints.map((p) => '${p.longitude},${p.latitude}').join(';');
    final url = 'http://router.project-osrm.org/route/v1/driving/$coords?overview=full&geometries=geojson';
    final res = await http.get(Uri.parse(url));
    if (res.statusCode != 200) throw Exception('OSRM route fetch failed');
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final route = (data['routes'] as List).first as Map<String, dynamic>;
    final points = (route['geometry']['coordinates'] as List)
        .map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
        .toList();
    return OsrmRoute(
      points: points,
      distanceM: (route['distance'] as num).toDouble(),
      durationS: (route['duration'] as num).toDouble(),
    );
  }
}

class OsrmRoute {
  final List<LatLng> points;
  final double distanceM;
  final double durationS;
  const OsrmRoute({required this.points, required this.distanceM, required this.durationS});

  String get distanceLabel {
    if (distanceM >= 1000) return '${(distanceM / 1000).toStringAsFixed(1)} km';
    return '${distanceM.round()} m';
  }

  String get etaLabel {
    final minutes = (durationS / 60).ceil();
    if (minutes >= 60) return '${(minutes / 60).floor()}h ${minutes % 60}m';
    return '$minutes min';
  }
}
