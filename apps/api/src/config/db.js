import mongoose from 'mongoose';
import { env } from './env.js';

const globalStore = globalThis;

if (!globalStore.__accesovivoMongoose) {
  globalStore.__accesovivoMongoose = { conn: null, promise: null };
}

const cached = globalStore.__accesovivoMongoose;

export async function connectDb() {
  mongoose.set('strictQuery', true);

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.mongoUri, {
        bufferCommands: false
      })
      .then((connection) => {
        console.log('MongoDB conectado');
        return connection;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
