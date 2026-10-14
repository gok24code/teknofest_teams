import Link from "next/link";
import { notFound } from "next/navigation";
import { captainSaveSession } from "@/app/actions/captain";
import { AttendanceTaker } from "@/components/AttendanceTaker";
import { requireCaptain } from "@/lib/auth";
import { attendanceStudent, sessionsOf, membersOf } from "@/lib/stats";

export default async function EditWeekPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { team, db } = await requireCaptain();
  const sessions = sessionsOf(db, team.id);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) notFound();
  const others = sessions.filter((s) => s.id !== session.id);

  return (
    <>
      <Link href="/kaptan" className="mb-3 inline-block text-sm font-medium text-navy-600">← Geri</Link>
      <h1 className="mb-5 text-2xl font-bold">{session.week}. hafta raporu</h1>
      <AttendanceTaker
        teamId={team.id}
        sessionId={session.id}
        initialWeek={session.week}
        initialDate={session.date}
        initialTopic={session.topic}
        initialAttendance={session.attendance}
        initialNotes={session.notes}
        absenceLimit={team.absenceLimit}
        allowExcused={false}
        students={membersOf(db, team.id).map((s) => attendanceStudent(s, others))}
        save={captainSaveSession}
        doneHref="/kaptan"
      />
    </>
  );
}
