"use server";

import { revalidatePath } from "next/cache";
import { createCaptainSession, requireCaptain } from "@/lib/auth";
import { mutateDb } from "@/lib/db";
import type { FormState } from "@/lib/forms";
import { saveSessionIn, UserError, type SaveSessionInput } from "@/lib/mutations";

/**
 * Kaptanın tek yetkisi: kendi takımında bir haftanın raporunu
 * (katılım + üye notları) kaydetmek veya düzeltmek. Takım id'si istemciden değil,
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
