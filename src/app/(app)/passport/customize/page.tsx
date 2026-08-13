import type { Metadata } from 'next';
import { PassportCustomizationStudio } from './passport-customization-studio';

export const metadata: Metadata = { title: 'Customize Gamer Passport | Mechi V5', description: 'Choose cosmetic styling and curate your tangible Gamer Passport showcase.' };
export default function PassportCustomizePage() { return <PassportCustomizationStudio />; }
