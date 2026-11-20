import { Router } from 'express';
import { z } from 'zod';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { listLivePositions, processLocationUpdate } from '../services/trackingService.js';

const router = Router();

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional().nullable(),
  heading: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  source: z.enum(['mobile', 'web-sim', 'manual']).default('mobile'),
  userId: z.string().optional()
});

router.use(authenticate);

router.get('/positions', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const positions = await listLivePositions();
    res.json({ positions });
  } catch (error) {
    next(error);
  }
});

router.post('/location', async (req, res, next) => {
  try {
    const data = locationSchema.parse(req.body);

    let targetUserId = req.user.id;
    if (data.userId && ['admin', 'guard'].includes(req.user.role)) {
      targetUserId = data.userId;
    }

    const result = await processLocationUpdate({
      userId: targetUserId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy,
      heading: data.heading,
      speed: data.speed,
      source: data.source
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/events', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await GeofenceEvent.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate([
        { path: 'user', select: 'name email role' },
        { path: 'geofence', select: 'name color' }
      ]);

    res.json({ events: events.map((e) => e.toSafeJSON()) });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [liveDevices, totalGeofences, entersToday, exitsToday] = await Promise.all([
      listLivePositions().then((p) => p.length),
      import('../models/Geofence.js').then(({ Geofence }) => Geofence.countDocuments({ active: true })),
      GeofenceEvent.countDocuments({ type: 'enter', createdAt: { $gte: start } }),
      GeofenceEvent.countDocuments({ type: 'exit', createdAt: { $gte: start } })
    ]);

    res.json({
      stats: { liveDevices, totalGeofences, entersToday, exitsToday }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
