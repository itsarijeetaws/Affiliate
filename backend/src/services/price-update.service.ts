/**
 * Price-update service — scrapes Amazon India product pages for current prices.
 * No Amazon PA API required.
 * Called by: daily-price-cron.ts (2 AM every day) and /automation/update-prices endpoint.
 */

import axios from "axios";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Cache-Control": "max-age=0",
};

const DELAY_MS = 3000;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPriceForAsin(asin: string): Promise<number | null> {
  try {
    const { data: html } = await axios.get<string>(`https://www.amazon.in/dp/${asin}`, {
      headers: HEADERS,
      timeout: 15000,
      decompress: true,
    });

    const patterns = [
      /a-price-whole[^>]*>[\s]*([\d,]+)/,
      /₹\s*([\d,]+(?:\.\d{2})?)/,
      /priceblock_ourprice[^>]*>[\s]*₹\s*([\d,]+)/,
    ];

    for (const re of patterns) {
      const m = re.exec(html);
      if (m) {
        const price = parseFloat(m[1].replace(/,/g, ""));
        if (price > 0) return price;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function runPriceUpdateJob(): Promise<{ updated: number; skipped: number; failed: number }> {
  const products = await db.select({
    id: schema.products.id,
    amazonAsin: schema.products.amazonAsin,
    price: schema.products.price,
  }).from(schema.products);

  let updated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, amazonAsin, price: oldPrice } = products[i];
    const newPrice = await fetchPriceForAsin(amazonAsin);

    if (newPrice === null) {
      failed++;
    } else if (Math.abs(newPrice - Number(oldPrice)) < 0.5) {
      skipped++;
    } else {
      await db.update(schema.products)
        .set({ price: String(newPrice), lastUpdated: new Date() })
        .where(eq(schema.products.id, id));
      updated++;
    }

    // Polite delay — skip after last product
    if (i < products.length - 1) await sleep(DELAY_MS);
  }

  return { updated, skipped, failed };
}
