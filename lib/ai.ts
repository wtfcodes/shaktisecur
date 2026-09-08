import { NewsItem } from "./news";

export type GeneratedPost = {
  title: string;
  excerpt: string;
  content: string; // markdown
  tags: string[];
};

const SYSTEM_PROMPT = `You are a technology journalist writing for a daily tech-news blog covering
genuinely trending, high-interest stories in technology, AI, software, and cybersecurity.

Given a raw news summary, write a genuinely useful, ORIGINAL, IN-DEPTH article — not a copy or
close paraphrase of the source. Add context, background, explain why it matters, and note open
questions or implications.

Write a LONG, substantial article: aim for 1200-1800 words. Use multiple ## subheadings to break
up the piece into clear sections (e.g. background, what changed, why it matters, what's next).
Do not write a short summary — go deep, add analysis, and elaborate on each point.

Never copy sentences verbatim from the summary provided. Always write your own analysis.

The FIRST tag must be the single best-fitting category from this exact list (pick the one
closest match, even if imperfect):
artificial intelligence, data science, gadgets, security, tech companies,
programming, devops, gaming
Then add 2-4 more specific lowercase tags after it (e.g. the product/company name, a more
precise topic).

Respond ONLY with valid JSON, no markdown fences, in this exact shape:
{
  "title": "string, under 70 characters, no clickbait",
  "excerpt": "string, 1-2 sentences, under 160 characters",
  "content": "string, full LONG article body in markdown, with multiple ## subheadings",
  "tags": ["category tag first (from the list above), then 2-4 more specific tags"]
}`;

// Calling the Gemini REST API directly (instead of the @google/generative-ai
// SDK) avoids SDK-version/model-name mismatches — this always talks to
// whatever the current API version supports.
// gemini-2.0-flash has a much more generous free tier (~1500 requests/day)
// than the newer preview models, which sometimes ship with a tiny free quota.
const MODEL = "gemini-3.6-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Thrown specifically for HTTP 429 / RESOURCE_EXHAUSTED so callers can stop
// retrying immediately instead of burning through every remaining candidate
// (they'll all fail the same way until the quota window resets).
export class QuotaExceededError extends Error {}

export async function generateArticleFromNews(item: NewsItem): Promise<GeneratedPost> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const userPrompt = `Source headline: ${item.title}
Source outlet: ${item.sourceName}
Source summary: ${item.summary}
Source link (for your context only, do not quote it verbatim): ${item.link}

Write the original, long-form article now (1200-1800 words).`;

  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 429 || errBody.includes("RESOURCE_EXHAUSTED")) {
      throw new QuotaExceededError(`Gemini quota exceeded (429): ${errBody.slice(0, 300)}`);
    }
    throw new Error(`Gemini API error (${res.status}): ${errBody.slice(0, 500)}`);
  }

  const data = await res.json();

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error(`Gemini returned no candidates. Full response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini stopped early with reason: ${candidate.finishReason}`);
  }

  const text = candidate.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini response had no text. Full response: ${JSON.stringify(data).slice(0, 500)}`);
  }

  let cleaned = text.replace(/```json|```/g, "").trim();

  // Defensive: if the model wrapped the JSON in extra prose despite
  // instructions, pull out just the {...} block.
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  let parsed: GeneratedPost;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Could not parse Gemini's JSON response: ${cleaned.slice(0, 300)}`);
  }

  if (!parsed.title || !parsed.content) {
    throw new Error(`Gemini response missing required fields: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return parsed;
}
