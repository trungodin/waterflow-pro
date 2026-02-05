'use server'

import { executeSqlQuery } from '@/lib/soap'
import { unstable_cache, revalidatePath } from 'next/cache'

export async function forceRefreshDashboard() {
  revalidatePath('/dashboard')
}

// Internal functions containing the actual logic
async function _getDashboardData(ky: number, nam: number, namRevenue: number) {
  const currentYearForRevenue = namRevenue
  const endOfYearStr = `${currentYearForRevenue}-12-31 23:59:59`

  // 1. Thu Tien Query
  const kpiThuTienQuery = `
    WITH 
    TermA_CTE AS (
        SELECT SUM(hd_a.TONGCONG_BD) AS Sum_A_tongcong_bd, SUM(hd_a.GIABAN_BD) AS Sum_A_giaban_bd
        FROM HoaDon hd_a WITH (NOLOCK)
        WHERE hd_a.NAM = ${currentYearForRevenue}
          AND (hd_a.NV_GIAI <> 'NKD' OR hd_a.NGAYGIAI IS NULL OR YEAR(hd_a.NGAYGIAI) <> hd_a.NAM)
    ),
    TermB_CTE AS (
        SELECT SUM(hd_b.TONGCONG_BD - hd_b.TONGCONG) AS Sum_B_adjustment_tc, SUM(hd_b.GIABAN_BD - hd_b.GIABAN) AS Sum_B_adjustment_gb
        FROM HoaDon hd_b WITH (NOLOCK)
        WHERE hd_b.NAM = ${currentYearForRevenue} AND YEAR(hd_b.NGAYGIAI) = ${currentYearForRevenue} AND hd_b.NGAYGIAI IS NOT NULL AND hd_b.NGAYGIAI <= '${endOfYearStr}'
    ),
    ThucThu_CTE AS (
        SELECT SUM(t.TONGCONG) AS ActualThucThu_TC, SUM(t.GIABAN) AS ActualThucThu_GB
        FROM HoaDon t WITH (NOLOCK)
        WHERE t.NAM = ${currentYearForRevenue} AND t.NGAYGIAI IS NOT NULL AND t.NGAYGIAI <= '${endOfYearStr}' AND t.NAM = YEAR(t.NGAYGIAI) AND (t.NV_GIAI <> 'NKD' OR t.NV_GIAI IS NULL)
    ),
    DoanhThu_Prev_CTE AS (
        SELECT SUM(hd_p.TONGCONG_BD) as DoanhThu_Prev_TC, SUM(hd_p.GIABAN_BD) as DoanhThu_Prev_GB
        FROM HoaDon hd_p WITH (NOLOCK)
        WHERE hd_p.NAM = ${currentYearForRevenue - 1}
    )
    SELECT 
        (ISNULL((SELECT Sum_A_tongcong_bd FROM TermA_CTE), 0) - ISNULL((SELECT Sum_B_adjustment_tc FROM TermB_CTE), 0)) AS DoanhThu, 
        ISNULL((SELECT ActualThucThu_TC FROM ThucThu_CTE), 0) AS ThucThu,
        (ISNULL((SELECT Sum_A_giaban_bd FROM TermA_CTE), 0) - ISNULL((SELECT Sum_B_adjustment_gb FROM TermB_CTE), 0)) AS DoanhThu_GB,
        ISNULL((SELECT ActualThucThu_GB FROM ThucThu_CTE), 0) AS ThucThu_GB,
        ISNULL((SELECT DoanhThu_Prev_TC FROM DoanhThu_Prev_CTE), 0) AS DoanhThu_Prev,
        ISNULL((SELECT DoanhThu_Prev_GB FROM DoanhThu_Prev_CTE), 0) AS DoanhThu_GB_Prev
  `

  // 2. Doc So Query (Replicating Python logic: Same Month Last Year)
  // Python: prev_year = selected_date - 1 year
  const prevYear = nam - 1
  const prevMonth = ky

  const kpiDocSoQuery = `
    SELECT
        COUNT(DISTINCT CASE WHEN Nam = ${nam} AND Ky = ${ky} THEN DanhBa END) AS TongDHN_Current,
        SUM(CASE WHEN Nam = ${nam} AND Ky = ${ky} THEN ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0) ELSE 0 END) AS SanLuong_Current,
        SUM(CASE WHEN Nam = ${nam} THEN ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0) ELSE 0 END) AS SanLuong_Year,
        COUNT(CASE WHEN Nam = ${nam} AND Ky = ${ky} AND ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0) = 0 THEN 1 END) AS DHN_BangKhong_Current,
        SUM(CASE WHEN Nam = ${prevYear} AND Ky = ${prevMonth} THEN ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0) ELSE 0 END) AS SanLuong_Prev,
        SUM(CASE WHEN Nam = ${nam - 1} THEN ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0) ELSE 0 END) AS SanLuong_Year_Prev
    FROM DocSo WITH (NOLOCK)
    WHERE Nam IN (${nam}, ${nam - 1})
  `

  // 3. Calculate Average Days (SoNgayBQ)
  const lichColumn = `TC_${ky}`
  const avgDaysQuery = `
    WITH ConsumptionByDot AS (
        SELECT Dot, SUM(ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0)) AS SL
        FROM DocSo WITH (NOLOCK)
        WHERE Nam = ${nam} AND Ky = ${ky}
        GROUP BY Dot
    ),
    DaysByDot AS (
        SELECT Dot, ${lichColumn} AS Days
        FROM LichDS WITH (NOLOCK)
        WHERE Nam = ${nam}
    )
    SELECT 
      SUM(c.SL * ISNULL(d.Days, 0)) AS WeightedSum,
      SUM(c.SL) AS TotalSL
    FROM ConsumptionByDot c
    LEFT JOIN DaysByDot d ON TRY_CAST(c.Dot AS INT) = TRY_CAST(d.Dot AS INT)
  `

  // Execute in parallel
  const [thuTienRaw, docSoRaw, avgDaysRaw] = await Promise.all([
    executeSqlQuery('f_Select_SQL_Thutien', kpiThuTienQuery),
    executeSqlQuery('f_Select_SQL_Doc_so', kpiDocSoQuery),
    executeSqlQuery('f_Select_SQL_Doc_so', avgDaysQuery)
  ])

  const avgDaysData = avgDaysRaw[0] || { WeightedSum: 0, TotalSL: 0 }
  const soNgayBQ = avgDaysData.TotalSL > 0 ? (avgDaysData.WeightedSum / avgDaysData.TotalSL) : 0

  return {
    ...thuTienRaw[0],
    ...docSoRaw[0],
    SoNgayBQ: soNgayBQ
  }
}

async function _getComparisonData(year1: number, year2: number) {
  // Removed month filter to allow full year data for comparison

  // Revenue
  const revenueQuery = `
    SELECT Nam, Ky, SUM(GIABAN_BD) AS DoanhThu
    FROM HoaDon WITH(NOLOCK) 
    WHERE Nam IN(${year1}, ${year2})
    GROUP BY Nam, Ky
    `

  // Collection
  const collectionQuery = `
    SELECT Nam, Ky, SUM(GIABAN) AS ThucThu
    FROM HoaDon WITH(NOLOCK)
    WHERE Nam IN(${year1}, ${year2})
      AND NGAYGIAI IS NOT NULL 
      AND Nam = YEAR(NGAYGIAI) 
      AND Ky = MONTH(NGAYGIAI)
    GROUP BY Nam, Ky
    `

  // Consumption
  const consumptionQuery = `
    SELECT Nam, Ky, SUM(ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0)) AS SanLuong
    FROM DocSo WITH(NOLOCK)
    WHERE Nam IN(${year1}, ${year2})
    GROUP BY Nam, Ky
    `

  const [revenueData, collectionData, consumptionData] = await Promise.all([
    executeSqlQuery('f_Select_SQL_Thutien', revenueQuery),
    executeSqlQuery('f_Select_SQL_Thutien', collectionQuery),
    executeSqlQuery('f_Select_SQL_Doc_so', consumptionQuery)
  ])

  return { revenueData, collectionData, consumptionData }
}

async function _getRevenueByPriceList(year: number) {
  // Breakdown by GB (Gia Bieu)
  const query = `
    SELECT GB, SUM(GIABAN_BD) AS DoanhThu
    FROM HoaDon 
    WHERE Nam = ${year} 
    GROUP BY GB
    ORDER BY DoanhThu DESC
    `

  const data = await executeSqlQuery('f_Select_SQL_Thutien', query)
  return data
}


async function _getRevenueByDot(year: number) {
  // Breakdown by Dot (Book/Route)
  const query = `
    SELECT Dot, SUM(GIABAN_BD) AS DoanhThu
    FROM HoaDon 
    WHERE Nam = ${year} 
    GROUP BY Dot
    ORDER BY DoanhThu DESC
    `

  const data = await executeSqlQuery('f_Select_SQL_Thutien', query)
  return data
}

async function _getConsumptionByPriceList(year: number) {
  // Breakdown by GB (Consumption)
  const query = `
    SELECT GB, SUM(ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0)) AS SanLuong
    FROM DocSo WITH(NOLOCK)
    WHERE Nam = ${year} AND GB IS NOT NULL AND GB <> ''
    GROUP BY GB
    ORDER BY SanLuong DESC
    `

  const data = await executeSqlQuery('f_Select_SQL_Doc_so', query)
  return data
}

async function _getConsumptionByDot(year: number) {
  // Breakdown by Dot (Consumption)
  const query = `
    SELECT Dot, SUM(ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0)) AS SanLuong
    FROM DocSo WITH(NOLOCK)
    WHERE Nam = ${year} AND Dot IS NOT NULL
    GROUP BY Dot
    ORDER BY SanLuong DESC
    `

  const data = await executeSqlQuery('f_Select_SQL_Doc_so', query)
  return data
}

// Export cached versions
export const getDashboardData = unstable_cache(
  _getDashboardData,
  ['dashboard-kpi-data'],
  { revalidate: 300, tags: ['dashboard'] }
)

export const getComparisonData = unstable_cache(
  _getComparisonData,
  ['dashboard-comparison-data'],
  { revalidate: 300, tags: ['dashboard'] }
)

export const getRevenueByPriceList = unstable_cache(
  _getRevenueByPriceList,
  ['dashboard-revenue-by-pricelist'],
  { revalidate: 300, tags: ['dashboard'] }
)

export const getRevenueByDot = unstable_cache(
  _getRevenueByDot,
  ['dashboard-revenue-by-dot'],
  { revalidate: 300, tags: ['dashboard'] }
)

export const getConsumptionByPriceList = unstable_cache(
  _getConsumptionByPriceList,
  ['dashboard-consumption-by-pricelist'],
  { revalidate: 300, tags: ['dashboard'] }
)

export const getConsumptionByDot = unstable_cache(
  _getConsumptionByDot,
  ['dashboard-consumption-by-dot'],
  { revalidate: 300, tags: ['dashboard'] }
)
