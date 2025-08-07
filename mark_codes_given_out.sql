-- Mark specific codes as given out
-- Run this in your Supabase SQL editor

UPDATE signup_codes 
SET given_out = true 
WHERE code IN (
  '4WW233CJ',
  '0INGVSMH',
  '0YD7NZDI',
  'V1YFBGRJ',
  'G41HZTL8',
  '9C1TZZKS',
  'O9GROWVD',
  'HBN847HR',
  'FQJI9VK1',
  'UJU70XWG',
  'CI3Q459R',
  '4BH3SBMA',
  '7RGVAOAJ',
  'Q2SYM3YN',
  'H4ZVOATG',
  'JTCQSF99',
  'RETU4ZOA',
  'ICPP23JY',
  '84UFR7C2'
);

-- Verify the update worked
SELECT code, given_out, used, used_by, used_at 
FROM signup_codes 
WHERE code IN (
  '4WW233CJ',
  '0INGVSMH',
  '0YD7NZDI',
  'V1YFBGRJ',
  'G41HZTL8',
  '9C1TZZKS',
  'O9GROWVD',
  'HBN847HR',
  'FQJI9VK1',
  'UJU70XWG',
  'CI3Q459R',
  '4BH3SBMA',
  '7RGVAOAJ',
  'Q2SYM3YN',
  'H4ZVOATG',
  'JTCQSF99',
  'RETU4ZOA',
  'ICPP23JY',
  '84UFR7C2'
)
ORDER BY code; 