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
      return { tinhTrang: 'Bình thường', ngayKhoa: '' }
    }

    // Read ON_OFF sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ON_OFF!A:Z', // Read all columns
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      return { tinhTrang: 'Bình thường', ngayKhoa: '' }
    }

    // Find header row
    const headers = rows[0]
    const danhBaIndex = headers.findIndex((h: string) => h.toLowerCase().includes('danh') && h.toLowerCase().includes('bạ'))
    const tinhTrangIndex = headers.findIndex((h: string) => h.toLowerCase().includes('tình') && h.toLowerCase().includes('trạng'))
    const ngayKhoaIndex = headers.findIndex((h: string) => h.toLowerCase().includes('ngày') && h.toLowerCase().includes('khóa'))

    if (danhBaIndex === -1 || tinhTrangIndex === -1) {
      console.error('[getCustomerStatus] Required columns not found')
      return { tinhTrang: 'Bình thường', ngayKhoa: '' }
    }

    // Format danhba to 11 digits
    const formattedDanhba = String(danhba).padStart(11, '0')

    // Find matching rows (get the latest one)
    const matchingRows = rows
      .slice(1) // Skip header
      .filter((row: any[]) => {
        const rowDanhba = String(row[danhBaIndex] || '').padStart(11, '0')
        return rowDanhba === formattedDanhba
      })

    if (matchingRows.length === 0) {
      return { tinhTrang: 'Bình thường', ngayKhoa: '' }
    }

    // Get the latest row
    const latestRow = matchingRows[matchingRows.length - 1]
    
    return {
      tinhTrang: latestRow[tinhTrangIndex] || 'Bình thường',
      ngayKhoa: ngayKhoaIndex !== -1 ? (latestRow[ngayKhoaIndex] || '') : ''
    }

  } catch (error) {
    console.error('[getCustomerStatus] Error:', error)
    return { tinhTrang: 'Bình thường', ngayKhoa: '' }
  }
}
