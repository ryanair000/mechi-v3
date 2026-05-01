import { SocialButtons } from '@/components/ui/social-buttons';

export default function SocialsPage() {
  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8">
      <h1 className="sr-only">PlayMechi socials</h1>
      <SocialButtons />
    </main>
  );
}
