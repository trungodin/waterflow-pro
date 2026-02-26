'use server'

import { createClient } from '@supabase/supabase-js'

const TRACKING_SHEET_URL = "https://capnuocbenthanh.com/tra-cuu/?code="

const getSupabaseAdmin = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

/**
 * Gửi danh sách đi xử lý (Database Sheet) -> Supabase assigned_customers
 */
export async function sendToListSheet(selectedData: any[], assignGroup: string, assignDate: string) {
    try {
        if (!selectedData || selectedData.length === 0) return { success: false, message: 'Không có dữ liệu để gửi' }
        if (!assignGroup) return { success: false, message: 'Chưa chọn nhóm' }
        if (!assignDate) return { success: false, message: 'Chưa chọn ngày giao' }

        const d = new Date()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const idSuffix = `${dd}${mm}${yyyy}`

        const upsertData = selectedData.map((item, index) => {
            const danhBa = item.DanhBa || ''
            const id = `${danhBa}-${idSuffix}`
            const traCuuLink = `${TRACKING_SHEET_URL}${danhBa}`
            const hopBaoVe = (item.HopBaoVe === true || String(item.HopBaoVe).toLowerCase() === 'true') ? '1' : '0'
            const tongKy = item.TongKy ? parseInt(item.TongKy.toString()) : null
            const tongTien = item.TongNo ? parseFloat(item.TongNo.toString().replace(/,/g, '')) : null

            return {
                ref_id: id,
                danh_bo: danhBa,
                so_nha: item.SoNha || '',
                dia_chi: item.SoMoi || '',
                duong: item.Duong || '',
                ten_kh: item.TenKH || '',
                tong_ky: tongKy,
                tong_tien: tongTien,
                ky_nam: item.KyNam || '',
                gb: item.GB || '',
                dot: item.Dot || '',
                hop_bv: hopBaoVe,
                so_than: item.SoThan || '',
                nhom: assignGroup,
                ngay_giao: assignDate,
                tra_cuu_no: traCuuLink,
                updated_at: new Date().toISOString()
            }
        })

        const supabase = getSupabaseAdmin()
        const { error } = await supabase.from('assigned_customers').upsert(upsertData, { onConflict: 'ref_id' })

        if (error) {
            console.error('Supabase Error:', error)
            return { success: false, message: 'Lỗi lưu Supabase: ' + error.message }
        }

        return { success: true, message: `Gửi thành công ${upsertData.length} khách hàng cho nhóm ${assignGroup}.` }

    } catch (error: any) {
        console.error('Send List Error:', error)
        return { success: false, message: error.message }
    }
}

const MAY_TO_NHAN_VIEN: Record<string, string> = {
    '11': 'Lê Trung Quốc', '12': 'Vũ Hoàng Quốc Việt', '13': 'Lê Hồng Tuấn', '14': 'Bùi Xuân Hoàng',
    '15': 'Lương Văn Hùng', '16': 'Huỳnh Kim Luân', '17': 'Trần Hiệp Hòa', '21': 'Trần Văn Đức',
    '22': 'Võ Viết Trang', '23': 'Trần Quang Phương', '24': 'Trầm Tấn Hùng', '25': 'Phạm Văn Có',
    '26': 'Lê Tuân', '27': 'Lê Tuấn Kiệt', '31': 'Võ Trọng Sĩ', '32': 'Phạm Văn Mai',
    '33': 'Đỗ Lê Anh Tú', '34': 'Nguyễn Vĩnh Bảo Khôi', '35': 'Nguyễn Việt Toàn Nhân', '36': 'Trương Trọng Nhân',
    '41': 'Trần Quốc Tuấn', '42': 'Vũ Hoàng', '43': 'Dương Quốc Thống', '44': 'Huỳnh Ngọc Bình',
    '45': 'Hoàng Anh Vũ', '46': 'Phan Thành Tín'
}

/**
 * Gửi danh sách nhắc nợ -> Supabase assigned_customers
 */
export async function sendToNhacNoSheet(selectedData: any[], assignDate: string) {
    try {
        if (!selectedData || selectedData.length === 0) return { success: false, message: 'Không có dữ liệu để gửi' }
        if (!assignDate) return { success: false, message: 'Chưa chọn ngày giao' }

        const d = new Date()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const idSuffix = `${dd}${mm}${yyyy}`

        const upsertData = selectedData.map((item, index) => {
            const danhBa = String(item.DanhBa || '').padStart(11, '0')
            const stt = index + 1
            const mlt2 = String(item.MLT2 || '').trim().padStart(9, '0')
            const tongKy = item.TongKy ? parseInt(item.TongKy.toString()) : null
            const tongTien = item.TongNo ? parseFloat(item.TongNo.toString().replace(/,/g, '')) : null

            let may = ''
            if (mlt2.length >= 4) {
                may = mlt2.substring(2, 4)
            }
            const nhanVien = MAY_TO_NHAN_VIEN[may] || ''

            return {
                stt: stt,
                danh_bo: danhBa,
                so_nha: item.SoNha || '',
                duong: item.Duong || '',
                ten_kh: item.TenKH || '',
                tong_ky: tongKy,
                tong_tien: tongTien,
                ky_nam: item.KyNam || '',
                dot: item.Dot || '',
                mlt: mlt2,
                ngay_giao_ds: assignDate,
                may: may,
                nhan_vien: nhanVien,
                updated_at: new Date().toISOString()
            }
        })

        const supabase = getSupabaseAdmin()
        // Dùng insert thay vì upsert để lưu lại mọi lần nhắc nợ dạng log, hoặc nếu bảng nhac_no_ds khóa by danh_bo thì upsert
        const { error } = await supabase.from('nhac_no_ds').insert(upsertData)

        if (error) {
            console.error('Supabase Error:', error)
            return { success: false, message: 'Lỗi lưu Supabase: ' + error.message }
        }

        return { success: true, message: `Gửi nhắc nợ thành công ${upsertData.length} khách hàng.` }

    } catch (error: any) {
        console.error('Send Nhac No Error:', error)
        return { success: false, message: error.message }
    }
}
