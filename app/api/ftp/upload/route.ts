import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, appendFile } from '@/lib/ftp';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;
        const isAppend = formData.get('isAppend') === 'true';

        if (!file || !path) {
            return NextResponse.json(
                { success: false, error: 'Missing file or path' },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const remotePath = `${path}/${file.name}`.replace('//', '/');

        if (isAppend) {
            await appendFile(buffer, remotePath);
        } else {
            await uploadFile(buffer, remotePath);
        }

        return NextResponse.json({
            success: true,
            message: isAppend ? 'Append successful' : 'Upload successful',
            path: remotePath
        });
    } catch (error: any) {
        console.error('API upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Lỗi upload file' },
            { status: 500 }
        );
    }
}
