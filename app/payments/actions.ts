'use server'

import { createClient } from '@supabase/supabase-js'

// ─── Supabase Client (Server) ────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase credentials missing')
  return createClient(supabaseUrl, supabaseKey)
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function uploadProposalAndSave(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const idTB = formData.get('idTB') as string

    if (!file || !fileName || !idTB) {
      throw new Error('Missing file, fileName, or idTB')
    }

    console.log(`[Proposal] Processing: ${fileName} for ID: ${idTB}`)

    const supabase = getSupabaseAdmin()

    // ── A. Upload PDF lên Supabase Storage ───────────────────────────────────
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    
    // Đảm bảo tên file chỉ chứa ký tự an toàn
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '')
    // Thêm timestamp để tránh trùng lặp
    const uniqueFileName = `${Date.now()}_${safeFileName}`

    console.log(`[Proposal] Uploading to Supabase bucket: proposals/${uniqueFileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('proposals')
      .upload(uniqueFileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false // Không ghi đè
      })

    if (uploadError) {
      throw new Error(`Upload to Supabase Storage failed: ${uploadError.message}`)
    }

    // Lấy Public URL của file vừa upload
    const { data: urlData } = supabase.storage
      .from('proposals')
      .getPublicUrl(uniqueFileName)

    const publicUrl = urlData.publicUrl
    console.log(`[Proposal] Supabase Public URL: ${publicUrl}`)

    // ── B. Cập nhật URL vào DB ───────────────────────────────────────────────
    const now = new Date()
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const formattedTime = `${formattedDate} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    const { error: dbError } = await supabase
      .from('water_lock_status')
      .update({
        file_cpmn: publicUrl,       // Lưu Public URL của Supabase
        ngay_cpmn: formattedDate,
        tg_cpmn: formattedTime,
        updated_at: now.toISOString(),
      })
      .eq('id_tb', idTB)

    if (dbError) {
      console.error('[Proposal] Supabase db error:', dbError)
      throw new Error(`Database update failed: ${dbError.message}`)
    }

    console.log(`[Proposal] ✅ Done: ${fileName}`)

    return {
      success: true,
      url: publicUrl,
      ngay_cpmn: formattedDate,
      tg_cpmn: formattedTime,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[Proposal Action Error]', msg)
    return { success: false, error: msg }
  }
}
