import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function checkAdmin(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.ADMIN_SECRET}`;
}

// GET a single post (draft or published) — for your review UI
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

// PATCH — edit content and/or flip status to "published"
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.excerpt === "string") data.excerpt = body.excerpt;
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.coverImage === "string") data.coverImage = body.coverImage;
  if (Array.isArray(body.tags)) data.tags = body.tags;

  if (body.status === "published") {
    data.status = "published";
    data.publishedAt = new Date();
  } else if (body.status === "draft") {
    data.status = "draft";
    data.publishedAt = null;
  }

  const post = await prisma.post.update({ where: { id: params.id }, data });

  // Instantly bust the cached homepage and this post's page, instead of
  // waiting up to 5 minutes for the normal revalidate window.
  revalidatePath("/");
  revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  await prisma.post.delete({ where: { id: params.id } });

  revalidatePath("/");
  if (post) revalidatePath(`/blog/${post.slug}`);

  return NextResponse.json({ ok: true });
}
