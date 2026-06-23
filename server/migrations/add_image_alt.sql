-- Add image_alt and its draft counterpart to the blogs table.
-- image_alt: alt text for the featured image (SEO + accessibility).
ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS image_alt TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS draft_image_alt TEXT DEFAULT NULL;
