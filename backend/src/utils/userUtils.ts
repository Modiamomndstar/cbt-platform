/**
 * Utility functions for user-related data processing.
 */

/**
 * Standardizes full name into first and last name components.
 * Returns { firstName, lastName }
 */
export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = (fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || '.';
  return { firstName, lastName };
};

/**
 * Generates a unique username based on full name and database check.
 * Implementation extracted from students.ts
 */
export const generateUniqueUsername = async (
  client: any,
  fullName: string,
  table: 'students' | 'external_students' | 'tutors' = 'students',
  existingInBatch: Set<string> = new Set()
): Promise<string> => {
  // Normalize: lower case, remove spaces/special chars
  let base = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base.length < 3) base = base.padEnd(3, 'x'); // Ensure min length

  let username = base;
  let counter = 1;

  // Check against DB and Batch
  while (true) {
    if (existingInBatch.has(username)) {
       username = `${base}${counter}`;
       counter++;
       continue;
    }

    // Check all three tables for global uniqueness if possible,
    // or just the target table. The business requirement says "unique username".
    // Usually, usernames should be globally unique across all student/tutor types.
    const result = await client.query(
      `SELECT 1 FROM ${table} WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      break;
    }

    username = `${base}${counter}`;
    counter++;
  }

  return username;
};
