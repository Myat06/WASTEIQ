import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/history_provider.dart';
import '../widgets/offline_banner.dart';

const Map<String, String> _typeLabels = {
  'overflow': 'TPS Overflow',
  'blocked': 'Road Blocked',
  'extra_waste': 'Extra Waste Found',
  'completed': 'Route Completed',
  'vehicle_issue': 'Vehicle Issue',
  'bin_full': 'Bin Full',
  'illegal_dump': 'Illegal Dumping',
  'collection_done': 'Collection Confirmed',
  'road_blocked': 'Road Blocked',
  'other': 'Other',
};

const Map<String, IconData> _typeIcons = {
  'overflow': Icons.water_drop_outlined,
  'blocked': Icons.block_outlined,
  'extra_waste': Icons.delete_outline,
  'completed': Icons.check_circle_outline,
  'vehicle_issue': Icons.build_outlined,
  'bin_full': Icons.delete_forever_outlined,
  'illegal_dump': Icons.warning_amber_outlined,
  'collection_done': Icons.done_all,
  'road_blocked': Icons.block_outlined,
  'other': Icons.info_outline,
};

const Map<String, Color> _typeColors = {
  'overflow': Color(0xFFEF9F27),
  'blocked': Color(0xFFE24B4A),
  'extra_waste': Color(0xFFF59E0B),
  'completed': Color(0xFF1D9E75),
  'vehicle_issue': Color(0xFF64748B),
  'bin_full': Color(0xFFEF9F27),
  'illegal_dump': Color(0xFFE24B4A),
  'collection_done': Color(0xFF1D9E75),
  'road_blocked': Color(0xFFE24B4A),
  'other': Color(0xFF64748B),
};

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(historyProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('My Reports', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF1D9E75)),
            onPressed: () => ref.invalidate(historyProvider),
          ),
        ],
      ),
      body: historyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: Color(0xFF1D9E75))),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off, color: Color(0xFF64748B), size: 48),
              const SizedBox(height: 16),
              const Text('Failed to load reports', style: TextStyle(color: Color(0xFF94A3B8))),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(historyProvider),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1D9E75)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (reports) {
          final offlineAge = ref.watch(historyOfflineProvider);
          return reports.isEmpty
            ? _buildEmpty()
            : Column(
                children: [
                  if (offlineAge != null) OfflineBanner(cachedAt: offlineAge),
                  _buildStats(reports),
                  Expanded(
                    child: RefreshIndicator(
                      color: const Color(0xFF1D9E75),
                      backgroundColor: const Color(0xFF1E293B),
                      onRefresh: () async => ref.invalidate(historyProvider),
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                        itemCount: reports.length,
                        itemBuilder: (context, i) => _ReportCard(report: reports[i]),
                      ),
                    ),
                  ),
                ],
              );
        },
      ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.assignment_outlined, color: Color(0xFF334155), size: 64),
          SizedBox(height: 16),
          Text('No reports yet', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 18, fontWeight: FontWeight.w600)),
          SizedBox(height: 8),
          Text('Reports you file on the road\nwill appear here.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF475569), fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildStats(List<Map<String, dynamic>> reports) {
    final total = reports.length;
    final completed = reports.where((r) => r['report_type'] == 'completed' || r['report_type'] == 'collection_done').length;
    final issues = reports.where((r) => ['overflow', 'blocked', 'road_blocked', 'illegal_dump', 'bin_full', 'vehicle_issue'].contains(r['report_type'])).length;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          _StatChip(label: 'Total', value: '$total', color: Colors.white),
          const SizedBox(width: 1),
          _StatChip(label: 'Completed', value: '$completed', color: const Color(0xFF1D9E75)),
          const SizedBox(width: 1),
          _StatChip(label: 'Issues', value: '$issues', color: const Color(0xFFEF9F27)),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final Map<String, dynamic> report;
  const _ReportCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final type = report['report_type'] as String? ?? 'other';
    final label = _typeLabels[type] ?? type;
    final icon = _typeIcons[type] ?? Icons.info_outline;
    final color = _typeColors[type] ?? const Color(0xFF64748B);
    final zoneName = report['zone_name'] as String? ?? 'Unknown Zone';
    final description = report['description'] as String? ?? '';
    final reportedAt = report['reported_at'] as String?;
    final hasGps = report['latitude'] != null && report['longitude'] != null;

    String timeAgo = '';
    if (reportedAt != null) {
      final dt = DateTime.tryParse(reportedAt);
      if (dt != null) {
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          timeAgo = '${diff.inMinutes}m ago';
        } else if (diff.inHours < 24) {
          timeAgo = '${diff.inHours}h ago';
        } else {
          timeAgo = '${diff.inDays}d ago';
        }
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 14)),
                      Text(timeAgo, style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(zoneName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(description, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, height: 1.4)),
                  ],
                  if (hasGps) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, color: Color(0xFF334155), size: 12),
                        const SizedBox(width: 4),
                        Text(
                          '${(report['latitude'] as num).toStringAsFixed(4)}, ${(report['longitude'] as num).toStringAsFixed(4)}',
                          style: const TextStyle(color: Color(0xFF334155), fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
