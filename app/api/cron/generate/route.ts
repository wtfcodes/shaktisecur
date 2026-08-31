import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { fetchLatestTechNews } from "@/lib/news";
import { generateArticleFromNews } from "@/lib/ai";

// Vercel Cron hits this route on the schedule set in vercel.json.
// Protect it with a shared secret so randoms can't trigger it / burn your API credits.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let news;
  try {
    news = await fetchLatestTechNews(3); // 3 drafts per run — tune as you like
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("News fetch failed:", message);
    return NextResponse.json({ ok: false, createdDrafts: [], error: message });
  }
  const created = [];
  const errors: string[] = [];

  for (const item of news) {
    try {
      // Skip if we've already made a post from this exact source link
      const existing = await prisma.post.findFirst({ where: { sourceUrl: item.link } });
      if (existing) continue;

      const generated = await generateArticleFromNews(item);
      const slug = slugify(generated.title, { lower: true, strict: true });

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
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to generate post for", item.title, message);
      errors.push(`${item.title}: ${message}`);
    }
  }

  return NextResponse.json({ ok: true, createdDrafts: created, errors });
}
