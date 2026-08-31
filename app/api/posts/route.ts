import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(posts);
}

// Create a post manually — used by the "New Post" composer in /admin.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const coverImage = typeof body.coverImage === "string" && body.coverImage.trim() ? body.coverImage.trim() : null;
  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.map((t: string) => t.trim()).filter(Boolean)
    : [];
  const status = body.status === "published" ? "published" : "draft";

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  let slug = slugify(title, { lower: true, strict: true });

  // Ensure slug uniqueness — append a short suffix if it's already taken.
  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      tags,
      status,
      publishedAt: status === "published" ? new Date() : null,
    },
  });

  if (status === "published") {
    revalidatePath("/");
    revalidatePath(`/blog/${post.slug}`);
  }

  return NextResponse.json(post);
}
