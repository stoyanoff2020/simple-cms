-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Create index on usage_count for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);