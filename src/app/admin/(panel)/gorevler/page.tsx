import Link from "next/link";
import { AdminTaskItem, TaskAssignForm } from "@/components/AdminTasks";
import { Empty, PageHeader, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { pct, taskSummary } from "@/lib/stats";
import { TASK_STATUS_LABELS, taskStatus, type TaskStatus } from "@/lib/types";

export const metadata = { title: "Görevler" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; durum?: string }>;
}) {
  await requireAdmin();
  const { team = "", durum = "" } = await searchParams;
  const db = await readDb();
  const teams = [...db.teams].sort((a, b) => a.title.localeCompare(b.title, "tr"));
  const active = teams.filter((t) => !t.archived);
  const teamById = new Map(db.teams.map((t) => [t.id, t]));
  const memberById = new Map(db.members.map((m) => [m.id, m]));

  const targets = [
    { value: "all", label: "Tüm üyeler (aktif takımlar)" },
    ...active.map((t) => ({ value: `team:${t.id}`, label: `Takım: ${t.title}` })),
    ...active.flatMap((t) =>
      db.members
        .filter((m) => m.teamId === t.id)
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"))
        .map((m) => ({ value: `member:${m.id}`, label: `${t.title} · ${m.fullName}` })),
    ),
  ];

  const scoped = db.tasks.filter((t) => !team || t.teamId === team);
  const summary = taskSummary(scoped);
  const statuses = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
  const shown = scoped
    .filter((t) => !durum || taskStatus(t) === durum)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));

  const chip = (href: string, label: string, on: boolean) => (
    <Link key={label} href={href} className={on ? "btn-accent" : "btn-ghost"}>{label}</Link>
  );
  const qs = (t: string, d: string) => {
    const p = new URLSearchParams();
    if (t) p.set("team", t);
    if (d) p.set("durum", d);
    const s = p.toString();
    return `/admin/gorevler${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Görevler" subtitle="Üyelere görev atayın ve bildirdikleri ilerlemeyi izleyin." />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Bekleyen" value={summary.pending} />
        <StatCard label="Devam eden" value={summary.inProgress} />
        <StatCard label="Tamamlanan" value={summary.done} />
        <StatCard accent label="Ortalama ilerleme" value={pct(summary.progress)} hint={`${summary.total} görev`} />
      </div>

      <div className="card mb-8 p-5">
        <h2 className="mb-4 text-lg font-bold">Yeni görev ata</h2>
        <TaskAssignForm targets={targets} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {chip(qs("", durum), "Tüm takımlar", !team)}
        {teams.map((t) => chip(qs(t.id, durum), t.title, team === t.id))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {chip(qs(team, ""), "Tüm durumlar", !durum)}
        {statuses.map((s) => chip(qs(team, s), TASK_STATUS_LABELS[s], durum === s))}
      </div>

      <div className="card p-5">
        {shown.length === 0 ? (
          <Empty>Görev bulunamadı.</Empty>
        ) : (
          <ul className="divide-y divide-navy-100">
            {shown.map((t) => {
              const m = memberById.get(t.memberId);
              return (
                <AdminTaskItem
                  key={t.id}
                  task={t}
                  owner={
                    <>
                      <span className="font-semibold text-navy-800">{m?.fullName ?? "?"}</span> · {teamById.get(t.teamId)?.title}
                    </>
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
