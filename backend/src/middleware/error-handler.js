export function errorHandler(err, c) {
  console.error('[Error]', err.message);
  const status = err.status || 500;
  return c.json({ error: err.message || 'Internal server error' }, status);
}
