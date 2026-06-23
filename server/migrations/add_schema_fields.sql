-- Migration: add_schema_fields
-- Adds schema.org-specific fields to the blogs table so editors can control
-- the @type (BlogPosting / Article / TechArticle / HowToArticle) and the
-- articleSection that appear in the page's JSON-LD structured data.

ALTER TABLE blogs ADD COLUMN schema_type VARCHAR(50) NOT NULL DEFAULT 'BlogPosting';
ALTER TABLE blogs ADD COLUMN article_section VARCHAR(100) DEFAULT NULL;
