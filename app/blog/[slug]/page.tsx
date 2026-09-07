import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { prisma } from "@/lib/prisma";

// Rendered fresh on every request (not cached for a fixed window) so the
// sidebar "suggested stories" genuinely change between visits, instead of
// staying the same for whoever hits the cache.
export const dynamic = "force-dynamic";

function readTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PLACEHOLDER_COLORS = ["#0f766e", "#7c3aed", "#b45309", "#0369a1", "#be123c", "#4d7c0f"];
function placeholderColor(seed: string) {
  const sum = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PLACEHOLDER_COLORS[sum % PLACEHOLDER_COLORS.length];
}

type SuggestedPost = { title: string; slug: string; coverImage: string | null; tags: string[] };

function SuggestionCard({ post }: { post: SuggestedPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="suggestion-card">
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt="" className="suggestion-thumb" />
      ) : (
        <div
          className="suggestion-thumb"
          style={{
            background: placeholderColor(post.title),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-serif), Georgia, serif",
            fontWeight: 700,
            fontSize: 24,
          }}
        >
          {post.title.trim().charAt(0).toUpperCase()}
        </div>
      )}
      <p className="suggestion-title">{post.title}</p>
      {post.tags[0] && (
        <span style={{ fontSize: 11, color: "#6b6b6b", display: "inline-block", marginTop: 6 }}>{post.tags[0]}</span>
      )}
    </Link>
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `https://shaktisecur.in/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `https://shaktisecur.in/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      tags: post.tags,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post || post.status !== "published") notFound();

  const otherPosts = await prisma.post.findMany({
    where: { status: "published", slug: { not: post.slug } },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: { title: true, slug: true, coverImage: true, tags: true },
  });
  const shuffled = shuffle(otherPosts);
  const leftSuggestions = shuffled.slice(0, 2);
  const rightSuggestions = shuffled.slice(2, 4);

  return (
    <div className="article-layout">
      <aside className="article-sidebar">
        {leftSuggestions.length > 0 && (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b6b6b", marginBottom: 16 }}>
              More stories
            </p>
            {leftSuggestions.map((p) => (
              <SuggestionCard key={p.slug} post={p} />
            ))}
          </>
        )}
      </aside>

      <article style={{ maxWidth: 680, margin: "0 auto", padding: "56px 24px" }}>
        <h1
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.2,
            margin: "0 0 16px",
          }}
        >
          {post.title}
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: 20,
            color: "#6b6b6b",
            lineHeight: 1.5,
            margin: "0 0 24px",
          }}
        >
          {post.excerpt}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 0",
            borderTop: "1px solid #e6e6e6",
            borderBottom: "1px solid #e6e6e6",
            marginBottom: 40,
            fontSize: 14,
            color: "#6b6b6b",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#242424",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontFamily: "var(--font-serif), Georgia, serif",
            }}
          >
            S
          </div>
          <div>
            <div style={{ color: "#242424", fontWeight: 500 }}>ShaktiSecur Editorial</div>
            <div>
              {post.publishedAt?.toDateString()} · {readTime(post.content)} min read
            </div>
          </div>
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt=""
            style={{
              width: "100%",
              maxHeight: 480,
              objectFit: "contain",
              background: "#f4f4f4",
              borderRadius: 4,
              marginBottom: 40,
              display: "block",
            }}
          />
        )}

        {/* content is stored as markdown, rendered here with headings, images, links, lists etc. */}
        <div
          className="post-body"
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            lineHeight: 1.8,
            fontSize: 20,
            color: "#242424",
          }}
        >
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  {...props}
                  style={{ width: "100%", borderRadius: 4, margin: "32px 0" }}
                  alt={props.alt ?? ""}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2 style={{ fontSize: 28, marginTop: 40, marginBottom: 16, fontWeight: 700 }} {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 style={{ fontSize: 22, marginTop: 32, marginBottom: 12, fontWeight: 700 }} {...props} />
              ),
              p: ({ node, ...props }) => <p style={{ margin: "0 0 20px" }} {...props} />,
              a: ({ node, ...props }) => <a style={{ color: "#242424" }} {...props} />,
              ul: ({ node, ...props }) => <ul style={{ margin: "0 0 20px", paddingLeft: 24 }} {...props} />,
              ol: ({ node, ...props }) => <ol style={{ margin: "0 0 20px", paddingLeft: 24 }} {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote
                  style={{ borderLeft: "3px solid #242424", paddingLeft: 20, margin: "24px 0", color: "#555", fontStyle: "italic" }}
                  {...props}
                />
              ),
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {post.sourceUrl && (
          <p style={{ marginTop: 48, fontSize: 14, color: "#6b6b6b", borderTop: "1px solid #e6e6e6", paddingTop: 24 }}>
            Reported using information from{" "}
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#242424" }}>
              {post.sourceName ?? "the original source"}
            </a>
            .
          </p>
        )}

        {/* Mobile/tablet: suggestions appear at the end instead of a sidebar */}
        {shuffled.length > 0 && (
          <div className="mobile-suggestions">
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#6b6b6b", marginBottom: 20 }}>
              More stories
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24 }}>
              {shuffled.slice(0, 3).map((p) => (
                <SuggestionCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        )}
      </article>

      <aside className="article-sidebar">
        {rightSuggestions.length > 0 && (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#6b6b6b", marginBottom: 16 }}>
              More stories
            </p>
            {rightSuggestions.map((p) => (
              <SuggestionCard key={p.slug} post={p} />
            ))}
          </>
        )}
      </aside>
    </div>
  );
}
