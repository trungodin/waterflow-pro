-- Migration: Create user_profiles table for RBAC system
-- Created: 2026-02-10

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'pending', -- 'admin', 'manager', 'reader', 'collector', 'pending'
  status TEXT NOT NULL DEFAULT 'pending', -- 'active', 'pending', 'rejected', 'suspended'
  requested_role TEXT, -- Role user requested during signup
  phone TEXT,
  department TEXT,
  notes TEXT, -- Admin notes
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Only admins can update profiles (for approval/role changes)
CREATE POLICY "Admins can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Policy: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Insert admin profiles for existing admin emails
-- This ensures admins have immediate access
INSERT INTO user_profiles (user_id, email, full_name, role, status, created_at, approved_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email),
  'admin',
  'active',
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('trungodin@gmail.com', 'trung100982@gmail.com')
ON CONFLICT (email) DO UPDATE
SET role = 'admin', status = 'active', approved_at = NOW();

-- Create activity logs table (optional, for audit trail)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON user_activity_logs(created_at);

-- RLS for activity logs
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

CREATE POLICY "Users can insert own activity logs"
  ON user_activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_profiles IS 'User profiles with role-based access control';
COMMENT ON TABLE user_activity_logs IS 'Audit trail for user activities';
