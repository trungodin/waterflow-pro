'use server'

import { appendData_ToSheet } from '../googlesheets'

// Constants equivalent to Python backend
const DB_SHEET_NAME = process.env.DB_SHEET || 'database'
const NHAC_NO_SHEET_NAME = process.env.NHAC_NO_SHEET || 'nhac_no_ds'
const TRACKING_SHEET_URL = "https://capnuocbenthanh.com/tra-cuu/?code="

/**
 * Gửi danh sách đi xử lý (Database Sheet)
 * Note: App cũ ghi từ cột B (Cột A bỏ trống hoặc có mục đích khác).
 * Columns: STT, danh_bo, so_nha, DCTT, ten_duong, ten_kh, tong_ky, tong_tien, ky_nam, GB, DOT, hop_bv, so_than, nhom, ngay_giao_ds, ID, tra_cuu_no
 */
export async function sendToListSheet(selectedData: any[], assignGroup: string, assignDate: string) {
    try {
        if (!selectedData || selectedData.length === 0) return { success: false, message: 'Không có dữ liệu để gửi' }
        if (!assignGroup) return { success: false, message: 'Chưa chọn nhóm' }
        if (!assignDate) return { success: false, message: 'Chưa chọn ngày giao' }

        const todayStr = new Date().toLocaleDateString('en-GB').split('/').join('') // DDMMYYYY (sort of, or use a library)
        // Manual formatting DDMMYYYY for ID
        const d = new Date()
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const yyyy = d.getFullYear()
        const idSuffix = `${dd}${mm}${yyyy}`

        const rows = selectedData.map((item, index) => {
            const danhBa = item.DanhBa || ''
            const stt = index + 1
            const id = `${danhBa}-${idSuffix}`
            const traCuuLink = `${TRACKING_SHEET_URL}${danhBa}`
            // HopBaoVe: true/"true" -> 1, false/"false"/empty -> 0
            const hopBaoVe = (item.HopBaoVe === true || String(item.HopBaoVe).toLowerCase() === 'true') ? '1' : '0'

            // Columns mapping:
            // 0: Empty (Column A)
            // 1: STT
            // 2: danh_bo
            // 3: so_nha
            // 4: DCTT (SoMoi)
            // 5: ten_duong
            // 6: ten_kh
            // 7: tong_ky
            // 8: tong_tien
            // 9: ky_nam
            // 10: GB
            // 11: DOT
            // 12: hop_bv
            // 13: so_than
            // 14: nhom (assignGroup)
            // 15: ngay_giao_ds (assignDate)
            // 16: ID
            // 17: tra_cuu_no

            return [
                '', // Col A skipped
                stt,
                danhBa,
                item.SoNha || '',
                item.SoMoi || '',
                item.Duong || '',
                item.TenKH || '',
                item.TongKy,
                item.TongNo,
                item.KyNam || '',
                item.GB || '',
                item.Dot || '',
                hopBaoVe,
                item.SoThan || '',
                assignGroup,
                assignDate, // DD/MM/YYYY text
                id,
                traCuuLink
            ].map(String) // Force string conversion
        })

        const res = await appendData_ToSheet(DB_SHEET_NAME, rows)
        if (res.success) {
            return { success: true, message: `Gửi thành công ${rows.length} khách hàng cho nhóm ${assignGroup}.` }
        } else {
            return { success: false, message: res.error || 'Lỗi gửi Google Sheet' }
        }

    } catch (error: any) {
        console.error('Send List Error:', error)
        return { success: false, message: error.message }
    }
}

const MAY_TO_NHAN_VIEN: Record<string, string> = {
    '11': 'Lê Trung Quốc',
    '12': 'Vũ Hoàng Quốc Việt',
    '13': 'Lê Hồng Tuấn',
    '14': 'Bùi Xuân Hoàng',
    '15': 'Lương Văn Hùng',
    '16': 'Huỳnh Kim Luân',
    '17': 'Trần Hiệp Hòa',
    '21': 'Trần Văn Đức',
    '22': 'Võ Viết Trang',
    '23': 'Trần Quang Phương',
    '24': 'Trầm Tấn Hùng',
    '25': 'Phạm Văn Có',
    '26': 'Lê Tuân',
    '27': 'Lê Tuấn Kiệt',
    '31': 'Võ Trọng Sĩ',
    '32': 'Phạm Văn Mai',
    '33': 'Đỗ Lê Anh Tú',
    '34': 'Nguyễn Vĩnh Bảo Khôi',
    '35': 'Nguyễn Việt Toàn Nhân',
    '36': 'Trương Trọng Nhân',
    '41': 'Trần Quốc Tuấn',
    '42': 'Vũ Hoàng',
    '43': 'Dương Quốc Thống',
    '44': 'Huỳnh Ngọc Bình',
    '45': 'Hoàng Anh Vũ',
    '46': 'Phan Thành Tín'
}

/**
 * Gửi danh sách nhắc nợ (Nhac No Sheet)
 * Note: App cũ ghi từ cột A.
 * Columns: STT, danh_bo, so_nha, DCTT, ten_duong, ten_kh, tong_ky, tong_tien, ky_nam, GB, DOT, hop_bv, so_than, MLT2, ngay_giao_ds, ID, may, nhan_vien
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

        const rows = selectedData.map((item, index) => {
            const danhBa = String(item.DanhBa || '').padStart(11, '0')
            const stt = index + 1
            const id = `${danhBa}-${idSuffix}`
            // HopBaoVe: true/"true" -> 1, false/"false"/empty -> 0
            const hopBaoVe = (item.HopBaoVe === true || String(item.HopBaoVe).toLowerCase() === 'true') ? '1' : '0'
            const mlt2 = String(item.MLT2 || '').trim().padStart(9, '0')

            // Extract 'may' from Mlt2 (index 2-4 -> chars 3,4)
            // Python: mlt2_str[2:4] -> Take characters at indices 2 and 3.
            // "123456789" -> index 2 is '3', index 3 is '4'.
            // JS substring(2, 4) takes index 2 and 3. Correct.
            let may = ''
            if (mlt2.length >= 4) {
                may = mlt2.substring(2, 4)
            }

            const nhanVien = MAY_TO_NHAN_VIEN[may] || ''

            // Columns mapping:
            // 0: STT
            // 1: danh_bo
            // 2: so_nha
            // 3: DCTT (SoMoi)
            // 4: ten_duong
            // 5: ten_kh
            // 6: tong_ky
            // 7: tong_tien
            // 8: ky_nam
            // 9: GB
            // 10: DOT
            // 11: hop_bv
            // 12: so_than
            // 13: MLT2
            // 14: ngay_giao_ds
            // 15: ID
            // 16: may
            // 17: nhan_vien
            return [
                stt,
                danhBa,
                item.SoNha || '',
                item.SoMoi || '',
                item.Duong || '',
                item.TenKH || '',
                item.TongKy,
                item.TongNo,
                item.KyNam || '',
                item.GB || '',
                item.Dot || '',
                hopBaoVe,
                item.SoThan || '',
                mlt2,
                assignDate,
                id,
                may,
                nhanVien
            ].map(String)
        })

        const res = await appendData_ToSheet(NHAC_NO_SHEET_NAME, rows)
        if (res.success) {
            return { success: true, message: `Gửi nhắc nợ thành công ${rows.length} khách hàng.` }
        } else {
            return { success: false, message: res.error || 'Lỗi gửi Google Sheet' }
        }

    } catch (error: any) {
        console.error('Send Nhac No Error:', error)
        return { success: false, message: error.message }
    }
}
