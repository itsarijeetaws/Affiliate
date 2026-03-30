import { eq } from "drizzle-orm";
import { db } from "./lib/db.js";
import * as schema from "./db/schema.js";

async function main() {
  // Upsert seed category
  await db.insert(schema.categories)
    .values({ name: "Electronics", slug: "electronics", description: "Electronic gadgets and accessories" })
    .onDuplicateKeyUpdate({ set: { name: "Electronics" } });

  const [category] = await db.select().from(schema.categories).where(eq(schema.categories.slug, "electronics")).limit(1);
  if (!category) throw new Error("Category not seeded");

  // Upsert seed product
  await db.insert(schema.products)
    .values({
      name: "Sample Noise Cancelling Headphones",
      slug: "sample-noise-cancelling-headphones",
      amazonAsin: "B000000001",
      price: "129.99",
      rating: 4.4,
      imageUrl: "https://m.media-amazon.com/images/I/61JMFMJH0AL._SL1500_.jpg",
      categoryId: category.id,
      description: "Sample seeded product for local development.",
      pros: ["Great sound", "Comfortable fit"],
      cons: ["Premium pricing"],
      affiliateUrl: "https://www.amazon.in/dp/B000000001/?tag=adfirststore-21",
      lastUpdated: new Date()
    })
    .onDuplicateKeyUpdate({ set: { lastUpdated: new Date() } });

  console.log("✅ Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
