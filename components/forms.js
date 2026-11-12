"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

export const initialState = { ok: null, error: null, fieldErrors: {}, message: null };

export function SubmitButton({ children, pendingText = "Saving…", className = "btn-primary", ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-2xl border border-rose/40 bg-rose-soft px-4 py-2.5 text-sm text-clay-dark">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="rounded-2xl border border-sage/40 bg-sage-soft px-4 py-2.5 text-sm text-ink">
        {state.message}
      </p>
    );
  }
  return null;
}

export function FieldError({ state, name }) {
  const msg = state?.fieldErrors?.[name];
  return msg ? (
    <p className="field-error" id={`${name}-error`}>
      {msg}
    </p>
  ) : null;
}

/**
 * Small one-button form for actions like delete / accept / dismiss.
 * Optional `confirm` text asks before submitting.
 */
export function ActionButton({
  action,
  fields = {},
  children,
  className = "btn-secondary btn-sm",
  pendingText = "Working…",
  confirm,
  showMessage = false,
}) {
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-start gap-1"
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v ?? ""} />
      ))}
      <SubmitButton className={className} pendingText={pendingText}>
        {children}
      </SubmitButton>
      {state?.error && <span className="text-xs text-clay-dark">{state.error}</span>}
      {showMessage && state?.ok && state.message && <span className="text-xs text-sage">{state.message}</span>}
    </form>
  );
}

/** Reveals children (usually a form) after clicking a toggle button. */
export function Disclosure({ label, children, className = "btn-secondary btn-sm", openLabel = "Cancel" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button type="button" className={className} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? openLabel : label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
