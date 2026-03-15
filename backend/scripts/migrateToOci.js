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

    const user = process.env.OCI_USER_OCID;
    const tenancy = process.env.OCI_TENANCY_OCID;
    const fingerprint = process.env.OCI_FINGERPRINT;
    const region = process.env.OCI_REGION;
    const privateKeyPath = process.env.OCI_PRIVATE_KEY_PATH || '/usr/src/app/oci_api_key.pem';
    const namespace = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

    if (!user || !tenancy || !fingerprint || !region || !privateKeyPath || !namespace || !bucketName) {
        console.error("OCI Storage credentials or bucket info not complete.");
        console.log("Required vars: OCI_USER_OCID, OCI_TENANCY_OCID, OCI_FINGERPRINT, OCI_REGION, OCI_PRIVATE_KEY_PATH, OCI_NAMESPACE, OCI_BUCKET_NAME");
        process.exit(1);
    }

    if (!fs.existsSync(privateKeyPath)) {
        console.error(`OCI Private key not found at ${privateKeyPath}`);
        process.exit(1);
    }

    const provider = new common.SimpleAuthenticationDetailsProvider(
        tenancy,
        user,
        fingerprint,
        fs.readFileSync(privateKeyPath, "utf8"),
        null,
        common.Region.fromRegionId(region)
    );

    const client = new objectstorage.ObjectStorageClient({
        authenticationDetailsProvider: provider
    });

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
