
import { db } from './src/config/database';
import { transformResult } from './src/utils/responseTransformer';

async function testUpdate() {
  try {
    const schoolId = '550e8400-e29b-41d4-a716-446655440000';
    const newLogo = '/uploads/logos/test-logo.png';

    console.log(`Simulating UPDATE for school ID: ${schoolId} with logo: ${newLogo}`);

    const updates = ['logo_url = $1', 'updated_at = NOW()'];
    const values = [newLogo, schoolId];

    const result = await db.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $2 RETURNING *`,
      values
    );

    console.log('Update Result:', JSON.stringify(transformResult(result.rows[0]), null, 2));

    // Verify in DB
    const check = await db.query("SELECT logo_url FROM schools WHERE id = $1", [schoolId]);
    console.log('DB Check Logo URL:', check.rows[0].logo_url);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testUpdate();
