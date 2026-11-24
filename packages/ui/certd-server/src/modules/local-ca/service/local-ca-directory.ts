export type LocalCaDirectoryInfo = {
  caId: number;
  url: URL;
};

export function parseLocalCaDirectory(directoryUrl?: string): LocalCaDirectoryInfo | null {
  if (!directoryUrl) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(directoryUrl);
  } catch {
    return null;
  }
  const matched = url.pathname.match(/\/api\/acme\/(\d+)\/directory\/?$/i);
  return matched ? { caId: Number(matched[1]), url } : null;
}

export function getLocalCaIdFromAcmeDirectory(directoryUrl?: string): number | null {
  return parseLocalCaDirectory(directoryUrl)?.caId ?? null;
}

export function isLocalCaDirectory(directoryUrl: string | undefined, ca: any, caId: number) {
  const parsed = parseLocalCaDirectory(directoryUrl);
  if (!parsed || parsed.caId !== caId || !ca?.effectiveBaseUrl) {
    return false;
  }
  try {
    const base = new URL(ca.effectiveBaseUrl);
    const expectedPath = `${base.pathname.replace(/\/+$/, "")}/api/acme/${caId}/directory`;
    return parsed.url.origin === base.origin && parsed.url.pathname.replace(/\/+$/, "") === expectedPath;
  } catch {
    return false;
  }
}
