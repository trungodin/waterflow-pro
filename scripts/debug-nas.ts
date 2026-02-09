
import { Client } from 'basic-ftp';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Fix path for dotenv
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listNasFiles() {
    const client = new Client();
    // client.ftp.verbose = true;

    try {
        console.log('Env Check:', {
            FTP_HOST: process.env.FTP_HOST ? '***' : 'MISSING',
            FTP_USER: process.env.FTP_USER ? '***' : 'MISSING'
        });

        console.log('Connecting to FTP at', process.env.FTP_HOST);
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            port: Number(process.env.FTP_PORT) || 21, 
            secure: false
        });


        console.log('Connected.');
        
        const rootPath = '/';
        console.log(`Listing ${rootPath}...`);
        const list = await client.list(rootPath);
        
        console.log('Files/Folders in /:');
        list.forEach(f => console.log(` - ${f.name} (${f.type === 2 ? 'Dir' : 'File'})`));
        
        // Check for G folder explicitly
        if (list.some(f => f.name === 'G')) {
             console.log('Found G folder. Listing /G/waterflow-pro...');
             try {
                // List ON_OFF_Images
                // console.log('--- /G/waterflow-pro/ON_OFF_Images ---');
                // const onOffList = await client.list('/G/waterflow-pro/ON_OFF_Images');
                // onOffList.slice(0, 20).forEach(f => console.log(`   - ${f.name} (${f.type === 2 ? 'Dir' : 'File'})`));

                // List database_Images
                console.log('--- /G/waterflow-pro/database_Images ---');
                const dbList = await client.list('/G/waterflow-pro/database_Images');
                dbList.slice(0, 20).forEach(f => console.log(`   - ${f.name} (${f.type === 2 ? 'Dir' : 'File'})`));

             } catch (e) {
                console.log('Error listing subfolders', e);
             }
        }

        // Check for ON_OFF_Images or similar
        const onOffFolder = list.find(f => f.name.toLowerCase().includes('on_off') || f.name.toLowerCase().includes('hinh'));
        
        if (onOffFolder && onOffFolder.type === 2) {
            console.log(`\nListing contents of ${rootPath}/${onOffFolder.name}...`);
            const subList = await client.list(`${rootPath}/${onOffFolder.name}`);
             // Show first 10
            subList.slice(0, 10).forEach(f => console.log(`   - ${f.name}`));
        } else {
            console.log('\nCould not find obvious ON_OFF images folder.');
        }

    } catch (err) {
        console.error('FTP Error:', err);
    } finally {
        client.close();
    }
}

listNasFiles();
