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
    host: process.env.FTP_HOST || '',
    user: process.env.FTP_USER || '',
    password: process.env.FTP_PASSWORD || '',
    secure: false
};

if (!process.env.FTP_HOST || !process.env.FTP_USER || !process.env.FTP_PASSWORD) {
    console.warn('Missing FTP environment variables');
}

// Timeout wrapper for FTP operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 15000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('FTP operation timeout')), timeoutMs)
        )
    ]);
}

// Global variable to cache the FTP client instance across warm invocations (Vercel)
let cachedClient: ftp.Client | null = null;
let lastActivityTime = 0;
const SESSION_TIMEOUT = 30000; // 30 seconds keep-alive

async function getFtpClient(): Promise<ftp.Client> {
    const now = Date.now();
    
    // If we have a cached client
    if (cachedClient) {
        // If it's been idle too long, it might be dead or timeout by server
        if (now - lastActivityTime > SESSION_TIMEOUT) {
            console.log('FTP Session timeout, closing and reconnecting...');
            try {
                cachedClient.close();
            } catch (e) { /* ignore */ }
            cachedClient = null;
        } else if (!cachedClient.closed) {
             // It seems valid, let's verify quickly or just return it
             // Doing a full verify might defeat the purpose, but `basic-ftp` handles closed socket detection fairly well on command
             return cachedClient;
        }
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    // Optimizations for Vercel <-> Residential/Poor Network
    // 1. Passive Mode is default and usually required.
    // 2. Timeout adjustment
    
    try {
        await withTimeout(client.access(FTP_CONFIG), 8000); // Authentication
        cachedClient = client;
        lastActivityTime = Date.now();
        return client;
    } catch (error) {
        // Retry logic often helps with flaky FTP on high latency
        console.warn('First FTP connection attempt failed, retrying...', error);
        await new Promise(r => setTimeout(r, 1000));
        await withTimeout(client.access(FTP_CONFIG), 10000);
        cachedClient = client;
        lastActivityTime = Date.now();
        return client;
    }
}

export async function listFiles(remotePath: string = '/G'): Promise<FileInfo[]> {
    let client: ftp.Client | undefined;

    try {
        client = await getFtpClient();
        lastActivityTime = Date.now(); // Update activity time
        
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
        // If error occurs, invalidate the cache to force fresh connection next time
        if (cachedClient) {
            try { cachedClient.close(); } catch(e) {}
            cachedClient = null;
        }
        throw new Error('Không thể kết nối tới FTP server');
    } 
    // Do NOT close the client in finally, let it stay open for warm reuse
    // We only close on explicit timeout or error
}

export async function downloadFile(remotePath: string): Promise<Buffer> {
    const { Writable } = require('stream');
    let client: ftp.Client | undefined;

    try {
        client = await getFtpClient();
        lastActivityTime = Date.now();

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
        if (cachedClient) {
            try { cachedClient.close(); } catch(e) {}
            cachedClient = null;
        }
        throw new Error('Không thể tải file');
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
