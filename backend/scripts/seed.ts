import { pool } from "../src/config/database";
import { logger } from "../src/utils/logger";
import bcrypt from "bcryptjs";

async function seed() {
  const client = await pool.connect();

  try {
    logger.info("Starting database seeding...");

    await client.query("BEGIN");

    // Check if plan definitions exist
    const plansResult = await client.query(
      "SELECT COUNT(*) FROM plan_definitions",
    );

    if (parseInt(plansResult.rows[0].count) === 0) {
      logger.info("Creating default plan definitions...");

      // Insert default plan definitions
      await client.query(`
        INSERT INTO plan_definitions (
          plan_type, display_name, price_usd, price_ngn, trial_days,
          max_tutors, max_internal_students, max_external_per_tutor, max_active_exams, ai_queries_per_month,
          allow_student_portal, allow_external_students, allow_bulk_import, allow_email_notifications,
          allow_sms_notifications, allow_advanced_analytics, allow_custom_branding, allow_api_access,
          allow_result_pdf, allow_result_export
        ) VALUES
        ('freemium', 'Free', 0, 0, 0,
          2, 20, 5, 5, 0,
          false, false, false, false,
          false, false, false, false,
          false, false),
        ('basic', 'Basic Premium', 4.99, 8000, 14,
          10, 300, 30, NULL, 30,
          true, true, true, true,
          false, false, false, false,
          true, false),
        ('advanced', 'Advanced Premium', 14.99, 24000, 14,
          50, 2000, 200, NULL, 200,
          true, true, true, true,
          true, true, true, true,
          true, true),
        ('enterprise', 'Enterprise', 0, 0, 14,
          NULL, NULL, NULL, NULL, NULL,
          true, true, true, true,
          true, true, true, true,
          true, true)
      `);

      logger.info("Plan definitions created successfully");
    } else {
      logger.info("Plan definitions already exist, skipping...");
    }

    // Check if super admin exists
    const superAdminResult = await client.query(
      "SELECT id FROM schools WHERE email = $1",
      [process.env.SUPER_ADMIN_EMAIL || "admin@cbtplatform.com"],
    );

    if (superAdminResult.rows.length === 0) {
      logger.info("Creating super admin account...");

      const superAdminPassword =
        process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

      await client.query(
        `
        INSERT INTO schools (
          name, username, email, password_hash, phone, address, country,
          plan_type, plan_status, total_paid, is_active
        ) VALUES (
          'CBT Platform Admin', 'cbt-admin', $1, $2, '+1234567890', 'Admin Office', 'Nigeria',
          'enterprise', 'active', 0, true
        )
      `,
        [
          process.env.SUPER_ADMIN_EMAIL || "admin@cbtplatform.com",
          hashedPassword,
        ],
      );

      logger.info("Super admin created successfully");
      logger.info(
        `Email: ${process.env.SUPER_ADMIN_EMAIL || "admin@cbtplatform.com"}`,
      );
      logger.info(`Password: ${superAdminPassword}`);
    } else {
      logger.info("Super admin already exists, skipping...");
    }

    await client.query("COMMIT");

    logger.info("Database seeding completed successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Seeding failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
