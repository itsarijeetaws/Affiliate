/**
 * Test Amazon Creators API connectivity
 * Run: npx tsx scripts/test-amazon-api.ts
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const CLIENT_ID     = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const PARTNER_TAG   = process.env.AMAZON_PARTNER_TAG;

console.log("\n── Amazon API Config Check ──────────────────────");
console.log("AMAZON_CLIENT_ID    :", CLIENT_ID     ? `SET (${CLIENT_ID.slice(0,8)}...)` : "❌ NOT SET");
console.log("AMAZON_CLIENT_SECRET:", CLIENT_SECRET ? `SET (${CLIENT_SECRET.slice(0,8)}...)` : "❌ NOT SET");
console.log("AMAZON_PARTNER_TAG  :", PARTNER_TAG   ? `SET → ${PARTNER_TAG}` : "❌ NOT SET");

if (!CLIENT_ID || !CLIENT_SECRET || !PARTNER_TAG) {
  console.log("\n❌ Missing env vars. Add to backend/.env and retry.\n");
  process.exit(1);
}

// ── Step 1: Get OAuth2 token ──────────────────────────────────────────────────
console.log("\n── Step 1: OAuth2 token ─────────────────────────");
let token = "";
try {
  const res = await fetch("https://api.amazon.co.uk/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "creatorsapi::default",
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`❌ Token error ${res.status}:`, text);
    process.exit(1);
  }
  const data = JSON.parse(text) as { access_token: string; expires_in: number };
  token = data.access_token;
  console.log(`✅ Token obtained (expires in ${data.expires_in}s)`);
} catch (err) {
  console.log("❌ Token fetch failed:", String(err));
  process.exit(1);
}

// ── Step 2: Test getItems with known ASIN ─────────────────────────────────────
// B09HJDKFQ2 = boAt Airdopes 141 (popular India product)
const TEST_ASIN = "B09HJDKFQ2";
console.log(`\n── Step 2: getItems (ASIN: ${TEST_ASIN}) ──────────`);
try {
  const res = await fetch("https://creatorsapi.amazon/catalog/v1/getItems", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-marketplace": "www.amazon.in",
    },
    body: JSON.stringify({
      itemIds: [TEST_ASIN],
      itemIdType: "ASIN",
      marketplace: "www.amazon.in",
      partnerTag: PARTNER_TAG,
      resources: [
        "itemInfo.title",
        "offersV2.listings.price",
        "customerReviews.starRating",
        "images.primary.medium",
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`❌ getItems error ${res.status}:`, text);
    process.exit(1);
  }
  const data = JSON.parse(text) as {
    itemsResult?: { items: Array<{
      asin: string;
      itemInfo?: { title?: { displayValue: string } };
      offersV2?: { listings?: Array<{ price?: { amount: number } }> };
      customerReviews?: { starRating?: { value: number } };
    }> };
  };
  const items = data.itemsResult?.items ?? [];
  if (items.length === 0) {
    console.log("⚠  No items returned. ASIN might not be available in IN marketplace.");
  } else {
    const item = items[0];
    const price = item.offersV2?.listings?.[0]?.price?.amount ?? 0;
    const rating = item.customerReviews?.starRating?.value ?? 0;
    console.log(`✅ Product: ${item.itemInfo?.title?.displayValue ?? item.asin}`);
    console.log(`   Price  : ₹${price}`);
    console.log(`   Rating : ${rating}/5`);
  }
} catch (err) {
  console.log("❌ getItems failed:", String(err));
  process.exit(1);
}

console.log("\n✅ Amazon Creators API is working correctly!\n");
