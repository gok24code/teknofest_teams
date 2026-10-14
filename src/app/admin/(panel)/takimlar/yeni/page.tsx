import { createTeam } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { MembersInput } from "@/components/MembersInput";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function NewTeamPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/takimlar", label: "Takımlar" }}
        title="Yeni takım"
        subtitle="Takım bilgilerini ve üyeleri girin. Kaptan, takım adı ve oluşturulan şifreyle giriş yapacak."
      />
      <ActionForm action={createTeam} resetOnSuccess className="space-y-6">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold">1. Takım bilgileri</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="title">Takım adı *</label>
              <input id="title" name="title" className="input" placeholder="ör. ISUBÜ Hava Savunma" required maxLength={120} />
              <p className="mt-1 text-xs text-navy-700/60">Kaptan bu adla giriş yapacak; kısa ve net tutun.</p>
            </div>
            <div>
              <label className="label" htmlFor="captainName">Kaptan adı</label>
              <input id="captainName" name="captainName" className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="advisorName">Danışman hoca</label>
              <input id="advisorName" name="advisorName" className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="category">Teknofest yarışma kategorisi</label>
              <input id="category" name="category" className="input" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="absenceLimit">Devamsızlık sınırı (hafta)</label>
              <input id="absenceLimit" name="absenceLimit" type="number" min={0} max={52} defaultValue={2} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="description">Açıklama</label>
              <input id="description" name="description" className="input" maxLength={500} />
            </div>
            <div>
              <label className="label" htmlFor="password">Kaptan şifresi</label>
              <input id="password" name="password" type="text" className="input" placeholder="Boş bırakın → güçlü şifre üretilir" autoComplete="off" maxLength={200} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-bold">2. Üyeler</h2>
          <MembersInput required initialRows={3} />
        </div>

        <SubmitButton className="btn-accent w-full py-3 text-base">Takımı oluştur</SubmitButton>
      </ActionForm>
    </>
  );
}
