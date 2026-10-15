"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/forms";
import { TASK_STATUS_LABELS, taskStatus } from "@/lib/types";
import { FormMessage } from "./forms";

export interface ReportableTask {
  id: string;
  title: string;
  description?: string;
  progress: number;
  done: boolean;
  completionNote?: string;
}

/** Üyenin kendisine atanmış görev için yüzde / tamamlandı / not bildirdiği kart. */
export function TaskReporter({
  task,
  assignedLabel,
  report,
}: {
  task: ReportableTask;
  assignedLabel: string;
  report: (input: { taskId: string; progress: number; done: boolean; note?: string }) => Promise<FormState>;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(task.progress);
  const [note, setNote] = useState(task.completionNote ?? "");
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const status = taskStatus(task);

  const submit = (done: boolean) =>
    start(async () => {
      const res = await report({ taskId: task.id, progress: done ? 100 : progress, done, note });
      setState(res);
      if (res?.ok) {
        if (done) setProgress(100);
        router.refresh();
      }
    });

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="min-w-0">
        <div className="font-semibold">{task.title}</div>
        <div className="text-xs text-navy-700/60">Atanma: {assignedLabel} · {TASK_STATUS_LABELS[status]}</div>
      </div>
      {task.description && <p className="text-sm whitespace-pre-line text-navy-700/80">{task.description}</p>}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-semibold text-navy-700">
          <label htmlFor={`p-${task.id}`}>Tamamlanma</label>
          <span className="tabular-nums">%{progress}</span>
        </div>
        <input
          id={`p-${task.id}`}
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Tamamlama notu (ne yaptınız?)"
        className="input"
        aria-label="Tamamlama notu"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => submit(false)} className="btn-ghost">
          {pending ? "Kaydediliyor…" : "İlerlemeyi kaydet"}
        </button>
        {!task.done && (
          <button type="button" disabled={pending} onClick={() => submit(true)} className="btn-accent">
            Tamamladım
          </button>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
