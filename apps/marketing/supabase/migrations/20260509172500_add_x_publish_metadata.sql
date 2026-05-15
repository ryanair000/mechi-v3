alter table public.content_items
  add column if not exists twitter_post_text text,
  add column if not exists twitter_post_id text,
  add column if not exists twitter_post_url text,
  add column if not exists twitter_last_error text,
  add column if not exists twitter_posted_at timestamptz;
