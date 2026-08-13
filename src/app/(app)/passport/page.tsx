import type { Metadata } from 'next';
import { PassportEditor } from './passport-editor';

export const metadata: Metadata = {
  title: 'Gamer Passport | Mechi V5',
  description: 'Manage your PlayMechi identity, visibility, and public Gamer Passport.',
};

export default function PassportSettingsPage() {
  return <PassportEditor />;
}
