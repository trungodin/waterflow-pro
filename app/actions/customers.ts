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
  NgayMo?: string
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
        FROM ThuUNC AS unc WITH (NOLOCK)
        INNER JOIN HoaDon AS hd WITH (NOLOCK) ON unc.Id_hd = hd.id
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
        FROM KhachHang WITH (NOLOCK)
        WHERE DanhBa IN (${danhbaIn})
      `
      
      console.log('[searchCustomers] Final query:', query)
      const results = await executeSqlQuery('f_Select_SQL_Doc_so', query)
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
          SELECT DANHBA, SUM(TONGCONG) AS TongNo
          FROM HoaDon WITH (NOLOCK)
          WHERE NGAYGIAI IS NULL
          GROUP BY DANHBA
          HAVING ABS(SUM(TONGCONG) - ${tongNoValue}) < 1
        `
      } else if (tien_hd) {
        const tienHdValue = parseFloat(tien_hd.replace(/[,.]/g, ''))
        console.log('[searchCustomers] Invoice amount:', tienHdValue)
        debtQuery = `
          SELECT DISTINCT DANHBA
          FROM HoaDon WITH (NOLOCK)
          WHERE NGAYGIAI IS NULL
            AND ABS(TONGCONG - ${tienHdValue}) < 1
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
        FROM KhachHang WITH (NOLOCK)
        WHERE DanhBa IN (${danhbaIn})
      `
      
      console.log('[searchCustomers] Final query:', query)
      const results = await executeSqlQuery('f_Select_SQL_Doc_so', query)
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
    console.log('[getCustomerDetails] Input danhba:', danhba)
    
    // Ensure danhba is properly formatted (11 digits)
    const formattedDanhba = String(danhba).padStart(11, '0')
    const currentYear = new Date().getFullYear()

    // Combined Query: 
    // Set 1: Customer Info
    // Set 2: Reader Info
    // Set 3: Debt Info
    const combinedQuery = `
      -- 1. Customer Info
      SELECT TOP 1 * FROM KhachHang WITH (NOLOCK) WHERE DanhBa = '${formattedDanhba}';

      -- 2. Reader Info
      SELECT TOP 1 mds.NhanVienID 
      FROM DocSo AS ds WITH (NOLOCK)
      INNER JOIN MayDS AS mds WITH (NOLOCK) ON ds.May = mds.May 
      WHERE ds.DanhBa = '${formattedDanhba}' 
      ORDER BY ds.Nam DESC, ds.Ky DESC;

      -- 3. Debt Info
      SELECT KY, NAM, TONGCONG 
      FROM HoaDon WITH (NOLOCK)
      WHERE DANHBA = '${formattedDanhba}' AND NGAYGIAI IS NULL;
    `

    console.log('[getCustomerDetails] Executing combined query...')
    // Note: executeSqlQuery typically returns an array of result sets if multiple queries are sent
    // However, the current soap adapter implementation might flatten or return only the first.
    // Let's check if the soap adapter supports multiple result sets.
    // If not, we have to stick to JOINs or separate queries.
    // Assuming standard SQL execution, we might get a single flat array if the driver doesn't support multiple sets well.
    // SAFETY FALLBACK: Use CTE/JOINs to get everything in ONE row if possible, or parallel execution.
    // Parallel execution is safer given we don't know the exact SOAP driver behavior for multi-statement batches.
    
    // Let's use Promise.all for parallel execution instead of batch string to be 100% safe with logic preservation and adapter compatibility.
    // This is still faster than sequential await.

    const khQuery = `SELECT TOP 1 * FROM KhachHang WITH (NOLOCK) WHERE DanhBa = '${formattedDanhba}'`
    
    const nvQuery = `
      SELECT TOP 1 mds.NhanVienID 
      FROM DocSo AS ds WITH (NOLOCK)
      INNER JOIN MayDS AS mds WITH (NOLOCK) ON ds.May = mds.May 
      WHERE ds.DanhBa = '${formattedDanhba}' 
      ORDER BY ds.Nam DESC, ds.Ky DESC
    `

    const hdQuery = `
      SELECT KY, NAM, TONGCONG 
      FROM HoaDon WITH (NOLOCK)
      WHERE DANHBA = '${formattedDanhba}' AND NGAYGIAI IS NULL
    `

    // Execute efficiently in parallel
    const [khResults, nvResults, hdResults] = await Promise.all([
        executeSqlQuery('f_Select_SQL_Doc_so', khQuery),
        executeSqlQuery('f_Select_SQL_Doc_so', nvQuery),
        executeSqlQuery('f_Select_SQL_Thutien', hdQuery)
    ])

    if (!khResults || khResults.length === 0) {
      console.log('[getCustomerDetails] No customer found')
      return null
    }
    
    const details: any = khResults[0]
    details.DanhBa = String(details.DanhBa).padStart(11, '0')

    // Map Reader Info
    details.TenNhanVienDoc = nvResults && nvResults.length > 0 ? nvResults[0].NhanVienID : 'N/A'

    // Map Debt Info
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

    // 4. Get status from Google Sheets (Kept sequential as it might depend on external latency not affecting SQL pool)
    try {
      const { getCustomerStatus } = await import('@/lib/googlesheets')
      const status = await getCustomerStatus(formattedDanhba)
      details.TinhTrang = status.tinhTrang
      details.NgayKhoa = status.ngayKhoa
      details.NgayMo = status.ngayMo
    } catch (error) {
      console.error('[getCustomerDetails] Error getting status from Google Sheets:', error)
      details.TinhTrang = 'Bình thường'
      details.NgayKhoa = ''
      details.NgayMo = ''
    }

    // console.log('[getCustomerDetails] Final details:', details)
    return details as CustomerDetail

  } catch (error) {
    console.error('[getCustomerDetails] Error:', error)
    return null
  }
}

export async function getPaymentHistory(danhba: string) {
  try {
    console.log('[getPaymentHistory] Input danhba:', danhba)
    const danhbaInt = parseInt(danhba)
    
    // Step 1: Get main invoice data with SoBK
    const mainQuery = `
      SELECT 
        hd.DANHBA, hd.Ky, hd.Nam, hd.TONGCONG,
        unc.NgayThu AS NgayGiai, hd.NV_GIAI, hd.SOHOADON,
        unc.SoBK
      FROM HoaDon AS hd
      LEFT JOIN ThuUNC AS unc ON hd.id = unc.Id_hd
      WHERE TRY_CAST(hd.DANHBA AS BIGINT) = ${danhbaInt}
      ORDER BY hd.Nam DESC, hd.Ky DESC
    `
    
    console.log('[getPaymentHistory] Main query:', mainQuery)
    const mainResults = await executeSqlQuery('f_Select_SQL_Thutien', mainQuery)
    console.log('[getPaymentHistory] Main results count:', mainResults?.length || 0)
    
    if (!mainResults || mainResults.length === 0) {
      return []
    }

    // Step 2: Get BGW data (bank payment info)
    const sohoadonList = mainResults
      .map((r: any) => r.SOHOADON)
      .filter((s: any) => s != null && s !== '')
    
    let bgwData: any[] = []
    
    if (sohoadonList.length > 0) {
      const formattedList = sohoadonList.map((s: any) => `'${s}'`).join(',')
      const bgwQuery = `
        SELECT SHDon AS SOHOADON, NgayThanhToan AS NgayThuHo, MaNH AS NganHangThuHo
        FROM BGW_HD
        WHERE SHDon IN (${formattedList})
      `
      
      console.log('[getPaymentHistory] BGW query:', bgwQuery)
      bgwData = await executeSqlQuery('f_Select_SQL_Nganhang', bgwQuery)
      console.log('[getPaymentHistory] BGW results count:', bgwData?.length || 0)
    }

    // Step 3: Merge data
    const results = mainResults.map((main: any) => {
      const bgw = bgwData.find((b: any) => String(b.SOHOADON) === String(main.SOHOADON))
      
      return {
        DanhBa: String(main.DANHBA).padStart(11, '0'),
        Ky: main.Ky,
        Nam: main.Nam,
        TongCong: main.TONGCONG,
        NgayGiai: main.NgayGiai,
        NVGiai: main.NV_GIAI,
        SoHoaDon: main.SOHOADON,
        SoBienLai: main.SoBK,
        NgayThuHo: bgw?.NgayThuHo || null,
        NganHangThuHo: bgw?.NganHangThuHo || null
      }
    })

    console.log('[getPaymentHistory] Final results:', results)
    return results

  } catch (error) {
    console.error('[getPaymentHistory] Error:', error)
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
