const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { ociService } = require('../src/services/ociService');
const { logger } = require('../src/utils/logger');

// Load environment variables - don't fail if .env is missing (e.g. in docker with env_file)
dotenv.config();

async function getFiles(dir: string): Promise<string[]> {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

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

    const allFiles = await getFiles(LOGO_DIR);
    logger.info(`Found ${allFiles.length} files to migrate.`);

    let successCount = 0;
    let failCount = 0;

    for (const filePath of allFiles) {
        try {
            const buffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName).toLowerCase();
            let mimetype = 'image/jpeg';
            if (ext === '.png') mimetype = 'image/png';
            if (ext === '.webp') mimetype = 'image/webp';
            if (ext === '.gif') mimetype = 'image/gif';

            logger.info(`Uploading ${fileName}...`);
            // We use a flat structure logos/filename in OCI
            await ociService.uploadFile(buffer, `logos/${fileName}`, mimetype);
            successCount++;
        } catch (error) {
            logger.error(`Failed to upload ${filePath}:`, error);
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
