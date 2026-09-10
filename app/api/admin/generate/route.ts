import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { fetchNewsCandidates } from "@/lib/news";
import { generateArticleFromNews, QuotaExceededError } from "@/lib/ai";

const TARGET_COUNT = 3;

// Same generation logic as the cron route, but protected by ADMIN_SECRET
// (the one you already use to unlock /admin) instead of CRON_SECRET.
// Lets you trigger generation manually from the admin panel — no curl needed.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let candidates;
  try {
    candidates = await fetchNewsCandidates(20);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, createdDrafts: [], errors: [`News fetch failed: ${message}`] }, { status: 200 });
  }

  const created: string[] = [];
  const errors: string[] = [];

  // Keep trying candidates (in relevance order) until we hit the target
  // count or run out — this is what guarantees 3 drafts most runs, instead
  // of silently producing fewer whenever one candidate is a duplicate or
  // the model call fails.
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
          status: "draft",
        },
      });
      created.push(post.slug);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        // Every remaining candidate will fail the same way until the daily
        // quota resets — stop immediately instead of burning through the
        // whole candidate list with repeated 429s.
        errors.push(`Gemini daily free quota exceeded — stop and try again later (resets ~daily). ${err.message}`);
        break;
      }
      console.error("Failed to generate post for", item.title, err);
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${item.title}: ${message}`);
    }
  }

  return NextResponse.json({ ok: true, createdDrafts: created, errors, candidatesTried: candidates.length });
}
