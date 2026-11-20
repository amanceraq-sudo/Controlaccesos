/// Configuración del backend.
///
/// En Vercel NO hay Socket.IO persistente.
/// Usa la URL del API Node (Render/Railway/local) para REST + sockets.
///
/// Build:
/// flutter build apk --dart-define=API_BASE_URL=https://TU-API.onrender.com
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Cambia esto a tu API con Socket.IO (Render). Mientras tanto usa Vercel solo para REST.
    defaultValue: 'https://controlaccesos-one.vercel.app',
  );

  static String get apiUrl => '$apiBaseUrl/api';

  /// Misma host que el API Node (Socket.IO vive en la raíz del servidor).
  static String get socketUrl => apiBaseUrl;

  static const Duration locationInterval = Duration(seconds: 3);
  static const int distanceFilterMeters = 5;
}
