import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/report_provider.dart';
import '../services/session.dart';
import 'history_screen.dart';

const List<Map<String, String>> _reportTypes = [
  {'value': 'overflow', 'label': 'TPS Overflow'},
  {'value': 'blocked', 'label': 'Road Blocked'},
  {'value': 'extra_waste', 'label': 'Extra Waste Found'},
  {'value': 'completed', 'label': 'Route Completed'},
  {'value': 'vehicle_issue', 'label': 'Vehicle Issue'},
  {'value': 'other', 'label': 'Other'},
];

class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  final _descCtrl = TextEditingController();

  @override
  void dispose() {
    _descCtrl.dispose();
    // Reset report state when leaving so next open starts fresh
    ref.read(reportProvider.notifier).reset();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final report = ref.watch(reportProvider);

    if (report.status == ReportStatus.success) {
      return _buildSuccess(context);
    }

    final isSubmitting = report.status == ReportStatus.submitting;
    final isLocating = report.status == ReportStatus.locating;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text('File Field Report', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Driver info banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.person_outline, color: Color(0xFF1D9E75), size: 20),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(Session.driverName ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      Text(Session.assignedZoneName ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Report type
            const Text('Report Type', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: report.reportType,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  isExpanded: true,
                  items: _reportTypes.map((t) => DropdownMenuItem(
                    value: t['value'],
                    child: Text(t['label']!),
                  )).toList(),
                  onChanged: isSubmitting ? null : (v) => ref.read(reportProvider.notifier).setReportType(v!),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Description
            const Text('Description', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _descCtrl,
              style: const TextStyle(color: Colors.white),
              maxLines: 4,
              enabled: !isSubmitting,
              decoration: InputDecoration(
                hintText: 'Describe the situation...',
                hintStyle: const TextStyle(color: Color(0xFF475569)),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF334155))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1D9E75))),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            const SizedBox(height: 16),

            // GPS
            const Text('GPS Location', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Text(
                      report.latitude != null
                          ? '${report.latitude!.toStringAsFixed(4)}, ${report.longitude!.toStringAsFixed(4)}'
                          : 'Not captured',
                      style: TextStyle(
                        color: report.latitude != null ? const Color(0xFF1D9E75) : const Color(0xFF475569),
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                SizedBox(
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: (isLocating || isSubmitting) ? null : () => ref.read(reportProvider.notifier).captureLocation(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF1D9E75),
                      side: const BorderSide(color: Color(0xFF1D9E75)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: isLocating
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1D9E75)))
                        : const Icon(Icons.my_location, size: 18),
                    label: const Text('Locate'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Photo attachment
            const Text('Photo (optional)', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (report.photo != null)
              _PhotoPreview(
                path: report.photo!.path,
                onRemove: isSubmitting ? null : () => ref.read(reportProvider.notifier).removePhoto(),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: _PhotoButton(
                      icon: Icons.camera_alt_outlined,
                      label: 'Camera',
                      onTap: isSubmitting ? null : () => ref.read(reportProvider.notifier).pickPhoto(ImageSource.camera),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PhotoButton(
                      icon: Icons.photo_library_outlined,
                      label: 'Gallery',
                      onTap: isSubmitting ? null : () => ref.read(reportProvider.notifier).pickPhoto(ImageSource.gallery),
                    ),
                  ),
                ],
              ),

            if (report.error != null) ...[
              const SizedBox(height: 12),
              Text(report.error!, style: const TextStyle(color: Color(0xFFE24B4A), fontSize: 13)),
            ],

            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: isSubmitting ? null : () => ref.read(reportProvider.notifier).submit(_descCtrl.text),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1D9E75),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: isSubmitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Submit Report', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccess(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72, height: 72,
                decoration: const BoxDecoration(color: Color(0xFF1D9E75), shape: BoxShape.circle),
                child: const Icon(Icons.check, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 24),
              const Text('Report Submitted', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              const Text(
                'Your field report has been sent to the operations center.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1D9E75),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Back to Routes', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity, height: 48,
                child: OutlinedButton(
                  onPressed: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const HistoryScreen()),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF334155)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('View My Reports', style: TextStyle(color: Color(0xFF94A3B8))),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PhotoPreview extends StatelessWidget {
  final String path;
  final VoidCallback? onRemove;
  const _PhotoPreview({required this.path, this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Image.file(
            File(path),
            height: 160,
            width: double.infinity,
            fit: BoxFit.cover,
          ),
        ),
        Positioned(
          top: 8, right: 8,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
              child: const Icon(Icons.close, color: Colors.white, size: 18),
            ),
          ),
        ),
      ],
    );
  }
}

class _PhotoButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _PhotoButton({required this.icon, required this.label, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 72,
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: onTap != null ? const Color(0xFF1D9E75) : const Color(0xFF334155), size: 22),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: onTap != null ? const Color(0xFF94A3B8) : const Color(0xFF334155), fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
