"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCaptainSession, requireCaptain } from "@/lib/auth";
import { mutateDb } from "@/lib/db";
import { str, type FormState } from "@/lib/forms";
import {
  addMembers,
  assignTasksIn,
  memberFromForm,
  parseMembersJson,
  removeMember,
  removeTaskIn,
  saveSessionIn,
  updateMemberIn,
  UserError,
  type SaveSessionInput,
} from "@/lib/mutations";
import type { Database, Team } from "@/lib/types";

/**
 * Kaptanın yetkileri: kendi takımında haftalık rapor girmek/düzeltmek,
 * üye eklemek/düzenlemek/çıkarmak ve takım üyelerine görev atamak/silmek.
 * Takım id'si istemciden değil, imzalı oturumdan alınır.
 */

/** Oturumdaki takım hâlâ geçerli mi? (arşivlenmemiş ve şifresi değişmemiş) */
function assertTeamValid(db: Database, team: Team) {
  const w = db.teams.find((x) => x.id === team.id);
  if (!w || w.archived || w.passwordVersion !== team.passwordVersion) {
    throw new UserError("Oturumunuz geçersiz. Lütfen tekrar giriş yapın.");
  }
}

function revalidateAll() {
  revalidatePath("/kaptan", "layout");
  revalidatePath("/uye", "layout");
  revalidatePath("/admin", "layout");
}

export async function captainSaveSession(input: Omit<SaveSessionInput, "teamId">): Promise<FormState> {
  const { team } = await requireCaptain();
  try {
    await mutateDb((db) => {
      assertTeamValid(db, team);
      return saveSessionIn(
        db,
        {
          teamId: team.id,
          sessionId: typeof input.sessionId === "string" ? input.sessionId : undefined,
          week: input.week,
          date: input.date,
          topic: input.topic,
          attendance: input.attendance,
          notes: input.notes,
        },
        "captain",
      );
    });
    // Aktif kaptanın çerez ömrünü yenile (süresiz oturum).
    await createCaptainSession(team);
    revalidatePath("/kaptan", "layout");
    revalidatePath("/admin", "layout");
    return { ok: "Haftalık rapor kaydedildi." };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}

/** Kaptanın görev atama formu: `target` "team" (tüm takım) veya "member:<id>"; yalnızca kendi takımı. */
export async function captainAssignTasks(_: FormState, fd: FormData): Promise<FormState> {
  const { team } = await requireCaptain();
  try {
    const raw = str(fd, "target", 100);
    const memberId = raw.startsWith("member:") ? raw.slice(7) : "";
    if (raw !== "team" && !memberId) throw new UserError("Görevin atanacağı kişiyi veya takımı seçin.");
    const input = { title: str(fd, "title", 150), description: str(fd, "description", 1000) };
    const count = await mutateDb((db) => {
      assertTeamValid(db, team);
      if (memberId && !db.members.some((m) => m.id === memberId && m.teamId === team.id)) {
        throw new UserError("Üye bu takımda bulunamadı.");
      }
      return assignTasksIn(db, memberId ? { kind: "member", memberId } : { kind: "team", teamId: team.id }, input);
    });
    revalidateAll();
    return { ok: `Görev ${count} üyeye atandı.` };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}

/** Kaptan yalnızca kendi takımındaki görevi silebilir. */
export async function captainDeleteTask(fd: FormData): Promise<void> {
  const { team } = await requireCaptain();
  const id = str(fd, "id");
  await mutateDb((db) => {
    const w = db.teams.find((x) => x.id === team.id);
    if (!w || w.archived || w.passwordVersion !== team.passwordVersion) return;
    if (db.tasks.some((t) => t.id === id && t.teamId === team.id)) removeTaskIn(db, id);
  });
  revalidateAll();
}

/* ---------------------------- Üyeler ---------------------------- */

export async function captainAddMembers(_: FormState, fd: FormData): Promise<FormState> {
  const { team } = await requireCaptain();
  try {
    const { rows, errors } = parseMembersJson(str(fd, "members", 500_000));
    if (errors.length) throw new UserError(`Üye listesinde hata var — ${errors.slice(0, 5).join(" · ")}`);
    if (!rows.length) throw new UserError("En az bir üye girin.");
    const { added, skipped } = await mutateDb((db) => {
      assertTeamValid(db, team);
      return addMembers(db, team.id, rows);
    });
    revalidateAll();
    const dup = skipped.length ? ` ${skipped.length} kişi zaten listede olduğu için atlandı: ${skipped.slice(0, 5).join(", ")}` : "";
    return { ok: `${added} üye eklendi.${dup}` };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}

/** Kaptan yalnızca kendi takımındaki üyeyi düzenleyebilir. */
export async function captainUpdateMember(_: FormState, fd: FormData): Promise<FormState> {
  const { team } = await requireCaptain();
  try {
    const id = str(fd, "id");
    const data = memberFromForm(fd);
    await mutateDb((db) => {
      assertTeamValid(db, team);
      updateMemberIn(db, id, data, team.id);
    });
    revalidateAll();
    return { ok: "Kaydedildi." };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}

/** Kaptan yalnızca kendi takımındaki üyeyi çıkarabilir. */
export async function captainDeleteMember(fd: FormData): Promise<void> {
  const { team } = await requireCaptain();
  const id = str(fd, "id");
  await mutateDb((db) => {
    const w = db.teams.find((x) => x.id === team.id);
    if (!w || w.archived || w.passwordVersion !== team.passwordVersion) return;
    if (db.members.some((m) => m.id === id && m.teamId === team.id)) removeMember(db, id);
  });
  revalidateAll();
  redirect("/kaptan/uyeler");
}
