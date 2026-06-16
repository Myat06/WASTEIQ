import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/cache_service.dart';

final summaryOfflineProvider = StateProvider<String?>((ref) => null);

final summaryProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  const cacheKey = 'summary';
  try {
    final data = await ApiService.getSummary();
    await CacheService.write(cacheKey, data);
    ref.read(summaryOfflineProvider.notifier).state = null;
    return data;
  } catch (_) {
    final cached = await CacheService.read(cacheKey);
    if (cached != null) {
      ref.read(summaryOfflineProvider.notifier).state = cached.ageLabel;
      return cached.data as Map<String, dynamic>;
    }
    rethrow;
  }
});
