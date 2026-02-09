
import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getFtpClient } from '@/lib/ftp';
import path from 'path';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    
    console.log('[NAS API] Serving file:', filePath);

    if (!filePath) {
        console.error('[NAS API] Missing path param');
        return new NextResponse('Missing path', { status: 400 });
    }

    // Security Check: prevent directory traversal if needed, but path usually comes from trusted DB.
    // Transversal check:
    if (filePath.includes('..')) {
         console.error('[NAS API] traversal detected:', filePath);
         return new NextResponse('Invalid path', { status: 400 });
    }
    // For now, trust the path as it's internal logic.

    const filename = path.basename(filePath);
    // Define fallback candidates
    // We prioritize the requested path, then check common folders
    // Normalize path separators just in case
    const normalize = (p: string) => p.replace(/\\/g, '/');
    
    // Candidates construction
    const candidates: string[] = [];
    
    // 1. Exact requested path (likely correct now with /G/ prefix)
    candidates.push(normalize(filePath));
    
    // 2. TP-Link NAS Specific (Assuming /G root) - Prioritize this!
    const folders = ['ON_OFF_Images', 'database_Images'];
    
    folders.forEach(folder => {
        candidates.push(`/G/waterflow-pro/${folder}/${filename}`);
        candidates.push(`/G/${folder}/${filename}`);
    });
    
    // 3. Fallback to standard paths
    folders.forEach(folder => {
        candidates.push(`/waterflow-pro/${folder}/${filename}`);
        candidates.push(`/${folder}/${filename}`);
        candidates.push(`${folder}/${filename}`);
    });

    // If filePath itself is missing /G prefix but might need it
    if (filePath.startsWith('/waterflow-pro/')) {
        candidates.push('/G' + filePath);
    }

    // Remove duplicates
    const uniqueCandidates = Array.from(new Set(candidates));

    // Try to find the file in candidates
    for (const p of uniqueCandidates) {
        try {
            // console.log(`[NAS API] Trying path: ${p}`);
            const fileBuffer = await downloadFile(p);
            console.log(`[NAS API] Found at: ${p}`);

            // Determine Mime Type
            const ext = path.extname(p).toLowerCase();
            let contentType = 'application/octet-stream';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.pdf') contentType = 'application/pdf';

            return new NextResponse(fileBuffer as any, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable', // Cache aggressively
                },
            });
        } catch (error) {
            // Continue to next candidate
            // console.warn(`[NAS API] Failed path: ${p}`);
        }
    }

    // If we reach here, no file was found
    console.error(`[NAS API] File not found in any candidate path for: ${filename}`);
    return new NextResponse('File not found or NAS error', { status: 404 });
}
