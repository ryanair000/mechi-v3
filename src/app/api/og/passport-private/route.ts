import { createPassportCardFallbackPng } from '@/lib/passport-card-png';
import { renderPrivatePassportCardPng } from '@/lib/passport-card-renderer';

export const runtime = 'nodejs';

export async function GET() {
  let png: Uint8Array;
  try {
    png = await renderPrivatePassportCardPng();
  } catch (error) {
    console.error('[Passport Private OG] render failed', error);
    png = createPassportCardFallbackPng('horizontal');
  }

  return new Response(Buffer.from(png), {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      'Content-Length': String(png.byteLength),
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
