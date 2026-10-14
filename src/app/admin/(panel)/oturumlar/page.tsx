import { revokeAdminSession } from "@/app/actions/admin";
import { ConfirmForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { adminSessionTtlMinutes, requireAdmin } from "@/lib/auth";
import { now, readAdminSessions } from "@/lib/db";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

function browserName(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Tarayıcı";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export default async function SessionsPage() {
  const current = await requireAdmin();
  const t = now();
  const sessions = (await readAdminSessions()).filter((s) => s.expiresAt > t).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        title="Yönetici oturumları"
        subtitle={`Her oturum açıldığı tarayıcıya bağlıdır ve ${adminSessionTtlMinutes()} dakika sonra otomatik olarak sona erer.`}
        actions={
          sessions.length > 1 && (
            <ConfirmForm action={revokeAdminSession} hidden={{ all: "1" }} message="Bu tarayıcı dışındaki tüm yönetici oturumları kapatılsın mı?">
              Diğer tüm oturumları kapat
            </ConfirmForm>
          )
        }
      />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Tarayıcı</th>
              <th>IP</th>
              <th>Açılış</th>
              <th>Bitiş</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="font-semibold">{browserName(s.userAgent)}</span>
                  {s.id === current && <span className="ml-2 rounded-full bg-accent-300/40 px-2 py-0.5 text-[10px] font-bold text-accent-700 uppercase">Bu tarayıcı</span>}
                </td>
                <td className="font-mono text-xs">{s.ip}</td>
                <td>{fmt(s.createdAt)}</td>
                <td>{fmt(s.expiresAt)}</td>
                <td className="text-right">
                  <ConfirmForm
                    action={revokeAdminSession}
                    hidden={{ id: s.id }}
                    message={s.id === current ? "Kendi oturumunuz kapatılacak. Emin misiniz?" : "Bu oturum kapatılsın mı?"}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Kapat
                  </ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
