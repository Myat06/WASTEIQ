import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/notification_service.dart';
import '../services/session.dart';

// Whether last fetch was from cache (so screens can show offline banner)
final predictionsOfflineProvider = StateProvider<String?>((ref) => null);
final heatmapOfflineProvider = StateProvider<String?>((ref) => null);

// Sorted predictions for the assigned zone — with offline fallback
final predictionsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final cacheKey = 'predictions_${Session.assignedZoneId ?? "all"}';
  try {
    final data = await ApiService.getPredictions(
      zone: Session.assignedZoneId?.toString(),
    );
    final list = data.cast<Map<String, dynamic>>();
    const order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3};
    list.sort((a, b) =>
        (order[a['risk_level']] ?? 4).compareTo(order[b['risk_level']] ?? 4));
    // Save to cache
    await CacheService.write(cacheKey, list);
    ref.read(predictionsOfflineProvider.notifier).state = null;
    // Fire notification for critical zones
    await NotificationService.checkAndNotifyCritical(list);
    return list;
  } catch (_) {
    // Network failed — try cache
    final cached = await CacheService.read(cacheKey);
    if (cached != null) {
      ref.read(predictionsOfflineProvider.notifier).state = cached.ageLabel;
      return (cached.data as List).cast<Map<String, dynamic>>();
    }
    rethrow;
  }
});

// Heatmap for all zones (used on map screen) — with offline fallback
final heatmapProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  const cacheKey = 'heatmap';
  try {
    final data = await ApiService.getHeatmap();
    final list = data.cast<Map<String, dynamic>>();
    await CacheService.write(cacheKey, list);
    ref.read(heatmapOfflineProvider.notifier).state = null;
    return list;
  } catch (_) {
    final cached = await CacheService.read(cacheKey);
    if (cached != null) {
      ref.read(heatmapOfflineProvider.notifier).state = cached.ageLabel;
      return (cached.data as List).cast<Map<String, dynamic>>();
    }
    rethrow;
  }
});
