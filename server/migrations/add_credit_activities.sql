-- Run on production MySQL to add the credit_activities table
CREATE TABLE IF NOT EXISTS credit_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  credits INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed / update activities (INSERT IGNORE skips if key already exists)
INSERT IGNORE INTO credit_activities (`key`, label, description, credits) VALUES
  ('new_registration',     'New Registration',                   'Experience premium quality',        10),
  ('approved_comment',     'Approved Comment',                   'Encourages meaningful discussions',  2),
  ('referral',             'Referral (new member registers)',    'Organic growth',                     2),
  ('article_published',    'Article Published (Community Author)', 'Builds content library',          20),
  ('podcast_guest',        'Podcast Guest',                      'Attracts industry leaders',         20),
  ('error_report',         'Report an Error',                    'Improves content quality',           1),
  ('complete_profile',     'Complete Profile',                   'Better audience insights',           2),
  ('product_review',       'Submit a Product Review',            'Grows review ecosystem',             5);

-- Update existing rows if they already exist with old values
UPDATE credit_activities SET label='New Registration',                   description='Experience premium quality',        credits=10 WHERE `key`='new_registration';
UPDATE credit_activities SET label='Approved Comment',                   description='Encourages meaningful discussions', credits=2  WHERE `key`='approved_comment';
UPDATE credit_activities SET label='Referral (new member registers)',    description='Organic growth',                    credits=2  WHERE `key`='referral';
UPDATE credit_activities SET label='Article Published (Community Author)', description='Builds content library',          credits=20 WHERE `key`='article_published';
UPDATE credit_activities SET label='Podcast Guest',                      description='Attracts industry leaders',         credits=20 WHERE `key`='podcast_guest';
UPDATE credit_activities SET label='Report an Error',                    description='Improves content quality',          credits=1  WHERE `key`='error_report';
UPDATE credit_activities SET label='Complete Profile',                   description='Better audience insights',          credits=2  WHERE `key`='complete_profile';
UPDATE credit_activities SET label='Submit a Product Review',            description='Grows review ecosystem',            credits=5  WHERE `key`='product_review';

-- LinkedIn Share
INSERT IGNORE INTO credit_activities (`key`, label, description, credits) VALUES ('linkedin_share', 'LinkedIn Share', 'Share content on LinkedIn', 5);
UPDATE credit_activities SET label='LinkedIn Share', description='Share content on LinkedIn', credits=5 WHERE `key`='linkedin_share';
