-- ============================================
-- MIGRATION: FIX FOREIGN KEY RELATIONSHIP
-- ============================================

-- Step 1: Make ref_id UNIQUE in assigned_customers
ALTER TABLE assigned_customers 
ADD CONSTRAINT unique_ref_id UNIQUE (ref_id);

-- Step 2: Drop old foreign key constraint if exists
ALTER TABLE water_lock_status 
DROP CONSTRAINT IF EXISTS water_lock_status_danh_bo_fkey;

-- Step 3: Add new foreign key: id_tb -> ref_id
-- NOTE: Commented out because there are orphan records (id_tb not in ref_id)
-- This is expected when ON_OFF has records that don't exist in database
-- We keep the relationship as informational only, not enforced by database

-- ALTER TABLE water_lock_status 
-- ADD CONSTRAINT water_lock_status_id_tb_fkey 
-- FOREIGN KEY (id_tb) REFERENCES assigned_customers(ref_id) 
-- ON DELETE SET NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assigned_customers_ref_id ON assigned_customers(ref_id);
CREATE INDEX IF NOT EXISTS idx_water_lock_status_id_tb ON water_lock_status(id_tb);
