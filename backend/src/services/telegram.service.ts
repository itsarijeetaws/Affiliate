/**
 * Telegram Bot API service
 * Sends messages and photos to the BestBuys India Deals channel.
 */

// Read lazily so dotenv.config() in scripts runs first (ESM hoisting)
const token     = () => process.env.TELEGRAM_BOT_TOKEN  ?? "";
const channelId = () => process.env.TELEGRAM_CHANNEL_ID ?? "";
const adminId   = () => process.env.TELEGRAM_ADMIN_ID   ?? "";
const API_BASE  = () => `https://api.telegram.org/bot${token()}`;

export const CHANNEL_ID = { get value() { return channelId(); } };
export const ADMIN_ID   = { get value() { return adminId(); } };

export function isTelegramConfigured(): boolean {
  return !!(token() && channelId());
}

export async function sendMessage(
  chatId: string,
  text: string,
  options: { parseMode?: string; disableWebPagePreview?: boolean } = {}
): Promise<boolean> {
  if (!token()) return false;
  try {
    const res = await fetch(`${API_BASE()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
        disable_web_page_preview: options.disableWebPagePreview ?? false,
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) console.error("[Telegram] sendMessage error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("[Telegram] sendMessage failed:", String(err));
    return false;
  }
}

export async function sendPhoto(
  chatId: string,
  photoUrl: string,
  caption: string
): Promise<boolean> {
  if (!token()) return false;
  try {
    const res = await fetch(`${API_BASE()}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) console.error("[Telegram] sendPhoto error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("[Telegram] sendPhoto failed:", String(err));
    return false;
  }
}

/** Post a buying guide to channel */
export async function postGuideToChannel(guide: {
  title: string;
  slug: string;
  excerpt?: string | null;
  categoryName?: string;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestbuysindia.com";
  const url = `${siteUrl}/blog/${guide.slug}`;

  const text = [
    `📖 <b>New Buying Guide</b>`,
    ``,
    `<b>${guide.title}</b>`,
    guide.excerpt ? `\n${guide.excerpt}` : "",
    ``,
    `👉 <a href="${url}">Read the full guide</a>`,
    ``,
    `#BestBuysIndia #BuyingGuide #AmazonIndia`,
  ].join("\n").trim();

  return sendMessage(channelId(), text);
}

/** Post a product deal to channel */
export async function postDealToChannel(product: {
  name: string;
  slug: string;
  price: number;
  rating: number;
  imageUrl?: string;
  affiliateUrl?: string;
  categoryName?: string;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bestbuysindia.com";
  const reviewUrl = `${siteUrl}/product/${product.slug}`;
  const priceStr = product.price > 0 ? `₹${Number(product.price).toLocaleString("en-IN")}` : "Check price";

  const caption = [
    `🔥 <b>Deal of the Day</b>`,
    ``,
    `<b>${product.name}</b>`,
    `⭐ ${product.rating}/5  |  💰 ${priceStr}`,
    ``,
    `👉 <a href="${reviewUrl}">Read full review</a>`,
    product.affiliateUrl ? `🛒 <a href="${product.affiliateUrl}">Buy on Amazon India</a>` : "",
    ``,
    `#BestBuysIndia #Deals #AmazonIndia`,
  ].filter(Boolean).join("\n").trim();

  if (product.imageUrl) {
    const ok = await sendPhoto(channelId(), product.imageUrl, caption);
    if (ok) return true;
    // fallback to text if photo fails
  }
  return sendMessage(channelId(), caption);
}

/** Notify admin of errors */
export async function notifyAdmin(message: string): Promise<void> {
  if (!adminId()) return;
  await sendMessage(adminId(), `⚠️ <b>BestBuysIndia Bot Alert</b>\n\n${message}`);
}
