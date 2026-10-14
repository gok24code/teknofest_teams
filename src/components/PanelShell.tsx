import { adminLogout as logout } from "@/app/actions/auth";
import { Logo, UniversityLogo } from "./Logo";
import { NavLinks } from "./NavLinks";

export function PanelShell({
  title,
  user,
  links,
  children,
}: {
  title: string;
  user: string;
  links: { href: string; label: string; exact?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="bg-navy-gradient relative flex shrink-0 flex-col text-white lg:sticky lg:top-0 lg:h-screen lg:w-64">
        <div className="bg-accent-gradient absolute inset-y-0 right-0 hidden w-[3px] lg:block" />
        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <Logo />
        </div>
        <div className="px-5 pb-3 text-[11px] font-semibold tracking-[0.2em] text-accent-400 uppercase">{title}</div>
        <NavLinks links={links} />
        <div className="mt-auto hidden border-t border-white/10 p-5 lg:block">
          <div className="mb-4">
            <UniversityLogo className="h-12" />
          </div>
          <div className="text-xs text-white/50">Oturum</div>
          <div className="truncate text-sm font-semibold">{user}</div>
          <form action={logout} className="mt-3">
            <button className="text-sm font-medium text-accent-300 hover:text-accent-400">Çıkış yap →</button>
          </form>
        </div>
        <form action={logout} className="absolute top-6 right-5 lg:hidden">
          <button className="text-sm font-medium text-accent-300">Çıkış</button>
        </form>
        <div className="bg-accent-gradient h-[3px] lg:hidden" />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
