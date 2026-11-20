import mongoose from 'mongoose';

const geofenceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    color: { type: String, default: '#3d9b84' },
    active: { type: Boolean, default: true },
    // GeoJSON Polygon: coordinates[0] = anillo exterior [lng, lat]
    geometry: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon'
      },
      coordinates: {
        type: [[[Number]]],
        required: true
      }
    }
  },
  { timestamps: true }
);

geofenceSchema.index({ geometry: '2dsphere' });

geofenceSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description,
    color: this.color,
    active: this.active,
    geometry: this.geometry,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Geofence = mongoose.model('Geofence', geofenceSchema);
