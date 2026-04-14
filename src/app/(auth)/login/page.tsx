'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Enter your details and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Login failed');
        return;
      }
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      router.push('/dashboard');
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-base flex min-h-screen flex-col">
      <nav className="landing-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <ThemeToggle />
      </nav>

      <div className="flex flex-1 items-start px-4 pb-10 pt-4 sm:px-6 lg:items-center">
        <div className="mx-auto grid w-full max-w-4xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_24rem]">
          <div className="hidden xl:block">
            <div className="card circuit-panel p-8">
              <BrandLogo size="md" showTagline />
              <h1 className="mt-6 max-w-md text-[2rem] font-black leading-tight text-[var(--text-primary)]">
                Jump back in.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Lock back into your profile, hop in queue, and keep your climb moving.
              </p>

              <div className="mt-6 grid gap-2.5">
                {[
                  'Fast 1v1 queues',
                  'Backup when matches get messy',
                  'One profile for your whole grind',
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                      index === 1 ? 'surface-action' : 'surface-live'
                    }`}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-strong)]">
                      <Check
                        size={13}
                        className={index === 1 ? 'text-[var(--brand-coral)]' : 'text-[var(--brand-teal)]'}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="mb-6">
              <p className="section-title">Welcome back</p>
              <h1 className="mt-3 text-[2rem] font-black text-[var(--text-primary)]">
                Sign in and run it back.
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                Your profile, queues, and progress are still here. Just tap back in.
              </p>
            </div>

            <form onSubmit={handleSubmit} action="/api/auth/login" method="post" className="space-y-4">
              <input type="hidden" name="redirect_to" value="/dashboard" />
              <div>
                <label className="label">Phone, username, or email</label>
                <input
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0712 345 678 · GameKing254 · you@mail.com"
                  className="input"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-soft)] hover:text-[var(--text-primary)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              New to Mechi?{' '}
              <Link href="/register" className="brand-link-coral font-semibold">
                Create your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
