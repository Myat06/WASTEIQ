import 'package:flutter/material.dart';

const Map<String, Color> riskColors = {
  'critical': Color(0xFFE24B4A),
  'high': Color(0xFFEF9F27),
  'medium': Color(0xFFF59E0B),
  'low': Color(0xFF1D9E75),
};

const Map<String, Color> riskBgColors = {
  'critical': Color(0xFFFCEBEB),
  'high': Color(0xFFFEF3E2),
  'medium': Color(0xFFFEFAE8),
  'low': Color(0xFFEAF5EE),
};

class RiskBadge extends StatelessWidget {
  final String level;
  final bool large;

  const RiskBadge({super.key, required this.level, this.large = false});

  @override
  Widget build(BuildContext context) {
    final color = riskColors[level] ?? Colors.grey;
    final bg = riskBgColors[level] ?? const Color(0xFFF0F0F0);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 12 : 8,
        vertical: large ? 4 : 2,
      ),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: color.withValues(alpha: 0.6)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        level.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: large ? 13 : 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
