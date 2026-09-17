import { deflateSync } from 'node:zlib';
import type { PassportCardFormat } from '@/lib/passport-card-model';
import { PASSPORT_CARD_SIZES } from '@/lib/passport-card-model';

const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(input: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.allocUnsafe(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

export function createPassportCardFallbackPng(format: PassportCardFormat): Uint8Array {
  const { width, height } = PASSPORT_CARD_SIZES[format];
  const rowLength = 1 + width * 3;
  const raw = Buffer.allocUnsafe(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const offset = y * rowLength;
    raw[offset] = 0;
    const tealBand = y < Math.max(12, Math.round(height * 0.025));
    for (let x = 0; x < width; x += 1) {
      const pixel = offset + 1 + x * 3;
      raw[pixel] = tealBand ? 50 : 7;
      raw[pixel + 1] = tealBand ? 224 : 16;
      raw[pixel + 2] = tealBand ? 196 : 24;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]);
}

export function readPassportCardPngDimensions(input: Uint8Array): { width: number; height: number } | null {
  if (input.length < 24 || !PNG_SIGNATURE.every((byte, index) => input[index] === byte)) return null;
  const view = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  return { width: view.readUInt32BE(16), height: view.readUInt32BE(20) };
}
