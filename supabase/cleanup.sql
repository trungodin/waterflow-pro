-- Cleanup Script - Run this FIRST if you need to reset database
-- File: supabase/cleanup.sql

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can view meter readings" ON meter_readings;
DROP POLICY IF EXISTS "Authenticated users can insert meter readings" ON meter_readings;

-- Drop triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS update_invoice_status_after_payment ON payments;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_invoice_status();

-- Drop views
DROP VIEW IF EXISTS customer_summary;
DROP VIEW IF EXISTS monthly_revenue;

-- Drop indexes
DROP INDEX IF EXISTS idx_customers_code;
DROP INDEX IF EXISTS idx_customers_status;
DROP INDEX IF EXISTS idx_invoices_customer;
DROP INDEX IF EXISTS idx_invoices_period;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_payments_invoice;
DROP INDEX IF EXISTS idx_payments_customer;
DROP INDEX IF EXISTS idx_meter_readings_customer;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Success message
SELECT 'Database cleaned successfully! Now run schema.sql' as message;
