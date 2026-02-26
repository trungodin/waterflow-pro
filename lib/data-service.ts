import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Lazy initialization to allow scripts to load attributes first
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
    if (supabaseInstance) return supabaseInstance;
    
    // Check if we are in a browser or server environment where env vars might be available differently?
    // In Next.js, process.env should work.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        // Warning or throw? For script it might throw if not loaded, but we want it to fail gracefully if imported but not used.
        // Valid for Next.js build time too.
         throw new Error('Supabase URL/Key missing. Check .env');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
}

// --- 1. Database Sheet Replacement (assigned_customers) ---

export async function getDatabaseData() {
    try {
        // Fetch all customers using pagination to bypass Supabase 1000 record limit
        const BATCH_SIZE = 1000;
        let allData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await getSupabase()
                .from('assigned_customers')
                .select('*')
                .range(offset, offset + BATCH_SIZE - 1);

            if (error) {
                console.error('Error fetching assigned_customers:', error);
                break;
            }

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = allData.concat(data);
                offset += BATCH_SIZE;
                
                // Stop if we got less than BATCH_SIZE (last page)
                if (data.length < BATCH_SIZE) {
                    hasMore = false;
                }
            }
        }

        // Map Supabase columns (snake_case) to App's expected (PascalCase/CamelCase)
        // Previous app expected: DanhBa, TenKH, SoNha, Duong, ...
        return allData.map((item: any) => ({
            ID: item.ref_id,
            DanhBa: item.danh_bo,
            TenKH: item.ten_kh,
            SoNha: item.so_nha,
            Duong: item.duong,
            NgayGiao: item.ngay_giao,
            Nhom: item.nhom,
            GhiChu: item.ghi_chu,
            TinhTrang: item.tinh_trang,
            Dot: item.dot,
            KyNam: item.ky_nam,
            GB: item.gb,
            TongTien: item.tong_tien,
            TongKy: item.tong_ky,
            HopBaoVe: item.hop_bv,
            // New Fields
            SoThan: item.so_than,
            TraCuuNo: item.tra_cuu_no,
            HinhAnh: item.hinh_anh,
            HinhTb: item.hinh_tb,
            NgayGoiTb: item.ngay_goi_tb,
            TinhTrangNo: item.tinh_trang_no,
            NgayKhoaNuoc: item.ngay_khoa_nuoc,
            HinhDhn: item.hinh_dhn,
            HinhBienBan: item.hinh_bien_ban,
            NgayTroNgai: item.ngay_tro_ngai,
            HinhTroNgai: item.hinh_tro_ngai,
            NdTroNgai: item.nd_tro_ngai,
            BaoCaoKq: item.bao_cao_kq,
            UserSua: item.user_sua,
            DauTg: item.dau_tg,
            Dem: item.dem,
            KieuKhoa: item.kieu_khoa
        }));
    } catch (error) {
        console.error('Error in getDatabaseData:', error);
        return [];
    }
}

// --- 2. ON_OFF Sheet Replacement (water_lock_status) ---

export async function getOnOffData() {
    try {
        // 1. Fetch Water Lock Status using pagination to bypass 1000 record limit
        const PAGE_SIZE = 1000;
        let allStatusData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await getSupabase()
                .from('water_lock_status')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) {
                console.error('Error fetching water_lock_status:', error);
                break;
            }

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allStatusData = allStatusData.concat(data);
                offset += PAGE_SIZE;
                
                if (data.length < PAGE_SIZE) {
                    hasMore = false;
                }
            }
        }

        const statusData = allStatusData;

        if (!statusData || statusData.length === 0) return [];

        // 2. Extract Unique IdTbs for join
        const uniqueIdTbs = Array.from(new Set(statusData.map((item: any) => item.id_tb).filter(Boolean)));

        // 3. Fetch Matching Customers
        let customerData: any[] = [];
        const BATCH_SIZE = 1000;
        
        try {
             for (let i = 0; i < uniqueIdTbs.length; i += BATCH_SIZE) {
                const batch = uniqueIdTbs.slice(i, i + BATCH_SIZE);
                const { data, error } = await getSupabase()
                    .from('assigned_customers')
                    .select('ref_id, danh_bo, ten_kh, so_nha, duong, ky_nam, so_than, hop_bv') 
                    .in('ref_id', batch);
                
                if (!error && data) {
                    customerData.push(...data);
                }
            }
        } catch (e) {
            console.error('Error fetching customer join data:', e);
        }

        // 4. Create Map using ref_id
        const customerMap = new Map();
        customerData.forEach((c: any) => {
            if (c.ref_id) customerMap.set(c.ref_id, c);
        });

        const result = statusData.map((item: any) => {
            const customer = customerMap.get(item.id_tb) || {};
            
            // PRIORITY: water_lock_status -> assigned_customers -> Empty
            const tenKF = item.ten_kh || customer.ten_kh || '';
            const soNha = item.so_nha || customer.so_nha || '';
            const duong = item.duong || customer.duong || '';
            const kyNam = item.ky_nam || customer.ky_nam || '';

            return {
                IdTB: item.id_tb,
                DanhBa: item.danh_bo,
                TinhTrang: item.tinh_trang,
                NgayKhoa: item.ngay_khoa,
                KieuKhoa: item.kieu_khoa,
                NgayMo: item.ngay_mo,
                NhomKhoa: item.nhom_khoa,
                CodeMoi: item.code_moi,
                Dot: item.dot,
                TongKy: item.tong_ky,
                TongNo: item.tong_no,
                
                // Joined Fields with Priority
                TenKH: tenKF,
                SoNha: soNha,
                Duong: duong,
                KyNam: kyNam,
                
                // Fields from Customer Table Only
                SoThan: customer.so_than || '',
                
                // Fields from Both (Priority to Water Lock Status if synced)
                HopBaoVe: item.hop_bv || customer.hop_bv || '',

                MaSoChi: item.maso_chi,
                HinhKhoa: normalizeImagePath(item.hinh_khoa, 'database_Images'),
                MaMo: item.ma_mo,
                NvMo: item.nv_mo,
                CsMo: item.cs_mo,
                GhiChuMo: item.ghi_chu_mo,
                HinhMo: normalizeImagePath(item.hinh_mo, 'database_Images'),
                FileDeNghi: item.file_cpmn || item.file_de_nghi, 
                FileCpmn: item.file_cpmn,
                NgayCpmn: item.ngay_cpmn,
                TgCpmn: item.tg_cpmn,
                HinhTb: normalizeImagePath(item.hinh_tb, 'database_Images'),
                NgayTb: item.ngay_tb,
                CsKhoa: item.cs_khoa
            };
        });

        // Sort by NgayKhoa (DD/MM/YYYY)
        return result.sort((a: any, b: any) => {
             const parseDate = (dStr: string) => {
                 if (!dStr) return 0;
                 const parts = dStr.trim().split(/[/\s-]/);
                 if (parts.length >= 3) {
                     if (parts[2].length === 4) {
                         return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
                     }
                 }
                 return 0;
             };
             return parseDate(b.NgayKhoa) - parseDate(a.NgayKhoa);
        });

    } catch (error) {
        console.error('Error in getOnOffData:', error);
        return [];
    }
}

function normalizeImagePath(path: string, defaultFolder: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Strip AppSheet prefix: "database::database_Images/..."
    if (path.startsWith('database::')) {
        path = path.replace('database::database_Images/', 'database_Images/')
                   .replace('database::ON_OFF_Images/', 'ON_OFF_Images/')
                   .replace(/^database::/, '');
    }
    if (path.includes('/')) return path; // Already has folder
    return `${defaultFolder}/${path}`;
}

// --- 3. Image Link Resolver (Google Drive Proxy) ---
// Ảnh lưu trên Google Drive, truy cập qua /api/drive/image?path=...
// Flutter lưu path dưới dạng: "database_Images/filename.jpg" hoặc "ON_OFF_Images/filename.jpg"

export async function getDriveImageUrl(pathOrUrl: string): Promise<string> {
    if (!pathOrUrl) return '';

    // Full URL (http/https) → trả thẳng
    if (pathOrUrl.startsWith('http')) return pathOrUrl;

    // Strip AppSheet prefix nếu còn sót
    let cleanPath = pathOrUrl;
    if (cleanPath.startsWith('database::')) {
        cleanPath = cleanPath.replace('database::database_Images/', 'database_Images/')
                             .replace('database::ON_OFF_Images/', 'ON_OFF_Images/')
                             .replace(/^database::/, '');
    }

    // Nếu path không có folder prefix → giả sử database_Images
    if (!cleanPath.includes('/')) {
        cleanPath = `database_Images/${cleanPath}`;
    }

    // Build Google Drive proxy URL
    return `/api/drive/image?path=${encodeURIComponent(cleanPath)}`;
}

