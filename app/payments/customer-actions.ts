'use server'

import { executeSqlQuery } from '@/lib/soap'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, supabaseKey)
}

export async function fetchCustomerFromLegacy(danhBo: string) {
    if (!danhBo) return { success: false, error: 'Danh bộ không được để trống' }
    try {
        // Thử tìm trong bảng KhachHang qua SOAP API Đọc Số
        const query = `SELECT TOP 1 TenKH, So, Duong FROM KhachHang WHERE DanhBa = '${danhBo}'`
        let result = await executeSqlQuery('f_Select_SQL_Doc_so', query)
        
        if (!result || result.length === 0 || !result[0]) {
            // Nếu không có, thử tìm bên bảng HoaDon của Thu Tiền
            const fallbackQuery = `SELECT TOP 1 TENKH, SO, DUONG FROM HoaDon WHERE DANHBA = '${danhBo}' ORDER BY NAM DESC, KY DESC`
            result = await executeSqlQuery('f_Select_SQL_Thutien', fallbackQuery)
            
            if (!result || result.length === 0 || !result[0]) {
                 return { success: false, error: 'Không tìm thấy KH trong CSDL gốc!' }
            }
        }
        
        const kh = result[0];
        
        // Extract properties carefully as case might vary
        const tenKH = kh.TenKH || kh.TENKH || kh.tenkh || '';
        const soNha = kh.So || kh.SO || kh.so || '';
        const duong = kh.Duong || kh.DUONG || kh.duong || '';

        return { 
            success: true, 
            data: { 
                ten_kh: tenKH, 
                so_nha: soNha, 
                duong: duong 
            } 
        }
    } catch(e: any) {
        return { success: false, error: e.message }
    }
}

export async function insertWaterLockStatus(data: { danh_bo: string; ten_kh: string; so_nha: string; duong: string }) {
    try {
        const supabase = getSupabaseAdmin();
        
        const today = new Date();
        const dd = today.getDate().toString().padStart(2, '0');
        const mm = (today.getMonth() + 1).toString().padStart(2, '0');
        const yyyy = today.getFullYear();
        
        const hh = today.getHours().toString().padStart(2, '0');
        const min = today.getMinutes().toString().padStart(2, '0');
        const ss = today.getSeconds().toString().padStart(2, '0');
        
        const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
        const dateForId = `${dd}${mm}${yyyy}`;
        
        // MKD_01010101011_26022026
        const id_tb = `MKD_${data.danh_bo}_${dateForId}`;
        
        const lockData = {
            id_tb: id_tb,
            danh_bo: data.danh_bo,
            ten_kh: data.ten_kh,
            so_nha: data.so_nha,
            duong: data.duong,
            tinh_trang: 'Đang khoá', // Status mặc định khi thêm mới
            ngay_khoa: dateStr,
            kieu_khoa: '', // Không khóa kiểu cụ thể
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        const { error: errorLock, data: insertedLock } = await supabase.from('water_lock_status').insert([lockData]).select().single()
        if (errorLock) {
            console.error('Lỗi khi insert water_lock_status:', errorLock);
            return { success: false, error: 'Lỗi lưu trạng thái ĐMN: ' + errorLock.message }
        }

        return { success: true, data: insertedLock }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
