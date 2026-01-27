'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface ReadingFilters {
  ky_from: number
  nam_from: number
  ky_to?: number
  nam_to?: number
  gb_op?: string
  gb_val?: string
  ttm_op?: string
  ttm_val?: number
  ttl_op?: string
  ttl_val?: number
  cocu?: string
  dot?: number
  hieucu?: string
  codemoi?: string
  hopbaove?: string
  congdung?: string[]
  may?: string
  to?: number
  limit?: number
  offset?: number
  debtOnly?: boolean
}

// 1. Fetch Filters
// 1. Fetch Filters (Optimized)
export async function getReadingFilters() {
    // A. Pre-defined Cache (Hardcoded common values to serve immediately/fallback)
    const CACHE_DEFAULTS: any = {
        "CoCu": ["15", "20", "25", "40", "50", "80", "100", "150", "200"],
        "Dot": Array.from({length: 20}, (_, i) => i + 1), // 1..20
        "HieuCu": ["KENT", "ACTARIS", "SENSUS", "VINAKENT", "BADGER", "ABB", "BENTH", "ITRON", "ZENNER", "ASAHI"],
        "CodeMoi": ["40", "41", "42", "50", "51", "52", "60", "61", "62", "K", "N", "Q", "F"],
    }

    // B. Fetch Dynamic from DB (Restricted to CURRENT YEAR for speed)
    const filtersToLoad = {
        "CoCu": { api: "f_Select_SQL_Doc_so", table: "DocSo" },
        "Dot": { api: "f_Select_SQL_Doc_so", table: "DocSo" },
        "HieuCu": { api: "f_Select_SQL_Doc_so", table: "DocSo" },
        "CodeMoi": { api: "f_Select_SQL_Doc_so", table: "DocSo" },
        "May": { api: "f_Select_SQL_Doc_so", table: "DocSo" }, // May needs DB lookup heavily
    }

    const results: any = { ...CACHE_DEFAULTS }

    try {
        const currentYear = new Date().getFullYear()

        // 1.1 Fetch only DISTINCT values from CURRENT YEAR to be fast
        // We use Promise.all to fetch in parallel
        const promises = Object.entries(filtersToLoad).map(async ([col, info]) => {
            // Add NOLOCK and filter by NAM to avoid full table scan
            const query = `
                SELECT DISTINCT [${col}] 
                FROM [${info.table}] WITH (NOLOCK) 
                WHERE [Nam] = ${currentYear} 
                  AND [${col}] IS NOT NULL 
                  AND LTRIM(RTRIM(CAST([${col}] AS VARCHAR(MAX)))) <> '' 
                ORDER BY [${col}]
            `
            try {
                const data = await executeSqlQuery(info.api, query)
                const dbValues = data.map((row: any) => row[col])
                
                // Merge with Cache (Unique values) if exists, else just return DB values
                if (CACHE_DEFAULTS[col]) {
                     // Normalize everything to trimmed string for uniqueness check
                     const merged = Array.from(new Set([...CACHE_DEFAULTS[col], ...dbValues].map(v => String(v).trim()))).sort()
                     
                     // For numbers (Dot), sort numerically
                     if (col === 'Dot') {
                         return { col, data: merged.sort((a: any, b: any) => Number(a) - Number(b)) }
                     }
                     // For numbers-like strings (CoCu), try sort numerically if possible, else alpha
                     if (col === 'CoCu') {
                         return { col, data: merged.sort((a, b) => Number(a) - Number(b)) }
                     }

                     return { col, data: merged }
                }

                // If only DB values, also uniqueness check
                const uniqueDb = Array.from(new Set(dbValues.map((v: any) => String(v).trim()))).sort()
                return { col, data: uniqueDb }
            } catch (ignore) {
                // If DB fail, fallback to cache if available
                return { col, data: CACHE_DEFAULTS[col] || [] }
            }
        })

        // 1.2 Fetch HopBaoVe (Smaller table KhachHang, usually fast, but add NOLOCK)
        const hopBaoVePromise = (async () => {
             try {
                const query = `
                    SELECT DISTINCT
                        CASE 
                            WHEN HopBaoVe = 1 THEN N'Có Hộp Bảo Vệ'
                            WHEN HopBaoVe = 0 THEN N'Không có Hộp'
                            ELSE N'Chưa xác định'
                        END AS HopBaoVeText
                    FROM [KhachHang] WITH (NOLOCK)
                    ORDER BY HopBaoVeText
                `
                const data = await executeSqlQuery('f_Select_SQL_Doc_so', query)
                return { col: 'HopBaoVe', data: data.map((row: any) => row.HopBaoVeText) }
             } catch { return { col: 'HopBaoVe', data: ["Có Hộp Bảo Vệ", "Không có Hộp", "Chưa xác định"] } }
        })()

        // 1.3 Fetch CongDung
        const congDungPromise = (async () => {
             try {
                const query = `
                    SELECT DISTINCT [CongDung] 
                    FROM [KhachHang] WITH (NOLOCK)
                    WHERE [CongDung] IS NOT NULL 
                    AND LTRIM(RTRIM(CAST([CongDung] AS VARCHAR(MAX)))) <> '' 
                    ORDER BY [CongDung]
                `
                const data = await executeSqlQuery('f_Select_SQL_Doc_so', query)
                return { col: 'CongDung', data: data.map((row: any) => row.CongDung) }
             } catch { return { col: 'CongDung', data: [] } }
        })()

        const allResults = await Promise.all([...promises, hopBaoVePromise, congDungPromise])
        
        allResults.forEach(res => {
            if (res.data && res.data.length > 0) {
                 results[res.col] = res.data
            }
        })

        return results

    } catch (error) {
        console.error("Error fetching filters:", error)
        // Return defaults if critical failure
        return CACHE_DEFAULTS
    }
}

// 2. Fetch Detailed Data
export async function getReadingData(filters: ReadingFilters, specificColumns?: string[]) {
  try {
    const { 
        ky_from, nam_from, ky_to, nam_to, 
        gb_op, gb_val, ttm_op, ttm_val, ttl_op, ttl_val,
        cocu, dot, hieucu, codemoi, hopbaove, congdung, may,
        limit = 200, offset = 0, debtOnly
    } = filters

    const whereClauses: string[] = []
    let isRangeFilter = false
    let finalQuery = ""

    // Time Filter
    if (ky_from && nam_from) {
        if (ky_to && nam_to) {
            isRangeFilter = true
            const startPeriod = nam_from * 100 + ky_from
            const endPeriod = nam_to * 100 + ky_to
            if (startPeriod > endPeriod) throw new Error("Khoảng thời gian không hợp lệ")
            
            whereClauses.push(`(TRY_CAST(ds.[Nam] AS INT) * 100 + TRY_CAST(ds.[Ky] AS INT)) BETWEEN ${startPeriod} AND ${endPeriod}`)
        } else {
            whereClauses.push(`ds.[Nam] = ${nam_from} AND ds.[Ky] = ${ky_from}`)
        }
    } else {
        throw new Error("Thiếu thông tin kỳ/năm")
    }

    // GB Filter
    if (gb_op && gb_op !== "Tất cả" && gb_val) {
        if (gb_op === "=") {
            whereClauses.push(`ds.[GB] = '${gb_val}'`)
        } else {
            whereClauses.push(`TRY_CAST(ds.[GB] AS FLOAT) ${gb_op} ${gb_val}`)
        }
    }

    // Tieu Thu Moi Filter
    if (ttm_op && ttm_op !== "Tất cả" && ttm_val !== undefined) {
         whereClauses.push(`TRY_CAST(ds.[TieuThuMoi] AS FLOAT) ${ttm_op} ${ttm_val}`)
    }

    // Tieu Thu Lech Filter
    if (ttl_op && ttl_op !== "Tất cả" && ttl_val !== undefined) {
        const expression = "(ISNULL(TRY_CAST(ds.[TieuThuMoi] AS FLOAT), 0) - ISNULL(TRY_CAST(ds.[TieuThuCu] AS FLOAT), 0))"
        whereClauses.push(`${expression} ${ttl_op} ${ttl_val}`)
    }

    // Dropdown Filters
    if (cocu && cocu !== "Tất cả") whereClauses.push(`ds.[CoCu] = N'${cocu.replace(/'/g, "''")}'`)
    if (dot && Number(dot) >= 0) whereClauses.push(`ds.[Dot] = ${dot}`) // Note: Python logic checks type, assume number here
    if (hieucu && hieucu !== "Tất cả") whereClauses.push(`ds.[HieuCu] = N'${hieucu.replace(/'/g, "''")}'`)
    if (codemoi && codemoi !== "Tất cả") whereClauses.push(`ds.[CodeMoi] = N'${codemoi.replace(/'/g, "''")}'`)
    if (may && may !== "Tất cả") whereClauses.push(`ds.[May] = '${may}'`)

    // Hop Bao Ve
    if (hopbaove && hopbaove !== "Tất cả") {
        if (hopbaove === 'Có Hộp Bảo Vệ') whereClauses.push("kh.HopBaoVe = 1")
        else if (hopbaove === 'Không có Hộp') whereClauses.push("kh.HopBaoVe = 0")
        else if (hopbaove === 'Chưa xác định') whereClauses.push("kh.HopBaoVe IS NULL")
    }

    // Cong Dung (Multiselect)
    if (congdung && congdung.length > 0) {
        const safeList = congdung.map(c => `N'${c.replace(/'/g, "''")}'`).join(", ")
        whereClauses.push(`kh.CongDung IN (${safeList})`)
    }

    // Debt Only Filter (Must exist in HoaDon and be Unpaid)
    if (debtOnly) {
         // Filter for "Uncollected" readings for the current period.
         // Uncollected means: 
         // 1. No invoice exists in HoaDon.
         // 2. Invoice exists but is Unpaid (NGAYGIAI IS NULL).
         // 3. Invoice exists and is Paid, but in a different month (logic from old app).
         // Conversely, "Collected" means: Invoice exists matching period/year AND NGAYGIAI is NOT NULL AND MONTH(NGAYGIAI) == Ky.
         // So we use NOT EXISTS (Collected).
         whereClauses.push(`NOT EXISTS (
            SELECT 1 FROM [HoaDon] hd 
            WHERE hd.DANHBA = ds.DanhBa 
              AND TRY_CAST(hd.NAM AS INT) = ${filters.nam_from}
              AND TRY_CAST(hd.KY AS INT) = ${filters.ky_from}
              AND hd.NGAYGIAI IS NOT NULL
              AND MONTH(hd.NGAYGIAI) = ${filters.ky_from}
         )`);
      }

    const whereString = whereClauses.length > 0 ? whereClauses.join(" AND ") : "1=1"

    // Select Clause
    let selectClause = ""
    if (specificColumns && specificColumns.length > 0) {
        // Map common names to DB columns with aliases
        // Ensure to handle joins. ds.* and kh.*
        // For simplicity, we assume commonly requested columns
        // NOTE: We need to map friendly names if passed, or just expect 'ds.DanhBa' etc.
        // Let's assume the caller passes valid SQL column expressions or we build them here.
        // For the 'details' view: DanhBa, SoNhaCu, SoNhaMoi, Duong, TenKH, GB, Ky, Nam, Dot, TongTien
        const fieldMap: any = {
            "DanhBa": "ds.DanhBa",
            "SoNhaCu": "ds.SoNhaCu",
            "SoNhaMoi": "ds.SoNhaMoi",
            "Duong": "ds.Duong",
            "TenKH": "kh.TenKH",
            "GB": "ds.GB",
            "Ky": "ds.Ky",
            "Nam": "ds.Nam",
            "Dot": "ds.Dot",
            "TongTien": "ds.TongTien",
             // Add others if needed
             "MLT2": "ds.MLT2",
             "TieuThuMoi": "ds.TieuThuMoi",
             "TienNuoc": "ds.TienNuoc"
        }

        const cols = specificColumns.map(col => fieldMap[col] || `ds.[${col}]`)
        selectClause = cols.join(", ")
    } else {
        const columns = [
            "DanhBa", "MLT2", "SoNhaCu", "SoNhaMoi", "Duong", "SDT", "GB", "DM", "Nam", "Ky", "Dot", "May",
            "TBTT", "CSCu", "CSMoi", "CodeMoi", "TieuThuCu", "TieuThuMoi", "TuNgay", "DenNgay", "TienNuoc",
            "BVMT", "Thue", "TongTien", "SoThanCu", "HieuCu", "CoCu", "ViTriCu", "CongDungCu", "CongDungMoi",
            "DMACu", "GhiChuKH", "GhiChuDS", "GhiChuTV", "NVGHI", "GIOGHI", "GPSDATA", "VTGHI", "StaCapNhat",
            "MayTheoMLT", "LichSu", "SDTNT", "BVMTVAT"
        ]
        const khColumns = ["HopBaoVe", "TenKH", "CongDung"]
        
        selectClause = [
            ...columns.map(c => `ds.[${c}]`), 
            ...khColumns.map(c => `kh.[${c}]`)
        ].join(", ")
    }

    if (isRangeFilter) {
        // Range Logic
        const totalPeriods = (nam_to! - nam_from) * 12 + (ky_to! - ky_from!) + 1
        
        finalQuery = `
          WITH 
          FilteredPeriods AS (
            SELECT ds.DanhBa 
            FROM [DocSo] ds WITH(NOLOCK) 
            LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa 
            WHERE ${whereString}
          ),
          QualifiedDanhBa AS (
            SELECT [DanhBa] 
            FROM FilteredPeriods 
            GROUP BY [DanhBa] 
            HAVING COUNT(*) >= ${totalPeriods}
          ),
          RankedResult AS (
            SELECT ds.*, kh.HopBaoVe, kh.TenKH, kh.CongDung,
                   ROW_NUMBER() OVER(PARTITION BY ds.[DanhBa] ORDER BY ds.Nam DESC, ds.Ky DESC) as rn
            FROM [DocSo] AS ds WITH(NOLOCK)
            LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa 
            INNER JOIN QualifiedDanhBa qdb ON ds.DanhBa = qdb.DanhBa
          )
          SELECT ${selectClause.replace(/ds\./g, 'T1.').replace(/kh\./g, 'T1.')}
          FROM RankedResult AS T1 
          WHERE T1.rn = 1 
          ORDER BY T1.[Dot], T1.[MLT2]
          PLEASE_REPLACE_LIMIT
        `
        
    } else {
        // Single Period Logic - Optimized
        finalQuery = `
          SELECT ${selectClause}
          FROM [DocSo] ds WITH(NOLOCK)
          LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa
          WHERE ${whereString}
          ORDER BY ds.[Dot], ds.[MLT2]
          PLEASE_REPLACE_LIMIT
        `
    }
    
    // Replace LIMIT/OFFSET placeholders
    if (limit > 0) {
        finalQuery = finalQuery.replace('PLEASE_REPLACE_LIMIT', `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`)
    } else {
         finalQuery = finalQuery.replace('PLEASE_REPLACE_LIMIT', '')
    }

    const data = await executeSqlQuery('f_Select_SQL_Doc_so', finalQuery)
    
    // Post-processing
    const processed = data.map((row: any) => {
        // Force DanhBa to be at least 11 chars with leading zeros if it's numeric/string
        // Assuming DanhBa is typically <= 11 chars. 
        // If row.DanhBa is "3072833980" (10 chars), padStart(11, '0') -> "03072833980"
        let db = row.DanhBa ? String(row.DanhBa) : ''
        if (db.length > 0 && db.length < 11) {
            db = db.padStart(11, '0')
        }

        const ttMoi = parseFloat(row.TieuThuMoi) || 0
        const ttCu = parseFloat(row.TieuThuCu) || 0
        return {
            ...row,
            DanhBa: db,
            TieuThuMoi: ttMoi,
            TieuThuCu: ttCu,
            TieuThuLech: ttMoi - ttCu,
            MLT2: row.MLT2 ? String(row.MLT2).padStart(9, '0') : ''
        }
    })

    return processed

  } catch (error) {
    console.error("Error fetching reading data:", error)
    return []
  }
}

// 3. Fetch Chart Data
export async function getReadingChartData(filters: ReadingFilters, groupBy: string) {
    try {
        const { 
            ky_from, nam_from, ky_to, nam_to, 
            gb_op, gb_val, cocu, dot, hieucu, codemoi, hopbaove, may, to
        } = filters
        
        // Validate and sanitize groupBy
        const allowedGroups = ['GB', 'CoCu', 'HieuCu', 'dot_consumption', 'May', 'To']
        if (!allowedGroups.includes(groupBy)) {
            console.error(`Invalid groupBy column: ${groupBy}`)
            return []
        }

        // Similar filter logic but potentially strict subset
        const whereClauses: string[] = []
        
        if (ky_from && nam_from) {
             if (ky_to && nam_to) {
                 const startPeriod = nam_from * 100 + ky_from
                 const endPeriod = nam_to * 100 + ky_to
                 whereClauses.push(`(TRY_CAST(ds.[Nam] AS INT) * 100 + TRY_CAST(ds.[Ky] AS INT)) BETWEEN ${startPeriod} AND ${endPeriod}`)
             } else {
                 whereClauses.push(`ds.[Nam] = ${nam_from} AND ds.[Ky] = ${ky_from}`)
             }
        }
        
        // Apply filters only if they are NOT the group_by column (Python Logic)
        const filterMap: Record<string, string> = { 
            "cocu": "ds.CoCu", 
            "dot": "ds.Dot", 
            "hieucu": "ds.HieuCu", 
            "codemoi": "ds.CodeMoi", 
            "gb_op": "ds.GB",
            "may": "ds.May"
        }
        const numericFilters = ["dot", "may"]

        for (const [key, dbCol] of Object.entries(filterMap)) {
            if (key === groupBy.toLowerCase() || (key === 'gb_op' && groupBy === 'GB')) continue

        if (key === 'may') {
                if ((filters as any)[key]) whereClauses.push(`${dbCol} = '${(filters as any)[key]}'`)
            } else if (key === 'gb_op') {
                 if (gb_op && gb_op !== "Tất cả" && gb_val) {
                     if (gb_op === "=") whereClauses.push(`${dbCol} = '${gb_val}'`)
                     else whereClauses.push(`TRY_CAST(${dbCol} AS FLOAT) ${gb_op} ${gb_val}`)
                 }
            } else {
                 // Standard dropdowns
                 // Note: 'dot' key in filters is 'dot', dbCol is 'ds.Dot'
                 const val = (filters as any)[key] // access property dynamically
                 if (val && val !== "Tất cả") {
                     if (numericFilters.includes(key)) whereClauses.push(`${dbCol} = ${val}`)
                     else whereClauses.push(`${dbCol} = N'${String(val).replace(/'/g, "''")}'`)
                 }
            }
        }
        
        // Filter by To Group
        if (to && to > 0) {
             whereClauses.push(`TRY_CAST(ds.May AS INT) >= ${to * 10} AND TRY_CAST(ds.May AS INT) < ${(to + 1) * 10}`)
        }
        
        if (hopbaove && hopbaove !== "Tất cả") {
             if (hopbaove === 'Có Hộp Bảo Vệ') whereClauses.push("kh.HopBaoVe = 1")
             else if (hopbaove === 'Không có Hộp') whereClauses.push("kh.HopBaoVe = 0")
             else if (hopbaove === 'Chưa xác định') whereClauses.push("kh.HopBaoVe IS NULL")
        }

        const whereString = whereClauses.length > 0 ? whereClauses.join(" AND ") : "1=1"
        // Special handling for 'dot_consumption'
        if (groupBy === 'dot_consumption') {
            const query = `
                SELECT 
                    ds.Dot, 
                    COUNT(*) as DanhBaCount,
                    SUM(ISNULL(TRY_CAST(ds.TieuThuMoi AS FLOAT), 0)) as TotalConsumption
                FROM [DocSo] ds WITH(NOLOCK)
                LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa
                WHERE ${whereString} AND ds.Dot IS NOT NULL
                GROUP BY ds.Dot
                ORDER BY TotalConsumption DESC
            `
            return await executeSqlQuery('f_Select_SQL_Doc_so', query)
        } else if (groupBy === 'To') {
             // If filter "To" is selected, we want details by MACHINES (May) in that To
             if (to && to > 0) {
                 const query = `
                    SELECT 
                        ds.May,
                        MAX(u.Username) as StaffName,
                        COUNT(*) AS RecordCount,
                        SUM(ISNULL(TRY_CAST(ds.[TieuThuMoi] AS FLOAT), 0)) AS TotalConsumption,
                        SUM(ISNULL(TRY_CAST(ds.[TongTien] AS FLOAT), 0)) AS TotalRevenue,
                        SUM(CASE WHEN ds.[TienNuoc] > 0 THEN 1 ELSE 0 END) AS CollectedCount
                    FROM [DocSo] ds WITH(NOLOCK)
                    LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa
                    LEFT JOIN [Users] u WITH(NOLOCK) ON ds.NVGHI = u.UserID
                    WHERE ${whereString} AND ds.May IS NOT NULL
                    GROUP BY ds.May
                    ORDER BY ds.May ASC
                `
                return await executeSqlQuery('f_Select_SQL_Doc_so', query)
             } else {
                 // Overview of all Teams
                 const query = `
                    SELECT 
                        FLOOR(CAST(ds.May AS INT) / 10) as [To],
                        COUNT(*) AS RecordCount,
                        SUM(ISNULL(TRY_CAST(ds.[TieuThuMoi] AS FLOAT), 0)) AS TotalConsumption
                    FROM [DocSo] ds WITH(NOLOCK)
                    LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa
                    WHERE ${whereString} AND ds.May IS NOT NULL
                    GROUP BY FLOOR(CAST(ds.May AS INT) / 10)
                    ORDER BY [To] ASC
                `
                return await executeSqlQuery('f_Select_SQL_Doc_so', query)
             }
        } else {
            // Standard Group By
             const query = `
                SELECT 
                    ds.[${groupBy}],
                    COUNT(*) AS RecordCount,
                    SUM(ISNULL(TRY_CAST(ds.[TieuThuMoi] AS FLOAT), 0)) AS TotalConsumption
                FROM [DocSo] ds WITH(NOLOCK)
                LEFT JOIN [KhachHang] kh WITH(NOLOCK) ON ds.DanhBa = kh.DanhBa
                WHERE ${whereString} AND ds.[${groupBy}] IS NOT NULL AND LTRIM(RTRIM(CAST(ds.[${groupBy}] AS VARCHAR(MAX)))) <> ''
                GROUP BY ds.[${groupBy}]
                ORDER BY RecordCount DESC
            `
            return await executeSqlQuery('f_Select_SQL_Doc_so', query)
        }

    } catch (error) {
        console.error("Error fetching chart data:", error)
        return []
    }
}

// 4. Fetch Yearly Analysis
export interface YearlyAnalysisData {
    Nam: number | string
    TotalConsumption: number
    RecordCount: number
}

export async function getReadingYearlyAnalysis(): Promise<YearlyAnalysisData[]> {
    try {
        const query = `
            SELECT
                [Nam],
                SUM(ISNULL(TRY_CAST([TieuThuMoi] AS FLOAT), 0)) AS TotalConsumption,
                COUNT(*) AS RecordCount
            FROM [DocSo] WITH(NOLOCK)
            WHERE [Nam] IS NOT NULL AND LTRIM(RTRIM(CAST([Nam] AS VARCHAR(10)))) <> ''
            GROUP BY [Nam]
            ORDER BY TRY_CAST([Nam] AS INT) ASC
        `
        const data = await executeSqlQuery('f_Select_SQL_Doc_so', query)
        return data.map((row: any) => ({
            ...row,
            Nam: row.Nam,
            TotalConsumption: Number(row.TotalConsumption) || 0,
            RecordCount: Number(row.RecordCount) || 0
        }))
    } catch (error) {
        console.error("Error fetching yearly analysis:", error)
        return []
    }
}
