-- Migration: Advanced Admin Roles & Sales Marketing System
-- Description: Adds Coordinating Admin, Sales Admin roles, commission settings, and transaction tracking.

-- 1. Update staff_accounts table
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50) UNIQUE;
ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS managed_by_id UUID REFERENCES public.staff_accounts(id);

-- Update role check constraint
ALTER TABLE public.staff_accounts DROP CONSTRAINT IF EXISTS staff_accounts_role_check;
ALTER TABLE public.staff_accounts ADD CONSTRAINT staff_accounts_role_check 
CHECK (role IN ('customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer', 'coordinating_admin', 'sales_admin', 'super_admin'));

-- 2. Update schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS sales_admin_id UUID REFERENCES public.staff_accounts(id);

-- 3. Create commission_settings table
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL, -- 'USD' or 'NGN'
    points_within_30_days INTEGER NOT NULL DEFAULT 0,
    points_after_30_days INTEGER NOT NULL DEFAULT 0,
    monetary_value_per_point NUMERIC(15, 2) NOT NULL DEFAULT 0,
    max_commissions_per_school INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plan_type, currency)
);

-- 4. Create sales_commissions table
CREATE TABLE IF NOT EXISTS public.sales_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff_accounts(id),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    payment_id UUID REFERENCES public.payments(id),
    points_earned INTEGER NOT NULL DEFAULT 0,
    monetary_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_staff_accounts_role ON public.staff_accounts(role);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_referral ON public.staff_accounts(referral_code);
CREATE INDEX IF NOT EXISTS idx_schools_sales_admin ON public.schools(sales_admin_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_staff ON public.sales_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON public.sales_commissions(status);
