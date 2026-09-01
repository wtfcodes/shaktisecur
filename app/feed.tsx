"use client";

import { useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage: string | null;
  sourceName: string | null;
  publishedAt: string | null;
};

function readTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const PLACEHOLDER_COLORS = ["#0f766e", "#7c3aed", "#b45309", "#0369a1", "#be123c", "#4d7c0f"];

function placeholderColor(seed: string) {
  const sum = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return PLACEHOLDER_COLORS[sum % PLACEHOLDER_COLORS.length];
}

function Thumb({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="feed-thumb-link" style={{ flexShrink: 0 }}>
      {post.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage}
          alt=""
          className="feed-thumb"
          style={{ objectFit: "cover", borderRadius: 4, display: "block" }}
        />
      ) : (
        <div
          className="feed-thumb"
          style={{
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: placeholderColor(post.title || post.id),
            color: "#fff",
            fontFamily: "var(--font-serif), Georgia, serif",
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          {(post.title || "S").trim().charAt(0).toUpperCase()}
        </div>
      )}
    </Link>
  );
}
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

function PostCard({ post, isLast }: { post: Post; isLast: boolean }) {
  return (
    <article
      className="feed-card"
      style={{
        padding: "28px 0",
        borderBottom: isLast ? "none" : "1px solid #ececec",
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

      <div className="feed-card-inner" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <Thumb post={post} />
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
  );
}

export default function Feed({ initialPosts, initialTotal }: { initialPosts: Post[]; initialTotal: number }) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const hasMore = total > posts.length;

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/posts?skip=${posts.length}&take=8`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setTotal(data.total);
    } catch (e) {
      // silently fail — the button just stays visible so they can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="feed-list">
        {posts.map((post, i) => (
          <PostCard key={post.id} post={post} isLast={i === posts.length - 1} />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              display: "inline-block",
              padding: "12px 28px",
              borderRadius: 24,
              border: "1px solid #242424",
              background: "#fff",
              color: "#242424",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Loading…" : "See more recommended stories"}
          </button>
        </div>
      )}
    </>
  );
}
