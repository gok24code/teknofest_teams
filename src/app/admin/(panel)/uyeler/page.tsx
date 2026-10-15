import Link from "next/link";
import { AbsenceBadge, Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { personOverviews } from "@/lib/stats";

export default async function AllMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; team?: string; filtre?: string }>;
}) {
  await requireAdmin();
  const { q = "", team = "", filtre } = await searchParams;
  const db = await readDb();
  const query = String(q).trim().toLocaleLowerCase("tr");

  const people = personOverviews(db)
    .filter((o) => !team || o.entries.some((e) => e.team.id === team))
    .filter((o) => filtre !== "sinir" || o.overLimit)
    .filter((o) => {
      if (!query) return true;
      const p = o.person;
      return [p.fullName, p.studentNo, p.email, p.phone, p.department].some((v) => v?.toLocaleLowerCase("tr").includes(query));
    })
    .sort((a, b) => b.totalAbsences - a.totalAbsences || a.person.fullName.localeCompare(b.person.fullName, "tr"));

  const teams = [...db.teams].sort((a, b) => a.title.localeCompare(b.title, "tr"));

  return (
    <>
      <PageHeader
        title="Tüm Üyeler"
        subtitle={`${db.members.length} kayıt · aynı öğrenci numarası birden fazla takımdaysa tek satırda gösterilir`}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="İsim, numara, e-posta, telefon, bölüm…" className="input max-w-xs" maxLength={100} />
        <select name="team" defaultValue={team} className="input w-auto">
          <option value="">Tüm takımlar</option>
          {teams.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
        <select name="filtre" defaultValue={filtre ?? ""} className="input w-auto">
          <option value="">Herkes</option>
          <option value="sinir">Sınırı aşanlar</option>
        </select>
        <button className="btn-navy">Filtrele</button>
      </form>

      {people.length === 0 ? (
        <Empty>{db.members.length ? "Aramaya uyan üye yok." : "Henüz üye yok. Takım oluştururken üyeleri girin."}</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>İletişim</th>
                <th>Takım · devamsızlık</th>
                <th className="text-center">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {people.map(({ key, person, entries, totalAbsences, totalExcused, overLimit }) => (
                <tr key={key} className={overLimit ? "bg-red-50/60" : undefined}>
                  <td>
                    <Link href={`/admin/takimlar/${person.teamId}/uye/${person.id}`} className="font-semibold hover:text-accent-600 hover:underline">
                      {person.fullName}
                    </Link>
                    <div className="text-xs text-navy-700/60">{[person.studentNo, person.department].filter(Boolean).join(" · ") || "—"}</div>
                  </td>
                  <td className="text-xs">
                    {person.email && <div><a href={`mailto:${person.email}`} className="hover:text-accent-600">{person.email}</a></div>}
                    {person.phone && <div><a href={`tel:${person.phone.replace(/\s/g, "")}`} className="hover:text-accent-600">{person.phone}</a></div>}
                    {!person.email && !person.phone && <span className="text-navy-700/40">—</span>}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {entries.map(({ member, team: w, stats }) => (
                        <Link
                          key={member.id}
                          href={`/admin/takimlar/${w.id}/uye/${member.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-navy-100 bg-white py-0.5 pr-0.5 pl-2.5 text-xs hover:border-accent-500"
                          title={`${stats.present} geldi · ${stats.absent} gelmedi${stats.excused ? ` · ${stats.excused} izinli` : ""}`}
                        >
                          {w.title}
                          {w.archived && <span className="text-[10px] text-navy-700/50">(arşiv)</span>}
                          <AbsenceBadge count={stats.absent} limit={w.absenceLimit} />
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`text-lg font-bold tabular-nums ${overLimit ? "text-red-600" : "text-navy-900"}`}>{totalAbsences}</span>
                    {totalExcused > 0 && <div className="text-[10px] text-accent-700">+{totalExcused} izinli</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
