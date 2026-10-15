"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { mutateDb } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { reportTaskIn, UserError } from "@/lib/mutations";

/**
 * Üyenin tek yetkisi: kendisine atanmış görevin yüzdesini, tamamlandı bilgisini
 * ve notunu bildirmek. Üye kimliği istemciden değil, imzalı oturumdan alınır.
 */
export async function memberReportTask(input: {
  taskId: string;
  progress: number;
  done: boolean;
  note?: string;
}): Promise<FormState> {
  const { member, team } = await requireMember();
  try {
    await mutateDb((db) => {
      const w = db.teams.find((x) => x.id === team.id);
      if (!w || w.archived || (w.memberPasswordVersion ?? 0) !== (team.memberPasswordVersion ?? 0) || !db.members.some((m) => m.id === member.id)) {
        throw new UserError("Oturumunuz geçersiz. Lütfen tekrar giriş yapın.");
      }
      reportTaskIn(db, member.id, {
        taskId: String(input.taskId),
        progress: Number(input.progress),
        done: input.done === true,
        note: typeof input.note === "string" ? input.note : undefined,
      });
    });
    revalidatePath("/uye", "layout");
    revalidatePath("/admin", "layout");
    return { ok: "Kaydedildi." };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error(err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
}
