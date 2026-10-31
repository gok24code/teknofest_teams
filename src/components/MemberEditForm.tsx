import type { FormState } from "@/lib/forms";
import { UNITS, UNIT_LABELS, type Member } from "@/lib/types";
import { ActionForm, SubmitButton } from "./forms";

/** Üye bilgilerini düzenleme formu (yönetim ve kaptan panelinde ortak). */
export function MemberEditForm({ member: p, action }: { member: Member; action: (state: FormState, fd: FormData) => Promise<FormState> }) {
  const fields = [
    { name: "fullName", label: "Ad soyad *", value: p.fullName, required: true, max: 100 },
    { name: "studentNo", label: "Öğrenci no", value: p.studentNo, max: 30 },
    { name: "email", label: "E-posta", value: p.email, type: "email", max: 120 },
    { name: "phone", label: "Telefon", value: p.phone, type: "tel", max: 30 },
    { name: "department", label: "Bölüm", value: p.department, max: 100 },
  ];

  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={p.id} />
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} defaultValue={f.value} required={f.required} maxLength={f.max} className="input" />
        </div>
      ))}
      <div>
        <label className="label" htmlFor="unit">Birim *</label>
        <select id="unit" name="unit" defaultValue={p.unit} required className="input">
          {UNITS.map((u) => (
            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="duty">Uygulama planındaki görevi</label>
        <textarea id="duty" name="duty" rows={3} maxLength={500} defaultValue={p.duty} className="input" />
      </div>
      <div className="sm:col-span-2"><SubmitButton>Kaydet</SubmitButton></div>
    </ActionForm>
  );
}
