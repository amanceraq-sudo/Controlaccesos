import http from 'http';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './socket/index.js';

async function bootstrap() {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);

  if (env.enableSocket) {
    initSocket(server);
    console.log('Socket.IO habilitado (dev / servidor Node persistente)');
  } else {
    console.log('Socket.IO deshabilitado en este entorno — usa REST /api/tracking/location');
  }

  server.listen(env.port, '0.0.0.0', () => {
    console.log(`API escuchando en http://0.0.0.0:${env.port}`);
    console.log(`Socket.IO: ${env.enableSocket ? 'ON' : 'OFF'}`);
    console.log('Móvil REST: POST /api/tracking/location');
    console.log('Móvil Socket: event location:update');
  });
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar la API', error);
  process.exit(1);
});
