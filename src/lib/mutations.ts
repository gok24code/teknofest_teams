import "server-only";
import { randomInt } from "crypto";
import { newId, now } from "./db";
import { isUnit, type AttendanceStatus, type Database, type SaveSessionInput, type Unit } from "./types";

export type { SaveSessionInput };

export class UserError extends Error {}


/**
 * Bir haftanın raporunu (katılım + üye notları) oluşturur veya günceller.
 * `allowed` dışındaki durumlar yok sayılır; kaptan yalnızca Var/Yok girebilir,
 * yönetimin girdiği "İzinli" kayıtları kaptan düzenlemesinde korunur.
 */
export function saveSessionIn(
  db: Database,
  input: SaveSessionInput,
  by: "admin" | "captain",
): string {
  const team = db.teams.find((w) => w.id === input.teamId);
  if (!team) throw new UserError("Takım bulunamadı.");
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    throw new UserError("Geçerli bir tarih seçin.");
  }
  const week = Math.trunc(Number(input.week));
  if (!Number.isFinite(week) || week < 1 || week > 100) throw new UserError("Geçerli bir hafta numarası girin.");

  const existing = input.sessionId
    ? db.sessions.find((s) => s.id === input.sessionId && s.teamId === team.id)
    : undefined;
  if (input.sessionId && !existing) throw new UserError("Rapor bulunamadı.");
  if (db.sessions.some((s) => s.teamId === team.id && s.week === week && s.id !== existing?.id)) {
    throw new UserError(`${week}. haftanın raporu zaten girilmiş. Düzenlemek için o haftayı açın.`);
  }

  const allowed: AttendanceStatus[] = by === "admin" ? ["present", "absent", "excused"] : ["present", "absent"];
  const attendance: Record<string, AttendanceStatus> = {};
  for (const { id: sid } of db.members.filter((p) => p.teamId === team.id)) {
    const prev = existing?.attendance[sid];
    if (by === "captain" && prev === "excused") {
      attendance[sid] = prev;
      continue;
    }
    const status = typeof input.attendance === "object" && input.attendance ? input.attendance[sid] : undefined;
    if (status && allowed.includes(status)) attendance[sid] = status;
  }

  const notes: Record<string, string> = {};
  const memberIds = new Set(db.members.filter((p) => p.teamId === team.id).map((p) => p.id));
  if (input.notes && typeof input.notes === "object") {
    for (const [mid, raw] of Object.entries(input.notes)) {
      const note = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
      if (note && memberIds.has(mid)) notes[mid] = note;
    }
  }

  const topic = String(input.topic ?? "").trim().slice(0, 200) || undefined;
  if (existing) {
    Object.assign(existing, { week, date: input.date, topic, attendance, notes, takenBy: by, updatedAt: now() });
    return existing.id;
  }
  const id = newId();
  db.sessions.push({ id, teamId: team.id, week, date: input.date, topic, attendance, notes, takenBy: by, updatedAt: now() });
  return id;
}

export interface MemberInput {
  fullName: string;
  studentNo?: string;
  email?: string;
  phone?: string;
  department?: string;
  unit?: string;
  duty?: string;
}

const clean = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max) || undefined;

/** Üye alanlarını doğrular ve kırpar. */
export type ValidMember = Omit<MemberInput, "unit" | "fullName"> & { fullName: string; unit: Unit };

export function validateMember(input: MemberInput): ValidMember {
  const fullName = (input.fullName ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (!fullName) throw new UserError("Ad soyad zorunludur.");
  const email = clean(input.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError(`Geçersiz e-posta: ${email}`);
  const unit = input.unit && input.unit.trim() ? input.unit.trim() : "diger";
  if (!isUnit(unit)) throw new UserError(`Geçersiz birim: ${unit}`);
  return {
    fullName,
    studentNo: clean(input.studentNo, 30),
    email,
    phone: clean(input.phone, 30),
    department: clean(input.department, 100),
    unit,
    duty: clean(input.duty, 500),
  };
}

const sameName = (a: string, b: string) => normalizeName(a) === normalizeName(b);

/** Takımda aynı kişi zaten var mı? (öğrenci numarası, numara yoksa ad soyad) */
export function findDuplicate(db: Database, teamId: string, p: MemberInput, exceptId?: string) {
  return db.members.find(
    (x) =>
      x.teamId === teamId &&
      x.id !== exceptId &&
      (p.studentNo && x.studentNo ? x.studentNo === p.studentNo : sameName(x.fullName, p.fullName)),
  );
}

/** Üyeleri takıma ekler; aynı kişi zaten varsa atlar. */
export function addMembers(db: Database, teamId: string, rows: MemberInput[]) {
  if (!db.teams.some((w) => w.id === teamId)) throw new UserError("Takım bulunamadı.");
  let added = 0;
  const skipped: string[] = [];
  for (const row of rows) {
    const p = validateMember(row);
    if (findDuplicate(db, teamId, p)) {
      skipped.push(p.fullName);
      continue;
    }
    db.members.push({ id: newId(), teamId, ...p, createdAt: now() });
    added++;
  }
  return { added, skipped };
}

/** Bir takımı üyeleri ve raporlarıyla birlikte siler. */
export function removeTeam(db: Database, teamId: string) {
  db.teams = db.teams.filter((w) => w.id !== teamId);
  db.members = db.members.filter((p) => p.teamId !== teamId);
  db.sessions = db.sessions.filter((s) => s.teamId !== teamId);
}

/** Üyeyi ve rapor kayıtlarını siler. */
export function removeMember(db: Database, memberId: string) {
  const p = db.members.find((x) => x.id === memberId);
  if (!p) return;
  db.members = db.members.filter((x) => x.id !== memberId);
  for (const s of db.sessions) {
    if (s.teamId !== p.teamId) continue;
    delete s.attendance[memberId];
    if (s.notes) delete s.notes[memberId];
  }
}

/**
 * Formdaki üye tablosundan gelen JSON'u doğrular. Hatalı satırlar
 * satır numarasıyla bildirilir; tamamen boş satırlar yok sayılır.
 */
export function parseMembersJson(json: string): { rows: ValidMember[]; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(json || "[]");
  } catch {
    return { rows: [], errors: ["Üye listesi okunamadı."] };
  }
  if (!Array.isArray(data)) return { rows: [], errors: ["Üye listesi okunamadı."] };

  const rows: ValidMember[] = [];
  const errors: string[] = [];
  data.slice(0, 2000).forEach((item, i) => {
    const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const val = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : "");
    const input = { fullName: val("fullName"), studentNo: val("studentNo"), email: val("email"), phone: val("phone"), department: val("department"), unit: val("unit"), duty: val("duty") };
    if (Object.values(input).every((v) => !v.trim())) return;
    try {
      rows.push(validateMember(input));
    } catch (err) {
      errors.push(`${i + 1}. satır: ${err instanceof Error ? err.message : "geçersiz"}`);
    }
  });
  return { rows, errors };
}

/** Giriş için takım adını karşılaştırılabilir hale getirir (büyük/küçük harf, Türkçe karakter, boşluk). */
export function normalizeName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Karıştırılması kolay karakterler (0/O, 1/l/I) olmadan rastgele şifre üretir. */
export function generatePassword(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}
