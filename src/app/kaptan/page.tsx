import Link from "next/link";
import { Empty, StatCard } from "@/components/ui";
import { requireCaptain } from "@/lib/auth";
import { UNIT_LABELS } from "@/lib/types";
import { formatDate, nextWeek, pct, sessionsOf, membersOf, memberStats, teamStats } from "@/lib/stats";

export default async function CaptainHome() {
  const { team, db } = await requireCaptain();
  const sessions = sessionsOf(db, team.id);
  const students = membersOf(db, team.id);
  const stats = teamStats(db, team);

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
