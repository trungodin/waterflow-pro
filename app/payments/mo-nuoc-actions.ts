'use server'

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Parse ngày linh hoạt: "DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", ISO...
function parseDateFlexible(raw: string): Date | null {
    if (!raw || typeof raw !== 'string') return null
    const s = raw.trim()
    if (!s || s.toLowerCase() === 'nan') return null

    // DD/MM/YYYY or D/M/YYYY (Vietnam format — may have time after space or dash)
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dmy) {
        const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
        if (!isNaN(d.getTime())) return d
    }

    // YYYY-MM-DD or ISO timestamp
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (ymd) {
        const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
        if (!isNaN(d.getTime())) return d
    }

    // Fallback native JS parse
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

// Lấy danh sách mở nước hôm nay (ngay_cpmn = hôm nay)
export async function fetchTodayMoNuocData() {
    try {
        const supabase = getSupabase()
        const today = new Date()

        // Fetch ALL records with pagination (bypass Supabase 1000-row default limit)
        const PAGE_SIZE = 1000
        let allData: any[] = []
        let offset = 0
        let hasMore = true

        while (hasMore) {
            const { data, error } = await supabase
                .from('water_lock_status')
                .select('id,id_tb,danh_bo,ten_kh,so_nha,duong,ky_nam,tinh_trang,ngay_cpmn,tg_cpmn,ngay_mo,nv_mo,ghi_chu_mo,hinh_khoa,hinh_mo,tong_ky,tong_no,nhom_khoa,kieu_khoa,ngay_khoa')
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

        const statusData = allData

        if (!statusData || statusData.length === 0) return []

        // Filter client-side: ngay_cpmn matches today using flexible parser
        const filtered = statusData.filter((row: any) => {
            const raw = row.ngay_cpmn?.toString().trim() || ''
            if (!raw) return false
            const parsed = parseDateFlexible(raw)
            return parsed ? isSameDay(parsed, today) : false
        })

        if (filtered.length === 0) return []

        // Sort by tg_cpmn ascending (time of day)
        filtered.sort((a: any, b: any) => {
            const ta = a.tg_cpmn?.toString() || ''
            const tb = b.tg_cpmn?.toString() || ''
            return ta.localeCompare(tb)
        })

        // Join with assigned_customers for extra info
        const uniqueIdTbs = Array.from(
            new Set(filtered.map((r: any) => r.id_tb).filter(Boolean))
        ) as string[]
        let customerMap = new Map<string, any>()

        if (uniqueIdTbs.length > 0) {
            const { data: customers } = await supabase
                .from('assigned_customers')
                .select('ref_id, danh_bo, ten_kh, so_nha, duong, ky_nam')
                .in('ref_id', uniqueIdTbs)

            if (customers) {
                customers.forEach((c: any) => customerMap.set(c.ref_id, c))
            }
        }

        return filtered.map((item: any) => {
            const cust = customerMap.get(item.id_tb) || {}
            return {
                id: item.id,
                IdTB: item.id_tb,
                DanhBa: item.danh_bo || cust.danh_bo || '',
                TenKH: item.ten_kh || cust.ten_kh || '',
                SoNha: item.so_nha || cust.so_nha || '',
                Duong: item.duong || cust.duong || '',
                KyNam: item.ky_nam || cust.ky_nam || '',
                TinhTrang: item.tinh_trang || '',
                NgayCpmn: item.ngay_cpmn || '',
                TgCpmn: item.tg_cpmn || '',
                NgayMo: item.ngay_mo || '',
                NvMo: item.nv_mo || '',
                GhiChuMo: item.ghi_chu_mo || '',
                HinhKhoa: item.hinh_khoa || '',
                HinhMo: item.hinh_mo || '',
                TongKy: item.tong_ky || 0,
                TongNo: item.tong_no || 0,
                NhomKhoa: item.nhom_khoa || '',
                KieuKhoa: item.kieu_khoa || '',
                NgayKhoa: item.ngay_khoa || '',
            }
        })
    } catch (err) {
        console.error('fetchTodayMoNuocData error:', err)
        return []
    }
}

// Cập nhật trạng thái mở nước
export async function saveMoNuoc(
    id: string,
    ghiChuMo: string,
    nvMo: string,
    hinhMoPath: string
) {
    try {
        const supabase = getSupabase()
        const now = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        const ngayMo = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

        const updateData: Record<string, any> = {
            tinh_trang: 'Đã mở',
            ghi_chu_mo: ghiChuMo,
            ngay_mo: ngayMo,
        }
        if (nvMo) updateData.nv_mo = nvMo
        if (hinhMoPath) updateData.hinh_mo = hinhMoPath

        const { error } = await supabase
            .from('water_lock_status')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
        return { success: true }
    } catch (err: any) {
        console.error('saveMoNuoc error:', err)
        return { success: false, error: err.message }
    }
}

// Upload ảnh mở nước lên Supabase Storage
export async function uploadHinhMo(
    id: string,
    danhBa: string,
    fileBase64: string,
    mimeType: string
): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        const supabase = getSupabase()
        const fileName = `${danhBa}_${Date.now()}_mo.jpg`
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
            console.warn('Storage upload failed (path still saved):', uploadError.message)
        }

        return { success: true, path: filePath }
    } catch (err: any) {
        console.error('uploadHinhMo error:', err)
        return { success: false, error: err.message }
    }
}
