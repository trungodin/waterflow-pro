-- ============================================
-- MIGRATION: Remove UNIQUE constraint on danh_bo
-- Allow multiple records with same danh_bo
-- ============================================

-- Drop UNIQUE constraint on danh_bo
ALTER TABLE assigned_customers 
DROP CONSTRAINT IF EXISTS assigned_customers_danh_bo_key;

-- Keep index for performance (but not unique)
DROP INDEX IF EXISTS assigned_customers_danh_bo_key;
CREATE INDEX IF NOT EXISTS idx_assigned_customers_danh_bo ON assigned_customers(danh_bo);

-- Note: Now we can have multiple customers with same danh_bo
-- Primary key is still 'id' (UUID)
-- ref_id is still UNIQUE
