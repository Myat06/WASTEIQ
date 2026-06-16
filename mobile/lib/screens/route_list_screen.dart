import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../providers/route_provider.dart';
import '../services/session.dart';
import '../widgets/risk_badge.dart';
import 'map_screen.dart';
import 'report_screen.dart';
import 'history_screen.dart';

const Map<String, Color> _riskColors = {
  'critical': Color(0xFFE24B4A),
  'high': Color(0xFFEF9F27),
  'medium': Color(0xFFF59E0B),
  'low': Color(0xFF1D9E75),
};

class RouteListScreen extends ConsumerStatefulWidget {
  const RouteListScreen({super.key});

  @override
  ConsumerState<RouteListScreen> createState() => _RouteListScreenState();
}

class _RouteListScreenState extends ConsumerState<RouteListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(routeProvider.notifier).checkMyRoute());
  }

  @override
  Widget build(BuildContext context) {
    final routeState = ref.watch(routeProvider);

    if (routeState.status == RouteStatus.completed) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) ref.read(routeProvider.notifier).resetAfterCompletion();
        });
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Route', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            Text(Session.driverName ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.map_outlined, color: Color(0xFF1D9E75)),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.history, color: Color(0xFF64748B)),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HistoryScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF64748B)),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: _buildBody(routeState),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportScreen())),
        backgroundColor: const Color(0xFF1D9E75),
        icon: const Icon(Icons.report_outlined),
        label: const Text('File Report'),
      ),
    );
  }

  Widget _buildBody(RouteState routeState) {
    switch (routeState.status) {
      case RouteStatus.initial:
      case RouteStatus.loading:
        return const Center(child: CircularProgressIndicator(color: Color(0xFF1D9E75)));

      case RouteStatus.completing:
        return const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Color(0xFF1D9E75)),
              SizedBox(height: 16),
              Text('Completing route...', style: TextStyle(color: Color(0xFF94A3B8))),
            ],
          ),
        );

      case RouteStatus.completed:
        return _CompletionView(
          message: routeState.completionMessage ?? '',
          cooldownHours: routeState.cooldownHours ?? 4,
        );

      case RouteStatus.noRoute:
        return _NoRouteView(error: routeState.error);

      case RouteStatus.active:
        return _ActiveRouteView();

      case RouteStatus.error:
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off, color: Color(0xFF64748B), size: 48),
              const SizedBox(height: 16),
              const Text('Cannot connect to server', style: TextStyle(color: Color(0xFF94A3B8))),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.read(routeProvider.notifier).checkMyRoute(),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1D9E75)),
                child: const Text('Retry'),
              ),
            ],
          ),
        );
    }
  }
}

// ── No active route ───────────────────────────────────────────────────────────

class _NoRouteView extends ConsumerWidget {
  final String? error;
  const _NoRouteView({this.error});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              children: [
                const Icon(Icons.route, color: Color(0xFF1D9E75), size: 64),
                const SizedBox(height: 20),
                const Text(
                  'No Active Route',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Press the button below and the system will assign you the nearest high-priority zone based on your vehicle location.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 14, height: 1.5),
                ),
                if (error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE24B4A).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE24B4A).withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFFE24B4A), fontSize: 13),
                    ),
                  ),
                ],
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => ref.read(routeProvider.notifier).requestRoute(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1D9E75),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.my_location, color: Colors.white),
                    label: const Text(
                      'Get Route',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.info_outline, color: Color(0xFF475569), size: 14),
              const SizedBox(width: 6),
              Text(
                '${Session.employeeId ?? ''}  •  ${Session.vehicleLat != null ? '${Session.vehicleLat!.toStringAsFixed(4)}, ${Session.vehicleLng!.toStringAsFixed(4)}' : 'Location loading...'}',
                style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Active route view ─────────────────────────────────────────────────────────

class _ActiveRouteView extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final risk = Session.activeRiskLevel ?? 'low';
    final riskColor = _riskColors[risk] ?? const Color(0xFF1D9E75);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: riskColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: riskColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.circle, color: riskColor, size: 8),
                const SizedBox(width: 6),
                Text(
                  'ACTIVE ASSIGNMENT',
                  style: TextStyle(color: riskColor, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: riskColor.withValues(alpha: 0.5), width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            Session.activeZoneName ?? 'Unknown Zone',
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${Session.activeZoneMunicipality ?? ''} Jakarta',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                    RiskBadge(level: risk),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(color: Color(0xFF334155)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _StatTile(
                      icon: Icons.delete_outline,
                      label: 'Est. Waste',
                      value: '${(Session.activeWasteKg ?? 0).toStringAsFixed(0)} kg',
                      color: riskColor,
                    ),
                    const SizedBox(width: 12),
                    _StatTile(
                      icon: Icons.people_outline,
                      label: 'Workers',
                      value: '${Session.activeWorkersNeeded ?? '-'}',
                      color: const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 12),
                    _StatTile(
                      icon: Icons.near_me_outlined,
                      label: 'Distance',
                      value: Session.activeDistanceKm != null
                          ? '${Session.activeDistanceKm!.toStringAsFixed(1)} km'
                          : '—',
                      color: const Color(0xFF64748B),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF334155)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.map_outlined, color: Color(0xFF1D9E75)),
              label: const Text('View on Map', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15)),
            ),
          ),
          const SizedBox(height: 12),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _confirmComplete(context, ref),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1D9E75),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.check_circle_outline, color: Colors.white),
              label: const Text('Complete Route', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SYSTEM INFO',
                  style: TextStyle(color: Color(0xFF475569), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                _InfoRow(label: 'Assignment ID', value: '#${Session.activeRouteId ?? '-'}'),
                _InfoRow(label: 'Vehicle ID', value: Session.employeeId ?? '-'),
                _InfoRow(
                  label: 'Zone cooldown after completion',
                  value: (risk == 'critical' || risk == 'high') ? '4 hours' : '6 hours',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _confirmComplete(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Complete Route?', style: TextStyle(color: Colors.white)),
        content: Text(
          'Confirm that ${Session.activeZoneName ?? 'this zone'} has been cleaned. The zone will go on cooldown and be reassigned to another driver later.',
          style: const TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(routeProvider.notifier).completeRoute();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1D9E75)),
            child: const Text('Confirm', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}

// ── Completion success ────────────────────────────────────────────────────────

class _CompletionView extends StatelessWidget {
  final String message;
  final int cooldownHours;
  const _CompletionView({required this.message, required this.cooldownHours});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(color: Color(0xFF1D9E75), shape: BoxShape.circle),
              child: const Icon(Icons.check, color: Colors.white, size: 48),
            ),
            const SizedBox(height: 24),
            const Text('Route Completed!', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 15, height: 1.5)),
            const SizedBox(height: 8),
            const Text('Returning in 3s...', style: TextStyle(color: Color(0xFF475569), fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────────────────────

class _StatTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _StatTile({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
          Text(value, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
