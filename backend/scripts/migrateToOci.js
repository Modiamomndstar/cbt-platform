const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
// Using standard OCI SDK if available in the image
const common = require('oci-common');
const objectstorage = require('oci-objectstorage');

dotenv.config();

// Simple recursive file getter
function getFiles(dir, allFiles) {
  const files = fs.readdirSync(dir);
  allFiles = allFiles || [];
  files.forEach(function(file) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, allFiles);
    } else {
      allFiles.push(name);
    }
  });
  return allFiles;
}

async function migrate() {
    console.log("Starting OCI Asset Migration (JS)...");

    const configurationFilePath = process.env.OCI_CONFIG_PATH || '/usr/src/app/oci_api_key.pem';
    const isOciEnabled = process.env.OCI_ENABLED === 'true';

    if (!isOciEnabled) {
        console.error("OCI Service is not enabled.");
        process.exit(1);
    }

    // Initialize OCI provide manually to avoid deep imports
    const provider = new common.ConfigFileAuthenticationDetailsProvider(
        undefined, // Default profile
        undefined // No config file path, use individual vars if needed? 
        // Actually the current backend uses environment vars.
    );
    // Overwrite some parts if needed. 
    // Wait, let's simplify and use the same logic as the backend service.
    
    // For simplicity in this script, let's just use the existing service if we can or re-implement basic upload.
    // Actually, re-implementing basic upload is safer.
    
    const client = new objectstorage.ObjectStorageClient({
        authenticationDetailsProvider: provider
    });

    const namespace = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

    const UPLOAD_DIR = fs.existsSync(path.join(process.cwd(), "uploads"))
        ? path.join(process.cwd(), "uploads")
        : path.join(process.cwd(), "backend", "uploads");

    const LOGO_DIR = path.join(UPLOAD_DIR, 'logos');

    if (!fs.existsSync(LOGO_DIR)) {
        console.log("No local logos found to migrate.");
        return;
    }

    const allFiles = getFiles(LOGO_DIR);
    console.log(`Found ${allFiles.length} files to migrate.`);

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

            console.log(`Uploading ${fileName}...`);
            
            const putObjectRequest = {
                namespaceName: namespace,
                bucketName: bucketName,
                putObjectBody: buffer,
                objectName: `logos/${fileName}`,
                contentType: mimetype
            };

            await client.putObject(putObjectRequest);
            successCount++;
        } catch (error) {
            console.error(`Failed to upload ${filePath}:`, error.message);
            failCount++;
        }
    }

    console.log("Migration Complete!");
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

migrate();
