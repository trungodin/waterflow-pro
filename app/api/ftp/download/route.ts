import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/ftp';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const path = searchParams.get('path');

        if (!path) {
            return NextResponse.json(
                { success: false, error: 'Missing path parameter' },
                { status: 400 }
            );
        }

        const fileBuffer = await downloadFile(path);
        const fileName = path.split('/').pop() || 'download';

        // Convert Buffer to Uint8Array for NextResponse compatibility
        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'Content-Type': 'application/octet-stream',
            },
        });
    } catch (error: any) {
        console.error('API download error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi tải file' },
            { status: 500 }
        );
    }
}
