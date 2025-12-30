-- Phase 3 Migration: Add weight column and scoring_rules config
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Add weight column to dimensions (default 1 for equal weighting)
ALTER TABLE dimensions ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1;

-- Update existing dimensions with default weight
UPDATE dimensions SET weight = 1 WHERE weight IS NULL;
