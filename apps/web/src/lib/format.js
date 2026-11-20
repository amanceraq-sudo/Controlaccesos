export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(value));
}

export function statusLabel(status) {
  const map = {
    locked: 'Bloqueado',
    unlocked: 'Abierto',
    maintenance: 'Mantenimiento',
    granted: 'Permitido',
    denied: 'Denegado',
    admin: 'Admin',
    guard: 'Guardia',
    resident: 'Residente',
    door: 'Puerta',
    gate: 'Portón',
    barrier: 'Barrera',
    turnstile: 'Torniquete',
    in: 'Entrada',
    out: 'Salida',
    web: 'Web',
    mobile: 'Móvil',
    code: 'Código',
    manual: 'Manual'
  };
  return map[status] || status;
}
