
// WARNING: This file contains sensitive API credentials. 
// Ideally, these should be in environment variables, but for this refactor I'm porting from config_secure.py for now.

export const API_CONFIG = {
  URL: process.env.API_URL || 'http://14.161.13.194:8065/ws_Banggia.asmx',
  USER: process.env.API_USER || 'BENTHANH@194',
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '180000') // 180 seconds (Matches Python app)
}
