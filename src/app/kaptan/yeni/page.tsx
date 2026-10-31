import Link from "next/link";
import { captainSaveSession } from "@/app/actions/captain";
import { AttendanceTaker } from "@/components/AttendanceTaker";
import { Empty } from "@/components/ui";
import { requireCaptain } from "@/lib/auth";
import { attendanceStudent, nextWeek, sessionsOf, membersOf, today } from "@/lib/stats";

export default async function NewWeekPage() {
  const { team, db } = await requireCaptain();
  const sessions = sessionsOf(db, team.id);
  const students = membersOf(db, team.id);

  return (
    <>
      <Link href="/kaptan" className="mb-3 inline-block text-sm font-medium text-navy-600">← Geri</Link>
      <h1 className="mb-1 text-2xl font-bold">Haftalık rapor gir</h1>
      <p className="mb-5 text-sm text-navy-700/70">Her üye için toplantıya katılımı seçin ve bu hafta yaptığı işi kısaca yazın. Danışman hocanız bu bilgileri görüntüler.</p>
      {students.length === 0 ? (
        <Empty>
          Bu takıma henüz üye eklenmedi.{" "}
          <Link href="/kaptan/uyeler" className="font-semibold text-accent-700 hover:underline">Üye ekle</Link>
        </Empty>
      ) : (
        <AttendanceTaker
          teamId={team.id}
          initialWeek={nextWeek(sessions)}
          initialDate={today()}
          absenceLimit={team.absenceLimit}
          allowExcused={false}
          students={students.map((s) => attendanceStudent(s, sessions))}
          save={captainSaveSession}
          doneHref="/kaptan"
        />
      )}
    </>
  );
}
