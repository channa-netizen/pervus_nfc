-- ============================================================
-- PERVUS CONTROL ROOM SECURITY
-- IMPORTANT: replace YOUR_ADMIN_USER_UUID before running.
-- Get it from Supabase Authentication > Users after creating
-- your admin account.
-- ============================================================

-- Admin can read all sightings (including pending)
create policy "Pervus admin can read all sightings"
on public.pervus_sightings
for select
to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

-- Admin can approve/update sightings
create policy "Pervus admin can update sightings"
on public.pervus_sightings
for update
to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid)
with check (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

-- Admin can reject/delete sightings
create policy "Pervus admin can delete sightings"
on public.pervus_sightings
for delete
to authenticated
using (auth.uid() = 'YOUR_ADMIN_USER_UUID'::uuid);

grant select, update, delete on public.pervus_sightings to authenticated;

-- Admin can privately inspect and delete pending images
create policy "Pervus admin can read pending photos"
on storage.objects for select to authenticated
using (bucket_id='pervus-pending' and auth.uid()='YOUR_ADMIN_USER_UUID'::uuid);

create policy "Pervus admin can delete pending photos"
on storage.objects for delete to authenticated
using (bucket_id='pervus-pending' and auth.uid()='YOUR_ADMIN_USER_UUID'::uuid);

-- Admin can promote an approved photo into the public bucket
create policy "Pervus admin can upload approved photos"
on storage.objects for insert to authenticated
with check (bucket_id='pervus-approved' and auth.uid()='YOUR_ADMIN_USER_UUID'::uuid);

-- Allows cleanup if a DB approval fails after copying the file
create policy "Pervus admin can delete approved photos"
on storage.objects for delete to authenticated
using (bucket_id='pervus-approved' and auth.uid()='YOUR_ADMIN_USER_UUID'::uuid);
