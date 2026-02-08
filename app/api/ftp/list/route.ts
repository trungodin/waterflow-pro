import { NextRequest, NextResponse } from 'next/server';
import { listFiles } from '@/lib/ftp';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const path = searchParams.get('path') || '/G';

        const files = await listFiles(path);

        return NextResponse.json({
            success: true,
            files,
            currentPath: path
        });
    } catch (error: any) {
        console.error('API list files error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi kết nối FTP' },
            { status: 500 }
        );
    }
}
