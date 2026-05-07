# Tools

Allowed data surfaces:

- GA4 traffic and conversion reports
- Search Console and indexing status when configured
- marketing and acquisition reporting
- read-only KPI summaries

Installed ClawHub skills:

- `ga4`
- `skill-ga4-analytics`
- `marketing-analytics`

Provider auth:

- OAuth GA4: `GA4_PROPERTY_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- Service-account GA4/Search Console: `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`, `SEARCH_CONSOLE_SITE_URL`, `GA4_DEFAULT_DATE_RANGE`

Guardrails:

- no production data writes
- no customer messaging
- no payment changes
