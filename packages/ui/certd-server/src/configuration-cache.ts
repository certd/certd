export function shouldSetDefaultNoCache(path: string, cacheControl?: string) {
  if (cacheControl) {
    return false;
  }
  return path === '/' || path === '/index.html' || path.startsWith('/api');
}
