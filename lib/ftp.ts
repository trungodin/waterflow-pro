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

export async function listFiles(remotePath: string = '/G'): Promise<FileInfo[]> {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access(FTP_CONFIG);
        const list = await client.list(remotePath);

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
        await client.access(FTP_CONFIG);
        const chunks: Buffer[] = [];

        await client.downloadTo(
            (chunk) => chunks.push(chunk),
            remotePath
        );

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
        await client.access(FTP_CONFIG);
        const { Readable } = require('stream');
        const stream = Readable.from(localBuffer);
        await client.uploadFrom(stream, remotePath);
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
