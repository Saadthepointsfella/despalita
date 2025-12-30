-- MaxMin DTC Assessment Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Dimensions table
CREATE TABLE IF NOT EXISTS dimensions (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL,
  section TEXT NOT NULL,
  short_label TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  "order" INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  dimension_id TEXT NOT NULL REFERENCES dimensions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options table
CREATE TABLE IF NOT EXISTS options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  "order" INTEGER NOT NULL,
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings table (for levels config)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions table (for storing quiz responses)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  answers JSONB NOT NULL,
  timings JSONB,
  utm JSONB,
  score NUMERIC,
  level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_dimension ON questions(dimension_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_submissions_token ON submissions(token);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to quiz data
CREATE POLICY "Allow anonymous read dimensions" ON dimensions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read options" ON options FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read app_settings" ON app_settings FOR SELECT USING (true);

-- Allow anonymous insert for submissions (users submitting quiz)
CREATE POLICY "Allow anonymous insert submissions" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read own submission by token" ON submissions FOR SELECT USING (true);
