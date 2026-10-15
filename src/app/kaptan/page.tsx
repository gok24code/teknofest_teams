import Link from "next/link";
import { Empty, StatCard } from "@/components/ui";
import { requireCaptain } from "@/lib/auth";
import { TASK_STATUS_LABELS, UNIT_LABELS, taskStatus, type Task } from "@/lib/types";
import { formatDate, nextWeek, pct, sessionsOf, membersOf, memberStats, taskSummary, tasksOfTeam, teamStats } from "@/lib/stats";

export default async function CaptainHome() {
  const { team, db } = await requireCaptain();
  const sessions = sessionsOf(db, team.id);
  const students = membersOf(db, team.id);
  const stats = teamStats(db, team);
  const tasks = tasksOfTeam(db, team.id);
  const ts = taskSummary(tasks);
  const open = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);
  const names = new Map(students.map((m) => [m.id, m.fullName]));

  const taskRow = (t: Task) => (
    <div key={t.id} className="space-y-1 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{t.title}</div>
          <div className="truncate text-xs text-navy-700/60">
            {names.get(t.memberId) ?? "?"} · Atanma: {formatDate(t.assignedAt)} · {TASK_STATUS_LABELS[taskStatus(t)]}
          </div>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-navy-800">%{t.progress}</span>
      </div>
      {t.completionNote && <div className="text-xs italic text-navy-700/70">{t.completionNote}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/kaptan/yeni" className="btn-accent w-full py-4 text-base shadow-md">
        {nextWeek(sessions)}. hafta raporunu gir
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Üye" value={stats.memberCount} />
        <StatCard label="Hafta" value={stats.sessionCount} />
        <StatCard accent label="Katılım" value={pct(stats.rate)} />
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Takım görevleri</h2>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <StatCard label="Bekleyen" value={ts.pending + ts.inProgress} />
          <StatCard label="Tamamlanan" value={ts.done} />
          <StatCard accent label="İlerleme" value={pct(ts.progress)} />
        </div>
        {tasks.length === 0 ? (
          <Empty>Takıma henüz görev atanmadı.</Empty>
        ) : (
          <div className="space-y-3">
            {open.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-navy-700">Bekleyen ({open.length})</h3>
                <div className="card divide-y divide-navy-100">{open.map(taskRow)}</div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-navy-700">Tamamlanan ({completed.length})</h3>
                <div className="card divide-y divide-navy-100">{completed.map(taskRow)}</div>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Girilen haftalık raporlar</h2>
        {sessions.length === 0 ? (
          <Empty>Henüz rapor girilmedi.</Empty>
        ) : (
          <div className="card divide-y divide-navy-100">
            {[...sessions].reverse().map((s) => {
              const vals = Object.values(s.attendance);
              return (
                <Link key={s.id} href={`/kaptan/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-navy-50">
                  <div className="min-w-0">
                    <div className="font-semibold">{s.week}. hafta</div>
                    <div className="truncate text-xs text-navy-700/60">{formatDate(s.date)}{s.topic ? ` · ${s.topic}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-semibold">
                    <div className="text-emerald-700">{vals.filter((v) => v === "present").length} geldi</div>
                    <div className="text-red-700">{vals.filter((v) => v === "absent").length} gelmedi</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Üyeler, birimler ve devamsızlık</h2>
        {students.length === 0 ? (
          <Empty>Bu takıma henüz üye tanımlanmadı. Yönetimle iletişime geçin.</Empty>
        ) : (
          <div className="card divide-y divide-navy-100">
            {students.map((s) => {
              const st = memberStats(sessions, s.id);
              const over = st.absent > team.absenceLimit;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.fullName}</div>
                    <div className="text-xs text-navy-700/60"><span className="font-semibold text-accent-700">{UNIT_LABELS[s.unit]}</span>{s.studentNo ? ` · ${s.studentNo}` : ""}{s.duty ? ` · ${s.duty}` : ""}</div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${over ? "text-red-600" : "text-navy-800"}`}>
                    {st.absent}/{team.absenceLimit}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
