import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'guard', 'resident']).optional(),
  accessCode: z.string().min(4).optional()
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const count = await User.countDocuments();

    // El primer usuario siempre es admin; los siguientes residents por defecto
    const role = count === 0 ? 'admin' : data.role || 'resident';

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      role,
      accessCode: data.accessCode
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

export default router;
