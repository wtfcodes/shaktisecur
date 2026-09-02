import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await prisma.post.findMany({
    where: { status: "published" },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `https://shaktisecur.in/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    { url: "https://shaktisecur.in", changeFrequency: "daily", priority: 1 },
    { url: "https://shaktisecur.in/about", changeFrequency: "monthly", priority: 0.5 },
    { url: "https://shaktisecur.in/contact", changeFrequency: "monthly", priority: 0.3 },
    { url: "https://shaktisecur.in/privacy", changeFrequency: "yearly", priority: 0.2 },
    { url: "https://shaktisecur.in/disclaimer", changeFrequency: "yearly", priority: 0.2 },
  ];

  return [...staticEntries, ...postEntries];
}
