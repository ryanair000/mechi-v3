'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { Search } from 'lucide-react';

function normalizeUsername(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '');
}

export default function ChallengesPage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState('');
  const normalizedUsername = normalizeUsername(searchValue);

  const handleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedUsername) {
      return;
    }

    startTransition(() => {
      router.push(`/s/${encodeURIComponent(normalizedUsername)}`);
    });
  };

  return (
    <div className="page-container max-w-[58rem]">
      <form onSubmit={handleLookupSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="label">Username</span>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
            />
            <input
              type="text"
              name="username"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="@playername"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="input pl-11"
              aria-label="Search players by username"
            />
          </div>
        </label>

        <button type="submit" className="btn-primary" disabled={isRouting || !normalizedUsername}>
          <Search size={14} />
          {isRouting ? 'Searching...' : 'Search'}
        </button>
      </form>
    </div>
  );
}
