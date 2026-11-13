// Signing helpers for the Pakistani gateways. Pure functions, unit tested.
import { createCipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hmacHex(algorithm: 'sha256' | 'sha512', key: string, data: string): string {
  return createHmac(algorithm, key).update(data, 'utf8').digest('hex');
}

/**
 * JazzCash pp_SecureHash: every non-empty pp_* / ppmpf_* field except pp_SecureHash,
 * sorted by key (ASCII), values joined with '&', prefixed with the integrity salt and '&',
 * HMAC-SHA256 keyed with the integrity salt, hex.
 */
export function jazzcashHash(fields: Record<string, string>, integritySalt: string): string {
  const values = Object.keys(fields)
    .filter((k) => (k.startsWith('pp_') || k.startsWith('ppmpf_')) && k !== 'pp_SecureHash')
    .sort()
    .map((k) => fields[k])
    .filter((v) => v !== undefined && v !== null && v !== '');
  return hmacHex('sha256', integritySalt, [integritySalt, ...values].join('&')).toUpperCase();
}

/**
 * Easypaisa merchantHashedReq: fields sorted by key, "k=v&k=v" with raw values,
 * AES/ECB/PKCS5Padding with the hash key (16 bytes → AES-128), base64.
 */
export function easypaisaHash(fields: Record<string, string>, hashKey: string): string {
  const plain = Object.keys(fields)
    .filter((k) => k !== 'merchantHashedReq')
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('&');
  const key = Buffer.from(hashKey, 'utf8');
  const bits = key.length === 32 ? 256 : key.length === 24 ? 192 : 128;
  const cipher = createCipheriv(`aes-${bits}-ecb`, key.subarray(0, bits / 8), null);
  return Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64');
}

/** yyyyMMddHHmmss in Pakistan time (UTC+5, no DST). */
export function karachiStamp(date: Date, separator = ''): string {
  const pk = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const day = `${pk.getUTCFullYear()}${p(pk.getUTCMonth() + 1)}${p(pk.getUTCDate())}`;
  const time = `${p(pk.getUTCHours())}${p(pk.getUTCMinutes())}${p(pk.getUTCSeconds())}`;
  return `${day}${separator}${time}`;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Payment reference sent to gateways: alphanumeric, 19 chars (JazzCash allows 20). */
export function paymentReference(now = new Date()): string {
  return `T${karachiStamp(now).slice(2)}${randomCode(6)}`;
}
