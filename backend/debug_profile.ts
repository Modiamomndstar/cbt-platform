
import { db } from './src/config/database';
import { transformResult } from './src/utils/responseTransformer';

async function debugProfile() {
  try {
    const schoolId = '550e8400-e29b-41d4-a716-446655440000';
    console.log(`Querying school ID: ${schoolId}`);

    const result = await db.query(
      `SELECT id, name, username, email, phone, address, description, logo_url, country, timezone,
              plan_type, plan_status, plan_expires_at, is_active, created_at
       FROM schools WHERE id = $1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      console.log('School not found');
      return;
    }

    const row = result.rows[0];
    console.log('Raw DB Row:', JSON.stringify(row, null, 2));

    const transformed = transformResult(row);
    console.log('Transformed Row:', JSON.stringify(transformed, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugProfile();
