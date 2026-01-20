-- WaterFlow Pro Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  ward TEXT,
  district TEXT,
  city TEXT DEFAULT 'TP. HCM',
  meter_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2024),
  
  -- Water usage
  previous_reading DECIMAL(10,2) DEFAULT 0,
  current_reading DECIMAL(10,2) DEFAULT 0,
  consumption DECIMAL(10,2) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  
  -- Pricing
  unit_price DECIMAL(10,2) DEFAULT 5000,
  water_fee DECIMAL(10,2) GENERATED ALWAYS AS ((current_reading - previous_reading) * unit_price) STORED,
  environmental_fee DECIMAL(10,2) DEFAULT 0,
  vat DECIMAL(10,2) GENERATED ALWAYS AS (((current_reading - previous_reading) * unit_price + environmental_fee) * 0.1) STORED,
  total_amount DECIMAL(10,2) GENERATED ALWAYS AS ((current_reading - previous_reading) * unit_price + environmental_fee + ((current_reading - previous_reading) * unit_price + environmental_fee) * 0.1) STORED,
  
  -- Payment info
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (((current_reading - previous_reading) * unit_price + environmental_fee + ((current_reading - previous_reading) * unit_price + environmental_fee) * 0.1) - paid_amount) STORED,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_date TIMESTAMP WITH TIME ZONE,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'momo', 'zalopay')),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  transaction_id TEXT,
  bank_name TEXT,
  reference_number TEXT,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- METER READINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  meter_value DECIMAL(10,2) NOT NULL,
  photo_url TEXT,
  reader_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_customer ON meter_readings(customer_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Customers policies
CREATE POLICY "Authenticated users can view customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Invoices policies
CREATE POLICY "Authenticated users can view invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Payments policies
CREATE POLICY "Authenticated users can view payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Meter readings policies
CREATE POLICY "Authenticated users can view meter readings" ON meter_readings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert meter readings" ON meter_readings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update invoice status based on payment
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET status = CASE
    WHEN paid_amount >= total_amount THEN 'paid'
    WHEN paid_amount > 0 THEN 'partial'
    WHEN due_date < CURRENT_DATE AND paid_amount = 0 THEN 'overdue'
    ELSE 'pending'
  END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status after payment
CREATE TRIGGER update_invoice_status_after_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample customer
INSERT INTO customers (customer_code, full_name, email, phone, address, ward, district)
VALUES 
  ('KH001', 'Nguyễn Văn A', 'nguyenvana@example.com', '0901234567', '123 Nguyễn Huệ', 'Phường 1', 'Quận 1'),
  ('KH002', 'Trần Thị B', 'tranthib@example.com', '0912345678', '456 Lê Lợi', 'Phường 2', 'Quận 3')
ON CONFLICT (customer_code) DO NOTHING;

-- ============================================
-- VIEWS
-- ============================================

-- View for customer summary
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
  c.id,
  c.customer_code,
  c.full_name,
  c.phone,
  c.address,
  c.status,
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(i.total_amount) as total_billed,
  SUM(i.paid_amount) as total_paid,
  SUM(i.remaining_amount) as total_outstanding
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.customer_code, c.full_name, c.phone, c.address, c.status;

-- View for monthly revenue
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
  period_year,
  period_month,
  COUNT(*) as invoice_count,
  SUM(total_amount) as total_revenue,
  SUM(paid_amount) as collected_revenue,
  SUM(remaining_amount) as outstanding_revenue
FROM invoices
GROUP BY period_year, period_month
ORDER BY period_year DESC, period_month DESC;

-- ============================================
-- COMPLETED!
-- ============================================
-- Database schema created successfully!
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Enable authentication in Supabase dashboard
-- 3. Test with sample data
