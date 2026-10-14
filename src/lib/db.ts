import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getJSON, putJSON, PreconditionFailedError } from "./r2";
import { emptyDatabase, type AdminSession, type Database, type LoginFailure } from "./types";

const MAX_RETRIES = 5;

/**
 * R2 bilgileri tanımlı değilse ve production'da değilsek, geliştirme kolaylığı
 * için veriyi yerel `.data/` klasöründe tutarız. Production'da R2 zorunludur.
 */
const isLocalStore = () => !process.env.R2_ACCOUNT_ID && process.env.NODE_ENV !== "production";
const localPath = (key: string) => path.join(process.cwd(), ".data", key.replace(/\//g, "_"));

async function load<T>(key: string, fallback: () => T): Promise<{ data: T; etag: string | null }> {
  if (isLocalStore()) {
    try {
      return { data: JSON.parse(await fs.readFile(localPath(key), "utf-8")), etag: "local" };
    } catch {
      return { data: fallback(), etag: null };
    }
  }
  const res = await getJSON<T>(key);
  return res ? { data: res.data, etag: res.etag } : { data: fallback(), etag: null };
}

async function save(key: string, data: unknown, etag: string | null): Promise<void> {
  if (isLocalStore()) {
    await fs.mkdir(path.dirname(localPath(key)), { recursive: true });
    await fs.writeFile(localPath(key), JSON.stringify(data, null, 2));
    return;
  }
  await putJSON(key, data, etag);
}

/**
 * Bir JSON dokümanını atomik olarak günceller; eşzamanlı yazmada yeniden dener.
 * `prepare`, okunan veriyi (ör. eski sürümden taşıyarak) güncellemeden önce dönüştürür.
 */
async function mutate<T, R>(
  key: string,
  fallback: () => T,
  fn: (data: T) => R,
  prepare: (raw: T) => T = (x) => x,
): Promise<R> {
  for (let attempt = 0; ; attempt++) {
    const loaded = await load(key, fallback);
    const data = prepare(loaded.data);
    const etag = loaded.etag;
    const result = fn(data);
    try {
      await save(key, data, etag);
      return result;
    } catch (err) {
      if (err instanceof PreconditionFailedError && attempt < MAX_RETRIES) continue;
      throw err;
    }
  }
}

/* ---- Ana veritabanı: üyeler, takımlar, haftalık raporlar ---- */

const DB_KEY = "tts/db.json";

export const readDb = async (): Promise<Database> => (await load(DB_KEY, emptyDatabase)).data;

export const mutateDb = <R>(fn: (db: Database) => R) => mutate(DB_KEY, emptyDatabase, fn);

/* ---- Admin oturumları ---- */

const SESSIONS_KEY = "tts/admin-sessions.json";

export const readAdminSessions = async (): Promise<AdminSession[]> => (await load(SESSIONS_KEY, () => [])).data;
export const mutateAdminSessions = <R>(fn: (s: AdminSession[]) => R) =>
  mutate<AdminSession[], R>(SESSIONS_KEY, () => [], fn);

/* ---- Başarısız giriş denemeleri ---- */

const FAILURES_KEY = "tts/login-failures.json";

export const readLoginFailures = async (): Promise<LoginFailure[]> => (await load(FAILURES_KEY, () => [])).data;
export const mutateLoginFailures = <R>(fn: (f: LoginFailure[]) => R) =>
  mutate<LoginFailure[], R>(FAILURES_KEY, () => [], fn);

export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/* ---- Oturum imzalama anahtarı ---- */

const SECRET_KEY = "tts/signing-secret.json";

/**
 * `SESSION_SECRET` tanımlı değilse kullanılan imzalama anahtarı. İlk çağrıda
 * rastgele üretilip private depoya yalnızca bir kez yazılır (eşzamanlı ilk
 * isteklerde hepsi aynı anahtarı kullanır); sonraki çağrılarda okunur.
 */
export async function getOrCreateSigningSecret(): Promise<string> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const { data, etag } = await load<{ secret?: string }>(SECRET_KEY, () => ({}));
    if (data.secret && data.secret.length >= 32) return data.secret;
    const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(48))).toString("base64");
    try {
      // etag === null → nesne henüz yok; R2'ye "yalnızca yoksa yaz" koşuluyla gider.
      await save(SECRET_KEY, { secret, createdAt: now() }, etag);
      return secret;
    } catch (err) {
      if (err instanceof PreconditionFailedError) continue; // başka bir istek önce yazdı → onu oku
      throw err;
    }
  }
  throw new Error("Oturum imzalama anahtarı oluşturulamadı.");
}
