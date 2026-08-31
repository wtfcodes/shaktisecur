import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

function readTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function Avatar({ letter }: { letter: string }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#242424",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

// Small decorative icons matching the Medium-style card footer.
// These are visual only (no fabricated engagement numbers).
function ClapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 9.5l-2-3a1.2 1.2 0 0 0-2 1.3l2.7 4.6M11 8l-2.3-4a1.2 1.2 0 0 0-2 1.2L9 9.8M13.5 7.7l-1.8-3.4a1.2 1.2 0 0 0-2.1 1.1l2 4M16 8.2l-1.2-2.4a1.1 1.1 0 0 0-2 1l2.3 5.3s1.8 4-1 7c-2.5 2.6-6.7 2-9-.6-1.5-1.7-3-4-3-4" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 20,
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 64px" }}>
      {posts.length === 0 && (
        <p style={{ color: "#6b6b6b" }}>
          No posts published yet — run the generator, review a draft, and publish it.
        </p>
      )}

      <div>
        {posts.map((post, i) => (
          <article
            key={post.id}
            style={{
              padding: "28px 0",
              borderBottom: i === posts.length - 1 ? "none" : "1px solid #ececec",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Avatar letter="S" />
              <span style={{ fontSize: 13, color: "#242424", fontWeight: 500 }}>
                {post.sourceName ?? "ShaktiSecur Editorial"}
              </span>
              <span style={{ fontSize: 13, color: "#6b6b6b" }}>
                · {post.publishedAt ? new Date(post.publishedAt).toDateString().slice(4) : ""}
              </span>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h2
                    style={{
                      fontFamily: "var(--font-sans), -apple-system, sans-serif",
                      fontWeight: 800,
                      fontSize: 21,
                      lineHeight: 1.3,
                      margin: "0 0 6px",
                      letterSpacing: "-0.3px",
                    }}
                  >
                    {post.title}
                  </h2>
                </Link>
                <p
                  style={{
                    fontSize: 15,
                    color: "#6b6b6b",
                    lineHeight: 1.5,
                    margin: "0 0 12px",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.excerpt}
                </p>
              </div>
              {post.coverImage && (
                <Link href={`/blog/${post.slug}`} style={{ flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverImage}
                    alt=""
                    className="feed-thumb"
                    style={{ objectFit: "cover", borderRadius: 4, display: "block" }}
                  />
                </Link>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#6b6b6b" }}>
              {post.tags[0] && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    background: "#f2f2f2",
                    borderRadius: 12,
                  }}
                >
                  {post.tags[0]}
                </span>
              )}
              <span style={{ fontSize: 13 }}>{readTime(post.content)} min read</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
                <ClapIcon />
                <BookmarkIcon />
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
