PERVUS REPLIES v15

1. Back up your current Supabase data.
2. Run PERVUS_REPLIES_SETUP.sql in Supabase SQL Editor first.
3. Upload changed site files to GitHub Pages (or replace the entire site).
4. In Control Room, use PUBLISHED ENTRIES > GUESTBOOK or PHOTOS to save one reply per approved item.
5. Replies appear beneath guestbook messages and in the photo lightbox.
6. This does NOT repair pre-existing photo-approval Storage permission errors.
7. Admin authorization currently checks JWT email; switching to a fixed auth.uid() is recommended for stronger identity binding.
