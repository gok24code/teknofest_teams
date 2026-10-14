import Link from "next/link";
import { pct } from "@/lib/stats";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-sm font-medium text-navy-600 hover:text-accent-600">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-navy-700/70">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = false }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={accent ? "bg-navy-gradient rounded-2xl p-5 text-white shadow-md" : "card p-5"}>
      <div className={`text-xs font-semibold tracking-wide uppercase ${accent ? "text-accent-300" : "text-navy-700/70"}`}>{label}</div>
      <div className={`mt-2 text-3xl font-bold ${accent ? "text-accent-gradient" : "text-navy-900"}`}>{value}</div>
      {hint && <div className={`mt-1 text-xs ${accent ? "text-white/60" : "text-navy-700/60"}`}>{hint}</div>}
    </div>
  );
}

export function RateBar({ rate }: { rate: number }) {
  const color = rate >= 0.8 ? "bg-emerald-500" : rate >= 0.6 ? "bg-accent-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-navy-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.round(rate * 100)}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-navy-700">{pct(rate)}</span>
    </div>
  );
}

export function AbsenceBadge({ count, limit }: { count: number; limit?: number }) {
  const over = limit !== undefined && count > limit;
  const near = limit !== undefined && !over && count === limit && count > 0;
  const cls = over
    ? "bg-red-100 text-red-700 ring-red-200"
    : near
      ? "bg-accent-300/40 text-accent-700 ring-accent-400/50"
      : count > 0
        ? "bg-navy-100 text-navy-800 ring-navy-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return (
    <span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ring-1 ${cls}`}>
      {count}
      {limit !== undefined && <span className="font-medium opacity-60">/{limit}</span>}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-navy-100 p-8 text-center text-sm text-navy-700/60">{children}</div>;
}

export function StatusDot({ status }: { status?: "present" | "absent" | "excused" }) {
  if (!status) return <span className="text-navy-700/30">–</span>;
  const map = {
    present: ["bg-emerald-500", "Var"],
    absent: ["bg-red-500", "Yok"],
    excused: ["bg-accent-500", "İzinli"],
  } as const;
  const [color, label] = map[status];
  return <span title={label} aria-label={label} className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}
