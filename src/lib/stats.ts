import { UNIT_LABELS, type Database, type Member, type Session, type Task, type Team, type Unit } from "./types";

export interface MemberStats {
  present: number;
  absent: number;
  excused: number;
  /** Üyenin raporda işaretlendiği hafta sayısı. */
  total: number;
  rate: number; // 0-1 arası katılım oranı (mazeretli hariç)
}

export function sessionsOf(db: Database, teamId: string): Session[] {
  return db.sessions
    .filter((s) => s.teamId === teamId)
    .sort((a, b) => a.week - b.week);
}

export function memberStats(sessions: Session[], memberId: string): MemberStats {
  let present = 0;
  let absent = 0;
  let excused = 0;
  for (const s of sessions) {
    const status = s.attendance[memberId];
    if (status === "present") present++;
    else if (status === "absent") absent++;
    else if (status === "excused") excused++;
  }
  const counted = present + absent;
  return { present, absent, excused, total: present + absent + excused, rate: counted ? present / counted : 1 };
}

export interface TeamStats {
  sessionCount: number;
  memberCount: number;
  totalAbsences: number;
  rate: number;
  overLimit: number;
}

export function teamStats(db: Database, w: Team): TeamStats {
  const sessions = sessionsOf(db, w.id);
  let present = 0;
  let absent = 0;
  let overLimit = 0;
  const members = membersOf(db, w.id);
  for (const p of members) {
    const st = memberStats(sessions, p.id);
    present += st.present;
    absent += st.absent;
    if (st.absent > w.absenceLimit) overLimit++;
  }
  const counted = present + absent;
  return {
    sessionCount: sessions.length,
    memberCount: members.length,
    totalAbsences: absent,
    rate: counted ? present / counted : 1,
    overLimit,
  };
}

export interface PersonOverview {
  /** Aynı kişiyi takımlar arasında eşleştiren anahtar (öğrenci no, yoksa e-posta). */
  key: string;
  /** Kişinin en son girilen bilgileri. */
  person: Member;
  entries: { member: Member; team: Team; stats: MemberStats }[];
  totalAbsences: number;
  totalExcused: number;
  overLimit: boolean;
}

/**
 * Tüm üyeleri kişi bazında gruplar. Aynı öğrenci numarası (numara yoksa
 * aynı e-posta) birden fazla takımda geçiyorsa tek kişi olarak gösterilir.
 */
export function personOverviews(db: Database): PersonOverview[] {
  const teams = new Map(db.teams.map((w) => [w.id, w]));
  const sessionsByTeam = new Map(db.teams.map((w) => [w.id, sessionsOf(db, w.id)]));
  const groups = new Map<string, PersonOverview>();

  for (const member of db.members) {
    const team = teams.get(member.teamId);
    if (!team) continue;
    const key = member.studentNo
      ? `no:${member.studentNo}`
      : member.email
        ? `mail:${member.email.toLowerCase()}`
        : `id:${member.id}`;
    const stats = memberStats(sessionsByTeam.get(team.id) ?? [], member.id);
    let g = groups.get(key);
    if (!g) {
      g = { key, person: member, entries: [], totalAbsences: 0, totalExcused: 0, overLimit: false };
      groups.set(key, g);
    }
    if (member.createdAt > g.person.createdAt) g.person = member;
    g.entries.push({ member, team, stats });
    g.totalAbsences += stats.absent;
    g.totalExcused += stats.excused;
    if (stats.absent > team.absenceLimit) g.overLimit = true;
  }
  return [...groups.values()];
}

export const pct = (rate: number) => `%${Math.round(rate * 100)}`;

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

/** İstanbul saatine göre bugünün tarihi (YYYY-MM-DD). */
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

/** Takımda raporu girilmemiş ilk sonraki hafta. */
export const nextWeek = (sessions: Session[]) => sessions.reduce((m, s) => Math.max(m, s.week), 0) + 1;

/** Takımın üyelerini ada göre sıralı döner. */
export function membersOf(db: Database, teamId: string): Member[] {
  return db.members
    .filter((p) => p.teamId === teamId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
}

/** AttendanceTaker satırı: üyenin bilgileri ve verilen haftalar dışındaki devamsızlığı. */
export const attendanceStudent = (m: Member, sessions: Session[]) => ({
  id: m.id,
  studentNo: m.studentNo,
  fullName: m.fullName,
  absences: memberStats(sessions, m.id).absent,
  unit: UNIT_LABELS[m.unit],
  duty: m.duty,
});

export interface UnitGroup {
  unit: Unit;
  label: string;
  members: Member[];
}

/** Takımın üyelerini birimlere göre gruplar (boş birimler atlanır). */
export function unitGroups(members: Member[]): UnitGroup[] {
  const order = Object.keys(UNIT_LABELS) as Unit[];
  return order
    .map((unit) => ({ unit, label: UNIT_LABELS[unit], members: members.filter((m) => m.unit === unit) }))
    .filter((g) => g.members.length > 0);
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  /** Ortalama tamamlanma (0-1); görev yoksa 0. */
  progress: number;
}

export function taskSummary(tasks: Task[]): TaskSummary {
  let done = 0;
  let inProgress = 0;
  let sum = 0;
  for (const t of tasks) {
    sum += t.progress;
    if (t.done) done++;
    else if (t.progress > 0) inProgress++;
  }
  return {
    total: tasks.length,
    pending: tasks.length - done - inProgress,
    inProgress,
    done,
    progress: tasks.length ? sum / tasks.length / 100 : 0,
  };
}

/** Üyenin görevleri: önce tamamlanmayanlar (yüksek öncelik üstte), sonra tamamlananlar (en yeni üstte). */
export function tasksOfMember(db: Database, memberId: string): Task[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return db.tasks
    .filter((t) => t.memberId === memberId)
    .sort((a, b) =>
      a.done !== b.done
        ? Number(a.done) - Number(b.done)
        : a.done
          ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
          : rank[a.priority] - rank[b.priority] || b.assignedAt.localeCompare(a.assignedAt),
    );
}
