import { env } from "../config/env.js";
import { cacheClient } from "../lib/redis.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/** Fallback order: Gemini → Anthropic → OpenAI (only providers with keys are tried). */
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const OPENAI_MODEL = "gpt-4o-mini";

export function getGeminiIntegrationStatus() {
  return {
    configured: Boolean(env.geminiApiKey),
    missing: env.geminiApiKey ? [] : ["GEMINI_API_KEY"]
  };
}

export function getAnthropicIntegrationStatus() {
  return {
    configured: Boolean(env.anthropicApiKey),
    missing: env.anthropicApiKey ? [] : ["ANTHROPIC_API_KEY"]
  };
}

export function getOpenaiIntegrationStatus() {
  return {
    configured: Boolean(env.openaiApiKey),
    missing: env.openaiApiKey ? [] : ["OPENAI_API_KEY"]
  };
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = env.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${err}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  return data.candidates[0]?.content?.parts[0]?.text ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = env.anthropicApiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} — ${err}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("") ?? "";
  return text;
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = env.openaiApiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} — ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message?: { content?: string | null } }>;
  };

  return data.choices[0]?.message?.content ?? "";
}

/** Strip markdown code fences that LLMs sometimes wrap HTML in despite instructions. */
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:html|markdown|xml|)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

async function generateLlmText(prompt: string): Promise<string> {
  const attempts: string[] = [];

  const run = async (label: string, fn: () => Promise<string>): Promise<string | null> => {
    try {
      const raw = (await fn()).trim();
      const text = stripCodeFences(raw);
      if (text) return text;
      attempts.push(`${label}: empty response`);
    } catch (e) {
      attempts.push(`${label}: ${String(e)}`);
    }
    return null;
  };

  if (env.geminiApiKey) {
    const out = await run("gemini", () => callGemini(prompt));
    if (out) return out;
  }

  if (env.anthropicApiKey) {
    const out = await run("anthropic", () => callAnthropic(prompt));
    if (out) return out;
  }

  if (env.openaiApiKey) {
    const out = await run("openai", () => callOpenAI(prompt));
    if (out) return out;
  }

  if (!env.geminiApiKey && !env.anthropicApiKey && !env.openaiApiKey) {
    throw new Error(
      "No LLM API keys configured. Set at least one of GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY"
    );
  }

  throw new Error(`All configured LLM providers failed:\n${attempts.join("\n")}`);
}

export type GeneratedPost = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  content: string;
};

// ─── Product Review ────────────────────────────────────────────────────────────

export async function generateProductReview(product: {
  name: string;
  category: string;
  price: number;
  rating: number;
  features: string[];
  pros: string[];
  cons: string[];
  affiliateUrl: string;
}): Promise<GeneratedPost> {
  const cacheKey = `gemini:review:${product.name}`;
  const cached = await cacheClient.get(cacheKey);
  if (cached) return JSON.parse(cached) as GeneratedPost;

  const prompt = `You are an expert Amazon affiliate content writer for Indian audiences.

Write a detailed, SEO-optimized product review article for:
- Product: ${product.name}
- Category: ${product.category}
- Price: ₹${product.price}
- Rating: ${product.rating}/5
- Key Features: ${product.features.join(", ")}
- Pros: ${product.pros.join(", ")}
- Cons: ${product.cons.join(", ")}
- Buy Link: ${product.affiliateUrl}

Structure the article in valid HTML with these sections:
<h2>Introduction</h2>
<h2>Key Features</h2>
<h2>Pros and Cons</h2>
<h2>Who Should Buy This?</h2>
<h2>Price and Value</h2>
<h2>Our Verdict</h2>

Rules:
- Use Indian context (₹ for prices, mention Indian buyers)
- Include a CTA button HTML: <a href="${product.affiliateUrl}" class="cta-btn" target="_blank" rel="nofollow sponsored">Buy on Amazon India</a>
- Include Amazon affiliate disclaimer at end
- 800-1000 words total
- Return ONLY the HTML content, no markdown code blocks`;

  const content = await generateLlmText(prompt);
  const slug = product.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result: GeneratedPost = {
    title: `${product.name} Review — Best Price in India (${new Date().getFullYear()})`,
    slug: `review-${slug}`,
    seoTitle: `${product.name} Review: Is It Worth ₹${product.price}? [${new Date().getFullYear()}]`,
    seoDescription: `Read our in-depth ${product.name} review. Rating: ${product.rating}/5. Check current price on Amazon India and see if it's right for you.`,
    content
  };

  await cacheClient.setEx(cacheKey, 86400, JSON.stringify(result)); // cache 24h
  return result;
}

// ─── Roundup Post ─────────────────────────────────────────────────────────────

export async function generateRoundupPost(
  products: Array<{ name: string; price: number; rating: number; affiliateUrl: string; slug: string }>,
  category: string,
  budget?: number
): Promise<GeneratedPost> {
  const title = budget
    ? `Best ${category} Under ₹${budget.toLocaleString("en-IN")} in India`
    : `Best ${category} in India ${new Date().getFullYear()}`;

  const cacheKey = `gemini:roundup:${category}:${budget ?? "all"}`;
  const cached = await cacheClient.get(cacheKey);
  if (cached) return JSON.parse(cached) as GeneratedPost;

  const productList = products
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} — ₹${p.price}, Rating: ${p.rating}/5, Link: ${p.affiliateUrl}`
    )
    .join("\n");

  const prompt = `You are an expert Amazon affiliate content writer for Indian audiences.

Write a "best products" roundup article titled: "${title}"

Products to include:
${productList}

Structure the article in valid HTML:
<h1>${title}</h1>
<h2>Quick Comparison</h2> (a simple HTML table with Name, Price, Rating, Buy Link columns)
<h2>1. [Product Name] — Best Overall</h2> (repeat for each product)
<h2>How to Choose the Right ${category}</h2>
<h2>Final Recommendations</h2>

Rules:
- Each product section should have a "Buy on Amazon" link using the provided URL with rel="nofollow sponsored"  
- Use ₹ for all prices
- 1000-1200 words
- Include Amazon affiliate disclaimer
- Return ONLY the HTML content`;

  const content = await generateLlmText(prompt);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result: GeneratedPost = {
    title,
    slug,
    seoTitle: `${title} — Expert Picks & Reviews`,
    seoDescription: `Discover the ${products.length} best ${category} available in India. Prices, ratings, and honest reviews to help you choose.`,
    content
  };

  await cacheClient.setEx(cacheKey, 86400, JSON.stringify(result));
  return result;
}

// ─── Comparison Post ──────────────────────────────────────────────────────────

export async function generateComparisonPost(
  products: Array<{ name: string; price: number; rating: number; pros: string[]; cons: string[]; affiliateUrl: string }>,
  focusKeyword?: string
): Promise<GeneratedPost> {
  const names = products.map((p) => p.name).join(" vs ");
  const cacheKey = `gemini:compare:${names.toLowerCase().replace(/\s/g, "_")}`;
  const cached = await cacheClient.get(cacheKey);
  if (cached) return JSON.parse(cached) as GeneratedPost;

  const productDetails = products
    .map(
      (p) => `
Product: ${p.name}
Price: ₹${p.price}
Rating: ${p.rating}/5
Pros: ${p.pros.join(", ")}
Cons: ${p.cons.join(", ")}
Link: ${p.affiliateUrl}`
    )
    .join("\n---\n");

  const prompt = `You are an expert Amazon affiliate content writer for Indian audiences.

Write a detailed comparison article: "${names}"
${focusKeyword ? `Focus keyword: ${focusKeyword}` : ""}

Products:
${productDetails}

Structure in valid HTML:
<h1>${names}: Which One Should You Buy?</h1>
<h2>Quick Summary</h2> (recommendation table)
<h2>Design & Build Quality</h2>
<h2>Performance Comparison</h2>
<h2>Price & Value for Money</h2>
<h2>Who Should Buy [Product 1]?</h2>
<h2>Who Should Buy [Product 2]?</h2>
<h2>Final Verdict</h2>

Rules:
- Include "Buy on Amazon" links (rel="nofollow sponsored") for each product
- Use ₹ for prices, Indian context
- 900-1100 words
- Include affiliate disclaimer
- Return ONLY the HTML content`;

  const content = await generateLlmText(prompt);
  const slug = names
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result: GeneratedPost = {
    title: `${names}: Detailed Comparison`,
    slug: `compare-${slug}`,
    seoTitle: `${names} Comparison [${new Date().getFullYear()}] — Which Is Better?`,
    seoDescription: `${names} — full comparison of price, features, and performance. Find out which is best for Indian buyers.`,
    content
  };

  await cacheClient.setEx(cacheKey, 86400, JSON.stringify(result));
  return result;
}
