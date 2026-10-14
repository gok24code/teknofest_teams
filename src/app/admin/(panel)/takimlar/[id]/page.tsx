import Link from "next/link";
import { notFound } from "next/navigation";
import { addMembersToTeam, deleteMember, deleteTeam, resetTeamPassword, updateTeam } from "@/app/actions/admin";
import { AttendanceMatrix } from "@/components/AttendanceMatrix";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { MembersInput } from "@/components/MembersInput";
import { PageHeader, StatCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { StatusDot } from "@/components/ui";
import { UNIT_LABELS } from "@/lib/types";
import { formatDate, nextWeek, membersOf, pct, sessionsOf, teamStats, unitGroups } from "@/lib/stats";

export default async function AdminTeamPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === id);
  if (!team) notFound();

  const members = membersOf(db, team.id);
  const sessions = sessionsOf(db, team.id);
  const stats = teamStats(db, team);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/takimlar", label: "Takımlar" }}
        title={team.title}
        subtitle={`Kaptan: ${team.captainName || "girilmedi"} · Danışman: ${team.advisorName || "girilmedi"}${team.category ? ` · ${team.category}` : ""} · Devamsızlık sınırı: ${team.absenceLimit} hafta${team.archived ? " · Arşivlenmiş" : ""}`}
        actions={
          <>
            <a href={`/admin/csv/${team.id}`} className="btn-ghost">CSV indir</a>
            <Link href={`/admin/takimlar/${team.id}/hafta/yeni`} className="btn-accent">+ {nextWeek(sessions)}. hafta raporu</Link>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Üye" value={stats.memberCount} />
        <StatCard label="Haftalık rapor" value={stats.sessionCount} hint="girilen hafta" />
        <StatCard label="Toplam devamsızlık" value={stats.totalAbsences} />
        <StatCard accent label="Katılım oranı" value={pct(stats.rate)} hint={`${stats.overLimit} üye sınırı aştı`} />
      </div>

      <h2 className="mb-3 text-lg font-bold">Birimler ve uygulama planındaki görevler</h2>
      {members.length === 0 ? (
        <p className="mb-8 text-sm text-navy-700/60">Henüz üye girilmedi.</p>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {unitGroups(members).map((g) => (
            <div key={g.unit} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-accent-700">{g.label}</h3>
                <span className="text-xs font-semibold text-navy-700/60">{g.members.length} üye</span>
              </div>
              <ul className="divide-y divide-navy-100">
                {g.members.map((m) => (
                  <li key={m.id} className="py-2">
                    <Link href={`/admin/takimlar/${team.id}/uye/${m.id}`} className="font-semibold hover:underline">{m.fullName}</Link>
                    <div className="text-sm text-navy-700/70">{m.duty || <span className="italic text-navy-700/40">Görev girilmemiş</span>}</div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-1 text-lg font-bold">Hafta hafta katılım</h2>
      <p className="mb-3 text-xs text-navy-700/60">Düzenlemek için hafta başlığına tıklayın. Yeşil: geldi · Kırmızı: gelmedi · Sarı: izinli</p>
      <AttendanceMatrix
        team={team}
        members={members}
        sessions={sessions}
        sessionHref={(s) => `/admin/takimlar/${team.id}/hafta/${s.id}`}
        memberHref={(p) => `/admin/takimlar/${team.id}/uye/${p.id}`}
        rowActions={(p) => (
          <ConfirmForm
            action={deleteMember}
            hidden={{ id: p.id }}
            message={`${p.fullName} bu takımdan silinsin mi? Bu takımdaki rapor kayıtları da silinir.`}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Sil
          </ConfirmForm>
        )}
      />

      <h2 className="mt-8 mb-3 text-lg font-bold">Haftalık raporlar (kaptanın girdiği notlar)</h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-navy-700/60">Kaptan henüz haftalık rapor girmedi.</p>
      ) : (
        <div className="space-y-3">
          {[...sessions].reverse().map((s) => (
            <details key={s.id} className="card p-4" open={s === sessions[sessions.length - 1]}>
              <summary className="cursor-pointer font-semibold">
                {s.week}. hafta · {formatDate(s.date)}
                {s.topic ? <span className="font-normal text-navy-700/70"> · {s.topic}</span> : null}
              </summary>
              <ul className="mt-3 divide-y divide-navy-100">
                {members.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 py-2 text-sm">
                    <StatusDot status={s.attendance[m.id]} />
                    <div className="min-w-0">
                      <span className="font-semibold">{m.fullName}</span>{" "}
                      <span className="text-xs text-navy-700/60">({UNIT_LABELS[m.unit]})</span>
                      <div className="text-navy-700/80">{s.notes?.[m.id] || <span className="italic text-navy-700/40">Not girilmemiş</span>}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      <div className="card mt-8 p-5">
        <h2 className="mb-1 text-lg font-bold">Üye ekle</h2>
        <p className="mb-4 text-sm text-navy-700/60">
          Listede zaten olan kişiler (aynı öğrenci no, numara yoksa aynı ad soyad) tekrar eklenmez.
        </p>
        <ActionForm action={addMembersToTeam} resetOnSuccess className="space-y-4">
          <input type="hidden" name="teamId" value={team.id} />
          <MembersInput required initialRows={1} />
          <SubmitButton>Üyeleri kaydet</SubmitButton>
        </ActionForm>
      </div>

      <div className="mt-8 grid gap-8 items-start lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-1 text-lg font-bold">Kaptan şifresi</h2>
          <p className="mb-4 text-sm text-navy-700/60">
            Şifreler geri okunamayacak şekilde saklanır. Yeni şifre belirlendiğinde kaptanın açık oturumları kapanır.
          </p>
          <ActionForm action={resetTeamPassword} resetOnSuccess className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={team.id} />
            <input name="password" type="text" className="input min-w-0 flex-1" placeholder="Boş → otomatik üret" autoComplete="off" maxLength={200} />
            <SubmitButton className="btn-navy">Yeni şifre</SubmitButton>
          </ActionForm>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold">Takım ayarları</h2>
          <ActionForm action={updateTeam} className="space-y-4">
            <input type="hidden" name="id" value={team.id} />
            <div>
              <label className="label" htmlFor="title">Takım adı (kaptan girişinde kullanılır)</label>
              <input id="title" name="title" defaultValue={team.title} className="input" required maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="captainName">Kaptan adı</label>
              <input id="captainName" name="captainName" defaultValue={team.captainName} className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="advisorName">Danışman hoca</label>
              <input id="advisorName" name="advisorName" defaultValue={team.advisorName} className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="category">Teknofest yarışma kategorisi</label>
              <input id="category" name="category" defaultValue={team.category} className="input" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="description">Açıklama</label>
              <textarea id="description" name="description" rows={2} defaultValue={team.description} className="input" maxLength={500} />
            </div>
            <div>
              <label className="label" htmlFor="absenceLimit">Devamsızlık sınırı (hafta)</label>
              <input id="absenceLimit" name="absenceLimit" type="number" min={0} max={52} defaultValue={team.absenceLimit} className="input" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="archived" defaultChecked={team.archived} className="accent-accent-600" />
              Arşivle (kaptan giriş yapamaz)
            </label>
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
        </div>

        <div className="card border-red-100 p-5">
          <h2 className="mb-1 text-lg font-bold text-red-700">Takımı sil</h2>
          <p className="mb-4 text-sm text-navy-700/60">Takım, üye listesi ve tüm haftalık raporları kalıcı olarak silinir.</p>
          <ConfirmForm action={deleteTeam} hidden={{ id: team.id }} message={`“${team.title}” ve tüm raporları kalıcı olarak silinsin mi?`}>
            Takımı sil
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
