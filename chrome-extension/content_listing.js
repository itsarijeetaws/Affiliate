// Runs on Amazon.in listing pages (bestsellers, new-releases, search, browse)
// v1.2 — fixes name=price bug, better category, _SL1500_ images

(function () {
  // Only fire on actual listing URLs
  const href = window.location.href;
  const isListing =
    /\/gp\/(bestsellers|new-releases|top-rated)\//i.test(href) ||
    /\/s(\?|\/)/i.test(href) ||
    /\/b(\?|\/ref=)/i.test(href);
  if (!isListing) return;

  // Wait for dynamic content to render
  setTimeout(scrapeListingPage, 1800);

  // ── Helpers ────────────────────────────────────────────────────────────

  /** True if the string looks like a price rather than a product name */
  function isPriceLike(str) {
    if (!str) return true;
    const s = str.replace(/\s/g, "");
    // Starts with currency symbol
    if (/^[₹$€£]/.test(s)) return true;
    // Pure digits / commas / dots (e.g. "32,990" or "32990.00")
    if (/^[\d,]+(\.\d+)?$/.test(s)) return true;
    // Very short and starts with digit
    if (s.length < 6 && /^\d/.test(s)) return true;
    return false;
  }

  /**
   * Map Amazon category names → site category names.
   * Order: specific rules first, broad catch-alls last.
   * Site categories: Smartphones, Laptops, Audio, Headphones, Gaming,
   *   DB category names (exact): Smartphones, Laptops, Headphones, Home Audio,
   *   Smart TVs, Gaming, Smartwatches, Power Banks, Cameras, Monitors,
   *   Computer Peripherals, Grooming & Beauty, Fitness & Sports, Baby & Kids,
   *   Home Appliances, Kitchen Appliances, Women's Fashion, Men's Fashion,
   *   Bags & Luggage, Automotive, Home & Decor, Books, Electronics (catch-all)
   */
  function mapToSiteCategory(raw) {
    if (!raw) return raw;
    const c = raw.toLowerCase();

    if (/mobil|smartphone|phone|iphone|android/.test(c))            return "Smartphones";
    if (/laptop|notebook|chromebook|macbook|2-in-1/.test(c))        return "Laptops";
    if (/headphone|earbud|earphone|in-ear|over-ear|tws|airpod/.test(c)) return "Headphones";
    if (/speaker|soundbar|home.?audio|bluetooth.?audio|portable.?media|music.?player/.test(c)) return "Home Audio";
    if (/\btv\b|television|home.?theater|oled|qled|smart.?tv/.test(c)) return "Smart TVs";
    if (/gaming|console|xbox|playstation|nintendo|game.?controller|joystick/.test(c)) return "Gaming";
    if (/smart.?watch|smartwatch|wearable|fitness.?band|activity.?tracker/.test(c)) return "Smartwatches";
    if (/power.?bank|portable.?charger|battery.?pack|battery.?charger/.test(c)) return "Power Banks";
    if (/camera|photography|dslr|mirrorless|action.?cam|dashcam/.test(c)) return "Cameras";
    if (/monitor|display|screen/.test(c))                           return "Monitors";
    if (/keyboard|mouse|printer|scanner|webcam|hard.?drive|ssd|pen.?drive|usb.?hub|pc.?peripheral|computer.?peripheral|input.?device/.test(c)) return "Computer Peripherals";
    if (/groom|shaver|trimmer|epilator|hair.?dryer|straighten|beauty|skincare|personal.?care/.test(c)) return "Grooming & Beauty";
    if (/fitness|gym|yoga|treadmill|cycle|dumbbell|sport|exercise|health/.test(c)) return "Fitness & Sports";
    if (/baby|infant|toddler|kid|child|toy|diaper|stroller|pram/.test(c)) return "Baby & Kids";
    if (/washing|refriger|fridge|air.?condition|microwave|oven|dishwasher|vacuum|iron|geyser|water.?heater|air.?purif|water.?purif|induction|cooktop|mixer|grinder|juicer|fan|cooler|heater|toaster|coffee|kettle/.test(c)) return "Home Appliances";
    if (/kitchen|cookware|utensil|pan|pot|knife|cutlery|plate|bowl|glass|bottle|container|bakeware/.test(c)) return "Kitchen Appliances";
    if (/women|lady|ladies|girl|kurti|saree|salwar|lehenga|blouse|skirt|ethnic|lingerie/.test(c)) return "Women's Fashion";
    if (/\bmen\b|shirt|trouser|jean|pant|kurta|blazer|formal|men.?fashion/.test(c)) return "Men's Fashion";
    if (/bag|luggage|suitcase|backpack|handbag|purse|wallet|travel|tote/.test(c)) return "Bags & Luggage";
    if (/car|vehicle|auto|bike|motorcycle|tyre|oil|helmet|seat.?cover/.test(c)) return "Automotive";
    if (/furniture|sofa|bed|chair|table|wardrobe|decor|curtain|carpet|rug|lamp|light|cushion|pillow|bedsheet|towel|bathroom|home.?decor/.test(c)) return "Home & Decor";
    if (/book|novel|textbook|magazine|comic|fiction/.test(c)) return "Books";
    if (/electronic|projector|tablet|accessor|cable|hdmi|charger|router|network|bluetooth|gps|ebook|kindle|smart.?home|computer|digital/.test(c)) return "Electronics";

    return raw;
  }

  /** Extract product title from a listing cell, rejecting price-like strings */
  function extractTitle(cell) {
    const selectors = [
      // ── Bestseller grid (classic layout) ─────────────────────────────
      ".p13n-sc-truncated",
      "[class*='p13n-sc-line-clamp']",
      "[class*='p13n-sc-truncated']",
      // ── New 2024 bestseller grid ──────────────────────────────────────
      "[class*='_truncated_']",
      "[class*='_lineClamp_']",
      "[class*='productTitle']",
      // ── Search results ────────────────────────────────────────────────
      "h2 a span",
      "h2 span",
      // ── Generic product links (order matters — before broad classes) ──
      "a.a-link-normal[href*='/dp/'] span.a-text-normal",
      ".a-link-normal .a-text-normal",
      // ── Truncated text spans ──────────────────────────────────────────
      "span[class*='a-truncate-full']",
      "span[class*='a-truncate-cut']",
      // ── Caption / description spans (last resort — avoid price classes) ─
      ".a-size-small.a-link-normal span",
      "p.a-spacing-none",
    ];

    for (const sel of selectors) {
      const el = cell.querySelector(sel);
      if (!el) continue;
      const txt = el.textContent?.trim();
      if (txt && txt.length > 5 && !isPriceLike(txt)) return txt;
    }
    return null;
  }

  /** Upgrade image URL to high-res (_SL1500_) */
  function upgradeImage(url) {
    if (!url) return "";
    return url
      .replace(/\._[A-Z]{1,3}\d{2,4}(_[A-Z]+\d+)?_\./g, ".")
      .replace(/\.([a-z]+)$/, "._SL1500_.$1");
  }

  /** Extract the category for the current listing page */
  function getCategoryFromPage() {
    // 1. Bestseller left-nav selected item (most specific)
    const zgSel =
      document.querySelector("#zg_browseRoot .zg_selected a") ||
      document.querySelector("[class*='browseRoot'] [class*='selected'] a") ||
      document.querySelector(".zg-nav-main .zg_selected a");
    if (zgSel) {
      const t = zgSel.textContent.trim();
      if (t && t.length > 1) return t;
    }

    // 2. Page heading (h1) — strip "Best Sellers in / New Releases in" prefix
    const h1Sel =
      document.querySelector("h1.zg-title") ||
      document.querySelector("h1.a-size-large.a-spacing-medium") ||
      document.querySelector("h1.a-size-large") ||
      document.querySelector("h1");
    if (h1Sel) {
      const raw = h1Sel.textContent.trim();
      const stripped = raw
        .replace(/^(Best Sellers|New Releases|Most Gifted|Top Rated|Most Wished For)\s+in\s+/i, "")
        .trim();
      if (stripped && stripped !== raw && stripped.length > 1) return stripped;
    }

    // 3. Breadcrumb (last meaningful item)
    const SKIP = new Set(["home", "amazon.in", "all departments", "deals", "bestsellers", "see all"]);
    const bc = [
      ...document.querySelectorAll(
        "#wayfinding-breadcrumbs_feature_div a, .a-breadcrumb a, .zg-browse-group a"
      ),
    ]
      .map((el) => el.textContent.trim())
      .filter((t) => t && !SKIP.has(t.toLowerCase()) && !t.toLowerCase().startsWith("best seller"));
    if (bc.length) return bc[bc.length - 1];

    // 4. URL slug for bestseller pages: /gp/bestsellers/SLUG/...
    const bsMatch = window.location.pathname.match(/\/(bestsellers|new-releases|top-rated)\/([^/?]+)/i);
    if (bsMatch) {
      const slug = bsMatch[2];
      // Skip pure numeric category IDs
      if (!/^\d+$/.test(slug)) {
        return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // 5. Left-nav department / refinement selected (search & browse pages)
    const refineSelectors = [
      "#departments .a-selected a",
      "#departments li.a-selected a",
      "#s-refinements .a-selected a",
      "li.a-selected > a",
      ".a-selected a",
    ];
    for (const sel of refineSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const t = el.textContent.trim();
          if (t && t.length > 1 && !SKIP.has(t.toLowerCase())) return t;
        }
      } catch (_) {}
    }

    // 6. Top search result info text e.g. "Results for 'USB cables' in Electronics"
    const resultInfo = document.querySelector(".a-color-state.a-text-bold, #s-result-count");
    if (resultInfo) {
      const m = resultInfo.textContent.match(/in\s+([A-Za-z &]+?)(?:\s*$|\s*\()/i);
      if (m && m[1]) return m[1].trim();
    }

    // 7. Search query from URL (last resort — too generic but better than empty)
    const kw = new URLSearchParams(window.location.search).get("k");
    if (kw) return kw;

    return "";
  }

  // ── Main scrape ────────────────────────────────────────────────────────

  function scrapeListingPage() {
    const cells = [...document.querySelectorAll("[data-asin]")].filter((el) => {
      const asin = el.dataset.asin;
      return asin && /^[A-Z0-9]{10}$/.test(asin);
    });

    if (!cells.length) return;

    const pageCategory = mapToSiteCategory(getCategoryFromPage());
    const seen = new Set();
    const products = [];

    for (const cell of cells) {
      const asin = cell.dataset.asin;
      if (seen.has(asin)) continue;
      seen.add(asin);

      // Skip sponsored items
      if (
        cell.closest("[class*='_c2Itd']") ||
        cell.className?.includes("_c2Itd") ||
        cell.querySelector("[class*='sponsored-label']") ||
        cell.querySelector("[aria-label*='Sponsored']")
      ) continue;

      // Title — must not be price-like
      const name = extractTitle(cell);
      if (!name) continue;

      // Price
      let price = "";
      const priceSelectors = [
        ".p13n-sc-price",
        "._cDEzb_p13n-sc-price_3mJ9Z",
        "[class*='p13n-sc-price']",
        ".a-price .a-offscreen",
        "span[data-a-color='price'] .a-offscreen",
        ".a-price-whole",
      ];
      for (const sel of priceSelectors) {
        const el = cell.querySelector(sel);
        if (!el) continue;
        const raw = el.textContent.replace(/[₹,\s]/g, "").replace(/\..*/,"").trim();
        if (raw && /^\d+$/.test(raw)) { price = raw; break; }
      }

      // MRP (struck-through price)
      let mrp = "";
      const mrpSelectors = [
        ".a-text-price[data-a-strike] .a-offscreen",
        ".a-text-price .a-offscreen",
      ];
      for (const sel of mrpSelectors) {
        const el = cell.querySelector(sel);
        if (!el) continue;
        const raw = el.textContent.replace(/[₹,\s]/g, "").replace(/\..*/,"").trim();
        if (raw && /^\d+$/.test(raw)) { mrp = raw; break; }
      }

      // Rating
      let rating = "";
      const ratingEl =
        cell.querySelector(".a-icon-alt") ||
        cell.querySelector("[aria-label*='out of 5']");
      if (ratingEl) {
        const src = ratingEl.textContent || ratingEl.getAttribute("aria-label") || "";
        const m = src.match(/[\d.]+/);
        if (m) rating = m[0];
      }

      // Reviews
      let reviews = "";
      const revEl =
        cell.querySelector(".a-size-small .a-link-normal") ||
        cell.querySelector("[aria-label*='ratings']") ||
        cell.querySelector("[aria-label*='reviews']") ||
        cell.querySelector(".a-size-small[href*='customerReviews']");
      if (revEl) {
        const src = revEl.textContent || revEl.getAttribute("aria-label") || "";
        const m = src.replace(/,/g, "").match(/\d+/);
        if (m) reviews = m[0];
      }

      // Brand (not always available in listings)
      let brand = "";
      const brandEl =
        cell.querySelector(".a-size-small.a-color-secondary") ||
        cell.querySelector("[class*='brandSnippet']");
      if (brandEl) {
        const t = brandEl.textContent.trim();
        if (t && t.length < 50 && !isPriceLike(t)) brand = t;
      }

      // Image — prefer high-res, upgrade to _SL1500_
      let imageUrl = "";
      const imgEl =
        cell.querySelector("img.s-image") ||
        cell.querySelector("img.p13n-product-image") ||
        cell.querySelector("img[src*='images-amazon']") ||
        cell.querySelector("img");
      if (imgEl) {
        imageUrl =
          imgEl.getAttribute("data-old-hires") ||
          imgEl.getAttribute("data-a-hires") ||
          imgEl.getAttribute("src") ||
          "";
        imageUrl = upgradeImage(imageUrl);
      }

      // Bestseller rank
      let rank = "";
      const rankEl =
        cell.querySelector(".zg-bdg-text") ||
        cell.closest("[class*='zg-item']")?.querySelector(".zg-bdg-text");
      if (rankEl) rank = rankEl.textContent.replace(/[^0-9]/g, "").trim();

      products.push({
        asin,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        availability: "In Stock",
        category: pageCategory,
        imageUrl,
        affiliateUrl: `https://www.amazon.in/dp/${asin}/?tag=adfirststore-21`,
        bullets: "",
        rank,
        url: `https://www.amazon.in/dp/${asin}/`,
        scrapedAt: new Date().toISOString(),
      });
    }

    if (!products.length) return;

    chrome.runtime.sendMessage({ type: "ADD_PRODUCTS_BATCH", products }, (res) => {
      if (chrome.runtime.lastError) return;
      showToast(
        `✓ Captured ${products.length} products` +
          (pageCategory ? ` · ${pageCategory}` : "") +
          ` · Total: ${res?.total || "?"}`
      );
    });
  }

  function showToast(msg) {
    const existing = document.getElementById("__amz_scraper_toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "__amz_scraper_toast";
    toast.textContent = msg;
    toast.style.cssText = [
      "position:fixed", "bottom:20px", "right:20px", "z-index:999999",
      "background:#131921", "color:#FF9900", "font-family:Arial,sans-serif",
      "font-size:13px", "padding:12px 18px", "border-radius:8px",
      "box-shadow:0 4px 24px rgba(0,0,0,.5)", "max-width:420px",
      "border-left:3px solid #FF9900", "line-height:1.5",
    ].join(";");
    document.body.appendChild(toast);
    setTimeout(() => toast?.remove(), 5000);
  }
})();
