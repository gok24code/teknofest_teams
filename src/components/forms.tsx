"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

const PendingContext = createContext(false);

/**
 * Sunucu işlemini çalıştıran form. React'in gönderim sonrası otomatik form
 * sıfırlamasını engeller; böylece hata durumunda girilen değerler kaybolmaz.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      <FormMessage state={state} />
    </form>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.secret) return <SecretMessage text={state.ok ?? ""} secret={state.secret} />;
  return state.error ? (
    <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  ) : (
    <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {state.ok}
    </p>
  );
}

export function SubmitButton({
  children,
  className = "btn-accent",
  pendingText = "Kaydediliyor…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending: formPending } = useFormStatus();
  const pending = useContext(PendingContext) || formPending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Silme gibi geri alınamaz işlemler için onay isteyen form. */
export function ConfirmForm({
  action,
  message,
  children,
  hidden,
  className = "btn-danger",
}: {
  action: (fd: FormData) => Promise<void>;
  message: string;
  children: React.ReactNode;
  hidden: Record<string, string>;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton className={className} pendingText="Siliniyor…">
        {children}
      </SubmitButton>
    </form>
  );
}

function SecretMessage({ text, secret }: { text: string; secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="mt-3 rounded-lg border border-accent-400 bg-accent-300/20 p-3 text-sm text-navy-900">
      <p>{text}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded-md bg-navy-900 px-3 py-2 font-mono text-base tracking-wider text-accent-300 select-all">{secret}</code>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            navigator.clipboard?.writeText(secret).then(() => setCopied(true), () => {});
          }}
        >
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}
