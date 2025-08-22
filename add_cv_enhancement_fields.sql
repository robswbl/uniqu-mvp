-- Migration to add CV enhancement fields to application_letters table
-- Run this in your Supabase SQL editor

-- Add CV enhancement fields
ALTER TABLE uniqu.application_letters 
ADD COLUMN cv_tagline TEXT,
ADD COLUMN cv_keywords TEXT,
ADD COLUMN cv_managementsummary TEXT,
ADD COLUMN cv_tips TEXT;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN uniqu.application_letters.cv_tagline IS 'AI-generated CV tagline tailored to the specific application';
COMMENT ON COLUMN uniqu.application_letters.cv_keywords IS 'AI-generated keywords and skills relevant to the specific application';
COMMENT ON COLUMN uniqu.application_letters.cv_managementsummary IS 'AI-generated management summary aligned with the application';
COMMENT ON COLUMN uniqu.application_letters.cv_tips IS 'AI-generated tips for optimizing CV for this specific application';

-- Create indexes for better query performance (optional)
CREATE INDEX idx_application_letters_cv_tagline ON uniqu.application_letters(cv_tagline) WHERE cv_tagline IS NOT NULL;
CREATE INDEX idx_application_letters_cv_keywords ON uniqu.application_letters(cv_keywords) WHERE cv_keywords IS NOT NULL;
CREATE INDEX idx_application_letters_cv_managementsummary ON uniqu.application_letters(cv_managementsummary) WHERE cv_managementsummary IS NOT NULL;
CREATE INDEX idx_application_letters_cv_tips ON uniqu.application_letters(cv_tips) WHERE cv_tips IS NOT NULL;

