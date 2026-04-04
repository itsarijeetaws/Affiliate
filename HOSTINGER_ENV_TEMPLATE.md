# Hostinger One-App Environment Template

Use these variables in Hostinger for the single-application deployment mode.

## Required

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/affiliate_db
JWT_SECRET=replace_with_long_random_secret
AUTOMATION_API_KEY=replace_with_long_random_key

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_EMAILS=admin@yourdomain.com,second-admin@yourdomain.com
ADMIN_PASSWORD=replace_with_strong_password

FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
INTERNAL_API_URL=http://127.0.0.1:3000

ENABLE_DAILY_CRON=true
```

## Optional (recommended)

```env
REDIS_URL=redis://127.0.0.1:6379

WORDPRESS_BASE_URL=https://cms.yourdomain.com
WORDPRESS_USERNAME=wp_api_user
WORDPRESS_APP_PASSWORD=wp_application_password

AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_PARTNER_TAG=
AMAZON_REGION=us-east-1
```

## Notes

- Keep `NEXT_PUBLIC_API_URL` on your public domain for browser requests.
- Keep `INTERNAL_API_URL` on local loopback for server-side Next fetches.
- `ADMIN_EMAILS` controls who is treated as an admin after login or registration.
- `ADMIN_PASSWORD` is kept as a bootstrap fallback for the first admin login if that admin account has not been registered yet.
- Rotate `JWT_SECRET`, `AUTOMATION_API_KEY`, and any bootstrap admin password after first deployment.
