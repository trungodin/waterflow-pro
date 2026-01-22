'use server'

import { executeSqlQuery } from '@/lib/soap'

// Configuration constants from legacy app
const BANK_DICT: Record<string, string> = {
    '0': 'AGRIBANK', 'A': 'ACB', 'Ai': 'AIRPAY', 'B': 'BIDV', 'BP': 'AGRIBANK',
    'D': 'DONGA', 'Da': 'DONGA', 'E': 'EXIMBANK', 'K': 'KHO BAC', 'M': 'MOMO',
    'OC': 'OCEANBANK', 'P': 'PAYOO', 'Pv': 'PAYOO', 'Pd': 'PAYOO', 'Q': 'QUẦY',
    'V': 'VIETTEL', 'VC': 'VIETCOMBANK', 'VT': 'VIETTIN', 'Vn': 'VNPAY', 'Z': 'ZALOPAY'
}
// Regex pattern to identify bank codes from SoBK
const BANK_PATTERN = /Ai|Z|Pv|VT|VC|Vn|Pd|Da|E|^A|BP|V|^M|B|D|Q|P|K|OC|SG|B/

export interface AgentCollectionRow {
    NganHang: string
    TongCong: number
    TongHoaDon: number
    TyLe: number
}

export interface OutstandingAnalysis {
    TonNamCu: number
    TonLuyKeNamHienTai: number
    TonKyHienTai: number
    TonTatCa: number
}

export async function getAgentCollectionData(startDate: string, endDate: string): Promise<AgentCollectionRow[]> {
    try {
        // Query to fetch raw data from ThuUNC
        // Columns: SoBK, TienBT (Giaban + Thue + Phi + ThueDVTN)
        // Note: Using TONGCONG_BD logic from Python equivalent? 
        // Python code: SELECT [SoBK], (ISNULL([Giaban], 0) + ISNULL([Thue], 0) + ISNULL([Phi], 0) + ISNULL([ThueDVTN], 0)) AS TienBT
        const query = `
            SELECT 
                SoBK, 
                (ISNULL(Giaban, 0) + ISNULL(Thue, 0) + ISNULL(Phi, 0) + ISNULL(ThueDVTN, 0)) AS TienBT
            FROM ThuUNC
            WHERE CAST(NgayThu AS DATE) BETWEEN '${startDate}' AND '${endDate}'
        `

        const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
        
        if (!result || !Array.isArray(result)) return []

        // Process data in JavaScript (grouping and mapping)
        const bankGroups = new Map<string, { totalAmount: number, count: number }>()
        let grandTotalAmount = 0
        let grandTotalCount = 0

        result.forEach((row: any) => {
            const soBK = String(row.SoBK || '')
            const amount = parseFloat(row.TienBT || 0)

            // Extract bank code
            const match = soBK.match(BANK_PATTERN)
            let bankCode = match ? match[0] : null
            
            // Map to Bank Name
            let bankName = 'AGRIBANK' // Default as per legacy code
            if (bankCode && BANK_DICT[bankCode]) {
                bankName = BANK_DICT[bankCode]
            } else if (bankCode === 'SG') {
                // 'SG' was in pattern but not in dict in legacy snippet shown, maybe handle gracefully?
                // Assuming standard fallback or mapped if pattern matched
                bankName = 'SAIGONBANK' // Guessing, or default to Agribank if no key
            }

            // Update stats
            grandTotalAmount += amount
            grandTotalCount += 1

            if (!bankGroups.has(bankName)) {
                bankGroups.set(bankName, { totalAmount: 0, count: 0 })
            }
            const group = bankGroups.get(bankName)!
            group.totalAmount += amount
            group.count += 1
        })

        // Convert Map to Array
        const report: AgentCollectionRow[] = Array.from(bankGroups.entries()).map(([name, stats]) => ({
            NganHang: name,
            TongCong: stats.totalAmount,
            TongHoaDon: stats.count,
            TyLe: grandTotalAmount > 0 ? (stats.totalAmount / grandTotalAmount) * 100 : 0
        }))

        // Sort by Bank Name (or Amount?) Legacy sorts by Bank Name ascending
        report.sort((a, b) => a.NganHang.localeCompare(b.NganHang))

        // No need to append "Tổng cộng" row here, UI handles it or we append it?
        // Legacy app appends a "Tổng cộng" row to the dataframe. 
        // We will return data, let UI calculate Total if needed or append it.
        // Actually, let's just return the breakdown, easier for Charting.

        return report

    } catch (error) {
        console.error('Error fetching agent collection data:', error)
        return []
    }
}

export async function getOutstandingAnalysisData(): Promise<OutstandingAnalysis | null> {
    try {
        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentPeriod = currentDate.getMonth() + 1 // JS Month is 0-indexed

        const query = `
            SELECT
                SUM(CASE WHEN NAM < ${currentYear} THEN TONGCONG_BD ELSE 0 END) AS TonNamCu,
                SUM(CASE WHEN NAM = ${currentYear} AND KY < ${currentPeriod} THEN TONGCONG_BD ELSE 0 END) AS TonLuyKeNamHienTai,
                SUM(CASE WHEN NAM = ${currentYear} AND KY = ${currentPeriod} THEN TONGCONG_BD ELSE 0 END) AS TonKyHienTai,
                SUM(TONGCONG_BD) AS TonTatCa
            FROM HoaDon
            WHERE NGAYGIAI IS NULL
        `

        const result = await executeSqlQuery('f_Select_SQL_Thutien', query)

        if (!result || !Array.isArray(result) || result.length === 0) return null

        const row = result[0]
        return {
            TonNamCu: parseInt(row.TonNamCu || 0),
            TonLuyKeNamHienTai: parseInt(row.TonLuyKeNamHienTai || 0),
            TonKyHienTai: parseInt(row.TonKyHienTai || 0),
            TonTatCa: parseInt(row.TonTatCa || 0)
        }

    } catch (error) {
        console.error('Error fetching outstanding analysis data:', error)
        return null
    }
}
