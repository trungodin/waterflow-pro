
import { google } from 'googleapis';
import path from 'path';
import dotenv from 'dotenv';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkHeaders() {
  try {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
        console.error('Missing GOOGLE_SHEET_ID');
        return;
    }

    console.log('Fetching headers for ON_OFF sheet...');
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ON_OFF!1:1', // Read first row only
    });

    const headers = res.data.values?.[0];
    if (!headers) {
        console.log('No headers found.');
        return;
    }

    console.log('Headers found:');
    headers.forEach((h, i) => {
        // Convert column index to Letter (0->A, 23->X)
        const letter = String.fromCharCode(65 + (i % 26)); 
        const prefix = i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : '';
        console.log(`Index ${i} (${prefix}${letter}): ${h}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkHeaders();
