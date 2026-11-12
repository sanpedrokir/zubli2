"use client";

import { useActionState, useState } from "react";
import {
  saveProfileSettingsAction,
  saveEntryAction,
  toggleEntryAction,
  deleteEntryAction,
  updateDisplayNameAction,
  deleteAllDataAction,
  unblockAction,
} from "@/app/actions/profile";
import { initialState, SubmitButton, FormMessage, FieldError, ActionButton } from "./forms";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];
export const ENTRY_KINDS = {
  school: { label: "School", placeholder: "St Mary's High School", icon: "✎" },
  location: { label: "Place I lived", placeholder: "Berea", icon: "⌂" },
  workplace: { label: "Workplace", placeholder: "Durban Central Library", icon: "⚒" },
  nickname: { label: "Nickname", placeholder: "Kathy", icon: "❝" },
  former_name: { label: "Former name", placeholder: "Katherine Smith", icon: "✦" },
};

function Toggle({ name, defaultChecked, title, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-sand bg-white p-4 has-[:checked]:border-sage has-[:checked]:bg-sage-soft/50">
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-sm text-ink-soft">{description}</span>
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-sage" />
    </label>
  );
}

export function PrivacySettingsForm({ profile }) {
  const [state, formAction] = useActionState(saveProfileSettingsAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <Toggle
        name="discoverable"
        defaultChecked={profile.discoverable}
        title="Discoverable — take part in matching"
        description="When on, the entries you mark “Used in matching” can be compared with other members' memories. When off, nobody can find you."
      />
      <Toggle
        name="show_name_in_suggestions"
        defaultChecked={profile.show_name_in_suggestions}
        title="Show my name in suggestions"
        description="Otherwise you appear as “A Zubli member” until you accept an introduction. Your name is also used for name matching only when this is on."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="birth_year">
            Birth year (optional)
          </label>
          <input id="birth_year" name="birth_year" type="number" inputMode="numeric" defaultValue={profile.birth_year ?? ""} className="input" />
          <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" name="birth_year_in_matching" defaultChecked={profile.birth_year_in_matching} className="accent-sage" />
            Use to check ages roughly fit (never shown)
          </label>
          <FieldError state={state} name="birth_year" />
        </div>
        <div>
          <label className="label" htmlFor="gender">
            Gender (optional)
          </label>
          <select id="gender" name="gender" defaultValue={profile.gender ?? ""} className="input">
            <option value="">Not specified</option>
            {GENDERS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <p className="hint">A soft signal only; never shown.</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="about">
          A note about you (private)
        </label>
        <textarea id="about" name="about" rows={3} maxLength={1000} defaultValue={profile.about ?? ""} className="input" />
        <p className="hint">Never shown in suggestions or used in matching. A place to jot down memories of your own.</p>
        <FieldError state={state} name="about" />
      </div>
      <SubmitButton>Save privacy settings</SubmitButton>
    </form>
  );
}

export function EntryForm({ entry, onDone }) {
  const [state, formAction] = useActionState(saveEntryAction, initialState);
  const values = state?.values ?? entry ?? { kind: "school", include_in_matching: true };
  const [kind, setKind] = useState(values.kind || "school");
  const yearMax = new Date().getFullYear();
  const showPlace = kind !== "nickname" && kind !== "former_name";
  const idp = entry?.id ?? "new";

  return (
    <form action={formAction} key={state?.resetKey ?? "form"} className="space-y-4">
      {entry?.id && <input type="hidden" name="id" value={entry.id} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <label className="label" htmlFor={`kind-${idp}`}>
            Type
          </label>
          <select id={`kind-${idp}`} name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input">
            {Object.entries(ENTRY_KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`value-${idp}`}>
            {kind === "location" ? "Neighbourhood, street or area" : ENTRY_KINDS[kind].label}
          </label>
          <input id={`value-${idp}`} name="value" defaultValue={values.value ?? ""} placeholder={ENTRY_KINDS[kind].placeholder} maxLength={160} className="input" />
          <FieldError state={state} name="value" />
        </div>
      </div>
      {showPlace && (
        <div className="grid gap-4 sm:grid-cols-3">
          {kind !== "location" && (
            <div>
              <label className="label" htmlFor={`hood-${idp}`}>
                Neighbourhood
              </label>
              <input id={`hood-${idp}`} name="neighbourhood" defaultValue={values.neighbourhood ?? ""} maxLength={120} className="input" />
            </div>
          )}
          <div>
            <label className="label" htmlFor={`city-${idp}`}>
              City or town
            </label>
            <input id={`city-${idp}`} name="city" defaultValue={values.city ?? ""} maxLength={80} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`country-${idp}`}>
              Country
            </label>
            <input id={`country-${idp}`} name="country" defaultValue={values.country ?? ""} maxLength={80} className="input" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
        <div>
          <label className="label" htmlFor={`start-${idp}`}>
            From (year)
          </label>
          <input id={`start-${idp}`} name="start_year" type="number" inputMode="numeric" min={1900} max={yearMax} defaultValue={values.start_year ?? ""} className="input" />
          <FieldError state={state} name="start_year" />
        </div>
        <div>
          <label className="label" htmlFor={`end-${idp}`}>
            To (year)
          </label>
          <input id={`end-${idp}`} name="end_year" type="number" inputMode="numeric" min={1900} max={yearMax} defaultValue={values.end_year ?? ""} className="input" />
          <FieldError state={state} name="end_year" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="include_in_matching"
          defaultChecked={values.include_in_matching === true || values.include_in_matching === "on"}
          className="accent-sage"
        />
        Use this entry in matching (only when your profile is discoverable)
      </label>
      <div className="flex gap-2">
        <SubmitButton className="btn-primary btn-sm">{entry?.id ? "Save entry" : "Add entry"}</SubmitButton>
        {onDone && (
          <button type="button" className="btn-ghost btn-sm" onClick={onDone}>
            Done
          </button>
        )}
      </div>
    </form>
  );
}

export function EntryRow({ entry }) {
  const [editing, setEditing] = useState(false);
  const meta = ENTRY_KINDS[entry.kind];
  const years = entry.start_year || entry.end_year ? [entry.start_year, entry.end_year].filter(Boolean).join("–") : null;
  const place = [entry.neighbourhood, entry.city, entry.country].filter(Boolean).join(", ");

  if (editing) {
    return (
      <li className="rounded-2xl border border-clay/30 bg-white p-4">
        <EntryForm entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-sand bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-parchment text-clay" aria-hidden="true">
          {meta.icon}
        </span>
        <div>
          <p className="font-medium">{entry.value}</p>
          <p className="text-xs text-ink-soft">{[meta.label, place, years].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton action={toggleEntryAction} fields={{ id: entry.id }} className={entry.include_in_matching ? "chip bg-sage-soft text-ink" : "chip bg-parchment text-ink-soft"}>
          {entry.include_in_matching ? "✓ Used in matching" : "Not used in matching"}
        </ActionButton>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>
        <ActionButton action={deleteEntryAction} fields={{ id: entry.id }} className="btn-ghost btn-sm text-clay-dark" confirm="Delete this entry?">
          Delete
        </ActionButton>
      </div>
    </li>
  );
}

export function DisplayNameForm({ name }) {
  const [state, formAction] = useActionState(updateDisplayNameAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <label className="label" htmlFor="display_name">
        Your name
      </label>
      <div className="flex gap-2">
        <input id="display_name" name="display_name" defaultValue={name} maxLength={60} className="input" />
        <SubmitButton className="btn-secondary">Save</SubmitButton>
      </div>
      <FieldError state={state} name="display_name" />
      <p className="hint">Shown to people you connect with, and in suggestions only if you allow it.</p>
    </form>
  );
}

export function BlockedList({ blocked }) {
  if (!blocked.length) return <p className="text-sm text-ink-soft">You haven&apos;t blocked anyone.</p>;
  return (
    <ul className="space-y-2">
      {blocked.map((b) => (
        <li key={b.handle} className="flex items-center justify-between rounded-2xl bg-parchment/60 px-4 py-2 text-sm">
          <span>{b.name}</span>
          <ActionButton action={unblockAction} fields={{ handle: b.handle }} className="btn-ghost btn-sm" confirm="Unblock this person?">
            Unblock
          </ActionButton>
        </li>
      ))}
    </ul>
  );
}

export function DeleteDataForm() {
  const [state, formAction] = useActionState(deleteAllDataAction, initialState);
  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(e) => {
        if (!window.confirm("Permanently delete all your Zubli data? This cannot be undone.")) e.preventDefault();
      }}
    >
      <FormMessage state={state} />
      <label className="label" htmlFor="confirm">
        Type DELETE to permanently remove your memories, profile, introductions, messages and illustrations
      </label>
      <div className="flex gap-2">
        <input id="confirm" name="confirm" className="input" autoComplete="off" />
        <SubmitButton className="btn-danger" pendingText="Deleting…">
          Delete my data
        </SubmitButton>
      </div>
      <FieldError state={state} name="confirm" />
      <p className="hint">To close your sign-in account as well, use “Manage account” in the profile menu (top right).</p>
    </form>
  );
}
