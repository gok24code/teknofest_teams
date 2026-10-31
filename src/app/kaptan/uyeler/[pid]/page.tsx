import Link from "next/link";
import { notFound } from "next/navigation";
import { captainDeleteMember, captainUpdateMember } from "@/app/actions/captain";
import { ConfirmForm } from "@/components/forms";
import { MemberEditForm } from "@/components/MemberEditForm";
import { requireCaptain } from "@/lib/auth";

export default async function CaptainMemberPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  const { team, db } = await requireCaptain();
  const p = db.members.find((x) => x.id === pid && x.teamId === team.id);
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/kaptan/uyeler" className="mb-3 inline-block text-sm font-medium text-navy-600">← Üyeler</Link>
        <h1 className="text-2xl font-bold">{p.fullName}</h1>
      </div>

      <div className="card p-4">
        <h2 className="mb-4 text-base font-bold text-navy-900">Bilgileri düzenle</h2>
        <MemberEditForm member={p} action={captainUpdateMember} />
      </div>

      <div className="card p-4">
        <h2 className="mb-1 text-base font-bold text-red-700">Üyeyi takımdan çıkar</h2>
        <p className="mb-4 text-sm text-navy-700/60">Kişinin bu takımdaki katılım kayıtları, haftalık notları ve görevleri de silinir. Bu işlem geri alınamaz.</p>
        <ConfirmForm action={captainDeleteMember} hidden={{ id: p.id }} message={`${p.fullName} takımdan çıkarılsın mı?`}>
          Üyeyi çıkar
        </ConfirmForm>
      </div>
    </div>
  );
}
