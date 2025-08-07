-- Migration to add given_out column to signup_codes table
-- Run this in your Supabase SQL editor

-- Add the given_out column with a default value of false
ALTER TABLE signup_codes 
ADD COLUMN given_out BOOLEAN DEFAULT false;

-- Update existing codes to have given_out = false (they haven't been given out yet)
UPDATE signup_codes 
SET given_out = false 
WHERE given_out IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE signup_codes 
ALTER COLUMN given_out SET NOT NULL;

-- Add an index for better query performance
CREATE INDEX idx_signup_codes_given_out ON signup_codes(given_out); 