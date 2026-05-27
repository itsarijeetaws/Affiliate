// Runs on amazon.in/dp/* pages — scrapes product data and sends to background
// v1.2 — JSON-LD first, better price/MRP/image/category extraction

(function () {
  const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
  if (!asinMatch) return;
  const asin = asinMatch[1].toUpperCase();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() || "";
  const attr = (sel, a) => document.querySelector(sel)?.getAttribute(a) || "";

  function upgradeImage(url) {
    if (!url) return "";
    // Remove existing size suffix and add _SL1500_ for high-res
    return url
      .replace(/\._[A-Z]{1,3}\d{2,4}(_[A-Z]+\d+)?_\./g, ".")
      .replace(/\.([a-z]+)$/, "._SL1500_.$1");
  }

  // ── Strategy 1: JSON-LD (server-rendered, most reliable) ─────────────────
  function extractJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        const nodes = Array.isArray(data)
          ? data
          : data["@graph"]
          ? data["@graph"]
          : [data];
        for (const n of nodes) {
          if (n["@type"] !== "Product" && n["@type"] !== "IndividualProduct") continue;
          if (!n.name || n.name.length < 5) continue;

          let price = "", mrp = "";
          if (n.offers) {
            const p = parseFloat(String(n.offers.price || n.offers.lowPrice || "").replace(/,/g, ""));
            const m = parseFloat(String(n.offers.highPrice || "").replace(/,/g, ""));
            if (p) price = String(Math.round(p));
            if (m && m > p) mrp = String(Math.round(m));
          }

          const agg = n.aggregateRating;
          const rating = agg ? String(parseFloat(agg.ratingValue) || "") : "";
          const reviews = agg
            ? String(parseInt(String(agg.reviewCount || agg.ratingCount || "0"), 10) || "")
            : "";

          const brand =
            (typeof n.brand === "object" ? n.brand?.name : n.brand) || "";

          let imageUrl = "";
          if (typeof n.image === "string") imageUrl = n.image;
          else if (Array.isArray(n.image)) imageUrl = n.image[0] || "";
          else if (n.image?.url) imageUrl = n.image.url;

          return { title: n.name, price, mrp, rating, reviews, brand, imageUrl };
        }
      } catch (_) {}
    }
    return null;
  }

  const ld = extractJsonLd() || {};

  // ── Title ────────────────────────────────────────────────────────────────
  const name = ld.title || text("#productTitle") || text("h1 span");
  if (!name || name.length < 5) return; // bail — no title means blocked/bad page

  // ── Price ────────────────────────────────────────────────────────────────
  let price = ld.price || "";
  if (!price) {
    const priceSelectors = [
      // New layout: priceToPay block
      "#corePriceDisplay_desktop_feature_div .priceToPay .a-price-whole",
      ".priceToPay .a-price-whole",
      ".priceToPay .a-offscreen",
      // Older selectors
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#price_inside_buybox",
      ".a-price-whole",
    ];
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const raw = el.textContent.replace(/[₹,\s]/g, "").replace(/\..*/,"").trim();
      if (raw && /^\d+$/.test(raw)) { price = raw; break; }
    }
  }

  // ── MRP (original price, struck through) ─────────────────────────────────
  let mrp = ld.mrp || "";
  if (!mrp) {
    const mrpSelectors = [
      "#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen",
      "#corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen",
      ".basisPrice .a-offscreen",
      ".a-text-price[data-a-strike] .a-offscreen",
      "#priceblock_saleprice",
    ];
    for (const sel of mrpSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const raw = el.textContent.replace(/[₹,\s]/g, "").replace(/\..*/,"").trim();
      if (raw && /^\d+$/.test(raw)) { mrp = raw; break; }
    }
  }

  // ── Rating ───────────────────────────────────────────────────────────────
  let rating = ld.rating || "";
  if (!rating) {
    const ratingEl =
      document.querySelector("#acrPopover") ||
      document.querySelector("span[data-hook='rating-out-of-text']");
    if (ratingEl) {
      const t = ratingEl.getAttribute("title") || ratingEl.textContent;
      const m = t.match(/[\d.]+/);
      if (m) rating = m[0];
    }
    if (!rating) {
      const alt = document.querySelector(".a-icon-star .a-icon-alt");
      if (alt) { const m = alt.textContent.match(/[\d.]+/); if (m) rating = m[0]; }
    }
  }

  // ── Review count ─────────────────────────────────────────────────────────
  let reviews = ld.reviews || "";
  if (!reviews) {
    const revEl =
      document.querySelector("#acrCustomerReviewText") ||
      document.querySelector("span[data-hook='total-review-count']");
    if (revEl) {
      const m = revEl.textContent.replace(/,/g, "").match(/\d+/);
      if (m) reviews = m[0];
    }
  }

  // ── Brand ────────────────────────────────────────────────────────────────
  const brand =
    ld.brand ||
    text("#bylineInfo")
      .replace(/^(Visit the |Brand: |by )/i, "")
      .replace(/\s+Store$/i, "")
      .trim() ||
    attr("#brand", "value") ||
    text("#brand");

  // ── Image ────────────────────────────────────────────────────────────────
  let imageUrl = ld.imageUrl || "";
  if (!imageUrl) {
    const imgEl =
      document.getElementById("landingImage") ||
      document.querySelector("#imgBlkFront") ||
      document.querySelector(".a-dynamic-image");
    if (imgEl) {
      const hiRes = imgEl.getAttribute("data-old-hires") || imgEl.getAttribute("data-a-hires");
      if (hiRes) {
        imageUrl = hiRes;
      } else {
        const dynImg = imgEl.getAttribute("data-a-dynamic-image");
        if (dynImg) {
          try {
            // Pick the URL with the largest pixel area
            const urls = Object.keys(JSON.parse(dynImg));
            imageUrl = urls.sort((a, b) => {
              const dim = (u) => {
                const m = u.match(/_(\d+),(\d+)_/);
                return m ? parseInt(m[1]) * parseInt(m[2]) : 0;
              };
              return dim(b) - dim(a);
            })[0] || "";
          } catch (_) {}
        }
        if (!imageUrl) imageUrl = imgEl.src || "";
      }
    }
  }
  imageUrl = upgradeImage(imageUrl);

  // ── Availability ─────────────────────────────────────────────────────────
  const availability = text("#availability span").replace(/\s+/g, " ") ||
    text("#outOfStock") || "In Stock";

  // ── Category from breadcrumb ─────────────────────────────────────────────
  const SKIP_CRUMBS = new Set([
    "home", "amazon.in", "all departments", "see all", "deals",
    "new arrivals", "international shopping",
  ]);
  const breadcrumbs = [
    ...document.querySelectorAll("#wayfinding-breadcrumbs_feature_div a"),
  ]
    .map((el) => el.textContent.trim())
    .filter((b) => b && !SKIP_CRUMBS.has(b.toLowerCase()));

  // Take the deepest useful crumb, then map to site category
  const category = mapToSiteCategory(breadcrumbs[breadcrumbs.length - 1] || "");

  // ── Map Amazon category → site category ─────────────────────────────────
  function mapToSiteCategory(raw) {
    if (!raw) return raw;
    const c = raw.toLowerCase();
    if (/mobil|smartphone|phone|iphone|android/.test(c))            return "Smartphones";
    if (/laptop|notebook|chromebook|macbook|2-in-1/.test(c))        return "Laptops";
    if (/headphone|earbud|earphone|in-ear|over-ear|tws|airpod/.test(c))   return "Headphones";
    if (/speaker|soundbar|home.?audio|bluetooth.?audio|portable.?media|music.?player/.test(c)) return "Home Audio";
    if (/\btv\b|television|home.?theater|oled|qled|smart.?tv/.test(c))    return "Smart TVs";
    if (/gaming|console|xbox|playstation|nintendo|game.?controller|joystick/.test(c)) return "Gaming";
    if (/smart.?watch|smartwatch|wearable|fitness.?band|activity.?tracker/.test(c)) return "Smartwatches";
    if (/power.?bank|portable.?charger|battery.?pack|battery.?charger/.test(c)) return "Power Banks";
    if (/camera|photography|dslr|mirrorless|action.?cam|dashcam/.test(c))  return "Cameras";
    if (/monitor|display|screen/.test(c))                                  return "Monitors";
    if (/keyboard|mouse|printer|scanner|webcam|hard.?drive|ssd|pen.?drive|usb.?hub|pc.?peripheral|computer.?peripheral|input.?device/.test(c)) return "Computer Peripherals";
    if (/groom|shaver|trimmer|epilator|hair.?dryer|straighten|beauty|skincare|personal.?care/.test(c)) return "Grooming & Beauty";
    if (/fitness|gym|yoga|treadmill|cycle|dumbbell|sport|exercise|health/.test(c)) return "Fitness & Sports";
    if (/baby|infant|toddler|kid|child|toy|diaper|stroller|pram/.test(c))  return "Baby & Kids";
    if (/washing|refriger|fridge|air.?condition|microwave|oven|dishwasher|vacuum|iron|geyser|water.?heater|air.?purif|water.?purif|induction|cooktop|mixer|grinder|juicer|fan|cooler|heater|toaster|coffee|kettle/.test(c)) return "Home Appliances";
    if (/kitchen|cookware|utensil|pan|pot|knife|cutlery|plate|bowl|glass|bottle|container|bakeware/.test(c)) return "Kitchen Appliances";
    if (/women|lady|ladies|girl|kurti|saree|salwar|lehenga|blouse|skirt|ethnic|lingerie/.test(c)) return "Women's Fashion";
    if (/\bmen\b|shirt|trouser|jean|pant|kurta|blazer|formal|men.?fashion/.test(c)) return "Men's Fashion";
    if (/bag|luggage|suitcase|backpack|handbag|purse|wallet|travel|tote/.test(c)) return "Bags & Luggage";
    if (/car|vehicle|auto|bike|motorcycle|tyre|oil|helmet|seat.?cover/.test(c)) return "Automotive";
    if (/furniture|sofa|bed|chair|table|wardrobe|decor|curtain|carpet|rug|lamp|light|cushion|pillow|bedsheet|towel|bathroom|home.?decor/.test(c)) return "Home & Decor";
    if (/book|novel|textbook|magazine|comic|fiction/.test(c))              return "Books";
    if (/electronic|projector|tablet|accessor|cable|hdmi|charger|router|network|bluetooth|gps|ebook|kindle|smart.?home|computer|digital/.test(c)) return "Electronics";
    return raw;
  }

  // ── Affiliate URL ────────────────────────────────────────────────────────
  const affiliateUrl = `https://www.amazon.in/dp/${asin}/?tag=adfirststore-21`;

  // ── Feature bullets ──────────────────────────────────────────────────────
  const bullets = [
    ...document.querySelectorAll("#feature-bullets li span.a-list-item"),
  ]
    .map((el) => el.textContent.trim())
    .filter(
      (b) =>
        b &&
        b.length > 5 &&
        !b.toLowerCase().startsWith("make sure this fits") &&
        !b.toLowerCase().startsWith("enter your model number")
    )
    .slice(0, 5)
    .join(" | ");

  // ── Send ─────────────────────────────────────────────────────────────────
  const product = {
    asin, name, brand, price, mrp, rating, reviews,
    availability, category, imageUrl, affiliateUrl, bullets,
    url: window.location.href,
    scrapedAt: new Date().toISOString(),
  };

  chrome.runtime.sendMessage({ type: "ADD_PRODUCT", product }, () => {
    if (chrome.runtime.lastError) {} // popup not open — ignore
  });

  // Toast notification
  const toast = document.createElement("div");
  toast.textContent = `✓ ${name.slice(0, 55)}${name.length > 55 ? "…" : ""}`;
  toast.style.cssText = [
    "position:fixed", "bottom:20px", "right:20px", "z-index:999999",
    "background:#232f3e", "color:#FF9900", "font-family:Arial,sans-serif",
    "font-size:13px", "padding:10px 16px", "border-radius:8px",
    "box-shadow:0 4px 20px rgba(0,0,0,.4)", "max-width:380px",
    "border-left:3px solid #FF9900", "line-height:1.4",
  ].join(";");
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
})();
