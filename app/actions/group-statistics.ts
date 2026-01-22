'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface GroupStatistics {
  group: string
  countDB: number
  totalPeriods: number
  totalDebt: number
  percentage: number
}

export async function getGroupStatistics(
  year: number | null,
  kyFilter: number | null,
  kyOperator: string | null,
  groupBy: 'DOT' | 'GB' | 'CUSTOMER_GROUP'
): Promise<GroupStatistics[]> {
  try {
    // Build WHERE conditions
    const conditions = [
      'NGAYGIAI IS NULL',
      'TONGCONG IS NOT NULL',
      'DANHBA IS NOT NULL'
    ]
    
    if (year !== null) {
      conditions.push(`NAM = ${year}`)
    }
    
    if (kyFilter !== null && kyOperator) {
      conditions.push(`KY ${kyOperator} ${kyFilter}`)
    }
    
    const whereClause = conditions.join(' AND ')
    
    let query = ''
    
    if (groupBy === 'CUSTOMER_GROUP') {
      // Customer group mapping from constants.py
      const customerGroupMapping = {
        'SINH HOẠT': [11, 21],
        'SẢN XUẤT': [12, 14, 24, 32, 36],
        'HCSN CƠ QUAN': [18, 31, 38],
        'KINH DOANH DỊCH VỤ': [13, 15, 25, 26, 29, 33, 35, 39, 68],
        'BÁN SỈ': [51, 53, 59]
      }
      
      // Build CASE WHEN clause
      const caseWhenParts = Object.entries(customerGroupMapping).map(([groupName, gbValues]) => {
        const gbList = gbValues.join(', ')
        return `WHEN GB IN (${gbList}) THEN N'${groupName}(${gbList})'`
      })
      const caseWhenClause = caseWhenParts.join(' ') + " ELSE N'KHÁC'"
      
      query = `
        WITH DanhBaNoCounts AS (
          SELECT 
            DANHBA AS DanhBa_ID,
            CASE ${caseWhenClause} END AS Nhom,
            COUNT(*) AS SoKyNoThucTe,
            SUM(TONGCONG) AS TongCongNoCuaDanhBa
          FROM HoaDon
          WHERE ${whereClause}
          GROUP BY DANHBA, CASE ${caseWhenClause} END
        ),
        GroupSummary AS (
          SELECT 
            Nhom,
            COUNT(DISTINCT DanhBa_ID) AS SoLuongDanhBa,
            SUM(SoKyNoThucTe) AS TongSoKyNo,
            SUM(TongCongNoCuaDanhBa) AS TongNo
          FROM DanhBaNoCounts
          GROUP BY Nhom
        )
        SELECT 
          Nhom,
          SoLuongDanhBa,
          TongSoKyNo,
          TongNo,
          ROUND((TongNo * 100.0 / SUM(TongNo) OVER()), 2) AS TyLePhanTram
        FROM GroupSummary
        ORDER BY SoLuongDanhBa DESC
      `
    } else {
      // DOT or GB grouping
      const groupColumn = groupBy === 'DOT' ? 'DOT' : 'GB'
      
      query = `
        WITH DanhBaNoCounts AS (
          SELECT 
            DANHBA AS DanhBa_ID,
            ${groupColumn} AS Nhom,
            COUNT(*) AS SoKyNoThucTe,
            SUM(TONGCONG) AS TongCongNoCuaDanhBa
          FROM HoaDon
          WHERE ${whereClause}
          GROUP BY DANHBA, ${groupColumn}
        ),
        GroupSummary AS (
          SELECT 
            Nhom,
            COUNT(DISTINCT DanhBa_ID) AS SoLuongDanhBa,
            SUM(SoKyNoThucTe) AS TongSoKyNo,
            SUM(TongCongNoCuaDanhBa) AS TongNo
          FROM DanhBaNoCounts
          GROUP BY Nhom
        )
        SELECT 
          Nhom,
          SoLuongDanhBa,
          TongSoKyNo,
          TongNo,
          ROUND((TongNo * 100.0 / SUM(TongNo) OVER()), 2) AS TyLePhanTram
        FROM GroupSummary
        ORDER BY SoLuongDanhBa DESC
      `
    }
    
    const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
    if (!result || !Array.isArray(result)) return []
    
    return result.map((row: any) => ({
      group: String(row.Nhom || ''),
      countDB: parseInt(row.SoLuongDanhBa || 0),
      totalPeriods: parseInt(row.TongSoKyNo || 0),
      totalDebt: parseFloat(row.TongNo || 0),
      percentage: parseFloat(row.TyLePhanTram || 0)
    }))
    
  } catch (error) {
    console.error('Error in getGroupStatistics:', error)
    return []
  }
}

export async function getAvailableYears(): Promise<number[]> {
  try {
    const query = `
      SELECT DISTINCT NAM
      FROM HoaDon
      WHERE NGAYGIAI IS NULL 
        AND TONGCONG IS NOT NULL
      ORDER BY NAM DESC
    `
    
    const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
    if (!result || !Array.isArray(result)) return []
    
    return result.map((row: any) => parseInt(row.NAM)).filter(Boolean).slice(0, 5)
    
  } catch (error) {
    console.error('Error in getAvailableYears:', error)
    return []
  }
}

export interface GroupDetail {
  danhBa: string
  tenKH: string
  so: string
  duong: string
  gb: number
  dot: number
  ky: number
  nam: number
  soTien: number
}

export async function getGroupDetails(
  groupValue: string,
  groupBy: 'DOT' | 'GB' | 'CUSTOMER_GROUP',
  year: number | null,
  kyFilter: number | null,
  kyOperator: string | null
): Promise<GroupDetail[]> {
  try {
    // Build WHERE conditions
    const conditions = [
      'NGAYGIAI IS NULL',
      'TONGCONG IS NOT NULL',
      'DANHBA IS NOT NULL'
    ]
    
    // Add group filter based on groupBy type
    if (groupBy === 'CUSTOMER_GROUP') {
      // Extract group name from "SINH HOẠT(11, 21)" format
      const match = groupValue.match(/^([^(]+)\(([^)]+)\)$/)
      if (match) {
        const gbList = match[2]
        conditions.push(`GB IN (${gbList})`)
      } else if (groupValue === 'KHÁC') {
        // For "KHÁC", exclude all defined groups
        const allDefinedGB = [11, 21, 12, 14, 24, 32, 36, 18, 31, 38, 13, 15, 25, 26, 29, 33, 35, 39, 68, 51, 53, 59]
        conditions.push(`GB NOT IN (${allDefinedGB.join(', ')})`)
      }
    } else {
      // DOT or GB grouping
      const groupColumn = groupBy === 'DOT' ? 'DOT' : 'GB'
      if (!isNaN(parseInt(groupValue))) {
        conditions.push(`${groupColumn} = ${parseInt(groupValue)}`)
      } else {
        conditions.push(`${groupColumn} = '${groupValue}'`)
      }
    }
    
    if (year !== null) {
      conditions.push(`NAM = ${year}`)
    }
    
    if (kyFilter !== null && kyOperator) {
      conditions.push(`KY ${kyOperator} ${kyFilter}`)
    }
    
    const whereClause = conditions.join(' AND ')
    
    const query = `
      SELECT 
        DANHBA,
        TENKH,
        SO,
        DUONG,
        GB,
        DOT,
        KY,
        NAM,
        TONGCONG
      FROM HoaDon
      WHERE ${whereClause}
      ORDER BY NAM DESC, KY DESC, DANHBA
    `
    
    const result = await executeSqlQuery('f_Select_SQL_Thutien', query)
    if (!result || !Array.isArray(result)) return []
    
    return result.map((row: any) => ({
      danhBa: String(row.DANHBA || '').padStart(11, '0'),
      tenKH: String(row.TENKH || ''),
      so: String(row.SO || ''),
      duong: String(row.DUONG || ''),
      gb: parseInt(row.GB || 0),
      dot: parseInt(row.DOT || 0),
      ky: parseInt(row.KY || 0),
      nam: parseInt(row.NAM || 0),
      soTien: parseFloat(row.TONGCONG || 0)
    }))
    
  } catch (error) {
    console.error('Error in getGroupDetails:', error)
    return []
  }
}

