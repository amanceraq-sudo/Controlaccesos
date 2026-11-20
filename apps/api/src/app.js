import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', true);

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  if (!env.isVercel) {
    app.use(morgan('dev'));
  }

  app.use(express.json({ limit: '1mb' }));

  // Salud también en la raíz de la función (útil en probes)
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'accesovivo-api',
      docs: '/api/health'
    });
  });

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
