"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/forms";
import type { AttendanceStatus, SaveSessionInput } from "@/lib/types";
import { FormMessage } from "./forms";

export interface AttendanceStudent {
  id: string;
  studentNo?: string;
  fullName: string;
  /** Bu hafta hariç devamsızlık sayısı. */
  absences: number;
  unit: string;
  duty?: string;
}

const OPTIONS: Record<AttendanceStatus, { label: string; on: string }> = {
  present: { label: "Geldi", on: "bg-emerald-600 text-white ring-emerald-600" },
  absent: { label: "Gelmedi", on: "bg-red-600 text-white ring-red-600" },
  excused: { label: "İzinli", on: "bg-accent-gradient text-navy-950 ring-accent-500" },
};

export function AttendanceTaker({
  teamId,
  sessionId,
  initialWeek,
  initialDate,
  initialTopic,
  initialAttendance,
  initialNotes,
  students,
  absenceLimit,
  allowExcused,
  save,
  doneHref,
  sidebar = false,
}: {
  teamId: string;
  sessionId?: string;
  initialWeek: number;
  initialDate: string;
  initialTopic?: string;
  initialAttendance?: Record<string, AttendanceStatus>;
  initialNotes?: Record<string, string>;
  students: AttendanceStudent[];
  absenceLimit: number;
  /** Yalnızca yönetim "İzinli" girebilir. */
  allowExcused: boolean;
  save: (input: SaveSessionInput) => Promise<FormState>;
  doneHref: string;
  /** Sayfada sol menü varsa alt çubuğu ona göre hizala. */
  sidebar?: boolean;
}) {
  const router = useRouter();
  const [week, setWeek] = useState(String(initialWeek));
  const [date, setDate] = useState(initialDate);
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [query, setQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() => initialAttendance ?? {});
  const [notes, setNotes] = useState<Record<string, string>>(() => initialNotes ?? {});
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();

  const options: AttendanceStatus[] = allowExcused ? ["present", "absent", "excused"] : ["present", "absent"];
  /** Kaptan, yönetimin girdiği "İzinli" kaydını değiştiremez. */
  const isLocked = (id: string) => !allowExcused && initialAttendance?.[id] === "excused";

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return students;
    return students.filter((s) => s.fullName.toLocaleLowerCase("tr").includes(q) || s.studentNo?.includes(q) || s.unit.toLocaleLowerCase("tr").includes(q));
  }, [students, query]);

  const counts = { present: 0, absent: 0, excused: 0, unmarked: 0 };
  for (const s of students) {
    const st = attendance[s.id];
    if (st) counts[st]++;
    else counts.unmarked++;
  }

  const markRest = (status: AttendanceStatus) =>
    setAttendance((a) => {
      const next = { ...a };
      for (const s of students) if (!next[s.id]) next[s.id] = status;
      return next;
    });

  const submit = () => {
    if (counts.unmarked > 0) {
      setState({ error: `${counts.unmarked} üye işaretlenmedi. Kaydetmeden önce herkesi işaretleyin.` });
      return;
    }
    startTransition(async () => {
      const result = await save({ teamId, sessionId, week: Number(week), date, topic, attendance, notes });
      setState(result);
      if (result?.ok) {
        router.push(doneHref);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5 pb-28">
      <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-[110px_180px_1fr] sm:p-5">
        <div>
          <label className="label" htmlFor="week">Hafta</label>
          <input id="week" type="number" min={1} max={100} inputMode="numeric" className="input" value={week} onChange={(e) => setWeek(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="date">Tarih</label>
          <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="topic">Bu haftanın özeti (isteğe bağlı)</label>
          <input id="topic" className="input" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ör. Prototip testleri tamamlandı" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="input min-w-0 flex-1 sm:max-w-xs" placeholder="İsim, numara veya birim ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={() => markRest("present")}>Kalanlar geldi</button>
      </div>

      <div className="card divide-y divide-navy-100 overflow-hidden">
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-navy-700/60">Üye bulunamadı.</div>}
        {filtered.map((s) => {
          const current = attendance[s.id];
          const projected = s.absences + (current === "absent" ? 1 : 0);
          const over = projected > absenceLimit;
          const locked = isLocked(s.id);
          return (
            <div key={s.id} className={`px-4 py-3 ${current ? "" : "bg-accent-300/10"}`}>
              <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-40">
                <div className="truncate font-semibold text-navy-900">{s.fullName}</div>
                <div className="text-xs text-navy-700/60">
                  <span className="font-semibold text-accent-700">{s.unit}</span> ·{" "}
                  {s.studentNo && <>{s.studentNo} · </>}
                  <span className={over ? "font-semibold text-red-600" : ""}>
                    {projected}/{absenceLimit} devamsızlık{over && " – sınır aşıldı"}
                  </span>
                </div>
              </div>
              {locked ? (
                <span className="rounded-lg bg-accent-300/30 px-3 py-2 text-sm font-semibold text-accent-700">İzinli (yönetim)</span>
              ) : (
                <div className="flex gap-2" role="radiogroup" aria-label={`${s.fullName} katılım durumu`}>
                  {options.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={current === value}
                      onClick={() => setAttendance((a) => ({ ...a, [s.id]: value }))}
                      className={`min-w-20 rounded-lg px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                        current === value ? OPTIONS[value].on : "bg-white text-navy-700 ring-navy-100 active:bg-navy-50"
                      }`}
                    >
                      {OPTIONS[value].label}
                    </button>
                  ))}
                </div>
              )}
              </div>
              {s.duty && <div className="mt-1 text-xs text-navy-700/60">Görevi: {s.duty}</div>}
              <input
                className="input mt-2"
                maxLength={500}
                placeholder="Bu hafta ne yaptı? (isteğe bağlı)"
                aria-label={`${s.fullName} haftalık not`}
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-20 border-t border-navy-100 bg-white/95 px-4 py-3 backdrop-blur ${sidebar ? "lg:left-64" : ""}`}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <div className="flex gap-3 text-sm font-semibold">
            <span className="text-emerald-700">{counts.present} geldi</span>
            <span className="text-red-700">{counts.absent} gelmedi</span>
            {counts.excused > 0 && <span className="text-accent-700">{counts.excused} izinli</span>}
            {counts.unmarked > 0 && <span className="text-navy-700/60">{counts.unmarked} işaretsiz</span>}
          </div>
          <button type="button" className="btn-accent ml-auto px-6 py-3 text-base" disabled={pending || !students.length} onClick={submit}>
            {pending ? "Kaydediliyor…" : sessionId ? "Güncelle" : "Raporu kaydet"}
          </button>
          {state?.error && <div className="w-full"><FormMessage state={state} /></div>}
        </div>
      </div>
    </div>
  );
}
