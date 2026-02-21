'use server'

import { getDatabaseSheetDataForMigration, getOnOffSheetDataForMigration } from '@/lib/migration-helper'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function syncGoogleSheetsToSupabase() {
    try {
        console.log('🚀 Starting sync from Google Sheets to Supabase...')

        const results = {
            success: true,
            customersProcessed: 0,
            customersInserted: 0,
            lockStatusProcessed: 0,
            lockStatusInserted: 0,
            errors: [] as string[]
        }

        // 0. Clear existing data to prevent duplicates
        console.log('🗑️  Clearing existing data...')
        try {
            const { error: deleteCustomersError } = await supabase
                .from('assigned_customers')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

            const { error: deleteLockStatusError } = await supabase
                .from('water_lock_status')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

            if (deleteCustomersError) {
                console.error('⚠️  Error deleting customers:', deleteCustomersError)
                results.errors.push(`Delete customers: ${deleteCustomersError.message}`)
            }
            if (deleteLockStatusError) {
                console.error('⚠️  Error deleting lock status:', deleteLockStatusError)
                results.errors.push(`Delete lock status: ${deleteLockStatusError.message}`)
            }
            console.log('✅ Existing data cleared!')
        } catch (error: any) {
            console.error('❌ Error clearing data:', error)
            results.errors.push(`Clear data: ${error.message}`)
        }

        // 1. Sync assigned_customers
        console.log('📥 Fetching Database/Assigned Customers...')
        const customerData = await getDatabaseSheetDataForMigration()
        console.log(`✅ Found ${customerData.length} customers.`)

        if (customerData.length > 0) {
            console.log('📤 Uploading to Supabase (assigned_customers)...')
            console.log('⚠️  Note: Syncing ALL records, including duplicates (danh_bo can repeat)')

            const BATCH_SIZE = 100

            for (let i = 0; i < customerData.length; i += BATCH_SIZE) {
                const batch = customerData.slice(i, i + BATCH_SIZE)
                const mapped = batch.map((d: any) => ({
                    ref_id: d.ID,
                    danh_bo: d.DanhBa,
                    ten_kh: d.TenKH,
                    dia_chi: d.DCTT,
                    ngay_giao: d.NgayGiao,
                    nhom: d.Nhom,
                    ghi_chu: d.GhiChu,
                    tinh_trang: d.TinhTrang,
                    dot: d.Dot,
                    ky_nam: d.KyNam,
                    gb: d.GB,
                    tong_tien: Number(String(d.TongTien).replace(/\D/g, '')) || 0,
                    tong_ky: parseInt(d.TongKy) || 0,
                    hop_bv: d.HopBaoVe,
                    duong: d.Duong,
                    so_nha: d.SoNha,
                    so_than: d.SoThan,
                    tra_cuu_no: d.TraCuuNo,
                    hinh_anh: d.HinhAnh,
                    hinh_tb: d.HinhTB,
                    ngay_goi_tb: d.NgayGoiTB,
                    tinh_trang_no: d.TinhTrangNo,
                    ngay_khoa_nuoc: d.NgayKhoaNuoc,
                    hinh_dhn: d.HinhDHN,
                    hinh_bien_ban: d.HinhBienBan,
                    ngay_tro_ngai: d.NgayTroNgai,
                    hinh_tro_ngai: d.HinhTroNgai,
                    nd_tro_ngai: d.NoiDungTroNgai,
                    bao_cao_kq: d.BaoCaoKQ,
                    user_sua: d.UserSua,
                    dau_tg: d.DauTG,
                    dem: d.Dem,
                    kieu_khoa: d.KieuKhoa,
                    stt: d.STT ? parseInt(String(d.STT).replace(/\\D/g, '')) || null : null
                }))

                // Upsert by ref_id (unique), not danh_bo (can have duplicates)
                const { error } = await supabase.from('assigned_customers').upsert(mapped, { onConflict: 'ref_id' })
                if (error) {
                    console.error(`❌ Error inserting batch ${i}:`, error)
                    results.errors.push(`Customers batch ${i}: ${error.message}`)
                } else {
                    results.customersInserted += mapped.length
                }
            }
            results.customersProcessed = customerData.length
        }

        // 2. Sync water_lock_status
        console.log('📥 Fetching ON_OFF Data...')
        const onOffData = await getOnOffSheetDataForMigration()
        console.log(`✅ Found ${onOffData.length} records.`)

        if (onOffData.length > 0) {
            console.log('📤 Uploading to Supabase (water_lock_status)...')
            console.log('⚠️  Note: Inserting ALL records (no deduplication, no upsert)')

            const BATCH_SIZE = 100
            for (let i = 0; i < onOffData.length; i += BATCH_SIZE) {
                const batch = onOffData.slice(i, i + BATCH_SIZE)
                const mapped = batch.map((d: any, batchIndex: number) => {
                    const idTb = d.IdTB || `${d.DanhBa}_${Date.now()}_${i + batchIndex}`

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
                        tg_cpmn: d.TgCpmn,
                        // Customer info snapshot
                        ten_kh: d.TenKH,
                        so_nha: d.SoNha,
                        duong: d.Duong,
                        ky_nam: d.KyNam
                    }
                })

                // Use INSERT instead of UPSERT to allow duplicates
                const { error } = await supabase.from('water_lock_status').insert(mapped)
                if (error) {
                    console.error(`❌ Error inserting batch ${i}:`, error)
                    results.errors.push(`Lock status batch ${i}: ${error.message}`)
                } else {
                    results.lockStatusInserted += mapped.length
                }
            }
            results.lockStatusProcessed = onOffData.length
        }

        console.log('🎉 Sync Complete!')

        if (results.errors.length > 0) {
            results.success = false
        }

        return results

    } catch (error: any) {
        console.error('[syncGoogleSheetsToSupabase] Error:', error)
        return {
            success: false,
            customersProcessed: 0,
            customersInserted: 0,
            lockStatusProcessed: 0,
            lockStatusInserted: 0,
            errors: [error.message]
        }
    }
}
