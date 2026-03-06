import { prisma } from "../lib/prisma.js";
import { updateProductPrice } from "./amazon.service.js";

export async function runPriceUpdateJob(): Promise<{ updated: number; skipped: number }> {
  const products = await prisma.product.findMany({
    select: { id: true, amazonAsin: true, price: true }
  });

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const latest = await updateProductPrice(product.amazonAsin);
    if (latest === null) {
      skipped += 1;
      continue;
    }

    const current = Number(product.price);
    if (current !== latest) {
      await prisma.$transaction([
        prisma.product.update({
          where: { id: product.id },
          data: { price: latest, lastUpdated: new Date() }
        }),
        prisma.priceHistory.create({
          data: {
            productId: product.id,
            oldPrice: current,
            newPrice: latest
          }
        })
      ]);
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return { updated, skipped };
}
