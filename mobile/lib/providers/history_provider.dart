import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';
import '../services/session.dart';

final historyOfflineProvider = StateProvider<String?>((ref) => null);

final historyProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  if (Session.driverId == null) return [];
  final cacheKey = 'history_${Session.driverId}';
  try {
    final data = await ApiService.getDriverReports(Session.driverId!);
    final list = data.cast<Map<String, dynamic>>();
    await CacheService.write(cacheKey, list);
    ref.read(historyOfflineProvider.notifier).state = null;
    return list;
  } catch (_) {
    final cached = await CacheService.read(cacheKey);
    if (cached != null) {
      ref.read(historyOfflineProvider.notifier).state = cached.ageLabel;
      return (cached.data as List).cast<Map<String, dynamic>>();
    }
    rethrow;
  }
});
