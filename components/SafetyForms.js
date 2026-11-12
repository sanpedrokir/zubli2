"use client";

import { useActionState, useEffect, useRef } from "react";
import { reportAction, blockAction, sendMessageAction } from "@/app/actions/requests";
import { initialState, SubmitButton, FormMessage, FieldError, ActionButton, Disclosure } from "./forms";

const REASONS = {
  spam: "Spam or scam",
  harassment: "Harassment or unwanted contact",
  impersonation: "Pretending to be someone else",
  inappropriate: "Inappropriate content",
  safety: "I feel unsafe",
  other: "Something else",
};

function ReportForm({ requestId }) {
  const [state, formAction] = useActionState(reportAction, initialState);
  return (
    <form action={formAction} className="space-y-3 rounded-2xl bg-rose-soft/50 p-4">
      <input type="hidden" name="id" value={requestId} />
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor={`reason-${requestId}`}>
          What&apos;s wrong?
        </label>
        <select id={`reason-${requestId}`} name="reason" className="input" defaultValue="">
          <option value="" disabled>
            Choose a reason
          </option>
          {Object.entries(REASONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <FieldError state={state} name="reason" />
      </div>
      <div>
        <label className="label" htmlFor={`details-${requestId}`}>
          Details (optional)
        </label>
        <textarea id={`details-${requestId}`} name="details" rows={3} maxLength={1000} className="input" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="block" defaultChecked className="accent-clay" /> Also block this person
      </label>
      <SubmitButton className="btn-danger btn-sm" pendingText="Sending report…">
        Send report
      </SubmitButton>
      <p className="hint">If you are in immediate danger, contact your local emergency services.</p>
    </form>
  );
}

export function SafetyActions({ requestId }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionButton
        action={blockAction}
        fields={{ id: requestId }}
        className="btn-ghost btn-sm text-clay-dark"
        confirm="Block this person? Any pending introduction or conversation between you will be closed."
      >
        Block
      </ActionButton>
      <div className="min-w-0 flex-1">
        <Disclosure label="Report" className="btn-ghost btn-sm text-clay-dark" openLabel="Cancel report">
          <ReportForm requestId={requestId} />
        </Disclosure>
      </div>
    </div>
  );
}

export function MessageComposer({ requestId }) {
  const [state, formAction] = useActionState(sendMessageAction, initialState);
  const ref = useRef(null);
  useEffect(() => {
    if (state?.ok) ref.current?.focus();
  }, [state]);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={requestId} />
      {state?.error && <FormMessage state={state} />}
      <label htmlFor="body" className="sr-only">
        Message
      </label>
      <textarea
        ref={ref}
        id="body"
        name="body"
        rows={3}
        maxLength={2000}
        required
        className="input"
        placeholder="Write a message…"
        key={state?.resetKey ?? "composer"}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="hint">Take your time getting to know each other. Never send money or financial details.</p>
        <SubmitButton className="btn-primary btn-sm" pendingText="Sending…">
          Send
        </SubmitButton>
      </div>
    </form>
  );
}
