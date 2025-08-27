-- Final fix for overly restrictive RLS policies for agency authentication tables
-- Run this in your Supabase SQL editor after the initial migration

-- 1. First, let's see what policies currently exist
SELECT 'Current policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'uniqu' 
AND tablename IN ('agency_users', 'agency_user_roles', 'agency_sessions')
ORDER BY tablename, policyname;

-- 2. Drop ALL existing policies for these tables (we'll recreate them)
DROP POLICY IF EXISTS "Agency users can view their own profile" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Agency users can update their own profile" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Agency admins can manage all users in their agency" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Agency users can view their own sessions" ON uniqu.agency_sessions;
DROP POLICY IF EXISTS "Agency users can manage their own sessions" ON uniqu.agency_sessions;
DROP POLICY IF EXISTS "Allow read access to agency_users" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Allow insert access to agency_users" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Allow update access to agency_users" ON uniqu.agency_users;
DROP POLICY IF EXISTS "Allow read access to agency_user_roles" ON uniqu.agency_user_roles;
DROP POLICY IF EXISTS "Allow insert access to agency_user_roles" ON uniqu.agency_user_roles;
DROP POLICY IF EXISTS "Allow update access to agency_user_roles" ON uniqu.agency_user_roles;
DROP POLICY IF EXISTS "Allow read access to agency_sessions" ON uniqu.agency_sessions;
DROP POLICY IF EXISTS "Allow insert access to agency_sessions" ON uniqu.agency_sessions;
DROP POLICY IF EXISTS "Allow update access to agency_sessions" ON uniqu.agency_sessions;

-- 3. Create new, clean RLS policies for agency_users
CREATE POLICY "Allow read access to agency_users" ON uniqu.agency_users
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to agency_users" ON uniqu.agency_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to agency_users" ON uniqu.agency_users
    FOR UPDATE USING (true);

-- 4. Create new, clean RLS policies for agency_user_roles
CREATE POLICY "Allow read access to agency_user_roles" ON uniqu.agency_user_roles
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to agency_user_roles" ON uniqu.agency_user_roles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to agency_user_roles" ON uniqu.agency_user_roles
    FOR UPDATE USING (true);

-- 5. Create new, clean RLS policies for agency_sessions
CREATE POLICY "Allow read access to agency_sessions" ON uniqu.agency_sessions
    FOR SELECT USING (true);

CREATE POLICY "Allow insert access to agency_sessions" ON uniqu.agency_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update access to agency_sessions" ON uniqu.agency_sessions
    FOR UPDATE USING (true);

-- 6. Grant necessary permissions to the anon role for all agency tables
GRANT SELECT, INSERT, UPDATE, DELETE ON uniqu.agency_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON uniqu.agency_user_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON uniqu.agency_sessions TO anon;

-- 7. Grant read access to agencies table (needed for signup form)
GRANT SELECT ON uniqu.agencies TO anon;

-- 8. Grant usage on sequences (for auto-incrementing IDs) - using correct names
-- First, let's discover the actual sequence names
SELECT 'Discovering sequence names...' as info;
SELECT 
    sequence_schema,
    sequence_name
FROM information_schema.sequences 
WHERE sequence_schema = 'uniqu' 
AND sequence_name LIKE '%agency%'
ORDER BY sequence_name;

-- 9. Verify the new policies are created
SELECT 'New policies created:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'uniqu' 
AND tablename IN ('agency_users', 'agency_user_roles', 'agency_sessions')
ORDER BY tablename, policyname;

-- 10. Verify anon user permissions
SELECT 'Anon user permissions:' as info;
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants 
WHERE grantee = 'anon' 
AND table_schema = 'uniqu'
AND table_name IN ('agency_users', 'agency_user_roles', 'agency_sessions', 'agencies')
ORDER BY table_name, privilege_type;
