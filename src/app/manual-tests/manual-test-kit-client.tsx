'use client';

import { useDeferredValue, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, RefreshCcw, Search } from 'lucide-react';
import {
  MANUAL_TEST_STORAGE_KEY,
  manualTestAccounts,
  manualTestHosts,
  type ManualTestItem,
  type ManualTestSection,
} from './manual-test-kit';

type ProgressState = Record<string, boolean>;
const PROGRESS_EVENT_NAME = 'mechi:manual-test-kit-progress';
const EMPTY_PROGRESS_STATE: ProgressState = {};

let cachedProgressRaw: string | null = null;
let cachedProgressSnapshot: ProgressState = EMPTY_PROGRESS_STATE;

function normalizeStoredProgress(rawValue: string | null): ProgressState {
  if (!rawValue) {
    return EMPTY_PROGRESS_STATE;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return EMPTY_PROGRESS_STATE;
    }

    const nextState: ProgressState = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (value === true) {
        nextState[key] = true;
      }
    }

    return Object.keys(nextState).length > 0 ? nextState : EMPTY_PROGRESS_STATE;
  } catch {
    return EMPTY_PROGRESS_STATE;
  }
}

function readStoredProgress(): ProgressState {
  if (typeof window === 'undefined') {
    return EMPTY_PROGRESS_STATE;
  }

  const rawValue = window.localStorage.getItem(MANUAL_TEST_STORAGE_KEY);
  if (rawValue === cachedProgressRaw) {
    return cachedProgressSnapshot;
  }

  cachedProgressRaw = rawValue;
  cachedProgressSnapshot = normalizeStoredProgress(rawValue);
  return cachedProgressSnapshot;
}

function writeStoredProgress(nextState: ProgressState) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextRaw = JSON.stringify(nextState);
  cachedProgressRaw = nextRaw;
  cachedProgressSnapshot = Object.keys(nextState).length > 0 ? { ...nextState } : EMPTY_PROGRESS_STATE;
  window.localStorage.setItem(MANUAL_TEST_STORAGE_KEY, nextRaw);
  window.dispatchEvent(new Event(PROGRESS_EVENT_NAME));
}

function subscribeToStoredProgress(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStoreChange = () => onStoreChange();

  window.addEventListener('storage', handleStoreChange);
  window.addEventListener(PROGRESS_EVENT_NAME, handleStoreChange);

  return () => {
    window.removeEventListener('storage', handleStoreChange);
    window.removeEventListener(PROGRESS_EVENT_NAME, handleStoreChange);
  };
}

function getServerProgressSnapshot(): ProgressState {
  return EMPTY_PROGRESS_STATE;
}

function matchesQuery(fields: string[], query: string) {
  if (!query) {
    return true;
  }

  return fields.some((field) => field.toLowerCase().includes(query));
}

function itemMatchesQuery(item: ManualTestItem, query: string) {
  return matchesQuery(
    [
      item.id,
      item.title,
      item.account,
      item.timing ?? '',
      ...item.instructions,
      ...item.passIf,
      ...(item.watchFor ?? []),
      ...item.links.map((link) => link.label),
    ],
    query
  );
}

function SectionActionButton({
  label,
  onClick,
  tone = 'neutral',
}: {
  label: string;
  onClick: () => void;
  tone?: 'neutral' | 'accent' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
      : tone === 'danger'
        ? 'border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.1)] text-[var(--brand-coral)]'
        : 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:text-[var(--text-primary)] ${toneClass}`}
    >
      {label}
    </button>
  );
}

function QuickStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm">
      <span className="text-[var(--text-soft)]">{label}</span>{' '}
      <span className={accent ? 'font-semibold text-[var(--accent-secondary-text)]' : 'font-semibold text-[var(--text-primary)]'}>
        {value}
      </span>
    </div>
  );
}

function ManualTestItemRow({
  item,
  checked,
  onToggle,
  forceExpanded,
}: {
  item: ManualTestItem;
  checked: boolean;
  onToggle: (id: string) => void;
  forceExpanded: boolean;
}) {
  const hasExtraDetails = item.passIf.length > 0 || Boolean(item.watchFor?.length);

  return (
    <li
      className={`px-4 py-4 transition-colors sm:px-5 sm:py-5 ${
        checked ? 'bg-[rgba(50,224,196,0.08)]' : 'bg-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item.id)}
          aria-label={`Mark ${item.title} as complete`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-[var(--border-color)] accent-[var(--accent-secondary-text)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="brand-chip px-2 py-0.5">{item.id}</span>
                <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                  {item.account}
                </span>
                {item.timing ? <span className="brand-chip-coral px-2 py-0.5">{item.timing}</span> : null}
                {checked ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                    <CheckCircle2 size={12} />
                    Done
                  </span>
                ) : null}
              </div>

              <h3 className="mt-2 text-base font-black leading-6 text-[var(--text-primary)]">{item.title}</h3>
            </div>

            {item.links.length ? (
              <div className="flex flex-wrap gap-2 lg:max-w-[20rem] lg:justify-end">
                {item.links.map((link) => (
                  <a
                    key={`${item.id}-${link.href}-${link.label}`}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(50,224,196,0.22)] hover:text-[var(--text-primary)]"
                  >
                    {link.label}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <ol className="mt-3 space-y-2">
            {item.instructions.map((step, index) => (
              <li key={`${item.id}-step-${index}`} className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-secondary-soft)] text-[11px] font-bold text-[var(--accent-secondary-text)]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {hasExtraDetails ? (
            <details
              className="group mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)]"
              open={forceExpanded ? true : undefined}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
                <span>Show success notes</span>
                <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>

              <div className="border-t border-[var(--border-color)] px-3 py-3">
                {item.passIf.length ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Done when
                    </p>
                    <ul className="mt-2 space-y-2">
                      {item.passIf.map((outcome) => (
                        <li
                          key={`${item.id}-pass-${outcome}`}
                          className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]"
                        >
                          <CheckCircle2 size={16} className="mt-1 shrink-0 text-[var(--accent-secondary-text)]" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {item.watchFor?.length ? (
                  <div className={item.passIf.length ? 'mt-4' : ''}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-coral)]">
                      Watch out
                    </p>
                    <ul className="mt-2 space-y-2">
                      {item.watchFor.map((note) => (
                        <li key={`${item.id}-watch-${note}`} className="text-sm leading-6 text-[var(--text-secondary)]">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function ManualTestKitClient({
  sections,
}: {
  sections: ManualTestSection[];
}) {
  const [search, setSearch] = useState('');
  const [showRemainingOnly, setShowRemainingOnly] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (!sections[0]) {
      return {};
    }

    return {
      [sections[0].id]: true,
    };
  });
  const deferredSearch = useDeferredValue(search);
  const checkedItems = useSyncExternalStore<ProgressState>(
    subscribeToStoredProgress,
    readStoredProgress,
    getServerProgressSnapshot
  );

  const allItems = sections.flatMap((section) => section.items);
  const totalCount = allItems.length;
  const completedCount = allItems.filter((item) => checkedItems[item.id]).length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const normalizedQuery = deferredSearch.trim().toLowerCase();
  const hasSearch = normalizedQuery.length > 0;

  const filteredSections = sections
    .map((section) => {
      const sectionMatches = matchesQuery(
        [section.title, section.description, section.goal],
        normalizedQuery
      );

      const visibleItems = section.items.filter((item) => {
        if (showRemainingOnly && checkedItems[item.id]) {
          return false;
        }

        if (!normalizedQuery || sectionMatches) {
          return true;
        }

        return itemMatchesQuery(item, normalizedQuery);
      });

      return {
        ...section,
        visibleItems,
      };
    })
    .filter((section) => section.visibleItems.length > 0);

  const visibleCount = filteredSections.reduce((count, section) => count + section.visibleItems.length, 0);

  const toggleItem = (id: string) => {
    const next = { ...checkedItems };

    if (next[id]) {
      delete next[id];
    } else {
      next[id] = true;
    }

    writeStoredProgress(next);
  };

  const setSectionState = (section: ManualTestSection, nextValue: boolean) => {
    const next = { ...checkedItems };

    for (const item of section.items) {
      if (nextValue) {
        next[item.id] = true;
      } else {
        delete next[item.id];
      }
    }

    writeStoredProgress(next);
  };

  const clearSavedProgress = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Clear all saved checklist progress in this browser?');
      if (!confirmed) {
        return;
      }
    }

    writeStoredProgress({});
  };

  return (
    <div className="page-base">
      <section className="landing-shell py-8 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
          <div className="card p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="section-title">Simple manual checklist</p>
                <h1 className="mt-2 text-[2rem] font-black leading-[1.02] text-[var(--text-primary)] sm:text-[3rem]">
                  Mechi manual test checklist
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Open the page you need, do the short steps, and tick the box when it looks right.
                  Extra QA notes are still here, but they stay tucked away until you need them.
                </p>

                <ol className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-3">
                  <li className="rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                    Keep this checklist open in one tab.
                  </li>
                  <li className="rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                    Use separate browser sessions for multi-player tests.
                  </li>
                  <li className="rounded-[var(--radius-control)] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                    Save email, payment, and admin cleanup checks for the end.
                  </li>
                </ol>
              </div>

              <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-soft)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                      Progress
                    </p>
                    <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
                      {completedCount}/{totalCount}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{remainingCount} left to check</p>
                  </div>

                  <span className="rounded-full border border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] px-3 py-1 text-xs font-semibold text-[var(--accent-secondary-text)]">
                    {progressPercent}% done
                  </span>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[rgba(11,17,33,0.08)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-secondary),rgba(255,107,107,0.9))] transition-[width] duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Saved progress stays in this browser only.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <QuickStat label="Tasks" value={String(totalCount)} />
              <QuickStat label="Done" value={String(completedCount)} accent />
              <QuickStat label="Left" value={String(remainingCount)} />
              <QuickStat label="Sections" value={String(sections.length)} />
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Open these hosts
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {manualTestHosts.map((host) => (
                  <a
                    key={`${host.label}-${host.href}`}
                    href={host.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[rgba(50,224,196,0.22)] hover:text-[var(--text-primary)]"
                  >
                    {host.label}
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Account kit
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {manualTestAccounts.map((account) => (
                  <span key={account} className="brand-chip px-3 py-1">
                    {account}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
              <label className="block">
                <span className="label">Find a task</span>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by route, account, or keyword"
                    className="input pl-10"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={() => setShowRemainingOnly((current) => !current)}
                className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition-colors ${
                  showRemainingOnly
                    ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)]'
                }`}
              >
                {showRemainingOnly ? 'Showing only unfinished tasks' : 'Hide finished tasks'}
              </button>

              <button
                type="button"
                onClick={clearSavedProgress}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[rgba(255,107,107,0.24)] bg-[rgba(255,107,107,0.08)] px-4 py-2 text-sm font-semibold text-[var(--brand-coral)] transition-colors hover:bg-[rgba(255,107,107,0.12)]"
              >
                <RefreshCcw size={14} />
                Clear progress
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span>
                Showing {visibleCount} of {totalCount} tasks.
              </span>
              {hasSearch ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-full border border-[var(--border-color)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Clear search
                </button>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
                Jump to section
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="card p-8 text-center sm:p-10">
              <p className="text-lg font-black text-[var(--text-primary)]">No tasks match the current filter.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Clear the search or show finished tasks again to bring the full checklist back.
              </p>
            </div>
          ) : null}

          {filteredSections.map((section) => {
            const sectionCompletedCount = section.items.filter((item) => checkedItems[item.id]).length;
            const sectionIsComplete = sectionCompletedCount === section.items.length;
            const visibleLabel =
              section.visibleItems.length === section.items.length
                ? `${sectionCompletedCount}/${section.items.length} done`
                : `${sectionCompletedCount}/${section.items.length} done • ${section.visibleItems.length} shown`;
            const isSectionOpen = hasSearch ? true : Boolean(openSections[section.id]);

            return (
              <details
                key={section.id}
                id={section.id}
                className={`card group scroll-mt-24 overflow-hidden ${
                  sectionIsComplete ? 'border-[rgba(50,224,196,0.28)]' : ''
                }`}
                open={isSectionOpen}
                onToggle={(event) => {
                  if (hasSearch) {
                    return;
                  }

                  const isOpen = event.currentTarget.open;
                  setOpenSections((current) => ({
                    ...current,
                    [section.id]: isOpen,
                  }));
                }}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 sm:px-6">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="section-title !mb-0">{section.title}</p>
                      <span className="rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
                        {visibleLabel}
                      </span>
                      {sectionIsComplete ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-secondary-text)]">
                          <CheckCircle2 size={12} />
                          Complete
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{section.description}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">Done when: {section.goal}</p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                    <span className="hidden sm:inline">Open section</span>
                    <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                  </span>
                </summary>

                <div className="border-t border-[var(--border-color)]">
                  <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
                    <SectionActionButton
                      label="Check all in section"
                      tone="accent"
                      onClick={() => setSectionState(section, true)}
                    />
                    <SectionActionButton
                      label="Reset section"
                      tone="danger"
                      onClick={() => setSectionState(section, false)}
                    />
                  </div>

                  <ol className="divide-y divide-[var(--border-color)] border-t border-[var(--border-color)]">
                    {section.visibleItems.map((item) => (
                      <ManualTestItemRow
                        key={item.id}
                        item={item}
                        checked={Boolean(checkedItems[item.id])}
                        onToggle={toggleItem}
                        forceExpanded={hasSearch}
                      />
                    ))}
                  </ol>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
