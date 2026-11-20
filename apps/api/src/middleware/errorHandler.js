export function notFound(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'campo';
    return res.status(409).json({ error: `Ya existe un registro con ese ${field}` });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor'
  });
}
