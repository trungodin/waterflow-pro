'use server'

import { createClient } from '@supabase/supabase-js'
import { uploadFile, createDirectory } from '@/lib/ftp'

// Initialize Supabase Client (Admin/Service Role needed for DB update if RLS restricts)
// Actually, if we use the anon key on server with RLS 'authenticated', we need the user's session.
// But this is a server action, likely called by logged in user.
// However, creating a client with Service Role is safer for backend operations ensuring permissions.
// If SUPABASE_SERVICE_ROLE_KEY is available, use it.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getSupabaseAdmin = () => {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials missing')
    }
    return createClient(supabaseUrl, supabaseKey)
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

        // --- A. Upload to NAS ---
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        
        // Structure: /waterflow-pro/proposals/2024/02/
        const baseDir = `/waterflow-pro/proposals/${year}/${month}`
        const fullPath = `${baseDir}/${fileName}`

        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        // Ensure directory exists (a bit expensive to check every time but safe)
        // Optimization: Maybe catching error on upload and then creating dir is better?
        // Or just 'ensureDir' logic. 
        // Let's try to upload. If it fails due to directory, create it.
        // But `basic-ftp` ensureDir is recursive usually.
        // Let's just call createDirectory on the parent.
        
        try {
            await createDirectory(baseDir)
        } catch (e) {
            console.log('Directory creation might have failed or passed:', e)
        }

        await uploadFile(fileBuffer, fullPath)
        console.log(`[Upload] NAS Upload Success: ${fullPath}`)

        // --- B. Update Supabase Database ---
        const supabase = getSupabaseAdmin()

        const { error: dbError } = await supabase
            .from('water_lock_status')
            .update({ 
                file_de_nghi: fullPath,
                updated_at: new Date().toISOString()
            })
            .eq('id_tb', idTB)

        if (dbError) {
            console.error('[Upload] Supabase DB Error:', dbError)
            throw new Error(`Database Update Failed: ${dbError.message}`)
        }

        return { success: true, url: fullPath } // Frontend will use this path via proxy

    } catch (error: any) {
        console.error('[Action Error]', error)
        return { success: false, error: error.message }
    }
}
