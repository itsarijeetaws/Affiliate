import { eq } from "drizzle-orm";
import { db } from "./lib/db.js";
import * as schema from "./db/schema.js";

async function main() {
  console.log("🌱 Seeding database...");

  // Create categories
  const categories = [
    { name: "Electronics", slug: "electronics", description: "Electronic gadgets and accessories" },
    { name: "Headphones", slug: "headphones", description: "Audio equipment and earbuds" },
    { name: "Monitors", slug: "monitors", description: "Computer displays and screens" }
  ];

  for (const cat of categories) {
    await db.insert(schema.categories)
      .values(cat)
      .onDuplicateKeyUpdate({ set: { name: cat.name } });
  }

  // Get all categories
  const allCategories = await db.select().from(schema.categories);
  const electronicsCategory = allCategories.find(c => c.slug === "electronics");
  const headphonesCategory = allCategories.find(c => c.slug === "headphones");
  const monitorsCategory = allCategories.find(c => c.slug === "monitors");

  if (!electronicsCategory || !headphonesCategory || !monitorsCategory) {
    throw new Error("Categories not seeded properly");
  }

  // Create products
  const products = [
    {
      name: "Sony WH-1000XM5 Noise Cancelling Headphones",
      slug: "sony-wh-1000xm5",
      amazonAsin: "B09TWCHY96",
      price: "399.99",
      rating: 4.8,
      imageUrl: "https://m.media-amazon.com/images/I/51PD1m0E9XL._SL1500_.jpg",
      categoryId: headphonesCategory.id,
      description: "Industry-leading noise cancellation with premium sound quality. Perfect for travel and work.",
      pros: ["Best-in-class ANC", "40-hour battery", "Premium build quality", "LDAC support"],
      cons: ["Very expensive", "Heavy", "Bulky case"],
      affiliateUrl: "https://amazon.com/dp/B09TWCHY96/?tag=yourpartner-20"
    },
    {
      name: "LG 27GP850 Gaming Monitor",
      slug: "lg-27gp850-gaming",
      amazonAsin: "B08LGNTQ9M",
      price: "349.99",
      rating: 4.6,
      imageUrl: "https://m.media-amazon.com/images/I/81EqHFxlBiL._SL1500_.jpg",
      categoryId: monitorsCategory.id,
      description: "1440p 165Hz gaming monitor with IPS panel. Excellent for competitive gaming.",
      pros: ["165Hz refresh", "IPS colors", "USB-C with power delivery", "G-Sync compatible"],
      cons: ["No VESA mount", "Limited adjustment", "Expensive"],
      affiliateUrl: "https://amazon.com/dp/B08LGNTQ9M/?tag=yourpartner-20"
    },
    {
      name: "Apple AirPods Pro",
      slug: "apple-airpods-pro",
      amazonAsin: "B07PYLT6DN",
      price: "249.00",
      rating: 4.5,
      imageUrl: "https://m.media-amazon.com/images/I/4tAj8g8gw4L._SL1500_.jpg",
      categoryId: headphonesCategory.id,
      description: "Premium wireless earbuds with active noise cancellation and Transparency mode.",
      pros: ["Great ANC", "Apple integration", "Seamless pairing", "Compact case"],
      cons: ["Apple-only ecosystem", "Expensive", "No ear fit test"],
      affiliateUrl: "https://amazon.com/dp/B07PYLT6DN/?tag=yourpartner-20"
    },
    {
      name: "Dell S3422DW Curved Monitor",
      slug: "dell-s3422dw",
      amazonAsin: "B08B1PHTMT",
      price: "299.99",
      rating: 4.4,
      imageUrl: "https://m.media-amazon.com/images/I/91T1QCCnDyL._SL1500_.jpg",
      categoryId: monitorsCategory.id,
      description: "Ultrawide curved 1440p monitor for productivity and gaming. 144Hz refresh rate.",
      pros: ["Ultrawide screen", "Curved design", "144Hz", "USB-C with power delivery"],
      cons: ["Premium pricing", "Limited vertical adjustment"],
      affiliateUrl: "https://amazon.com/dp/B08B1PHTMT/?tag=yourpartner-20"
    }
  ];

  for (const product of products) {
    const pros = typeof product.pros === 'string' ? product.pros : JSON.stringify(product.pros);
    const cons = typeof product.cons === 'string' ? product.cons : JSON.stringify(product.cons);

    await db.insert(schema.products)
      .values({
        ...product,
        pros,
        cons
      })
      .onDuplicateKeyUpdate({ set: { lastUpdated: new Date() } });
  }

  // Create blog posts
  const blogPosts = [
    {
      title: "Best Noise Cancelling Headphones for Remote Work",
      slug: "best-noise-cancelling-headphones",
      excerpt: "Compare the top noise cancelling headphones perfect for focusing during remote work.",
      content: "Noise cancellation technology has revolutionized how we work remotely. In this comprehensive guide, we compare Sony WH-1000XM5, Apple AirPods Pro, and other top models. Sony leads the market with industry-best ANC, providing up to 40 hours of battery life. The XM5s feature refined touch controls and superior sound quality.\n\nApple AirPods Pro offer excellent integration with Apple devices and are more portable. However, Android users might find better options with Sony or Sennheiser.\n\nFor budget-conscious buyers, the JBL Tour Pro 2 offers solid ANC at a fraction of the premium price. Choose based on your device ecosystem and priorities - whether that's sound quality, comfort, or battery life.",
      categoryId: headphonesCategory.id,
      status: "published",
      seoTitle: "Best Noise Cancelling Headphones 2024 | Review & Comparison",
      seoDescription: "Find the perfect noise cancelling headphones. Expert reviews of Sony WH-1000XM5, AirPods Pro & more."
    },
    {
      title: "Gaming Monitors: 1440p vs 4K - Which is Better?",
      slug: "gaming-monitors-1440p-vs-4k",
      excerpt: "Detailed comparison of 1440p and 4K gaming monitors to help you choose the right setup.",
      content: "The gaming monitor market has exploded with options, but the 1440p vs 4K debate remains central. Here's what you need to know:\n\n1440p Advantages:\n- Higher refresh rates (144Hz+) for competitive gaming\n- Better performance scaling with current GPUs\n- Lower cost than equivalent 4K models\n- Perfect balance of visual quality and performance\n\n4K Advantages:\n- Superior visual clarity for story-driven games\n- Future-proof for upcoming GPU generations\n- Better for productivity work\n- More immersive experience\n\nFor most gamers, 1440p at 144Hz+ is the sweet spot. Competitive shooters benefit from higher refresh rates. Single-player games and content creators prefer 4K resolution.\n\nWe recommend the LG 27GP850 for competitive gaming and the ASUS ProArt for creative work.",
      categoryId: monitorsCategory.id,
      status: "published",
      seoTitle: "1440p vs 4K Gaming Monitors | Which Should You Buy?",
      seoDescription: "Compare 1440p and 4K gaming monitors. We help you decide based on your GPU, games, and budget."
    },
    {
      title: "Ultimate Guide to Wireless Earbuds",
      slug: "ultimate-guide-wireless-earbuds",
      excerpt: "Everything you need to know about choosing the best wireless earbuds for your lifestyle.",
      content: "Wireless earbuds have become essential gadgets. Whether you're commuting, exercising, or working, the right pair makes all the difference.\n\nKey Features to Consider:\n1. Noise Cancellation - Active (ANC) vs Passive\n2. Battery Life - Single charge + case capacity\n3. Codec Support - SBC, AAC, LDAC, aptX\n4. Fit & Comfort - Seal quality matters\n5. Connectivity - Bluetooth version and stability\n\nTop Recommendations:\n- Premium: Sony LinkBuds S, Apple AirPods Pro\n- Mid-Range: Nothing Ear, OnePlus Buds\n- Budget: Soundcore Space A40\n\nDon't forget to test the fit before buying - many retailers offer return policies. Your ears are unique, and what works for others might not work for you.",
      categoryId: headphonesCategory.id,
      status: "published",
      seoTitle: "Best Wireless Earbuds Guide | Reviews & Buying Tips 2024",
      seoDescription: "Find the perfect wireless earbuds. Expert guide covers ANC, battery life, fit, and sound quality."
    }
  ];

  for (const post of blogPosts) {
    await db.insert(schema.blogPosts)
      .values(post)
      .onDuplicateKeyUpdate({ set: { slug: post.slug } });
  }

  // Create comparison
  const productsForComparison = await db.select().from(schema.products).limit(3);
  if (productsForComparison.length > 0) {
    const productIds = productsForComparison.map(p => p.id);
    await db.insert(schema.comparisons)
      .values({
        title: "Top Headphones Comparison",
        slug: "top-headphones-comparison",
        productIds: JSON.stringify(productIds),
        items: JSON.stringify({
          "Price": productIds.map((_, i) => `$${150 + i * 100}`),
          "ANC Quality": productIds.map(() => "Excellent"),
          "Battery Life": productIds.map(() => "40+ hours")
        })
      })
      .onDuplicateKeyUpdate({ set: { slug: "top-headphones-comparison" } });
  }

  console.log("✅ Seed complete");
  console.log("📊 Created:");
  console.log("   - 3 categories");
  console.log("   - 4 products");
  console.log("   - 3 blog posts");
  console.log("   - 1 comparison table");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
