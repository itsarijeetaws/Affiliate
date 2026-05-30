# BestBuysIndia — Session Notes (Live State)

**Last Updated**: 2026-05-30  
**Site**: bestbuysindia.com  
**Server**: Ampere VPS — restart via cPanel  
**Repo**: ~/Affiliate on server (git pull + npm run build --workspace=backend + cPanel restart)  
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
| Restart method | cPanel (after git pull + build) |
| App dir | `~/Affiliate` |
| Backend build | `cd backend && npm run build` (NOT `npm run build --workspace=backend` from root) |
| Background script | `nohup npx tsx scripts/SCRIPT.ts > /tmp/log.log 2>&1 &` |
| DB access | cPanel phpMyAdmin or SSH mysql |

---

## LLM API (Active)

| Key | Value |
|-----|-------|
| Provider | Google Gemini |
| Model | `gemini-2.5-flash` (2.0-flash deprecated for new keys) |
| Key | Set in `.env` on server — never commit to repo |
| Env var | `GEMINI_API_KEY` in `~/Affiliate/backend/.env` |
| Anthropic | No longer needed — `ANTHROPIC_API_KEY` can be removed |

**LLM files using Gemini:**
- `backend/src/services/gemini.service.ts` — service layer (automation endpoints)
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
- `telegram-post` → FIXED (inlined cron, no subprocess — commit 9893a5b)
- `pinterest-post` → BLOCKED (Trial access, pending Standard upgrade)

### Telegram Posting Tracker
- Posted slugs tracked in `backend/.telegram-posted.json`
- `deal:YYYY-MM-DD` key prevents duplicate deal posts per day
- Max 3 guides per run

### Pinterest Status
- Full implementation deployed (service + job + cron + admin route)
- Tokens set in `.env` with correct scopes (boards:read boards:write pins:read pins:write)
- Board ID: `1011339728761248225`
- **Blocked**: Trial access returns 403. Must apply for Standard access at developers.pinterest.com

---

## Amazon PA API Status

- Credentials in `.env`: `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_PARTNER_TAG=adfirststore-21`
- **BLOCKED**: Needs 10 qualifying sales — currently ~2/10
- Test: `GET /automation/test-amazon` with `x-automation-api-key` header

---

## MRP Fetch Status

Script: `backend/scripts/fetch-mrp.ts`
- Only updates products where `mrp IS NULL OR mrp = 0`
- Scrapes Amazon strikethrough price, validates `mrp > current_price`
- **CAPTCHA blocks after ~200-300 products** — re-run in batches

```bash
cd ~/Affiliate/backend
nohup npx tsx scripts/fetch-mrp.ts > /tmp/mrp-fetch.log 2>&1 &
tail -f /tmp/mrp-fetch.log
```

**Current run (2026-05-30)**: Running — 1088 products need MRP. Check progress with `tail -20 /tmp/mrp-fetch.log`.

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
- 4 gaming monitors (ids 4709-4711, 4719) already deleted ✅

### Zero-Price Products (already hidden from frontend — price>0 filter active)
IDs still in DB: `3632, 3751, 4647, 4658, 4839, 5664, 6014, 6044, 6355, 6465`
Will recover via fetch-mrp. Delete after run if still 0.

### Blog Guides Cleanup
- 34 old 2025 guides still in DB (duplicate of 2026 versions)
- Safe to delete now: `DELETE FROM blogpost WHERE slug LIKE '%-india-2025';`

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
| `backend/src/jobs/daily-price-cron.ts` | Cron scheduler — price update + Telegram + Pinterest |
| `backend/src/services/gemini.service.ts` | LLM service (Gemini 2.5 Flash primary) |
| `backend/src/services/telegram.service.ts` | Telegram Bot API |
| `backend/src/services/pinterest.service.ts` | Pinterest API v5 |
| `backend/src/jobs/pinterest-auto-post.ts` | Pinterest auto-post job |
| `backend/scripts/fetch-mrp.ts` | Scrape MRP from Amazon |
| `backend/scripts/generate-buying-guides.ts` | Generate blog guides via Gemini |
| `backend/scripts/generate-product-content.ts` | Generate product desc/pros/cons |
| `backend/scripts/generate-category-descriptions.ts` | Generate category descriptions |
| `backend/scripts/import-products.ts` | Bulk product import + content gen |
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
- **ISR caching**: product=900s, category=1800s, blog/top=3600s, homepage=force-dynamic, search=force-dynamic
- **Carousel auto-slide**: 3.5s interval, pauses on hover, wraps to start
- **Category pagination**: 24/page with prev/next + page numbers (both search + category pages)
- **Search**: Server-side pagination + sort (rating, price-asc, price-desc), category filter via header dropdown
- **No subprocess in cron**: All cron work done inline with Drizzle, no `execSync`

---

## Completed (2026-05-29 → 2026-05-30)

- ✅ MRP cleanup SQL — 23 corrupt MRPs reset to 0
- ✅ Price fixes: iQOO Z10 Lite ₹13,999, realme NARZO 90x ₹16,999
- ✅ Dynamic homepage carousels (sort=random + RAND())
- ✅ Pinterest full implementation deployed
- ✅ Blog guides: content updated 2025→2026, 60 guides in DB
- ✅ Category page meta title: "2025" → "2026"
- ✅ Carousel auto-slide (3.5s, pause on hover)
- ✅ health-beauty carousel added to homepage
- ✅ Price>0 filter on all public product queries
- ✅ Synthetic reviewCount → ratingCount with smaller multiplier
- ✅ 4 gaming monitors deleted (home-audio cleanup)
- ✅ ISR revalidation on product/category/blog/top pages
- ✅ ShareButtons component (WhatsApp + X + copy link) on product + blog pages
- ✅ Category pagination (24/page) on category + search pages
- ✅ BountyBanner moved mid-funnel (after Shop by Category)
- ✅ Article schema author URL added
- ✅ Search page: server-side pagination + sort + category filter tabs
- ✅ Header category dropdown: wired to search URL, z-index fix, scroll-to-top on open
- ✅ Backend search: combined category+query case added
- ✅ Gemini migration: all LLM calls switched from Anthropic SDK to Gemini 2.5 Flash
- ✅ Product content generated for 4 new products
- ✅ MRP fetch running (1088 products, check `/tmp/mrp-fetch.log`)

---

## Pending Tasks (Priority Order)

1. [ ] MRP fetch — monitor `/tmp/mrp-fetch.log`, re-run when CAPTCHA blocks
2. [ ] Fix 6 ASIN mismatches (verify on Amazon first — see above)
3. [ ] home-audio cleanup: delete guitar strings/ghungroos, fix JBL price
4. [ ] Delete 34 old 2025 blog guides: `DELETE FROM blogpost WHERE slug LIKE '%-india-2025';`
5. [ ] Delete TCL 75V6B (OOS): `DELETE FROM product WHERE id=3307;`
6. [ ] FULLTEXT INDEX: `ALTER TABLE product ADD FULLTEXT idx_search (name, description);`
7. [ ] Pinterest Standard access — apply at developers.pinterest.com (video demo required)
8. [ ] Rainforest API integration for ASIN import pipeline
9. [ ] Wait for 8 more Amazon PA API qualifying sales (~2/10 currently)
10. [ ] Zero-price products cleanup after MRP fetch completes
