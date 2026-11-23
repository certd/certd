export function isSameAcmeUrl(actual: string, expected: string) {
  let a: URL;
  let e: URL;
  try {
    a = new URL(actual);
    e = new URL(expected);
  } catch (e) {
    return false;
  }
  return a.origin === e.origin && a.pathname === e.pathname && a.search === e.search && a.hash === e.hash;
}
