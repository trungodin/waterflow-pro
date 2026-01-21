'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface Customer {
  DanhBa: string
  TenKH: string
  DiaChi: string
  SoNha: string
  Duong: string
  GB: string
  TongNo?: number
  TongKy?: number
}

export async function searchCustomers(searchTerm: string = '', limit: number = 100) {
  try {
    // Build search query
    let whereClause = "WHERE 1=1"
    
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.trim()
      
      // Check if search term is numeric (danh ba or so nha)
      if (/^\d+$/.test(term)) {
        whereClause += ` AND (DanhBa LIKE '%${term}%' OR SoNha LIKE '%${term}%')`
      } else {
        // Text search: ten KH, dia chi, duong
        const words = term.split(' ').filter(w => w.length > 0)
        const searchConditions = words.map(word => 
          `(TenKH LIKE N'%${word}%' OR DiaChi LIKE N'%${word}%' OR Duong LIKE N'%${word}%')`
        ).join(' AND ')
        whereClause += ` AND (${searchConditions})`
      }
    }
    
    const query = `
      SELECT TOP ${limit}
        kh.DanhBa,
        kh.TenKH,
        kh.DiaChi,
        kh.SoNha,
        kh.Duong,
        kh.GB
      FROM KhachHang kh WITH (NOLOCK)
      ${whereClause}
      ORDER BY kh.DanhBa
    `
    
    const results = await executeSqlQuery('f_Select_SQL_KhachHang', query)
    return results as Customer[]
    
  } catch (error) {
    console.error('Error searching customers:', error)
    return []
  }
}

export async function getCustomerDetails(danhBa: string) {
  try {
    // Get customer info
    const customerQuery = `
      SELECT 
        kh.DanhBa,
        kh.TenKH,
        kh.DiaChi,
        kh.SoNha,
        kh.Duong,
        kh.GB,
        kh.CMND,
        kh.DienThoai,
        kh.Email
      FROM KhachHang kh WITH (NOLOCK)
      WHERE kh.DanhBa = '${danhBa}'
    `
    
    // Get latest reading
    const readingQuery = `
      SELECT TOP 1
        ds.Nam,
        ds.Ky,
        ds.ChiSoCu,
        ds.ChiSoMoi,
        ds.TieuThuMoi,
        ds.NgayGhi
      FROM DocSo ds WITH (NOLOCK)
      WHERE ds.DanhBa = '${danhBa}'
      ORDER BY ds.Nam DESC, ds.Ky DESC
    `
    
    // Get debt info
    const debtQuery = `
      SELECT 
        COUNT(*) as TongKy,
        SUM(CASE WHEN NGAYGIAI IS NULL THEN 1 ELSE 0 END) as KyChuaThu,
        SUM(CASE WHEN NGAYGIAI IS NULL THEN TONGCONG_BD ELSE 0 END) as TongNo
      FROM HoaDon WITH (NOLOCK)
      WHERE DanhBa = '${danhBa}'
    `
    
    const [customerData, readingData, debtData] = await Promise.all([
      executeSqlQuery('f_Select_SQL_KhachHang', customerQuery),
      executeSqlQuery('f_Select_SQL_Doc_so', readingQuery),
      executeSqlQuery('f_Select_SQL_Thutien', debtQuery)
    ])
    
    return {
      customer: customerData[0] || null,
      latestReading: readingData[0] || null,
      debt: debtData[0] || null
    }
    
  } catch (error) {
    console.error('Error getting customer details:', error)
    return null
  }
}
