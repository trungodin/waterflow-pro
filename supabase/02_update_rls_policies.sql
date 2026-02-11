-- ============================================
-- Step 2: Update RLS Policies
-- Tighten security - Only admins can manage users
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all profiles
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

-- Policy 3: System can insert (via trigger)
-- No manual INSERT policy needed - trigger handles it

-- Policy 4: Only admins can update any profile
CREATE POLICY "Only admins can update profiles"
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

-- Policy 5: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
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

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
