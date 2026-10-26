import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

// promisify resolves to the 3-argument overload, which drops the options
// parameter we rely on; assert the shape we actually call.
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// Tuned so a single hash costs roughly 100ms on a small serverless instance.
// N must stay a power of two. Raising N later is safe: stored hashes carry
// their own parameters, so old passwords keep verifying.
const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** scrypt needs headroom above the default 32MB or it throws on these params. */
const MAX_MEMORY = 128 * 1024 * 1024;

/**
 * Hashes a password into a self-describing string:
 * `scrypt$N$r$p$<salt base64>$<key base64>`
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = (await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEMORY,
  })) as Buffer;
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Verifies a password against a stored hash. Returns false rather than throwing
 * on a malformed or unknown-format hash, so a corrupted row cannot 500 a login.
 */
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  // Refuse absurd parameters from a tampered row: deriving with them would
  // hang the request rather than fail it.
  if (N < 1024 || N > 1_048_576 || r < 1 || r > 32 || p < 1 || p > 16) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = (await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEMORY,
    })) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with parameters weaker than the current ones. */
export function needsRehash(stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return true;
  return (
    Number(parts[1]) < PARAMS.N ||
    Number(parts[2]) < PARAMS.r ||
    Number(parts[3]) < PARAMS.p
  );
}
