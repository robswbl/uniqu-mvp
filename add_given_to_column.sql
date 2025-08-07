-- Migration to add given_by column to signup_codes table
-- Run this in your Supabase SQL editor

-- Add the given_by column
ALTER TABLE signup_codes 
ADD COLUMN given_by TEXT;

-- Add an index for better query performance
CREATE INDEX idx_signup_codes_given_by ON signup_codes(given_by); 