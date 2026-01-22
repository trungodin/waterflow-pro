'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface CollectionSummary {
  bank: string
  count: number
  total: number
}

export interface CollectionDetail {
  danhBa: string
  ky: number
  nam: number
  khachHang: string
  soNha: string
  duong: string
  maNH: string
  soHoaDon: string
  ngayThanhToan: string
  soTien: number
  soBK?: string
}

export async function getCollectionSummary(startDate: string, endDate: string): Promise<CollectionSummary[]> {
  try {
    const query = `
      SELECT MaNH, TThu 
      FROM BGW_HD
      WHERE CAST(NgayThanhToan AS DATE) BETWEEN '${startDate}' AND '${endDate}'
        AND MaNH IS NOT NULL AND LTRIM(RTRIM(MaNH)) <> ''
    `
    
    const result = await executeSqlQuery('f_Select_SQL_Nganhang', query)
    if (!result || !Array.isArray(result)) return []

    // Group by bank
    const bankMap = new Map<string, { count: number; total: number }>()
    result.forEach((row: any) => {
      const bank = String(row.MaNH || '').trim()
      const amount = parseFloat(row.TThu || 0)
      
      if (!bankMap.has(bank)) {
        bankMap.set(bank, { count: 0, total: 0 })
      }
      const entry = bankMap.get(bank)!
      entry.count += 1
      entry.total += amount
    })

    const summary = Array.from(bankMap.entries())
      .map(([bank, stats]) => ({
        bank,
        count: stats.count,
        total: stats.total
      }))
      .sort((a, b) => a.bank.localeCompare(b.bank))

    return summary

  } catch (error) {
    console.error('Error in getCollectionSummary:', error)
    return []
  }
}

export async function getCollectionDetails(
  startDate: string,
  endDate: string,
  banks: string[]
): Promise<CollectionDetail[]> {
  try {
    if (banks.length === 0) return []

    // Build IN clause
    const bankList = banks.map(b => `'${b}'`).join(',')
    
    const query = `
      SELECT 
        DBo, KyHD, NamHD, KHang, DChi1, DChi2, MaNH,
        SHDon, NgayThanhToan, TThu
      FROM BGW_HD
      WHERE 
        CAST(NgayThanhToan AS DATE) BETWEEN '${startDate}' AND '${endDate}'
        AND MaNH IN (${bankList})
      ORDER BY NgayThanhToan
    `

    const result = await executeSqlQuery('f_Select_SQL_Nganhang', query)
    if (!result || !Array.isArray(result)) return []

    // Get SoBK from HoaDon/ThuUNC if needed
    const soHoaDonList = result.map((r: any) => r.SHDon).filter(Boolean)
    let soBKMap = new Map<string, string>()

    if (soHoaDonList.length > 0) {
      const shdList = soHoaDonList.map((s: string) => `'${s}'`).join(',')
      const queryBK = `
        SELECT hd.SOHOADON, unc.SoBK
        FROM HoaDon hd
        LEFT JOIN ThuUNC unc ON hd.id = unc.Id_hd
        WHERE hd.SOHOADON IN (${shdList})
      `
      try {
        const bkResult = await executeSqlQuery('f_Select_SQL_Thutien', queryBK)
        if (bkResult && Array.isArray(bkResult)) {
          bkResult.forEach((row: any) => {
            if (row.SOHOADON && row.SoBK) {
              soBKMap.set(row.SOHOADON, row.SoBK)
            }
          })
        }
      } catch (e) {
        console.warn('Could not fetch SoBK:', e)
      }
    }

    const details: CollectionDetail[] = result.map((row: any) => ({
      danhBa: String(row.DBo || '').padStart(11, '0'),
      ky: parseInt(row.KyHD || 0),
      nam: parseInt(row.NamHD || 0),
      khachHang: String(row.KHang || ''),
      soNha: String(row.DChi1 || ''),
      duong: String(row.DChi2 || ''),
      maNH: String(row.MaNH || ''),
      soHoaDon: String(row.SHDon || ''),
      ngayThanhToan: row.NgayThanhToan,
      soTien: parseFloat(row.TThu || 0),
      soBK: soBKMap.get(row.SHDon) || ''
    }))

    return details

  } catch (error) {
    console.error('Error in getCollectionDetails:', error)
    return []
  }
}
