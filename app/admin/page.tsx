"use client";

import { useEffect, useRef, useState } from "react";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  tags: string[];
  coverImage: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
};

const BLANK_POST: Post = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "draft",
  tags: [],
  coverImage: null,
  sourceName: null,
  sourceUrl: null,
  createdAt: "",
  publishedAt: null,
};

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInline, setUploadingInline] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const inlineFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_secret") : null;
    if (saved) {
      setSecret(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (unlocked) loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) throw new Error("Wrong key or server error");
      const data = await res.json();
      setPosts(data);
    } catch (e) {
      setError("Could not load posts. Check your admin key.");
      setUnlocked(false);
      localStorage.removeItem("admin_secret");
    } finally {
      setLoading(false);
    }
  }

  function tryUnlock() {
    if (!secret.trim()) return;
    localStorage.setItem("admin_secret", secret);
    setUnlocked(true);
  }

  function openNewPost() {
    setSelected({ ...BLANK_POST });
    setTagsInput("");
    setIsNew(true);
    setError("");
  }

  function openExisting(post: Post) {
    setSelected(post);
    setTagsInput(post.tags.join(", "));
    setIsNew(false);
    setError("");
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  }

  async function handleCoverFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploadingCover(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setSelected({ ...selected, coverImage: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover image upload failed.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleInlineFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploadingInline(true);
    setError("");
    try {
      const url = await uploadImage(file);
      const markdown = `\n\n![${file.name.replace(/\.[^/.]+$/, "")}](${url})\n\n`;
      const textarea = contentRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? selected.content.length;
        const end = textarea.selectionEnd ?? selected.content.length;
        const newContent = selected.content.slice(0, start) + markdown + selected.content.slice(end);
        setSelected({ ...selected, content: newContent });
        // Restore focus/cursor after the inserted image, on next tick
        requestAnimationFrame(() => {
          textarea.focus();
          const pos = start + markdown.length;
          textarea.setSelectionRange(pos, pos);
        });
      } else {
        setSelected({ ...selected, content: selected.content + markdown });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingInline(false);
      e.target.value = "";
    }
  }

  async function saveSelected(status?: "draft" | "published") {
    if (!selected) return;
    if (!selected.title.trim() || !selected.content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      if (isNew) {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: selected.title,
            excerpt: selected.excerpt,
            content: selected.content,
            coverImage: selected.coverImage,
            tags,
            status: status ?? "draft",
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      } else {
        const res = await fetch(`/api/posts/${selected.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: selected.title,
            excerpt: selected.excerpt,
            content: selected.content,
            coverImage: selected.coverImage,
            tags,
            ...(status ? { status } : {}),
          }),
        });
        if (!res.ok) throw new Error("Save failed");
      }
      await loadPosts();
      setSelected(null);
    } catch (e) {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected || isNew) return;
    if (!confirm(`Delete "${selected.title}"? This can't be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadPosts();
      setSelected(null);
    } catch (e) {
      setError("Could not delete. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function generateNow() {
    setGenerating(true);
    setGenerateMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      let msg =
        data.createdDrafts.length > 0
          ? `Created ${data.createdDrafts.length} new draft(s).`
          : "No new drafts created.";
      if (data.errors && data.errors.length > 0) {
        msg += ` Failed on: ${data.errors.join(", ")}. Check Vercel function logs for the exact error.`;
      }
      setGenerateMsg(msg);
      await loadPosts();
    } catch (e) {
      setError("Could not generate. Check your Gemini API key is set correctly.");
    } finally {
      setGenerating(false);
    }
  }

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 24px" }}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>Admin access</h1>
        <p style={{ fontSize: 14, color: "#6b6b6b", marginBottom: 16 }}>
          Enter your ADMIN_SECRET (the same value set in your Vercel environment variables).
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
          placeholder="Admin key"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
        />
        <button onClick={tryUnlock} style={{ width: "100%", padding: "10px", fontSize: 14, cursor: "pointer" }}>
          Unlock
        </button>
        {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
        <button
          onClick={() => setSelected(null)}
          style={{ marginBottom: 20, fontSize: 13, cursor: "pointer", background: "none", border: "none", color: "#6b6b6b", padding: 0 }}
        >
          ← Back to list
        </button>

        <h2 style={{ fontSize: 16, color: "#6b6b6b", marginBottom: 16, fontWeight: 400 }}>
          {isNew ? "New post" : "Edit post"}
        </h2>

        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>Title</label>
        <input
          value={selected.title}
          onChange={(e) => setSelected({ ...selected, title: e.target.value })}
          placeholder="Post title"
          style={{ width: "100%", padding: "10px 12px", fontSize: 18, marginBottom: 16, boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>Cover image</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <input ref={coverFileRef} type="file" accept="image/*" onChange={handleCoverFileChosen} style={{ display: "none" }} />
          <button
            type="button"
            disabled={uploadingCover}
            onClick={() => coverFileRef.current?.click()}
            style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13 }}
          >
            {uploadingCover ? "Uploading…" : "Choose image"}
          </button>
          {selected.coverImage && (
            <button
              type="button"
              onClick={() => setSelected({ ...selected, coverImage: null })}
              style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#c0392b" }}
            >
              Remove
            </button>
          )}
        </div>
        {selected.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.coverImage}
            alt="Cover preview"
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "contain",
              background: "#f4f4f4",
              borderRadius: 4,
              marginBottom: 16,
            }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}

        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>Excerpt</label>
        <textarea
          value={selected.excerpt}
          onChange={(e) => setSelected({ ...selected, excerpt: e.target.value })}
          rows={2}
          placeholder="A short 1-2 sentence summary shown on the homepage"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <label style={{ fontSize: 12, color: "#6b6b6b" }}>Content (markdown)</label>
          <div>
            <input
              ref={inlineFileRef}
              type="file"
              accept="image/*"
              onChange={handleInlineFileChosen}
              style={{ display: "none" }}
            />
            <button
              type="button"
              disabled={uploadingInline}
              onClick={() => inlineFileRef.current?.click()}
              style={{ padding: "5px 10px", cursor: "pointer", fontSize: 12 }}
            >
              {uploadingInline ? "Uploading…" : "📷 Insert image here"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          Click in the text below where you want an image, then hit "Insert image here" — it drops in at your cursor.
        </p>
        <textarea
          ref={contentRef}
          value={selected.content}
          onChange={(e) => setSelected({ ...selected, content: e.target.value })}
          rows={26}
          placeholder="Write your post here... it can be as long as you like."
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 16, boxSizing: "border-box", fontFamily: "monospace", lineHeight: 1.6 }}
        />

        <label style={{ fontSize: 12, color: "#6b6b6b", display: "block", marginBottom: 4 }}>
          Tags (comma-separated)
        </label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="security, ai, tutorial"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
        />

        {selected.sourceUrl && (
          <p style={{ fontSize: 12, color: "#6b6b6b", marginBottom: 16 }}>
            Source: <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.sourceName}</a>
          </p>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button disabled={saving} onClick={() => saveSelected()} style={{ padding: "10px 16px", cursor: "pointer" }}>
            Save draft
          </button>
          {selected.status === "draft" ? (
            <button
              disabled={saving}
              onClick={() => saveSelected("published")}
              style={{ padding: "10px 16px", cursor: "pointer", background: "#242424", color: "#fff", border: "none" }}
            >
              Publish
            </button>
          ) : (
            <button disabled={saving} onClick={() => saveSelected("draft")} style={{ padding: "10px 16px", cursor: "pointer" }}>
              Unpublish
            </button>
          )}
          {!isNew && (
            <button
              disabled={saving}
              onClick={deleteSelected}
              style={{ padding: "10px 16px", cursor: "pointer", color: "#c0392b", marginLeft: "auto" }}
            >
              Delete
            </button>
          )}
        </div>
        {error && <p style={{ color: "#c0392b", fontSize: 13, marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Admin — all posts</h1>
        <button
          onClick={openNewPost}
          style={{
            marginLeft: "auto",
            fontSize: 13,
            cursor: "pointer",
            padding: "8px 14px",
            background: "#fff",
            color: "#242424",
            border: "1px solid #242424",
            borderRadius: 4,
          }}
        >
          + New Post
        </button>
        <button
          onClick={generateNow}
          disabled={generating}
          style={{
            fontSize: 13,
            cursor: "pointer",
            padding: "8px 14px",
            background: "#242424",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          {generating ? "Generating…" : "Generate Now (AI)"}
        </button>
        <button
          onClick={loadPosts}
          style={{ fontSize: 13, cursor: "pointer", padding: "6px 12px" }}
        >
          Refresh
        </button>
      </div>

      {generateMsg && <p style={{ color: "#1e7d3c", fontSize: 13, marginBottom: 12 }}>{generateMsg}</p>}

      {loading && <p style={{ color: "#6b6b6b" }}>Loading…</p>}
      {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
      {!loading && posts.length === 0 && (
        <p style={{ color: "#6b6b6b" }}>No posts yet. Write one with "New Post" or run the AI generator.</p>
      )}

      <div>
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => openExisting(post)}
            style={{
              padding: "16px 0",
              borderBottom: "1px solid #e6e6e6",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {post.title}
              </div>
              <div style={{ fontSize: 12, color: "#6b6b6b" }}>
                {new Date(post.createdAt).toDateString()} · {post.sourceName ?? "manual"}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 12,
                background: post.status === "published" ? "#e4f5e9" : "#f2f2f2",
                color: post.status === "published" ? "#1e7d3c" : "#6b6b6b",
                flexShrink: 0,
              }}
            >
              {post.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
