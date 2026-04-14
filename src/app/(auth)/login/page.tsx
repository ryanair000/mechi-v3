'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) { toast.error('Enter your phone and password'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Login failed'); return; }
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="px-5 pt-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-white text-sm">M</div>
          <span className="font-black text-white text-lg tracking-tight">Mechi</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 py-10 max-w-sm mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-2">Welcome back 👋</h1>
          <p className="text-white/40 text-sm">Sign in to your Mechi account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678" className="input" autoComplete="tel" inputMode="tel" />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="input pr-12" autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1.5 transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Signing in...</>
              : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-10">
          No account yet?{' '}
          <Link href="/register" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
