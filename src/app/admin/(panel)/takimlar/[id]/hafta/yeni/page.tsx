import { notFound } from "next/navigation";
import { adminSaveSession } from "@/app/actions/admin";
import { AttendanceTaker } from "@/components/AttendanceTaker";
import { Empty, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { attendanceStudent, nextWeek, sessionsOf, membersOf, today } from "@/lib/stats";

export default async function AdminNewWeekPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === id);
  if (!team) notFound();
  const sessions = sessionsOf(db, id);
  const students = membersOf(db, team.id);

  return (
    <>
      <PageHeader back={{ href: `/admin/takimlar/${id}`, label: team.title }} title="Haftalık rapor ekle" />
      {students.length === 0 ? (
        <Empty>Rapor girmek için önce takıma üye ekleyin.</Empty>
      ) : (
        <AttendanceTaker
          teamId={id}
          initialWeek={nextWeek(sessions)}
          initialDate={today()}
          absenceLimit={team.absenceLimit}
          allowExcused
          sidebar
          students={students.map((s) => attendanceStudent(s, sessions))}
          save={adminSaveSession}
          doneHref={`/admin/takimlar/${id}`}
        />
      )}
    </>
  );
}
