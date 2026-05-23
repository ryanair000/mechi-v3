# Mechi.club Website Review And Roadmap

Date: 2026-05-24 EAT
Owner: Mechi COO
Scope: live `https://mechi.club`, the supplied deep research report, and the local Next.js repo.

## Executive Read

Mechi.club has the hard part: a real brand, real tournament product, real payment/support paths, and a voice that feels native to gaming. The biggest issue is not brand strength. The issue is public clarity.

The site is currently trying to be four things at once:

- A regional Mechi platform homepage.
- A current Weekend Cup conversion surface.
- A legacy PlayMechi tournament archive.
- A logged-in app shell for tournaments, bounties, rewards, and player activity.

That mix creates trust and conversion drag. A new player can see the energy, but they have to work too hard to understand what is live now, what costs money, which event they should join, and which pages are public versus app-only.

Recommended strategic direction:

1. Make Weekend Cup the first public business objective until the event closes.
2. Make `/tournaments`, `/bounties`, and `/pricing` crawlable public marketing pages with app CTAs, not app-shell leftovers.
3. Add the missing SEO foundation: `robots.txt`, `sitemap.xml`, canonical coverage, structured data, and locale/hreflang rules.
4. Reduce visual and route ambiguity so every top nav and footer link answers a user question or moves conversion forward.
5. Instrument the funnel so marketing spend can be judged by registration/payment completion, not clicks alone.

## Verified Live Findings

The earlier research report is directionally right, but some live state has changed.

Confirmed improvements since the report:

- `https://mechi.club/` now redirects to `/ke` from this environment, instead of the older `/usa` split reported previously.
- `https://www.mechi.club/` now appears aligned to the same app host behavior rather than serving a totally separate homepage.
- `/pricing` now renders meaningful public content.
- The Weekend Cup page is now a real public campaign page with game cards, dates, entry fees, and registration CTAs.
- Security headers are implemented in repo config, including CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.

Still confirmed as high-risk:

- `/tournaments` returns a 200 page but shows only `Loading your arena...` in direct render.
- `/bounties` returns a 200 page but shows only `Loading your arena...` in direct render.
- `/robots.txt` returns 404.
- `/sitemap.xml` returns 404.
- Several important public pages have no canonical output.
- No JSON-LD structured data was detected in sampled public HTML.
- The public home still leads with broad "Compete. Win Prizes. Level Up." messaging while the current operational priority is Weekend Cup.
- Footer links include app-like surfaces such as Bounties that do not yet provide public value when unauthenticated.
- The top nav uses compact labels like `CUP`, `PLATFORM`, `REGISTER`, and `TOURNAMENTS`; these are stylish but not always self-explanatory for cold traffic.

## Lighthouse Snapshot

Synthetic Lighthouse was run against `https://mechi.club/weekendcup`.

Results:

- Performance: 44
- Accessibility: 98
- Best Practices: 100
- SEO: 100 for that single page
- LCP: 6.1s
- FCP: 4.1s
- TTI: 6.7s
- Total Blocking Time: 1,090ms
- CLS: 0
- Total byte weight: 869 KiB
- Unused JavaScript estimated savings: 257 KiB

Interpretation:

The page is visually and semantically solid, but slow to first useful paint in lab conditions. The server response is fine; the drag is likely client-side JavaScript, hero/media handling, and route-level client components. Weekend Cup is conversion-critical, so performance work belongs in the first sprint.

## Product And Conversion Diagnosis

### What Works

- The brand has personality and momentum.
- Weekend Cup has strong raw conversion ingredients: clear dates, prize pool, entry prices, game-specific links, and support links.
- The site has visible legal pages and support surfaces.
- Pricing now explains free, Pro, and Elite in a usable way.
- Region-specific pages exist for Kenya, Tanzania, Uganda, and USA.
- The repo already contains GA, PostHog, Sentry, CSP, HSTS, Paystack paths, and tournament data structures.

### What Hurts Conversion

- The first page is not focused enough on the current event.
- New players see multiple event brands: PlayMechi Launch, Weekend Cup, Weka Mawe Weekly.
- Legacy PlayMechi registration still looks joinable even though operations say the older event is closed.
- `/tournaments` should be one of the strongest public pages, but it is currently app-shell/loading-first.
- `/bounties` creates a trust gap because it is linked publicly but renders as an arena loader.
- `/weekendcup/register` says `Registration is opening.` as the H1 in direct HTML, while the visible app flow sells active registration.
- The USA lane copy may confuse Kenyan/East African acquisition when the current event uses KSh and EAT.
- Payment and prize eligibility details exist, but need to be more prominent before the user commits.

## Technical Diagnosis

### Next.js And Rendering

The repo is on Next.js 16.2.6. The local docs confirm that metadata should be handled with the App Router Metadata API, and that robots/sitemap can be implemented through file conventions. The repo already uses this pattern in parts of the app, but coverage is incomplete.

Key code observations:

- Root metadata is dynamic and regional: `src/app/layout.tsx`.
- Public regional routing is handled in `src/proxy.ts`.
- Root `/` redirects to an IP-derived region or defaults to Kenya.
- `/pricing` is a client component and direct HTML now includes meaningful content.
- `/tournaments` and `/bounties` live under `src/app/(app)` and still behave like app pages even though proxy treats them as public.
- `src/app/(app)/layout.tsx` is `force-dynamic`, which can keep app pages from becoming reliable static marketing surfaces.
- There is no `src/app/robots.ts` or `src/app/sitemap.ts`.

### SEO

The core SEO risk is not one bad title. It is inconsistent indexability.

Highest-impact gaps:

- Missing robots and sitemap.
- Public linked pages that render loader-only content.
- No detected JSON-LD for organization, website, event, FAQ, or breadcrumbs.
- No canonical on several key routes: `/weekendcup`, `/pricing`, `/tournaments`, `/bounties`, `/playmechi`.
- Regional pages have canonical tags but no full hreflang strategy was observed.
- Some default titles remain generic: `Mechi | Compete. Connect. Rise.`

### Performance

The largest local assets are:

- `public/images/playmechi/leaderboard/pubgm-winners.png`: about 2.4 MB
- `public/images/playmechi/leaderboard/codm-winners.png`: about 2.3 MB
- `public/images/playmechi/leaderboard/efootball-winners.png`: about 2.3 MB
- `public/images/playmechi/playmechi-tournament-poster.png`: about 2.1 MB
- `public/images/weekendcup/season-1-promo.png`: about 1.8 MB
- `public/images/playmechi/weka-mawe-weekly-poster.png`: about 1.8 MB
- `public/images/playmechi/weekend-cup-poster.png`: about 1.3 MB

The Weekend Cup lab result says the page is not payload-enormous, but it is still slow to paint. The probable path is to optimize both JavaScript and image priority.

### Accessibility

Lighthouse scored Weekend Cup accessibility at 98, and snapshots show many images have useful alt labels. The remaining concern is the homepage leaderboard animation, which exposes repeated single letters in the accessibility snapshot. That may be visually clever, but it is noisy for assistive tech and should be hidden or replaced with semantic text.

## Recommended Public Information Architecture

For the next 30 days, Mechi.club should use this public hierarchy:

- `/` -> current regional home, but dominated by Weekend Cup while active.
- `/weekendcup` -> main campaign page.
- `/weekendcup/register` -> registration and payment start.
- `/weekendcup/t/[game]` -> game detail pages.
- `/tournaments` -> public tournament index, showing Weekend Cup first and legacy events as closed/previous.
- `/pricing` -> platform pricing, secondary to Weekend Cup.
- `/how-mechi-works` -> simple trust explainer.
- `/support` -> player help and WhatsApp support.
- `/privacy-policy`, `/terms-of-service`, `/user-data-deletion` -> legal trust.

App-only surfaces should stay behind auth or be clearly framed as app features:

- `/dashboard`
- `/rewards`
- `/bounties` unless redesigned as a public bounty explainer/index
- `/streams`
- `/lobbies`
- `/challenges`

## SMM Publisher Feature Notes

The SMM post editor should support richer Instagram publishing controls before it becomes the main operator workflow.

Recommended additions:

- Collaborator tagging: add an Instagram-only field for up to 3 collaborator usernames. Validate as handles, show that collaborators must accept the invite in Instagram, and keep this separate from ordinary `@mentions` in captions.
- Tagged users: add media user tags where supported, especially for images, videos, Reels, and Stories. Keep coordinate tagging optional so operators can publish quickly.
- Location: add an optional location field backed by a Facebook/Instagram place ID lookup. Store both the display name and the platform ID so scheduled posts do not depend on a later search result.
- Other option: add an `Other` target/metadata option for posts that need manual follow-up, unsupported channels, or custom operator instructions. This should not silently publish anywhere; it should create a clear manual task.
- Music/audio: treat as limited support. The Instagram API supports original audio naming for Reels, but selecting licensed or trending Instagram music is not reliably available through the official publishing API. For now, support uploaded/original audio in the video file and an optional `audio_name`; use a manual reminder when a Reel needs native Instagram music.

Operational note:

- For Mechi campaign posts, collaborator, location, and music fields should be optional and platform-scoped so Facebook, X, WhatsApp, Discord, or manual channels do not receive unsupported metadata.

## Highest-Priority Recommendations

### 1. Make Weekend Cup The Homepage Campaign

Change the above-fold homepage from a broad platform promise to:

Headline:
PlayMechi Weekend Cup Season 1

Supporting copy:
PUBG Mobile, CODM, eFootball, and Free Fire. 29-31 May 2026. Entry from KSh 50. Prize pool up to KSh 10,500.

Primary CTA:
Register for Weekend Cup

Secondary CTA:
See game schedule

Keep the brand voice, but make the current offer impossible to miss.

Impact: very high
Effort: medium

### 2. Fix `/tournaments` As A Public Tournament Index

The public tournament index should render without auth and without waiting on client-only data.

Minimum content:

- Weekend Cup card: open, dates, games, prize pool, entry fee, CTA.
- Legacy PlayMechi Launch card: previous/closed, results or archive CTA.
- Weka Mawe card: coming soon or active only if current.
- Empty states that never say "Start one and bring your scene in" to a player.

Technical approach:

- Move the public route out of `(app)` or bypass the app shell for public route rendering.
- Use server-rendered tournament facts from `src/lib/weekend-cup.ts` and `src/lib/tournament-facts.ts`.
- Fetch live open tournaments only as enhancement, not as the reason the page exists.

Impact: very high
Effort: medium

### 3. Fix `/bounties` Or Remove It From Public Navigation

Two acceptable options:

Option A: public bounties page

- Explain what bounties are.
- Show active bounties if public.
- Show recent winners if safe.
- CTA to sign in or register.

Option B: remove public links

- Keep `/bounties` app-only.
- Remove from footer until a public page exists.
- Redirect anonymous visitors to `/login?next=/bounties` with a clear notice.

Impact: high
Effort: low to medium

### 4. Add Robots, Sitemap, Canonicals, And Structured Data

Add:

- `src/app/robots.ts`
- `src/app/sitemap.ts`
- page-level `alternates.canonical` for every indexable route
- JSON-LD for `Organization`, `WebSite`, `Event`, `BreadcrumbList`, and selected FAQ blocks

For regional pages, define the canonical strategy:

- If `/ke`, `/tz`, `/ug`, `/usa` are truly regional variants, keep them indexable and add hreflang.
- If they are not ready for acquisition, noindex weaker variants temporarily and focus `/ke` plus Weekend Cup.

Impact: high
Effort: medium

### 5. Clean Up Legacy Event State

The older PlayMechi event should not look like a current registration lane.

Change:

- `/playmechi/register` should show `Registration closed` and route users to `/weekendcup`.
- `/playmechi` should clearly say previous launch event unless it is intentionally being reused.
- Support docs and public copy should point generic tournament registration to `/weekendcup`.

Impact: high
Effort: low

### 6. Improve Registration Trust Before Payment

Before payment, players should see:

- Game selected.
- Date and time in EAT.
- Entry fee.
- Prize summary.
- Rules summary.
- What happens after payment.
- Refund/dispute support path.
- WhatsApp support link.

The current Weekend Cup page has much of this, but the registration page needs the same clarity in its first screen.

Impact: high
Effort: medium

### 7. Reduce Client JavaScript On Marketing Pages

Targets:

- Homepage.
- `/weekendcup`.
- `/pricing`.
- `/tournaments`.
- `/how-mechi-works`.

Actions:

- Keep static copy and cards as Server Components.
- Move voting, auth-aware state, and refresh buttons into small client islands.
- Do not mount app providers or auth refresh on pages where anonymous users do not need them.
- Review large animation components and carousels.

Impact: high
Effort: medium to high

### 8. Make Measurement Actionable

Keep GA and PostHog, but define events:

- `homepage_weekendcup_cta_click`
- `weekendcup_game_card_click`
- `registration_started`
- `registration_game_selected`
- `payment_started`
- `payment_completed`
- `payment_failed`
- `support_whatsapp_click`
- `pricing_plan_cta_click`
- `tournament_detail_viewed`
- `legacy_event_redirected_to_weekendcup`

Then build a simple weekly report:

- Sessions by landing page.
- CTA rate.
- Registration start rate.
- Payment start rate.
- Paid registration completion rate.
- Top drop-off page.
- WhatsApp support click rate.

Impact: high
Effort: medium

## 30-Day Execution Plan

### Day 1-2: Critical Public Hygiene

- Add robots and sitemap.
- Add canonical metadata for Weekend Cup, pricing, support, playmechi, tournaments, bounties, legal pages.
- Remove or repair footer links that go to loader-only pages.
- Change `/playmechi/register` to closed state and route to Weekend Cup.
- Fix invalid Weekend Cup detail slugs so bad URLs return a true 404 experience.

Definition of done:

- No public footer/top-nav link lands on a loader-only page.
- `https://mechi.club/robots.txt` returns 200.
- `https://mechi.club/sitemap.xml` returns 200.
- Legacy registration does not invite new users into a closed event.

### Day 3-5: Tournament Conversion Surface

- Rewrite home hero around Weekend Cup.
- Make `/tournaments` a public server-rendered index.
- Add public event cards for Weekend Cup, previous PlayMechi, and Weka Mawe.
- Add game-specific detail cards with dates, fees, prizes, rules, and register CTAs.
- Make `/weekendcup/register` first screen match active registration state.

Definition of done:

- A new player can answer: what is live, what does it cost, when is it, what can I win, and where do I register.
- `/tournaments` has H1, content, cards, and CTAs before JavaScript.

### Day 6-8: SEO And Sharing

- Add JSON-LD for Weekend Cup as `Event`.
- Add `Organization` and `WebSite` JSON-LD globally.
- Add `BreadcrumbList` where breadcrumbs are visible.
- Add page-specific OG images for Weekend Cup and game detail pages.
- Add hreflang or make a deliberate noindex decision for weaker regional variants.

Definition of done:

- Rich Results Test validates Event structured data.
- Shared links have correct title, description, and image.
- Sitemap includes only intended public URLs.

### Day 9-12: Performance

- Convert oversized PNGs to WebP/AVIF where appropriate.
- Audit hero image priority and sizes.
- Split client-only interactions from static sections.
- Reduce carousel/animation impact on first load.
- Run Lighthouse on `/`, `/weekendcup`, `/weekendcup/register`, `/pricing`, `/tournaments`.

Targets:

- Weekend Cup performance score above 70.
- LCP under 3.5s in lab, then monitor field data toward 2.5s.
- TBT under 300ms.
- CLS stays under 0.1.

### Day 13-16: Accessibility And Trust

- Hide decorative split-letter animation from screen readers.
- Validate keyboard navigation on home, Weekend Cup, registration, pricing, support.
- Check color contrast in light and dark themes.
- Add clear error and pending states for payment/registration.
- Make WhatsApp support CTAs explicit but not overwhelming.

Definition of done:

- Keyboard-only user can complete the registration path up to external payment.
- Lighthouse accessibility remains 95+ on main public pages.

### Day 17-21: Analytics And Ops Dashboard

- Implement the event taxonomy above.
- Add safe query-param scrubbing to all analytics paths.
- Build a weekly conversion query/report.
- Route support-click and payment-failure insights to operator review.

Definition of done:

- Boss can see landing page sessions, registration starts, payment starts, payment completions, and drop-off.

### Day 22-30: Growth Readiness

- Write campaign landing copy variants for Kenya/Tanzania/Uganda.
- Create event-specific social landing URLs with UTM conventions.
- Build an FAQ block for parents/sponsors/new players.
- Add result/archive pages after tournament completion.
- Prepare post-event loop: winners, clips, leaderboard, next event CTA.

Definition of done:

- Paid/social traffic has a coherent landing path.
- After Weekend Cup ends, the homepage can switch from registration to results and Season 2 waitlist without a rebuild scramble.

## Owners

- Repo engineering: rendering, metadata, sitemap, route cleanup, performance.
- Growth: homepage copy, campaign CTAs, UTM discipline, social-to-site messaging.
- Data: GA/PostHog dashboard, funnel reporting, Search Console monitoring.
- Operations: event truth, registration status, payment wording, support scripts.
- Boss approval required: public event wording if prize, payment, refund, or eligibility rules change.

## Success Metrics

Primary:

- Weekend Cup registration completion rate.
- Paid registration completion rate.
- Homepage to Weekend Cup CTA click-through rate.
- `/weekendcup/register` payment-start rate.

Secondary:

- Organic indexed pages.
- Search Console impressions for PlayMechi, Mechi tournament, Weekend Cup, PUBG Mobile Kenya tournament, CODM Kenya tournament, eFootball Kenya tournament.
- Support WhatsApp click rate.
- Lighthouse LCP/TBT improvements.
- Public route meaningful-render rate: 100%.

## Source Notes

- Supplied report: `C:\Users\ADMIN\Downloads\deep-research-report.md`
- Root metadata and analytics: `src/app/layout.tsx`
- Regional routing and public/protected rules: `src/proxy.ts`
- Weekend Cup public page: `src/app/weekendcup/page.tsx`
- Weekend Cup game pages: `src/app/weekendcup/t/[game]/page.tsx`
- Pricing page: `src/app/pricing/page.tsx`
- Tournaments app route: `src/app/(app)/tournaments/page.tsx`
- Bounties app route: `src/app/(app)/bounties/page.tsx`
- Footer links: `src/components/ui/footer.tsx`
- Local Next.js docs used: `node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md`, `node_modules/next/dist/docs/01-app/02-guides/production-checklist.md`, `node_modules/next/dist/docs/01-app/02-guides/json-ld.md`
