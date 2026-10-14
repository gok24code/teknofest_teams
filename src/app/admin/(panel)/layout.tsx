import { PanelShell } from "@/components/PanelShell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <PanelShell
      title="Yönetim Paneli"
      user="Yönetici"
      links={[
        { href: "/admin", label: "Genel Bakış", exact: true },
        { href: "/admin/takimlar", label: "Takımlar" },
        { href: "/admin/uyeler", label: "Tüm Üyeler" },
        { href: "/admin/oturumlar", label: "Oturumlar" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
