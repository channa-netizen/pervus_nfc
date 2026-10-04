# Nervous Pervus NFC Portal — Phase 3

Adds private moderated photo sightings.

## Upload
Visitors choose/take a JPEG, PNG, or WebP photo. The browser:
1. loads it locally,
2. resizes the longest edge to 1800px,
3. re-encodes it as JPEG at 84% quality (discarding original EXIF metadata),
4. uploads the processed copy to the private `pervus-pending` bucket,
5. inserts a `pervus_sightings` row with `approved=false`.

## Gallery
The page displays only rows where `approved=true`, and expects their image file to exist in the public `pervus-approved` bucket under the same `image_path`.

## Current moderation
Approval is intentionally manual for the first test:
- inspect pending image in Supabase Storage,
- move/download+upload the approved image into `pervus-approved` using the exact same filename,
- set that row's `approved` value to true.

A private moderation interface can be added after the upload pipeline is verified.
