import Parser from "rss-parser";

// Some publishers block requests with no browser-like User-Agent (403s).
const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
});

// Global tech feeds — used as a fallback / supplement to trending stories.
const FEEDS = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { name: "Wired", url: "https://www.wired.com/feed/rss" },
  { name: "Polygon (Gaming)", url: "https://www.polygon.com/rss/index.xml" },
  { name: "CoinDesk (Blockchain)", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  // Dedicated cybersecurity sources — this is the site's core focus, so it
  // needs its own reliable feeds rather than relying on general tech
  // outlets to occasionally mention security.
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
];

export type NewsItem = {
  title: string;
  link: string;
  sourceName: string;
  summary: string;
  isoDate?: string;
};

// The exact topic taxonomy the site should stay focused on (matches Medium's
// own topic categories). Every candidate story is scored against this list;
// only stories that genuinely match one of these categories are used.
const TOPIC_CATEGORIES: { name: string; keywords: string[] }[] = [
  {
    name: "artificial intelligence",
    keywords: [
      "ai", "artificial intelligence", "chatgpt", "conversational ai", "deep learning",
      "large language model", "llm", "machine learning", "nlp", "voice assistant",
      "openai", "anthropic", "gemini", "claude", "neural network",
    ],
  },
  {
    name: "blockchain",
    keywords: [
      "blockchain", "bitcoin", "cryptocurrency", "crypto", "decentralized finance",
      "defi", "ethereum", "nft", "web3",
    ],
  },
  {
    name: "data science",
    keywords: ["data science", "analytics", "data engineering", "data visualization", "database design", "database", "sql"],
  },
  {
    name: "gadgets",
    keywords: [
      "gadget", "ebook", "internet of things", "iot", "ipad", "smart home",
      "smartphone", "wearable", "laptop", "earbuds",
    ],
  },
  {
    name: "makers",
    keywords: ["3d printing", "arduino", "diy", "raspberry pi", "robotics"],
  },
  {
    name: "security",
    keywords: [
      "cybersecurity", "security", "data security", "encryption", "infosec", "password",
      "data breach", "hack", "vulnerability", "exploit", "ransomware", "malware", "phishing", "privacy",
    ],
  },
  {
    name: "tech companies",
    keywords: ["amazon", "apple", "google", "mastodon", "medium", "microsoft", "meta", "samsung", "nvidia", "tesla"],
  },
  {
    name: "design",
    keywords: ["accessibility", "design system", "design thinking", "graphic design", "icon design", "ux", "ui"],
  },
  {
    name: "product management",
    keywords: ["agile", "innovation", "kanban", "lean startup", "mvp", "product management", "roadmap"],
  },
  {
    name: "programming",
    keywords: [
      "android development", "coding", "flutter", "frontend engineering", "ios development",
      "programming", "developer", "software development",
    ],
  },
  {
    name: "programming languages",
    keywords: ["angular", "css", "html", "java", "javascript", "python", "react", "typescript"],
  },
  {
    name: "devops",
    keywords: ["aws", "databricks", "docker", "kubernetes", "terraform", "devops", "cloud"],
  },
  {
    name: "operating systems",
    keywords: ["android", "ios", "linux", "macos", "windows", "operating system"],
  },
  {
    name: "gaming",
    keywords: [
      "game design", "game development", "indie game", "metaverse", "nintendo",
      "playstation", "videogame", "video game", "virtual reality", "vr ", "xbox",
      "gaming", "esports", "steam",
    ],
  },
];

function categorize(item: NewsItem): { category: string | null; score: number } {
  const text = ` ${item.title} ${item.summary} `.toLowerCase();
  let best: string | null = null;
  let bestCount = 0;
  for (const cat of TOPIC_CATEGORIES) {
    const count = cat.keywords.filter((k) => text.includes(k)).length;
    if (count > bestCount) {
      bestCount = count;
      best = cat.name;
    }
  }
  return { category: best, score: bestCount };
}

// Hacker News front page is driven by actual user votes, so it's a much
// better "trending" signal than "latest item in an RSS feed" — a story only
// gets here because a lot of people found it genuinely interesting today.
const HN_TRENDING_SCORE_THRESHOLD = 60;

async function fetchTrendingFromHackerNews(): Promise<NewsItem[]> {
  const topIdsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!topIdsRes.ok) throw new Error(`Hacker News topstories fetch failed (${topIdsRes.status})`);
  const topIds: number[] = await topIdsRes.json();

  // Check a wider slice of the front page so there's a bigger candidate
  // pool to filter down to genuinely on-topic stories.
  const candidateIds = topIds.slice(0, 60);

  const items = await Promise.all(
    candidateIds.map(async (id) => {
      try {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    })
  );

  return items
    .filter(
      (item): item is any =>
        item &&
        item.type === "story" &&
        item.url &&
        item.title &&
        (item.score ?? 0) >= HN_TRENDING_SCORE_THRESHOLD
    )
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((item) => ({
      title: item.title,
      link: item.url,
      sourceName: "Hacker News (trending)",
      summary: `Trending on Hacker News with ${item.score} points and ${item.descendants ?? 0} comments.`,
      isoDate: item.time ? new Date(item.time * 1000).toISOString() : undefined,
    }));
}

async function fetchFromRssFeeds(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  const feedErrors: string[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const entry of parsed.items.slice(0, 8)) {
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

// Returns a large, topic-relevance-sorted, category-diversified candidate
// list — bigger than what you actually need — so the generate routes can
// keep trying the next candidate whenever one turns out to be a duplicate
// or fails to generate, and still reliably end up with a full batch.
export async function fetchNewsCandidates(poolTarget = 20): Promise<NewsItem[]> {
  const [trendingResult, rssResult] = await Promise.allSettled([
    fetchTrendingFromHackerNews(),
    fetchFromRssFeeds(),
  ]);

  const trending = trendingResult.status === "fulfilled" ? trendingResult.value : [];
  const rss = rssResult.status === "fulfilled" ? rssResult.value : [];

  if (trendingResult.status === "rejected") {
    console.error("Hacker News trending fetch failed:", trendingResult.reason);
  }

  const seen = new Set<string>();
  const all = [...trending, ...rss].filter((item) => {
    if (!item.link || !item.title || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  if (all.length === 0) {
    throw new Error(
      `Could not fetch any news items. Hacker News: ${
        trendingResult.status === "rejected" ? trendingResult.reason : "no qualifying stories"
      }. RSS: ${rssResult.status === "rejected" ? rssResult.reason : "no items"}.`
    );
  }

  // Score every item against the topic taxonomy; keep only genuine matches.
  const scored = all
    .map((item) => ({ item, ...categorize(item) }))
    .filter((x) => x.category !== null && x.score > 0);

  // Group by category so we can round-robin across topics — this is what
  // guarantees a mixed batch (e.g. an AI story AND a security story)
  // instead of 3 stories that all happen to be about the same thing.
  const byCategory = new Map<string, typeof scored>();
  for (const entry of scored) {
    const list = byCategory.get(entry.category!) ?? [];
    list.push(entry);
    byCategory.set(entry.category!, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => b.score - a.score);
  }

  const categories = Array.from(byCategory.keys());

  // Security is this site's core focus (ShaktiSecur) — always pull its
  // top 2 best-matching stories in first, ahead of the general round-robin,
  // so a batch never ends up with zero cybersecurity coverage. Kept small
  // (not the whole pool) so the rest of the batch still spans other topics.
  const diversified: NewsItem[] = [];
  const securityList = byCategory.get("security");
  if (securityList) {
    for (const entry of securityList.slice(0, 2)) {
      diversified.push(entry.item);
    }
  }

  let round = 0;
  while (diversified.length < poolTarget) {
    let addedThisRound = false;
    for (const cat of categories) {
      if (cat === "security") continue; // already front-loaded above
      const list = byCategory.get(cat)!;
      if (list[round]) {
        diversified.push(list[round].item);
        addedThisRound = true;
        if (diversified.length >= poolTarget) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  // If on-topic matches ran out, pad with the next-best (still recency/trend
  // sorted) items so there's always something to try, rather than failing.
  if (diversified.length < poolTarget) {
    const usedLinks = new Set(diversified.map((i) => i.link));
    for (const item of all) {
      if (diversified.length >= poolTarget) break;
      if (!usedLinks.has(item.link)) {
        diversified.push(item);
        usedLinks.add(item.link);
      }
    }
  }

  return diversified;
}
