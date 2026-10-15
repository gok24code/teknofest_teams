import Link from "next/link";
import { redirect } from "next/navigation";
import { captainLogin } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoMark, OrgFooter } from "@/components/Logo";
import { getCaptainTeam } from "@/lib/auth";
import { readDb } from "@/lib/db";

export const metadata = { title: "Kaptan Girişi" };

export default async function CaptainLoginPage() {
  if (await getCaptainTeam()) redirect("/kaptan");
  const teams = (await readDb()).teams
    .filter((w) => !w.archived)
    .sort((a, b) => a.title.localeCompare(b.title, "tr"));
  return (
    <div className="bg-navy-gradient relative flex min-h-dvh flex-col overflow-hidden text-white">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-accent-500/10 blur-3xl" />
      <main className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="h-24 w-32" priority />
          <h1 className="text-accent-gradient mt-4 text-5xl font-black tracking-[0.25em]">TTS</h1>
          <p className="mt-2 text-sm font-medium text-white/70">Teknofest Takım Takip Sistemi</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white text-navy-900 shadow-2xl">
          <div className="bg-accent-gradient h-1" />
          <div className="p-6">
            <h2 className="text-lg font-bold">Kaptan Girişi</h2>
            <p className="mt-1 mb-5 text-sm text-navy-700/70">Takımınızı seçin ve size verilen şifreyi girin.</p>
            <ActionForm action={captainLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="team">Takım</label>
                <select id="team" name="team" className="input py-3 text-base" required defaultValue="">
                  <option value="" disabled>
                    {teams.length ? "Takım seçin" : "Aktif takım yok"}
                  </option>
                  {teams.map((w) => (
                    <option key={w.id} value={w.id}>{w.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="password">Şifre</label>
                <input id="password" name="password" type="password" className="input py-3 text-base" autoComplete="current-password" required maxLength={200} />
              </div>
              <SubmitButton className="btn-accent w-full py-3 text-base" pendingText="Giriş yapılıyor…">Giriş yap</SubmitButton>
            </ActionForm>
            <p className="mt-4 text-center text-sm text-navy-700/70">
              Takım üyesi misiniz? <Link href="/uye/giris" className="font-semibold text-accent-700 hover:underline">Üye girişi</Link>
            </p>
          </div>
        </div>
      </main>
      <div className="bg-accent-gradient h-1 w-full" />
      <OrgFooter />
    </div>
  );
}
