import { User } from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
