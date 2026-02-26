'use server'

import { getDatabaseData, getOnOffData as getOnOffDataService, getDriveImageUrl, getSupabase } from './data-service'

// --- 1. Image Link ---
export async function getDriveImageLink(fullPath: string) {
    return getDriveImageUrl(fullPath);
}

// --- 2. Data Fetching ---

export async function getOnOffData() {
    return getOnOffDataService();
}

export async function getDatabaseSheetData() {
    return getDatabaseData();
}

// --- 3. Specific Helpers ---

export async function getCustomerStatus(danhba: string) {
    try {
        console.log('[getCustomerStatus] Input danhba:', danhba);
        
        if (!danhba) {
            console.log('[getCustomerStatus] No danhba provided');
            return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' };
        }

        // Format danhba to 11 digits
        const formattedDanhba = String(danhba).padStart(11, '0');
        console.log('[getCustomerStatus] Formatted danhba:', formattedDanhba);

        // Query Supabase for lock status
        // IMPORTANT: Get the LATEST record by created_at (timestamp)
        // because id_tb might be a string and won't sort chronologically
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('water_lock_status')
            .select('tinh_trang, ngay_khoa, ngay_mo, kieu_khoa, nhom_khoa, dot, tong_ky, tong_no, id_tb, created_at')
            .eq('danh_bo', formattedDanhba)
            .order('created_at', { ascending: false }) // Get latest by timestamp
            .limit(1);

        console.log('[getCustomerStatus] Supabase query result:', { data, error });

        if (error) {
            console.error('[getCustomerStatus] Supabase error:', error);
            return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' };
        }

        if (!data || data.length === 0) {
            console.log('[getCustomerStatus] No lock status found for danhba:', formattedDanhba);
            return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' };
        }

        const latestRecord = data[0] as any;
        console.log('[getCustomerStatus] Found latest lock status:', latestRecord);

        return {
            tinhTrang: latestRecord.tinh_trang || 'Bình thường',
            ngayKhoa: latestRecord.ngay_khoa || '',
            ngayMo: latestRecord.ngay_mo || ''
        };

    } catch (error) {
        console.error('[getCustomerStatus] Unexpected error:', error);
        return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' };
    }
}

// --- 4. Write Operations (Legacy Support / New Implementation) ---

export async function appendData_ToSheet(sheetName: string, values: any[][]) {
    // This was used to write to Sheet. Now we should write to Supabase if possible.
    // However, appendData is generic.
    // If usage is specific, we should refactor the caller.
    // If not, we log functionality not supported or implement specific logic.
    console.warn('[appendData_ToSheet] Deprecated: Writing to Google Sheets is disabled. Please use Supabase directly.');
    return { success: false, error: 'Function deprecated. Use Supabase.' };
}
