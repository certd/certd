export function isSameAcmeUrl(actual: string, expected: string) {
  let a: URL;
  let e: URL;
  try {
    a = new URL(actual);
    e = new URL(expected);
  } catch (e) {
    return false;
  }
  const normPath = (u: URL) => u.pathname.replace(/\/+$/, "");
  return a.origin === e.origin && normPath(a) === normPath(e) && a.search === e.search;
}
