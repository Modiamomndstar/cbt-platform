import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ociService } from '../src/services/ociService';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

async function migrate() {
    logger.info("Starting OCI Asset Migration...");

    if (!ociService.isEnabled()) {
        logger.error("OCI Service is not enabled. Please check your .env configuration.");
        process.exit(1);
    }

    const UPLOAD_DIR = fs.existsSync(path.join(process.cwd(), "uploads"))
        ? path.join(process.cwd(), "uploads")
        : path.join(process.cwd(), "backend", "uploads");

    const LOGO_DIR = path.join(UPLOAD_DIR, 'logos');

    if (!fs.existsSync(LOGO_DIR)) {
        logger.info("No local logos found to migrate.");
        return;
    }

    const files = fs.readdirSync(LOGO_DIR);
    logger.info(`Found ${files.length} files to migrate.`);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        const filePath = path.join(LOGO_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) continue;

        try {
            const buffer = fs.readFileSync(filePath);
            const ext = path.extname(file).toLowerCase();
            let mimetype = 'image/jpeg';
            if (ext === '.png') mimetype = 'image/png';
            if (ext === '.webp') mimetype = 'image/webp';
            if (ext === '.gif') mimetype = 'image/gif';

            logger.info(`Uploading ${file}...`);
            await ociService.uploadFile(buffer, `logos/${file}`, mimetype);
            successCount++;
        } catch (error) {
            logger.error(`Failed to upload ${file}:`, error);
            failCount++;
        }
    }

    logger.info("Migration Complete!");
    logger.info(`Successfully migrated: ${successCount}`);
    logger.info(`Failed: ${failCount}`);
}

migrate().catch(err => {
    logger.error("Migration failed with fatal error:", err);
    process.exit(1);
});
