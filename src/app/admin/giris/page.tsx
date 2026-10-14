import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminLogin } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoMark, OrgFooter } from "@/components/Logo";
import { adminSessionTtlMinutes, getAdminSessionId } from "@/lib/auth";

export const metadata: Metadata = { title: "Yönetim" };

export default async function AdminLoginPage() {
  if (await getAdminSessionId()) redirect("/admin");
  return (
    <div className="bg-navy-gradient flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark className="h-24 w-32" priority />
          <span className="text-accent-gradient text-3xl font-black tracking-[0.25em]">TTS</span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-accent-gradient h-1" />
          <div className="p-7">
            <h1 className="text-xl font-bold text-navy-900">Yönetim Paneli</h1>
            <p className="mt-1 mb-6 text-sm text-navy-700/70">
              Oturum bu tarayıcıya özeldir ve {adminSessionTtlMinutes()} dakika sonra sona erer.
            </p>
            <ActionForm action={adminLogin} className="space-y-4">
              <div>
                <label className="label" htmlFor="password">Yönetici şifresi</label>
                <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus maxLength={500} />
              </div>
              <SubmitButton className="btn-accent w-full py-2.5" pendingText="Giriş yapılıyor…">Giriş yap</SubmitButton>
            </ActionForm>
          </div>
        </div>
        <OrgFooter />
      </div>
    </div>
  );
}
