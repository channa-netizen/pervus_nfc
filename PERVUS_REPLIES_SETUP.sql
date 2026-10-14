-- PERVUS: one public reply per approved guestbook entry or photo.
-- Run once in Supabase SQL Editor BEFORE uploading the website files.
-- Change the email below if your Supabase Auth admin email changes.
-- Existing SELECT policies must already let visitors read APPROVED rows only.

BEGIN;
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS pervus_reply text;
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS pervus_replied_at timestamptz;
ALTER TABLE public.pervus_sightings ADD COLUMN IF NOT EXISTS pervus_reply text;
ALTER TABLE public.pervus_sightings ADD COLUMN IF NOT EXISTS pervus_replied_at timestamptz;

-- Only one response per row; null means no reply. No separate reply table.
ALTER TABLE public.guestbook DROP CONSTRAINT IF EXISTS guestbook_pervus_reply_length;
ALTER TABLE public.guestbook ADD CONSTRAINT guestbook_pervus_reply_length CHECK (char_length(pervus_reply) <= 600);
ALTER TABLE public.pervus_sightings DROP CONSTRAINT IF EXISTS sightings_pervus_reply_length;
ALTER TABLE public.pervus_sightings ADD CONSTRAINT sightings_pervus_reply_length CHECK (char_length(pervus_reply) <= 600);

-- The admin client uses authenticated JWTs, never a service-role key.
GRANT SELECT ON public.guestbook, public.pervus_sightings TO authenticated;
GRANT UPDATE (pervus_reply, pervus_replied_at) ON public.guestbook TO authenticated;
GRANT UPDATE (pervus_reply, pervus_replied_at) ON public.pervus_sightings TO authenticated;

-- Reuse your existing guestbook admin SELECT/UPDATE policies if present.
-- These additional policies apply ONLY to the designated authenticated admin.
DROP POLICY IF EXISTS "pervus_reply_admin_read_sightings" ON public.pervus_sightings;
CREATE POLICY "pervus_reply_admin_read_sightings" ON public.pervus_sightings
FOR SELECT TO authenticated USING ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com');
DROP POLICY IF EXISTS "pervus_reply_admin_update_sightings" ON public.pervus_sightings;
CREATE POLICY "pervus_reply_admin_update_sightings" ON public.pervus_sightings
FOR UPDATE TO authenticated
USING ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com' AND approved = true)
WITH CHECK ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com' AND approved = true);

DROP POLICY IF EXISTS "pervus_reply_admin_read_guestbook" ON public.guestbook;
CREATE POLICY "pervus_reply_admin_read_guestbook" ON public.guestbook
FOR SELECT TO authenticated USING ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com');
DROP POLICY IF EXISTS "pervus_reply_admin_update_guestbook" ON public.guestbook;
CREATE POLICY "pervus_reply_admin_update_guestbook" ON public.guestbook
FOR UPDATE TO authenticated
USING ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com' AND approved = true)
WITH CHECK ((select auth.jwt() ->> 'email') = 'chad.a.nanna@gmail.com' AND approved = true);
COMMIT;

-- NOTE: PostgreSQL RLS policies are permissive by default. If there are
-- other UPDATE policies, they may also authorize changes. Review existing
-- policies before deploying if more users have authenticated accounts.
-- This migration does not repair existing photo Storage permissions.
