-- Migration to create application_letter_versions table
-- Run this in your Supabase SQL editor

-- First, let's check the actual data type of application_letters.id
-- Run this query first to see the column type:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_schema = 'uniqu' AND table_name = 'application_letters' AND column_name = 'id';

-- Create the application_letter_versions table
CREATE TABLE IF NOT EXISTS uniqu.application_letter_versions (
    id SERIAL PRIMARY KEY,
    application_letter_id INTEGER NOT NULL REFERENCES uniqu.application_letters(id) ON DELETE CASCADE,
    version_type TEXT NOT NULL DEFAULT 'original',
    tone TEXT NOT NULL,
    language TEXT NOT NULL,
    length_percentage INTEGER NOT NULL CHECK (length_percentage IN (25, 50, 75, 100, 125, 150)),
    content_html TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_application_letter_versions_letter_id 
ON uniqu.application_letter_versions(application_letter_id);

CREATE INDEX IF NOT EXISTS idx_application_letter_versions_type 
ON uniqu.application_letter_versions(version_type);

CREATE INDEX IF NOT EXISTS idx_application_letter_versions_created 
ON uniqu.application_letter_versions(created_at);

-- Add RLS policies (adjust as needed for your setup)
ALTER TABLE uniqu.application_letter_versions ENABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_letter_versions_updated_at 
    BEFORE UPDATE ON uniqu.application_letter_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
