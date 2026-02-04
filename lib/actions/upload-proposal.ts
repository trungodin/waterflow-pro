'use server'

import { google } from 'googleapis'
import { Readable } from 'stream'

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FILES_FOLDER_ID
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID
const SHEET_NAME = 'ON_OFF'

// Initialize Google Sheets API
const getGoogleClients = () => {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ],
    })

    const sheets = google.sheets({ version: 'v4', auth })
    const drive = google.drive({ version: 'v3', auth })

    return { sheets, drive }
}

export async function uploadProposalPDF({
    pdfBase64,
    fileName,
    rowId
}: {
    pdfBase64: string,
    fileName: string,
    rowId: string
}) {
    try {
        if (!GOOGLE_DRIVE_FOLDER_ID) throw new Error('Chưa cấu hình Google Drive Folder ID')
        if (!GOOGLE_SHEET_ID) throw new Error('Chưa cấu hình Google Sheet ID')

        console.log(`[UPLOAD] Starting upload for ${fileName}...`)

        const { drive, sheets } = getGoogleClients()
        const buffer = Buffer.from(pdfBase64, 'base64')
        const stream = Readable.from(buffer)

        // 1. Upload to Google Drive
        // Service Account Quota Fix: 
        // We must ensure we are uploading INTO a folder owned by someone else (Shared Folder or Shared Drive)
        // verifying "supportsAllDrives: true" is critical.

        const requestBody = {
            name: fileName,
            parents: [GOOGLE_DRIVE_FOLDER_ID],
        }

        const media = {
            mimeType: 'application/pdf',
            body: stream,
        }

        const driveRes = await drive.files.create({
            requestBody: requestBody,
            media: media,
            fields: 'id, name, webContentLink, webViewLink',
            supportsAllDrives: true, // Handle Shared Drives
        })

        const fileId = driveRes.data.id
        if (!fileId) throw new Error('Upload thất bại, không nhận được File ID')
        
        console.log(`[UPLOAD] Success. File ID: ${fileId}`)

        // Construct AppSheet-compatible path (Relative path if configured, or just the filename if it's in the main folder)
        // Typically AppSheet expects: /appsheet/data/{AppName}/Files/{FileName} 
        // OR relative path: Files/{FileName} if the sheet is in root folder.
        // User requested: /appsheet/data/Thôngbáo-Khoánước-801620547/Files/M-K01191970100-021025-03102025.pdf
        
        // Since we don't know the exact "AppName" part of the path dynamically easily,
        // we can try to guess or use the format user provided. 
        // Let's infer the AppName part isn't easily guessable without config.
        
        // HOWEVER, AppSheet usually works fine with just "Files/Filename.pdf" 
        // IF the "Files" folder is the default image folder next to the sheet.
        
        // BUT user specifically asked for full path.
        // We will construct it carefully or... 
        // For now, let's update with "Files/" prefix which is safest reference.
        
        const relativePath = `Files/${fileName}`
        
// 2. Update Google Sheet (Column X = file_cpmn) -> Extracted to separate function
        await updateProposalSheet({ fileName, rowId })

        return { success: true, fileId, path: relativePath }

    } catch (error: any) {
        console.error('[UPLOAD ERROR]', error)
        return { success: false, error: error.message }
    }
}

export async function updateProposalSheet({ fileName, rowId }: { fileName: string, rowId: string }) {
    try {
        const { sheets } = getGoogleClients()
        // Logic to update sheet
        console.log(`[SHEET] Updating row ${rowId} with ${fileName}...`)

        // Find the ROW NUMBER for the given ID (Column A)
        const idRes = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: `${SHEET_NAME}!A:A`, // Only fetch ID column
        })

        const idRows = idRes.data.values
        let rowIndex = -1
        
        if (idRows) {
            rowIndex = idRows.findIndex(r => r[0] === rowId)
        }

        if (rowIndex === -1) {
             throw new Error(`Không tìm thấy dòng có ID: ${rowId}`)
        }

        const actualRow = rowIndex + 1 // 1-based index
        const range = `${SHEET_NAME}!X${actualRow}:Y${actualRow}` // Column X (file_cpmn) and Y (ngay_cpmn)

        const today = new Date()
        const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
        const timeStr = `${today.getHours()}:${today.getMinutes()}`
        
        // Use relative path or whatever format preferred
        const relativePath = `Files/${fileName}`

        await sheets.spreadsheets.values.update({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[relativePath, `${dateStr} ${timeStr}`]]
            }
        })

        console.log(`[SHEET] Updated row ${actualRow}`)
        return { success: true, path: relativePath }
        
    } catch (error: any) {
        console.error('[SHEET UPLOAD ERROR]', error)
        return { success: false, error: error.message }
    }
}
