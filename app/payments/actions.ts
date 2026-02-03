'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// 1. Initialize Supabase Admin Client (for direct storage upload)
// 1. Supabase Config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Lazy init helper
const getSupabaseAdmin = () => {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials missing (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY required)')
    }
    return createClient(supabaseUrl, supabaseKey)
}

// 2. Initialize Google Sheets
const getGoogleSheetsClient = () => {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    return google.sheets({ version: 'v4', auth })
}

export async function uploadProposalAndSave(formData: FormData) {
    try {
        const file = formData.get('file') as File
        const fileName = formData.get('fileName') as string
        const idTB = formData.get('idTB') as string

        if (!file || !fileName || !idTB) {
            throw new Error('Missing file, fileName, or idTB')
        }

        console.log(`[Upload] Processing proposal: ${fileName} for ID: ${idTB}`)

        // --- A. Upload to Supabase (Organized by Year/Month) ---
        const bucketName = 'proposals'
        const now = new Date()
        const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
        const storagePath = `${folder}/${fileName}`

        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        const supabaseAdmin = getSupabaseAdmin()

        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(storagePath, fileBuffer, {
                contentType: 'application/pdf',
                upsert: true
            })

        if (uploadError) {
            console.error('[Upload] Supabase Error:', uploadError)
            throw new Error(`Supabase Upload Failed: ${uploadError.message}`)
        }

        // Get Public URL
        const { data: { publicUrl } } = supabaseAdmin
            .storage
            .from(bucketName)
            .getPublicUrl(storagePath)

        console.log(`[Upload] Success! URL: ${publicUrl}`)


        // --- B. Update Google Sheet (Column X = index 23) ---
        // 1. Find Row Index by idTB
        const sheets = getGoogleSheetsClient()
        const spreadsheetId = process.env.GOOGLE_SHEET_ID
        const sheetName = 'ON_OFF'

        // Fetch IDs (Assume ID column is at Index 1 (B) or mapped. 
        // From getOnOffData: idTB: findIndex(['id_tb'])
        // We need to find the column index for 'id_tb' again or assume dynamic.
        // Let's optimize: fetch Header row + ID Column.
        // Actually, fetch all IDs to be safe.

        // Fetch Headers First
        const headerRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`,
        })
        const headers = headerRes.data.values?.[0] || []

        // Find ID Column Index
        const idColIndex = headers.findIndex((h: string) =>
            h.toLowerCase() === 'id_tb' || h.toLowerCase() === 'idtb'
        )

        // Find Target Column Index (file_cpmn / X)
        // User said "cột file_cpmn(X)". If 'file_cpmn' exists, use it. Else fall back to 'X' (Index 23).
        let targetColIndex = headers.findIndex((h: string) =>
            h.toLowerCase().includes('file_cpmn') || h.toLowerCase().includes('filecpmn')
        )

        if (targetColIndex === -1) {
            console.warn('[UpdateSheet] Column file_cpmn not found in headers, defaulting to Column X (Index 23)')
            targetColIndex = 23 // Column X
        } else {
            console.log(`[UpdateSheet] Found file_cpmn at index ${targetColIndex}`)
        }

        if (idColIndex === -1) {
            throw new Error('Column id_tb not found in Sheet')
        }

        // Fetch ID Column Data (offset by header)
        // Convert column index to Letter (Simple helper for A-Z, AA-AZ)
        // But easier to just fetch the whole column range e.g. B:B
        const getColLetter = (n: number) => {
            let s = ""
            while (n >= 0) {
                s = String.fromCharCode(n % 26 + 65) + s;
                n = Math.floor(n / 26) - 1;
            }
            return s;
        }
        const idColLetter = getColLetter(idColIndex)

        const idRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!${idColLetter}:${idColLetter}`,
        })

        const idRows = idRes.data.values?.flat() || []

        // Find Row
        const rowIndex0Based = idRows.findIndex(val => String(val).trim() === String(idTB).trim())

        if (rowIndex0Based === -1) {
            throw new Error(`ID ${idTB} not found in sheet`)
        }

        const rowIndex1Based = rowIndex0Based + 1

        console.log(`[UpdateSheet] updating row ${rowIndex1Based} for ID ${idTB}`)

        // Update Cell
        const targetColLetter = getColLetter(targetColIndex)
        const updateRange = `${sheetName}!${targetColLetter}${rowIndex1Based}`

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[publicUrl]]
            }
        })

        return { success: true, url: publicUrl }

    } catch (error: any) {
        console.error('[Action Error]', error)
        return { success: false, error: error.message }
    }
}
