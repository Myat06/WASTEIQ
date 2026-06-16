import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Simple JSON cache backed by SharedPreferences.
/// Each key stores a JSON envelope with "data" and "cached_at" fields.
class CacheService {
  static const _prefix = 'cache_';

  static Future<void> write(String key, dynamic data) async {
    final prefs = await SharedPreferences.getInstance();
    final envelope = jsonEncode({
      'data': data,
      'cached_at': DateTime.now().toIso8601String(),
    });
    await prefs.setString('$_prefix$key', envelope);
  }

  static Future<CacheResult?> read(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_prefix$key');
    if (raw == null) return null;
    try {
      final envelope = jsonDecode(raw) as Map<String, dynamic>;
      final cachedAt = DateTime.parse(envelope['cached_at'] as String);
      return CacheResult(data: envelope['data'], cachedAt: cachedAt);
    } catch (_) {
      return null;
    }
  }

  static Future<void> clear(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('$_prefix$key');
  }

  static Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_prefix)).toList();
    for (final k in keys) { await prefs.remove(k); }
  }
}

class CacheResult {
  final dynamic data;
  final DateTime cachedAt;

  const CacheResult({required this.data, required this.cachedAt});

  /// Human-readable age: "5m ago", "2h ago", "1d ago"
  String get ageLabel {
    final diff = DateTime.now().difference(cachedAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  /// True if cache is fresh enough to trust (under 6 hours)
  bool get isFresh => DateTime.now().difference(cachedAt).inHours < 6;
}
