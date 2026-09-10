import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { fetchNewsCandidates } from "@/lib/news";
import { generateArticleFromNews, QuotaExceededError } from "@/lib/ai";

const TARGET_COUNT = 3;

// Vercel Cron hits this route on the schedule set in vercel.json.
// Protect it with a shared secret so randoms can't trigger it / burn your API credits.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let candidates;
  try {
    candidates = await fetchNewsCandidates(20);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("News fetch failed:", message);
    return NextResponse.json({ ok: false, createdDrafts: [], error: message });
  }

  const created: string[] = [];
  const errors: string[] = [];

  // Keep trying candidates (in relevance order) until we hit the target
  // count or run out of candidates — guarantees 3 drafts most runs instead
  // of silently producing fewer whenever one candidate is a duplicate or a
  // single model call fails.
  for (const item of candidates) {
    if (created.length >= TARGET_COUNT) break;

    try {
      const existing = await prisma.post.findFirst({ where: { sourceUrl: item.link } });
      if (existing) continue;

      const generated = await generateArticleFromNews(item);
      let slug = slugify(generated.title, { lower: true, strict: true });
      const slugTaken = await prisma.post.findUnique({ where: { slug } });
      if (slugTaken) slug = `${slug}-${Date.now().toString(36)}`;

      const post = await prisma.post.create({
        data: {
          title: generated.title,
          slug,
          excerpt: generated.excerpt,
          content: generated.content,
          tags: generated.tags,
          sourceUrl: item.link,
          sourceName: item.sourceName,
          status: "draft", // stays a draft until a human reviews & publishes it
        },
      });
      created.push(post.slug);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        errors.push(`Gemini daily free quota exceeded — stop and try again later (resets ~daily). ${err.message}`);
        break;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to generate post for", item.title, message);
      errors.push(`${item.title}: ${message}`);
    }
  }

  return NextResponse.json({ ok: true, createdDrafts: created, errors, candidatesTried: candidates.length });
}
