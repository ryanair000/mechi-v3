import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function encryptionKey(): Buffer {
  const value = process.env.PASSPORT_CONNECTION_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error('Passport connection encryption is not configured');
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64url');
  if (key.length !== 32) throw new Error('Passport connection encryption key must be 32 bytes');
  return key;
}

export function sealPassportSecret(plaintext: string, associatedData: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${nonce.toString('base64url')}.${ciphertext.toString('base64url')}.${tag.toString('base64url')}`;
}

export function openPassportSecret(envelope: string, associatedData: string): string {
  const [version, nonceValue, ciphertextValue, tagValue] = envelope.split('.');
  if (version !== 'v1' || !nonceValue || !ciphertextValue || !tagValue) throw new Error('Unsupported Passport secret envelope');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(nonceValue, 'base64url'));
  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
}
