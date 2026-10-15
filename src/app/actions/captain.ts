"use server";

import { revalidatePath } from "next/cache";
import { createCaptainSession, requireCaptain } from "@/lib/auth";
import { mutateDb } from "@/lib/db";
import { str, type FormState } from "@/lib/forms";
import { assignTasksIn, removeTaskIn, saveSessionIn, UserError, type SaveSessionInput } from "@/lib/mutations";

/**
 * Kaptanın yetkileri: kendi takımında haftalık rapor girmek/düzeltmek ve
 * takım üyelerine görev atamak/silmek. Takım id'si istemciden değil,
 * imzalı oturumdan alınır.
 */
export async function captainSaveSession(input: Omit<SaveSessionInput, "teamId">): Promise<FormState> {
  const { team } = await requireCaptain();
  try {
    await mutateDb((db) => {
      const w = db.teams.find((x) => x.id === team.id);
      if (!w || w.archived || w.passwordVersion !== team.passwordVersion) {
        throw new UserError("Oturumunuz geçersiz. Lütfen tekrar giriş yapın.");
      }
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
      const w = db.teams.find((x) => x.id === team.id);
      if (!w || w.archived || w.passwordVersion !== team.passwordVersion) {
        throw new UserError("Oturumunuz geçersiz. Lütfen tekrar giriş yapın.");
      }
      if (memberId && !db.members.some((m) => m.id === memberId && m.teamId === team.id)) {
        throw new UserError("Üye bu takımda bulunamadı.");
      }
      return assignTasksIn(db, memberId ? { kind: "member", memberId } : { kind: "team", teamId: team.id }, input);
    });
    revalidatePath("/kaptan", "layout");
    revalidatePath("/uye", "layout");
    revalidatePath("/admin", "layout");
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
  revalidatePath("/kaptan", "layout");
  revalidatePath("/uye", "layout");
  revalidatePath("/admin", "layout");
}
