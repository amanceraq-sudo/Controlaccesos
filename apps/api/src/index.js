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

  server.listen(env.port, () => {
    console.log(`API escuchando en http://localhost:${env.port}`);
    console.log('Endpoint móvil REST: POST /api/tracking/location');
  });
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar la API', error);
  process.exit(1);
});
