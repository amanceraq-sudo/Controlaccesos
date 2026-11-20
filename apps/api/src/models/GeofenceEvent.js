import mongoose from 'mongoose';

const geofenceEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    geofence: { type: mongoose.Schema.Types.ObjectId, ref: 'Geofence', required: true },
    type: { type: String, enum: ['enter', 'exit'], required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    source: { type: String, enum: ['mobile', 'web-sim', 'manual'], default: 'mobile' }
  },
  { timestamps: true }
);

geofenceEventSchema.index({ createdAt: -1 });

geofenceEventSchema.methods.toSafeJSON = function toSafeJSON() {
  const mapRef = (value, fields) => {
    if (!value) return null;
    if (typeof value === 'object' && value._id) {
      const out = { id: value._id.toString() };
      for (const field of fields) out[field] = value[field];
      return out;
    }
    return value.toString?.() || value;
  };

  return {
    id: this._id.toString(),
    user: mapRef(this.user, ['name', 'email', 'role']),
    geofence: mapRef(this.geofence, ['name', 'color']),
    type: this.type,
    lat: this.lat,
    lng: this.lng,
    source: this.source,
    createdAt: this.createdAt
  };
};

export const GeofenceEvent = mongoose.model('GeofenceEvent', geofenceEventSchema);
