"use client";

import { useActionState } from "react";
import { generateIllustrationAction, deleteIllustrationAction } from "@/app/actions/illustrations";
import { initialState, SubmitButton, FormMessage, FieldError, ActionButton } from "./forms";

const STYLES = {
  watercolour: "Soft watercolour",
  pastel: "Chalk pastel",
  gouache: "Vintage gouache poster",
  ink: "Storybook ink and wash",
};
const ERAS = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];

function AiLabel() {
  return (
    <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cream">
      AI-generated · not a real likeness
    </span>
  );
}

export default function IllustrationStudio({ memoryId, defaultEra, enabled, illustrations }) {
  const [state, formAction] = useActionState(generateIllustrationAction, initialState);

  return (
    <div className="space-y-5">
      {!enabled ? (
        <p className="rounded-2xl bg-parchment px-4 py-3 text-sm text-ink-soft">
          Illustrations are turned off on this server. An administrator can enable them by adding an image API key (see README).
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="memory_id" value={memoryId} />
          <FormMessage state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="era">
                Era
              </label>
              <select id="era" name="era" defaultValue={defaultEra} className="input">
                {ERAS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="style">
                Style
              </label>
              <select id="style" name="style" defaultValue="watercolour" className="input">
                {Object.entries(STYLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" name="acknowledge" className="mt-0.5 accent-clay" />
            <span>
              I understand this is an AI-generated artwork inspired by my description and the era. It is not a likeness of any real person and
              will never be used to identify anyone.
            </span>
          </label>
          <FieldError state={state} name="acknowledge" />
          <SubmitButton pendingText="Painting your memory… (this can take up to a minute)">Create illustration</SubmitButton>
        </form>
      )}

      {illustrations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {illustrations.map((ill) => (
            <figure key={ill.id} className="overflow-hidden rounded-2xl border border-sand bg-white">
              <div className="relative">
                {/* Private, auth-checked route; next/image optimisation would cache it publicly. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/illustrations/${ill.id}`}
                  alt={`AI-generated nostalgic illustration in ${STYLES[ill.style] ?? ill.style} style, ${ill.era}. Not a real likeness.`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <AiLabel />
              </div>
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-ink-soft">
                <span>
                  {ill.era} · {STYLES[ill.style] ?? ill.style}
                </span>
                <ActionButton
                  action={deleteIllustrationAction}
                  fields={{ id: ill.id }}
                  className="btn-ghost btn-sm"
                  confirm="Delete this illustration?"
                >
                  Delete
                </ActionButton>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
