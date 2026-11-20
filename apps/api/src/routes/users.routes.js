import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'guard', 'resident']).default('resident'),
  accessCode: z.string().min(4).optional(),
  active: z.boolean().optional()
});

const updateSchema = createSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6).optional()
});

router.use(authenticate);

router.get('/', authorize('admin', 'guard'), async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const user = await User.create(data);
    res.status(201).json({ user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const user = await User.findById(req.params.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    Object.assign(user, data);
    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
