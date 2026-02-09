-- ============================================
-- MIGRATION: ADD CUSTOMER INFO TO water_lock_status
-- To store snapshot of customer info from ON_OFF sheet
-- avoiding reliance on joins with assigned_customers
-- ============================================

ALTER TABLE water_lock_status
ADD COLUMN IF NOT EXISTS ten_kh TEXT,
ADD COLUMN IF NOT EXISTS so_nha TEXT,
ADD COLUMN IF NOT EXISTS duong TEXT,
ADD COLUMN IF NOT EXISTS tong_ky TEXT,
ADD COLUMN IF NOT EXISTS tong_no NUMERIC,
ADD COLUMN IF NOT EXISTS ky_nam TEXT;

-- Update existing records? No, we will re-sync.
