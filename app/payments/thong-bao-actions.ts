'use server'

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateFlexible(raw: string): Date | null {
    if (!raw || typeof raw !== 'string') return null
    const s = raw.trim()
    if (!s || s.toLowerCase() === 'nan') return null

    // DD/MM/YYYY or D/M/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dmy) {
        const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
        if (!isNaN(d.getTime())) return d
    }

    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (ymd) {
        const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
        if (!isNaN(d.getTime())) return d
    }

    const d = new Date(s)
    if (!isNaN(d.getTime())) return d

    return null
}

function isSameDay(a: Date, b: Date): boolean {
    return a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
}

// ─── Actions ─────────────────────────────────────────────────────────────────

// Lấy danh sách thông báo theo ngày (mặc định hôm nay)
export async function fetchThongBaoByDate(targetDate?: string) {
    try {
        const supabase = getSupabase()
        const target = targetDate
            ? (() => { const [y, m, d] = targetDate.split('-').map(Number); return new Date(y, m - 1, d) })()
            : new Date()

        // Fetch ALL assigned_customers with pagination
        const PAGE_SIZE = 1000
        let allData: any[] = []
        let offset = 0
        let hasMore = true

        while (hasMore) {
            const { data, error } = await supabase
                .from('assigned_customers')
                .select('id,ref_id,ky_nam,danh_bo,ten_kh,so_nha,duong,tong_tien,tong_ky,hop_bv,hinh_tb,ngay_giao,ngay_goi_tb,tinh_trang,hinh_anh,nhom')
                .range(offset, offset + PAGE_SIZE - 1)

            if (error) throw error
            if (!data || data.length === 0) {
                hasMore = false
            } else {
                allData = allData.concat(data)
                offset += PAGE_SIZE
                if (data.length < PAGE_SIZE) hasMore = false
            }
        }

        if (!allData || allData.length === 0) return []

        // Filter client-side: ngay_giao matches target date (thay vì ngay_tb)
        let filtered = allData.filter((row: any) => {
            const raw = row.ngay_giao?.toString().trim() || ''
            if (!raw) return false
            const parsed = parseDateFlexible(raw)
            return parsed ? isSameDay(parsed, target) : false
        })

        // Sắp xếp
        filtered.sort((a, b) => {
            const nhomA = (a.nhom || '').toLowerCase()
            const nhomB = (b.nhom || '').toLowerCase()
            if (nhomA !== nhomB) return nhomA.localeCompare(nhomB)
            return (a.danh_bo || '').localeCompare(b.danh_bo || '')
        })

        return filtered
    } catch (err) {
        console.error('fetchThongBaoByDate error:', err)
        return []
    }
}

// Upload ảnh thông báo lên Supabase Storage
export async function uploadHinhThongBao(
    id: string,
    danhBa: string,
    fileBase64: string,
    mimeType: string
): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        const supabase = getSupabase()
        const fileName = `${danhBa}_${Date.now()}_tb.jpg`
        const filePath = `ON_OFF_Images/${fileName}`

        // Convert base64 → Uint8Array
        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '')
        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
        }

        const { error: uploadError } = await supabase.storage
            .from('on-off-images')
            .upload(fileName, bytes, {
                contentType: mimeType || 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.warn('Storage upload failed:', uploadError.message)
            return { success: false, error: uploadError.message }
        }

        return { success: true, path: filePath }
    } catch (err: any) {
        console.error('uploadHinhThongBao error:', err)
        return { success: false, error: err.message }
    }
}

// Cập nhật trạng thái thông báo
export async function saveThongBaoImage(
    id: string, // ref_id
    hinhTbPath: string
) {
    try {
        const supabase = getSupabase()
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        const ngayGoiTb = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

        // Update assigned_customers
        const { error: errorS1 } = await supabase
            .from('assigned_customers')
            .update({
                hinh_tb: hinhTbPath,
                ngay_goi_tb: ngayGoiTb
            })
            .eq('ref_id', id)

        if (errorS1) throw errorS1

        // Sync sang water_lock_status
        const { data: wlsData } = await supabase
            .from('water_lock_status')
            .select('id')
            .eq('ref_id', id)
            .single()

        if (wlsData) {
            await supabase
                .from('water_lock_status')
                .update({
                    hinh_tb: hinhTbPath,
                    ngay_tb: ngayGoiTb
                })
                .eq('ref_id', id)
        }

        return { success: true, ngayGoiTb }
    } catch (err: any) {
        console.error('saveThongBaoImage error:', err)
        return { success: false, error: err.message }
    }
}

import { fetchSql } from '@/lib/soap-api'

// Kiểm tra nợ
export async function checkCustomerDebt(danhBa: string) {
    try {
        const sqlQuery = `
            SELECT DANHBA, SOHOADON, KY, NAM, TONGCONG, TENKH, SO, DUONG, GB, DOT
            FROM HoaDon 
            WHERE DANHBA = '${danhBa}' AND NGAYGIAI IS NULL
            ORDER BY NAM DESC, KY DESC
        `
        const invoices = await fetchSql('f_Select_SQL_Thutien', sqlQuery)

        if (!invoices || invoices.length === 0) {
            return { success: true, isDebt: false, message: 'Không có nợ' }
        }

        const soHoaDonList = invoices.map(inv => inv.SOHOADON).filter(Boolean)

        if (soHoaDonList.length === 0) {
            return { success: true, isDebt: false, message: 'Không có nợ' }
        }

        // Lấy hóa đơn thanh toán qua BGW
        const bgwQuery = `
            SELECT SHDon 
            FROM BGW_HD 
            WHERE SHDon IN (${soHoaDonList.map(s => `'${s}'`).join(',')})
        `
        const bgwPaid = await fetchSql('f_Select_SQL_Nganhang', bgwQuery)
        const paidSet = new Set(bgwPaid.map(x => x.SHDon))

        const unpaidInvoices = invoices.filter(inv => !paidSet.has(inv.SOHOADON))
        
        const isDebt = unpaidInvoices.length > 0
        return { success: true, isDebt, unpaidInvoices }
    } catch (err: any) {
        console.error('checkCustomerDebt error:', err)
        return { success: false, error: err.message }
    }
}
