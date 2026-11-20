import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { processLocationUpdate } from '../services/trackingService.js';
import { setIO } from './bus.js';

let io;

/**
 * Socket.IO:
 * - Web: escucha ubicaciones y eventos de geocerca en tiempo real
 * - Flutter (pendiente): emite `location:update` con lat/lng
 */
export function initSocket(httpServer) {
  const corsOrigin = env.corsOrigin === true ? '*' : env.corsOrigin;

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingInterval: 10000,
    pingTimeout: 20000
  });
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Token requerido'));
      }

      const decoded = verifyToken(token);
      const user = await User.findById(decoded.sub);
      if (!user || !user.active) {
        return next(new Error('Usuario no válido'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Autenticación de socket fallida'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`role:${socket.user.role}`);
    socket.join(`user:${socket.user.id}`);

    console.log(`Socket conectado: ${socket.user.email} (${socket.id})`);

    socket.emit('connected', {
      message: 'Conectado al canal de tracking',
      user: socket.user.toSafeJSON()
    });

    // Canal principal para Flutter / simulador web
    socket.on('location:update', async (payload, ack) => {
      try {
        const lat = Number(payload?.lat);
        const lng = Number(payload?.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          throw Object.assign(new Error('lat/lng inválidos'), { status: 400 });
        }

        let userId = socket.user.id;
        if (payload?.userId && ['admin', 'guard'].includes(socket.user.role)) {
          userId = payload.userId;
        }

        const result = await processLocationUpdate({
          userId,
          lat,
          lng,
          accuracy: payload?.accuracy ?? null,
          heading: payload?.heading ?? null,
          speed: payload?.speed ?? null,
          source: payload?.source || 'mobile'
        });

        if (typeof ack === 'function') ack({ ok: true, ...result });
      } catch (error) {
        console.error('location:update error', error.message);
        if (typeof ack === 'function') {
          ack({ ok: false, error: error.message });
        } else {
          socket.emit('location:error', { error: error.message });
        }
      }
    });

    socket.on('mobile:ping', (payload, ack) => {
      const response = { ok: true, at: new Date().toISOString(), echo: payload || null };
      if (typeof ack === 'function') ack(response);
      else socket.emit('mobile:pong', response);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket desconectado: ${socket.user.email} (${reason})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO no inicializado');
  }
  return io;
}

export { emitTrackingEvent } from './bus.js';
