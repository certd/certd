export function shouldSetDefaultNoCache(path: string, cacheControl?: string) {
  if (path === "/" || path === "/index.html") {
    //首页不管怎样都不要缓存
    return true;
  }
  if (cacheControl) {
    return false;
  }
  // api也不要缓存，如果他本身有设置缓存除外
  return path.startsWith("/api");
}
