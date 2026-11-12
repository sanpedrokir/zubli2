"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getActionUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  profileSettingsSchema,
  profileEntrySchema,
  displayNameSchema,
  formToObject,
  fieldErrors,
} from "@/lib/validation";
import {
  saveProfileSettings,
  addEntry,
  updateEntry,
  toggleEntryMatching,
  deleteEntry,
  countEntries,
  setDisplayName,
  setDiscoverable,
  deleteAllUserData,
} from "@/lib/data/profile";
import { unblock } from "@/lib/data/requests";
import { runAction, requireId, InputError } from "@/lib/action-utils";

const MAX_ENTRIES = 80;
const SETTINGS_KEYS = ["discoverable", "show_name_in_suggestions", "birth_year", "birth_year_in_matching", "gender", "about"];
const ENTRY_KEYS = ["kind", "value", "city", "country", "neighbourhood", "start_year", "end_year", "include_in_matching"];

export async function completeOnboardingAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const parsed = displayNameSchema.safeParse(formData.get("display_name"));
    if (!parsed.success) throw new InputError("Please check your name.", { display_name: parsed.error.issues[0].message });
    if (formData.get("agree") !== "on") {
      throw new InputError("Please confirm the community guidelines.", { agree: "Please confirm to continue." });
    }
    await enforceRateLimit("profileWrite", user.id);
    await setDisplayName(user.id, parsed.data, { onboard: true });
    if (formData.get("discoverable") === "on") await setDiscoverable(user.id, true);
  });
  if (!state.ok) return { ...state, values: { display_name: formData.get("display_name") ?? "" } };
  const next = formData.get("next");
  redirect(next === "profile" ? "/profile?welcome=1" : next === "memory" ? "/memories/new" : "/dashboard");
}

export async function updateDisplayNameAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const parsed = displayNameSchema.safeParse(formData.get("display_name"));
    if (!parsed.success) throw new InputError("Please check your name.", { display_name: parsed.error.issues[0].message });
    await enforceRateLimit("profileWrite", user.id);
    await setDisplayName(user.id, parsed.data);
    refresh();
    return { message: "Name updated." };
  });
}

export async function saveProfileSettingsAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const parsed = profileSettingsSchema.safeParse(formToObject(formData, SETTINGS_KEYS));
    if (!parsed.success) throw new InputError("Please check the highlighted fields.", fieldErrors(parsed.error));
    await enforceRateLimit("profileWrite", user.id);
    await saveProfileSettings(user.id, parsed.data);
    refresh();
    return { message: parsed.data.discoverable ? "Saved. Your profile can now appear as a possible match." : "Saved. Your profile is private and not used in matching." };
  });
}

export async function saveEntryAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const rawId = formData.get("id");
    const id = rawId ? requireId(rawId, "entry") : null;
    const parsed = profileEntrySchema.safeParse(formToObject(formData, ENTRY_KEYS));
    if (!parsed.success) throw new InputError("Please check the highlighted fields.", fieldErrors(parsed.error));
    await enforceRateLimit("profileWrite", user.id);
    if (id) {
      if (!(await updateEntry(user.id, id, parsed.data))) throw new InputError("That entry could not be found.");
    } else {
      if ((await countEntries(user.id)) >= MAX_ENTRIES) throw new InputError(`You can add up to ${MAX_ENTRIES} entries.`);
      await addEntry(user.id, parsed.data);
    }
    refresh();
    return { message: id ? "Entry updated." : "Entry added.", resetKey: Date.now() };
  });
  if (!state.ok) return { ...state, values: Object.fromEntries(ENTRY_KEYS.map((k) => [k, formData.get(k) ?? ""])) };
  return state;
}

export async function toggleEntryAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "entry");
    await enforceRateLimit("profileWrite", user.id);
    if (!(await toggleEntryMatching(user.id, id))) throw new InputError("That entry could not be found.");
    refresh();
  });
}

export async function deleteEntryAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "entry");
    if (!(await deleteEntry(user.id, id))) throw new InputError("That entry could not be found.");
    refresh();
  });
}

export async function unblockAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const handle = String(formData.get("handle") ?? "");
    if (!/^[a-f0-9]{32}$/.test(handle)) throw new InputError("Not found.");
    if (!(await unblock(user.id, handle))) throw new InputError("Not found.");
    refresh();
  });
}

export async function deleteAllDataAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    if (formData.get("confirm") !== "DELETE") {
      throw new InputError("Type DELETE to confirm.", { confirm: "Type DELETE in capitals to confirm." });
    }
    await deleteAllUserData(user.id);
  });
  if (!state.ok) return state;
  redirect("/");
}
