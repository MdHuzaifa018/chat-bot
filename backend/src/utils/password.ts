import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keyLength: number
) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(value, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(value: string, encoded?: string | null): Promise<boolean> {
  if (!encoded || typeof encoded !== "string") {
    return false;
  }
  const [algorithm, saltHex, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltHex || !expectedHex || !/^[a-f0-9]+$/i.test(saltHex + expectedHex)) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await scrypt(value, salt, KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

export function generateAccessCode(): string {
  return `CR-${randomBytes(14).toString("base64url").slice(0, 18)}`;
}

export function generateTemporaryPassword(): string {
  return randomBytes(24).toString("base64url");
}
