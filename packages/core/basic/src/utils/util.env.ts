export function isDev() {
  const nodeEnv = process.env.NODE_ENV || 'dev';
  return nodeEnv === 'development' || nodeEnv.includes('local') || nodeEnv.startsWith('dev');
}
