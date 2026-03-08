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
      `SELECT 1 FROM "${table}" WHERE username = $1`,
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

/**
 * Generates a unique student ID if one is not provided.
 * Format: STU-YYYY-RANDOM
 */
export const generateStudentID = async (client: any, schoolId: string): Promise<string> => {
  const year = new Date().getFullYear();
  let studentId = "";
  let isUnique = false;

  while (!isUnique) {
    const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    studentId = `STU-${year}-${random}`;

    const check = await client.query(
      "SELECT id FROM students WHERE school_id = $1 AND student_id = $2",
      [schoolId, studentId]
    );

    if (check.rows.length === 0) {
      isUnique = true;
    }
  }

  return studentId;
};

/**
 * Find or Create a student category (class/level)
 */
export async function findOrCreateCategory(db: any, schoolId: string, categoryName: string, tutorId: string | null = null) {
  if (!categoryName || !categoryName.trim()) return null;
  const name = categoryName.trim();

  // Check existence (case-insensitive)
  let existingCheck = "SELECT id FROM student_categories WHERE school_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true";
  const params: any[] = [schoolId, name];

  if (tutorId) {
    existingCheck += " AND tutor_id = $3";
    params.push(tutorId);
  } else {
    existingCheck += " AND tutor_id IS NULL";
  }

  const existing = await db.query(existingCheck, params);

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new
  const result = await db.query(
    "INSERT INTO student_categories (school_id, name, color, sort_order, tutor_id) VALUES ($1, $2, '#4F46E5', 0, $3) RETURNING id",
    [schoolId, name, tutorId]
  );
  return result.rows[0].id;
}
