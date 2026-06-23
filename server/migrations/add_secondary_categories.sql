-- Add secondary_categories (JSON array) and its draft counterpart to the blogs table.
-- secondary_categories stores additional categories a blog appears in beyond its primary category.
-- e.g. ["sap-grc", "sap-iag"]

ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS secondary_categories TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS draft_secondary_categories TEXT DEFAULT NULL;
