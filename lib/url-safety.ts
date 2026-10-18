import { lookup } from "node:dns/promises";
import { isIP } from "node:net";


function ipv4ToInt(octets: number[]) {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

// [network, prefix]
const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const BLOCKED_V4_INT = BLOCKED_V4.map(([net, prefix]) => {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return [(ipv4ToInt(net.split(".").map(Number)) & mask) >>> 0, mask] as const;
});

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return octets.every((n) => n >= 0 && n <= 255) ? octets : null;
}

function isPrivateIpv4Octets(octets: number[]) {
  const value = ipv4ToInt(octets);
  return BLOCKED_V4_INT.some(([net, mask]) => ((value & mask) >>> 0) === net);
}

function parseIpv6(input: string): number[] | null {
  let text = input.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);
  if (!text.includes(":")) return null;

  // Convert an embedded dotted IPv4 tail into two hex groups.
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    text =
      text.slice(0, lastColon + 1) +
      ((v4[0] << 8) | v4[1]).toString(16) +
      ":" +
      ((v4[2] << 8) | v4[3]).toString(16);
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;
  const toGroups = (s: string) => (s === "" ? [] : s.split(":"));
  const head = toGroups(halves[0]);
  const rest = halves.length === 2 ? toGroups(halves[1]) : [];
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - head.length - rest.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...rest];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 255);
  }
  return bytes;
}

function isPrivateIpv6Bytes(b: number[]) {
  // Only global unicast 2000::/3 is allowed.
  if ((b[0] & 0xe0) !== 0x20) return true;
  // 2001:db8::/32 documentation
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true;
  // 2001::/32 Teredo
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0 && b[3] === 0) return true;
  // 2002::/16 6to4 (embedded IPv4 in bytes 2-5)
  if (b[0] === 0x20 && b[1] === 0x02) return isPrivateIpv4Octets(b.slice(2, 6));
  // ::ffff:0:0/96, ::/96 and 64:ff9b::/96 fall outside 2000::/3 and are already
  // blocked above; they are listed in the spec but need no extra handling.
  return false;
}

export function isPrivateIp(address: string): boolean {
  const bare = address.trim().replace(/^\[|\]$/g, "");
  const v4 = parseIpv4(bare);
  if (v4) return isPrivateIpv4Octets(v4);
  const v6 = parseIpv6(bare);
  if (v6) return isPrivateIpv6Bytes(v6);
  return true; // unparseable: fail closed
}

/** Synchronous checks that need no DNS: reserved names and IP literals. */
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal"))
    return true;
  if (isIP(host) || host.includes(":")) return isPrivateIp(host);
  return false;
}

export async function isBlockedHost(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname)) return true;
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) return false;
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.some(({ address }) => isPrivateIp(address));
  } catch {
    return true;
  }
}
