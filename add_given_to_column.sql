-- Migration to add given_to column to signup_codes table
-- Run this in your Supabase SQL editor

-- Add the given_to column
ALTER TABLE signup_codes 
ADD COLUMN given_to TEXT;

-- Add an index for better query performance
CREATE INDEX idx_signup_codes_given_to ON signup_codes(given_to); 