'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';

export default function LoginPage() {
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
      // Use a hard navigation so auth cookie guards see the latest cookie immediately.
      window.location.assign('/dashboard');
    } catch {
      toast.error('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FullScreenSignup
      title="Sign in and run it back."
      subtitle="Your profile, queues, and progress are still here."
      sideTitle="Jump back in."
      sideDescription="Lock back into your profile, hop in queue, and keep your climb moving."
      sidePoints={[
        'Fast 1v1 queues',
        'Confirmed results and cleaner match records',
        'One profile for your whole grind',
      ]}
    >
      <div className="card p-5 sm:p-6">
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
    </FullScreenSignup>
  );
}
