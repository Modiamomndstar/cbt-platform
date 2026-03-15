const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a simple pool for the script
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixPaths() {
    console.log("Starting School Logo Path Correction...");

    try {
        // Find all schools with a logo_url that starts with /uploads
        const { rows } = await pool.query(
            "SELECT id, name, logo_url FROM schools WHERE logo_url LIKE '/uploads/%'"
        );

        console.log(`Found ${rows.length} schools with legacy logo paths.`);

        let successCount = 0;
        let failCount = 0;

        for (const school of rows) {
            try {
                const legacyPath = school.logo_url;
                const fileName = path.basename(legacyPath);
                
                // Construct the OCI URL manually to avoid dependencies
                // https://objectstorage.[region].oraclecloud.com/n/[namespace]/b/[bucket]/o/[filename]
                const region = process.env.OCI_REGION;
                const namespace = process.env.OCI_NAMESPACE;
                const bucket = process.env.OCI_BUCKET_NAME;
                
                if (!region || !namespace || !bucket) {
                    throw new Error("Missing OCI environment variables (REGION, NAMESPACE, or BUCKET_NAME)");
                }

                const newOciUrl = `https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucket}/o/logos/${fileName}`;

                console.log(`Updating ${school.name}: ${legacyPath} -> ${newOciUrl}`);

                await pool.query(
                    "UPDATE schools SET logo_url = $1, updated_at = NOW() WHERE id = $2",
                    [newOciUrl, school.id]
                );

                successCount++;
            } catch (error) {
                console.error(`Failed to update school ${school.name} (${school.id}):`, error.message);
                failCount++;
            }
        }

        console.log("Path Correction Complete!");
        console.log(`Successfully updated: ${successCount}`);
        console.log(`Failed: ${failCount}`);

        process.exit(0);
    } catch (error) {
        console.error("Database error during path correction:", error);
        process.exit(1);
    }
}

fixPaths();
