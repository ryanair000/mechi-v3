import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';
import { permanentRedirect } from 'next/navigation';

export default function TanzaniaRegisterPage() {
  permanentRedirect(TZ_TOURNAMENT.registrationPath);
}
