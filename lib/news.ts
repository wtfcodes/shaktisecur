import Parser from "rss-parser";

// Some publishers block requests with no browser-like User-Agent (403s).
const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
});

// Global tech feeds — used as a fallback / supplement to trending stories.
// A mix of general tech, gaming, and crypto/blockchain sources so coverage
// spans the topic categories on the /topics page (AI, security, gadgets,
// gaming, blockchain, etc.) instead of being narrowly focused.
const FEEDS = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "Polygon (Gaming)", url: "https://www.polygon.com/rss/index.xml" },
  { name: "CoinDesk (Blockchain)", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
];

export type NewsItem = {
  title: string;
  link: string;
  sourceName: string;
  summary: string;
  isoDate?: string;
};

// Hacker News front page is driven by actual user votes, so it's a much
// better "trending" signal than "latest item in an RSS feed" — a story only
// gets here because a lot of people found it genuinely interesting today.
const HN_TRENDING_SCORE_THRESHOLD = 80;

async function fetchTrendingFromHackerNews(limit: number): Promise<NewsItem[]> {
  const topIdsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!topIdsRes.ok) throw new Error(`Hacker News topstories fetch failed (${topIdsRes.status})`);
  const topIds: number[] = await topIdsRes.json();

  // Only look at the first ~30 (front page) — checking further down the
  // list stops being "trending" and starts being "everything".
  const candidateIds = topIds.slice(0, 30);

  const items = await Promise.all(
    candidateIds.map(async (id) => {
      try {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (!res.ok) return null;
        const item = await res.json();
        return item;
      } catch {
        return null;
      }
    })
  );

  const trending: NewsItem[] = items
    .filter(
      (item): item is any =>
        item &&
        item.type === "story" &&
        item.url && // skip "Ask HN" / text-only posts with no external link
        item.title &&
        (item.score ?? 0) >= HN_TRENDING_SCORE_THRESHOLD
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit)
    .map((item) => ({
      title: item.title,
      link: item.url,
      sourceName: "Hacker News (trending)",
      summary: `Trending on Hacker News with ${item.score} points and ${item.descendants ?? 0} comments.`,
      isoDate: item.time ? new Date(item.time * 1000).toISOString() : undefined,
    }));

  return trending;
}

async function fetchFromRssFeeds(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const feedErrors: string[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const entry of parsed.items.slice(0, 3)) {
        items.push({
          title: entry.title ?? "",
          link: entry.link ?? "",
          sourceName: feed.name,
          summary: entry.contentSnippet ?? entry.content ?? "",
          isoDate: entry.isoDate,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to fetch feed ${feed.name}:`, message);
      feedErrors.push(`${feed.name}: ${message}`);
    }
  }

  if (items.length === 0 && feedErrors.length > 0) {
    console.error(`All RSS feeds failed: ${feedErrors.join(" | ")}`);
  }

  items.sort((a, b) => new Date(b.isoDate ?? 0).getTime() - new Date(a.isoDate ?? 0).getTime());
  return items;
}

export async function fetchLatestTechNews(limit = 5): Promise<NewsItem[]> {
  // Fetch both pools in parallel — Hacker News for genuinely trending
  // (vote-driven) stories, and RSS feeds for broader day-to-day tech news
  // coverage. Combining both means we're not limited to just what's
  // trending on HN specifically.
  const [trendingResult, rssResult] = await Promise.allSettled([
    fetchTrendingFromHackerNews(limit),
    fetchFromRssFeeds(),
  ]);

  const trending = trendingResult.status === "fulfilled" ? trendingResult.value : [];
  const rss = rssResult.status === "fulfilled" ? rssResult.value : [];

  if (trendingResult.status === "rejected") {
    console.error("Hacker News trending fetch failed:", trendingResult.reason);
  }

  // De-dupe by link, in case the same story shows up in both pools.
  const seen = new Set<string>();
  const dedupe = (items: NewsItem[]) =>
    items.filter((item) => {
      if (!item.link || seen.has(item.link)) return false;
      seen.add(item.link);
      return true;
    });

  const trendingUnique = dedupe(trending);
  const rssUnique = dedupe(rss);

  // Interleave the two pools so the result is a genuine mix of trending
  // picks and broader RSS coverage, rather than one pool dominating.
  const result: NewsItem[] = [];
  let ti = 0;
  let ri = 0;
  while (result.length < limit && (ti < trendingUnique.length || ri < rssUnique.length)) {
    if (ti < trendingUnique.length) result.push(trendingUnique[ti++]);
    if (result.length >= limit) break;
    if (ri < rssUnique.length) result.push(rssUnique[ri++]);
  }

  if (result.length === 0) {
    throw new Error(
      `Could not fetch any news items. Hacker News: ${
        trendingResult.status === "rejected" ? trendingResult.reason : "no qualifying stories"
      }. RSS: ${rssResult.status === "rejected" ? rssResult.reason : "no items"}.`
    );
  }

  return result;
}
