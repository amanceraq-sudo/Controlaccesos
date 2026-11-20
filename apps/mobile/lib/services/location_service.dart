import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config.dart';

class LocationService {
  StreamSubscription<Position>? _sub;

  Future<bool> ensurePermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Activa el GPS del dispositivo');
    }

    var permission = await Permission.locationWhenInUse.status;
    if (permission.isDenied) {
      permission = await Permission.locationWhenInUse.request();
    }

    if (permission.isPermanentlyDenied) {
      await openAppSettings();
      throw Exception('Permiso de ubicación denegado permanentemente');
    }

    if (!permission.isGranted) {
      throw Exception('Se necesita permiso de ubicación');
    }

    return true;
  }

  Future<Position> current() {
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
      ),
    );
  }

  Future<void> start(void Function(Position position) onPosition) async {
    await ensurePermission();
    await stop();

    const settings = LocationSettings(
      accuracy: LocationAccuracy.bestForNavigation,
      distanceFilter: AppConfig.distanceFilterMeters,
    );

    _sub = Geolocator.getPositionStream(locationSettings: settings).listen(onPosition);
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
  }
}
