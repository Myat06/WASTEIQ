import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../providers/predictions_provider.dart';
import '../providers/route_polyline_provider.dart';
import '../services/api_service.dart';
import '../services/session.dart';
import '../widgets/offline_banner.dart';

const _distanceCalc = Distance();
const int _nearbyCount = 5;
const double _nearbyRadiusM = 900; // real-world circle radius for nearby zones

const Map<String, Color> _riskColors = {
  'critical': Color(0xFFE24B4A),
  'high': Color(0xFFEF9F27),
  'medium': Color(0xFFF59E0B),
  'low': Color(0xFF1D9E75),
};

class MapScreen extends ConsumerWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final heatmapAsync = ref.watch(heatmapProvider);
    final routeAsync = ref.watch(routePolylineProvider);

    final hasActiveRoute = Session.activeZones.isNotEmpty;
    final hasVehiclePos = Session.vehicleLat != null && Session.vehicleLng != null;

    final mapCenter = hasActiveRoute
        ? LatLng(Session.activeZones.first.lat, Session.activeZones.first.lng)
        : const LatLng(-6.2088, 106.8456);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Zone Map', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            if (hasActiveRoute)
              Text(
                '${Session.activeZones.length} stops — ${Session.activeZones.map((z) => z.name).join(' → ')}',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF1D9E75), fontSize: 11, fontWeight: FontWeight.w600),
              )
            else
              const Text('All zones', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF1D9E75)),
            onPressed: () {
              ref.invalidate(heatmapProvider);
              ref.invalidate(routePolylineProvider);
            },
          ),
        ],
      ),
      body: heatmapAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF1D9E75))),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Failed to load map', style: TextStyle(color: Color(0xFF94A3B8))),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(heatmapProvider),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1D9E75)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (zones) {
          final offlineAge = ref.watch(heatmapOfflineProvider);
          final osrmRoute = routeAsync.valueOrNull;

          // Compute reference point: driver position or Jakarta center
          final refPoint = hasVehiclePos
              ? LatLng(Session.vehicleLat!, Session.vehicleLng!)
              : const LatLng(-6.2088, 106.8456);

          // Parse zones and compute distances from ref point
          final parsed = zones
              .map((z) {
                final lat = (z['lat'] as num?)?.toDouble() ?? (z['latitude'] as num?)?.toDouble();
                final lng = (z['lng'] as num?)?.toDouble() ?? (z['longitude'] as num?)?.toDouble();
                if (lat == null || lng == null) return null;
                final pos = LatLng(lat, lng);
                final distM = _distanceCalc.as(LengthUnit.Meter, refPoint, pos);
                return _ZoneData(
                  id: z['zone_id'] as int? ?? z['id'] as int? ?? 0,
                  name: z['name'] as String? ?? '',
                  pos: pos,
                  risk: z['risk_level'] as String? ?? 'low',
                  distM: distM,
                );
              })
              .whereType<_ZoneData>()
              .toList()
            ..sort((a, b) => a.distM.compareTo(b.distM));

          final nearbyZones = parsed.take(_nearbyCount).toList();
          final farZones = parsed.skip(_nearbyCount).toList();

          return Stack(
            children: [
              if (offlineAge != null)
                Positioned(
                  top: 0, left: 0, right: 0,
                  child: OfflineBanner(cachedAt: offlineAge),
                ),
              FlutterMap(
                options: MapOptions(
                  initialCenter: mapCenter,
                  initialZoom: hasActiveRoute ? 13 : 11,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.wasteiq.mobile',
                  ),

                  // Road route polyline from OSRM
                  if (osrmRoute != null && osrmRoute.points.isNotEmpty)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: osrmRoute.points,
                          color: Colors.black.withValues(alpha: 0.3),
                          strokeWidth: 7,
                        ),
                        Polyline(
                          points: osrmRoute.points,
                          color: const Color(0xFF1D9E75),
                          strokeWidth: 5,
                        ),
                        Polyline(
                          points: osrmRoute.points,
                          color: Colors.white.withValues(alpha: 0.6),
                          strokeWidth: 2,
                          pattern: StrokePattern.dashed(segments: [6, 14]),
                        ),
                      ],
                    )
                  else if (hasActiveRoute && hasVehiclePos)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: [
                            LatLng(Session.vehicleLat!, Session.vehicleLng!),
                            LatLng(Session.activeZoneLat!, Session.activeZoneLng!),
                          ],
                          color: const Color(0xFF1D9E75).withValues(alpha: 0.5),
                          strokeWidth: 3,
                          pattern: StrokePattern.dashed(segments: [12, 6]),
                        ),
                      ],
                    ),

                  // Far zones — small background dots
                  CircleLayer(
                    circles: farZones.map((z) {
                      final color = _riskColors[z.risk] ?? Colors.grey;
                      return CircleMarker(
                        point: z.pos,
                        radius: 8,
                        color: color.withValues(alpha: 0.15),
                        borderColor: color.withValues(alpha: 0.4),
                        borderStrokeWidth: 1,
                      );
                    }).toList(),
                  ),

                  // Nearby zones — real-world km radius circles
                  CircleLayer(
                    circles: nearbyZones.map((z) {
                      final color = _riskColors[z.risk] ?? Colors.grey;
                      final isAssigned = z.id == Session.activeZoneId;
                      return CircleMarker(
                        point: z.pos,
                        radius: _nearbyRadiusM,
                        useRadiusInMeter: true,
                        color: color.withValues(alpha: isAssigned ? 0.35 : 0.2),
                        borderColor: isAssigned ? Colors.white : color,
                        borderStrokeWidth: isAssigned ? 2.5 : 1.5,
                      );
                    }).toList(),
                  ),

                  // Pulse rings for each assigned stop
                  if (Session.activeZones.isNotEmpty)
                    CircleLayer(
                      circles: Session.activeZones.map((az) {
                        final color = _riskColors[az.risk] ?? Colors.white;
                        return CircleMarker(
                          point: LatLng(az.lat, az.lng),
                          radius: _nearbyRadiusM * 1.4,
                          useRadiusInMeter: true,
                          color: color.withValues(alpha: 0.07),
                          borderColor: color.withValues(alpha: 0.3),
                          borderStrokeWidth: 1,
                        );
                      }).toList(),
                    ),

                  // Labels for nearby non-stop zones (name + distance)
                  MarkerLayer(
                    markers: nearbyZones
                        .where((z) => !Session.activeZones.any((az) => az.id == z.id))
                        .map((z) {
                      final color = _riskColors[z.risk] ?? Colors.grey;
                      final distLabel = z.distM >= 1000
                          ? '${(z.distM / 1000).toStringAsFixed(1)} km'
                          : '${z.distM.round()} m';
                      return Marker(
                        point: z.pos,
                        width: 120,
                        height: 40,
                        alignment: const Alignment(0, -2.2),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1E293B).withValues(alpha: 0.88),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: color, width: 1),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(z.name, overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10)),
                              Text(distLabel, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  // Numbered stop pins for assigned zones
                  if (Session.activeZones.isNotEmpty)
                    MarkerLayer(
                      markers: Session.activeZones.map((az) {
                        final color = _riskColors[az.risk] ?? Colors.white;
                        return Marker(
                          point: LatLng(az.lat, az.lng),
                          width: 150,
                          height: 64,
                          alignment: const Alignment(0, -2.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: color, width: 1.5),
                                  boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 6)],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 18, height: 18,
                                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                      child: Center(
                                        child: Text('${az.stopOrder}',
                                            style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.w800)),
                                      ),
                                    ),
                                    const SizedBox(width: 5),
                                    Flexible(
                                      child: Text(az.name, overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(Icons.location_pin, color: color, size: 18),
                            ],
                          ),
                        );
                      }).toList(),
                    ),

                  // Vehicle marker
                  if (hasVehiclePos)
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: LatLng(Session.vehicleLat!, Session.vehicleLng!),
                          width: 40,
                          height: 40,
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF1D9E75),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2.5),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF1D9E75).withValues(alpha: 0.6),
                                  blurRadius: 10,
                                  spreadRadius: 3,
                                ),
                              ],
                            ),
                            child: const Icon(Icons.local_shipping, color: Colors.white, size: 16),
                          ),
                        ),
                      ],
                    ),
                ],
              ),

              // Route loading indicator (top-right corner)
              if (hasActiveRoute && routeAsync.isLoading)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1D9E75))),
                        SizedBox(width: 6),
                        Text('Calculating route...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
      bottomSheet: _buildBottom(hasActiveRoute, routeAsync.valueOrNull),
    );
  }

  Widget _buildBottom(bool hasActiveRoute, OsrmRoute? osrmRoute) {
    if (hasActiveRoute && osrmRoute != null) {
      final stopCount = Session.activeZones.length;
      return Container(
        color: const Color(0xFF1E293B),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF1D9E75).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.navigation, color: Color(0xFF1D9E75), size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(osrmRoute.distanceLabel,
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(width: 8),
                      Text('ETA: ${osrmRoute.etaLabel}',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                  Text(
                    '$stopCount stops · ${Session.activeZones.map((z) => z.name).join(' → ')}',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                  ),
                ],
              ),
            ),
            // Worst risk badge
            if (Session.activeRiskLevel != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: (_riskColors[Session.activeRiskLevel!] ?? Colors.grey).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: _riskColors[Session.activeRiskLevel!] ?? Colors.grey),
                ),
                child: Text(
                  Session.activeRiskLevel![0].toUpperCase() + Session.activeRiskLevel!.substring(1),
                  style: TextStyle(color: _riskColors[Session.activeRiskLevel!] ?? Colors.grey,
                      fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
          ],
        ),
      );
    }

    // Default legend
    return Container(
      color: const Color(0xFF1E293B),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          ..._riskColors.entries.map((e) => Row(
            children: [
              Container(width: 10, height: 10, decoration: BoxDecoration(color: e.value, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Text(e.key[0].toUpperCase() + e.key.substring(1), style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            ],
          )),
          Row(
            children: [
              Container(
                width: 14, height: 14,
                decoration: BoxDecoration(
                  color: const Color(0xFF1D9E75),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: const Icon(Icons.local_shipping, color: Colors.white, size: 7),
              ),
              const SizedBox(width: 4),
              const Text('Truck', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}

class _ZoneData {
  final int id;
  final String name;
  final LatLng pos;
  final String risk;
  final double distM;
  const _ZoneData({required this.id, required this.name, required this.pos, required this.risk, required this.distM});
}
