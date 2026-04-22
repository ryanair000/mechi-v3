import Link from 'next/link';

type TestsWorkspaceTab = 'checklist' | 'report';

const NAV_ITEMS: Array<{ href: string; key: TestsWorkspaceTab; label: string }> = [
  { href: '/manual-tests', key: 'checklist', label: 'Checklist' },
  { href: '/report', key: 'report', label: 'Issue Report' },
];

export function TestsWorkspaceNav({ current }: { current: TestsWorkspaceTab }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="section-title !mb-0">Tests workspace</p>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === current;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? 'border-[rgba(50,224,196,0.26)] bg-[rgba(50,224,196,0.14)] text-[var(--accent-secondary-text)]'
                : 'border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-secondary)] hover:border-[rgba(50,224,196,0.22)] hover:text-[var(--text-primary)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
