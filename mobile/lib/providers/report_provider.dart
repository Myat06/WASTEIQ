import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/session.dart';

enum ReportStatus { idle, locating, submitting, success, error }

class ReportState {
  final ReportStatus status;
  final String reportType;
  final double? latitude;
  final double? longitude;
  final XFile? photo;
  final String? error;

  const ReportState({
    this.status = ReportStatus.idle,
    this.reportType = 'overflow',
    this.latitude,
    this.longitude,
    this.photo,
    this.error,
  });

  ReportState copyWith({
    ReportStatus? status,
    String? reportType,
    double? latitude,
    double? longitude,
    XFile? photo,
    bool clearPhoto = false,
    String? error,
  }) =>
      ReportState(
        status: status ?? this.status,
        reportType: reportType ?? this.reportType,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        photo: clearPhoto ? null : (photo ?? this.photo),
        error: error ?? this.error,
      );
}

class ReportNotifier extends Notifier<ReportState> {
  final _picker = ImagePicker();

  @override
  ReportState build() => const ReportState();

  void setReportType(String type) => state = state.copyWith(reportType: type);

  Future<void> captureLocation() async {
    state = state.copyWith(status: ReportStatus.locating, error: null);
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) {
        state = state.copyWith(status: ReportStatus.idle, error: 'Location permission denied');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      state = state.copyWith(
        status: ReportStatus.idle,
        latitude: pos.latitude,
        longitude: pos.longitude,
      );
    } catch (_) {
      state = state.copyWith(status: ReportStatus.idle, latitude: -6.2088, longitude: 106.8456);
    }
  }

  Future<void> pickPhoto(ImageSource source) async {
    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 70,
        maxWidth: 1280,
      );
      if (file != null) {
        state = state.copyWith(photo: file);
      }
    } catch (_) {
      state = state.copyWith(error: 'Could not access camera/gallery');
    }
  }

  void removePhoto() => state = state.copyWith(clearPhoto: true);

  Future<void> submit(String description) async {
    if (description.trim().isEmpty) {
      state = state.copyWith(error: 'Please enter a description');
      return;
    }
    if (Session.driverId == null || Session.assignedZoneId == null) {
      state = state.copyWith(error: 'Session expired, please log in again');
      return;
    }

    state = state.copyWith(status: ReportStatus.submitting, error: null);
    try {
      await ApiService.submitReport(
        driverId: Session.driverId!,
        zoneId: Session.assignedZoneId!,
        reportType: state.reportType,
        description: description.trim(),
        latitude: state.latitude,
        longitude: state.longitude,
        photoPath: state.photo?.path,
      );
      state = state.copyWith(status: ReportStatus.success);
    } catch (_) {
      state = state.copyWith(
        status: ReportStatus.error,
        error: 'Failed to submit report. Try again.',
      );
    }
  }

  void reset() => state = const ReportState();
}

final reportProvider = NotifierProvider<ReportNotifier, ReportState>(ReportNotifier.new);
