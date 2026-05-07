import type { ReactNode } from "react";
import { cn, formatGameLabel } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/format";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("card-surface p-5 sm:p-6", className)}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="panel-muted p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
      {meta ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{meta}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: "accent" | "warning" | "danger";
}) {
  const barClass =
    tone === "danger"
      ? "bg-[var(--coral)]"
      : tone === "warning"
        ? "bg-[var(--warning)]"
        : "bg-[var(--accent)]";

  return (
    <div className="h-3 overflow-hidden rounded-full bg-white/8">
      <div
        className={cn("h-full rounded-full transition-all", barClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    draft: "border-white/12 bg-white/6 text-white/70",
    active: "border-[rgba(55,214,122,0.22)] bg-[rgba(55,214,122,0.14)] text-[var(--success)]",
    upcoming: "border-[rgba(246,183,60,0.24)] bg-[rgba(246,183,60,0.14)] text-[var(--warning)]",
    live: "border-[rgba(55,214,122,0.22)] bg-[rgba(55,214,122,0.14)] text-[var(--success)]",
    completed: "border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] text-[var(--accent)]",
    claimed: "border-[rgba(50,224,196,0.22)] bg-[rgba(50,224,196,0.14)] text-[var(--accent)]",
    cancelled: "border-[rgba(255,107,107,0.22)] bg-[rgba(255,107,107,0.14)] text-[var(--coral)]",
    paid: "border-[rgba(55,214,122,0.22)] bg-[rgba(55,214,122,0.14)] text-[var(--success)]",
    pending: "border-[rgba(246,183,60,0.24)] bg-[rgba(246,183,60,0.14)] text-[var(--warning)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
        palette[status] ?? palette.draft,
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

export function GameChip({ game }: { game: string | null | undefined }) {
  const palette: Record<string, string> = {
    efootball: "border-violet-400/30 bg-violet-400/15 text-violet-200",
    codm: "border-orange-400/30 bg-orange-400/15 text-orange-200",
    pubgm: "border-sky-400/30 bg-sky-400/15 text-sky-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
        palette[game ?? ""] ?? "border-white/12 bg-white/6 text-white/70",
      )}
    >
      {formatGameLabel(game)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-muted flex flex-col items-start gap-3 p-5">
      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
