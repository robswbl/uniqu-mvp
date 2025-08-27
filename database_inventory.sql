-- Database Inventory Script
-- This will show you ALL tables and their columns in the uniqu schema
-- Run this in your Supabase SQL editor to see what we actually have

-- 1. Get all tables in the uniqu schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'uniqu'
ORDER BY table_name;

-- 2. Get detailed column information for each table
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
        ELSE ''
    END as key_type,
    CASE 
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 
            (SELECT table_name FROM information_schema.table_constraints 
             WHERE constraint_name = tc.constraint_name)
        ELSE ''
    END as references_table
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.key_column_usage kcu ON 
    c.table_name = kcu.table_name AND 
    c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc ON 
    kcu.constraint_name = tc.constraint_name
WHERE t.table_schema = 'uniqu' 
    AND c.table_schema = 'uniqu'
ORDER BY t.table_name, c.ordinal_position;

-- 3. Get row counts for each table
SELECT 
    schemaname,
    tablename,
    n_tup_ins as rows_inserted,
    n_tup_upd as rows_updated,
    n_tup_del as rows_deleted,
    n_live_tup as live_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'uniqu'
ORDER BY tablename;

-- 4. Check for any foreign key relationships
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'uniqu'
ORDER BY tc.table_name, kcu.column_name;

-- 5. Check RLS status for each table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'uniqu'
ORDER BY tablename;
