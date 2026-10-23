-- Signed Storage tokens are redeemed with elevated service access after their
-- initial RLS check. Restrict this bucket to operations that re-check RLS on
-- every request so publication and consent changes take effect immediately.

drop policy startup_media_read on storage.objects;
create policy startup_media_read
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'startup-media'
  and storage.allow_any_operation(array[
    'object.get_authenticated',
    'object.get_authenticated_info',
    'object.head_authenticated_info',
    'object.list',
    'object.list_v2',
    'object.upload',
    'object.upload_update',
    'object.delete',
    'object.delete_many'
  ])
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.projects project
      where project.id = split_part(name, '/', 2)
        and project.owner_id = (select auth.uid())
        and name in (
          (select auth.uid())::text || '/' || project.id || '/logo.webp',
          (select auth.uid())::text || '/' || project.id || '/cover.webp'
        )
    )
    or exists (
      select 1
      from public.projects project
      where project.id = split_part(name, '/', 2)
        and split_part(name, '/', 1) = project.owner_id::text
        and name in (
          project.owner_id::text || '/' || project.id || '/logo.webp',
          project.owner_id::text || '/' || project.id || '/cover.webp'
        )
        and project.data->>'status' = 'Approved'
        and project.data->>'visible' = 'true'
        and (select private.project_has_current_consent(project.id))
    )
  )
);

drop policy startup_media_owner_insert on storage.objects;
create policy startup_media_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'startup-media'
  and storage.allow_only_operation('object.upload')
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

drop policy startup_media_owner_update on storage.objects;
create policy startup_media_owner_update
on storage.objects for update
to authenticated
using (
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
)
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

drop policy startup_media_owner_delete on storage.objects;
create policy startup_media_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'startup-media'
  and storage.allow_any_operation(array['object.delete', 'object.delete_many'])
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
