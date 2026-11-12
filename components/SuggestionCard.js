"use client";

import { useActionState, useState } from "react";
import { sendRequestAction, blockAction } from "@/app/actions/requests";
import { dismissSuggestionAction } from "@/app/actions/memories";
import { initialState, SubmitButton, FormMessage, FieldError, ActionButton } from "./forms";

const TONE = {
  strong: "bg-sage-soft text-ink",
  medium: "bg-honey-soft text-ink",
  faint: "bg-parchment text-ink-soft",
};

function IntroForm({ suggestionRef, onDone }) {
  const [state, formAction] = useActionState(sendRequestAction, initialState);
  if (state?.ok) {
    return (
      <div className="mt-4">
        <FormMessage state={state} />
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={onDone}>
          Close
        </button>
      </div>
    );
  }
  return (
    <form action={formAction} className="mt-4 space-y-3 rounded-2xl bg-parchment/70 p-4">
      <input type="hidden" name="ref" value={suggestionRef} />
      <FormMessage state={state} />
      <div>
        <label htmlFor={`msg-${suggestionRef}`} className="label">
          Your introduction
        </label>
        <textarea
          id={`msg-${suggestionRef}`}
          name="message"
          rows={4}
          maxLength={1000}
          required
          className="input"
          placeholder="Hello! I’m looking for an old friend from St Mary’s around 1979 — we sat together in Mrs Naidoo’s class. If that might be you, I’d love to say hello again."
        />
        <p className="hint">Mention a shared memory only the real person would recognise. Links and contact details aren&apos;t allowed in first introductions.</p>
        <FieldError state={state} name="message" />
      </div>
      <label className="flex items-start gap-2 text-xs text-ink-soft">
        <input type="checkbox" name="acknowledge" className="mt-0.5 accent-clay" />
        <span>I understand this suggestion may not be the person I remember, and they can choose not to reply.</span>
      </label>
      <FieldError state={state} name="acknowledge" />
      <div className="flex gap-2">
        <SubmitButton className="btn-primary btn-sm" pendingText="Sending…">
          Send introduction
        </SubmitButton>
        <button type="button" className="btn-ghost btn-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function SuggestionCard({ suggestion, strength }) {
  const [open, setOpen] = useState(false);
  const status = suggestion.request_status;
  const canRequest = !suggestion.dismissed && !["pending", "accepted"].includes(status);

  return (
    <article className={`card ${suggestion.dismissed ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-semibold">{suggestion.label}</p>
          <p className="text-xs text-ink-soft">Possible connection · not a confirmed identity</p>
        </div>
        <span className={`chip ${TONE[strength.tone]}`}>
          {strength.label} · {suggestion.score}%
        </span>
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        {suggestion.reasons.map((r, i) => (
          <li key={i} className="flex gap-2 text-ink-soft">
            <span className="text-sage" aria-hidden="true">
              ✓
            </span>
            {r.label}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {status === "pending" && <span className="chip bg-honey-soft text-ink">Introduction pending</span>}
        {status === "accepted" && <span className="chip bg-sage-soft text-ink">Connected</span>}
        {status === "declined" && <span className="chip bg-parchment text-ink-soft">Not accepted</span>}
        {canRequest && !open && (
          <button type="button" className="btn-primary btn-sm" onClick={() => setOpen(true)}>
            Request an introduction
          </button>
        )}
        <ActionButton
          action={dismissSuggestionAction}
          fields={{ ref: suggestion.ref, dismissed: suggestion.dismissed ? "false" : "true" }}
          className="btn-ghost btn-sm"
        >
          {suggestion.dismissed ? "Restore" : "Not them — hide"}
        </ActionButton>
        <ActionButton
          action={blockAction}
          fields={{ ref: suggestion.ref }}
          className="btn-ghost btn-sm text-clay-dark"
          confirm="Block this person? They won't be suggested to you and can't contact you, and you won't appear in their suggestions."
        >
          Block
        </ActionButton>
      </div>
      {open && <IntroForm suggestionRef={suggestion.ref} onDone={() => setOpen(false)} />}
    </article>
  );
}
