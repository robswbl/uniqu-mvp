-- Simple Database Check - Run these one at a time
-- These queries should work in any PostgreSQL version

-- 1. What tables do we have?
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'uniqu' 
ORDER BY table_name;

-- 2. What's in the agencies table (if it exists)?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'agencies'
ORDER BY ordinal_position;

-- 3. What's in the agency_users table?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'agency_users'
ORDER BY ordinal_position;

-- 4. What's in the user_agencies table?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'user_agencies'
ORDER BY ordinal_position;

-- 5. What's in the users table?
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'users'
ORDER BY ordinal_position;

-- 6. Check if tables have data (run these one at a time):
-- SELECT COUNT(*) FROM uniqu.agencies;
-- SELECT COUNT(*) FROM uniqu.agency_users;
-- SELECT COUNT(*) FROM uniqu.user_agencies;
-- SELECT COUNT(*) FROM uniqu.users;

-- 7. Sample data from each table (run these one at a time):
-- SELECT * FROM uniqu.agencies LIMIT 3;
-- SELECT * FROM uniqu.agency_users LIMIT 3;
-- SELECT * FROM uniqu.user_agencies LIMIT 3;
-- SELECT * FROM uniqu.users LIMIT 3;
