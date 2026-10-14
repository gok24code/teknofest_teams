export type AttendanceStatus = "present" | "absent" | "excused";

/** Bir takıma ait üye. Her takımın üye listesi kendine özeldir. */
export const UNITS = ["yazilim", "donanim", "elektronik", "mekanik", "diger"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<Unit, string> = {
  yazilim: "Yazılım",
  donanim: "Donanım",
  elektronik: "Elektronik",
  mekanik: "Mekanik",
  diger: "Diğer",
};

export const isUnit = (v: unknown): v is Unit => typeof v === "string" && (UNITS as readonly string[]).includes(v);

export interface Member {
  id: string;
  teamId: string;
  fullName: string;
  studentNo?: string;
  email?: string;
  phone?: string;
  department?: string;
  /** Üyenin ekibi (yazılım / donanım / elektronik / mekanik). */
  unit: Unit;
  /** Üyenin uygulama planındaki görevi (serbest metin). */
  duty?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  title: string;
  description?: string;
  /** Yalnızca gösterim amaçlı (ör. "Ahmet Yılmaz"). */
  captainName?: string;
  /** Takımın danışman hocası (yalnızca gösterim amaçlı). */
  advisorName?: string;
  /** Teknofest yarışma kategorisi (ör. "Havacılıkta Yapay Zeka"). */
  category?: string;
  /** Kaptan girişi için takıma özel şifrenin bcrypt hash'i. */
  passwordHash: string;
  /** Şifre her değiştiğinde artar; eski kaptan oturumları geçersiz olur. */
  passwordVersion: number;
  /** Bu sayıdan fazla devamsızlık yapan üye uyarı alır. */
  absenceLimit: number;
  archived: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  teamId: string;
  week: number;
  date: string; // YYYY-MM-DD
  topic?: string;
  /** Üye id'si → durum */
  attendance: Record<string, AttendanceStatus>;
  /** Üye id'si → o hafta yaptığı işin kısa notu. */
  notes?: Record<string, string>;
  takenBy: "admin" | "captain";
  updatedAt: string;
}

export interface Database {
  version: 1;
  members: Member[];
  teams: Team[];
  sessions: Session[];
}

export const emptyDatabase = (): Database => ({ version: 1, members: [], teams: [], sessions: [] });

export interface AdminSession {
  id: string;
  /** Oturumun açıldığı tarayıcının User-Agent hash'i. */
  uaHash: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginFailure {
  key: string;
  count: number;
  firstAt: number;
  lockedUntil?: number;
}

export interface SaveSessionInput {
  teamId: string;
  sessionId?: string;
  week: number;
  date: string;
  topic?: string;
  attendance: Record<string, AttendanceStatus>;
  notes?: Record<string, string>;
}
