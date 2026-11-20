import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../config.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/socket_service.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({
    super.key,
    required this.api,
    required this.socket,
    required this.location,
    required this.onLogout,
  });

  final ApiService api;
  final SocketService socket;
  final LocationService location;
  final Future<void> Function() onLogout;

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  bool tracking = false;
  bool socketOk = false;
  String status = 'Listo';
  String lastSend = '—';
  Position? position;
  final List<String> events = [];
  Timer? _heartbeat;

  @override
  void initState() {
    super.initState();
    _connectSocket();
  }

  @override
  void dispose() {
    _heartbeat?.cancel();
    super.dispose();
  }

  void _connectSocket() {
    final token = widget.api.token;
    if (token == null) return;

    setState(() => status = 'Conectando socket…');

    widget.socket.connect(
      token: token,
      onConnected: () {
        if (!mounted) return;
        setState(() {
          socketOk = true;
          status = 'Socket conectado';
        });
        _pushEvent('Socket conectado a ${AppConfig.socketUrl}');
      },
      onError: (msg) {
        if (!mounted) return;
        setState(() {
          socketOk = false;
          status = msg;
        });
      },
      onServerEvent: (data) {
        final type = data['type']?.toString();
        if (type == 'geofence:enter' || type == 'geofence:exit') {
          final name = data['geofence'] is Map ? data['geofence']['name'] : 'zona';
          _pushEvent('${type == 'geofence:enter' ? 'ENTRA' : 'SALE'}: $name');
        }
      },
    );
  }

  void _pushEvent(String text) {
    final now = DateTime.now();
    final stamp =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
    setState(() {
      events.insert(0, '$stamp · $text');
      if (events.length > 30) events.removeLast();
    });
  }

  Future<void> _sendPosition(Position pos, {required String via}) async {
    setState(() => position = pos);

    if (widget.socket.connected) {
      widget.socket.emitLocation(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        heading: pos.heading >= 0 ? pos.heading : null,
        speed: pos.speed >= 0 ? pos.speed : null,
        onAck: (ack) {
          if (!mounted) return;
          final ok = ack['ok'] == true;
          setState(() {
            lastSend = ok
                ? 'Socket OK · ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}'
                : 'Socket ACK error: ${ack['error']}';
            status = ok ? 'Transmitiendo por socket' : 'Error socket, revisa backend';
          });
          if (ok && ack['events'] is List && (ack['events'] as List).isNotEmpty) {
            for (final e in ack['events'] as List) {
              if (e is Map) {
                final t = e['type'];
                final g = e['geofence'] is Map ? e['geofence']['name'] : 'zona';
                _pushEvent('${t == 'enter' ? 'ENTRA' : 'SALE'}: $g');
              }
            }
          }
        },
      );
      return;
    }

    // Fallback REST (útil si el host es Vercel sin sockets)
    try {
      final result = await widget.api.sendLocationRest(
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy,
        heading: pos.heading >= 0 ? pos.heading : null,
        speed: pos.speed >= 0 ? pos.speed : null,
      );
      if (!mounted) return;
      setState(() {
        lastSend =
            'REST ($via) · ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
        status = 'Socket no disponible · enviado por REST';
      });
      final eventsList = result['events'];
      if (eventsList is List) {
        for (final e in eventsList) {
          if (e is Map) {
            final t = e['type'];
            final g = e['geofence'] is Map ? e['geofence']['name'] : 'zona';
            _pushEvent('${t == 'enter' ? 'ENTRA' : 'SALE'}: $g');
          }
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => status = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _toggleTracking() async {
    if (tracking) {
      await widget.location.stop();
      _heartbeat?.cancel();
      setState(() {
        tracking = false;
        status = socketOk ? 'Socket conectado · tracking pausado' : 'Tracking pausado';
      });
      return;
    }

    try {
      setState(() => status = 'Solicitando GPS…');
      final current = await widget.location.current();
      await _sendPosition(current, via: 'start');

      await widget.location.start((pos) => _sendPosition(pos, via: 'stream'));

      // Refuerzo periódico por si el stream no emite (sin movimiento)
      _heartbeat?.cancel();
      _heartbeat = Timer.periodic(AppConfig.locationInterval, (_) async {
        try {
          final pos = await widget.location.current();
          await _sendPosition(pos, via: 'heartbeat');
        } catch (_) {}
      });

      setState(() {
        tracking = true;
        status = 'Tracking GPS activo';
      });
      _pushEvent('Tracking iniciado');
    } catch (e) {
      setState(() => status = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.api.user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tracking GPS'),
        actions: [
          IconButton(
            onPressed: () async => widget.onLogout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user?['name']?.toString() ?? 'Dispositivo',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(user?['email']?.toString() ?? '', style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(
                  avatar: Icon(socketOk ? Icons.wifi : Icons.wifi_off, size: 18),
                  label: Text(socketOk ? 'Socket ON' : 'Socket OFF'),
                ),
                Chip(
                  avatar: Icon(tracking ? Icons.gps_fixed : Icons.gps_not_fixed, size: 18),
                  label: Text(tracking ? 'GPS activo' : 'GPS pausado'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('Estado: $status'),
            Text('Último envío: $lastSend', style: const TextStyle(color: Colors.white70)),
            if (position != null) ...[
              const SizedBox(height: 8),
              Text('Lat: ${position!.latitude.toStringAsFixed(6)}'),
              Text('Lng: ${position!.longitude.toStringAsFixed(6)}'),
              Text('Precisión: ${position!.accuracy.toStringAsFixed(1)} m'),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _toggleTracking,
                icon: Icon(tracking ? Icons.stop : Icons.play_arrow),
                label: Text(tracking ? 'Detener tracking' : 'Iniciar tracking GPS'),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _connectSocket,
              child: const Text('Reconectar socket'),
            ),
            const SizedBox(height: 16),
            Text('Eventos', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: events.length,
                itemBuilder: (_, i) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(events[i], style: const TextStyle(fontSize: 13)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
