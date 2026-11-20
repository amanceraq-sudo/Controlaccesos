import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';

class ApiService {
  String? token;
  Map<String, dynamic>? user;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data['error'] ?? 'Error de login');
    }

    token = data['token'] as String?;
    user = data['user'] as Map<String, dynamic>?;
    return data;
  }

  Future<Map<String, dynamic>> sendLocationRest({
    required double lat,
    required double lng,
    double? accuracy,
    double? heading,
    double? speed,
  }) async {
    final response = await http.post(
      Uri.parse('${AppConfig.apiUrl}/tracking/location'),
      headers: _headers,
      body: jsonEncode({
        'lat': lat,
        'lng': lng,
        'accuracy': accuracy,
        'heading': heading,
        'speed': speed,
        'source': 'mobile',
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw Exception(data['error'] ?? 'Error al enviar ubicación');
    }
    return data;
  }

  Future<Map<String, dynamic>> health() async {
    final response = await http.get(Uri.parse('${AppConfig.apiUrl}/health'));
    return jsonDecode(response.body) as Map<String, dynamic>;
  }
}
