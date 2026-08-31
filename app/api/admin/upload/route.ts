import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Handles image uploads from the admin composer — used for both the cover
// image and images inserted inline into the post body. Files land in Vercel
// Blob storage (needs the BLOB_READ_WRITE_TOKEN env var — Vercel adds this
// automatically once you create a Blob store and connect it to the project).
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const MAX_SIZE = 8 * 1024 * 1024; // 8MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 });
  }

  try {
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const blob = await put(filename, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Upload failed: ${message}. Make sure a Vercel Blob store is connected to this project.` },
      { status: 500 }
    );
  }
}
