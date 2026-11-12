"use client";

import { useActionState, useState } from "react";
import { completeOnboardingAction } from "@/app/actions/profile";
import { initialState, SubmitButton, FormMessage, FieldError } from "./forms";

const NEXT_OPTIONS = [
  { value: "memory", title: "Find someone", body: "Write down what you remember about a friend." },
  { value: "profile", title: "Let friends find me", body: "Add the schools, places and workplaces of your past." },
  { value: "dashboard", title: "Just look around", body: "Go to your dashboard first." },
];

export default function OnboardingForm({ defaultName }) {
  const [state, formAction] = useActionState(completeOnboardingAction, initialState);
  const [step, setStep] = useState(1);
  const name = state?.values?.display_name ?? defaultName ?? "";

  return (
    <form action={formAction} className="card space-y-6 p-8">
      <ol className="flex items-center gap-2 text-xs font-medium text-ink-soft" aria-label="Progress">
        {[1, 2, 3].map((n) => (
          <li key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-clay" : "bg-sand"}`} aria-current={n === step ? "step" : undefined}>
            <span className="sr-only">Step {n}</span>
          </li>
        ))}
      </ol>
      <FormMessage state={state} />

      {/* Step 1 — name. Kept in the DOM (hidden) so all fields submit together. */}
      <div hidden={step !== 1} className="space-y-4">
        <h2 className="subheading">What should people call you?</h2>
        <p className="text-sm text-ink-soft">
          Shown only to people whose introduction you accept, or to people you send one to. You can include a former name, e.g. “Kathy (Smith) Brown”.
        </p>
        <div>
          <label htmlFor="display_name" className="label">
            Your name
          </label>
          <input id="display_name" name="display_name" defaultValue={name} maxLength={60} className="input" autoComplete="name" />
          <FieldError state={state} name="display_name" />
        </div>
        <button type="button" className="btn-primary" onClick={() => setStep(2)}>
          Continue
        </button>
      </div>

      {/* Step 2 — privacy */}
      <div hidden={step !== 2} className="space-y-4">
        <h2 className="subheading">You&apos;re in control</h2>
        <ul className="space-y-2 text-sm text-ink-soft">
          <li>• Your searches are private. Nobody else sees them.</li>
          <li>• Your history is only used for matching if you make it discoverable — and you choose each detail.</li>
          <li>• No one can message you unless you accept their introduction. Your email is never shared.</li>
          <li>• Suggestions are possibilities, not confirmed identities.</li>
        </ul>
        <label className="flex items-start gap-2 rounded-2xl bg-parchment/70 p-3 text-sm">
          <input type="checkbox" name="discoverable" className="mt-1 accent-clay" />
          <span>
            <strong>Make me discoverable</strong> — let my historical profile be compared with other people&apos;s memories. (You can change this any time.)
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-1 accent-clay" />
          <span>
            I&apos;ll be kind and honest, respect people who don&apos;t reply, and never ask anyone for money.
          </span>
        </label>
        <FieldError state={state} name="agree" />
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
            Back
          </button>
          <button type="button" className="btn-primary" onClick={() => setStep(3)}>
            Continue
          </button>
        </div>
      </div>

      {/* Step 3 — where next */}
      <div hidden={step !== 3} className="space-y-4">
        <h2 className="subheading">Where would you like to begin?</h2>
        <div className="grid gap-3">
          {NEXT_OPTIONS.map((o, i) => (
            <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand bg-white p-4 has-[:checked]:border-clay has-[:checked]:bg-clay-soft/40">
              <input type="radio" name="next" value={o.value} defaultChecked={i === 0} className="mt-1 accent-clay" />
              <span>
                <span className="block font-medium">{o.title}</span>
                <span className="text-sm text-ink-soft">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
            Back
          </button>
          <SubmitButton pendingText="Setting up…">Finish</SubmitButton>
        </div>
      </div>
    </form>
  );
}
