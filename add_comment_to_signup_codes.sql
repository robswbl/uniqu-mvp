-- Migration to add comment column to signup_codes table
-- This allows users to add notes about when/why/how codes were distributed

ALTER TABLE uniqu.signup_codes
ADD COLUMN comment TEXT;

-- Create index for better query performance
CREATE INDEX idx_signup_codes_comment ON uniqu.signup_codes(comment);
