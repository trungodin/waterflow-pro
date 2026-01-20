'use server'

import { executeSqlQuery } from '@/lib/soap'

export async function getDashboardData(ky: number, nam: number, namRevenue: number) {
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

  // Execute in parallel
  const [thuTienRaw, docSoRaw] = await Promise.all([
    executeSqlQuery('f_Select_SQL_Thutien', kpiThuTienQuery),
    executeSqlQuery('f_Select_SQL_Doc_so', kpiDocSoQuery)
  ])

  return {
    ...thuTienRaw[0],
    ...docSoRaw[0]
  }
}

export async function getComparisonData(year1: number, year2: number) {
  const currentMonth = new Date().getMonth() + 1
  const monthFilter = (year1 === new Date().getFullYear() || year2 === new Date().getFullYear()) 
    ? `AND Ky <= ${currentMonth}` : ''
    
  // Revenue
  const revenueQuery = `
    SELECT Nam, Ky, SUM(TONGCONG_BD) AS DoanhThu
    FROM HoaDon WHERE Nam IN (${year1}, ${year2}) ${monthFilter} GROUP BY Nam, Ky
  `
  
  // Collection
  const collectionQuery = `
    SELECT Nam, Ky, SUM(TONGCONG) AS ThucThu
    FROM HoaDon WHERE Nam IN (${year1}, ${year2}) ${monthFilter} AND NGAYGIAI IS NOT NULL AND Nam = YEAR(NGAYGIAI) AND Ky = MONTH(NGAYGIAI)
    GROUP BY Nam, Ky
  `

  // Consumption
  const consumptionQuery = `
    SELECT Nam, Ky, SUM(ISNULL(TRY_CAST(TieuThuMoi AS FLOAT), 0)) AS SanLuong
    FROM DocSo WHERE Nam IN (${year1}, ${year2}) ${monthFilter} GROUP BY Nam, Ky
  `

  const [revenueData, collectionData, consumptionData] = await Promise.all([
    executeSqlQuery('f_Select_SQL_Thutien', revenueQuery),
    executeSqlQuery('f_Select_SQL_Thutien', collectionQuery),
    executeSqlQuery('f_Select_SQL_Doc_so', consumptionQuery)
  ])

  return { revenueData, collectionData, consumptionData }
}
