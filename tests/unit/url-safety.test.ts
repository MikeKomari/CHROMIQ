import { beforeEach, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup }));

import { safeFetch, SafeFetchError } from "@/lib/safe-fetch";
import { isBlockedHost, isBlockedHostname, isPrivateIp } from "@/lib/url-safety";

describe("isPrivateIp - IPv4", () => {
  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.15.255.255", // just below 172.16/12
    "172.32.0.1", // just above
    "100.63.255.255", // below CGNAT
    "100.128.0.1", // above CGNAT
    "198.20.0.1", // outside 198.18/15
    "11.0.0.1",
    "223.255.255.255",
  ])("allows public address %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it.each([
    ["0.0.0.0", "this network"],
    ["0.1.2.3", "this network"],
    ["10.0.0.1", "RFC1918"],
    ["10.255.255.255", "RFC1918"],
    ["172.16.0.1", "RFC1918"],
    ["172.31.255.255", "RFC1918"],
    ["192.168.0.1", "RFC1918"],
    ["192.168.255.255", "RFC1918"],
    ["127.0.0.1", "loopback"],
    ["127.255.255.254", "loopback"],
    ["169.254.169.254", "link-local / cloud metadata"],
    ["100.64.0.1", "CGNAT"],
    ["100.127.255.255", "CGNAT"],
    ["192.0.0.1", "IETF protocol"],
    ["192.0.2.10", "TEST-NET-1"],
    ["198.18.0.1", "benchmarking"],
    ["198.19.255.255", "benchmarking"],
    ["198.51.100.7", "TEST-NET-2"],
    ["203.0.113.9", "TEST-NET-3"],
    ["224.0.0.1", "multicast"],
    ["239.255.255.255", "multicast"],
    ["240.0.0.1", "reserved"],
    ["255.255.255.255", "broadcast"],
  ])("blocks %s (%s)", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(["", "   ", "abc", "1.2.3", "1.2.3.4.5", "256.1.1.1", "1.2.3.999", "-1.2.3.4", "1.2.3.a", "01.2.3.4.", "8.8.8.8/32"])(
    "fails closed on unparseable input %j",
    (value) => {
      expect(isPrivateIp(value)).toBe(true);
    },
  );

  it("trims whitespace and unwraps brackets", () => {
    expect(isPrivateIp("  10.0.0.1  ")).toBe(true);
    expect(isPrivateIp(" 8.8.8.8 ")).toBe(false);
  });
});

describe("isPrivateIp - IPv6", () => {
  it.each([
    "2606:4700:4700::1111",
    "2001:4860:4860::8888",
    "2a00:1450:4009:81f::200e",
    "[2606:4700:4700::1111]",
    "2002:0808:0808::1", // 6to4 embedding public 8.8.8.8
  ])("allows global unicast %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it.each([
    ["::1", "loopback"],
    ["::", "unspecified"],
    ["[::1]", "bracketed loopback"],
    ["fe80::1", "link-local"],
    ["fe80::1%eth0", "link-local with zone"],
    ["fc00::1", "unique local"],
    ["fd12:3456:789a::1", "unique local"],
    ["ff02::1", "multicast"],
    ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
    ["::ffff:8.8.8.8", "IPv4-mapped (conservatively blocked)"],
    ["::ffff:7f00:1", "IPv4-mapped hex form"],
    ["64:ff9b::7f00:1", "NAT64"],
    ["2001:db8::1", "documentation"],
    ["2001:0:4136:e378:8000:63bf:3fff:fdd2", "Teredo"],
    ["2002:7f00:0001::1", "6to4 embedding 127.0.0.1"],
    ["2002:0a00:0001::1", "6to4 embedding 10.0.0.1"],
    ["2002:c0a8:0101::1", "6to4 embedding 192.168.1.1"],
    ["2002:a9fe:a9fe::1", "6to4 embedding metadata 169.254.169.254"],
  ])("blocks %s (%s)", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(["2606::1::2", "1:2:3:4:5:6:7:8:9", "2606:4700:4700:::1111", "gggg::1", "2606:4700:4700::11111", "1:2:3:4:5:6:7", "::ffff:999.1.1.1"])(
    "fails closed on malformed address %j",
    (ip) => {
      expect(isPrivateIp(ip)).toBe(true);
    },
  );

  it("treats a full eight-group address the same as its compressed form", () => {
    expect(isPrivateIp("2606:4700:4700:0:0:0:0:1111")).toBe(false);
    expect(isPrivateIp("0:0:0:0:0:0:0:1")).toBe(true);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "localhost.",
    "app.localhost",
    "printer.local",
    "db.internal",
    "metadata.google.internal",
    "",
    "127.0.0.1",
    "10.1.2.3",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "[::1]",
    "::1",
    "fe80::1",
    "[fd00::1]",
    "::ffff:127.0.0.1",
  ])("blocks %j", (host) => {
    expect(isBlockedHostname(host)).toBe(true);
  });

  it.each([
    "example.com",
    "www.example.co.uk",
    "sub.domain.example.org",
    "8.8.8.8",
    "[2606:4700:4700::1111]",
    "notlocalhost.com",
    "localhost.example.com",
    "internal.example.com",
    "local.example.com",
    "xn--bcher-kva.example",
  ])("allows %j", (host) => {
    expect(isBlockedHostname(host)).toBe(false);
  });

  it("blocks numeric tricks once normalised by the URL parser", () => {
    for (const url of [
      "http://2130706433/", // decimal 127.0.0.1
      "http://0x7f.0.0.1/",
      "http://0177.0.0.1/",
      "http://127.1/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:7f00:1]/",
    ])
      expect(isBlockedHostname(new URL(url).hostname), url).toBe(true);
  });
});

describe("isBlockedHost (with DNS)", () => {
  beforeEach(() => {
    lookup.mockReset();
  });

  it("blocks reserved names and private literals without a DNS lookup", async () => {
    expect(await isBlockedHost("localhost")).toBe(true);
    expect(await isBlockedHost("127.0.0.1")).toBe(true);
    expect(await isBlockedHost("[::1]")).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("allows public IP literals without a DNS lookup", async () => {
    expect(await isBlockedHost("8.8.8.8")).toBe(false);
    expect(await isBlockedHost("[2606:4700:4700::1111]")).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("allows a hostname that resolves only to public addresses", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "2606:2800:220:1::1", family: 6 }]);
    expect(await isBlockedHost("Example.COM")).toBe(false);
    expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
  });

  it("blocks a hostname that resolves to a private address", async () => {
    lookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
    expect(await isBlockedHost("intranet.example.com")).toBe(true);
  });

  it("blocks when any one of several resolved addresses is private (DNS rebinding mix)", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "127.0.0.1", family: 4 }]);
    expect(await isBlockedHost("rebind.example.com")).toBe(true);
  });

  it("fails closed when DNS resolution errors", async () => {
    lookup.mockRejectedValue(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
    expect(await isBlockedHost("does-not-exist.example")).toBe(true);
  });
});

describe("safeFetch URL policy (rejected before any network access)", () => {
  const options = { timeoutMs: 1000, maxBytes: 1000, maxRedirects: 0, headers: {} };

  it.each([
    "file:///etc/passwd",
    "ftp://example.com/file",
    "gopher://example.com/",
    "data:text/html,<h1>x</h1>",
    "javascript:alert(1)",
    "ws://example.com/",
    "http://localhost/",
    "http://localhost:3000/admin",
    "https://app.localhost/",
    "http://127.0.0.1/",
    "http://127.0.0.1:8080/",
    "http://10.0.0.1/",
    "http://172.16.5.5/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://2130706433/",
    "http://0.0.0.0/",
    "http://router.local/",
    "http://db.internal/",
    "https://user:pass@example.com/",
    "https://user@example.com/",
  ])("rejects %s with code 'blocked'", async (raw) => {
    const promise = safeFetch(new URL(raw), options);
    await expect(promise).rejects.toBeInstanceOf(SafeFetchError);
    await expect(promise).rejects.toMatchObject({ code: "blocked" });
  });
});
