-- Migration to add RLS policies for application_letter_versions table
-- Run this in your Supabase SQL editor after the table creation

-- Enable RLS (in case it wasn't enabled)
ALTER TABLE uniqu.application_letter_versions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to read versions for letters they have access to
-- This joins with application_letters to check session_id access
CREATE POLICY "Users can read their own letter versions" ON uniqu.application_letter_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM uniqu.application_letters al
            JOIN uniqu.questionnaire_sessions qs ON al.session_id = qs.id
            WHERE al.id = application_letter_versions.application_letter_id
            AND qs.user_id = auth.uid()
        )
    );

-- Policy 2: Allow users to insert versions for letters they have access to
CREATE POLICY "Users can insert versions for their own letters" ON uniqu.application_letter_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM uniqu.application_letters al
            JOIN uniqu.questionnaire_sessions qs ON al.session_id = qs.id
            WHERE al.id = application_letter_versions.application_letter_id
            AND qs.user_id = auth.uid()
        )
    );

-- Policy 3: Allow users to update versions for letters they have access to
CREATE POLICY "Users can update their own letter versions" ON uniqu.application_letter_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM uniqu.application_letters al
            JOIN uniqu.questionnaire_sessions qs ON al.session_id = qs.id
            WHERE al.id = application_letter_versions.application_letter_id
            AND qs.user_id = auth.uid()
        )
    );

-- Policy 4: Allow users to delete versions for letters they have access to
CREATE POLICY "Users can delete their own letter versions" ON uniqu.application_letter_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM uniqu.application_letters al
            JOIN uniqu.questionnaire_sessions qs ON al.session_id = qs.id
            WHERE al.id = application_letter_versions.application_letter_id
            AND qs.user_id = auth.uid()
        )
    );

-- Alternative: If you want to allow anonymous access (for testing), use this instead:
-- DROP POLICY IF EXISTS "Users can read their own letter versions" ON uniqu.application_letter_versions;
-- CREATE POLICY "Allow all access for testing" ON uniqu.application_letter_versions FOR ALL USING (true);

-- Grant necessary permissions to the anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON uniqu.application_letter_versions TO anon;
GRANT USAGE ON SEQUENCE uniqu.application_letter_versions_id_seq TO anon;
