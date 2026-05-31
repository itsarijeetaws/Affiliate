# BestBuysIndia — Session Notes (Live State)

**Last Updated**: 2026-05-31
**Site**: bestbuysindia.com
**Server**: Ampere VPS — restart via MilesWeb panel
**Repo**: ~/Affiliate on server (git pull + npm run build + MilesWeb Restart)
**Note**: Scripts (tsx) need only `git pull`, no build step.

---

## Critical Rules (Never Break)

- **NEVER show commission % anywhere on site** — legal/policy constraint
- Automation API key header: `x-automation-api-key: adfirst-auto-2024-secure`
- Auth endpoint: `/auth/login` (NOT `/api/auth/login`)
- POST requests to automation need `Content-Type: application/json` + `-d '{}'` body

---

## Server & Deployment

| Item | Value |
|------|-------|
| Server | Ampere VPS |
| Restart method | MilesWeb panel → `https://dashboard.mympanel.com/advanced/nodejs/` |
| App dir | `~/Affiliate` |
| Backend build | `cd ~/Affiliate/backend && npm run build` |
| Frontend build | `cd ~/Affiliate/frontend && npm run build` |
| Background script | `nohup npx tsx scripts/SCRIPT.ts > /tmp/log.log 2>&1 &` |
| DB access | cPanel phpMyAdmin or SSH mysql |

---

## LLM API (Active)

| Key | Value |
|-----|-------|
| Provider | Google Gemini |
| Model | `gemini-2.5-flash` |
| Env var | `GEMINI_API_KEY` in `~/Affiliate/backend/.env` |

**LLM files using Gemini:**
- `backend/src/services/gemini.service.ts`
- `backend/scripts/generate-buying-guides.ts`
- `backend/scripts/generate-product-content.ts`
- `backend/scripts/generate-category-descriptions.ts`
- `backend/scripts/import-products.ts`

---

## Current Automation Status

### Cron Jobs (in `backend/src/jobs/daily-price-cron.ts`)
- **2 AM IST** — price update job (`runPriceUpdateJob()`)
- **10 AM IST (4:30 UTC)** — Telegram post (3 guides + deal of day)
- **Every 6 hours** — Pinterest auto-post (when Standard access approved)

### Last Known Automation Run Results
- `daily-price-update` → SUCCESS: `{updated: 316, skipped: 277, failed: 1071}` (CAPTCHA blocking ~80%)
- `telegram-post` → FIXED (inlined cron, no subprocess)
- `pinterest-post` → BLOCKED (Trial access, pending Standard upgrade)

---

## Amazon PA API Status

- **BLOCKED**: Needs 10 qualifying sales — currently ~2/10 (as of 2026-05-28)
- Credentials in `.env`: `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG=adfirststore-21`

---

## MRP Fetch Status

Script: `backend/scripts/fetch-mrp.ts`
- Only updates products where `mrp IS NULL OR mrp = 0`
- CAPTCHA blocks after ~200-300 products — re-run in batches

```bash
cd ~/Affiliate/backend
nohup npx tsx scripts/fetch-mrp.ts > /tmp/mrp-fetch.log 2>&1 &
tail -f /tmp/mrp-fetch.log
```

---

## Data Quality Issues (Pending)

### Fix 6 ASIN Mismatches (verify on Amazon first)
```
id=3013: OnePlus accessory  (current: B0FMDL81GS → check B0D7HZ3KK9)
id=3254: ASUS Chromebook     (current: B0GV15KBMK → check B0GN2Y3T6M)
id=3791: OnePlus Pad Go 2    (current: B0DSHZLRQB → check B0G4VNYG5N)
id=4847: MacBook Air M5      (current: B0GR1HPR1W → check B0GR1RQ144)
id=6176: Samsung accessory   (current: B0GMJLFCR7 → check B0GPPMM43R)
id=6193: Spigen              (current: B0F83SRW43 → check B0D84JFDCB)
```

### home-audio Category Cleanup (phpMyAdmin)
- Guitar strings + ghungroos → DELETE
- JBL Go 4 at ₹319 → update price to ~₹2,000+

### Zero-Price Products (hidden from frontend — price>0 filter active)
IDs still in DB: `3632, 3751, 4647, 4658, 4839, 5664, 6014, 6044, 6355, 6465`
Will recover via fetch-mrp. Delete after run if still 0.

### Blog Guides Cleanup
- 34 old 2025 guides still in DB (duplicate of 2026 versions)
- Safe to delete: `DELETE FROM blogpost WHERE slug LIKE '%-india-2025';`

### TCL 75V6B — Out of Stock
```sql
DELETE FROM product WHERE id=3307;
```

### FULLTEXT INDEX (run in phpMyAdmin)
```sql
ALTER TABLE product ADD FULLTEXT idx_search (name, description);
```

---

## Analytics

- Click tracking: `/go/:slug` → inserts into `clickEvents` table ✅
- Dashboard: `/analytics/dashboard` queries `clickEvents` ✅
- All zeros in admin = no real traffic yet (not a bug)

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/lib/scores.ts` | **Shared scoring library** — computeExpertScore, computeValueScore, getVerdict, getAspectScores, getWhoShouldBuy, getWhoShouldSkip, normalizeStringList, hasKeyword |
| `frontend/app/methodology/page.tsx` | Review methodology page (`/methodology`) — explains Expert Score formula |
| `frontend/app/compare/[slug]/page.tsx` | **SEO comparison pages** — `/compare/product-a-vs-product-b`, server-rendered, ISR 900s |
| `frontend/components/MobileStickyCTA.tsx` | Mobile sticky buy bar — IntersectionObserver on `#hero-cta` / `#bottom-cta` |
| `frontend/components/RecentlyViewedTracker.tsx` | Invisible client component — writes product to localStorage on mount |
| `frontend/components/RecentlyViewed.tsx` | Recently viewed strip — reads localStorage, empty on SSR |
| `frontend/app/product/[slug]/page.tsx` | Product page — imports from lib/scores, has `id="hero-cta"` + `id="bottom-cta"` |
| `frontend/app/page.tsx` | Homepage — RecentlyViewed before BountyBanner |
| `frontend/components/CategoryCarousel.tsx` | Horizontal carousel — **auto-slide REMOVED** (manual scroll only) |
| `backend/src/jobs/daily-price-cron.ts` | Cron scheduler — price update + Telegram + Pinterest |
| `backend/src/services/gemini.service.ts` | LLM service (Gemini 2.5 Flash primary) |
| `backend/src/services/telegram.service.ts` | Telegram Bot API |
| `backend/src/services/pinterest.service.ts` | Pinterest API v5 |
| `backend/scripts/fetch-mrp.ts` | Scrape MRP from Amazon |
| `backend/scripts/generate-buying-guides.ts` | Generate blog guides via Gemini |
| `backend/src/routes/automation.routes.ts` | All automation endpoints |
| `backend/src/routes/redirect.routes.ts` | `/go/:slug` affiliate click tracking |
| `backend/.telegram-posted.json` | Tracks posted guides/deals |
| `backend/.pinterest-posted.json` | Tracks posted product ASINs |

---

## Key Technical Decisions

- **ORM**: Drizzle (not Prisma) — schema in `backend/src/db/schema.ts`
- **DB tables**: `product`, `category`, `blogpost`, `automationlog`, `clickevent`, `emailsubscriber`
- **Auth**: JWT for admin (`/auth/login`), API key for automation (`x-automation-api-key` header)
- **LLM chain**: Gemini 2.5 Flash → Anthropic (fallback) → OpenAI (fallback)
- **Price filter**: All public product API queries filter `price > 0`
- **ISR caching**: product=900s, category=1800s, compare=900s, blog/top=3600s, homepage=force-dynamic, search=force-dynamic
- **Theme default**: Light mode (`var d=t?t==='dark':false`, no `dark` class on html)
- **localStorage key**: `bbiRecentlyViewed` (max 6 items, JSON array of `{slug,name,price,imageUrl,amazonAsin,rating}`)
- **Compare URL format**: `/compare/product-a-vs-product-b` — split on FIRST `-vs-` in slug
- **Category pagination**: 24/page with prev/next + page numbers
- **Search**: Server-side pagination + sort (rating, price-asc, price-desc), category filter
- **No subprocess in cron**: All cron work done inline with Drizzle, no `execSync`
- **Pre-existing build issue**: `/404` prerender error (`pages/_error.js useContext null`) — present before any changes, not caused by our code

---

## Transformation Project — Phase Status

### Phase 1 — Trust & Authority ✅ COMPLETE (2026-05-31, commit 26132be)
- `/methodology` page — Expert Score formula, verdict tiers, aspect scores, data sources
- "Prices verified [date]" badge on product pages using real DB `lastUpdated` field
- "How we score →" link in Expert Verdict section → /methodology
- Inline affiliate disclosure upgraded (icon + "Learn more" link)
- Related Guides section on product pages (by categoryId from blog API)
- "Review Methodology" in footer Information links
- Disclosure + Privacy dates updated 26 May 2025 → 31 May 2026

### Phase 2A — Mobile CTA + Recently Viewed ✅ COMPLETE (2026-05-31, commit a1cec0d)
- `MobileStickyCTA.tsx` — fixed bottom bar, `md:hidden`, IntersectionObserver
- `RecentlyViewedTracker.tsx` — localStorage write on product mount
- `RecentlyViewed.tsx` — reads localStorage, SSR-safe (empty initial state)
- Product page: tracker + display (excludes current) + sticky CTA
- Homepage: RecentlyViewed section before BountyBanner

### Phase 2B — Category Filters ⏳ NOT STARTED
- Backend: add `?minPrice=`, `?maxPrice=`, `?minRating=` to products.routes.ts
- Frontend: `CategoryFilters.tsx` client component + category page searchParams
- URL-driven, ISR-safe, preset budget ranges + rating tiers + sort

### Phase 3 — SEO Comparison System ✅ COMPLETE (2026-05-31, commit 561d5f9)
- `frontend/lib/scores.ts` — shared scoring library (8 exported pure functions)
- `frontend/app/compare/[slug]/page.tsx` — server-rendered, ISR 900s, dynamic metadata
- Product schemas + BreadcrumbList structured data
- Sections: Winner Summary, Price Comparison, Performance Comparison, Pros & Cons, Who Should Buy Which, Final Verdict
- "vs" compare links in product page alternatives table → discovery by Google
- `/compare` interactive tool unchanged

### Phase 4 — AI Shopping Advisor ⏳ NOT STARTED
- Budget/use-case wizard → Gemini-powered product recommendations
- New route: `/advisor`
- Multi-step: Budget → Category → Use Case → Requirements → Top 3 products

---

## Misc Fixes (2026-05-31)
- ✅ CategoryCarousel auto-slide disabled (commit af90356) — manual scroll only

---

## Completed (2026-05-29 → 2026-05-30)

- ✅ MRP cleanup SQL — 23 corrupt MRPs reset to 0
- ✅ Price fixes: iQOO Z10 Lite ₹13,999, realme NARZO 90x ₹16,999
- ✅ Dynamic homepage carousels (sort=random + RAND())
- ✅ Pinterest full implementation deployed
- ✅ Blog guides: content updated 2025→2026, 60 guides in DB
- ✅ Category page meta title: "2025" → "2026"
- ✅ health-beauty carousel added to homepage
- ✅ Price>0 filter on all public product queries
- ✅ Synthetic reviewCount → ratingCount with smaller multiplier
- ✅ 4 gaming monitors deleted (home-audio cleanup)
- ✅ ISR revalidation on product/category/blog/top pages
- ✅ ShareButtons component (WhatsApp + X + copy link) on product + blog pages
- ✅ Category pagination (24/page) on category + search pages
- ✅ BountyBanner moved mid-funnel (after Shop by Category)
- ✅ Search page: server-side pagination + sort + category filter tabs
- ✅ Header category dropdown: wired to search URL, z-index fix
- ✅ Gemini migration: all LLM calls switched from Anthropic SDK to Gemini 2.5 Flash
- ✅ MRP fetch running (1088 products)

---

## Pending Tasks (Priority Order)

1. [ ] Deploy all 2026-05-31 commits to server (git pull + frontend build + restart)
2. [ ] MRP fetch — monitor `/tmp/mrp-fetch.log`, re-run when CAPTCHA blocks
3. [ ] Phase 2B — Category Filters (backend minPrice/maxPrice/minRating + frontend FilterBar)
4. [ ] Fix 6 ASIN mismatches (verify on Amazon first — see above)
5. [ ] home-audio cleanup: delete guitar strings/ghungroos, fix JBL price
6. [ ] Delete 34 old 2025 blog guides: `DELETE FROM blogpost WHERE slug LIKE '%-india-2025';`
7. [ ] Delete TCL 75V6B (OOS): `DELETE FROM product WHERE id=3307;`
8. [ ] FULLTEXT INDEX: `ALTER TABLE product ADD FULLTEXT idx_search (name, description);`
9. [ ] Phase 4 — AI Shopping Advisor (`/advisor`)
10. [ ] Pinterest Standard access — apply at developers.pinterest.com (video demo required)
11. [ ] Rainforest API integration for ASIN import pipeline
12. [ ] Zero-price products cleanup after MRP fetch completes
13. [ ] Wait for 8 more Amazon PA API qualifying sales (~2/10 currently)
