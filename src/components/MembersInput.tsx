"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS, UNIT_LABELS, isUnit } from "@/lib/types";

interface Row {
  key: number;
  fullName: string;
  studentNo: string;
  email: string;
  phone: string;
  department: string;
  unit: string;
  duty: string;
}

type Field = Exclude<keyof Row, "key">;

const COLUMNS: { field: Field; label: string; placeholder: string; type?: string; inputMode?: "numeric" | "email" | "tel"; max: number; select?: boolean }[] = [
  { field: "fullName", label: "Ad Soyad *", placeholder: "Ayşe Yılmaz", max: 100 },
  { field: "studentNo", label: "Öğrenci No", placeholder: "2101001", inputMode: "numeric", max: 30 },
  { field: "email", label: "E-posta", placeholder: "ayse@ornek.edu.tr", type: "email", inputMode: "email", max: 120 },
  { field: "phone", label: "Telefon", placeholder: "0555 111 22 33", type: "tel", inputMode: "tel", max: 30 },
  { field: "department", label: "Bölüm", placeholder: "Bilgisayar Müh.", max: 100 },
  { field: "unit", label: "Birim *", placeholder: "", max: 20, select: true },
  { field: "duty", label: "Uygulama planındaki görevi", placeholder: "ör. Görüntü işleme modülü", max: 500 },
];

const GRID = "md:grid-cols-[1.3fr_0.8fr_1.2fr_0.9fr_1fr_0.9fr_1.5fr_36px]";

/** Yapıştırılan "Yazılım", "yazilim" gibi değerleri birim koduna çevirir. */
const toUnit = (v: string): string => {
  const n = v.trim().toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  return isUnit(n) ? n : "";
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER = /^(ad|ad soyad|adı soyadı|isim|name|no|numara|öğrenci no|ogrenci no|birim)$/i;

const emptyRow = (key: number): Row => ({ key, fullName: "", studentNo: "", email: "", phone: "", department: "", unit: "", duty: "" });
const initial = (n: number) => Array.from({ length: n }, (_, i) => emptyRow(i));
const isEmpty = (r: Row) => COLUMNS.every((c) => !r[c.field].trim());

function rowErrors(r: Row): Partial<Record<Field, string>> {
  if (isEmpty(r)) return {};
  const e: Partial<Record<Field, string>> = {};
  if (!r.fullName.trim()) e.fullName = "Ad soyad gerekli";
  if (!r.unit) e.unit = "Birim seçin";
  if (r.email.trim() && !EMAIL.test(r.email.trim())) e.email = "Geçersiz e-posta";
  return e;
}

/**
 * Tablo şeklinde üye girişi. Satırlar formda `members` adlı gizli
 * alana JSON olarak yazılır. Excel/Sheets'ten kopyalanan çok satırlı veri
 * herhangi bir hücreye yapıştırılırsa satırlara dağıtılır.
 */
export function MembersInput({ required = false, initialRows = 3 }: { required?: boolean; initialRows?: number }) {
  const [rows, setRows] = useState<Row[]>(() => initial(initialRows));
  const wrapper = useRef<HTMLDivElement>(null);
  const guard = useRef<HTMLInputElement>(null);
  // Sunucu ve tarayıcıda aynı başlangıç anahtarları; yeni satırlar buradan devam eder.
  const keyCounter = useRef(initialRows);
  const newRow = () => emptyRow(keyCounter.current++);
  const focusKey = useRef<{ key: number; field: Field } | null>(null);

  // Form başarıyla gönderilip sıfırlandığında tabloyu da temizle.
  useEffect(() => {
    const form = wrapper.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      keyCounter.current = initialRows + 1000;
      setRows(Array.from({ length: initialRows }, () => emptyRow(keyCounter.current++)));
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initialRows]);

  // Yeni eklenen satıra odaklan.
  useEffect(() => {
    if (!focusKey.current) return;
    const { key, field } = focusKey.current;
    focusKey.current = null;
    wrapper.current?.querySelector<HTMLInputElement>(`[data-row="${key}"][data-field="${field}"]`)?.focus();
  });

  const filled = rows.filter((r) => !isEmpty(r));
  const invalid = filled.some((r) => Object.keys(rowErrors(r)).length > 0);
  const validityMessage = invalid
    ? "Kırmızı işaretli alanları düzeltin."
    : required && filled.length === 0
      ? "En az bir üye girin."
      : "";

  // Gönderimi tarayıcı düzeyinde engellemek için gizli alanın geçerliliğini güncel tut.
  useEffect(() => {
    guard.current?.setCustomValidity(validityMessage);
  }, [validityMessage]);

  const payload = JSON.stringify(
    filled.map(({ fullName, studentNo, email, phone, department, unit, duty }) => ({ fullName, studentNo, email, phone, department, unit, duty })),
  );

  const update = (key: number, field: Field, value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const addRow = (afterKey?: number) => {
    const row = newRow();
    focusKey.current = { key: row.key, field: "fullName" };
    setRows((rs) => {
      const i = afterKey === undefined ? rs.length : rs.findIndex((r) => r.key === afterKey) + 1;
      return [...rs.slice(0, i), row, ...rs.slice(i)];
    });
  };

  const removeRow = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [newRow()]));

  /** Excel/Sheets'ten çok satırlı yapıştırmayı satırlara dağıtır. */
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, key: number, field: Field) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return; // tek değer: normal yapıştır
    e.preventDefault();
    const startCol = COLUMNS.findIndex((c) => c.field === field);
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
    const parsed = lines
      .map((l) => l.split("\t").map((c) => c.trim()))
      .filter((cells, i) => !(i === 0 && HEADER.test(cells[0] ?? "")));
    setRows((rs) => {
      const out = [...rs];
      let i = out.findIndex((r) => r.key === key);
      for (const cells of parsed) {
        if (i >= out.length) out.push(newRow());
        const row = { ...out[i] };
        cells.forEach((value, c) => {
          const col = COLUMNS[startCol + c];
          if (col) row[col.field] = col.field === "unit" ? toUnit(value) : value.slice(0, col.max);
        });
        out[i] = row;
        i++;
      }
      return out;
    });
  };

  return (
    <div ref={wrapper}>
      <input type="hidden" name="members" value={payload} />
      {/* Boş liste veya hatalı satırla gönderimi tarayıcı düzeyinde engelle */}
      {/* readOnly olmamalı: salt okunur alanlar tarayıcı doğrulamasına katılmaz */}
      <input ref={guard} tabIndex={-1} aria-hidden value="" onChange={() => {}} className="pointer-events-none block h-0 w-full border-0 p-0 opacity-0" />

      <div className={`mb-2 hidden gap-2 px-1 md:grid ${GRID}`}>
        {COLUMNS.map((c) => (
          <div key={c.field} className="label mb-0">{c.label}</div>
        ))}
      </div>

      <div className="space-y-3 md:space-y-2">
        {rows.map((r, idx) => {
          const errors = rowErrors(r);
          return (
            <div
              key={r.key}
              className={`grid grid-cols-2 gap-2 rounded-xl border border-navy-100 p-3 ${GRID} md:rounded-none md:border-0 md:p-0`}
            >
              <div className="col-span-2 flex items-center justify-between md:hidden">
                <span className="text-xs font-semibold text-navy-700/60">{idx + 1}. kişi</span>
              </div>
              {COLUMNS.map((c) => (
                <div key={c.field} className={c.field === "fullName" || c.field === "email" || c.field === "duty" ? "col-span-2 md:col-span-1" : ""}>
                  <label className="label md:sr-only" htmlFor={`p-${r.key}-${c.field}`}>{c.label}</label>
                  {c.select ? (
                    <select
                      id={`p-${r.key}-${c.field}`}
                      data-row={r.key}
                      data-field={c.field}
                      value={r.unit}
                      onChange={(e) => update(r.key, "unit", e.target.value)}
                      aria-invalid={!!errors[c.field]}
                      title={errors[c.field]}
                      className={`input ${errors[c.field] ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200" : ""}`}
                    >
                      <option value="">Seçin</option>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                      ))}
                    </select>
                  ) : (
                  <input
                    id={`p-${r.key}-${c.field}`}
                    data-row={r.key}
                    data-field={c.field}
                    type={c.type ?? "text"}
                    inputMode={c.inputMode}
                    maxLength={c.max}
                    autoComplete="off"
                    placeholder={idx === 0 ? c.placeholder : ""}
                    value={r[c.field]}
                    onChange={(e) => update(r.key, c.field, e.target.value)}
                    onPaste={(e) => onPaste(e, r.key, c.field)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRow(r.key);
                      }
                    }}
                    aria-invalid={!!errors[c.field]}
                    title={errors[c.field]}
                    className={`input ${errors[c.field] ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200" : ""}`}
                  />
                  )}
                  {errors[c.field] && <p className="mt-0.5 text-[11px] text-red-600 md:hidden">{errors[c.field]}</p>}
                </div>
              ))}
              <button
                type="button"
                onClick={() => removeRow(r.key)}
                aria-label={`${idx + 1}. satırı sil`}
                title="Satırı sil"
                className="col-span-2 flex h-9 items-center justify-center rounded-lg text-sm text-navy-700/50 ring-1 ring-navy-100 hover:bg-red-50 hover:text-red-600 hover:ring-red-200 md:col-span-1 md:w-9"
              >
                <span className="md:hidden">Sil</span>
                <span className="hidden text-lg leading-none md:inline">×</span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" onClick={() => addRow()}>+ Kişi ekle</button>
        <span className="text-sm font-semibold text-navy-800">{filled.length} üye</span>
        {invalid && <span className="text-sm font-medium text-red-600">Kırmızı alanları düzeltin</span>}
      </div>
      <p className="mt-2 text-xs text-navy-700/60">
        Ad soyad ve birim zorunlu; görev alanına üyenin uygulama planındaki işini yazın. Son kutuda <kbd className="rounded border border-navy-100 px-1">Enter</kbd> yeni satır açar.
        İpucu: Excel / Google Sheets&apos;ten satırları kopyalayıp herhangi bir kutuya yapıştırırsanız tabloya otomatik dağılır.
      </p>
    </div>
  );
}
