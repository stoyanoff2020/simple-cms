-- Test seed data for the Simple CMS

-- Insert test users
INSERT INTO users (id, username, email, password_hash, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'testadmin', 'admin@test.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9wVsA3g67JvQsKHVJ0C3mK6h5tMF9Wy', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'testauthor', 'author@test.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9wVsA3g67JvQsKHVJ0C3mK6h5tMF9Wy', 'author'),
  ('33333333-3333-3333-3333-333333333333', 'testreader', 'reader@test.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9wVsA3g67JvQsKHVJ0C3mK6h5tMF9Wy', 'reader');
-- Note: All passwords are 'Password123'

-- Insert test categories
INSERT INTO categories (id, name, description, slug)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Technology', 'Articles about technology', 'technology'),
  ('55555555-5555-5555-5555-555555555555', 'Science', 'Scientific articles', 'science'),
  ('66666666-6666-6666-6666-666666666666', 'Health', 'Health and wellness articles', 'health');

-- Insert test tags
INSERT INTO tags (id, name, slug, usage_count)
VALUES
  ('77777777-7777-7777-7777-777777777777', 'programming', 'programming', 2),
  ('88888888-8888-8888-8888-888888888888', 'javascript', 'javascript', 1),
  ('99999999-9999-9999-9999-999999999999', 'physics', 'physics', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'nutrition', 'nutrition', 1);

-- Insert test articles
INSERT INTO articles (id, title, content, excerpt, author_id, status, created_at, updated_at, published_at)
VALUES
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Introduction to JavaScript',
    'JavaScript is a programming language that conforms to the ECMAScript specification. JavaScript is high-level, often just-in-time compiled, and multi-paradigm.',
    'Learn the basics of JavaScript programming',
    '22222222-2222-2222-2222-222222222222',
    'published',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Understanding Quantum Physics',
    'Quantum physics is a branch of physics that explains the behavior of matter and its interactions with energy on the scale of atoms and subatomic particles.',
    'An introduction to the principles of quantum physics',
    '22222222-2222-2222-2222-222222222222',
    'published',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Healthy Eating Habits',
    'Maintaining a balanced diet is essential for good health. This article covers the basics of nutrition and healthy eating habits.',
    'Tips for maintaining a healthy diet',
    '22222222-2222-2222-2222-222222222222',
    'published',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Advanced Programming Techniques',
    'This article covers advanced programming concepts and techniques for experienced developers.',
    'Take your programming skills to the next level',
    '22222222-2222-2222-2222-222222222222',
    'draft',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NULL
  );

-- Insert article-category associations
INSERT INTO article_categories (article_id, category_id)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444');

-- Insert article-tag associations
INSERT INTO article_tags (article_id, tag_id)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-9999-9999-9999-999999999999'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777');

-- Update search vectors for articles
UPDATE articles SET search_vector = 
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', content), 'B') ||
  setweight(to_tsvector('english', COALESCE(excerpt, '')), 'C');