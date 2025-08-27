-- Basic Database Check - Copy and paste these one at a time

-- 1. List all tables in uniqu schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'uniqu' 
ORDER BY table_name;

-- 2. Check agencies table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'agencies'
ORDER BY ordinal_position;

-- 3. Check agency_users table structure  
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'agency_users'
ORDER BY ordinal_position;

-- 4. Check user_agencies table structure
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'user_agencies'
ORDER BY ordinal_position;

-- 5. Check users table structure
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'uniqu' AND table_name = 'users'
ORDER BY ordinal_position;
