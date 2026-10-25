-- Profile pictures. The image lives in a private Storage bucket, under a
-- folder named for its owner's user id; profiles.avatar_path records which
-- file is current. The bucket is private because the app is private by
-- default: pictures are shown through short-lived signed URLs, never a public
-- link. The mobile app uploads with the anon key, so the storage policies
-- below, not the apps, are what keep each person to their own folder.

alter table public.profiles add column avatar_path text
  check (char_length(avatar_path) <= 200);

-- A profile can only point at a file in its owner's own folder.
alter table public.profiles add constraint profiles_avatar_in_own_folder
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text);

-- Pictures are shrunk in the browser before upload, so 2 MB is generous.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Users can view their own avatar files"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own avatar files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can replace their own avatar files"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own avatar files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
