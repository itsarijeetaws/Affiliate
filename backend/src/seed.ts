import { prisma } from "./lib/prisma.js";

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Electronic gadgets and accessories"
    }
  });

  await prisma.product.upsert({
    where: { amazonAsin: "B000000001" },
    update: {},
    create: {
      name: "Sample Noise Cancelling Headphones",
      slug: "sample-noise-cancelling-headphones",
      amazonAsin: "B000000001",
      price: 129.99,
      rating: 4.4,
      imageUrl: "https://images-na.ssl-images-amazon.com/images/I/sample.jpg",
      categoryId: category.id,
      description: "Sample seeded product for local development.",
      pros: ["Great sound", "Comfortable fit"],
      cons: ["Premium pricing"],
      affiliateUrl: "https://www.amazon.com/dp/B000000001/?tag=sampletag-20",
      lastUpdated: new Date()
    }
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
