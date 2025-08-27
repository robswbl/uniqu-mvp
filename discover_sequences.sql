-- Discover the actual sequence names for agency tables
-- Run this first to see what sequences exist

-- Check for sequences related to agency tables
SELECT 'Sequences for agency tables:' as info;
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    increment
FROM information_schema.sequences 
WHERE sequence_schema = 'uniqu' 
AND sequence_name LIKE '%agency%'
ORDER BY sequence_name;

-- Also check for sequences that might be named differently
SELECT 'All sequences in uniqu schema:' as info;
SELECT 
    sequence_schema,
    sequence_name,
    data_type
FROM information_schema.sequences 
WHERE sequence_schema = 'uniqu'
ORDER BY sequence_name;

-- Check what columns use sequences (auto-incrementing)
SELECT 'Columns that might use sequences:' as info;
SELECT 
    table_schema,
    table_name,
    column_name,
    column_default,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'uniqu' 
AND table_name IN ('agency_users', 'agency_user_roles', 'agency_sessions')
AND column_name = 'id'
ORDER BY table_name;
