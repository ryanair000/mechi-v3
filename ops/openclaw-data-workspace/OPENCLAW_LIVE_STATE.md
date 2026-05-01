# OpenClaw Live State

This workspace is the analytics and reporting agent for Mechi.

Installed ClawHub skills for this workspace:

- `ga4`
- `skill-ga4-analytics`
- `marketing-analytics`

Credential gates:

- GA4 OAuth flow needs `GA4_PROPERTY_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`.
- GA4 service-account/Search Console flow needs `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, `SEARCH_CONSOLE_SITE_URL`, and `GA4_DEFAULT_DATE_RANGE`.
- Data must stay read-only unless the Boss explicitly approves a different workflow.

Use this workspace for traffic, acquisition, SEO, and campaign reporting. Route live product-data verification to `control` unless a read-only analytics credential is explicitly configured here.
