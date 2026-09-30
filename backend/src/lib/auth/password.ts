// src/lib/auth/password.ts
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;
const SCRYPT_N = 16384; // CPU/memory cost

export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = randomBytes(16);
  const hash = await scrypt(plaintext, salt, KEYLEN);
  return `scrypt$N=${SCRYPT_N}$r=8$p=1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(plaintext: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[4], 'hex');
  const expected = Buffer.from(parts[5], 'hex');
  try {
    const actual = await scrypt(plaintext, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
