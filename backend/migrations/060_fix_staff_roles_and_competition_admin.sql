-- Migration: Fix Staff Roles & Standardize Competition Admin
-- Description: Updates the staff_accounts role constraint to include all required roles.

-- 1. Drop existing constraint if it exists
ALTER TABLE public.staff_accounts DROP CONSTRAINT IF EXISTS staff_accounts_role_check;

-- 2. Add comprehensive role check
ALTER TABLE public.staff_accounts ADD CONSTRAINT staff_accounts_role_check 
CHECK (role IN (
    'customer_success', 
    'support_agent', 
    'finance', 
    'sales_manager', 
    'content_reviewer', 
    'coordinating_admin', 
    'sales_admin', 
    'competition_admin', 
    'super_admin'
));

-- 3. Ensure Coordinating and Sales Admin roles have correct default permissions (informational)
-- These are handled at the application level in auth.ts, but standardizing them here ensures DB consistency.
