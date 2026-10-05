-- PERVUS CONTROL ROOM — OPTIONAL FRESH-SETUP TEMPLATE
-- This file is not used by the website at runtime.
-- Before running it, replace YOUR_ADMIN_USER_UUID with the UUID of the
-- Supabase Auth user that should be allowed to moderate Pervus sightings.

create policy "Pervus admin can read all sightings"
on public.pervus_sightings
for select to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can update sightings"
on public.pervus_sightings
for update to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid)
with check (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can delete sightings"
on public.pervus_sightings
for delete to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

grant select, update, delete on public.pervus_sightings to authenticated;

create policy "Pervus admin can read pending photos"
on storage.objects for select to authenticated
using (bucket_id = 'pervus-pending' and auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can delete pending photos"
on storage.objects for delete to authenticated
using (bucket_id = 'pervus-pending' and auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can upload approved photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'pervus-approved' and auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can read approved photos"
on storage.objects for select to authenticated
using (bucket_id = 'pervus-approved' and auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can delete approved photos"
on storage.objects for delete to authenticated
using (bucket_id = 'pervus-approved' and auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);
