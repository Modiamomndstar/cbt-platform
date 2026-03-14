import { db } from '../src/config/database';
import { ociService } from '../src/services/ociService';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables - don't fail if .env is missing (e.g. in docker with env_file)
dotenv.config();

async function fixPaths() {
    logger.info("Starting School Logo Path Correction...");

    if (!ociService.isEnabled()) {
        logger.error("OCI Service is not enabled. Cannot generate OCI URLs.");
        process.exit(1);
    }

    try {
        // Find all schools with a logo_url that starts with /uploads
        const result = await db.query(
            "SELECT id, name, logo_url FROM schools WHERE logo_url LIKE '/uploads/%'"
        );

        logger.info(`Found ${result.rows.length} schools with legacy logo paths.`);

        let successCount = 0;
        let failCount = 0;

        for (const school of result.rows) {
            try {
                const legacyPath = school.logo_url;
                const fileName = path.basename(legacyPath);
                
                // Construct the new OCI URL
                // We assume the file has been migrated to the flat 'logos/' directory in OCI
                const newOciUrl = ociService.getPublicUrl(`logos/${fileName}`);

                logger.info(`Updating ${school.name}: ${legacyPath} -> ${newOciUrl}`);

                await db.query(
                    "UPDATE schools SET logo_url = $1, updated_at = NOW() WHERE id = $2",
                    [newOciUrl, school.id]
                );

                successCount++;
            } catch (error) {
                logger.error(`Failed to update school ${school.name} (${school.id}):`, error);
                failCount++;
            }
        }

        logger.info("Path Correction Complete!");
        logger.info(`Successfully updated: ${successCount}`);
        logger.info(`Failed: ${failCount}`);

        process.exit(0);
    } catch (error) {
        logger.error("Database error during path correction:", error);
        process.exit(1);
    }
}

fixPaths();
