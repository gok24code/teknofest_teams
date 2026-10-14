import Link from "next/link";
import { Empty, PageHeader, RateBar } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { teamStats } from "@/lib/stats";

export default async function TeamsPage() {
  await requireAdmin();
  const db = await readDb();
  const teams = [...db.teams].sort(
    (a, b) => Number(a.archived) - Number(b.archived) || a.title.localeCompare(b.title, "tr"),
  );

  return (
    <>
      <PageHeader
        title="Takımlar"
        subtitle="Her takımın kendi üye listesi ve kaptan şifresi vardır."
        actions={<Link href="/admin/takimlar/yeni" className="btn-accent">+ Yeni takım</Link>}
      />
      {teams.length === 0 ? (
        <Empty>
          Henüz takım yok. <Link href="/admin/takimlar/yeni" className="font-semibold text-accent-700">İlk takımı oluşturun</Link>.
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Takım</th>
                <th className="text-center">Üye</th>
                <th className="text-center">Hafta</th>
                <th className="text-center">Devamsızlık</th>
                <th>Katılım</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((w) => {
                const s = teamStats(db, w);
                return (
                  <tr key={w.id} className={w.archived ? "opacity-60" : undefined}>
                    <td>
                      <Link href={`/admin/takimlar/${w.id}`} className="font-semibold hover:text-accent-600">{w.title}</Link>
                      {w.archived && <span className="ml-2 rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase">Arşiv</span>}
                      <div className="text-xs text-navy-700/60">{w.captainName || "Kaptan adı girilmedi"}</div>
                    </td>
                    <td className="text-center tabular-nums">{s.memberCount}</td>
                    <td className="text-center tabular-nums">{s.sessionCount}</td>
                    <td className="text-center tabular-nums">
                      {s.totalAbsences}
                      {s.overLimit > 0 && <div className="text-[10px] font-semibold text-red-600">{s.overLimit} sınır aşan</div>}
                    </td>
                    <td><RateBar rate={s.rate} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
