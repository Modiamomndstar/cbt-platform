import * as common from "oci-common";
import * as os from "oci-objectstorage";
import fs from "fs";
import { logger } from "../utils/logger";

class OciService {
  private client: os.ObjectStorageClient | null = null;
  private namespace: string | null = null;
  private bucketName: string | null = null;
  private region: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const user = process.env.OCI_USER_OCID;
      const tenancy = process.env.OCI_TENANCY_OCID;
      const fingerprint = process.env.OCI_FINGERPRINT;
      const region = process.env.OCI_REGION;
      const privateKeyPath = process.env.OCI_PRIVATE_KEY_PATH;

      if (!user || !tenancy || !fingerprint || !region || !privateKeyPath) {
        logger.info("OCI Storage credentials not complete. Falling back to local storage.");
        return;
      }

      if (!fs.existsSync(privateKeyPath)) {
        logger.warn(`OCI Private key not found at ${privateKeyPath}. Falling back to local storage.`);
        return;
      }

      this.region = region;
      this.namespace = process.env.OCI_NAMESPACE || null;
      this.bucketName = process.env.OCI_BUCKET_NAME || null;

      const provider = new common.SimpleAuthenticationDetailsProvider(
        tenancy,
        user,
        fingerprint,
        fs.readFileSync(privateKeyPath, "utf8"),
        null,
        common.Region.fromRegionId(region)
      );

      this.client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });
      logger.info("OCI Object Storage client initialized successfully.");
    } catch (error) {
      logger.error("Error initializing OCI Service:", error);
    }
  }

  public isEnabled(): boolean {
    return !!this.client && !!this.namespace && !!this.bucketName;
  }

  /**
   * Upload a file buffer to OCI Object Storage
   */
  async uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    if (!this.client || !this.namespace || !this.bucketName) {
      throw new Error("OCI Client not initialized");
    }

    try {
      const putObjectRequest: os.requests.PutObjectRequest = {
        namespaceName: this.namespace,
        bucketName: this.bucketName,
        putObjectBody: buffer,
        objectName: fileName,
        contentType: contentType,
      };

      await this.client.putObject(putObjectRequest);
      
      return this.getPublicUrl(fileName);
    } catch (error) {
      logger.error("OCI Upload Error:", error);
      throw error;
    }
  }

  /**
   * Get public URL for the object
   */
  private getPublicUrl(fileName: string): string {
    // Standard public URL pattern for OCI Object Storage
    // https://objectstorage.[region].oraclecloud.com/n/[namespace]/b/[bucket]/o/[filename]
    return `https://objectstorage.${this.region}.oraclecloud.com/n/${this.namespace}/b/${this.bucketName}/o/${fileName}`;
  }
}

export const ociService = new OciService();
