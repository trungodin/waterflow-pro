-- ============================================
-- MIGRATION: Remove UNIQUE constraint on id_tb
-- Allow multiple records with same id_tb
-- ============================================

-- Drop UNIQUE constraint on id_tb
ALTER TABLE water_lock_status 
DROP CONSTRAINT IF EXISTS water_lock_status_id_tb_key;

-- Keep index for performance (but not unique)
DROP INDEX IF EXISTS water_lock_status_id_tb_key;
CREATE INDEX IF NOT EXISTS idx_water_lock_status_id_tb ON water_lock_status(id_tb);

-- Note: Now we can have multiple lock/unlock records with same id_tb
-- Primary key is still 'id' (UUID)
-- This allows tracking full history of lock/unlock events
