"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  checkAdminPassword,
  createAdminSession,
  createCaptainSession,
  destroyAdminSession,
  destroyCaptainSession,
} from "@/lib/auth";
import { readDb } from "@/lib/db";
import { str, type FormState } from "@/lib/forms";
import { clearFailures, clientIp, lockedMinutes, recordFailure } from "@/lib/ratelimit";

// Takım bulunamadığında da bcrypt karşılaştırması yaparak geçersiz ve
// geçerli seçimlerin yanıt süresinden ayırt edilmesini engeller.
const DUMMY_HASH = bcrypt.hashSync("tts-dummy-password", 10);

const lockedMessage = (min: number) => `Çok fazla hatalı deneme. ${min} dakika sonra tekrar deneyin.`;

export async function captainLogin(_: FormState, fd: FormData): Promise<FormState> {
  const key = `kaptan:${await clientIp()}`;
  const locked = await lockedMinutes(key);
  if (locked) return { error: lockedMessage(locked) };

  const teamId = str(fd, "team");
  const password = str(fd, "password", 200);
  const db = await readDb();
  const team = db.teams.find((w) => !w.archived && w.id === teamId);
  const ok = await bcrypt.compare(password, team?.passwordHash ?? DUMMY_HASH);

  if (!team || !ok) {
    await recordFailure(key);
    return { error: "Takım veya şifre hatalı." };
  }
  await clearFailures(key);
  await createCaptainSession(team);
  redirect("/kaptan");
}

export async function captainLogout(): Promise<void> {
  await destroyCaptainSession();
  redirect("/");
}

export async function adminLogin(_: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const key = `admin:${ip}`;
  const locked = await lockedMinutes(key);
  if (locked) return { error: lockedMessage(locked) };

  if (!checkAdminPassword(str(fd, "password", 500))) {
    await recordFailure(key);
    return { error: "Şifre hatalı." };
  }
  await clearFailures(key);
  await createAdminSession(ip);
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/giris");
}
