import { NextRequest, NextResponse } from 'next/server';
import { deleteFile, deleteDirectory } from '@/lib/ftp';

export async function POST(request: NextRequest) {
    try {
        const { path, type } = await request.json();

        if (!path) {
             return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 });
        }

        console.log(`[API Delete] Deleting ${type} at ${path}`);

        if (type === 'directory') {
             await deleteDirectory(path);
        } else {
             await deleteFile(path);
        }

        return NextResponse.json({ success: true, message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('API delete error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi xóa file' },
            { status: 500 }
        );
    }
}
