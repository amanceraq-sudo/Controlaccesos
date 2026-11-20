import { Router } from 'express';
import { z } from 'zod';
import { Geofence } from '../models/Geofence.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { closeRing } from '../utils/geo.js';
import { emitTrackingEvent } from '../socket/bus.js';

const router = Router();

const lngLat = z.array(z.number()).length(2);

const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(lngLat).min(4)).min(1)
});

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
  active: z.boolean().optional(),
  geometry: polygonSchema
});

const updateSchema = createSchema.partial();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'resident' ? { active: true } : {};
    const geofences = await Geofence.find(filter).sort({ name: 1 });
    res.json({ geofences: geofences.map((g) => g.toSafeJSON()) });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    data.geometry.coordinates[0] = closeRing(data.geometry.coordinates[0]);

    const geofence = await Geofence.create(data);
    const payload = geofence.toSafeJSON();
    emitTrackingEvent('geofence:updated', payload);
    res.status(201).json({ geofence: payload });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    if (data.geometry?.coordinates?.[0]) {
      data.geometry.coordinates[0] = closeRing(data.geometry.coordinates[0]);
    }

    const geofence = await Geofence.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true
    });

    if (!geofence) {
      return res.status(404).json({ error: 'Geocerca no encontrada' });
    }

    const payload = geofence.toSafeJSON();
    emitTrackingEvent('geofence:updated', payload);
    res.json({ geofence: payload });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const geofence = await Geofence.findByIdAndDelete(req.params.id);
    if (!geofence) {
      return res.status(404).json({ error: 'Geocerca no encontrada' });
    }
    emitTrackingEvent('geofence:deleted', { id: geofence.id });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
