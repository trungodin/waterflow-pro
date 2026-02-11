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


// Queue for serializing FTP operations to prevent concurrency errors (530)
let taskQueue: Promise<any> = Promise.resolve();
let cachedClient: ftp.Client | null = null;

// Helper to execute tasks sequentially using a single persistent connection
function runSerialized<T>(task: (client: ftp.Client) => Promise<T>): Promise<T> {
    const operation = async () => {
        try {
            // Ensure client is ready
            if (!cachedClient || cachedClient.closed) {
                console.log('[FTP] Connecting new client...');
                cachedClient = new ftp.Client();
                cachedClient.ftp.verbose = false;
                await cachedClient.access(FTP_CONFIG);
                
                // Force LIST instead of MLSD for better compatibility with consumer NAS
                // MLSD can be very slow on large directories
                (cachedClient.ftp as any).features?.delete('MLST');
                (cachedClient.ftp as any).features?.delete('MLSD');
            }
            return await task(cachedClient);
        } catch (error: any) {
            console.warn('[FTP] Operation failed, retrying with fresh connection:', error.message);
            // Force reconnect and retry once
            try {
                if (cachedClient) cachedClient.close();
            } catch {}
            
            cachedClient = new ftp.Client();
            cachedClient.ftp.verbose = false;
            await cachedClient.access(FTP_CONFIG);
            
            // Force LIST on retry too
            (cachedClient.ftp as any).features?.delete('MLST');
            (cachedClient.ftp as any).features?.delete('MLSD');
            
            return await task(cachedClient);
        }
    };

    // Chain the operation
    const result = taskQueue.then(operation);
    // Ensure queue doesn't break on error
    taskQueue = result.catch(() => {});
    return result;
}

// We expose getFtpClient for legacy/direct usage if needed, but suggest using wrappers
export async function getFtpClient(): Promise<ftp.Client> {
   return new Error('Deprecated: Use exported functions directly') as any; 
   // Actually let's keep it working just in case, but it breaks serialization.
   // Providing a new client is safer for legacy code.
   const client = new ftp.Client();
   await client.access(FTP_CONFIG);
   return client;
}

// Cache for directory listings
const dirCache = new Map<string, { timestamp: number, data: FileInfo[] }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function listFiles(remotePath: string = '/G'): Promise<FileInfo[]> {
    // Check Cache
    const cached = dirCache.get(remotePath);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    return runSerialized(async (client) => {
        try {
            console.log(`[FTP] Listing ${remotePath}...`);
            // Increase timeout to 300s (5 minutes) for very large directories
            const list = await withTimeout(client.list(remotePath), 300000);
            console.log(`[FTP] Found ${list.length} items in ${remotePath}`);
            
            const files: FileInfo[] = list.map(item => ({
                name: item.name,
                type: item.type === 2 ? 'directory' : 'file',
                size: item.size,
                modifiedAt: item.modifiedAt || new Date(),
                path: `${remotePath}/${item.name}`.replace(/\/+/g, '/')
            }));
    
            // Update Cache
            dirCache.set(remotePath, { timestamp: Date.now(), data: files });
            return files;
        } catch (error) {
            dirCache.delete(remotePath);
            throw error;
        }
    });
}

export async function downloadFile(remotePath: string): Promise<Buffer> {
    return runSerialized(async (client) => {
        const { Writable } = require('stream');
        const chunks: Buffer[] = [];
        const writableStream = new Writable({
            write(chunk: Buffer, encoding: string, callback: () => void) {
                chunks.push(chunk);
                callback();
            }
        });

        await withTimeout(client.downloadTo(writableStream, remotePath), 60000); // Increased timeout for slow NAS
        return Buffer.concat(chunks);
    });
}

export async function uploadFile(
    localBuffer: Buffer,
    remotePath: string
): Promise<void> {
    return runSerialized(async (client) => {
        const { Readable } = require('stream');
        const stream = Readable.from(localBuffer);
        await withTimeout(client.uploadFrom(stream, remotePath), 60000);

        const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
        invalidateCache(parentDir);
    });
}

export async function appendFile(
    localBuffer: Buffer,
    remotePath: string
): Promise<void> {
    return runSerialized(async (client) => {
        const { Readable } = require('stream');
        const stream = Readable.from(localBuffer);
        // Use appendFrom to append data to existing file
        await withTimeout(client.appendFrom(stream, remotePath), 60000);

        // No need to invalidate cache if checking size immediately, but good practice
        const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
        invalidateCache(parentDir);
    });
}

export async function deleteFile(remotePath: string): Promise<void> {
    return runSerialized(async (client) => {
        await client.remove(remotePath);
        const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
        invalidateCache(parentDir);
    });
}

export async function deleteDirectory(remotePath: string): Promise<void> {
    return runSerialized(async (client) => {
        await client.removeDir(remotePath);
        const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
        invalidateCache(parentDir);
    });
}

export async function createDirectory(remotePath: string): Promise<void> {
    return runSerialized(async (client) => {
        await client.ensureDir(remotePath);
        const parentDir = remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
        invalidateCache(parentDir);
    });
}

// Helper to invalidate cache for a path (and parent potentially)
function invalidateCache(path: string) {
    dirCache.delete(path);
    const parent = path.substring(0, path.lastIndexOf('/')) || '/';
    dirCache.delete(parent);
}

