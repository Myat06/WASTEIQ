import 'package:flutter/material.dart';

class OfflineBanner extends StatelessWidget {
  final String cachedAt;
  const OfflineBanner({super.key, required this.cachedAt});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: const Color(0xFF7C3AED),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: Colors.white, size: 14),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Offline — showing cached data from $cachedAt',
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
