import { auth } from "@clerk/nextjs/server";
import { getIllustrationImage } from "@/lib/data/illustrations";
import { uuidSchema } from "@/lib/validation";

// Serves an illustration only to its owner. Images are never public.
export async function GET(_request, { params }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return new Response("Not found", { status: 404 });

  const image = await getIllustrationImage(userId, id);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.buffer, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="zubli-illustration-${id}.webp"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
