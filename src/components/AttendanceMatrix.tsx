import Link from "next/link";
import { formatDate, memberStats } from "@/lib/stats";
import type { Member, Session, Team } from "@/lib/types";
import { AbsenceBadge, Empty, RateBar, StatusDot } from "./ui";

/** Üye × hafta katılım tablosu ve üye başına devamsızlık sayıları. */
export function AttendanceMatrix({
  team,
  members,
  sessions,
  sessionHref,
  memberHref,
  rowActions,
}: {
  team: Team;
  members: Member[];
  sessions: Session[];
  sessionHref?: (s: Session) => string;
  memberHref?: (p: Member) => string;
  rowActions?: (p: Member) => React.ReactNode;
}) {
  if (!members.length) return <Empty>Bu takımda henüz üye yok.</Empty>;

  const rows = members
    .map((person) => ({ person, stats: memberStats(sessions, person.id) }))
    .sort((a, b) => b.stats.absent - a.stats.absent || a.person.fullName.localeCompare(b.person.fullName, "tr"));

  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-48">Üye</th>
            <th className="text-center">Devamsızlık</th>
            <th>Katılım</th>
            {sessions.map((s) => (
              <th key={s.id} className="text-center whitespace-nowrap">
                {sessionHref ? (
                  <Link href={sessionHref(s)} className="hover:text-accent-600" title={s.topic}>
                    {s.week}. hf
                    <div className="text-[10px] font-medium normal-case opacity-70">{formatDate(s.date).slice(0, 5)}</div>
                  </Link>
                ) : (
                  <span title={s.topic}>
                    {s.week}. hf
                    <div className="text-[10px] font-medium normal-case opacity-70">{formatDate(s.date).slice(0, 5)}</div>
                  </span>
                )}
              </th>
            ))}
            {rowActions && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ person, stats }) => {
            const over = stats.absent > team.absenceLimit;
            return (
            <tr key={person.id} className={over ? "bg-red-50" : undefined}>
              <td className={`sticky left-0 z-10 ${over ? "bg-red-50" : "bg-white"}`}>
                <div className="font-semibold text-navy-900">
                  {memberHref ? (
                    <Link href={memberHref(person)} className="hover:text-accent-600">{person.fullName}</Link>
                  ) : (
                    person.fullName
                  )}
                </div>
                <div className="text-xs text-navy-700/60">{person.studentNo ?? person.email ?? ""}</div>
              </td>
              <td className="text-center">
                <AbsenceBadge count={stats.absent} limit={team.absenceLimit} />
                {stats.excused > 0 && <div className="mt-1 text-[10px] text-accent-700">+{stats.excused} izinli</div>}
              </td>
              <td><RateBar rate={stats.rate} /></td>
              {sessions.map((s) => (
                <td key={s.id} className="text-center"><StatusDot status={s.attendance[person.id]} /></td>
              ))}
              {rowActions && <td className="text-right">{rowActions(person)}</td>}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
