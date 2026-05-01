'use client';

import { use, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/AuthProvider';
import {
  FullScreenSignup,
  type FullScreenSignupFeedback,
  type FullScreenSignupValues,
} from '@/components/ui/full-screen-signup';
import { getLoginPath, getSafeNextPath } from '@/lib/navigation';

type SignupSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function SignupPage({ searchParams }: { searchParams: SignupSearchParams }) {
  const { user, loading: authLoading, login } = useAuth();
  const resolvedSearchParams = use(searchParams);
  const rawNextValue = resolvedSearchParams.next;
  const rawNext =
    typeof rawNextValue === 'string'
      ? rawNextValue
      : Array.isArray(rawNextValue)
        ? rawNextValue[0] ?? null
        : null;
  const nextPath = getSafeNextPath(rawNext, '/dashboard');
  const loginHref = getLoginPath(rawNext ? nextPath : null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FullScreenSignupFeedback | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign(nextPath);
    }
  }, [authLoading, nextPath, user]);

  const handleSubmit = async (values: FullScreenSignupValues) => {
    setSubmitting(true);
    setFeedback({
      tone: 'loading',
      title: 'Creating your Mechi account...',
      detail: 'Saving the essentials and starting your Pro trial now.',
    });

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, redirect_to: nextPath }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          title: 'Signup did not go through.',
          detail: data.error ?? 'Check your details and try again.',
        });
        toast.error(data.error ?? 'Signup failed');
        return;
      }

      login(data.token, data.user);
      setFeedback({
        tone: 'success',
        title: `Welcome to Mechi, ${data.user.username}.`,
        detail: 'Your account is live. Taking you into Mechi now.',
      });
      toast.success(`Welcome to Mechi, ${data.user.username}!`);
      window.location.assign(nextPath);
    } catch {
      setFeedback({
        tone: 'error',
        title: 'We could not reach the server.',
        detail: 'Your account was not created. Check your connection and try again.',
      });
      toast.error('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FullScreenSignup
      feedback={feedback}
      loginHref={loginHref}
      onSubmit={handleSubmit}
      submitLabel="Create a new account"
      submitting={submitting}
    />
  );
}
