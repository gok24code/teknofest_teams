export type FormState = {
  error?: string;
  ok?: string;
  /** Yalnızca bir kez gösterilecek gizli değer (ör. yeni takım şifresi). */
  secret?: string;
} | null;

/** Form alanını kırpılmış ve uzunluğu sınırlanmış şekilde okur. */
export const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);

export function int(fd: FormData, key: string, fallback: number, max = 1000): number {
  const n = Number.parseInt(str(fd, key), 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
}
