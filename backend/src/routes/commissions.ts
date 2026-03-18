import { Router, Request, Response } from "express";
import { db } from "../config/database";
import { authenticate, authorize, requireFinanceAccess, requireSalesAdmin, requireCoordinatingAdmin } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { body, param, query } from "express-validator";
import { validate } from "../middleware/validation";
import { logStaffActivity } from "../utils/auditLogger";

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// --- SETTINGS (Finance Admin & Super Admin) ---

// Get all commission settings
router.get("/settings", requireFinanceAccess, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM commission_settings ORDER BY id ASC");
    ApiResponseHandler.success(res, result.rows, "Commission settings retrieved");
  } catch (error) {
    ApiResponseHandler.serverError(res, "Failed to retrieve settings");
  }
});

// Create or update commission setting
router.post("/settings", 
  requireFinanceAccess,
  [
    body('plan_type').notEmpty().withMessage('Plan type is required'),
    body('currency').isIn(['NGN', 'USD']).withMessage('Currency must be NGN or USD'),
    body('billing_cycle').isIn(['monthly', 'yearly', 'annual', 'free']).withMessage('Invalid billing cycle'),
    body('points_within_30_days').isNumeric(),
    body('points_after_30_days').isNumeric(),
    body('monetary_value_per_point').isNumeric(),
    validate
  ],
  async (req: Request, res: Response) => {
    try {
      const { 
        plan_type, 
        currency, 
        billing_cycle = 'monthly',
        points_within_30_days, 
        points_after_30_days, 
        monetary_value_per_point,
        max_commissions_per_school
      } = req.body;
      
      const result = await db.query(
        `INSERT INTO commission_settings (
          plan_type, 
          currency, 
          billing_cycle,
          points_within_30_days, 
          points_after_30_days, 
          monetary_value_per_point,
          max_commissions_per_school
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (plan_type, currency, billing_cycle) DO UPDATE
         SET points_within_30_days = EXCLUDED.points_within_30_days,
             points_after_30_days = EXCLUDED.points_after_30_days,
             monetary_value_per_point = EXCLUDED.monetary_value_per_point,
             max_commissions_per_school = EXCLUDED.max_commissions_per_school,
             updated_at = NOW()
         RETURNING *`,
        [
          plan_type, 
          currency, 
          billing_cycle,
          points_within_30_days, 
          points_after_30_days, 
          monetary_value_per_point,
          max_commissions_per_school || 1
        ]
      );

      await logStaffActivity(req, 'update_commission_settings', {
        details: req.body
      });

      ApiResponseHandler.success(res, result.rows[0], "Commission settings updated");
    } catch (error) {
      console.error("Update settings error:", error);
      ApiResponseHandler.serverError(res, "Failed to update settings");
    }
  }
);

// --- EARNINGS (Sales Admin) ---

// Get self earnings
router.get("/my-earnings", requireSalesAdmin, async (req: any, res) => {
  try {
    const staffId = req.user.id;
    const result = await db.query(
      `SELECT sc.*, s.name as school_name, s.username as school_username
       FROM sales_commissions sc
       JOIN schools s ON sc.school_id = s.id
       WHERE sc.staff_id = $1
       ORDER BY sc.created_at DESC`,
      [staffId]
    );

    const summary = await db.query(
      `SELECT 
         COALESCE(SUM(points_earned), 0) as total_points,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN monetary_value ELSE 0 END), 0) as total_paid_monetary,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN monetary_value ELSE 0 END), 0) as total_pending_monetary,
         currency
       FROM sales_commissions
       WHERE staff_id = $1
       GROUP BY currency`,
      [staffId]
    );

    ApiResponseHandler.success(res, {
      commissions: result.rows,
      summary: summary.rows
    }, "Earnings retrieved");
  } catch (error) {
    ApiResponseHandler.serverError(res, "Failed to retrieve earnings");
  }
});

// --- MANAGEMENT (Superadmin, Finance, Coordinating Admin) ---

// Get all commissions (Paginated/Filtered)
router.get("/admin/all", requireCoordinatingAdmin, async (req, res) => {
  try {
    const { status, staff_id, currency } = req.query;
    let queryStr = `
      SELECT sc.*, s.name as school_name, sa.name as staff_name, sa.username as staff_username
      FROM sales_commissions sc
      JOIN schools s ON sc.school_id = s.id
      JOIN staff_accounts sa ON sc.staff_id = sa.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      queryStr += ` AND sc.status = $${params.length}`;
    }
    if (staff_id) {
      params.push(staff_id);
      queryStr += ` AND sc.staff_id = $${params.length}`;
    }
    if (currency) {
      params.push(currency);
      queryStr += ` AND sc.currency = $${params.length}`;
    }

    queryStr += " ORDER BY sc.created_at DESC";

    const result = await db.query(queryStr, params);
    ApiResponseHandler.success(res, result.rows, "Admin commissions retrieved");
  } catch (error) {
    ApiResponseHandler.serverError(res, "Failed to retrieve commissions for admin");
  }
});

// Mark as Paid
router.post("/admin/payout/:id", 
  requireFinanceAccess,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const check = await db.query("SELECT status FROM sales_commissions WHERE id = $1", [id]);
      if (check.rows.length === 0) return ApiResponseHandler.notFound(res, "Commission not found");
      if (check.rows[0].status === 'paid') return ApiResponseHandler.badRequest(res, "Commission already paid");

      const result = await db.query(
        "UPDATE sales_commissions SET status = 'paid', updated_at = NOW() WHERE id = $1 RETURNING *",
        [id]
      );

      await logStaffActivity(req, 'process_commission_payout', {
        targetType: 'commission',
        targetId: id,
        details: result.rows[0]
      });

      ApiResponseHandler.success(res, result.rows[0], "Commission marked as paid");
    } catch (error) {
      ApiResponseHandler.serverError(res, "Failed to process payout");
    }
  }
);

export default router;
