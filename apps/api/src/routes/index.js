import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import geofencesRoutes from './geofences.routes.js';
import trackingRoutes from './tracking.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'control-accesos-api',
    focus: 'tracking-movil + geocercas + leaflet',
    runtime: process.env.VERCEL ? 'vercel-serverless' : 'node',
    clients: {
      web: 'REST + mapa Leaflet (polling en Vercel / Socket.IO en local)',
      mobile: {
        rest: 'POST /api/tracking/location (recomendado en Vercel)',
        socket: 'location:update (solo servidor Node persistente / local)'
      }
    },
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/geofences', geofencesRoutes);
router.use('/tracking', trackingRoutes);

export default router;
