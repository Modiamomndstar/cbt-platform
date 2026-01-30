import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { logger } from "../utils/logger";

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "cbt_platform",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err) => {
  logger.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Database query helper
export const db = {
  query: async <T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> => {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug("Executed query", {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });
      return result;
    } catch (error) {
      logger.error("Database query error", { text, params, error });
      throw error;
    }
  },

  getClient: async (): Promise<PoolClient> => {
    return await pool.connect();
  },

  transaction: async <T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Check database connection
  testConnection: async (): Promise<boolean> => {
    try {
      await pool.query("SELECT NOW()");
      return true;
    } catch (error) {
      logger.error("Database connection test failed", error);
      return false;
    }
  },
};

// Backwards compatibility: some modules import `{ pool }` as a named export.
// Also provide `db` as a named helper and keep default export for convenience.
export { pool };

export default pool;
