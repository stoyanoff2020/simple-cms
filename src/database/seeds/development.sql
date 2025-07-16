-- Development seed data for Simple CMS

-- Insert sample users
INSERT INTO users (id, username, email, password_hash, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'admin', 'admin@example.com', '$2b$10$rOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzN', 'admin'),
  ('550e8400-e29b-41d4-a716-446655440002', 'john_doe', 'john@example.com', '$2b$10$rOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzN', 'author'),
  ('550e8400-e29b-41d4-a716-446655440003', 'jane_smith', 'jane@example.com', '$2b$10$rOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzN', 'author'),
  ('550e8400-e29b-41d4-a716-446655440004', 'reader_user', 'reader@example.com', '$2b$10$rOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzNzNzNzNzOzJqZxNzNzNzN', 'reader')
ON CONFLICT (id) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (id, name, description, slug) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Technology', 'Articles about technology and programming', 'technology'),
  ('650e8400-e29b-41d4-a716-446655440002', 'Web Development', 'Web development tutorials and tips', 'web-development'),
  ('650e8400-e29b-41d4-a716-446655440003', 'Database', 'Database design and optimization', 'database'),
  ('650e8400-e29b-41d4-a716-446655440004', 'DevOps', 'DevOps practices and tools', 'devops'),
  ('650e8400-e29b-41d4-a716-446655440005', 'General', 'General articles and discussions', 'general')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tags
INSERT INTO tags (id, name, slug, usage_count) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', 'JavaScript', 'javascript', 3),
  ('750e8400-e29b-41d4-a716-446655440002', 'TypeScript', 'typescript', 2),
  ('750e8400-e29b-41d4-a716-446655440003', 'Node.js', 'nodejs', 2),
  ('750e8400-e29b-41d4-a716-446655440004', 'PostgreSQL', 'postgresql', 2),
  ('750e8400-e29b-41d4-a716-446655440005', 'Express.js', 'expressjs', 1),
  ('750e8400-e29b-41d4-a716-446655440006', 'React', 'react', 1),
  ('750e8400-e29b-41d4-a716-446655440007', 'API', 'api', 2),
  ('750e8400-e29b-41d4-a716-446655440008', 'Tutorial', 'tutorial', 3)
ON CONFLICT (id) DO NOTHING;

-- Insert sample articles
INSERT INTO articles (id, title, content, excerpt, author_id, status, published_at) VALUES
  (
    '850e8400-e29b-41d4-a716-446655440001',
    'Getting Started with Node.js and Express',
    'Node.js is a powerful JavaScript runtime that allows you to build server-side applications. In this tutorial, we''ll explore how to create a simple web server using Express.js framework...',
    'Learn how to build your first Node.js application with Express.js framework.',
    '550e8400-e29b-41d4-a716-446655440002',
    'published',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
  ),
  (
    '850e8400-e29b-41d4-a716-446655440002',
    'Database Design Best Practices',
    'Designing a good database schema is crucial for application performance and maintainability. Here are some key principles to follow when designing your database...',
    'Essential principles for designing efficient and maintainable database schemas.',
    '550e8400-e29b-41d4-a716-446655440003',
    'published',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  ),
  (
    '850e8400-e29b-41d4-a716-446655440003',
    'Introduction to TypeScript',
    'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and other features that help catch errors early...',
    'Discover the benefits of using TypeScript in your JavaScript projects.',
    '550e8400-e29b-41d4-a716-446655440002',
    'published',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
  ),
  (
    '850e8400-e29b-41d4-a716-446655440004',
    'Building RESTful APIs with Express',
    'REST APIs are the backbone of modern web applications. In this comprehensive guide, we''ll build a complete RESTful API using Express.js...',
    'Complete guide to building RESTful APIs with Express.js and best practices.',
    '550e8400-e29b-41d4-a716-446655440003',
    'draft',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Insert article-category associations
INSERT INTO article_categories (article_id, category_id) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001'), -- Node.js -> Technology
  ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002'), -- Node.js -> Web Development
  ('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440003'), -- Database -> Database
  ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440001'), -- TypeScript -> Technology
  ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440002'), -- TypeScript -> Web Development
  ('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440002')  -- REST API -> Web Development
ON CONFLICT (article_id, category_id) DO NOTHING;

-- Insert article-tag associations
INSERT INTO article_tags (article_id, tag_id) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001'), -- Node.js -> JavaScript
  ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003'), -- Node.js -> Node.js
  ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440005'), -- Node.js -> Express.js
  ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440008'), -- Node.js -> Tutorial
  ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440004'), -- Database -> PostgreSQL
  ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440008'), -- Database -> Tutorial
  ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001'), -- TypeScript -> JavaScript
  ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440002'), -- TypeScript -> TypeScript
  ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440008'), -- TypeScript -> Tutorial
  ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440007'), -- REST API -> API
  ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440003')  -- REST API -> Node.js
ON CONFLICT (article_id, tag_id) DO NOTHING;