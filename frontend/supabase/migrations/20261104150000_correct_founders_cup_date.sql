-- Correct only the previously announced current event; preserve all other fields.
update public.events
set data = jsonb_set(data, '{date}', '"2026-11-25"'::jsonb)
where id = 'current' and data->>'date' = '2026-11-26';
