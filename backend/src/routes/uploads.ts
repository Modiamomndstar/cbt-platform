import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import csv from 'csv-parse';
import { Readable } from 'stream';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import type { UploadedFile } from 'express-fileupload';
import { sendStudentPortalCredentialsEmail } from '../services/email';
import { ApiResponseHandler } from '../utils/apiResponse';
import { canAddExternalStudent } from '../services/planService';
import { paygService } from '../services/paygService';

const router = Router();

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const LOGO_DIR = path.join(UPLOAD_DIR, 'logos');
[UPLOAD_DIR, LOGO_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// POST /api/uploads/image — Upload a school logo or any image
router.post(
  '/image',
  authenticate,
  requireRole(['school', 'tutor', 'super_admin']),
  async (req: Request, res: Response) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return ApiResponseHandler.badRequest(res, 'No file uploaded');
      }

      const file = req.files.image as UploadedFile;

      // Server-side MIME type validation
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return ApiResponseHandler.badRequest(res, 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      }

      if (file.size > MAX_IMAGE_SIZE) {
        return ApiResponseHandler.badRequest(res, 'File too large. Maximum size is 5MB.');
      }

      // Generate unique filename to prevent collisions/overwrites
      const ext = path.extname(file.name).toLowerCase() || '.jpg';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      const uploadPath = path.join(LOGO_DIR, uniqueName);

      await file.mv(uploadPath);

      const publicUrl = `/uploads/logos/${uniqueName}`;

      ApiResponseHandler.success(res, { url: publicUrl }, 'Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      ApiResponseHandler.serverError(res, 'Failed to upload image');
    }
  },
);


// Parse CSV buffer
const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', (err) => {
      reject(err);
    });

    parser.on('end', () => {
      resolve(records);
    });

    const stream = Readable.from(buffer.toString());
    stream.pipe(parser);
  });
};

// Generate random password
const generatePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Helper to generate unique username
const generateUniqueUsername = async (client: any, fullName: string, schoolId: string, existingInBatch: Set<string> = new Set()) => {
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

    const result = await client.query(
      `SELECT 1 FROM (
        SELECT username FROM students WHERE username = $1
        UNION
        SELECT username FROM external_students WHERE username = $1
      ) as combined_usernames`,
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

// Helper: Find or Create Category
const findOrCreateCategory = async (client: any, schoolId: string, categoryName: string) => {
  if (!categoryName || !categoryName.trim()) return null;
  const name = categoryName.trim();

  // Check existence (case-insensitive)
  const existing = await client.query(
    "SELECT id FROM student_categories WHERE school_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true",
    [schoolId, name]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new
  const result = await client.query(
    "INSERT INTO student_categories (school_id, name, color, sort_order) VALUES ($1, $2, '#4F46E5', 0) RETURNING id",
    [schoolId, name]
  );
  return result.rows[0].id;
};

// Upload students CSV
router.post('/students', authenticate, requireRole(['school', 'tutor']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!req.files || !req.files.file) {
      return ApiResponseHandler.badRequest(res, 'No file uploaded');
    }

    const file = req.files.file as any;
    const { categoryId, sendEmail } = req.body;
    const user = req.user!;

    // Determine the effective school ID
    let schoolId = user.schoolId;
    if (user.role === 'tutor' && user.tutorId) {
       const tutorRes = await client.query("SELECT school_id FROM tutors WHERE id = $1", [user.tutorId]);
       if (tutorRes.rows.length > 0) schoolId = tutorRes.rows[0].school_id;
    }

    // Validate file type
    // Note: Some browsers/systems might send different mimetypes for CSV (e.g. application/vnd.ms-excel), so relying on extension is safer along with basic mimetype check
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return ApiResponseHandler.badRequest(res, 'Only CSV files are allowed');
    }

    // Parse CSV
    const records = await parseCSV(file.data);

    const results = {
      success: [] as any[],
      failed: [] as any[],
      totalProcessed: 0
    };

    const batchUsernames = new Set<string>();

    await client.query('BEGIN');

    for (const record of records) {
      try {
        results.totalProcessed++;

        // Map fields from new template or fallback to old
        // Template: student_id, full_name, email, phone, level_class
        const studentIdRaw = record.student_id || record.studentId || record.registrationNumber;
        const fullNameRaw = record.full_name || record.fullName;
        const email = record.email;
        const phone = record.phone;
        const levelClass = record.level_class || record.studentLevel || record['Student Level/Class'] || record.categoryId; // Handle various headers

        // Validate required fields
        if (!fullNameRaw || !email) {
            results.failed.push({
                record,
                reason: 'Missing required fields (full_name, email)'
            });
            continue;
        }

        // Check if student_id is already taken in this school
        if (studentIdRaw) {
            const idCheck = await client.query(
                'SELECT id FROM students WHERE student_id = $1 AND school_id = $2',
                [studentIdRaw, schoolId]
            );
            if (idCheck.rows.length > 0) {
                results.failed.push({
                    record,
                    reason: `Registration number ${studentIdRaw} already exists in this school`
                });
                continue;
            }
        }

        // Check email uniqueness
        const emailCheck = await client.query(
          'SELECT id FROM students WHERE email = $1 AND school_id = $2',
          [email, schoolId]
        );

        if (emailCheck.rows.length > 0) {
          results.failed.push({ record, reason: `Email ${email} already exists` });
          continue;
        }

        // Parse Name
        const nameParts = fullNameRaw.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '.'; // Default to . if no last name

        // Handle Category (Level/Class)
        let finalCategoryId = categoryId || null;
        if (!finalCategoryId && levelClass) {
            finalCategoryId = await findOrCreateCategory(client, schoolId as string, levelClass);
        }

        // Generate password
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Student ID / Registration Number
        const registrationNumber = studentIdRaw || `STU${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Generate Username
        const username = await generateUniqueUsername(client, fullNameRaw, schoolId as string, batchUsernames);
        batchUsernames.add(username);

        // Insert student
        const result = await client.query(
          `INSERT INTO students (school_id, category_id, first_name, last_name, full_name, email,
           phone, student_id, username, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
           RETURNING *`,
          [
            schoolId,
            finalCategoryId,
            firstName,
            lastName,
            fullNameRaw,
            email,
            phone || null,
            registrationNumber,
            username,
            hashedPassword
          ]
        );

        results.success.push({
          ...result.rows[0],
          generatedPassword: password
        });

        if (sendEmail === 'true' && email) {
          const schoolRes = await client.query("SELECT name FROM schools WHERE id = $1", [schoolId]);
          const schoolName = schoolRes.rows[0]?.name || "CBT Platform";
          sendStudentPortalCredentialsEmail(schoolId as string, email, fullNameRaw, schoolName, {
              username,
              password
          }).catch(err => console.error("Failed to send bulk upload welcome email:", err));
        }

        // If Creator is Tutor, assign to them
        if (user.role === "tutor" && user.tutorId) {
            await client.query(
                `INSERT INTO student_tutors (student_id, tutor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [result.rows[0].id, user.tutorId]
            );
        }

      } catch (err: any) {
        results.failed.push({
          record,
          reason: err.message
        });
      }
    }

    await client.query('COMMIT');

    ApiResponseHandler.success(res, results, `Processed ${results.totalProcessed} records. ${results.success.length} successful, ${results.failed.length} failed.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload students error:', error);
    ApiResponseHandler.serverError(res, 'Failed to process CSV file');
  } finally {
    client.release();
  }
});

// Upload tutors CSV
router.post('/tutors', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!req.files || !req.files.file) {
      return ApiResponseHandler.badRequest(res, 'No file uploaded');
    }

    const file = req.files.file as any;
    const { sendEmail } = req.body;
    const user = req.user!;

    // Validate file type
    if (!file.mimetype.includes('csv') && !file.name.endsWith('.csv')) {
      return ApiResponseHandler.badRequest(res, 'Only CSV files are allowed');
    }

    // Parse CSV
    const records = await parseCSV(file.data);

    const results = {
      success: [] as any[],
      failed: [] as any[],
      totalProcessed: 0
    };

    await client.query('BEGIN');

    for (const record of records) {
      try {
        results.totalProcessed++;

        // Validate required fields
        if (!record.firstName || !record.lastName || !record.email) {
          results.failed.push({
            record,
            reason: 'Missing required fields (firstName, lastName, email)'
          });
          continue;
        }

        // Check if email already exists
        const emailCheck = await client.query(
          'SELECT id FROM tutors WHERE email = $1 AND school_id = $2',
          [record.email, user.schoolId]
        );

        if (emailCheck.rows.length > 0) {
          results.failed.push({
            record,
            reason: 'Email already exists'
          });
          continue;
        }

        // Generate password
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert tutor
        const result = await client.query(
          `INSERT INTO tutors (school_id, first_name, last_name, email,
           phone, specialization, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            user.schoolId,
            record.firstName,
            record.lastName,
            record.email,
            record.phone || null,
            record.specialization || null,
            hashedPassword
          ]
        );

        results.success.push({
          ...result.rows[0],
          generatedPassword: password
        });

        // TODO: Send email with credentials if sendEmail is true
        if (sendEmail === 'true') {
          // Email sending logic would go here
        }

      } catch (err: any) {
        results.failed.push({
          record,
          reason: err.message
        });
      }
    }

    await client.query('COMMIT');

    ApiResponseHandler.success(res, results, `Processed ${results.totalProcessed} records. ${results.success.length} successful, ${results.failed.length} failed.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload tutors error:', error);
    ApiResponseHandler.serverError(res, 'Failed to process CSV file');
  } finally {
    client.release();
  }
});

// Upload questions CSV
router.post('/questions', authenticate, requireRole(['school', 'tutor']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!req.files || !req.files.file) {
      return ApiResponseHandler.badRequest(res, 'No file uploaded');
    }

    const file = req.files.file as any;
    const { examId } = req.body;
    const user = req.user!;

    // Validate file type
    if (!file.mimetype.includes('csv') && !file.name.endsWith('.csv')) {
      return ApiResponseHandler.badRequest(res, 'Only CSV files are allowed');
    }

    // Verify exam belongs to user's school
    const examCheck = await client.query(
      `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
      [examId, user.schoolId]
    );

    if (examCheck.rows.length === 0) {
      return ApiResponseHandler.notFound(res, 'Exam not found');
    }

    // Parse CSV
    const records = await parseCSV(file.data);

    const results = {
      success: [] as any[],
      failed: [] as any[],
      totalProcessed: 0
    };

    await client.query('BEGIN');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        results.totalProcessed++;

        // Validate required fields
        if (!record.questionText || !record.questionType) {
          results.failed.push({
            record,
            reason: 'Missing required fields (questionText, questionType)'
          });
          continue;
        }

        // Parse options based on question type
        let options: string[] = [];
        if (record.questionType === 'multiple_choice' && record.options) {
          options = record.options.split('|').map((o: string) => o.trim());
        } else if (record.questionType === 'true_false') {
          options = ['True', 'False'];
        }

        const result = await client.query(
          `INSERT INTO questions (exam_id, question_text, question_type, options,
           correct_answer, marks, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            examId,
            record.questionText,
            record.questionType,
            JSON.stringify(options),
            record.correctAnswer || '',
            parseInt(record.marks) || 5,
            parseInt(record.questionOrder) || i + 1
          ]
        );

        results.success.push(result.rows[0]);

      } catch (err: any) {
        results.failed.push({
          record,
          reason: err.message
        });
      }
    }

    // Update exam total marks
    await client.query(
      `UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = $1
      ) WHERE id = $1`,
      [examId]
    );

    await client.query('COMMIT');

    ApiResponseHandler.success(res, results, `Processed ${results.totalProcessed} questions. ${results.success.length} successful, ${results.failed.length} failed.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload questions error:', error);
    ApiResponseHandler.serverError(res, 'Failed to process CSV file');
  } finally {
    client.release();
  }
});

// Upload external students CSV
router.post('/external-students', authenticate, requireRole(['tutor', 'school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!req.files || !req.files.file) {
      return ApiResponseHandler.badRequest(res, 'No file uploaded');
    }

    const file = req.files.file as any;
    const { categoryId, sendEmail } = req.body;
    const user = req.user!;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return ApiResponseHandler.badRequest(res, 'Only CSV files are allowed');
    }

    const records = await parseCSV(file.data);
    const totalToProcess = records.length;

    // ── Pre-check limits ──
    const schoolId = user.schoolId;
    const tutorId = user.tutorId || user.id;
    const canAdd = await canAddExternalStudent(schoolId, tutorId);
    if (!canAdd.allowed) {
      return ApiResponseHandler.badRequest(res, canAdd.reason || 'Limit reached');
    }

    // ── Handle PAYG Emails (Batching) ──
    let allowedToEmail = false;
    if (sendEmail === 'true') {
      const result = await paygService.consumeCredits(schoolId, 'bulk_email_batch', totalToProcess);
      allowedToEmail = result.success;
    }

    const results = {
      success: [] as any[],
      failed: [] as any[],
      totalProcessed: 0
    };

    const batchUsernames = new Set<string>();

    await client.query('BEGIN');

    for (const record of records) {
      try {
        results.totalProcessed++;

        const fullNameRaw = record.full_name || record.fullName;
        const email = record.email;
        const phone = record.phone;
        const levelClass = record.level_class || record.level;

        if (!fullNameRaw) {
            results.failed.push({
                record,
                reason: 'Missing required field: full_name'
            });
            continue;
        }

        // Map school and tutor strictly safely
        // schoolId and tutorId already defined above

        // Check for duplicate email in external_students
        if (email) {
            const emailCheck = await client.query(
                'SELECT id FROM external_students WHERE email = $1 AND school_id = $2',
                [email, schoolId]
            );
            if (emailCheck.rows.length > 0) {
                results.failed.push({
                    record,
                    reason: `External student with email ${email} already exists`
                });
                continue;
            }
        }

        // Handle Category (Level/Class)
        let finalCategoryId = categoryId || null;
        if ((!finalCategoryId || finalCategoryId === 'none') && levelClass) {
            finalCategoryId = await findOrCreateCategory(client, schoolId as string, levelClass);
        }

        // Generate dummy login credentials since they take exams natively with access codes
        const username = await generateUniqueUsername(client, fullNameRaw, schoolId as string, batchUsernames);
        batchUsernames.add(username);
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Parse name parts
        const nameParts = fullNameRaw.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '.';

        const result = await client.query(
          `INSERT INTO external_students (tutor_id, school_id, category_id, level_class, first_name, last_name, full_name, email, phone, username, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
           RETURNING *`,
          [
            tutorId,
            schoolId,
            finalCategoryId,
            levelClass || null,
            firstName,
            lastName,
            fullNameRaw,
            email || null,
            phone || null,
            username,
            hashedPassword
          ]
        );

        const student = result.rows[0];

        // Send email if allowed
        if (allowedToEmail && email) {
          const schoolRes = await client.query("SELECT name FROM schools WHERE id = $1", [schoolId]);
          const schoolName = schoolRes.rows[0]?.name || "CBT Platform";
          sendStudentPortalCredentialsEmail(schoolId, email, fullNameRaw, schoolName, {
              username: student.username,
              password
          }).catch(err => console.error("Failed to send bulk external student email:", err));
        }

        results.success.push({
          ...student,
          generatedPassword: password
        });

      } catch (err: any) {
        results.failed.push({
          record,
          reason: err.message
        });
      }
    }

    await client.query('COMMIT');

    ApiResponseHandler.success(res, results, `Processed ${results.totalProcessed} records. ${results.success.length} successful, ${results.failed.length} failed.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload external students error:', error);
    ApiResponseHandler.serverError(res, 'Failed to process CSV file');
  } finally {
    client.release();
  }
});

// Download template CSV files
router.get('/template/:type', async (req: Request, res: Response) => {
  const { type } = req.params;

  let csvContent = '';
  let filename = '';

  switch (type) {
    case 'students':
      filename = 'internal_students_template.csv';
      csvContent = 'student_id,full_name,email,phone,level_class\n' +
                   'STU001,Alice Johnson,alice@student.edu,1111111111,JSS 1\n' +
                   'STU002,Bob Williams,bob@student.edu,2222222222,SSS 3';
      break;
    case 'external-students':
      filename = 'external_students_template.csv';
      csvContent = 'full_name,email,phone,level_class\n' +
                   'Charlie Brown,charlie@external.com,3333333333,External Batch A\n' +
                   'Dana Smith,dana@external.com,4444444444,Private Coaching';
      break;
    case 'tutors':
      filename = 'tutors_template.csv';
      csvContent = 'firstName,lastName,email,phone,specialization\n' +
                   'John,Doe,john.doe@example.com,+1234567890,Mathematics\n' +
                   'Jane,Smith,jane.smith@example.com,+1234567891,Physics';
      break;
    case 'questions':
      filename = 'questions_template.csv';
      csvContent = 'questionText,questionType,options,correctAnswer,marks,questionOrder\n' +
                   '"What is 2+2?",multiple_choice,"2|3|4|5",4,5,1\n' +
                   '"The sky is blue",true_false,"True|False",True,2,2\n' +
                   '"Explain photosynthesis",theory,"","",10,3';
      break;
    default:
      return ApiResponseHandler.badRequest(res, 'Invalid template type');
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

export default router;
