import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrCreateSigningSecret, mutateAdminSessions, newId, now, readAdminSessions, readDb } from "./db";
import type { Team } from "./types";

/* ------------------------------------------------------------------ */
/* Ortak                                                               */
/* ------------------------------------------------------------------ */

const ISSUER = "tts";
const ADMIN_AUD = "tts-admin";
const CAPTAIN_AUD = "tts-captain";

const ADMIN_COOKIE = "tts_admin";
const CAPTAIN_COOKIE = "tts_kaptan";

/** Tarayıcıların izin verdiği en uzun çerez ömrü (400 gün). */
const CAPTAIN_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

const secure = () => process.env.NODE_ENV === "production";

let cachedKey: Promise<Uint8Array> | null = null;

/**
 * Oturum çerezlerini imzalayan anahtar. `SESSION_SECRET` tanımlıysa o kullanılır;
 * boşsa rastgele üretilip private R2 bucket'ında saklanan anahtar kullanılır.
 */
function secretKey(): Promise<Uint8Array> {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) {
    if (fromEnv.length < 32) throw new Error("SESSION_SECRET en az 32 karakter olmalı ya da tamamen boş bırakılmalı.");
    return Promise.resolve(new TextEncoder().encode(fromEnv));
  }
  cachedKey ??= getOrCreateSigningSecret()
    .then((s) => new TextEncoder().encode(s))
    .catch((err) => {
      cachedKey = null;
      throw err;
    });
  return cachedKey;
}

async function verify(token: string | undefined, audience: string): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secretKey(), { algorithms: ["HS256"], issuer: ISSUER, audience });
    return payload;
  } catch {
    return null;
  }
}

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/* ------------------------------------------------------------------ */
/* Admin: tarayıcıya bağlı, süreli, sunucuda kayıtlı ve iptal edilebilir */
/* ------------------------------------------------------------------ */

export function adminSessionTtlMinutes(): number {
  const n = Number.parseInt(process.env.ADMIN_SESSION_MINUTES ?? "", 10);
  return Number.isFinite(n) && n >= 5 ? n : 120;
}

async function userAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12) {
    throw new Error("ADMIN_PASSWORD en az 12 karakter olmalı (.env dosyasını kontrol edin).");
  }
  return timingSafeEqual(sha256(input), sha256(expected));
}

export async function createAdminSession(ip: string): Promise<void> {
  const ttl = adminSessionTtlMinutes() * 60;
  const ua = await userAgent();
  const id = newId();
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  await mutateAdminSessions((list) => {
    const t = now();
    for (let i = list.length - 1; i >= 0; i--) if (list[i].expiresAt <= t) list.splice(i, 1);
    list.push({ id, uaHash: sha256(ua).toString("hex"), userAgent: ua, ip, createdAt: t, expiresAt });
  });

  const token = await new SignJWT({ sid: id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(ADMIN_AUD)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(await secretKey());

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "strict",
    path: "/admin",
    maxAge: ttl,
  });
}

/** Geçerli admin oturumunun id'sini döner; yoksa `null`. */
export async function getAdminSessionId(): Promise<string | null> {
  const payload = await verify((await cookies()).get(ADMIN_COOKIE)?.value, ADMIN_AUD);
  if (!payload || typeof payload.sid !== "string") return null;
  const session = (await readAdminSessions()).find((s) => s.id === payload.sid);
  if (!session || session.expiresAt <= now()) return null;
  // Çerez başka bir tarayıcıya taşınmışsa reddet.
  const uaHash = sha256(await userAgent()).toString("hex");
  if (!timingSafeEqual(Buffer.from(uaHash), Buffer.from(session.uaHash))) return null;
  return session.id;
}

export async function requireAdmin(): Promise<string> {
  const sid = await getAdminSessionId();
  if (!sid) redirect("/admin/giris");
  return sid;
}

export async function destroyAdminSession(): Promise<void> {
  const payload = await verify((await cookies()).get(ADMIN_COOKIE)?.value, ADMIN_AUD);
  if (payload && typeof payload.sid === "string") {
    const sid = payload.sid;
    await mutateAdminSessions((list) => {
      const i = list.findIndex((s) => s.id === sid);
      if (i >= 0) list.splice(i, 1);
    });
  }
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
}

/* ------------------------------------------------------------------ */
/* Kaptan: takıma bağlı, süresiz; şifre değişince geçersiz olur     */
/* ------------------------------------------------------------------ */

export async function createCaptainSession(team: Team): Promise<void> {
  const token = await new SignJWT({ wid: team.id, v: team.passwordVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(CAPTAIN_AUD)
    .setIssuedAt()
    .sign(await secretKey());

  (await cookies()).set(CAPTAIN_COOKIE, token, {
    httpOnly: true,
    secure: secure(),
    sameSite: "lax",
    path: "/",
    maxAge: CAPTAIN_COOKIE_MAX_AGE,
  });
}

/** Kaptan oturumunun bağlı olduğu takımı döner; geçersizse `null`. */
export async function getCaptainTeam() {
  const payload = await verify((await cookies()).get(CAPTAIN_COOKIE)?.value, CAPTAIN_AUD);
  if (!payload || typeof payload.wid !== "string" || typeof payload.v !== "number") return null;
  const db = await readDb();
  const team = db.teams.find((w) => w.id === payload.wid);
  if (!team || team.archived || team.passwordVersion !== payload.v) return null;
  return { team, db };
}

export async function requireCaptain() {
  const result = await getCaptainTeam();
  if (!result) redirect("/");
  return result;
}

export async function destroyCaptainSession(): Promise<void> {
  (await cookies()).delete(CAPTAIN_COOKIE);
}
