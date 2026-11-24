import net from "node:net";

function expandIpv6Groups(host: string): number[] | null {
  if (net.isIP(host) !== 6) return null;
  let addr = host.toLowerCase();
  if (addr.includes(".")) {
    // IPv4-mapped/embedded dotted tail: convert to hex groups
    const idx = addr.lastIndexOf(":");
    const ipv4 = addr.slice(idx + 1);
    const parts = ipv4.split(".").map(Number);
    if (parts.length === 4 && parts.every(x => x >= 0 && x <= 255)) {
      addr = addr.slice(0, idx + 1) + ((parts[0] << 8) | parts[1]).toString(16) + ":" + ((parts[2] << 8) | parts[3]).toString(16);
    }
  }
  const [head, tail] = addr.split("::");
  const h = head ? head.split(":").filter(Boolean) : [];
  const t = tail ? tail.split(":").filter(Boolean) : [];
  const missing = 8 - h.length - t.length;
  const groups = [...h, ...Array(Math.max(missing, 0)).fill("0"), ...t].map(x => parseInt(x, 16));
  return groups.length === 8 ? groups : null;
}

function ipv6ToEmbeddedIpv4(host: string): string | null {
  const g = expandIpv6Groups(host);
  if (!g) return null;
  const toIpv4 = (a: number, b: number) => `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  // ::ffff:0:0/96 IPv4-mapped
  if (g.slice(0, 5).every(x => x === 0) && g[5] === 0xffff) return toIpv4(g[6], g[7]);
  // 64:ff9b::/96 NAT64
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(x => x === 0)) return toIpv4(g[6], g[7]);
  // 2002::/16 6to4
  if (g[0] === 0x2002) return toIpv4(g[1], g[2]);
  return null;
}

export function isBlockedAddress(address: string): boolean {
  const host = String(address || "").toLowerCase().replace(/^\[|\]$/g, "");
  const version = net.isIP(host);
  if (version === 4) {
    const [a, b] = host.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 168 || b === 0)) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
  }
  if (version === 6) {
    const embedded = ipv6ToEmbeddedIpv4(host);
    if (embedded) return isBlockedAddress(embedded);
    if (host === "::1" || host === "::") return true;
    const g = expandIpv6Groups(host);
    if (g) {
      if ((g[0] & 0xfe00) === 0xfc00) return true; // ULA fc00::/7
      if ((g[0] & 0xffc0) === 0xfe80) return true; // link-local
      if ((g[0] & 0xff00) === 0xff00) return true; // multicast
      if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
    }
    return false;
  }
  return false;
}

