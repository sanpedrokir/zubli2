import Link from "next/link";

export function PageShell({ children, className = "" }) {
  return <main className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 ${className}`}>{children}</main>;
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-clay">{eyebrow}</p>}
        <h1 className="heading">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-sand bg-white/50 px-6 py-10 text-center">
      <p className="font-serif text-lg text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingPage({ label = "Loading…" }) {
  return (
    <PageShell>
      <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
        <span className="sr-only">{label}</span>
        <div className="h-4 w-24 rounded-full bg-sand/70" />
        <div className="h-9 w-72 rounded-full bg-sand/70" />
        <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-white/70" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

const TONES = {
  strong: "bg-sage-soft text-ink",
  medium: "bg-honey-soft text-ink",
  faint: "bg-parchment text-ink-soft",
  clay: "bg-clay-soft text-clay-dark",
  rose: "bg-rose-soft text-clay-dark",
};

export function Chip({ tone = "faint", children }) {
  return <span className={`chip ${TONES[tone] ?? TONES.faint}`}>{children}</span>;
}

export function StatCard({ label, value, href, tone = "clay" }) {
  const accent = { clay: "text-clay", sage: "text-sage", honey: "text-honey", plum: "text-plum" }[tone];
  return (
    <Link href={href} className="card group block p-5 transition hover:-translate-y-0.5 hover:border-clay/40">
      <p className={`font-serif text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-ink-soft group-hover:text-ink">{label}</p>
    </Link>
  );
}

export function AiNotice({ children }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-honey-soft/70 px-4 py-3 text-xs leading-relaxed text-ink">
      <span aria-hidden="true">✦</span>
      <span>{children}</span>
    </p>
  );
}

export function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
