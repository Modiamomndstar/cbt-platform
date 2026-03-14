import { pool } from '../src/config/database';

async function checkLogos() {
    try {
        const result = await pool.query("SELECT id, name, logo_url FROM schools LIMIT 100");
        console.log("All Schools:");
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkLogos();
