-- Performance indexes — run once on production MySQL.
-- All use CREATE INDEX IF NOT EXISTS (MySQL 8.0+) or the equivalent
-- guarded form so re-running is safe.

-- blogs table: primary lookup and filter columns
CREATE INDEX IF NOT EXISTS idx_blogs_slug         ON blogs (slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status_date  ON blogs (status, date);
CREATE INDEX IF NOT EXISTS idx_blogs_category     ON blogs (category);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id    ON blogs (author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_created_at   ON blogs (created_at);
CREATE INDEX IF NOT EXISTS idx_blogs_view_count   ON blogs (view_count);

-- comments: correlated subquery in every blog list/single query
CREATE INDEX IF NOT EXISTS idx_comments_post_status ON comments (post_id, status);

-- post_views: trending subquery filters by post_id + created_at
CREATE INDEX IF NOT EXISTS idx_post_views_post_created ON post_views (post_id, created_at);

-- member lookups used in auth + credit flows
CREATE INDEX IF NOT EXISTS idx_members_email      ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_status     ON members (status);

-- credit / unlock lookups
CREATE INDEX IF NOT EXISTS idx_member_blog_unlocks_member ON member_blog_unlocks (member_id);
CREATE INDEX IF NOT EXISTS idx_member_blog_unlocks_slug   ON member_blog_unlocks (blog_slug);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_member ON credit_transactions (member_id);
