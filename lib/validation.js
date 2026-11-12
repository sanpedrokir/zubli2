import { z } from "zod";

// Remove control characters (keeps newlines and tabs), normalise whitespace.
export function cleanText(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const optionalText = (max) =>
  z.preprocess(
    (v) => {
      const c = cleanText(v);
      return c === "" || c === undefined || c === null ? null : c;
    },
    z.string().max(max, `Please keep this under ${max} characters.`).nullable(),
  );

const requiredText = (min, max, label) =>
  z.preprocess(
    (v) => cleanText(v ?? ""),
    z
      .string()
      .min(min, `${label} needs at least ${min} characters.`)
      .max(max, `${label} must be under ${max} characters.`),
  );

const optionalInt = (min, max, label) =>
  z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    },
    z
      .number({ error: `${label} must be a number.` })
      .int(`${label} must be a whole number.`)
      .min(min, `${label} must be ${min} or later.`)
      .max(max, `${label} must be ${max} or earlier.`)
      .nullable(),
  );

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const CURRENT_YEAR = new Date().getFullYear();

export const GENDER_OPTIONS = ["", "Female", "Male", "Non-binary", "Prefer not to say"];

export const memorySchema = z.object({
  description: requiredText(10, 600, "The description"),
  full_name: optionalText(120),
  partial_name: optionalText(120),
  nickname: optionalText(80),
  country: optionalText(80),
  city: optionalText(80),
  neighbourhood: optionalText(120),
  hangouts: optionalText(500),
  school: optionalText(160),
  workplace: optionalText(160),
  occupation: optionalText(120),
  year_last_seen: optionalInt(1900, CURRENT_YEAR, "Year last seen"),
  age_that_year: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ error: "Age must be a number." }).int().min(0, "Age can't be negative.").max(120, "Age must be 120 or less.").nullable(),
  ),
  gender: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(GENDER_OPTIONS.filter(Boolean)).nullable()),
  height: optionalText(60),
  shared_activities: optionalText(1000),
  personal_memories: optionalText(3000),
});

export const MEMORY_FIELDS = Object.keys(memorySchema.shape);

export const profileSettingsSchema = z.object({
  discoverable: checkbox,
  show_name_in_suggestions: checkbox,
  birth_year: optionalInt(1900, CURRENT_YEAR, "Birth year"),
  birth_year_in_matching: checkbox,
  gender: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(GENDER_OPTIONS.filter(Boolean)).nullable()),
  about: optionalText(1000),
});

export const ENTRY_KINDS = {
  school: "School",
  location: "Place I lived",
  workplace: "Workplace",
  nickname: "Nickname",
  former_name: "Former name",
};

export const profileEntrySchema = z
  .object({
    kind: z.enum(Object.keys(ENTRY_KINDS)),
    value: requiredText(2, 160, "This entry"),
    city: optionalText(80),
    country: optionalText(80),
    neighbourhood: optionalText(120),
    start_year: optionalInt(1900, CURRENT_YEAR, "Start year"),
    end_year: optionalInt(1900, CURRENT_YEAR, "End year"),
    include_in_matching: checkbox,
  })
  .refine((e) => e.start_year == null || e.end_year == null || e.start_year <= e.end_year, {
    message: "The start year must be before the end year.",
    path: ["end_year"],
  });

export const displayNameSchema = requiredText(2, 60, "Your name");

export const requestMessageSchema = requiredText(
  20,
  1000,
  "Your introduction",
);

export const chatMessageSchema = requiredText(1, 2000, "Your message");

export const REPORT_REASONS = {
  spam: "Spam or scam",
  harassment: "Harassment or unwanted contact",
  impersonation: "Pretending to be someone else",
  inappropriate: "Inappropriate content",
  safety: "I feel unsafe",
  other: "Something else",
};

export const reportSchema = z.object({
  reason: z.enum(Object.keys(REPORT_REASONS)),
  details: optionalText(1000),
});

export const uuidSchema = z.uuid();

export const ERAS = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];
export const ILLUSTRATION_STYLES = {
  watercolour: "Soft watercolour",
  pastel: "Chalk pastel",
  gouache: "Vintage gouache poster",
  ink: "Storybook ink and wash",
};

export const illustrationSchema = z.object({
  era: z.enum(ERAS),
  style: z.enum(Object.keys(ILLUSTRATION_STYLES)),
  acknowledge: z.literal("on", { error: "Please confirm you understand the illustration is not a real likeness." }),
});

/** Converts FormData into a plain object, keeping only the given keys. */
export function formToObject(formData, keys) {
  const out = {};
  for (const key of keys) {
    const v = formData.get(key);
    out[key] = v === null ? undefined : v;
  }
  return out;
}

/** Flattens zod issues to { field: message } for form display. */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path[0] ?? "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
