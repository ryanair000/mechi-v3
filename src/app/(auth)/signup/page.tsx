import { redirect } from 'next/navigation';

type SignupSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SignupPage({ searchParams }: { searchParams: SignupSearchParams }) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
  }

  redirect(`/register${params.size ? `?${params.toString()}` : ''}`);
}
