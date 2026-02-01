'use server'

import { google } from 'googleapis'

// Initialize Google Sheets API
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets', // Read/Write Access
      'https://www.googleapis.com/auth/drive.readonly' // Read Drive files
    ],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const drive = google.drive({ version: 'v3', auth })

  return { sheets, drive }
}

// ... existing exports ...

export async function getDriveImageLink(fullPath: string) {
  'use server'
  try {
    if (!fullPath || fullPath.startsWith('http')) return fullPath

    // Extract filename: "database_Images/abc.jpg" -> "abc.jpg"
    const filename = fullPath.split('/').pop()
    if (!filename) return ''

    const { drive } = getGoogleSheetsClient()

    // DEBUG: Log what we are searching for
    console.log(`[getDriveImageLink] Searching for: ${filename} (Full: ${fullPath})`)

    // Search for file text match
    // Note: This matches exact name. 
    const res = await drive.files.list({
      q: `name = '${filename}' and trashed = false`,
      fields: 'files(id, thumbnailLink, webContentLink, mimeType)',
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    })

    const file = res.data.files?.[0]
    console.log(`[getDriveImageLink] Found file for ${filename}:`, file ? file.id : 'NOT FOUND')

    if (file) {
      // Priority 1: Official API Thumbnail Link (usually lh3.googleusercontent.com...)
      if (file.thumbnailLink) {
        return file.thumbnailLink.replace('=s220', '=s1000') // get larger image
      }

      // Priority 2: If it's an image but no thumbnail link, force the thumbnail endpoint
      // This is more reliable for <img> tags than webContentLink which forces download
      if (file.mimeType && file.mimeType.startsWith('image/') && file.id) {
        return `https://drive.google.com/thumbnail?id=${file.id}&sz=w1000`
      }

      // Priority 3: Fallback to webContentLink (might break img tag but good for clicking)
      return file.webContentLink
    }

    return ''
  } catch (error) {
    console.error('Error searching Drive file:', error)
    return ''
  }
}

// ... existing code ...

export async function appendData_ToSheet(sheetName: string, values: any[][]) {
  try {
    const { sheets } = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured')
    }

    // 1. Fetch spreadsheet metadata to get sheetId and current dimensions
    // OPTIMIZATION: Do NOT use includeGridData: true. It fetches giant payloads.
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [sheetName],
      fields: 'sheets.properties' // Only fetch properties
    })

    const sheet = metaRes.data.sheets?.[0]
    if (!sheet || !sheet.properties) {
      throw new Error(`Sheet '${sheetName}' not found`)
    }

    const sheetId = sheet.properties.sheetId
    // If sheetId can be 0 (first sheet), checking if (!sheetId) is risky if it's undefined vs 0.
    // Properties.sheetId is number.
    if (sheetId === undefined || sheetId === null) {
      throw new Error(`Could not retrieve sheetId for '${sheetName}'`)
    }

    const currentMaxRows = sheet.properties.gridProperties?.rowCount || 0

    // Find the actual last row with data using the grid data included
    // Note: includeGridData returns data.rowData. 
    // This is more expensive but safer for finding the true visual last row if we want to be precise, 
    // but strictly we can use the same logic as before if we trust 'get values'

    // Be careful with includeGridData on large sheets, it might be heavy.
    // Let's stick to 'values.get' for data content to be safe on bandwidth, 
    // but use 'metaRes' for properties.

    // Re-fetch only values for finding last row (lighter)
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    })

    const rows = getRes.data.values || []
    let lastRowWithData = 0
    if (rows.length > 0) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i]
        if (row.some((cell: any) => cell && String(cell).trim() !== '')) {
          lastRowWithData = i + 1
          break
        }
      }
    }

    const startRow = lastRowWithData + 1
    const neededRows = startRow + values.length - 1 // 1-based index of the last new row

    console.log(`[appendData] Current Max: ${currentMaxRows}, Needed: ${neededRows}, Start: ${startRow}`)

    // 2. Resize if necessary
    if (neededRows > currentMaxRows) {
      const rowsToAdd = neededRows - currentMaxRows + 10 // Add a buffer of 10 rows
      console.log(`[appendData] expanding sheet by ${rowsToAdd} rows...`)

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              appendDimension: {
                sheetId: sheetId,
                dimension: 'ROWS',
                length: rowsToAdd
              }
            }
          ]
        }
      })
    }

    // 3. Write data
    const range = `${sheetName}!A${startRow}`
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values,
      },
    })

    return { success: true, updates: response.data }

  } catch (error: any) {
    console.error('[appendData_ToSheet] Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getCustomerStatus(danhba: string) {
  // ... existing code ...

  try {
    const { sheets } = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      console.error('[getCustomerStatus] GOOGLE_SHEET_ID not configured')
      return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' }
    }

    // Read ON_OFF sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ON_OFF!A:Z', // Read all columns
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' }
    }

    // Find header row
    const headers = rows[0]
    console.log('[getCustomerStatus] Headers:', headers)

    // Match column names from app cũ: danh_ba, tinh_trang, ngay_khoa, ngay_mo
    const danhBaIndex = headers.findIndex((h: string) => {
      const lower = h.toLowerCase().replace(/\s/g, '_')
      return lower === 'danh_ba' || lower.includes('danh') && (lower.includes('ba') || lower.includes('bạ'))
    })
    const tinhTrangIndex = headers.findIndex((h: string) => {
      const lower = h.toLowerCase().replace(/\s/g, '_')
      return lower === 'tinh_trang' || lower.includes('tình') && lower.includes('trạng')
    })
    const ngayKhoaIndex = headers.findIndex((h: string) => {
      const lower = h.toLowerCase().replace(/\s/g, '_')
      return lower === 'ngay_khoa' || lower.includes('ngày') && lower.includes('khóa')
    })
    const ngayMoIndex = headers.findIndex((h: string) => {
      const lower = h.toLowerCase().replace(/\s/g, '_')
      return lower === 'ngay_mo' || lower.includes('ngày') && lower.includes('mở')
    })

    console.log('[getCustomerStatus] Column indices:', { danhBaIndex, tinhTrangIndex, ngayKhoaIndex, ngayMoIndex })

    if (danhBaIndex === -1 || tinhTrangIndex === -1) {
      console.error('[getCustomerStatus] Required columns not found')
      return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' }
    }

    // Format danhba to 11 digits
    const formattedDanhba = String(danhba).padStart(11, '0')
    console.log('[getCustomerStatus] Looking for danhba:', formattedDanhba)

    // Find matching rows (get the latest one)
    const matchingRows = rows
      .slice(1) // Skip header
      .filter((row: any[]) => {
        const rowDanhba = String(row[danhBaIndex] || '').padStart(11, '0')
        return rowDanhba === formattedDanhba
      })

    console.log('[getCustomerStatus] Found matching rows:', matchingRows.length)

    if (matchingRows.length === 0) {
      console.log('[getCustomerStatus] No matching rows found, returning default')
      return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' }
    }

    // Get the latest row
    const latestRow = matchingRows[matchingRows.length - 1]
    console.log('[getCustomerStatus] Latest row:', latestRow)

    const result = {
      tinhTrang: latestRow[tinhTrangIndex] || 'Bình thường',
      ngayKhoa: ngayKhoaIndex !== -1 ? (latestRow[ngayKhoaIndex] || '') : '',
      ngayMo: ngayMoIndex !== -1 ? (latestRow[ngayMoIndex] || '') : ''
    }
    console.log('[getCustomerStatus] Returning:', result)

    return result

  } catch (error) {
    console.error('[getCustomerStatus] Error:', error)
    return { tinhTrang: 'Bình thường', ngayKhoa: '', ngayMo: '' }
  }
}

import { unstable_cache } from 'next/cache'

async function getOnOffDataInternal() {
  try {
    const { sheets } = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      console.error('[getOnOffData] GOOGLE_SHEET_ID not configured')
      return []
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ON_OFF!A:AZ',
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return []
    }

    const headers = rows[0]

    // Helper to find index
    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h: string) => {
        const lower = h.toLowerCase().replace(/\s/g, '_')
        return keywords.some(k => lower === k || lower.includes(k))
      })
    }

    const colIndices = {
      tinhTrang: findIndex(['tinh_trang', 'tình_trạng']),
      idTB: findIndex(['id_tb']),  // CRITICAL: Must match EXACTLY 'id_tb', NOT 'id' (which has K prefix)
      danhBa: findIndex(['danh_ba', 'danh_bạ']),
      tenKH: findIndex(['ten_kh', 'tên_kh', 'tên_khách_hàng']),
      soNha: findIndex(['so_nha', 'số_nhà']),
      duong: findIndex(['duong', 'đường']),
      tongKy: findIndex(['tong_ky', 'tổng_kỳ']),
      tongNo: findIndex(['tong_no', 'tổng_nợ']),
      ngayKhoa: findIndex(['ngay_khoa', 'ngày_khóa', 'ngày_khoá']),
      ngayMo: findIndex(['ngay_mo', 'ngày_mở']),
      kyNam: findIndex(['ky_nam', 'kỳ_năm']),
      nhomKhoa: findIndex(['nhom_khoa', 'nhóm_khóa']),
      kieuKhoa: findIndex(['kieu_khoa', 'kiểu_khóa']),
      codeMoi: findIndex(['code_moi', 'code_mới', 'codemoi']),
      dot: findIndex(['dot', 'đợt']),
      hinhKhoa: findIndex(['hinh_khoa', 'hình_khóa']),
      ghiChuMo: findIndex(['ghi_chu_mo', 'ghi_chú_mở']),
      hinhMo: findIndex(['hinh_mo', 'hình_mở']),
      hinhTb: findIndex(['hinh_tb', 'hình_tb']),
      ngayTb: findIndex(['ngay_tb', 'ngày_tb']),
      nvMo: findIndex(['nv_mo', 'nhân_viên_mở'])
    }

    // FALLBACK: If header search failed (likely because header row was truncated),
    // use hardcoded indices based on user confirmation (AA=26, AB=27)
    if (colIndices.hinhTb === -1) {
      console.warn('[getOnOffData] hinhTb header not found, falling back to index 26 (AA)')
      colIndices.hinhTb = 26
    }
    if (colIndices.ngayTb === -1) {
      console.warn('[getOnOffData] ngayTb header not found, falling back to index 27 (AB)')
      colIndices.ngayTb = 27
    }

    const data = rows.slice(1).map((row: any[]) => ({
      TinhTrang: colIndices.tinhTrang !== -1 ? row[colIndices.tinhTrang] : '',
      IdTB: colIndices.idTB !== -1 ? row[colIndices.idTB] : '',  // Primary ID field for ON_OFF
      DanhBa: colIndices.danhBa !== -1 ? String(row[colIndices.danhBa]).padStart(11, '0') : '',
      TenKH: colIndices.tenKH !== -1 ? row[colIndices.tenKH] : '',
      SoNha: colIndices.soNha !== -1 ? row[colIndices.soNha] : '',
      Duong: colIndices.duong !== -1 ? row[colIndices.duong] : '',
      TongKy: colIndices.tongKy !== -1 ? row[colIndices.tongKy] : '',
      TongNo: colIndices.tongNo !== -1 ? row[colIndices.tongNo] : '',
      NgayKhoa: colIndices.ngayKhoa !== -1 ? row[colIndices.ngayKhoa] : '',
      NgayMo: colIndices.ngayMo !== -1 ? row[colIndices.ngayMo] : '',
      KyNam: colIndices.kyNam !== -1 ? row[colIndices.kyNam] : '',
      NhomKhoa: colIndices.nhomKhoa !== -1 ? row[colIndices.nhomKhoa] : '',
      KieuKhoa: colIndices.kieuKhoa !== -1 ? row[colIndices.kieuKhoa] : '',
      CodeMoi: colIndices.codeMoi !== -1 ? row[colIndices.codeMoi] : '',
      Dot: colIndices.dot !== -1 ? row[colIndices.dot] : '',
      // New fields
      HinhKhoa: colIndices.hinhKhoa !== -1 ? row[colIndices.hinhKhoa] : '',
      GhiChuMo: colIndices.ghiChuMo !== -1 ? row[colIndices.ghiChuMo] : '',
      HinhMo: colIndices.hinhMo !== -1 ? row[colIndices.hinhMo] : '',
      HinhTb: colIndices.hinhTb !== -1 ? row[colIndices.hinhTb] : '',
      NgayTb: colIndices.ngayTb !== -1 ? row[colIndices.ngayTb] : '',
      NvMo: colIndices.nvMo !== -1 ? row[colIndices.nvMo] : '',
    }))

    return data

  } catch (error) {
    console.error('[getOnOffData] Error:', error)
    return []
  }
}

// Disable cache to avoid "items over 2MB" error
export const getOnOffData = getOnOffDataInternal

export async function getDatabaseSheetData() {
  try {
    const { sheets } = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID

    if (!spreadsheetId) {
      console.error('[getDatabaseSheetData] GOOGLE_SHEET_ID not configured')
      return []
    }

    // Read 'database' sheet (or whatever name is configured)
    // Note: In old config, DB_SHEET might be 'database' or 'Danh Sách Giao'
    // We'll trust the ENV variable or default to 'database'
    const sheetName = process.env.DB_SHEET_NAME || 'database'

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return []
    }

    const headers = rows[0]

    // Helper to find index
    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h: string) => {
        const lower = h.toLowerCase().replace(/\s/g, '_')
        return keywords.some(k => lower === k || lower.includes(k))
      })
    }

    const colIndices = {
      danhBa: findIndex(['danh_bo', 'danh_bạ', 'danh_ba']),  // Database uses danh_bo, ON_OFF uses danh_ba
      tenKH: findIndex(['ten_kh', 'tên_kh']),
      soNha: findIndex(['so_nha', 'số_nhà']),
      duong: findIndex(['duong', 'đường']),
      ngayGiao: findIndex(['ngay_giao', 'ngày_giao']),
      nhom: findIndex(['nhom', 'nhóm']),
      ghiChu: findIndex(['ghi_chu', 'ghi_chú']),
      tinhTrang: findIndex(['tinh_trang', 'tình_trạng']),
      dot: findIndex(['dot', 'đợt']),
      kyNam: findIndex(['ky_nam', 'kỳ_năm']),
      gb: findIndex(['gb']),
      tongTien: findIndex(['tong_tien', 'tổng_tiền']),
      tongKy: findIndex(['tong_ky', 'tổng_kỳ']),
      hopBaoVe: findIndex(['hop_bao_ve', 'hộp_bảo_vệ', 'hop']),
      id: findIndex(['id'])
    }


    const data = rows.slice(1).map((row: any[]) => ({
      DanhBa: colIndices.danhBa !== -1 ? String(row[colIndices.danhBa]).padStart(11, '0') : '',
      TenKH: colIndices.tenKH !== -1 ? row[colIndices.tenKH] : '',
      SoNha: colIndices.soNha !== -1 ? row[colIndices.soNha] : '',
      Duong: colIndices.duong !== -1 ? row[colIndices.duong] : '',
      NgayGiao: colIndices.ngayGiao !== -1 ? row[colIndices.ngayGiao] : '',
      Nhom: colIndices.nhom !== -1 ? row[colIndices.nhom] : '',
      GhiChu: colIndices.ghiChu !== -1 ? row[colIndices.ghiChu] : '',
      TinhTrang: colIndices.tinhTrang !== -1 ? row[colIndices.tinhTrang] : '',
      Dot: colIndices.dot !== -1 ? row[colIndices.dot] : '',
      KyNam: colIndices.kyNam !== -1 ? row[colIndices.kyNam] : '',
      GB: colIndices.gb !== -1 ? row[colIndices.gb] : '',
      TongTien: colIndices.tongTien !== -1 ? row[colIndices.tongTien] : '',
      TongKy: colIndices.tongKy !== -1 ? row[colIndices.tongKy] : '',
      HopBaoVe: colIndices.hopBaoVe !== -1 ? row[colIndices.hopBaoVe] : '',
      ID: colIndices.id !== -1 ? row[colIndices.id] : '',
    }))

    return data

  } catch (error) {
    console.error('[getDatabaseSheetData] Error:', error)
    return []
  }
}
