This `supabase/` directory is for the standalone marketing dashboard project only.

Use the SQL in `migrations/20260422000100_marketing_dashboard.sql` against the separate Supabase instance configured for `apps/marketing`.

The root Mechi app's Supabase project should remain untouched.

Recommended CLI flow from `apps/marketing`:

1. `supabase init`
2. `supabase link --project-ref <marketing-project-ref> -p <db-password>`
3. `supabase db push`
