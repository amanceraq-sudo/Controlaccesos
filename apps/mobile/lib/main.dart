import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/tracking_screen.dart';
import 'services/api_service.dart';
import 'services/socket_service.dart';
import 'services/location_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AccesoVivoApp());
}

class AccesoVivoApp extends StatefulWidget {
  const AccesoVivoApp({super.key});

  @override
  State<AccesoVivoApp> createState() => _AccesoVivoAppState();
}

class _AccesoVivoAppState extends State<AccesoVivoApp> {
  final api = ApiService();
  final socket = SocketService();
  final location = LocationService();

  @override
  void dispose() {
    socket.disconnect();
    location.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AccesoVivo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3D9B84),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: api.token == null
          ? LoginScreen(
              api: api,
              onLoggedIn: () => setState(() {}),
            )
          : TrackingScreen(
              api: api,
              socket: socket,
              location: location,
              onLogout: () async {
                await location.stop();
                socket.disconnect();
                api.token = null;
                api.user = null;
                setState(() {});
              },
            ),
    );
  }
}
