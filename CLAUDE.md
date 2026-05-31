# Project Memory — Amazon Affiliate Site (bestbuysindia.com)

## Deployment
- **Platform**: MilesWeb Node.js panel (PersistentApp, NOT PM2, NOT Docker)
- **Restart after build**: Click **Restart** button at `https://dashboard.mympanel.com/advanced/nodejs/`
- **Server path**: `/var/www/c56950f1-6bf0-4fc0-8b86-f5b566e1f3d2/Affiliate/`
- **Server user**: `bestbuys1@ampere`
- **Working dir on server**: `~/Affiliate/backend` (already there — never `cd backend`)
- **Startup command**: `node /var/www/.../Affiliate/backend/dist/combined-server.js`
- **Port**: 3000, Node version: Stable (v26.2.0)
- **Build command**: `npm run build` (runs `tsc`) from `~/Affiliate/backend`
- **Deploy flow**: local `git push` → server `git pull && npm run build` → click Restart in MilesWeb UI

## Database Credentials
- **Local .env**: `affiliate_user` / `affiliate_pass123` / `affiliate_db`
- **SERVER .env**: `bestbuys1_dbuser` / `yxd*$[MZ|6Gf3A1R` / `bestbuys1_DB`
- **Server socket**: `/run/mysqld/mysqld.sock`
- **Admin login**: `arijitde89@gmail.com` / `Jeet@1234`
- **Automation API key**: `adfirst-auto-2024-secure`

## Common Server Commands
```bash
# MySQL query (SERVER)
mariadb -u bestbuys1_dbuser -p'yxd*$[MZ|6Gf3A1R' bestbuys1_DB -S /run/mysqld/mysqld.sock -e "SELECT COUNT(*) FROM product;"

# Full deploy (both apps changed)
cd ~/Affiliate && git pull
cd ~/Affiliate/backend && npm run build
cd ~/Affiliate/frontend && npm run build
# → then click Restart in MilesWeb panel

# Backend only changed
cd ~/Affiliate && git pull && cd backend && npm run build
# → then Restart

# Frontend only changed
cd ~/Affiliate && git pull && cd frontend && npm run build
# → then Restart

# Run fix-wrong-prices script (background, full catalog)
cd ~/Affiliate/backend && nohup npx tsx scripts/fix-wrong-prices.ts > /tmp/price-fix.log 2>&1 &

# Tail that log
tail -f /tmp/price-fix.log

# Check product count by category
mariadb -u bestbuys1_dbuser -p'yxd*$[MZ|6Gf3A1R' bestbuys1_DB -S /run/mysqld/mysqld.sock -e \
  "SELECT c.slug, COUNT(p.id) as cnt FROM product p JOIN category c ON p.category_id=c.id GROUP BY c.slug ORDER BY cnt DESC;"

# Check wrong-looking prices (smartphones over ₹20k)
mariadb -u bestbuys1_dbuser -p'yxd*$[MZ|6Gf3A1R' bestbuys1_DB -S /run/mysqld/mysqld.sock -e \
  "SELECT p.name, p.price, p.amazon_asin FROM product p JOIN category c ON p.category_id=c.id WHERE c.slug='smartphones' AND p.price > 20000 ORDER BY p.price DESC;"
```

## Stack
- **Frontend**: Next.js 15 App Router + TailwindCSS + TypeScript
- **Backend**: Express.js + Drizzle ORM + TypeScript
- **Database**: MariaDB via Unix socket (socketPath in DATABASE_URL)
- **Node version on server**: v26.2.0

## Amazon
- **Partner tag**: `adfirststore-21`
- **Affiliate URL format**: `https://www.amazon.in/dp/{ASIN}/?tag=adfirststore-21`
- **Amazon Creators API**: OAuth2 + credential ACTIVE. Returns 500 (= not eligible yet). Need 10 shipped sales; currently **2/10** (as of 2026-05-28). 13 ordered, 2 shipped.
- **Price auto-update**: using HTML scraper until API unlocks. Scripts: `fix-wrong-prices.ts`, `fetch-mrp.ts`

## Telegram
- **Channel**: `@bestbuysindia_deals`
- **Admin Telegram ID**: `944243722`
- **Bot token**: stored in `backend/.env` as `TELEGRAM_BOT_TOKEN`
- **Post script**: `backend/scripts/telegram-post-guides.ts`
- **Cron**: runs at 4:30 UTC (10:00 AM IST) via `backend/src/jobs/daily-price-cron.ts`
- **Tracking file**: `backend/.telegram-posted.json` (gitignored)

## Database — Key Category IDs
| ID | Name | Slug | Commission |
|----|------|------|------------|
| 22 | Women's Fashion | womens-fashion | ~10% |
| 23 | Men's Fashion | mens-fashion | ~10% |
| 24 | Bags & Luggage | bags-luggage | ~10% |
| 17 | Grooming & Beauty | grooming | ~10% |
| 14 | Kitchen Appliances | kitchen-appliances | ~5% |
| 26 | Books | books | ~5% |
| 30 | Toys & Games | toys | ~4.7% |
| 20 | Baby & Kids | baby-kids | ~4.7% |
| 19 | Fitness & Sports | fitness | ~4.7% |
| 29 | Mobile Accessories | mobile-accessories | ~4% |
| 12 | Cameras | cameras | ~4% |
| 10 | Laptops | laptops | ~3.5% |
| 7  | Headphones | headphones | ~3.5% (0% sub-₹3000) |
| 16 | Smartwatches | smartwatches | ~3.5% |
| 9  | Smartphones | smartphones | ~3.5% |
| 13 | Gaming | gaming | ~3.5% |
| 31 | Office Products | office-products | ~4% |

## Content Rules — CRITICAL
- **NEVER mention commission % anywhere on the site** (no "10% commission" tags, no commission rates displayed)
- Hero banner tags: "Trending Now", "Top Picks", "New Arrivals" (not commission %)

## Key Files
- `frontend/lib/scores.ts` — **Shared scoring library** (computeExpertScore, getVerdict, getAspectScores, getWhoShouldBuy etc.) — import here, never duplicate
- `frontend/app/page.tsx` — Homepage + CAROUSEL_CONFIGS (ordered by commission rate)
- `frontend/app/category/[slug]/page.tsx` — Category pages + CATEGORY_ICONS map
- `frontend/app/product/[slug]/page.tsx` — Product page — has `id="hero-cta"` on buy wrapper, `id="bottom-cta"` on bottom CTA
- `frontend/app/methodology/page.tsx` — Review methodology page (`/methodology`)
- `frontend/app/compare/page.tsx` — Interactive compare tool (keep unchanged)
- `frontend/app/compare/[slug]/page.tsx` — SEO comparison pages (`/compare/product-a-vs-product-b`), ISR 900s
- `frontend/components/MobileStickyCTA.tsx` — Mobile sticky buy bar (md:hidden, IntersectionObserver)
- `frontend/components/RecentlyViewedTracker.tsx` — Writes product to localStorage on mount (invisible)
- `frontend/components/RecentlyViewed.tsx` — Renders recently viewed strip from localStorage
- `frontend/components/CategoryCarousel.tsx` — Horizontal carousel (auto-slide DISABLED — manual only)
- `frontend/app/admin/AdminDashboard.tsx` — Admin panel (uses category dropdown, not numeric ID)
- `frontend/app/blog/page.tsx` — Blog listing
- `backend/scripts/import-products.ts` — Bulk importer (reads `backend/data/products-to-import.json`)
- `backend/scripts/generate-buying-guides.ts` — Buying guide generator (54 guides, 2500 tokens)
- `backend/scripts/telegram-post-guides.ts` — Posts guides to Telegram channel
- `backend/scripts/create-missing-categories.ts` — One-time category creator (already run)

## Product Data
- `backend/data/products-to-import.json` — **GITIGNORED** (contains real ASINs; kept local only)
- `backend/data/products-to-import.example.json` — Template committed to git

## Categories Needing More Products (as of 2026-05-28)
- `mobile-accessories` (id=29) — newly created, 0 products
- `toys` (id=30) — newly created, 0 products
- `office-products` (id=31) — newly created, 0 products
- `bags-luggage` (id=24) — only 15 products (10% commission, should have more)

## Key Architecture Notes
- **Theme default**: Light mode (`var d=t?t==='dark':false` in anti-flash script, no `dark` on `<html>`)
- **localStorage key**: `bbiRecentlyViewed` — max 6 items, `{slug,name,price,imageUrl,amazonAsin,rating}`
- **Compare URL format**: `/compare/product-a-vs-product-b` — split on FIRST `-vs-` in slug
- **ISR**: product=900s, category=1800s, compare=900s, blog/top=3600s, homepage=force-dynamic
- **Pre-existing build issue**: `/404` prerender error in `pages/_error.js` — NOT caused by our code
- **Scoring logic**: ALWAYS import from `frontend/lib/scores.ts` — never duplicate in page files
- **Affiliate links**: use `rel="nofollow sponsored noopener"` on all Amazon links
- **CategoryCarousel auto-slide**: DISABLED — removed 2026-05-31

## Completed Work
- [x] Hero banner commission % tags removed → neutral labels
- [x] Blog dark mode contrast fixed
- [x] Category icons added (automotive, baby-kids, books, computer-peripherals, mobile-accessories, office-products, toys)
- [x] Buying guides: 54 total, 2500 tokens, truncation auto-detection
- [x] Telegram bot wired up (service + post script + cron)
- [x] Homepage carousels reordered by commission rate
- [x] 3 missing categories created in DB (mobile-accessories, toys, office-products)
- [x] Admin category dropdowns fixed (was raw numeric ID input)
- [x] products.routes.ts TS error fixed (getTableColumns)
- [x] Phase 1 Trust & Authority — /methodology page, verified dates, disclosure upgrade, related guides
- [x] Phase 2A — MobileStickyCTA, RecentlyViewedTracker, RecentlyViewed
- [x] Phase 3 SEO Compare — /compare/[slug] server pages, lib/scores.ts shared library, "vs" links on product pages
- [x] CategoryCarousel auto-slide removed
