import { NewsItem } from "./news";

export type GeneratedPost = {
  title: string;
  excerpt: string;
  content: string; // markdown
  tags: string[];
};

export type GenerationUsage = {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
};

export type GenerationResult = {
  post: GeneratedPost;
  usage: GenerationUsage;
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
}
IMPORTANT: inside the "content" string, every line break MUST be written as the
two characters \\n (backslash-n) — never a raw/literal newline — or the JSON will
be invalid.`;

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

export const MODEL_NAME = MODEL;

export async function generateArticleFromNews(item: NewsItem): Promise<GenerationResult> {
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
        // Forces the model into constrained/structured generation matching
        // this exact shape — this is what actually fixes malformed JSON
        // (stray unescaped quotes, raw newlines, etc.) at the source, rather
        // than trying to repair broken text after the fact.
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            excerpt: { type: "STRING" },
            content: { type: "STRING" },
            tags: { type: "ARRAY", items: { type: "STRING" } },
          },
          required: ["title", "excerpt", "content", "tags"],
        },
        maxOutputTokens: 16384,
        // gemini-3.x models use "thinkingLevel" (not the older "thinkingBudget"
        // field from Gemini 2.5) — sending the wrong field name causes a 400
        // INVALID_ARGUMENT. "minimal" keeps as much of the token budget as
        // possible for the actual article instead of internal reasoning.
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
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

  const usage: GenerationUsage = {
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    candidatesTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
  };

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
    // Long articles occasionally come back with raw (unescaped) newlines
    // inside a JSON string value, which breaks JSON.parse even though the
    // response itself is complete. Repair those before giving up.
    try {
      parsed = JSON.parse(escapeRawNewlinesInStrings(cleaned));
    } catch (e2) {
      throw new Error(`Could not parse Gemini's JSON response: ${cleaned.slice(0, 300)}`);
    }
  }

  if (!parsed.title || !parsed.content) {
    throw new Error(`Gemini response missing required fields: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  return { post: parsed, usage };
}

// Walks the raw text tracking whether we're inside a JSON string literal,
// and escapes any literal newline/carriage-return/tab characters found
// there (which are illegal inside a JSON string but sometimes slip through
// from the model's output on long multi-paragraph content).
function escapeRawNewlinesInStrings(raw: string): string {
  let result = "";
  let inString = false;
  let escapedNext = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escapedNext) {
      result += ch;
      escapedNext = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      escapedNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && ch === "\n") {
      result += "\\n";
      continue;
    }
    if (inString && ch === "\r") {
      result += "\\r";
      continue;
    }
    if (inString && ch === "\t") {
      result += "\\t";
      continue;
    }

    result += ch;
  }

  return result;
}
