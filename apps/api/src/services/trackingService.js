import { DevicePosition } from '../models/DevicePosition.js';
import { Geofence } from '../models/Geofence.js';
import { GeofenceEvent } from '../models/GeofenceEvent.js';
import { User } from '../models/User.js';
import { pointInPolygon } from '../utils/geo.js';
import { emitTrackingEvent } from '../socket/bus.js';

export async function processLocationUpdate({
  userId,
  lat,
  lng,
  accuracy = null,
  heading = null,
  speed = null,
  source = 'mobile'
}) {
  const user = await User.findById(userId);
  if (!user || !user.active) {
    const err = new Error('Usuario no encontrado o inactivo');
    err.status = 404;
    throw err;
  }

  const geofences = await Geofence.find({ active: true });
  const currentlyInside = geofences.filter((g) => pointInPolygon(lng, lat, g.geometry));
  const currentlyInsideIds = currentlyInside.map((g) => g._id.toString());

  let previous = await DevicePosition.findOne({ user: userId });
  const previousIds = (previous?.insideGeofences || []).map((id) => id.toString());

  const entered = currentlyInside.filter((g) => !previousIds.includes(g._id.toString()));
  const exitedIds = previousIds.filter((id) => !currentlyInsideIds.includes(id));
  const exitedGeofences = exitedIds.length
    ? await Geofence.find({ _id: { $in: exitedIds } })
    : [];

  previous = await DevicePosition.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      lat,
      lng,
      accuracy,
      heading,
      speed,
      source,
      insideGeofences: currentlyInside.map((g) => g._id),
      lastSeenAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await previous.populate([
    { path: 'user', select: 'name email role' },
    { path: 'insideGeofences', select: 'name color' }
  ]);

  const positionPayload = previous.toSafeJSON();
  emitTrackingEvent('location:moved', positionPayload);

  const events = [];

  for (const geofence of entered) {
    const event = await GeofenceEvent.create({
      user: userId,
      geofence: geofence._id,
      type: 'enter',
      lat,
      lng,
      source
    });
    await event.populate([
      { path: 'user', select: 'name email role' },
      { path: 'geofence', select: 'name color' }
    ]);
    const payload = event.toSafeJSON();
    events.push(payload);
    emitTrackingEvent('geofence:enter', payload);
  }

  for (const geofence of exitedGeofences) {
    const event = await GeofenceEvent.create({
      user: userId,
      geofence: geofence._id,
      type: 'exit',
      lat,
      lng,
      source
    });
    await event.populate([
      { path: 'user', select: 'name email role' },
      { path: 'geofence', select: 'name color' }
    ]);
    const payload = event.toSafeJSON();
    events.push(payload);
    emitTrackingEvent('geofence:exit', payload);
  }

  return { position: positionPayload, events };
}

export async function listLivePositions() {
  const positions = await DevicePosition.find()
    .sort({ lastSeenAt: -1 })
    .populate([
      { path: 'user', select: 'name email role active' },
      { path: 'insideGeofences', select: 'name color' }
    ]);

  return positions
    .filter((p) => p.user && p.user.active !== false)
    .map((p) => p.toSafeJSON());
}
