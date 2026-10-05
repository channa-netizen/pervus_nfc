# PERVUS.SPACE

Static GitHub Pages site for Nervous Pervus, the **Time Is an Illusion** installation, and the human responsible for the weird glowing shit.

## Live structure

| File | Purpose |
| --- | --- |
| `index.html` | Main Pervus/NFC landing page |
| `about.html` | Pervus origin story |
| `guestbook.html` | Public guestbook |
| `upload.html` | Pervus sighting/photo submission + approved gallery |
| `artist.html` | Artist/about page |
| `time-is-an-illusion.html` | Clock installation page |
| `admin.html` | Authenticated moderation control room |
| `style.css` | Main portal/guestbook/about shared styles |
| `art-style.css` | Clock, artist, and homepage art/portal styles |
| `upload.css` | Photo submission/gallery styles |
| `admin.css` | Control Room styles |
| `config.js` | Public client configuration and social links |
| `app.js` | Homepage encounter count/social link wiring |
| `guestbook.js` | Guestbook read/write behavior |
| `upload.js` | Photo processing, upload, and gallery behavior |
| `admin.js` | Supabase Auth moderation workflow |
| `pervus-hero.webp` | Pervus artwork |
| `clock-hero.webp` | Time Is an Illusion artwork |
| `CNAME` | GitHub Pages custom domain |
| `CONTROL_ROOM_SETUP.sql` | Optional fresh-setup RLS template; not used at runtime |

## Backend

The site uses Supabase from the browser with a **publishable key** in `config.js`. Do not place a `service_role` key, database password, or other server secret in this repository.

### Guestbook

Public visitors can submit guestbook entries. Only approved entries are returned to the public page. The homepage encounter counter uses the `get_pervus_encounter_count()` RPC.

### Pervus sightings

Before upload, the browser:

1. accepts JPEG, PNG, or WebP;
2. resizes the longest edge to 1800 px;
3. re-encodes to JPEG at 84% quality, stripping the original embedded metadata;
4. uploads the processed copy to the private `pervus-pending` bucket;
5. inserts a `pervus_sightings` row with `approved=false`.

Approved images live in the public `pervus-approved` bucket and are the only sightings displayed in the public gallery.

### Control Room

`admin.html` signs in through Supabase Auth. Approval copies the pending image to the approved bucket, updates the database row, then removes the pending copy. Rejection deletes the pending image and its database row.

`CONTROL_ROOM_SETUP.sql` is only a reference for a fresh backend setup. Replace its `YOUR_ADMIN_USER_UUID` placeholder before running it. Do not rerun duplicate policy creation against an already-configured project without reviewing the existing policies first.

## Deployment

This repository is designed to deploy directly from the repo root with GitHub Pages.

- Keep `CNAME` set to `pervus.space`.
- Upload/commit the files in the root as-is.
- Asset query strings such as `?v=13` are cache-busters; bump them when replacing CSS/JS if a browser or CDN is holding an older copy.
- No build step, package manager, framework, or generated dependency directory is required.

## Current design notes

The artist page uses open editorial sections plus three intentional atmospheric panels: **What I'm Chasing**, **The Voice in My Head**, and **Make the Fucking Thing**. Horizontal chapter-divider rules were intentionally removed there. Project cards and social links remain boxed because they are interactive objects.

The clock page keeps its own visual chapter system and shares `art-style.css` with the artist page. Homepage art/feature styles are also in that file; the general portal UI remains in `style.css`.
