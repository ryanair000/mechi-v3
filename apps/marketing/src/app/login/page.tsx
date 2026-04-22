import { redirect } from "next/navigation";
import { getPageSession } from "@/lib/session";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getPageSession();
  if (session) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="card-surface w-full max-w-md p-6 sm:p-8">
        <p className="eyebrow">Internal tool</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
          Marketing operator login
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Use the campaign password to access the standalone internal dashboard for
          marketing.mechi.club.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.14)] px-4 py-3 text-sm text-[#ffd4d4]">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="mt-6 space-y-5">
          <div>
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="field-base"
              placeholder="Enter the admin password"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Enter dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
