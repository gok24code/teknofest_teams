"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { mutateAdminSessions, mutateDb, newId, now } from "@/lib/db";
import { int, str, type FormState } from "@/lib/forms";
import {
  addMembers,
  assignTasksIn,
  generatePassword,
  memberFromForm,
  normalizeName,
  parseMembersJson,
  removeMember,
  removeTaskIn,
  removeTeam,
  saveSessionIn,
  updateMemberIn,
  updateTaskIn,
  UserError,
  type SaveSessionInput,
  type TaskTarget,
} from "@/lib/mutations";
import type { Database } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/admin", "layout");
  revalidatePath("/kaptan", "layout");
  revalidatePath("/uye", "layout");
}

async function run(fn: () => Promise<FormState | string | void>): Promise<FormState> {
  await requireAdmin();
  try {
    const result = await fn();
    revalidateAll();
    if (result && typeof result === "object") return result;
    return { ok: result || "Kaydedildi." };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}

/** Formdan gelen şifreyi alır; boşsa güçlü bir şifre üretir. */
function passwordFrom(fd: FormData): string {
  const custom = str(fd, "password", 200);
  if (!custom) return generatePassword();
  if (custom.length < 8) throw new UserError("Şifre en az 8 karakter olmalı (boş bırakırsanız otomatik üretilir).");
  return custom;
}

function assertUniqueTitle(db: Database, title: string, exceptId?: string) {
  const n = normalizeName(title);
  if (!n) throw new UserError("Takım adı harf veya rakam içermeli.");
  if (db.teams.some((w) => w.id !== exceptId && normalizeName(w.title) === n)) {
    throw new UserError("Bu ada çok benzeyen bir takım zaten var. Kaptan girişi ada göre yapıldığından farklı bir ad seçin.");
  }
}

/* ---------------------------- Takımlar ---------------------------- */

export async function createTeam(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const title = str(fd, "title", 120);
    if (!title) throw new UserError("Takım adı zorunludur.");
    const { rows, errors } = parseMembersJson(str(fd, "members", 500_000));
    if (errors.length) throw new UserError(`Üye listesinde hata var — ${errors.slice(0, 5).join(" · ")}`);
    const password = passwordFrom(fd);
    const passwordHash = await bcrypt.hash(password, 12);
    const id = newId();
    const { added, skipped } = await mutateDb((db) => {
      assertUniqueTitle(db, title);
      db.teams.push({
        id,
        title,
        description: str(fd, "description", 500) || undefined,
        captainName: str(fd, "captainName", 100) || undefined,
        advisorName: str(fd, "advisorName", 100) || undefined,
        category: str(fd, "category", 120) || undefined,
        passwordHash,
        passwordVersion: 1,
        absenceLimit: int(fd, "absenceLimit", 2, 52),
        archived: false,
        createdAt: now(),
      });
      return addMembers(db, id, rows);
    });
    const dup = skipped.length ? ` (${skipped.length} tekrar eden satır atlandı)` : "";
    return {
      ok: `“${title}” ${added ? `${added} üyeyle ` : ""}oluşturuldu${dup}. Kaptan girişi için şifre aşağıda; bu şifre bir daha gösterilmeyecek.`,
      secret: password,
    };
  });
}

export async function updateTeam(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const id = str(fd, "id");
    const title = str(fd, "title", 120);
    if (!title) throw new UserError("Takım adı zorunludur.");
    await mutateDb((db) => {
      const w = db.teams.find((x) => x.id === id);
      if (!w) throw new UserError("Takım bulunamadı.");
      assertUniqueTitle(db, title, id);
      w.title = title;
      w.description = str(fd, "description", 500) || undefined;
      w.captainName = str(fd, "captainName", 100) || undefined;
      w.advisorName = str(fd, "advisorName", 100) || undefined;
      w.category = str(fd, "category", 120) || undefined;
      w.absenceLimit = int(fd, "absenceLimit", w.absenceLimit, 52);
      w.archived = fd.get("archived") === "on";
    });
  });
}

/** Yeni şifre belirler ve o takımdaki tüm açık kaptan oturumlarını kapatır. */
export async function resetTeamPassword(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const id = str(fd, "id");
    const password = passwordFrom(fd);
    const passwordHash = await bcrypt.hash(password, 12);
    await mutateDb((db) => {
      const w = db.teams.find((x) => x.id === id);
      if (!w) throw new UserError("Takım bulunamadı.");
      w.passwordHash = passwordHash;
      w.passwordVersion++;
    });
    return { ok: "Yeni şifre belirlendi, kaptanın açık oturumları kapatıldı. Şifre bir daha gösterilmeyecek.", secret: password };
  });
}

/** Üye girişi için ortak şifreyi belirler ve o takımdaki tüm açık üye oturumlarını kapatır. Kaptan şifresinden bağımsızdır. */
export async function resetMemberPassword(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const id = str(fd, "id");
    const password = passwordFrom(fd);
    const memberPasswordHash = await bcrypt.hash(password, 12);
    await mutateDb((db) => {
      const w = db.teams.find((x) => x.id === id);
      if (!w) throw new UserError("Takım bulunamadı.");
      w.memberPasswordHash = memberPasswordHash;
      w.memberPasswordVersion = (w.memberPasswordVersion ?? 0) + 1;
    });
    return { ok: "Üye şifresi belirlendi, üyelerin açık oturumları kapatıldı. Şifre bir daha gösterilmeyecek.", secret: password };
  });
}

export async function deleteTeam(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await mutateDb((db) => removeTeam(db, id));
  revalidateAll();
  redirect("/admin/takimlar");
}

export async function addMembersToTeam(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const teamId = str(fd, "teamId");
    const { rows, errors } = parseMembersJson(str(fd, "members", 500_000));
    if (errors.length) throw new UserError(`Üye listesinde hata var — ${errors.slice(0, 5).join(" · ")}`);
    if (!rows.length) throw new UserError("En az bir üye girin.");
    const { added, skipped } = await mutateDb((db) => addMembers(db, teamId, rows));
    const dup = skipped.length ? ` ${skipped.length} kişi zaten listede olduğu için atlandı: ${skipped.slice(0, 5).join(", ")}` : "";
    return `${added} üye eklendi.${dup}`;
  });
}

export async function updateMember(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const id = str(fd, "id");
    const data = memberFromForm(fd);
    await mutateDb((db) => updateMemberIn(db, id, data));
  });
}

export async function deleteMember(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const teamId = await mutateDb((db) => {
    const wid = db.members.find((p) => p.id === id)?.teamId;
    removeMember(db, id);
    return wid;
  });
  revalidateAll();
  if (fd.get("redirect") === "1" && teamId) redirect(`/admin/takimlar/${encodeURIComponent(teamId)}`);
}

export async function adminSaveSession(input: SaveSessionInput): Promise<FormState> {
  return run(async () => {
    await mutateDb((db) => saveSessionIn(db, input, "admin"));
    return "Haftalık rapor kaydedildi.";
  });
}

export async function adminDeleteSession(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  const teamId = str(fd, "teamId");
  await mutateDb((db) => {
    db.sessions = db.sessions.filter((s) => s.id !== id);
  });
  revalidateAll();
  redirect(`/admin/takimlar/${encodeURIComponent(teamId)}`);
}

/* -------------------------------- Görevler -------------------------------- */

/** `target` alanı: "all", "team:<id>" veya "member:<id>". */
function parseTarget(raw: string): TaskTarget {
  if (raw === "all") return { kind: "all" };
  const [kind, id] = raw.split(":");
  if (kind === "team" && id) return { kind: "team", teamId: id };
  if (kind === "member" && id) return { kind: "member", memberId: id };
  throw new UserError("Görevin atanacağı kişiyi veya takımı seçin.");
}

const taskFields = (fd: FormData) => ({
  title: str(fd, "title", 150),
  description: str(fd, "description", 1000),
});

export async function assignTasks(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const target = parseTarget(str(fd, "target", 100));
    const input = taskFields(fd);
    const count = await mutateDb((db) => assignTasksIn(db, target, input));
    return `Görev ${count} üyeye atandı.`;
  });
}

export async function updateTask(_: FormState, fd: FormData): Promise<FormState> {
  return run(async () => {
    const id = str(fd, "id");
    const input = taskFields(fd);
    await mutateDb((db) => updateTaskIn(db, id, input));
  });
}

export async function deleteTask(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd, "id");
  await mutateDb((db) => removeTaskIn(db, id));
  revalidateAll();
}

/* ---------------------------- Admin oturumları ---------------------------- */

export async function revokeAdminSession(fd: FormData): Promise<void> {
  const current = await requireAdmin();
  const id = str(fd, "id");
  const all = fd.get("all") === "1";
  await mutateAdminSessions((list) => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (all ? list[i].id !== current : list[i].id === id) list.splice(i, 1);
    }
  });
  revalidatePath("/admin/oturumlar");
}
