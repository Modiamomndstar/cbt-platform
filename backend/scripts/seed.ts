import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database seeding...');
    
    await client.query('BEGIN');
    
    // Check if payment plans exist
    const plansResult = await client.query('SELECT COUNT(*) FROM payment_plans');
    
    if (parseInt(plansResult.rows[0].count) === 0) {
      logger.info('Creating default payment plans...');
      
      // Insert default payment plans
      await client.query(`
        INSERT INTO payment_plans (name, description, price, currency, duration_months, max_tutors, max_students, features)
        VALUES 
          ('Free Trial', 'Perfect for getting started', 0, 'USD', 1, 2, 50, '["Up to 2 tutors", "Up to 50 students", "Basic analytics", "Email support"]'),
          ('Basic', 'For small schools', 29.99, 'USD', 1, 5, 200, '["Up to 5 tutors", "Up to 200 students", "Advanced analytics", "Priority support", "AI question generation"]'),
          ('Professional', 'For growing institutions', 79.99, 'USD', 1, 15, 1000, '["Up to 15 tutors", "Up to 1000 students", "Full analytics", "24/7 support", "AI question generation", "Custom branding"]'),
          ('Enterprise', 'For large organizations', 199.99, 'USD', 1, 50, 5000, '["Unlimited tutors", "Unlimited students", "Enterprise analytics", "Dedicated support", "AI question generation", "Custom branding", "API access"]')
      `);
      
      logger.info('Payment plans created successfully');
    } else {
      logger.info('Payment plans already exist, skipping...');
    }
    
    // Check if super admin exists
    const superAdminResult = await client.query(
      'SELECT id FROM schools WHERE email = $1',
      [process.env.SUPER_ADMIN_EMAIL || 'admin@cbtplatform.com']
    );
    
    if (superAdminResult.rows.length === 0) {
      logger.info('Creating super admin account...');
      
      const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      
      await client.query(`
        INSERT INTO schools (
          school_name, email, password_hash, phone, address, city, country,
          subscription_status, subscription_plan, max_tutors, max_students, is_active
        ) VALUES (
          'CBT Platform Admin', $1, $2, '+1234567890', 'Admin Office', 'Admin City', 'Nigeria',
          'active', 'Enterprise', 999, 99999, true
        )
      `, [process.env.SUPER_ADMIN_EMAIL || 'admin@cbtplatform.com', hashedPassword]);
      
      logger.info('Super admin created successfully');
      logger.info(`Email: ${process.env.SUPER_ADMIN_EMAIL || 'admin@cbtplatform.com'}`);
      logger.info(`Password: ${superAdminPassword}`);
    } else {
      logger.info('Super admin already exists, skipping...');
    }
    
    await client.query('COMMIT');
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
