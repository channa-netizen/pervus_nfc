# Nervous Pervus NFC Portal — Phase 2
GitHub Pages frontend + Supabase guestbook.

Upload all files to the root of `pervus_nfc`, replacing existing files.

Guestbook submissions are inserted with `approved=false`. Approve entries in Supabase Table Editor by changing the `approved` field to true. Only approved rows are publicly readable.

The browser contains only the Supabase publishable key. Never place a service-role/secret key or database password in this repository.
