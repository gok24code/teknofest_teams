import "server-only";
import { headers } from "next/headers";
import { mutateLoginFailures, readLoginFailures } from "./db";

const WINDOW_MS = 15 * 60 * 1000; // 15 dakika içinde
const MAX_FAILURES = 5; //          5 hatalı deneme
const LOCK_MS = 15 * 60 * 1000; //  → 15 dakika kilit

export async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel bu başlıkları kendisi yazar; istemcinin gönderdiği değerin üzerine yazılır.
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

/** Kilitliyse kalan dakikayı, değilse `null` döner. */
export async function lockedMinutes(key: string): Promise<number | null> {
  const entry = (await readLoginFailures()).find((f) => f.key === key);
  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    return Math.ceil((entry.lockedUntil - Date.now()) / 60000);
  }
  return null;
}

export async function recordFailure(key: string): Promise<void> {
  const t = Date.now();
  await mutateLoginFailures((list) => {
    // süresi geçmiş kayıtları temizle
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      if (t - f.firstAt > WINDOW_MS && !(f.lockedUntil && f.lockedUntil > t)) list.splice(i, 1);
    }
    let entry = list.find((f) => f.key === key);
    if (!entry) {
      entry = { key, count: 0, firstAt: t };
      list.push(entry);
    }
    entry.count++;
    if (entry.count >= MAX_FAILURES) {
      entry.lockedUntil = t + LOCK_MS;
      entry.count = 0;
      entry.firstAt = t;
    }
  });
}

export async function clearFailures(key: string): Promise<void> {
  if (!(await readLoginFailures()).some((f) => f.key === key)) return;
  await mutateLoginFailures((list) => {
    const i = list.findIndex((f) => f.key === key);
    if (i >= 0) list.splice(i, 1);
  });
}
