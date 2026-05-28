# Project Memory — Amazon Affiliate Site (bestbuysindia.com)

## Deployment
- **Platform**: MilesWeb cPanel + Passenger (NOT PM2, NOT Docker)
- **Restart after build**: `touch ~/Affiliate/tmp/restart.txt` (Passenger picks it up)
- **Server path**: `/var/www/c56950f1-6bf0-4fc0-8b86-f5b566e1f3d2/Affiliate/`
- **Server user**: `bestbuys1@ampere`
- **Working dir on server**: `~/Affiliate/backend` (always already there, never `cd backend`)
- **Build command**: `npm run build` (runs `tsc`) from `~/Affiliate/backend`
- **Deploy flow**: local `git push` → server `git pull && npm run build && touch ~/Affiliate/tmp/restart.txt`

## Stack
- **Frontend**: Next.js 15 App Router + TailwindCSS + TypeScript
- **Backend**: Express.js + Drizzle ORM + TypeScript
- **Database**: MariaDB via Unix socket (socketPath in DATABASE_URL)
- **Node version on server**: v26.2.0

## Amazon
- **Partner tag**: `adfirststore-21`
- **Affiliate URL format**: `https://www.amazon.in/dp/{ASIN}/?tag=adfirststore-21`
- **Amazon Creators API**: OAuth2 works BUT returns 403 `AssociateNotEligible` (need 10 qualified sales; currently ~2)
- **Price auto-update**: blocked until API unlocks

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
- `frontend/app/page.tsx` — Homepage + CAROUSEL_CONFIGS (ordered by commission rate)
- `frontend/app/category/[slug]/page.tsx` — Category pages + CATEGORY_ICONS map
- `frontend/app/admin/AdminDashboard.tsx` — Admin panel (uses category dropdown, not numeric ID)
- `frontend/app/blog/page.tsx` — Blog listing (dark mode contrast fixed)
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
