import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkGoogleSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('🔍 Searching for danh_bo: 02133625821 in Google Sheets...\n');

    // Get ON_OFF sheet
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ON_OFF!A:C', // Get columns A (id_tb), B (danh_bo), C (tinh_trang)
    });

    const rows = response.data.values || [];
    console.log(`📊 Total rows in ON_OFF sheet: ${rows.length}\n`);

    // Search for the specific danh_bo
    const targetDanhBo = '02133625821';
    const matches = rows.filter((row, index) => {
        if (index === 0) return false; // Skip header
        const danhBo = String(row[1] || '').trim();
        return danhBo === targetDanhBo || 
               danhBo === targetDanhBo.replace(/^0+/, '') || // Without leading zeros
               danhBo.padStart(11, '0') === targetDanhBo; // Padded
    });

    if (matches.length === 0) {
        console.log('❌ NOT FOUND in Google Sheets ON_OFF!');
        console.log('\n🔎 Trying alternative formats...');
        
        // Try without leading zeros
        const alt1 = '2133625821';
        const matches2 = rows.filter((row, index) => {
            if (index === 0) return false;
            const danhBo = String(row[1] || '').trim();
            return danhBo === alt1;
        });
        
        if (matches2.length > 0) {
            console.log(`✅ Found with format "${alt1}":`);
            matches2.forEach(row => {
                console.log({
                    id_tb: row[0],
                    danh_bo: row[1],
                    tinh_trang: row[2]
                });
            });
        } else {
            console.log('❌ Still not found!');
        }
    } else {
        console.log(`✅ Found ${matches.length} match(es):`);
        matches.forEach(row => {
            console.log({
                id_tb: row[0],
                danh_bo: row[1],
                tinh_trang: row[2]
            });
        });
    }

    // Sample some rows to see format
    console.log('\n📋 Sample rows from ON_OFF (first 5):');
    rows.slice(1, 6).forEach(row => {
        console.log({
            id_tb: row[0],
            danh_bo: row[1],
            tinh_trang: row[2]
        });
    });
}

checkGoogleSheets().catch(console.error);
