import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// ─── Google Drive Folder IDs (mirror of Flutter NasImageService) ───────────
const FOLDER_IDS: Record<string, string> = {
  database_Images: '1vmvwQHucIV12RrR_qx8QOHsW_nqEjIaQ',
  ON_OFF_Images: '1na6NtA5Ux04pTx1Bi5Di7MQ4XAWabt0V',
}

// ─── Tier-1 Cache: filename → Drive fileId ──────────────────────────────────
// Persistent trong lifetime của server process. fileId không đổi nên không cần TTL.
const fileIdCache = new Map<string, string>()

// ─── Tier-2 Cache: bufferKey → base64 image ─────────────────────────────────
// Lưu dạng base64 string để tránh ArrayBuffer/Buffer type conflicts với NextResponse
const imageBase64Cache = new Map<string, { b64: string; contentType: string; timestamp: number }>()
const BUFFER_TTL = 2 * 60 * 60 * 1000 // 2 giờ

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

function getFolderIdFromPath(imagePath: string): string {
  if (imagePath.startsWith('ON_OFF_Images/')) return FOLDER_IDS.ON_OFF_Images
  return FOLDER_IDS.database_Images
}

function extractFileName(imagePath: string): string {
  const cleaned = imagePath
    .replace('database::database_Images/', 'database_Images/')
    .replace('database::ON_OFF_Images/', 'ON_OFF_Images/')
    .replace(/^database::/, '')
  return cleaned.includes('/') ? cleaned.split('/').pop()! : cleaned
}

function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', pdf: 'application/pdf',
  }
  return map[ext] || 'application/octet-stream'
}

/**
 * Tìm fileId trên Drive theo filename.
 * Tier-1 cache hit → skip search hoàn toàn.
 * Miss → search với 4 mức fuzzy (giống Flutter NasImageService.getImage).
 */
async function resolveFileId(
  driveClient: ReturnType<typeof google.drive>,
  fileName: string,
  folderId: string
): Promise<string | null> {
  const cacheKey = `${folderId}:${fileName}`
  if (fileIdCache.has(cacheKey)) return fileIdCache.get(cacheKey)!

  let fileId: string | null = null

  const search = async (q: string): Promise<string | null> => {
    try {
      const res = await driveClient.files.list({
        q: `${q} and '${folderId}' in parents and trashed = false`,
        fields: 'files(id)',
        pageSize: 1,
      })
      return res.data.files?.[0]?.id ?? null
    } catch { return null }
  }

  const base = fileName.replace(/\.(jpg|jpeg|png|gif|pdf|webp)$/i, '')

  fileId = await search(`name = '${fileName}'`)
  if (!fileId) fileId = await search(`name = '${base}.jpg'`)
  if (!fileId) {
    const u = base.replace(/-/g, '_')
    fileId = await search(`(name contains '${u}' or name contains '${base}')`)
  }
  if (!fileId) {
    const parts = base.split(/[-_]/)
    if (parts[0]?.length >= 8) {
      try {
        const res = await driveClient.files.list({
          q: `name contains '${parts[0]}' and '${folderId}' in parents and trashed = false`,
          fields: 'files(id, createdTime)',
          orderBy: 'createdTime desc',
          pageSize: 1,
        })
        fileId = res.data.files?.[0]?.id ?? null
      } catch { /* ignore */ }
    }
  }

  if (fileId) {
    fileIdCache.set(cacheKey, fileId)
    console.log(`[Drive] Cached fileId for: ${fileName}`)
  }
  return fileId
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const imagePath = searchParams.get('path')

  if (!imagePath) return new NextResponse('Missing path', { status: 400 })
  if (imagePath.includes('..')) return new NextResponse('Invalid path', { status: 400 })

  const fileName = extractFileName(imagePath)
  const folderId = getFolderIdFromPath(imagePath)
  const contentType = getContentType(fileName)
  const key = `${folderId}:${fileName}`

  // ── Tier-2 cache hit → trả ngay, 0 API calls
  const cached = imageBase64Cache.get(key)
  if (cached && Date.now() - cached.timestamp < BUFFER_TTL) {
    const binaryStr = Buffer.from(cached.b64, 'base64')
    return new NextResponse(binaryStr, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
        'X-Cache': 'HIT',
      },
    })
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    return new NextResponse('Drive not configured', { status: 503 })
  }

  try {
    const driveClient = await getDriveClient()
    const fileId = await resolveFileId(driveClient, fileName, folderId)

    if (!fileId) {
      console.error(`[Drive] Not found: ${fileName}`)
      return new NextResponse('File not found', { status: 404 })
    }

    // Download qua stream
    const res = await driveClient.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
    const stream = res.data as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    const raw = Buffer.concat(chunks)

    // Lưu cache dạng base64
    imageBase64Cache.set(key, { b64: raw.toString('base64'), contentType, timestamp: Date.now() })

    // Dọn cache nếu quá 500 entries
    if (imageBase64Cache.size > 500) {
      const now = Date.now()
      for (const [k, v] of imageBase64Cache) {
        if (now - v.timestamp > BUFFER_TTL) imageBase64Cache.delete(k)
      }
    }

    console.log(`[Drive] ✅ Served (MISS): ${fileName} (${raw.length} bytes)`)

    return new NextResponse(raw, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Drive] Error:', msg)
    return new NextResponse('Drive error', { status: 500 })
  }
}
