-- ============================================
-- MIGRATION: ADD TABLES FOR GOOGLE SHEETS SYNC
-- ============================================

-- 1. Create table for assigned_customers (from DATABASE_GIAO)
CREATE TABLE IF NOT EXISTS assigned_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ref_id TEXT, -- Original ID from Sheet (lowercase 'id')
    danh_bo TEXT UNIQUE,
    ten_kh TEXT,
    dia_chi TEXT, -- DCTT
    sdt TEXT,
    ngay_giao TEXT, -- ngay_giao_ds (Date format vary)
    nhom TEXT,
    ky_nam TEXT,
    ghi_chu TEXT,
    tong_tien NUMERIC,
    tong_ky INTEGER,
    duong TEXT, -- ten_duong
    so_nha TEXT,
    hop_bv TEXT,
    dot TEXT, -- DOT
    gb TEXT, -- GB
    so_than TEXT, -- so_than
    tra_cuu_no TEXT, -- tra_cuu_no
    hinh_anh TEXT, -- Hình ảnh
    hinh_tb TEXT, -- hinh_tb
    ngay_goi_tb TEXT, -- ngay_goi_tb
    tinh_trang_no TEXT, -- tinhtrang_no
    ngay_khoa_nuoc TEXT, -- ngay_khoa_nuoc
    hinh_dhn TEXT, -- hinh_dhn
    hinh_bien_ban TEXT, -- hinh_bien_ban
    ngay_tro_ngai TEXT, -- ngay_tro_ngai
    hinh_tro_ngai TEXT, -- hinh_tro_ngai
    nd_tro_ngai TEXT, -- nd_tro_ngai
    bao_cao_kq TEXT, -- bao_cao_kq
    tinh_trang TEXT, -- tinh_trang
    user_sua TEXT, -- user_sua
    dau_tg TEXT, -- dau_tg
    dem TEXT, -- dem_
    kieu_khoa TEXT, -- kieu_khoa (also in ON_OFF but present here)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for water_lock_status (from ON_OFF)
CREATE TABLE IF NOT EXISTS water_lock_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_tb TEXT UNIQUE, -- Original Key
    danh_bo TEXT REFERENCES assigned_customers(danh_bo),
    tinh_trang TEXT,
    ngay_khoa TEXT,
    kieu_khoa TEXT,
    ngay_mo TEXT,
    nhom_khoa TEXT,
    code_moi TEXT,
    hinh_khoa TEXT,
    ghi_chu_mo TEXT,
    hinh_mo TEXT,
    hinh_tb TEXT,
    ngay_tb TEXT,
    nv_mo TEXT,
    file_de_nghi TEXT, -- Path to file (NAS or Supabase)
    dot TEXT,
    tong_ky TEXT,
    tong_no NUMERIC,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assigned_customers_danh_bo ON assigned_customers(danh_bo);
CREATE INDEX IF NOT EXISTS idx_water_lock_status_danh_bo ON water_lock_status(danh_bo);
CREATE INDEX IF NOT EXISTS idx_water_lock_status_id_tb ON water_lock_status(id_tb);

-- RLS
ALTER TABLE assigned_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_lock_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assigned_customers" ON assigned_customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert assigned_customers" ON assigned_customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update assigned_customers" ON assigned_customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view water_lock_status" ON water_lock_status
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert water_lock_status" ON water_lock_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update water_lock_status" ON water_lock_status
  FOR UPDATE USING (auth.role() = 'authenticated');
