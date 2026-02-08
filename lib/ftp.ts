import * as ftp from 'basic-ftp';

export interface FTPConfig {
    host: string;
    user: string;
    password: string;
    secure?: boolean;
}

export interface FileInfo {
    name: string;
    type: 'file' | 'directory';
    size: number;
    modifiedAt: Date;
    path: string;
}

const FTP_CONFIG: FTPConfig = {
    host: 'trungodin.tplinkdns.com',
    user: 'admin',
    password: 'Nht100982',
    secure: false
};

// Timeout wrapper for FTP operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('FTP operation timeout')), timeoutMs)
        )
    ]);
}

export async function listFiles(remotePath: string = '/G'): Promise<FileInfo[]> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await withTimeout(client.access(FTP_CONFIG), 10000);
        const list = await withTimeout(client.list(remotePath), 10000);

        return list.map(item => ({
            name: item.name,
            type: item.isDirectory ? 'directory' : 'file',
            size: item.size,
            modifiedAt: item.modifiedAt || new Date(),
            path: `${remotePath}/${item.name}`.replace('//', '/')
        }));
    } catch (error) {
        console.error('FTP list error:', error);
        throw new Error('Không thể kết nối tới FTP server');
    } finally {
        client.close();
    }
}

export async function downloadFile(remotePath: string): Promise<Buffer> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await withTimeout(client.access(FTP_CONFIG), 10000);
        const { Writable } = require('stream');
        const chunks: Buffer[] = [];

        const writableStream = new Writable({
            write(chunk: Buffer, encoding: string, callback: () => void) {
                chunks.push(chunk);
                callback();
            }
        });

        await withTimeout(client.downloadTo(writableStream, remotePath), 30000);

        return Buffer.concat(chunks);
    } catch (error) {
        console.error('FTP download error:', error);
        throw new Error('Không thể tải file');
    } finally {
        client.close();
    }
}

export async function uploadFile(
    localBuffer: Buffer,
    remotePath: string
): Promise<void> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await withTimeout(client.access(FTP_CONFIG), 10000);
        const { Readable } = require('stream');
        const stream = Readable.from(localBuffer);
        await withTimeout(client.uploadFrom(stream, remotePath), 30000);
    } catch (error) {
        console.error('FTP upload error:', error);
        throw new Error('Không thể upload file');
    } finally {
        client.close();
    }
}

export async function deleteFile(remotePath: string): Promise<void> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access(FTP_CONFIG);
        await client.remove(remotePath);
    } catch (error) {
        console.error('FTP delete error:', error);
        throw new Error('Không thể xóa file');
    } finally {
        client.close();
    }
}

export async function createDirectory(remotePath: string): Promise<void> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access(FTP_CONFIG);
        await client.ensureDir(remotePath);
    } catch (error) {
        console.error('FTP mkdir error:', error);
        throw new Error('Không thể tạo thư mục');
    } finally {
        client.close();
    }
}
