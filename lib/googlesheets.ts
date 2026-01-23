'use server'

import { google } from 'googleapis'

// Initialize Google Sheets API
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  return google.sheets({ version: 'v4', auth })
}

export async function getCustomerStatus(danhba: string) {
  try {
    const sheets = getGoogleSheetsClient()
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
    const sheets = getGoogleSheetsClient()
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    
    if (!spreadsheetId) {
      console.error('[getOnOffData] GOOGLE_SHEET_ID not configured')
      return []
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ON_OFF!A:Z',
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
      dot: findIndex(['dot', 'đợt'])
    }

    const data = rows.slice(1).map((row: any[]) => ({
      TinhTrang: colIndices.tinhTrang !== -1 ? row[colIndices.tinhTrang] : '',
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
    }))
    
    return data

  } catch (error) {
    console.error('[getOnOffData] Error:', error)
    return []
  }
}

// Disable cache to avoid "items over 2MB" error
export const getOnOffData = getOnOffDataInternal
