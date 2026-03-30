import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import * as schema from "../db/schema.js";
import { updateProductPrice } from "./amazon.service.js";

export async function runPriceUpdateJob(): Promise<{ updated: number; skipped: number }> {
  const products = await db.select({
    id: schema.products.id,
    amazonAsin: schema.products.amazonAsin,
    price: schema.products.price
  }).from(schema.products);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const latest = await updateProductPrice(product.amazonAsin);
    if (latest === null) { skipped++; continue; }

    if (Number(product.price) !== latest) {
      await db.update(schema.products)
        .set({ price: String(latest), lastUpdated: new Date() })
        .where(eq(schema.products.id, product.id));
      updated++;
    } else {
      skipped++;
    }
  }

  return { updated, skipped };
}
