import { connectDb } from '../apps/api/src/config/db.js';
import { createApp } from '../apps/api/src/app.js';

const app = createApp();
let ready;

async function ensureReady() {
  if (!ready) {
    ready = connectDb();
  }
  await ready;
}

/**
 * Entry serverless para Vercel.
 * Expone la API REST en https://<proyecto>.vercel.app/api/*
 * Los dispositivos móviles (Flutter) deben usar estos endpoints HTTPS.
 * Nota: Socket.IO no está disponible en Vercel serverless; usa REST para ubicaciones.
 */
export default async function handler(req, res) {
  try {
    await ensureReady();
    return app(req, res);
  } catch (error) {
    console.error('API serverless error', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Error interno del servidor' }));
  }
}
