'use server'

import { executeSqlQuery } from '@/lib/soap'

// === PHÂN TÍCH THEO ĐỢT ===

export interface DotAnalysisData {
    Dot: number | string
    SoLuong: number
    SanLuong: number
    TienNuoc: number
    DoanhThu: number
    NgayDoc: string
    TangGiam: number
    SanLuong_Prev: number
}

// 6. Get Analysis By Dot
export async function getReadingAnalysisByDot(ky: number, nam: number): Promise<DotAnalysisData[]> {
    if (!ky || !nam) return []

    // 6.1 Query Current Year Data
    const queryCurrent = `
        SELECT 
            [Dot],
            COUNT(DISTINCT [DanhBa]) AS SoLuong,
            SUM(ISNULL(TRY_CAST([TieuThuMoi] AS FLOAT), 0)) AS SanLuong,
            SUM(ISNULL(TRY_CAST([TienNuoc] AS DECIMAL(18,2)), 0)) AS TienNuoc,
            SUM(ISNULL(TRY_CAST([TongTien] AS DECIMAL(18,2)), 0)) AS DoanhThu,
            MAX([DenNgay]) AS NgayDoc
        FROM [DocSo] WITH (NOLOCK)
        WHERE [Nam] = ${nam} AND [Ky] = ${ky}
          AND [Dot] IS NOT NULL
        GROUP BY [Dot]
    `

    // 6.2 Query Previous Year Data
    const queryPrevious = `
        SELECT 
            [Dot],
            SUM(ISNULL(TRY_CAST([TieuThuMoi] AS FLOAT), 0)) AS SanLuong_Prev
        FROM [DocSo] WITH (NOLOCK)
        WHERE [Nam] = ${nam - 1} AND [Ky] = ${ky}
          AND [Dot] IS NOT NULL
        GROUP BY [Dot]
    `

    try {
        const [currentData, prevData] = await Promise.all([
            executeSqlQuery('f_Select_SQL_Doc_so', queryCurrent),
            executeSqlQuery('f_Select_SQL_Doc_so', queryPrevious)
        ])

        if (!currentData || currentData.length === 0) return []

        // 6.3 Merge Data Logic (Client-side like Pandas)
        // Convert to Map for easier lookup: PrevData Map
        const prevDataMap = new Map<string, number>()
        if (prevData && Array.isArray(prevData)) {
            prevData.forEach((row: any) => {
                const dotKey = String(row.Dot).trim()
                const sl = Number(row.SanLuong_Prev) || 0
                prevDataMap.set(dotKey, sl)
            })
        }

        // Process Current Data and calculate change
        const finalResults = currentData.map((row: any) => {
            const dot = row.Dot
            const dotKey = String(dot).trim()
            
            const sanLuong = Number(row.SanLuong) || 0
            const soLuong = Number(row.SoLuong) || 0
            const tienNuoc = Number(row.TienNuoc) || 0
            const doanhThu = Number(row.DoanhThu) || 0

            // Get Prev Data
            const sanLuongPrev = prevDataMap.get(dotKey) || 0
            const tangGiam = sanLuong - sanLuongPrev

            // Format NgayDoc
            let ngayDocStr = ''
            if (row.NgayDoc) {
                try {
                   const d = new Date(row.NgayDoc)
                   // Format dd/mm/yyyy
                   ngayDocStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
                } catch (e) {
                   ngayDocStr = String(row.NgayDoc)
                }
            }

            return {
                Dot: dot,
                SoLuong: soLuong,
                SanLuong: sanLuong,
                TienNuoc: tienNuoc,
                DoanhThu: doanhThu,
                NgayDoc: ngayDocStr,
                TangGiam: tangGiam, 
                SanLuong_Prev: sanLuongPrev 
            }
        })

        // Sort by Dot (Numeric ascending)
        finalResults.sort((a: any, b: any) => Number(a.Dot) - Number(b.Dot))

        return finalResults

    } catch (error) {
        console.error("Error fetching Analysis By Dot:", error)
        return []
    }
}
