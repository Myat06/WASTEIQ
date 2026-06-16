import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/session.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthState {
  final AuthStatus status;
  final String? error;

  const AuthState({this.status = AuthStatus.initial, this.error});

  AuthState copyWith({AuthStatus? status, String? error}) =>
      AuthState(status: status ?? this.status, error: error ?? this.error);
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  Future<void> checkSession() async {
    state = state.copyWith(status: AuthStatus.loading);
    final loggedIn = await Session.load();
    state = state.copyWith(
      status: loggedIn ? AuthStatus.authenticated : AuthStatus.unauthenticated,
    );
  }

  Future<void> login(String employeeId) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final drivers = await ApiService.getDrivers();
      final match = drivers.cast<Map<String, dynamic>>().firstWhere(
        (d) => d['employee_id'].toString().toLowerCase() == employeeId.toLowerCase(),
        orElse: () => {},
      );

      if (match.isEmpty) {
        state = AuthState(
          status: AuthStatus.error,
          error: 'Employee ID not found. Try DLH-2001 to DLH-2010',
        );
        return;
      }

      Session.driverId = match['id'] as int?;
      Session.driverName = match['name'] as String?;
      Session.employeeId = match['employee_id'] as String?;
      Session.assignedZoneId = match['assigned_zone'] as int?;
      Session.assignedZoneName = match['zone_name'] as String? ?? '';
      // Store vehicle GPS so route request can use it
      Session.vehicleLat = (match['vehicle_lat'] as num?)?.toDouble();
      Session.vehicleLng = (match['vehicle_lng'] as num?)?.toDouble();
      await Session.save();

      state = state.copyWith(status: AuthStatus.authenticated);
    } catch (_) {
      state = AuthState(
        status: AuthStatus.error,
        error: 'Cannot connect to server. Is the backend running?',
      );
    }
  }

  Future<void> logout() async {
    await Session.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
