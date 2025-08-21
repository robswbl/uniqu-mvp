-- Migration to add tone column to application_letters table
-- Run this in your Supabase SQL editor

ALTER TABLE uniqu.application_letters 
ADD COLUMN tone VARCHAR(20) DEFAULT 'professional';

-- Update existing letters to have the default tone
UPDATE uniqu.application_letters 
SET tone = 'professional' 
WHERE tone IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE uniqu.application_letters 
ALTER COLUMN tone SET NOT NULL;

-- Add a check constraint to ensure only valid tones are used
ALTER TABLE uniqu.application_letters 
ADD CONSTRAINT check_valid_tone 
CHECK (tone IN ('professional', 'inspirational', 'creative', 'technical', 'casual'));

-- Add an index for better query performance
CREATE INDEX idx_application_letters_tone ON uniqu.application_letters(tone);
