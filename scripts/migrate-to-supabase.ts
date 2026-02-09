import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getDatabaseSheetDataForMigration, getOnOffSheetDataForMigration } from '../lib/migration-helper';
import { getOnOffData } from '../lib/googlesheets';
import path from 'path';

// Load env specific to local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase Config');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function safeNum(val: any) {
    if (!val) return 0;
    const n = Number(String(val).replace(/[,.]/g, '')); // simplistic clean
    return isNaN(n) ? 0 : n;
}

async function startMigration() {
    console.log('🚀 Starting Migration from Google Sheets to Supabase...');

    // 1. Migrate Assigned Customers (database)
    console.log('📥 Fetching Database/Assigned Customers...');
    const customers = await getDatabaseSheetDataForMigration();
    console.log(`✅ Found ${customers.length} customers.`);

    if (customers.length > 0) {
        console.log('📤 Uploading to Supabase (assigned_customers)...');
        
        // Batch insert to avoid payload limit
        const BATCH_SIZE = 100;
        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const batch = customers.slice(i, i + BATCH_SIZE);
            const mapped = batch.map(c => ({
                ref_id: c.ID,
                danh_bo: c.DanhBa,
                ten_kh: c.TenKH,
                dia_chi: c.DCTT || `${c.SoNha} ${c.Duong}`, // DCTT preferred
                sdt: '', 
                ngay_giao: c.NgayGiao,
                nhom: c.Nhom,
                ky_nam: c.KyNam,
                ghi_chu: c.GhiChu,
                tong_tien: Number(String(c.TongTien).replace(/\D/g, '')) || 0,
                tong_ky: Number(c.TongKy) || 0,
                duong: c.Duong,
                so_nha: c.SoNha,
                hop_bv: c.HopBaoVe,
                dot: c.Dot,
                gb: c.GB,
                // New Fields
                so_than: c.SoThan,
                tra_cuu_no: c.TraCuuNo,
                hinh_anh: c.HinhAnh,
                hinh_tb: c.HinhTB,
                ngay_goi_tb: c.NgayGoiTB,
                tinh_trang_no: c.TinhTrangNo,
                ngay_khoa_nuoc: c.NgayKhoaNuoc,
                hinh_dhn: c.HinhDHN,
                hinh_bien_ban: c.HinhBienBan,
                ngay_tro_ngai: c.NgayTroNgai,
                hinh_tro_ngai: c.HinhTroNgai,
                nd_tro_ngai: c.NoiDungTroNgai,
                bao_cao_kq: c.BaoCaoKQ,
                tinh_trang: c.TinhTrang,
                user_sua: c.UserSua,
                dau_tg: c.DauTG,
                dem: c.Dem,
                kieu_khoa: c.KieuKhoa
            }));

            const { error } = await supabase.from('assigned_customers').upsert(mapped, { onConflict: 'danh_bo' });
            if (error) {
                console.error(`❌ Error inserting batch ${i}:`, error);
            } else {
                console.log(`✅ Inserted batch ${i} - ${i + mapped.length}`);
            }
        }
    }

    // 2. Migrate On/Off Data
    console.log('📥 Fetching ON_OFF Data...');
    const onOffData = await getOnOffSheetDataForMigration();
    console.log(`✅ Found ${onOffData.length} records.`);

    if (onOffData.length > 0) {
        console.log('📤 Uploading to Supabase (water_lock_status)...');
        
        // Deduplicate by id_tb OR danh_bo (keep last occurrence)
        // Some rows might not have id_tb, so we use danh_bo as fallback
        const deduped = new Map();
        let skipped = 0;
        
        onOffData.forEach((d: any, index: number) => {
            const key = d.IdTB || d.DanhBa || `row_${index}`;
            
            if (!d.DanhBa) {
                console.warn(`⚠️  Row ${index + 2} has no DanhBa, skipping...`);
                skipped++;
                return;
            }
            
            deduped.set(key, d);
        });
        
        const uniqueData = Array.from(deduped.values());
        console.log(`🔄 Processed: ${onOffData.length} rows → ${uniqueData.length} unique records (${skipped} skipped due to missing DanhBa)`);
        
        // Batch
        const BATCH_SIZE = 100;
        for (let i = 0; i < uniqueData.length; i += BATCH_SIZE) {
            const batch = uniqueData.slice(i, i + BATCH_SIZE);
            const mapped = await Promise.all(batch.map(async (d: any, batchIndex: number) => {
                // Generate id_tb if missing
                const idTb = d.IdTB || `${d.DanhBa}_${Date.now()}_${i + batchIndex}`;
                
                return {
                    id_tb: idTb,
                    danh_bo: d.DanhBa,
                    tinh_trang: d.TinhTrang,
                    ngay_khoa: d.NgayKhoa,
                    kieu_khoa: d.KieuKhoa,
                    ngay_mo: d.NgayMo,
                    nhom_khoa: d.NhomKhoa,
                    code_moi: d.MaMo,
                    ma_mo: d.MaMo,
                    hinh_khoa: d.HinhKhoa,
                    ghi_chu_mo: d.GhiChuMo,
                    hinh_mo: d.HinhMo,
                    hinh_tb: d.HinhTb,
                    ngay_tb: d.NgayTb,
                    file_de_nghi: d.FileDeNghi,
                    file_cpmn: d.FileCpmn,
                    nv_mo: d.NvMo,
                    dot: d.Dot,
                    tong_ky: d.TongKy, 
                    tong_no: Number(String(d.TongNo).replace(/\D/g, '')) || 0,
                    cs_khoa: d.CsKhoa,
                    maso_chi: d.MaSoChi,
                    hop_bv: d.HopBaoVe,
                    cs_mo: d.CsMo,
                    ngay_cpmn: d.NgayCpmn,
                    tg_cpmn: d.TgCpmn
                };
            }));

            const { error } = await supabase.from('water_lock_status').upsert(mapped, { onConflict: 'id_tb' });
            if (error) {
                console.error(`❌ Error inserting batch ON_OFF ${i}:`, error);
            } else {
                console.log(`✅ Inserted ON_OFF batch ${i} - ${Math.min(i + BATCH_SIZE, uniqueData.length)}`);
            }
        }
    }

    console.log('🎉 Migration Complete!');
}

startMigration().catch(console.error);
