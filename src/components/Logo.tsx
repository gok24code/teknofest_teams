import Image from "next/image";

export const ORG_NAME = "ISUBÜ Teknofest Takımları";
export const UNIVERSITY_NAME = "Isparta Uygulamalı Bilimler Üniversitesi";

/** Teknofest logosu. Renkli logo koyu zeminde okunmadığı için beyaz kutu içinde gösterilir. */
export function LogoMark({ className = "h-10 w-14", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-md ring-1 ring-accent-500/40 ${className}`}>
      <Image src="/logo-teknofest.png" alt="TEKNOFEST" fill sizes="(max-width: 640px) 120px, 160px" className="object-contain p-1" priority={priority} />
    </span>
  );
}

export function Logo({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark className="h-11 w-14" />
      <div className="leading-tight">
        <div className="text-accent-gradient text-xl font-black tracking-[0.2em]">TTS</div>
        {subtitle && <div className="text-[11px] font-medium text-white/60">Teknofest Takım Takip Sistemi</div>}
      </div>
    </div>
  );
}

/** Üniversite logosu. Renkli logo koyu zeminde okunmadığı için beyaz kutu içinde gösterilir. */
export function UniversityLogo({ className = "h-14" }: { className?: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
      <Image src="/logo-isubu.svg" alt={UNIVERSITY_NAME} width={300} height={300} className={`w-auto ${className}`} />
    </span>
  );
}

/** Giriş ekranlarının altındaki kurum bilgisi. */
export function OrgFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 px-4 py-5 text-center">
      <UniversityLogo />
      <p className="text-xs font-medium text-white/60">{ORG_NAME}</p>
    </footer>
  );
}
