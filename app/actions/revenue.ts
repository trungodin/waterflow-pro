'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface YearlyRevenue {
  Nam: number
  TongDoanhThu: number
  TongThucThu: number
  TonThu: number
  PhanTramDat: number
}

export interface MonthlyRevenue {
  Ky: number
  TongDoanhThuKy: number
  TongThucThuThang: number
  TonThu: number
  PhanTramDat: number
}

export interface DailyRevenue {
  NgayGiaiNgan: string // YYYY-MM-DD or ISO
  SoLuongHoaDon: number
  TongCongNgay: number
}

// Helper to format date for SQL
const formatDateForSQL = (date: Date) => {
  return date.toISOString().split('T')[0] + ' 23:59:59'
}

export async function getYearlyRevenue(startYear: number, endYear: number, dateUntil: string): Promise<YearlyRevenue[]> {
  try {
    // Note: dateUntil is expected to be 'YYYY-MM-DD'
    const endOfDayStr = `${dateUntil} 23:59:59`

    const query = `
      WITH TermA_CTE AS (
          SELECT 
              hd_a.NAM AS Nam_A, 
              SUM(hd_a.TONGCONG_BD) AS Sum_A_tongcong_bd 
          FROM HoaDon hd_a 
          WHERE hd_a.NAM >= ${startYear} AND hd_a.NAM <= ${endYear}
          AND (
              hd_a.NV_GIAI <> 'NKD' 
              OR YEAR(hd_a.NGAYGIAI) <> hd_a.NAM 
              OR hd_a.NGAYGIAI IS NULL
          )
          AND hd_a.TONGCONG_BD IS NOT NULL 
          GROUP BY hd_a.NAM
      ),
      TermB_CTE AS (
          SELECT 
              hd_b.NAM AS Nam_B, 
              SUM(hd_b.TONGCONG_BD - hd_b.TONGCONG) AS Sum_B_adjustment 
          FROM HoaDon hd_b 
          WHERE hd_b.NAM >= ${startYear} AND hd_b.NAM <= ${endYear} 
          AND YEAR(hd_b.NGAYGIAI) = hd_b.NAM 
          AND hd_b.NGAYGIAI IS NOT NULL 
          AND hd_b.NGAYGIAI <= '${endOfDayStr}' 
          AND hd_b.TONGCONG_BD IS NOT NULL 
          AND hd_b.TONGCONG IS NOT NULL 
          GROUP BY hd_b.NAM
      ),
      ThucThu_CTE AS (
          SELECT 
              t.NAM AS Nam_TT, 
              SUM(t.TONGCONG) AS ActualThucThu 
          FROM HoaDon t 
          WHERE t.NAM >= ${startYear} AND t.NAM <= ${endYear} 
          AND t.NGAYGIAI IS NOT NULL 
          AND t.NGAYGIAI <= '${endOfDayStr}' 
          AND t.NAM = YEAR(t.NGAYGIAI) 
          AND (t.NV_GIAI <> 'NKD' OR t.NV_GIAI IS NULL) 
          AND t.TONGCONG IS NOT NULL 
          GROUP BY t.NAM
      )
      SELECT 
          a.Nam_A AS Nam, 
          (ISNULL(a.Sum_A_tongcong_bd, 0) - ISNULL(b.Sum_B_adjustment, 0)) AS TongDoanhThu, 
          ISNULL(tt.ActualThucThu, 0) AS TongThucThu 
      FROM TermA_CTE a 
      LEFT JOIN ThucThu_CTE tt ON a.Nam_A = tt.Nam_TT 
      LEFT JOIN TermB_CTE b ON a.Nam_A = b.Nam_B 
      WHERE a.Nam_A IS NOT NULL ORDER BY a.Nam_A;
    `

    const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
    
    if (!result || !Array.isArray(result)) return []

    return result.map((row: any) => {
        const doanhThu = parseFloat(row.TongDoanhThu || 0)
        const thucThu = parseFloat(row.TongThucThu || 0)
        return {
            Nam: parseInt(row.Nam),
            TongDoanhThu: doanhThu,
            TongThucThu: thucThu,
            TonThu: doanhThu - thucThu,
            PhanTramDat: doanhThu !== 0 ? (thucThu / doanhThu) * 100 : 0
        }
    })

  } catch (error) {
    console.error('Error fetching yearly revenue:', error)
    return []
  }
}

export async function getMonthlyRevenue(year: number): Promise<MonthlyRevenue[]> {
    try {
        const query = `
            WITH DoanhThuTheoKy AS (
                SELECT KY AS KyDT, SUM(TONGCONG_BD) AS DoanhThuKyCalc 
                FROM HoaDon 
                WHERE NAM = ${year} AND KY IS NOT NULL AND TONGCONG_BD IS NOT NULL 
                GROUP BY KY
            ), 
            ThucThuTheoThang AS (
                SELECT MONTH(NGAYGIAI) AS ThangTT, SUM(TONGCONG) AS ThucThuThangCalc 
                FROM HoaDon 
                WHERE NAM = YEAR(NGAYGIAI) 
                AND KY = MONTH(NGAYGIAI) 
                AND YEAR(NGAYGIAI) = ${year} 
                AND TONGCONG IS NOT NULL 
                GROUP BY MONTH(NGAYGIAI)
            )
            SELECT 
                COALESCE(dtk.KyDT, ttth.ThangTT) AS Ky, 
                ISNULL(dtk.DoanhThuKyCalc, 0) AS TongDoanhThuKy, 
                ISNULL(ttth.ThucThuThangCalc, 0) AS TongThucThuThang 
            FROM DoanhThuTheoKy dtk 
            FULL OUTER JOIN ThucThuTheoThang ttth ON dtk.KyDT = ttth.ThangTT 
            WHERE COALESCE(dtk.KyDT, ttth.ThangTT) IS NOT NULL 
            ORDER BY Ky;
        `
        
        const result = await executeSqlQuery('f_Select_SQL_Thutien', query)

        if (!result || !Array.isArray(result)) return []

        return result.map((row: any) => {
            const doanhThu = parseFloat(row.TongDoanhThuKy || 0)
            const thucThu = parseFloat(row.TongThucThuThang || 0)
            return {
                Ky: parseInt(row.Ky),
                TongDoanhThuKy: doanhThu,
                TongThucThuThang: thucThu,
                TonThu: doanhThu - thucThu,
                PhanTramDat: doanhThu !== 0 ? (thucThu / doanhThu) * 100 : 0
            }
        })

    } catch (error) {
        console.error('Error fetching monthly revenue:', error)
        return []
    }
}

export async function getDailyRevenue(year: number, ky: number): Promise<DailyRevenue[]> {
    try {
        const query = `
            WITH RelevantDaysInKy AS (
                SELECT DISTINCT CAST(NGAYGIAI AS DATE) AS NgayKyRelevant 
                FROM HoaDon H_KY 
                WHERE YEAR(H_KY.NGAYGIAI) = ${year} 
                AND MONTH(H_KY.NGAYGIAI) = ${ky} 
                AND H_KY.KY = ${ky}
            ), 
            DailyAggregates AS (
                SELECT CAST(NGAYGIAI AS DATE) AS NgayGiaiAgg, 
                COUNT(DISTINCT SOHOADON) AS TotalInvoicesForDate, 
                SUM(TONGCONG) AS TotalCongForDate 
                FROM HoaDon 
                WHERE TONGCONG IS NOT NULL AND SOHOADON IS NOT NULL 
                GROUP BY CAST(NGAYGIAI AS DATE)
            )
            SELECT 
                rdk.NgayKyRelevant AS NgayGiaiNgan, 
                ISNULL(da.TotalInvoicesForDate, 0) AS SoLuongHoaDon, 
                ISNULL(da.TotalCongForDate, 0) AS TongCongNgay 
            FROM RelevantDaysInKy rdk 
            LEFT JOIN DailyAggregates da ON rdk.NgayKyRelevant = da.NgayGiaiAgg 
            ORDER BY rdk.NgayKyRelevant;
        `

        const result = await executeSqlQuery('f_Select_SQL_Thutien', query)

        if (!result || !Array.isArray(result)) return []

        return result.map((row: any) => ({
            NgayGiaiNgan: row.NgayGiaiNgan, // Keep raw string, FE will format
            SoLuongHoaDon: parseInt(row.SoLuongHoaDon || 0),
            TongCongNgay: parseFloat(row.TongCongNgay || 0)
        }))

    } catch (error) {
        console.error('Error fetching daily revenue:', error)
        return []
    }
}
