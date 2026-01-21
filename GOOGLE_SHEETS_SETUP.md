# Google Sheets Integration Setup

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Google Sheets API Configuration
GOOGLE_SHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
```

## How to Get These Values

### 1. Get Google Sheet ID
- Open your Google Sheet
- The ID is in the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- Copy the `{SHEET_ID}` part

### 2. Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Go to "IAM & Admin" > "Service Accounts"
5. Click "Create Service Account"
6. Give it a name (e.g., "waterflow-sheets-reader")
7. Click "Create and Continue"
8. Skip optional steps and click "Done"

### 3. Get Service Account Credentials
1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file

### 4. Extract Values from JSON
Open the downloaded JSON file and find:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 5. Share Google Sheet with Service Account
1. Open your Google Sheet
2. Click "Share" button
3. Add the service account email (from step 4)
4. Give it "Viewer" permission
5. Click "Send"

## Testing

After adding the environment variables:
1. Restart your dev server: `npm run dev`
2. Search for a customer
3. Check if "Tình trạng" shows the correct status from Google Sheets

## Troubleshooting

If you see "Bình thường" for all customers:
- Check if the environment variables are set correctly
- Make sure the Google Sheet is shared with the service account
- Check the console for error messages
- Verify the sheet name is "ON_OFF"
- Verify column names include "danh_ba" or "danh bạ" and "tinh_trang" or "tình trạng"
