import { permanentRedirect } from 'next/navigation';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export default function TanzaniaDaysEsportsLegacyRegisterPage() {
  permanentRedirect(TZ_TOURNAMENT.registrationPath);
}
