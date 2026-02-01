

import { envLogger } from './logger'

/**
 * Environment Variables Validation
 * Validates and exports typed environment configuration
 */
envLogger.info('Loading Env Config:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasSoapUrl: !!process.env.SOAP_API_URL
})

// Supabase Configuration
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// SOAP API Configuration
export const soapConfig = {
  url: process.env.SOAP_API_URL || '',
  user: process.env.SOAP_API_USER || '',
  isConfigured: Boolean(
    process.env.SOAP_API_URL &&
    process.env.SOAP_API_USER
  )
}

// Google Sheets Configuration
export const googleSheetsConfig = {
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
  sheetId: process.env.GOOGLE_SHEET_ID || '',
  isConfigured: Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  )
}

/**
 * Check if app is running in demo mode
 */
export const isDemoMode = !supabaseConfig.isConfigured

/**
 * Validate environment variables and log warnings
 */
export function validateEnv() {
  const warnings: string[] = []

  if (!supabaseConfig.isConfigured) {
    warnings.push('⚠️  Supabase not configured - running in DEMO mode')
  }

  if (!soapConfig.isConfigured) {
    warnings.push('⚠️  SOAP API not configured - legacy data integration disabled')
  }

  if (!googleSheetsConfig.isConfigured) {
    warnings.push('⚠️  Google Sheets not configured - customer status will use defaults')
  }

  if (warnings.length > 0) {
    envLogger.warn('\n' + '='.repeat(60))
    envLogger.warn('🔧 ENVIRONMENT CONFIGURATION WARNINGS')
    envLogger.warn('='.repeat(60))
    warnings.forEach(w => envLogger.warn(w))
    envLogger.warn('\nℹ️  See .env.example for configuration instructions')
    envLogger.warn('ℹ️  App will run with limited functionality\n')
    envLogger.warn('='.repeat(60) + '\n')
  }

  return {
    isValid: true, // App can run even without full config
    warnings,
    isDemoMode
  }
}
