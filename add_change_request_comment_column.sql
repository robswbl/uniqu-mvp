-- Migration to add change_request_comment column to application_letter_versions table
-- Run this in your Supabase SQL editor

-- Add the change_request_comment column
ALTER TABLE uniqu.application_letter_versions
ADD COLUMN IF NOT EXISTS change_request_comment TEXT;

-- Add an index for better performance when searching by comments
CREATE INDEX IF NOT EXISTS idx_application_letter_versions_change_request_comment
ON uniqu.application_letter_versions(change_request_comment);

-- Update the existing RLS policies to include the new column
-- (The existing policies should work automatically since they check the application_letter_id relationship)
