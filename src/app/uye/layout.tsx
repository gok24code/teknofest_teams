import Link from "next/link";
import { memberLogout } from "@/app/actions/auth";
import { LogoMark } from "@/components/Logo";
import { getMember } from "@/lib/auth";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  // Giriş sayfası da bu layout'un altında; oturum yoksa yalnızca çocuğu göster.
  const session = await getMember();
  if (!session) return <>{children}</>;
  const { member, team } = session;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-navy-gradient sticky top-0 z-30 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/uye" className="flex min-w-0 flex-1 items-center gap-3">
            <LogoMark className="h-9 w-12 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-accent-gradient text-xs font-black tracking-[0.2em]">TTS</div>
              <div className="truncate text-sm font-semibold">{member.fullName} · {team.title}</div>
            </div>
          </Link>
          <form action={memberLogout}>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-accent-300 hover:bg-white/5">Çıkış</button>
          </form>
        </div>
        <div className="bg-accent-gradient h-[3px]" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
