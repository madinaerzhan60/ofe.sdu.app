-- PostgreSQL bounds in regular expressions cannot exceed 255. Keep the
-- existing HTTPS and character restrictions, with the 3-500 character suffix
-- enforced separately from the regular expression (8 characters for https://).
alter table public.event_teams
  drop constraint event_teams_product_url_check,
  add constraint event_teams_product_url_check check (
    product_url is null
    or (
      product_url ~ '^https://[^[:space:]<>"]+$'
      and char_length(product_url) between 11 and 508
    )
  );
