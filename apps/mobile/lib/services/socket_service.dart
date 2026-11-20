import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config.dart';

typedef LocationAck = void Function(Map<String, dynamic> data);

class SocketService {
  io.Socket? _socket;
  bool get connected => _socket?.connected ?? false;

  void connect({
    required String token,
    void Function()? onConnected,
    void Function(String message)? onError,
    void Function(Map<String, dynamic> data)? onServerEvent,
  }) {
    disconnect();

    _socket = io.io(
      AppConfig.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setPath('/socket.io')
          .setAuth({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(20)
          .setReconnectionDelay(1500)
          .build(),
    );

    _socket!
      ..onConnect((_) => onConnected?.call())
      ..onDisconnect((_) => onError?.call('Socket desconectado'))
      ..onConnectError((err) => onError?.call('Socket error: $err'))
      ..on('connected', (data) {
        if (data is Map) {
          onServerEvent?.call(Map<String, dynamic>.from(data));
        }
      })
      ..on('geofence:enter', (data) {
        if (data is Map) {
          onServerEvent?.call({
            'type': 'geofence:enter',
            ...Map<String, dynamic>.from(data),
          });
        }
      })
      ..on('geofence:exit', (data) {
        if (data is Map) {
          onServerEvent?.call({
            'type': 'geofence:exit',
            ...Map<String, dynamic>.from(data),
          });
        }
      });
  }

  void emitLocation({
    required double lat,
    required double lng,
    double? accuracy,
    double? heading,
    double? speed,
    LocationAck? onAck,
  }) {
    final payload = {
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      'heading': heading,
      'speed': speed,
      'source': 'mobile',
    };

    if (_socket == null || !connected) {
      onAck?.call({'ok': false, 'error': 'Socket no conectado'});
      return;
    }

    _socket!.emitWithAck('location:update', payload, ack: (data) {
      if (data is Map) {
        onAck?.call(Map<String, dynamic>.from(data));
      } else {
        onAck?.call({'ok': true});
      }
    });
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
