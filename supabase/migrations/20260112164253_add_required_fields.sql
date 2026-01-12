-- Migration: Add Required Fields
-- Adds all 17 required fields to selection_items table and backfills NULLs to empty strings

-- Add new columns if they don't exist
ALTER TABLE selection_items 
ADD COLUMN IF NOT EXISTS domain TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS linkedin_company_url TEXT,
ADD COLUMN IF NOT EXISTS legal_form TEXT,
ADD COLUMN IF NOT EXISTS sector_level1 TEXT,
ADD COLUMN IF NOT EXISTS sector_level2 TEXT,
ADD COLUMN IF NOT EXISTS sector_level3 TEXT,
ADD COLUMN IF NOT EXISTS region_level1 TEXT,
ADD COLUMN IF NOT EXISTS region_level2 TEXT,
ADD COLUMN IF NOT EXISTS region_level3 TEXT,
ADD COLUMN IF NOT EXISTS region_level4 TEXT;

-- Backfill NULLs to empty strings for all required fields
-- This ensures consistent empty string representation throughout the application
UPDATE selection_items 
SET 
  domain = COALESCE(domain, ''),
  company_size = COALESCE(company_size, ''),
  postal_code = COALESCE(postal_code, ''),
  linkedin_company_url = COALESCE(linkedin_company_url, ''),
  legal_form = COALESCE(legal_form, ''),
  sector_level1 = COALESCE(sector_level1, ''),
  sector_level2 = COALESCE(sector_level2, ''),
  sector_level3 = COALESCE(sector_level3, ''),
  region_level1 = COALESCE(region_level1, ''),
  region_level2 = COALESCE(region_level2, ''),
  region_level3 = COALESCE(region_level3, ''),
  region_level4 = COALESCE(region_level4, ''),
  name = COALESCE(name, ''),
  email = COALESCE(email, ''),
  phone = COALESCE(phone, ''),
  city = COALESCE(city, ''),
  street = COALESCE(street, '')
WHERE 
  domain IS NULL 
  OR company_size IS NULL 
  OR postal_code IS NULL 
  OR linkedin_company_url IS NULL 
  OR legal_form IS NULL
  OR sector_level1 IS NULL
  OR sector_level2 IS NULL
  OR sector_level3 IS NULL
  OR region_level1 IS NULL
  OR region_level2 IS NULL
  OR region_level3 IS NULL
  OR region_level4 IS NULL
  OR name IS NULL
  OR email IS NULL
  OR phone IS NULL
  OR city IS NULL
  OR street IS NULL;

-- Set default values for new rows (ensure columns default to empty string, not NULL)
ALTER TABLE selection_items 
ALTER COLUMN domain SET DEFAULT '',
ALTER COLUMN company_size SET DEFAULT '',
ALTER COLUMN postal_code SET DEFAULT '',
ALTER COLUMN linkedin_company_url SET DEFAULT '',
ALTER COLUMN legal_form SET DEFAULT '',
ALTER COLUMN sector_level1 SET DEFAULT '',
ALTER COLUMN sector_level2 SET DEFAULT '',
ALTER COLUMN sector_level3 SET DEFAULT '',
ALTER COLUMN region_level1 SET DEFAULT '',
ALTER COLUMN region_level2 SET DEFAULT '',
ALTER COLUMN region_level3 SET DEFAULT '',
ALTER COLUMN region_level4 SET DEFAULT;

-- Ensure existing columns also default to empty string
ALTER TABLE selection_items 
ALTER COLUMN name SET DEFAULT '',
ALTER COLUMN email SET DEFAULT '',
ALTER COLUMN phone SET DEFAULT '',
ALTER COLUMN city SET DEFAULT '',
ALTER COLUMN street SET DEFAULT '';

