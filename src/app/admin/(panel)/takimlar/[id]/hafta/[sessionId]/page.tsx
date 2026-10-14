import { notFound } from "next/navigation";
import { adminDeleteSession, adminSaveSession } from "@/app/actions/admin";
import { AttendanceTaker } from "@/components/AttendanceTaker";
import { ConfirmForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { attendanceStudent, formatDate, sessionsOf, membersOf } from "@/lib/stats";

export default async function AdminEditWeekPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  await requireAdmin();
  const { id, sessionId } = await params;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === id);
  if (!team) notFound();
  const sessions = sessionsOf(db, id);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) notFound();
  const others = sessions.filter((s) => s.id !== session.id);

  return (
    <>
      <PageHeader
        back={{ href: `/admin/takimlar/${id}`, label: team.title }}
        title={`${session.week}. hafta raporu`}
        subtitle={`${formatDate(session.date)}${session.topic ? ` · ${session.topic}` : ""} · Son düzenleyen: ${session.takenBy === "admin" ? "Yönetim" : "Kaptan"}`}
        actions={
          <ConfirmForm action={adminDeleteSession} hidden={{ id: session.id, teamId: id }} message="Bu haftanın raporu silinsin mi?">
            Raporu sil
          </ConfirmForm>
        }
      />
      <AttendanceTaker
        teamId={id}
        sessionId={session.id}
        initialWeek={session.week}
        initialDate={session.date}
        initialTopic={session.topic}
        initialAttendance={session.attendance}
        initialNotes={session.notes}
        absenceLimit={team.absenceLimit}
        allowExcused
        sidebar
        students={membersOf(db, team.id).map((s) => attendanceStudent(s, others))}
        save={adminSaveSession}
        doneHref={`/admin/takimlar/${id}`}
      />
    </>
  );
}
