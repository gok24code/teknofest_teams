import { memberReportTask } from "@/app/actions/member";
import { TaskReporter } from "@/components/TaskReporter";
import { Empty, RateBar, StatCard } from "@/components/ui";
import { requireMember } from "@/lib/auth";
import { formatDate, memberStats, pct, sessionsOf, taskSummary, tasksOfMember } from "@/lib/stats";
import { UNIT_LABELS } from "@/lib/types";

export default async function MemberHome() {
  const { member, team, db } = await requireMember();
  const tasks = tasksOfMember(db, member.id);
  const summary = taskSummary(tasks);
  const open = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);
  const sessions = sessionsOf(db, team.id);
  const stats = memberStats(sessions, member.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Merhaba, {member.fullName}</h1>
        <p className="text-sm text-navy-700/70">
          <span className="font-semibold text-accent-700">{UNIT_LABELS[member.unit]}</span>
          {member.duty ? ` · ${member.duty}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Bekleyen" value={summary.pending} />
        <StatCard label="Devam eden" value={summary.inProgress} />
        <StatCard label="Tamamlanan" value={summary.done} />
        <StatCard accent label="İlerleme" value={pct(summary.progress)} hint={`${summary.total} görev`} />
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Bekleyen görevlerim</h2>
        {open.length === 0 ? (
          <Empty>{tasks.length ? "Bekleyen göreviniz yok. 🎉" : "Size henüz görev atanmadı."}</Empty>
        ) : (
          <div className="card divide-y divide-navy-100">
            {open.map((t) => (
              <TaskReporter key={`${t.id}:${t.updatedAt}`} task={t} assignedLabel={formatDate(t.assignedAt)} report={memberReportTask} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Tamamlanan görevlerim</h2>
        {completed.length === 0 ? (
          <Empty>Henüz tamamlanan görev yok.</Empty>
        ) : (
          <div className="card divide-y divide-navy-100">
            {completed.map((t) => (
              <details key={t.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{t.title}</div>
                    <div className="text-xs text-navy-700/60">
                      Atanma: {formatDate(t.assignedAt)}{t.completedAt ? ` · Tamamlanma: ${formatDate(t.completedAt)}` : ""}
                    </div>
                  </div>
                </summary>
                <div className="mt-3 space-y-1 text-sm text-navy-700/80">
                  {t.description && <p className="whitespace-pre-line">{t.description}</p>}
                  <p className="italic text-navy-700/60">{t.completionNote || "Tamamlama notu girilmedi."}</p>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Katılım durumum</h2>
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="flex gap-4 font-semibold">
            <span className="text-emerald-700">{stats.present} geldi</span>
            <span className={stats.absent > team.absenceLimit ? "text-red-600" : "text-navy-800"}>
              {stats.absent}/{team.absenceLimit} gelmedi
            </span>
            <span className="text-navy-700">{stats.excused} izinli</span>
          </div>
          <RateBar rate={stats.rate} />
        </div>
        {sessions.length > 0 && (
          <div className="card mt-3 divide-y divide-navy-100">
            {[...sessions].reverse().filter((s) => s.attendance[member.id] || s.notes?.[member.id]).map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                <div className="font-semibold">{s.week}. hafta <span className="text-xs font-normal text-navy-700/60">{formatDate(s.date)}</span></div>
                <div className="text-navy-700/80">{s.notes?.[member.id] || <span className="italic text-navy-700/40">Not girilmemiş</span>}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
