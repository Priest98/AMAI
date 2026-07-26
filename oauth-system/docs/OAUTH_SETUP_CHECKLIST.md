# OAuth Setup Checklist

Everything below is manual configuration in the provider dashboards — none
of it can be automated from code.

## 1. Install & wire up

```bash
npm install @prisma/client
```

1. Copy `prisma/oauth-schema-addition.prisma` content into your real
   `prisma/schema.prisma` (add the `User` relation if you have a `User`
   model), then:
   ```bash
   npx prisma migrate dev --name add_connected_accounts
   npx prisma generate
   ```
2. Implement `lib/oauth/current-user.ts` → `getCurrentUserId()` against
   your real auth system. **Nothing works until this is done.**
3. Copy `.env.example` → `.env.local`, fill in every value (see sections
   below for where each one comes from), and add the same keys to your
   Vercel project's Environment Variables for Production/Preview.
4. If you already have a shared Prisma client (e.g. `lib/prisma.ts`),
   replace the `new PrismaClient()` in `lib/oauth/account-service.ts`
   with an import of that shared instance, to avoid connection-pool
   exhaustion on serverless.
5. Drop `<ConnectAccountsCard />` into your dashboard/settings page.

## 2. Meta (Instagram) App Setup

- [ ] Create an app at https://developers.facebook.com/apps → type
      **"Business"**.
- [ ] Add the **Instagram Graph API** and **Facebook Login for Business**
      products to the app.
- [ ] Under **Facebook Login → Settings**, add to *Valid OAuth Redirect
      URIs*:
      `https://marketing-os-eight-virid.vercel.app/api/oauth/instagram/callback`
- [ ] Under **App Settings → Basic**, set *App Domains* to
      `marketing-os-eight-virid.vercel.app`, and copy the **App ID** /
      **App Secret** into `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET`.
- [ ] Request these scopes under **App Review → Permissions**:
      `instagram_basic`, `instagram_manage_comments`,
      `instagram_manage_insights`, `pages_show_list`,
      `business_management` (adjust to what you actually use — every
      scope you request has to be justified in App Review).
- [ ] **Development mode**: works immediately for accounts added as
      Admins/Developers/Testers under **Roles**. Good enough for building
      and testing.
- [ ] **Live mode**: requires:
  - App Review approval for every advanced permission above (screen
    recording + written use-case justification per permission).
  - Business verification of the Meta Business account that owns the app.
  - A live Privacy Policy URL and (if collecting sensitive data) Data
    Deletion callback URL, both set under **App Settings → Basic**.
- [ ] Note: Instagram accounts must be **Business or Creator** accounts
      linked to a **Facebook Page** — personal IG accounts cannot connect
      via this flow. Surface this requirement in your UI.

## 3. TikTok App Setup

- [ ] Create an app at https://developers.tiktok.com/apps.
- [ ] Under **Login Kit**, add redirect URI:
      `https://marketing-os-eight-virid.vercel.app/api/oauth/tiktok/callback`
- [ ] Copy **Client Key** / **Client Secret** into `TIKTOK_CLIENT_KEY` /
      `TIKTOK_CLIENT_SECRET`.
- [ ] Add the products/scopes you need, e.g. `user.info.basic` (Login
      Kit) and `video.publish` / `video.upload` (Content Posting API) —
      each product must be added explicitly in the portal before its
      scope will work.
- [ ] **App Review**: TikTok requires review before scopes beyond basic
      login work in production — submit with a demo video showing the
      exact OAuth flow and what the requested scope is used for.
- [ ] **Production requirements**: your redirect URI's domain must be
      verified — this is the "URL properties" verification you were
      already working through for
      `marketing-os-eight-virid.vercel.app`. Both the domain-verification
      step and this OAuth Login Kit config are independent and both
      required.
- [ ] Sandbox/unaudited apps are capped to a small number of test users
      (added by TikTok user ID under **Sandbox**) until review passes.

## 4. Testing checklist

Run through each of these against sandbox/dev credentials before
touching production:

- [ ] First-time connect (Instagram, then TikTok)
- [ ] Reconnect flow (disconnect, then connect again)
- [ ] User denies permission on the provider consent screen → app shows
      a clean error, not a crash
- [ ] Tamper with `state` param manually → request is rejected
- [ ] Expired `state` (wait >10 min) → rejected with a clear error
- [ ] Force early token expiry (or just wait) → `getValidAccessToken`
      transparently refreshes
- [ ] Invalid authorization `code` replayed twice → second attempt fails
      cleanly
- [ ] Network failure mid-exchange (kill wifi mid-flow) → user sees a
      retry option, no half-written DB row
- [ ] Connect two different TikTok accounts to the same user → both
      appear in `/api/oauth/status`
- [ ] Disconnect → tokens are actually scrubbed from the DB row (check
      manually first time)
- [ ] Log out and back in as a different user → they don't see the first
      user's connections
