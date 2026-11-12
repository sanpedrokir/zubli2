"use server";

import { refresh } from "next/cache";
import { getActionUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { illustrationSchema, formToObject, fieldErrors } from "@/lib/validation";
import { getMemory } from "@/lib/data/memories";
import { saveIllustration, deleteIllustration } from "@/lib/data/illustrations";
import { buildPrompt, generateIllustration, isIllustrationEnabled, IllustrationError } from "@/lib/illustration";
import { runAction, requireId, InputError } from "@/lib/action-utils";

export async function generateIllustrationAction(_prev, formData) {
  return runAction(async () => {
    if (!isIllustrationEnabled()) throw new IllustrationError("Illustrations are turned off on this server (no image API key configured).");
    const user = await getActionUser();
    if (user.is_suspended) throw new IllustrationError("This feature is unavailable for your account right now.");
    const memoryId = requireId(formData.get("memory_id"), "memory");
    const parsed = illustrationSchema.safeParse(formToObject(formData, ["era", "style", "acknowledge"]));
    if (!parsed.success) throw new InputError("Please check the form.", fieldErrors(parsed.error));

    const memory = await getMemory(user.id, memoryId);
    if (!memory) throw new InputError("That memory could not be found.");

    await enforceRateLimit("illustration", user.id);
    // Optional site-wide daily cap to protect the image API budget.
    const globalCap = Number.parseInt(process.env.ILLUSTRATION_GLOBAL_DAILY_LIMIT ?? "", 10);
    if (Number.isFinite(globalCap) && globalCap > 0) {
      await enforceRateLimit("illustration", "all-users", {
        limit: globalCap,
        message: "The illustration studio has reached today's limit. Please try again tomorrow.",
      });
    }

    const prompt = buildPrompt(memory, parsed.data);
    const image = await generateIllustration(prompt);
    await saveIllustration(user.id, memoryId, { ...parsed.data, prompt, mimeType: image.mimeType, base64: image.base64 });
    refresh();
    return { message: "Your illustration is ready." };
  });
}

export async function deleteIllustrationAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "illustration");
    if (!(await deleteIllustration(user.id, id))) throw new InputError("That illustration could not be found.");
    refresh();
  });
}
