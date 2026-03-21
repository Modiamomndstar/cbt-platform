import { db } from '../config/database';
import { isFeatureAllowed } from './planService';
import { logger } from '../utils/logger';

export interface Course {
    id?: string;
    school_id: string;
    tutor_id: string;
    title: string;
    description?: string;
    category_id?: string;
    exam_category_id?: string;
    is_published?: boolean;
}

export interface CourseModule {
    id?: string;
    course_id: string;
    title: string;
    description?: string;
    order_index: number;
    parent_module_id?: string;
    linked_exam_id?: string;
    min_pass_score?: number;
    assessment_type?: 'weekly_classwork' | 'assignment' | 'midterm' | 'final_exam';
    exam_type_id?: string;
    exam_type_name?: string;
    exam_type_color?: string;
    academic_week_id?: string;
}

export interface CourseContent {
    id?: string;
    module_id: string;
    title: string;
    content_type: 'text' | 'video' | 'file' | 'exam';
    content_data?: string;
    video_url?: string;
    file_url?: string;
    linked_exam_id?: string;
    order_index: number;
}

class CourseService {
    // 1. Course Management
    async createCourse(data: Course & { academic_year_id?: string }) {
        // Business Rule: Check if school allows tutor LMS access
        const allowed = await isFeatureAllowed(data.school_id, 'lms_tutor_access');
        if (!allowed) {
            throw new Error("LMS feature is not active for this school or has been disabled by the administrator.");
        }

        const result = await db.query(
            `INSERT INTO courses (school_id, tutor_id, title, description, category_id, exam_category_id, academic_year_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [data.school_id, data.tutor_id, data.title, data.description, data.category_id, data.exam_category_id, data.academic_year_id || null]
        );
        return result.rows[0];
    }

    async updateCourse(id: string, data: Partial<Course> & { academic_year_id?: string }) {
        const result = await db.query(
            `UPDATE courses 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description),
                 category_id = $3,
                 exam_category_id = COALESCE($4, exam_category_id),
                 is_published = COALESCE($5, is_published),
                 academic_year_id = COALESCE($6, academic_year_id),
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [data.title, data.description, data.category_id, data.exam_category_id, data.is_published, data.academic_year_id, id]
        );
        return result.rows[0];
    }

    async archiveCourse(id: string, archive: boolean = true) {
        const result = await db.query(
            `UPDATE courses SET is_archived = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [archive, id]
        );
        return result.rows[0];
    }

    async cloneCourse(courseId: string, targetYearId: string | null, tutorId: string, schoolId: string) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Copy course record
            const origRes = await client.query(`SELECT * FROM courses WHERE id = $1`, [courseId]);
            const orig = origRes.rows[0];
            if (!orig) throw new Error('Course not found');

            const newCourseRes = await client.query(
                `INSERT INTO courses (school_id, tutor_id, title, description, category_id, exam_category_id, academic_year_id, is_published)
                 VALUES ($1, $2, $3 || ' (Copy)', $4, $5, $6, $7, false)
                 RETURNING *`,
                [schoolId, tutorId, orig.title, orig.description, orig.category_id, orig.exam_category_id, targetYearId]
            );
            const newCourse = newCourseRes.rows[0];

            // 2. Copy modules (only top-level first)
            const modsRes = await client.query(
                `SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_index ASC`,
                [courseId]
            );

            const moduleIdMap: Record<string, string> = {};

            for (const mod of modsRes.rows) {
                const parentId = mod.parent_module_id ? moduleIdMap[mod.parent_module_id] : null;
                const newModRes = await client.query(
                    `INSERT INTO course_modules (course_id, title, description, order_index, parent_module_id, assessment_type, exam_type_id, min_pass_score)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [newCourse.id, mod.title, mod.description, mod.order_index, parentId, mod.assessment_type, mod.exam_type_id, mod.min_pass_score]
                );
                // note: academic_week_id NOT copied — tutor must re-pin to new year's calendar
                moduleIdMap[mod.id] = newModRes.rows[0].id;
            }

            // 3. Copy contents for each new module
            for (const [origModId, newModId] of Object.entries(moduleIdMap)) {
                const contentsRes = await client.query(
                    `SELECT * FROM course_contents WHERE module_id = $1 ORDER BY order_index ASC`,
                    [origModId]
                );
                for (const c of contentsRes.rows) {
                    await client.query(
                        `INSERT INTO course_contents (module_id, title, content_type, content_data, video_url, file_url, order_index)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [newModId, c.title, c.content_type, c.content_data, c.video_url, c.file_url, c.order_index]
                    );
                }
            }

            await client.query('COMMIT');
            return newCourse;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async getSchoolCourses(schoolId: string, includeArchived: boolean = false, yearId?: string) {
        const result = await db.query(
            `SELECT c.*, t.first_name || ' ' || t.last_name as tutor_name,
                    ec.name as category_name,
                    ay.name as academic_year_name,
                    (SELECT COUNT(*) FROM student_tutors st WHERE st.tutor_id = c.tutor_id) as enrollment_count
             FROM courses c
             JOIN tutors t ON c.tutor_id = t.id
             LEFT JOIN exam_categories ec ON c.exam_category_id = ec.id
             LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
             WHERE c.school_id = $1 AND ($2 OR c.is_archived = false)
             AND ($3::uuid IS NULL OR c.academic_year_id = $3)
             ORDER BY c.created_at DESC`,
            [schoolId, includeArchived, yearId || null]
        );
        return result.rows;
    }

    async getCourseById(id: string) {
        const result = await db.query(
            `SELECT c.*, t.first_name || ' ' || t.last_name as tutor_name,
                    ec.name as category_name
             FROM courses c
             JOIN tutors t ON c.tutor_id = t.id
             LEFT JOIN exam_categories ec ON c.exam_category_id = ec.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    // 2. Module Management
    async addModule(data: Partial<CourseModule>) {
        const result = await db.query(
            `INSERT INTO course_modules (course_id, title, description, order_index, parent_module_id, linked_exam_id, min_pass_score, assessment_type, exam_type_id, academic_week_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [data.course_id, data.title, data.description, data.order_index, data.parent_module_id, data.linked_exam_id, data.min_pass_score || 50, data.assessment_type, data.exam_type_id, data.academic_week_id]
        );
        return result.rows[0];
    }

    async updateModule(id: string, data: Partial<CourseModule>) {
        const result = await db.query(
            `UPDATE course_modules 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description),
                 order_index = COALESCE($3, order_index),
                 parent_module_id = $4,
                 linked_exam_id = $5,
                 min_pass_score = COALESCE($6, min_pass_score),
                 assessment_type = $7,
                 exam_type_id = $8,
                 academic_week_id = $9,
                 updated_at = NOW()
             WHERE id = $10
             RETURNING *`,
            [data.title, data.description, data.order_index, data.parent_module_id, data.linked_exam_id, data.min_pass_score, data.assessment_type, data.exam_type_id, data.academic_week_id, id]
        );
        return result.rows[0];
    }

    async getCourseModules(courseId: string) {
        const result = await db.query(
            `SELECT cm.*, et.name as exam_type_name, et.color as exam_type_color 
             FROM course_modules cm
             LEFT JOIN exam_types et ON cm.exam_type_id = et.id
             WHERE cm.course_id = $1 
             ORDER BY cm.order_index ASC`,
            [courseId]
        );
        return result.rows;
    }

    // 3. Content Management
    async addContent(data: CourseContent) {
        const result = await db.query(
            `INSERT INTO course_contents (module_id, title, content_type, content_data, video_url, file_url, linked_exam_id, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [data.module_id, data.title, data.content_type, data.content_data, data.video_url, data.file_url, data.linked_exam_id, data.order_index]
        );
        return result.rows[0];
    }

    async getModuleContent(moduleId: string) {
        const result = await db.query(
            `SELECT * FROM course_contents WHERE module_id = $1 ORDER BY order_index ASC`,
            [moduleId]
        );
        return result.rows;
    }

    async getCourseFullStructure(courseId: string) {
        const modules = await this.getCourseModules(courseId);
        const structure = await Promise.all(modules.map(async (m) => {
            const contents = await this.getModuleContent(m.id!);
            return {
                ...m,
                contents
            };
        }));
        return structure;
    }

    async getMultipleModulesContent(moduleIds: string[]) {
        if (!moduleIds || moduleIds.length === 0) return "";
        const result = await db.query(
            `SELECT content_data FROM course_contents 
             WHERE module_id = ANY($1) 
             AND content_type = 'text' 
             ORDER BY module_id, order_index ASC`,
            [moduleIds]
        );
        return result.rows.map(r => r.content_data).join("\n\n");
    }

    // 4. Progress Tracking
    async updateProgress(studentId: string, courseId: string, contentId: string) {
        // Fetch current progress
        const res = await db.query(
            `SELECT * FROM student_course_progress WHERE student_id = $1 AND course_id = $2`,
            [studentId, courseId]
        );

        if (res.rows.length === 0) {
            // New entry
            return await db.query(
                `INSERT INTO student_course_progress (student_id, course_id, last_content_id, completed_contents)
                 VALUES ($1, $2, $3, ARRAY[$3]::UUID[])
                 RETURNING *`,
                [studentId, courseId, contentId]
            );
        } else {
            // Update existing
            const progress = res.rows[0];
            const completed = progress.completed_contents || [];
            if (!completed.includes(contentId)) {
                completed.push(contentId);
            }

            // Check if all contents in course are completed
            const totalContentsRes = await db.query(
                `SELECT COUNT(*) FROM course_contents cc
                 JOIN course_modules cm ON cc.module_id = cm.id
                 WHERE cm.course_id = $1`,
                [courseId]
            );
            const totalContents = parseInt(totalContentsRes.rows[0].count);
            const isCompleted = completed.length >= totalContents;

            return await db.query(
                `UPDATE student_course_progress
                 SET last_content_id = $3, completed_contents = $4, is_completed = $5, 
                     completed_at = CASE WHEN $5 = TRUE AND completed_at IS NULL THEN NOW() ELSE completed_at END,
                     updated_at = NOW()
                 WHERE id = $6
                 RETURNING *`,
                [studentId, courseId, contentId, completed, isCompleted, progress.id]
            );
        }
    }

    async getStudentProgress(studentId: string, courseId: string) {
        const result = await db.query(
            `SELECT * FROM student_course_progress WHERE student_id = $1 AND course_id = $2`,
            [studentId, courseId]
        );
        return result.rows[0];
    }

    async getCourseStudentProgress(courseId: string) {
        const result = await db.query(
            `SELECT 
                s.id as student_id,
                s.full_name,
                s.email,
                sc.name as category_name,
                scp.completed_contents,
                scp.updated_at as last_activity,
                (SELECT COUNT(*) FROM course_contents cc
                 JOIN course_modules cm ON cc.module_id = cm.id
                 WHERE cm.course_id = $1) as total_contents
             FROM students s
             JOIN student_tutors st ON s.id = st.student_id
             JOIN courses c ON st.tutor_id = c.tutor_id
             LEFT JOIN student_course_progress scp ON s.id = scp.student_id AND scp.course_id = c.id
             LEFT JOIN student_categories sc ON s.category_id = sc.id
             WHERE c.id = $1
             ORDER BY s.full_name ASC`,
            [courseId]
        );

        return result.rows.map(row => {
            const total = parseInt(row.total_contents) || 0;
            const completed = row.completed_contents?.length || 0;
            return {
                studentId: row.student_id,
                fullName: row.full_name,
                email: row.email,
                categoryName: row.category_name,
                progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                completedCount: completed,
                totalCount: total,
                lastActivity: row.last_activity
            };
        });
    }

    async getStudentDashboardContext(studentId: string, schoolId: string, yearId?: string) {
        // 1. Get Student's Category (Class/Level)
        const studentRes = await db.query(
            "SELECT category_id FROM students WHERE id = $1",
            [studentId]
        );
        const studentCategoryId = studentRes.rows[0]?.category_id;

        // 2. Determine target academic year
        let activeYear: any = null;
        if (yearId) {
            const yearRes = await db.query("SELECT * FROM academic_years WHERE id = $1", [yearId]);
            activeYear = yearRes.rows[0];
        } else {
            const yearRes = await db.query("SELECT * FROM academic_years WHERE school_id = $1 AND is_active = true", [schoolId]);
            activeYear = yearRes.rows[0];
        }

        // 3. Get My Courses (via assigned tutors AND matching category AND active session)
        // If a course has no academic_year_id, it is considered school-wide/persistent
        const coursesRes = await db.query(
            `SELECT c.*, t.first_name || ' ' || t.last_name as tutor_name
             FROM courses c
             JOIN student_tutors st ON c.tutor_id = st.tutor_id
             JOIN tutors t ON c.tutor_id = t.id
             WHERE st.student_id = $1 
             AND c.is_published = true
             AND (c.category_id IS NULL OR c.category_id = $2)
             AND (c.academic_year_id IS NULL OR c.academic_year_id = $3)`,
            [studentId, studentCategoryId, activeYear?.id || null]
        );
        const courses = coursesRes.rows;

        // 4. Get Progress for each course
        const coursesWithProgress = await Promise.all(courses.map(async (c) => {
            const progress = await this.getStudentProgress(studentId, c.id);
            const totalContentsRes = await db.query(
                `SELECT COUNT(*) FROM course_contents cc
                 JOIN course_modules cm ON cc.module_id = cm.id
                 WHERE cm.course_id = $1`,
                [c.id]
            );
            const total = parseInt(totalContentsRes.rows[0].count) || 0;
            const completed = progress?.completed_contents?.length || 0;
            
            return {
                ...c,
                progress_percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                completed_count: completed,
                total_count: total
            };
        }));

        // 5. Identify Focus Modules (Active periods/weeks)
        // We'll need the academic year/week to find modules pinned to current week
        const now = new Date();
        const activeWeekRes = await db.query(
            `SELECT aw.*, ap.name as period_name 
             FROM academic_weeks aw
             JOIN academic_periods ap ON aw.academic_period_id = ap.id
             JOIN academic_years ay ON ap.academic_year_id = ay.id
             WHERE ay.id = $1
             AND $2 BETWEEN aw.start_date AND aw.end_date
             LIMIT 1`,
            [activeYear?.id || null, now]
        );
        const activeWeek = activeWeekRes.rows[0];

        let focusModules: any[] = [];
        if (activeWeek) {
            const focusRes = await db.query(
                `SELECT cm.*, c.title as course_title, t.first_name || ' ' || t.last_name as tutor_name
                 FROM course_modules cm
                 JOIN courses c ON cm.course_id = c.id
                 JOIN student_tutors st ON c.tutor_id = st.tutor_id
                 JOIN tutors t ON c.tutor_id = t.id
                 WHERE st.student_id = $1 AND cm.academic_week_id = $2`,
                [studentId, activeWeek.id]
            );
            focusModules = focusRes.rows;
        }

        return {
            courses: coursesWithProgress,
            activeYear: activeYear ? { id: activeYear.id, name: activeYear.name } : null,
            activeWeek,
            focusModules,
            serverTime: now
        };
    }
}

export const courseService = new CourseService();
