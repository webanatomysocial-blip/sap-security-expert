-- Homepage Featured Insights: admin-curated blogs + independent homepage image
-- Safe to run once on production MySQL/MariaDB.

ALTER TABLE `blogs`
  ADD COLUMN `homepage_featured_image` longtext DEFAULT NULL,
  ADD COLUMN `homepage_featured_order` int(11) DEFAULT NULL;

ALTER TABLE `blogs`
  ADD KEY `idx_blogs_homepage_featured` (`homepage_featured_order`);
