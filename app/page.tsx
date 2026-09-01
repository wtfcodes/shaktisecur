import { prisma } from "@/lib/prisma";
import Feed from "./Feed";

export const revalidate = 300;

const PAGE_SIZE = 8;

export default async function HomePage() {
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where: { status: "published" } }),
  ]);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" }}>
      {posts.length === 0 && (
        <p style={{ color: "#6b6b6b" }}>
          No posts published yet — run the generator, review a draft, and publish it.
        </p>
      )}

      <Feed
        initialPosts={JSON.parse(JSON.stringify(posts))}
        initialTotal={total}
      />
    </div>
  );
}
