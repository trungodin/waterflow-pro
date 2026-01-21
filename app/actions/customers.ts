'use server'

import { executeSqlQuery } from '@/lib/soap'

export interface CustomerSearchParams {
  danhba?: string
  tenkh?: string
  dia_chi?: string
  mlt2?: string
  sdt?: string
  sothan?: string
  gb?: string
  tong_no?: string
  tien_hd?: string
  co?: string
  so_bien_lai?: string
}

export interface Customer {
  DanhBa: string
  TenKH: string
  So: string
  Duong: string
  MLT2: string
  SDT: string
  SoThan: string
  Hieu: string
  Co: string
  GB: string
}

export interface CustomerDetail {
  DanhBa: string
  TenKH: string
  So: string
  Duong: string
  SDT: string
  MLT2: string
  GB: string
  DM: string
  Co: string
  Hieu: string
  SoThan: string
  NgayGan: string
  HopBaoVe: number
  TinhTrang: string
  NgayKhoa?: string
  TongCongNo: number
  SoKyNo: number
  KyNamNo: string
  TenNhanVienDoc: string
}

export async function searchCustomers(params: CustomerSearchParams) {
  try {
    console.log('[searchCustomers] Input params:', params)
    
    const { 
      danhba, tenkh, dia_chi, mlt2, sdt, sothan, 
      gb, tong_no, tien_hd, co, so_bien_lai 
    } = params

    let whereClauses: string[] = []
    const COLLATION = "Vietnamese_CI_AI"

    // Priority 1: Số biên lai (standalone - ignore other filters)
    if (so_bien_lai) {
      console.log('[searchCustomers] Searching by receipt number:', so_bien_lai)
      const currentYear = new Date().getFullYear()
      const sblQuery = `
        SELECT DISTINCT TOP 50000 hd.DANHBA
        FROM ThuUNC AS unc
        INNER JOIN HoaDon AS hd ON unc.Id_hd = hd.id
        WHERE unc.SoBK = N'${so_bien_lai.replace(/'/g, "''")}'
          AND YEAR(unc.NgayThu) = ${currentYear}
      `
      
      console.log('[searchCustomers] Receipt query:', sblQuery)
      const sblResults = await executeSqlQuery('f_Select_SQL_Thutien', sblQuery)
      console.log('[searchCustomers] Receipt results:', sblResults)
      
      if (!sblResults || sblResults.length === 0) {
        console.log('[searchCustomers] No results for receipt number')
        return []
      }
      
      const danhbaList = sblResults.map((r: any) => String(r.DANHBA).padStart(11, '0'))
      const danhbaIn = danhbaList.map(db => `'${db}'`).join(',')
      
      const query = `
        SELECT DanhBa, MLT2, TenKH, So, Duong, SDT, SoThan, Hieu, Co, GB
        FROM KhachHang
        WHERE DanhBa IN (${danhbaIn})
      `
      
      console.log('[searchCustomers] Final query:', query)
      const results = await executeSqlQuery('f_Select_SQL_KhachHang', query)
      console.log('[searchCustomers] Final results:', results)
      return results as Customer[]
    }

    // Priority 2: Tổng nợ / Tiền hóa đơn
    if (tong_no || tien_hd) {
      console.log('[searchCustomers] Searching by debt/invoice')
      let debtQuery = ""
      
      if (tong_no) {
        const tongNoValue = parseFloat(tong_no.replace(/[,.]/g, ''))
        console.log('[searchCustomers] Debt amount:', tongNoValue)
        debtQuery = `
          SELECT DANHBA, SUM(TONGCONG_BD) AS TongNo
          FROM HoaDon
          WHERE NGAYGIAI IS NULL
          GROUP BY DANHBA
          HAVING ABS(SUM(TONGCONG_BD) - ${tongNoValue}) < 1
        `
      } else if (tien_hd) {
        const tienHdValue = parseFloat(tien_hd.replace(/[,.]/g, ''))
        console.log('[searchCustomers] Invoice amount:', tienHdValue)
        debtQuery = `
          SELECT DISTINCT DANHBA
          FROM HoaDon
          WHERE NGAYGIAI IS NULL
            AND ABS(TONGCONG_BD - ${tienHdValue}) < 1
        `
      }
      
      console.log('[searchCustomers] Debt query:', debtQuery)
      const debtResults = await executeSqlQuery('f_Select_SQL_Thutien', debtQuery)
      console.log('[searchCustomers] Debt results:', debtResults)
      
      if (!debtResults || debtResults.length === 0) {
        console.log('[searchCustomers] No results for debt/invoice')
        return []
      }
      
      const danhbaList = debtResults.map((r: any) => String(r.DANHBA).padStart(11, '0'))
      const danhbaIn = danhbaList.map(db => `'${db}'`).join(',')
      
      const query = `
        SELECT DanhBa, MLT2, TenKH, So, Duong, SDT, SoThan, Hieu, Co, GB
        FROM KhachHang
        WHERE DanhBa IN (${danhbaIn})
      `
      
      console.log('[searchCustomers] Final query:', query)
      const results = await executeSqlQuery('f_Select_SQL_KhachHang', query)
      console.log('[searchCustomers] Final results:', results)
      return results as Customer[]
    }

    // Priority 3: Normal filters
    console.log('[searchCustomers] Using normal filters')
    
    if (danhba) {
      whereClauses.push(`DanhBa LIKE '%${danhba.replace(/'/g, "''").trim()}%'`)
    }
    if (mlt2) {
      whereClauses.push(`MLT2 LIKE '%${mlt2.replace(/'/g, "''").trim()}%'`)
    }
    if (tenkh) {
      whereClauses.push(`TenKH LIKE N'%${tenkh.replace(/'/g, "''").trim()}%' COLLATE ${COLLATION}`)
    }
    if (sdt) {
      whereClauses.push(`SDT LIKE '%${sdt.replace(/'/g, "''").trim()}%'`)
    }
    if (sothan) {
      whereClauses.push(`SoThan LIKE '%${sothan.replace(/'/g, "''").trim()}%'`)
    }
    if (gb && gb !== "Tất cả") {
      whereClauses.push(`GB = N'${gb.replace(/'/g, "''")}'`)
    }
    if (co && co !== "Tất cả") {
      whereClauses.push(`Co = N'${co.replace(/'/g, "''")}'`)
    }
    
    // Address search (combined So + Duong)
    if (dia_chi) {
      const words = dia_chi.trim().split(/\s+/)
      words.forEach(word => {
        const safeWord = word.replace(/'/g, "''")
        whereClauses.push(
          `(ISNULL(So, '') + ' ' + ISNULL(Duong, '')) LIKE N'%${safeWord}%' COLLATE ${COLLATION}`
        )
      })
    }

    if (whereClauses.length === 0) {
      console.log('[searchCustomers] No filters provided')
      return []
    }

    const whereClause = whereClauses.join(' AND ')
    const query = `
      SELECT TOP 50000
        DanhBa, MLT2, TenKH, So, Duong, SDT, SoThan, Hieu, Co, GB
      FROM KhachHang WITH (NOLOCK)
      WHERE ${whereClause}
      ORDER BY DanhBa
    `

    console.log('[searchCustomers] Normal query:', query)
    const results = await executeSqlQuery('f_Select_SQL_Doc_so', query)
    console.log('[searchCustomers] Normal results count:', results?.length || 0)
    console.log('[searchCustomers] Normal results sample:', results?.slice(0, 3))
    
    return results as Customer[]

  } catch (error) {
    console.error('[searchCustomers] Error:', error)
    return []
  }
}

export async function getCustomerDetails(danhba: string): Promise<CustomerDetail | null> {
  try {
    // 1. Get customer info
    const khQuery = `SELECT * FROM KhachHang WHERE DanhBa = '${danhba}'`
    const khResults = await executeSqlQuery('f_Select_SQL_Doc_so', khQuery)
    
    if (!khResults || khResults.length === 0) {
      return null
    }
    
    const details: any = khResults[0]
    details.DanhBa = String(details.DanhBa).padStart(11, '0')

    // 2. Get latest reader name
    const nvQuery = `
      SELECT TOP 1 mds.NhanVienID 
      FROM DocSo AS ds 
      INNER JOIN MayDS AS mds ON ds.May = mds.May 
      WHERE ds.DanhBa = '${danhba}' 
      ORDER BY ds.Nam DESC, ds.Ky DESC
    `
    const nvResults = await executeSqlQuery('f_Select_SQL_Doc_so', nvQuery)
    details.TenNhanVienDoc = nvResults && nvResults.length > 0 ? nvResults[0].NhanVienID : 'N/A'

    // 3. Get debt info
    const hdQuery = `
      SELECT KY, NAM, TONGCONG 
      FROM HoaDon 
      WHERE DANHBA = '${danhba}' AND NGAYGIAI IS NULL
    `
    const hdResults = await executeSqlQuery('f_Select_SQL_Thutien', hdQuery)
    
    if (hdResults && hdResults.length > 0) {
      const validDebts = hdResults.filter((r: any) => parseFloat(r.TONGCONG || 0) > 0)
      if (validDebts.length > 0) {
        details.SoKyNo = validDebts.length
        details.TongCongNo = validDebts.reduce((sum: number, r: any) => sum + parseFloat(r.TONGCONG || 0), 0)
        details.KyNamNo = validDebts
          .map((r: any) => `${String(r.KY).padStart(2, '0')}/${r.NAM}`)
          .join(', ')
      } else {
        details.SoKyNo = 0
        details.TongCongNo = 0
        details.KyNamNo = 'Không có'
      }
    } else {
      details.SoKyNo = 0
      details.TongCongNo = 0
      details.KyNamNo = 'Không có'
    }

    // 4. Status (default - can be enhanced with Google Sheets later)
    details.TinhTrang = 'Bình thường'
    details.NgayKhoa = ''

    return details as CustomerDetail

  } catch (error) {
    console.error('Error getting customer details:', error)
    return null
  }
}

export async function getPaymentHistory(danhba: string) {
  try {
    const danhbaInt = parseInt(danhba)
    
    const query = `
      SELECT 
        hd.DANHBA, hd.Ky, hd.Nam, hd.TONGCONG,
        unc.NgayThu AS NgayGiai, hd.NV_GIAI, hd.SOHOADON,
        unc.SoBK
      FROM HoaDon AS hd
      LEFT JOIN ThuUNC AS unc ON hd.id = unc.Id_hd
      WHERE TRY_CAST(hd.DANHBA AS BIGINT) = ${danhbaInt}
      ORDER BY hd.Nam DESC, hd.Ky DESC
    `
    
    const results = await executeSqlQuery('f_Select_SQL_Thutien', query)
    
    if (!results || results.length === 0) {
      return []
    }

    // Format results
    return results.map((r: any) => ({
      DanhBa: String(r.DANHBA).padStart(11, '0'),
      Ky: r.Ky,
      Nam: r.Nam,
      TongCong: r.TONGCONG,
      NgayGiai: r.NgayGiai,
      NVGiai: r.NV_GIAI,
      SoHoaDon: r.SOHOADON,
      SoBienLai: r.SoBK
    }))

  } catch (error) {
    console.error('Error getting payment history:', error)
    return []
  }
}

export async function getGBValues() {
  try {
    const query = "SELECT DISTINCT GB FROM KhachHang WHERE GB IS NOT NULL ORDER BY GB"
    const results = await executeSqlQuery('f_Select_SQL_Doc_so', query)
    
    if (!results || results.length === 0) {
      return ["Tất cả"]
    }
    
    const gbList = results.map((r: any) => String(r.GB))
    return ["Tất cả", ...gbList]
  } catch (error) {
    console.error('Error getting GB values:', error)
    return ["Tất cả"]
  }
}

export async function getCoValues() {
  try {
    const query = "SELECT DISTINCT Co FROM KhachHang WHERE Co IS NOT NULL ORDER BY Co"
    const results = await executeSqlQuery('f_Select_SQL_Doc_so', query)
    
    if (!results || results.length === 0) {
      return ["Tất cả"]
    }
    
    const coList = results
      .map((r: any) => {
        const val = parseFloat(r.Co)
        return isNaN(val) ? null : String(Math.floor(val))
      })
      .filter((v): v is string => v !== null)
    
    return ["Tất cả", ...coList]
  } catch (error) {
    console.error('Error getting Co values:', error)
    return ["Tất cả"]
  }
}
