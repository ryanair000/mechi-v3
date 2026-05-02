with battlefield_6_partner_rows as (
  select id
  from public.reward_catalog_cache
  where source = 'chezahub'
    and (
      regexp_replace(
        lower(
          coalesce(id, '') || ' ' ||
          coalesce(title, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(sku_name, '') || ' ' ||
          coalesce(margin_class, '')
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      ) ~ '(^| )(battlefield (6|vi)|bf ?6)( |$)'
    )
)
update public.reward_catalog_cache
set
  active = false,
  synced_at = coalesce(synced_at, now()),
  updated_at = now()
where id in (select id from battlefield_6_partner_rows);
