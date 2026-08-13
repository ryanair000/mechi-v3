import QRCode from 'qrcode';
import { APP_URL } from '@/lib/urls';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const png = await QRCode.toBuffer(`${APP_URL}/passport/check-in/${token}`, { type: 'png', width: 768, margin: 3, color: { dark: '#071018', light: '#ffffff' }, errorCorrectionLevel: 'H' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline; filename="mechi-event-checkin.png"' } });
}
