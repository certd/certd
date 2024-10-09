export function isDev() {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';
}
