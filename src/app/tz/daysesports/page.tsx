import { permanentRedirect } from 'next/navigation';
import { TZ_TOURNAMENT } from '@/lib/tanzania-tournament';

export default function TanzaniaDaysEsportsLegacyPage() {
  permanentRedirect(TZ_TOURNAMENT.eventPath);
}
