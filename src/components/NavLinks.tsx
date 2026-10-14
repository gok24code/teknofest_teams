"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; exact?: boolean }[] }) {
  const pathname = usePathname();
  // En uzun eşleşen bağlantıyı aktif say (ör. /kaptan/hesap için "Hesabım").
  const matches = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeHref = links
    .filter((l) => (l.exact ? pathname === l.href : matches(l.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              active ? "bg-white/10 text-accent-300 ring-1 ring-accent-500/40" : "text-white/75 hover:bg-white/5 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
