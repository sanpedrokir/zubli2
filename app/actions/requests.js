"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getActionUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestMessageSchema, chatMessageSchema, reportSchema, formToObject, fieldErrors } from "@/lib/validation";
import {
  sendRequest,
  respondToRequest,
  withdrawRequest,
  sendMessage,
  closeConnection,
  blockViaRequest,
  blockViaSuggestion,
  reportViaRequest,
} from "@/lib/data/requests";
import { runAction, requireId, InputError } from "@/lib/action-utils";

// Very small heuristic filter for obvious contact-harvesting / spam in first
// messages. People share contact details only after acceptance, in-app.
const SUSPICIOUS = [/https?:\/\//i, /\bwww\./i, /\b(bitcoin|crypto|investment|wire transfer|gift card)\b/i];

export async function sendRequestAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const ref = requireId(formData.get("ref"), "suggestion");
    const parsed = requestMessageSchema.safeParse(formData.get("message"));
    if (!parsed.success) throw new InputError("Please check your message.", { message: parsed.error.issues[0].message });
    if (SUSPICIOUS.some((re) => re.test(parsed.data))) {
      throw new InputError("Please don't include links or financial topics in a first introduction.", {
        message: "Links and financial topics aren't allowed in introductions.",
      });
    }
    if (formData.get("acknowledge") !== "on") {
      throw new InputError("Please confirm you understand this may not be the person you remember.", {
        acknowledge: "Please confirm to continue.",
      });
    }
    await enforceRateLimit("requestSend", user.id);
    await sendRequest(user, ref, parsed.data);
    refresh();
    return { message: "Introduction sent. They'll be notified and can choose whether to reply." };
  });
}

export async function respondToRequestAction(_prev, formData) {
  const decision = formData.get("decision");
  const state = await runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "request");
    if (decision !== "accept" && decision !== "decline") throw new InputError("Unknown choice.");
    await enforceRateLimit("requestRespond", user.id);
    await respondToRequest(user.id, id, decision === "accept");
    if (decision !== "accept") refresh();
  });
  if (state.ok && decision === "accept") redirect(`/connections/${formData.get("id")}`);
  return state;
}

export async function withdrawRequestAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "request");
    await enforceRateLimit("requestRespond", user.id);
    await withdrawRequest(user.id, id);
    refresh();
  });
}

export async function sendMessageAction(_prev, formData) {
  return runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "conversation");
    const parsed = chatMessageSchema.safeParse(formData.get("body"));
    if (!parsed.success) throw new InputError(parsed.error.issues[0].message, { body: parsed.error.issues[0].message });
    await enforceRateLimit("messageSend", user.id);
    await sendMessage(user, id, parsed.data);
    refresh();
    return { resetKey: Date.now() };
  });
}

export async function closeConnectionAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "conversation");
    await closeConnection(user.id, id);
  });
  if (!state.ok) return state;
  redirect("/requests");
}

export async function blockAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const ref = formData.get("ref");
    const id = formData.get("id");
    await enforceRateLimit("requestRespond", user.id);
    if (ref) await blockViaSuggestion(user.id, requireId(ref, "suggestion"));
    else await blockViaRequest(user.id, requireId(id, "request"));
    if (ref) refresh();
  });
  if (!state.ok || formData.get("ref")) return state;
  redirect("/requests?blocked=1");
}

export async function reportAction(_prev, formData) {
  const state = await runAction(async () => {
    const user = await getActionUser();
    const id = requireId(formData.get("id"), "request");
    const parsed = reportSchema.safeParse(formToObject(formData, ["reason", "details"]));
    if (!parsed.success) throw new InputError("Please choose a reason.", fieldErrors(parsed.error));
    await enforceRateLimit("report", user.id);
    await reportViaRequest(user.id, id, parsed.data, { alsoBlock: formData.get("block") === "on" });
  });
  if (!state.ok) return state;
  redirect("/requests?reported=1");
}
