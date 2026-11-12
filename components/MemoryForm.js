"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveMemoryAction } from "@/app/actions/memories";
import { initialState, SubmitButton, FormMessage, FieldError } from "./forms";

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

function Field({ name, label, hint, state, values, type = "text", textarea, rows = 3, placeholder, ...rest }) {
  const value = values?.[name] ?? "";
  const err = state?.fieldErrors?.[name];
  const common = {
    id: name,
    name,
    defaultValue: value === null ? "" : String(value),
    placeholder,
    className: "input",
    "aria-invalid": err ? true : undefined,
    "aria-describedby": err ? `${name}-error` : hint ? `${name}-hint` : undefined,
    ...rest,
  };
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {textarea ? <textarea rows={rows} {...common} /> : <input type={type} {...common} />}
      {hint && !err && (
        <p className="hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
      <FieldError state={state} name={name} />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <fieldset className="card">
      <legend className="sr-only">{title}</legend>
      <h2 className="subheading">{title}</h2>
      {description && <p className="mb-5 mt-1 text-sm text-ink-soft">{description}</p>}
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function MemoryForm({ memory }) {
  const [state, formAction] = useActionState(saveMemoryAction, initialState);
  const values = state?.values ?? memory ?? {};
  const year = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {memory?.id && <input type="hidden" name="id" value={memory.id} />}
      <FormMessage state={state} />

      <Section
        title="Who do you hope to reconnect with?"
        description="This is the only required field. Everything else is optional — share whatever you remember."
      >
        <div className="sm:col-span-2">
          <Field
            name="description"
            label="A short description *"
            textarea
            rows={3}
            required
            maxLength={600}
            placeholder="My best friend from primary school — we walked home together every day and swapped comics."
            state={state}
            values={values}
          />
        </div>
      </Section>

      <Section title="Their name" description="Even part of a name or an old nickname can help.">
        <Field name="full_name" label="Full name" placeholder="Katherine Smith" state={state} values={values} maxLength={120} />
        <Field name="partial_name" label="Partial name" hint="A first name, surname or initials." placeholder="Kath… S." state={state} values={values} maxLength={120} />
        <Field name="nickname" label="Nickname" placeholder="Kathy, Smitty" state={state} values={values} maxLength={80} />
      </Section>

      <Section title="Where you knew them">
        <Field name="country" label="Country" state={state} values={values} maxLength={80} />
        <Field name="city" label="City or town" state={state} values={values} maxLength={80} />
        <Field name="neighbourhood" label="Neighbourhood or street" state={state} values={values} maxLength={120} />
        <Field
          name="hangouts"
          label="Places you hung out"
          hint="Cafés, parks, cinemas, youth clubs, the corner shop…"
          textarea
          rows={2}
          state={state}
          values={values}
          maxLength={500}
        />
      </Section>

      <Section title="School and work">
        <Field name="school" label="School" placeholder="St Mary's High School" state={state} values={values} maxLength={160} />
        <Field name="workplace" label="Workplace" state={state} values={values} maxLength={160} />
        <Field name="occupation" label="Their occupation" state={state} values={values} maxLength={120} />
      </Section>

      <Section title="When" description="Approximate is perfectly fine.">
        <Field name="year_last_seen" label="Year you last saw them" type="number" inputMode="numeric" min={1900} max={year} placeholder="1979" state={state} values={values} />
        <Field name="age_that_year" label="Their approximate age that year" type="number" inputMode="numeric" min={0} max={120} placeholder="14" state={state} values={values} />
      </Section>

      <Section title="Optional details" description="Only if you're comfortable. Used gently — memories can be wrong.">
        <div>
          <label htmlFor="gender" className="label">
            Gender (optional)
          </label>
          <select id="gender" name="gender" defaultValue={values.gender ?? ""} className="input">
            <option value="">Not specified</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <FieldError state={state} name="gender" />
        </div>
        <Field name="height" label="Approximate height (optional)" placeholder="Tall for our age" state={state} values={values} maxLength={60} />
      </Section>

      <Section title="What you shared" description="Private to you. Helps you write a warm introduction and inspires the optional illustration.">
        <Field name="shared_activities" label="Shared activities" textarea rows={3} placeholder="Netball, roller-skating, the school choir" state={state} values={values} maxLength={1000} />
        <Field
          name="personal_memories"
          label="Personal memories"
          textarea
          rows={4}
          placeholder="The day we got caught in the rain after the Saturday matinee…"
          state={state}
          values={values}
          maxLength={3000}
        />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href={memory?.id ? `/memories/${memory.id}` : "/memories"} className="btn-ghost">
          Cancel
        </Link>
        <SubmitButton pendingText="Saving and looking for matches…">{memory?.id ? "Save changes" : "Save memory"}</SubmitButton>
      </div>
    </form>
  );
}
