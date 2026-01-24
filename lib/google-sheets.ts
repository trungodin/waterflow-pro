import { google } from 'googleapis'
import { googleSheetsConfig } from './env'

// Data Interfaces
export interface AssignedCustomer {
  ID: string
  DANH_BO: string
  TEN_KH: string
  DIA_CHI: string
  SDT: string
  NGAY_GIAO: string
  NHOM: string
  KY_NAM: string // Format: "01/2024, 02/2024"
  GHI_CHU: string
  TONG_TIEN: string
  TONG_KY: string
  DUONG: string
  SO_NHA: string
  HOP_BV: string
  DOT: string
  GB: string
}

export interface WaterLockStatus {
  ID: string
  DANH_BO: string
  NGAY_KHOA: string
  KIEU_KHOA: string // "Khóa từ", "Khóa van", "Khóa NB"
  NGAY_MO: string
  TINH_TRANG: string // "Đang khóa", "Đã mở", ...
  NHOM_KHOA: string
}

// Sheet Names
const SHEET_NAMES = {
  ASSIGNED: 'DATABASE_GIAO', // Tên sheet trong file Google Sheet (cần user confirm nếu khác)
  ON_OFF: 'ON_OFF',
}

/**
 * Initialize Google Sheets Client
 */
async function getSheetsClient() {
  if (!googleSheetsConfig.isConfigured) {
    throw new Error('Google Sheets API chưa được cấu hình.')
  }

  // Handle private key newlines
  const privateKey = googleSheetsConfig.privateKey.replace(/\\n/g, '\n')

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: googleSheetsConfig.serviceAccountEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const client = await auth.getClient()

  return google.sheets({ version: 'v4', auth: client as any })
}

/**
 * Fetch Assigned Customers from Google Sheet
 */
export async function getAssignedCustomers(): Promise<AssignedCustomer[]> {
  try {
    const sheets = await getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetsConfig.sheetId,
      range: `${SHEET_NAMES.ASSIGNED}!A:Z`, // Fetch all columns
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return []
    }

    const headers = rows[0]
    const data = rows.slice(1)

    // Map rows to objects
    return data.map((row) => {
      const item: any = {}
      headers.forEach((header, index) => {
        // Simple mapping based on header names (case-insensitive keys for safety)
        // Adjust these keys based on actual sheet headers
        const key = normalizeHeader(header)
        item[key] = row[index] || ''
      })

      // Auto-map common fields
      return {
        ID: item['id'] || '',
        DANH_BO: item['danh_bo'] || item['danhbo'] || '',
        TEN_KH: item['ten_kh'] || item['ten_khach_hang'] || '',
        DIA_CHI: item['dia_chi'] || '',
        SDT: item['sdt'] || item['so_dien_thoai'] || '',
        NGAY_GIAO: item['ngay_giao'] || '',
        NHOM: item['nhom'] || '',
        KY_NAM: item['ky_nam'] || '',
        GHI_CHU: item['ghi_chu'] || '',
        TONG_TIEN: item['tong_tien'] || '',
        TONG_KY: item['tong_ky'] || '',
        DUONG: item['duong'] || '',
        SO_NHA: item['so_nha'] || '',
        HOP_BV: item['hop_bv'] || '',
        DOT: item['dot'] || '',
        GB: item['gb'] || '',
      } as AssignedCustomer
    })

  } catch (error) {
    console.error('Error fetching assigned customers:', error)
    return []
  }
}

/**
 * Fetch Water Lock Status from Google Sheet
 */
export async function getWaterLockStatus(): Promise<WaterLockStatus[]> {
  try {
    const sheets = await getSheetsClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: googleSheetsConfig.sheetId,
      range: `${SHEET_NAMES.ON_OFF}!A:Z`,
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return []
    }

    const headers = rows[0]
    const data = rows.slice(1)

    return data.map((row) => {
      const item: any = {}
      headers.forEach((header, index) => {
        const key = normalizeHeader(header)
        item[key] = row[index] || ''
      })

      return {
        ID: item['id'] || '',
        DANH_BO: item['danh_bo'] || item['danhbo'] || '',
        NGAY_KHOA: item['ngay_khoa'] || '',
        KIEU_KHOA: item['kieu_khoa'] || '',
        NGAY_MO: item['ngay_mo'] || '',
        TINH_TRANG: item['tinh_trang'] || '',
        NHOM_KHOA: item['nhom_khoa'] || item['nhom'] || '',
      } as WaterLockStatus
    })

  } catch (error) {
    console.error('Error fetching water lock status:', error)
    return []
  }
}

// Helper: Normalize header to key (e.g., "Tên Khách Hàng" -> "ten_khach_hang")
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/đ/g, 'd')
    .replace(/â|ă/g, 'a')
    .replace(/ê/g, 'e')
    .replace(/ô|ơ/g, 'o')
    .replace(/ư/g, 'u')
    .replace(/[^a-z0-9_]/g, '')
}
