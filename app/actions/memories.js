"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getActionUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { memorySchema, MEMORY_FIELDS, formToObject, fieldErrors } from "@/lib/validation";
import { createMemory, updateMemory, deleteMemory, countMemories } from "@/lib/data/memories";
import { refreshMatches, setSuggestionDismissed } from "@/lib/data/matches";
import { runAction, requireId, InputError } from "@/lib/action-utils";

const MAX_MEMORIES = 200;

export async function saveMemoryAction(_prev, formData) {
  let savedId = null;
  const state = await runAction(async () => {
    const user = await getActionUser();
    const rawId = formData.get("id");
    const id = rawId ? requireId(rawId, "memory") : null;

    const parsed = memorySchema.safeParse(formToObject(formData, MEMORY_FIELDS));
    if (!parsed.success) {
      throw new InputError("Please check the highlighted fields.", fieldErrors(parsed.error));
    }
    await enforceRateLimit("memoryWrite", user.id);

    if (id) {
      const ok = await updateMemory(user.id, id, parsed.data);
      if (!ok) throw new InputError("That memory could not be found.");
      savedId = id;
    } else {
      if ((await countMemories(user.id)) >= MAX_MEMORIES) {
        throw new InputError(`You can keep up to ${MAX_MEMORIES} memories. Please delete some old ones first.`);
      }
      savedId = await createMemory(user.id, parsed.data);
    }

    // Look for possible connections straight away (best effort).
    try {
      await enforceRateLimit("matchRefresh", user.id);
      await refreshMatches(user.id, savedId);
    } catch (err) {
      console.warn("Match refresh after save skipped:", err.message);
    }
  });

  if (!state.ok) {
    // Echo values back so the form keeps what the user typed.
    return { ...state, values: Object.fromEntries(MEMORY_FIELDS.map((k) => [k, formData.get(k) ?? ""])) };
  }
  redirect(`/memories/${savedId}?saved=1`);
}

export async function deleteMemoryAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "memory");
    const ok = await deleteMemory(user.id, id);
    if (!ok) throw new InputError("That memory could not be found.");
  });
  if (!state.ok) return state;
  const back = formData.get("redirectTo") === "/dashboard" ? "/dashboard" : "/memories";
  redirect(back);
}

export async function refreshMatchesAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "memory");
    await enforceRateLimit("matchRefresh", user.id);
    const n = await refreshMatches(user.id, id);
    if (n === null) throw new InputError("That memory could not be found.");
    refresh();
    return { message: n ? `Found ${n} possible connection${n === 1 ? "" : "s"}.` : "No possible connections yet. New people join and opt in over time." };
  });
}

export async function dismissSuggestionAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const ref = requireId(formData.get("ref"), "suggestion");
    const dismissed = formData.get("dismissed") !== "false";
    const memoryId = await setSuggestionDismissed(user.id, ref, dismissed);
    if (!memoryId) throw new InputError("That suggestion could not be found.");
    refresh();
  });
}
