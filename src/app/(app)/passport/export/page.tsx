import type { Metadata } from 'next';
import { PassportExportPanel } from './passport-export-panel';

export const metadata: Metadata = {
  title: 'Export Gamer Passport data | Mechi V5',
  description: 'Create a private, expiring export of your PlayMechi Gamer Passport data.',
};

export default function PassportExportPage() {
  return <PassportExportPanel />;
}
