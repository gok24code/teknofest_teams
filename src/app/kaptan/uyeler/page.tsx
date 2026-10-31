import Link from "next/link";
import { captainAddMembers } from "@/app/actions/captain";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MembersInput } from "@/components/MembersInput";
import { Empty } from "@/components/ui";
import { requireCaptain } from "@/lib/auth";
import { membersOf } from "@/lib/stats";
import { UNIT_LABELS } from "@/lib/types";

export default async function CaptainMembersPage() {
  const { team, db } = await requireCaptain();
  const members = membersOf(db, team.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/kaptan" className="mb-3 inline-block text-sm font-medium text-navy-600">← Geri</Link>
        <h1 className="mb-1 text-2xl font-bold">Üyeleri düzenle</h1>
        <p className="text-sm text-navy-700/70">Bilgilerini düzenlemek veya takımdan çıkarmak için üyeye dokunun.</p>
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-navy-900">Üyeler ({members.length})</h2>
        {members.length === 0 ? (
          <Empty>Bu takıma henüz üye eklenmedi.</Empty>
        ) : (
          <div className="card divide-y divide-navy-100">
            {members.map((m) => (
              <Link key={m.id} href={`/kaptan/uyeler/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-3 active:bg-navy-50">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{m.fullName}</div>
                  <div className="truncate text-xs text-navy-700/60"><span className="font-semibold text-accent-700">{UNIT_LABELS[m.unit]}</span>{m.studentNo ? ` · ${m.studentNo}` : ""}{m.duty ? ` · ${m.duty}` : ""}</div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-accent-700">Düzenle</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-1 text-base font-bold text-navy-900">Üye ekle</h2>
        <p className="mb-4 text-sm text-navy-700/60">
          Listede zaten olan kişiler (aynı öğrenci no, numara yoksa aynı ad soyad) tekrar eklenmez.
        </p>
        <ActionForm action={captainAddMembers} resetOnSuccess className="space-y-4">
          <MembersInput required initialRows={1} />
          <SubmitButton>Üyeleri kaydet</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
