-- Add missing columns to water_lock_status
ALTER TABLE water_lock_status
ADD COLUMN IF NOT EXISTS cs_khoa TEXT,
ADD COLUMN IF NOT EXISTS maso_chi TEXT,
ADD COLUMN IF NOT EXISTS kieu_khoa TEXT, -- Already exists, ignore error
ADD COLUMN IF NOT EXISTS hop_bv TEXT,
ADD COLUMN IF NOT EXISTS ma_mo TEXT,
ADD COLUMN IF NOT EXISTS cs_mo TEXT,
ADD COLUMN IF NOT EXISTS file_cpmn TEXT,
ADD COLUMN IF NOT EXISTS ngay_cpmn TEXT,
ADD COLUMN IF NOT EXISTS tg_cpmn TEXT;
