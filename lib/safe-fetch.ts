import { lookup as dnsLookup } from "node:dns";
import type { LookupAddress } from "node:dns";
import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { Transform } from "node:stream";
import zlib from "node:zlib";
import { isBlockedHostname, isPrivateIp } from "@/lib/url-safety";

export type SafeFetchErrorCode =
  | "blocked"
  | "too-many-redirects"
  | "bad-redirect"
  | "timeout"
  | "failed";

export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface SafeFetchOptions {
  timeoutMs: number;
  maxBytes: number;
  /** 0 returns 3xx responses to the caller instead of following them. */
  maxRedirects: number;
  headers: Record<string, string>;
}

export interface SafeFetchResponse {
  status: number;
  headers: IncomingHttpHeaders;
  finalUrl: URL;
  /** Reads the (decompressed) body, capped at maxBytes. */
  readBody(): Promise<{ bytes: Buffer; truncated: boolean }>;
  /** Discards the body and releases the socket. */
  close(): void;
}

/**
 * DNS lookup that rejects if any resolved address is non-public. Because Node
 * connects to exactly the address returned here, this closes the
 * validate-then-connect (DNS rebinding) gap.
 */
function guardedLookup(
  hostname: string,
  options: { family?: number | "IPv4" | "IPv6"; all?: boolean; hints?: number },
  callback: (err: NodeJS.ErrnoException | null, address?: string | LookupAddress[], family?: number) => void,
) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      const blocked: NodeJS.ErrnoException = new Error("Blocked non-public address");
      blocked.code = "EBLOCKED";
      return callback(blocked);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function assertAllowedUrl(url: URL) {
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    isBlockedHostname(url.hostname) // also checks IP literals directly
  )
    throw new SafeFetchError("blocked");
}

function requestOnce(url: URL, opts: SafeFetchOptions, deadline: number): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new SafeFetchError("timeout"));
    const mod = url.protocol === "https:" ? https : http;
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const req = mod.request(
      {
        protocol: url.protocol,
        hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        agent: false,
        headers: { ...opts.headers, host: url.host, "accept-encoding": "gzip, deflate, br" },
        // lookup is not called for IP literals; those were checked above.
        lookup: isIP(hostname) ? undefined : (guardedLookup as never),
        servername: isIP(hostname) ? undefined : hostname,
      },
      resolve,
    );
    const timer = setTimeout(() => {
      req.destroy(new SafeFetchError("timeout"));
    }, remaining);
    req.on("close", () => clearTimeout(timer));
    req.on("error", (err) =>
      reject(err instanceof SafeFetchError ? err : new SafeFetchError("failed", err.message)),
    );
    req.end();
  });
}

function decompressed(res: IncomingMessage): NodeJS.ReadableStream {
  const encoding = String(res.headers["content-encoding"] || "").trim().toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return res.pipe(zlib.createGunzip());
  if (encoding === "deflate") return res.pipe(zlib.createInflate());
  if (encoding === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

export async function safeFetch(start: URL, opts: SafeFetchOptions): Promise<SafeFetchResponse> {
  const deadline = Date.now() + opts.timeoutMs;
  let url = start;
  for (let hop = 0; ; hop++) {
    assertAllowedUrl(url);
    const res = await requestOnce(url, opts, deadline);
    const status = res.statusCode ?? 0;
    const isRedirect = status >= 300 && status < 400;
    if (isRedirect && opts.maxRedirects > 0) {
      res.destroy();
      const location = res.headers.location;
      if (!location || hop >= opts.maxRedirects) throw new SafeFetchError("too-many-redirects");
      try {
        url = new URL(location, url);
      } catch {
        throw new SafeFetchError("bad-redirect");
      }
      continue;
    }
    const finalUrl = url;
    // Keep the deadline enforced while the body streams.
    const bodyTimer = setTimeout(
      () => res.destroy(new SafeFetchError("timeout")),
      Math.max(0, deadline - Date.now()),
    );
    res.on("close", () => clearTimeout(bodyTimer));
    return {
      status,
      headers: res.headers,
      finalUrl,
      close: () => res.destroy(),
      readBody: () =>
        new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];
          let total = 0;
          let truncated = false;
          let settled = false;
          const finish = (err?: Error) => {
            if (settled) return;
            settled = true;
            res.destroy();
            if (err) reject(err instanceof SafeFetchError ? err : new SafeFetchError("failed", err.message));
            else resolve({ bytes: Buffer.concat(chunks), truncated });
          };
          const stream = decompressed(res);
          const cap = new Transform({
            transform(chunk: Buffer, _enc, cb) {
              const room = opts.maxBytes - total;
              if (chunk.length >= room) {
                if (room > 0) chunks.push(chunk.subarray(0, room));
                total = opts.maxBytes;
                truncated = true;
                finish();
                return cb();
              }
              chunks.push(chunk);
              total += chunk.length;
              cb();
            },
          });
          stream.on("error", finish);
          res.on("error", finish);
          res.on("close", () => {
            if (!res.complete) finish(new Error("Connection closed"));
          });
          cap.on("finish", () => finish());
          stream.pipe(cap);
        }),
    };
  }
}
