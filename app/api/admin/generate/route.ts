import { NextRequest, NextResponse } from "next/server";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";
import { fetchLatestTechNews } from "@/lib/news";
import { generateArticleFromNews } from "@/lib/ai";

// Same generation logic as the cron route, but protected by ADMIN_SECRET
// (the one you already use to unlock /admin) instead of CRON_SECRET.
// Lets you trigger generation manually from the admin panel — no curl needed.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let news;
  try {
    news = await fetchLatestTechNews(3);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, createdDrafts: [], errors: [`News fetch failed: ${message}`] }, { status: 200 });
  }

  const created: string[] = [];
  const errors: string[] = [];

  for (const item of news) {
    try {
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
          status: "draft",
        },
      });
      created.push(post.slug);
    } catch (err) {
      console.error("Failed to generate post for", item.title, err);
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${item.title}: ${message}`);
    }
  }

  return NextResponse.json({ ok: true, createdDrafts: created, errors });
}
