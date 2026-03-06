import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const redirectRouter = Router();

redirectRouter.get("/go/:product_slug", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.product_slug }
  });

  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const referrer = req.get("referer") || null;
  const country = req.get("cf-ipcountry") || req.get("x-country") || "unknown";
  const userAgent = req.get("user-agent") || null;

  await prisma.$transaction([
    prisma.clickTracking.create({
      data: {
        productId: product.id,
        referrer,
        country,
        userAgent
      }
    }),
    prisma.affiliateLink.upsert({
      where: { productId: product.id },
      update: { clicks: { increment: 1 } },
      create: {
        productId: product.id,
        url: product.affiliateUrl,
        clicks: 1,
        source: "amazon"
      }
    })
  ]);

  res.redirect(302, product.affiliateUrl);
});
