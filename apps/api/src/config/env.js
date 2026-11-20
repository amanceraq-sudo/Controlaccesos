import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local: apps/api/.env · Vercel inyecta process.env directamente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno ${key}`);
  }
}

function parseCorsOrigin(value) {
  if (!value || value.trim() === '*') return true;
  const list = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return true;
  if (list.length === 1) return list[0];
  return list;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN || '*'),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@accesos.local',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
  isVercel: Boolean(process.env.VERCEL),
  enableSocket: process.env.ENABLE_SOCKET !== 'false' && !process.env.VERCEL
};
