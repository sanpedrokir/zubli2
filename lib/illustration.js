import "server-only";

import { cleanText } from "./validation";

// Memory-inspired illustration generation via an OpenAI-compatible Images API.
// The feature is optional: when IMAGE_API_KEY is not set, the UI explains
// that illustrations are disabled and nothing is called.

export function isIllustrationEnabled() {
  return Boolean(process.env.IMAGE_API_KEY);
}

export class IllustrationError extends Error {
  constructor(message) {
    super(message);
    this.name = "IllustrationError";
  }
}

const STYLE_PROMPTS = {
  watercolour: "loose, soft watercolour painting with gentle colour bleeds and visible paper texture",
  pastel: "chalk pastel drawing with warm, hazy edges and soft grain",
  gouache: "vintage gouache travel-poster style with simplified shapes and a muted retro palette",
  ink: "storybook pen-and-ink illustration with light watercolour wash",
};

function clip(text, max) {
  const t = cleanText(text ?? "");
  if (!t) return "";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/**
 * Builds the prompt. Personal names, heights and other identifying details are
 * intentionally excluded: the goal is an evocative scene, not a portrait.
 */
export function buildPrompt(memory, { era, style }) {
  const place = [memory.neighbourhood, memory.city, memory.country].filter(Boolean).map((p) => clip(p, 60)).join(", ");
  const parts = [
    `A nostalgic, ${STYLE_PROMPTS[style] ?? STYLE_PROMPTS.watercolour}.`,
    `Setting: the ${era}${place ? ` in ${place}` : ""}, with period-appropriate clothing, objects and architecture.`,
    `Scene inspired by this memory of a friendship: ${clip(memory.description, 300)}`,
  ];
  if (memory.hangouts) parts.push(`Places they spent time: ${clip(memory.hangouts, 200)}.`);
  if (memory.shared_activities) parts.push(`Activities they shared: ${clip(memory.shared_activities, 200)}.`);
  if (memory.school) parts.push("A school setting may appear in the background.");
  parts.push(
    "Important: people appear small, from behind, in silhouette or at a distance, with no detailed or recognisable faces. " +
      "This is an impressionistic artwork, not a portrait or photograph. No text, no logos, no watermarks.",
  );
  return parts.join(" ");
}

/** Calls the image API and returns { base64, mimeType }. */
export async function generateIllustration(prompt) {
  if (!isIllustrationEnabled()) throw new IllustrationError("Illustrations are not configured on this server.");
  const baseUrl = (process.env.IMAGE_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.IMAGE_MODEL || "gpt-image-1";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res;
  try {
    res = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IMAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: process.env.IMAGE_QUALITY || "medium",
        output_format: "webp",
        output_compression: 80,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    throw new IllustrationError(err.name === "AbortError" ? "The illustration took too long. Please try again." : "Couldn't reach the illustration service.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      // ignore
    }
    console.error("Image API error", res.status, detail);
    if (res.status === 400 && /safety|policy|moderation/i.test(detail)) {
      throw new IllustrationError("The illustration service declined this description. Try rewording the memory.");
    }
    throw new IllustrationError("The illustration service returned an error. Please try again later.");
  }

  const json = await res.json();
  const item = json?.data?.[0];
  if (item?.b64_json) return { base64: item.b64_json, mimeType: "image/webp" };
  if (item?.url) {
    // Some compatible providers return a temporary URL instead of base64.
    const img = await fetch(item.url, { cache: "no-store" });
    if (!img.ok) throw new IllustrationError("Couldn't download the generated illustration.");
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) throw new IllustrationError("The generated image was too large.");
    return { base64: buf.toString("base64"), mimeType: img.headers.get("content-type") || "image/png" };
  }
  throw new IllustrationError("The illustration service returned no image.");
}

