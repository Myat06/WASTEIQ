import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/route_list_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.init();
  runApp(const ProviderScope(child: WasteIQApp()));
}

class WasteIQApp extends ConsumerWidget {
  const WasteIQApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: 'WasteIQ Driver',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF1D9E75),
          surface: Color(0xFF1E293B),
          onSurface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        useMaterial3: true,
      ),
      home: const _AppGate(),
    );
  }
}

class _AppGate extends ConsumerStatefulWidget {
  const _AppGate();

  @override
  ConsumerState<_AppGate> createState() => _AppGateState();
}

class _AppGateState extends ConsumerState<_AppGate> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authProvider.notifier).checkSession());
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return switch (auth.status) {
      AuthStatus.initial || AuthStatus.loading => const Scaffold(
          backgroundColor: Color(0xFF0F172A),
          body: Center(child: CircularProgressIndicator(color: Color(0xFF1D9E75))),
        ),
      AuthStatus.authenticated => const RouteListScreen(),
      _ => const LoginScreen(),
    };
  }
}
