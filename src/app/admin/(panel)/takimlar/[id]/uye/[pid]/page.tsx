import { notFound } from "next/navigation";
import { deleteMember, updateMember } from "@/app/actions/admin";
import { ActionForm, ConfirmForm, SubmitButton } from "@/components/forms";
import { AbsenceBadge, PageHeader, RateBar, StatCard, StatusDot } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatDate, memberStats, pct, sessionsOf } from "@/lib/stats";
import { UNITS, UNIT_LABELS } from "@/lib/types";

export default async function MemberPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  await requireAdmin();
  const { id, pid } = await params;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === id);
  const p = db.members.find((x) => x.id === pid && x.teamId === id);
  if (!team || !p) notFound();
  const sessions = sessionsOf(db, id);
  const stats = memberStats(sessions, p.id);

  const fields = [
    { name: "fullName", label: "Ad soyad *", value: p.fullName, required: true, max: 100 },
    { name: "studentNo", label: "Öğrenci no", value: p.studentNo, max: 30 },
    { name: "email", label: "E-posta", value: p.email, type: "email", max: 120 },
    { name: "phone", label: "Telefon", value: p.phone, type: "tel", max: 30 },
    { name: "department", label: "Bölüm", value: p.department, max: 100 },
  ];

  return (
    <>
      <PageHeader
        back={{ href: `/admin/takimlar/${id}`, label: team.title }}
        title={p.fullName}
        subtitle={[UNIT_LABELS[p.unit], p.studentNo, p.department, p.email, p.phone].filter(Boolean).join(" · ") || "Ek bilgi girilmemiş"}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Geldi" value={stats.present} hint="hafta" />
        <StatCard label="Gelmedi" value={<span className={stats.absent > team.absenceLimit ? "text-red-600" : ""}>{stats.absent}</span>} hint={`sınır: ${team.absenceLimit}`} />
        <StatCard label="İzinli" value={stats.excused} />
        <StatCard accent label="Katılım" value={pct(stats.rate)} />
      </div>

      <div className="card mb-8 p-5">
        <h2 className="mb-1 text-lg font-bold">Uygulama planındaki görevi</h2>
        <p className="text-sm text-navy-700/80">{p.duty || <span className="italic text-navy-700/40">Görev girilmemiş</span>}</p>
      </div>

      <div className="card mb-8 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Hafta hafta katılım ve notlar</h2>
          <div className="flex items-center gap-4">
            <RateBar rate={stats.rate} />
            <AbsenceBadge count={stats.absent} limit={team.absenceLimit} />
          </div>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-navy-700/60">Henüz rapor girilmedi.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {[...sessions].reverse().map((s) => (
              <li key={s.id} className="flex items-start gap-3 py-2 text-sm">
                <StatusDot status={s.attendance[p.id]} />
                <div className="min-w-0">
                  <span className="font-semibold">{s.week}. hafta</span>{" "}
                  <span className="text-xs text-navy-700/60">{formatDate(s.date)}{s.topic ? ` · ${s.topic}` : ""}</span>
                  <div className="text-navy-700/80">{s.notes?.[p.id] || <span className="italic text-navy-700/40">Not girilmemiş</span>}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold">Bilgileri düzenle</h2>
          <ActionForm action={updateMember} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={p.id} />
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label" htmlFor={f.name}>{f.label}</label>
                <input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={f.value} required={f.required} maxLength={f.max} className="input" />
              </div>
            ))}
            <div>
              <label className="label" htmlFor="unit">Birim *</label>
              <select id="unit" name="unit" defaultValue={p.unit} required className="input">
                {UNITS.map((u) => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="duty">Uygulama planındaki görevi</label>
              <textarea id="duty" name="duty" rows={3} maxLength={500} defaultValue={p.duty} className="input" />
            </div>
            <div className="sm:col-span-2"><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-1 text-lg font-bold text-red-700">Üyeyi sil</h2>
          <p className="mb-4 text-sm text-navy-700/60">Kişi bu takımdan silinir ve bu takımdaki rapor kayıtları da silinir. Diğer takımlar etkilenmez.</p>
          <ConfirmForm action={deleteMember} hidden={{ id: p.id, redirect: "1" }} message={`${p.fullName} silinsin mi?`}>
            Üyeyi sil
          </ConfirmForm>
        </div>
      </div>
    </>
  );
}
