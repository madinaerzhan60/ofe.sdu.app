-- Supabase's ordinary update route authorizes an UPSERT. Its permission
-- probe evaluates both INSERT and UPDATE RLS with object.upload_update.
drop policy startup_media_owner_insert on storage.objects;
create policy startup_media_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'startup-media'
  and storage.allow_any_operation(array['object.upload', 'object.upload_update'])
  and split_part(name, '/', 1) = (select auth.uid())::text
  and exists (
    select 1
    from public.projects project
    where project.id = split_part(name, '/', 2)
      and project.owner_id = (select auth.uid())
      and name in (
        (select auth.uid())::text || '/' || project.id || '/logo.webp',
        (select auth.uid())::text || '/' || project.id || '/cover.webp'
      )
      and not (
        project.data->>'status' = 'Approved'
        and project.data->>'visible' = 'true'
        and (select private.project_has_current_consent(project.id))
      )
  )
);
