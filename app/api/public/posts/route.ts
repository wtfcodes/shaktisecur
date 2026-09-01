import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Only ever returns published posts — this is a public, unauthenticated
// endpoint used by the homepage's client-side "See more" button.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10) || 0);
  const take = Math.min(24, Math.max(1, parseInt(searchParams.get("take") ?? "8", 10) || 8));

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      skip,
      take,
    }),
    prisma.post.count({ where: { status: "published" } }),
  ]);

  return NextResponse.json({ posts, total });
}
