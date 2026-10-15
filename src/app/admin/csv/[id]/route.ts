import { getAdminSessionId } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { UNIT_LABELS } from "@/lib/types";
import { formatDate, sessionsOf, membersOf, memberStats, taskSummary } from "@/lib/stats";

const LABEL = { present: "Geldi", absent: "Gelmedi", excused: "İzinli" } as const;

const cell = (v: string | number | undefined) => {
  const s = String(v ?? "");
  // Excel formül enjeksiyonuna karşı
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSessionId())) return new Response("Yetkisiz", { status: 401 });
  const { id } = await params;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === id);
  if (!team) return new Response("Bulunamadı", { status: 404 });

  const sessions = sessionsOf(db, id);
  const header = ["Ad Soyad", "Öğrenci No", "E-posta", "Telefon", "Bölüm", "Birim", "Görev", ...sessions.map((s) => `${s.week}. hafta (${formatDate(s.date)})`), "Devamsızlık", "İzinli", "Görev (tamamlanan/toplam)", "Görev ilerleme"];
  const lines = [header.map(cell).join(";")];
  for (const st of membersOf(db, team.id)) {
    const stats = memberStats(sessions, st.id);
    const marks = sessions.map((s) => {
      const v = s.attendance[st.id];
      const note = s.notes?.[st.id];
      return v ? (note ? `${LABEL[v]}: ${note}` : LABEL[v]) : note ?? "";
    });
    const ts = taskSummary(db.tasks.filter((t) => t.memberId === st.id));
    lines.push([st.fullName, st.studentNo, st.email, st.phone, st.department, UNIT_LABELS[st.unit], st.duty, ...marks, stats.absent, stats.excused, `${ts.done}/${ts.total}`, ts.total ? `%${Math.round(ts.progress * 100)}` : ""].map(cell).join(";"));
  }

  const filename = `${team.title.replace(/[^\p{L}\p{N}]+/gu, "_")}_rapor.csv`;
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapor.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
