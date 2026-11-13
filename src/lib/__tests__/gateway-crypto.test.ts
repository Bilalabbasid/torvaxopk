import { createDecipheriv, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { easypaisaHash, jazzcashHash, karachiStamp, paymentReference, safeEqual } from '../payments/crypto';

describe('jazzcashHash', () => {
  it('signs sorted non-empty pp_ values prefixed with the salt', () => {
    const salt = 'TESTSALT';
    const fields = { pp_Version: '1.1', pp_Amount: '3500000', pp_TxnType: '', pp_Language: 'EN', ppmpf_1: '03001234567', other: 'x' };
    const expected = createHmac('sha256', salt).update('TESTSALT&3500000&EN&1.1&03001234567').digest('hex').toUpperCase();
    expect(jazzcashHash(fields, salt)).toBe(expected);
  });
  it('ignores an existing pp_SecureHash', () => {
    const a = jazzcashHash({ pp_Amount: '1' }, 's');
    expect(jazzcashHash({ pp_Amount: '1', pp_SecureHash: 'abc' }, 's')).toBe(a);
  });
});

describe('easypaisaHash', () => {
  it('AES-ECB encrypts the sorted k=v string with the hash key', () => {
    const key = '1234567890ABCDEF';
    const fields = { storeId: '43', amount: '5000.0', orderRefNum: 'T1', postBackURL: 'https://x/y', expiryDate: '20270101 101010' };
    const encrypted = easypaisaHash(fields, key);
    const decipher = createDecipheriv('aes-128-ecb', Buffer.from(key), null);
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
    expect(plain).toBe('amount=5000.0&expiryDate=20270101 101010&orderRefNum=T1&postBackURL=https://x/y&storeId=43');
  });
});

describe('helpers', () => {
  it('karachiStamp converts to UTC+5', () => {
    expect(karachiStamp(new Date('2026-12-31T20:30:15Z'))).toBe('20270101013015');
    expect(karachiStamp(new Date('2026-12-31T20:30:15Z'), ' ')).toBe('20270101 013015');
  });
  it('paymentReference fits JazzCash limits', () => {
    const ref = paymentReference();
    expect(ref).toMatch(/^T\d{12}[A-Z2-9]{6}$/);
    expect(ref.length).toBeLessThanOrEqual(20);
  });
  it('safeEqual compares case-insensitively and rejects different lengths', () => {
    expect(safeEqual('ABcd', 'abCD')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
