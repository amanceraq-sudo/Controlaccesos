import mongoose from 'mongoose';

const devicePositionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    insideGeofences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Geofence' }],
    source: { type: String, enum: ['mobile', 'web-sim', 'manual'], default: 'mobile' },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

devicePositionSchema.methods.toSafeJSON = function toSafeJSON() {
  const user =
    this.user && typeof this.user === 'object' && this.user._id
      ? {
          id: this.user._id.toString(),
          name: this.user.name,
          email: this.user.email,
          role: this.user.role
        }
      : this.user?.toString?.() || this.user;

  return {
    id: this._id.toString(),
    user,
    lat: this.lat,
    lng: this.lng,
    accuracy: this.accuracy,
    heading: this.heading,
    speed: this.speed,
    insideGeofences: (this.insideGeofences || []).map((g) =>
      g && typeof g === 'object' && g._id
        ? { id: g._id.toString(), name: g.name, color: g.color }
        : g?.toString?.() || g
    ),
    source: this.source,
    lastSeenAt: this.lastSeenAt,
    updatedAt: this.updatedAt
  };
};

export const DevicePosition = mongoose.model('DevicePosition', devicePositionSchema);
