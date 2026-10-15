import { assignTasks, deleteTask, updateTask } from "@/app/actions/admin";
import type { FormState } from "@/lib/forms";
import { formatDate } from "@/lib/stats";
import { TASK_STATUS_LABELS, taskStatus, type Task } from "@/lib/types";
import { ActionForm, ConfirmForm, SubmitButton } from "./forms";

/**
 * Görev atama formu. `targets` verilirse hedef seçici gösterilir; yoksa
 * `fixedTarget` ("member:<id>" gibi) gizli alan olarak gönderilir.
 */
export function TaskAssignForm({
  targets,
  fixedTarget,
  action = assignTasks,
}: {
  targets?: { value: string; label: string }[];
  fixedTarget?: string;
  action?: (state: FormState, fd: FormData) => Promise<FormState>;
}) {
  return (
    <ActionForm action={action} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
      {fixedTarget ? (
        <input type="hidden" name="target" value={fixedTarget} />
      ) : (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="target">Kime atansın? *</label>
          <select id="target" name="target" className="input" required defaultValue="">
            <option value="" disabled>Seçin</option>
            {targets?.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">Başlık *</label>
        <input id="title" name="title" required maxLength={150} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Açıklama</label>
        <textarea id="description" name="description" rows={3} maxLength={1000} className="input" />
      </div>
      <div className="sm:col-span-2"><SubmitButton>Görevi ata</SubmitButton></div>
    </ActionForm>
  );
}

/** Yönetim görünümü: görev, üyenin bildirdiği ilerleme/not ve düzenle/sil. */
export function AdminTaskItem({ task, owner }: { task: Task; owner?: React.ReactNode }) {
  const status = taskStatus(task);
  const bar = task.done ? "bg-emerald-500" : "bg-accent-500";
  return (
    <li className="space-y-2 py-4">
      <div className="min-w-0">
        <div className="font-semibold">{task.title}</div>
        <div className="text-xs text-navy-700/60">
          {owner}{owner ? " · " : ""}Atanma: {formatDate(task.assignedAt)} · {TASK_STATUS_LABELS[status]}
          {task.completedAt ? ` (${formatDate(task.completedAt)})` : ""}
        </div>
      </div>
      {task.description && <p className="text-sm whitespace-pre-line text-navy-700/80">{task.description}</p>}
      <div className="flex items-center gap-2">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-navy-100">
          <div className={`h-full ${bar}`} style={{ width: `${task.progress}%` }} />
        </div>
        <span className="text-xs font-semibold tabular-nums text-navy-700">%{task.progress}</span>
      </div>
      {task.completionNote && <p className="text-sm italic text-navy-700/70">Üye notu: {task.completionNote}</p>}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-navy-600 hover:text-accent-600">Düzenle / sil</summary>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto]">
          <ActionForm action={updateTask} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={task.id} />
            <input name="title" defaultValue={task.title} required maxLength={150} className="input sm:col-span-2" aria-label="Başlık" />
            <textarea name="description" rows={2} defaultValue={task.description} maxLength={1000} className="input sm:col-span-2" aria-label="Açıklama" />
            <div className="sm:col-span-2"><SubmitButton>Kaydet</SubmitButton></div>
          </ActionForm>
          <ConfirmForm action={deleteTask} hidden={{ id: task.id }} message="Görev silinsin mi?">Sil</ConfirmForm>
        </div>
      </details>
    </li>
  );
}
