import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface CumulativeSubjectReport {
    subject_id: string;
    subject_name: string;
    classwork_score: number; // Weighted average
    midterm_score: number;
    final_exam_score: number;
    total_score: number; // Weighted total
    grade: string;
    status: 'passed' | 'failed' | 'in_progress';
}

class ResultService {
    /**
     * Aggregates all exam results for a student in a specific academic period (Term/Semester).
     * Applies standard weightings for different assessment types.
     */
    async getCumulativeTermReport(studentId: string, periodId: string) {
        // 1. Fetch the period dates
        const periodRes = await db.query(
            "SELECT start_date, end_date FROM academic_periods WHERE id = $1",
            [periodId]
        );
        if (periodRes.rows.length === 0) throw new Error("Academic period not found");
        
        const { start_date, end_date } = periodRes.rows[0];

        // 2. Fetch all student_exams in this date range with their assessment_type
        // We link student_exams -> exams -> course_modules (to get assessment_type)
        const resultsRes = await db.query(
            `SELECT se.*, e.title as exam_title, ec.id as subject_id, ec.name as subject_name,
                    cm.assessment_type, e.passing_score
             FROM student_exams se
             JOIN exams e ON se.exam_id = e.id
             JOIN exam_categories ec ON e.category_id = ec.id
             LEFT JOIN course_modules cm ON e.id = cm.linked_exam_id
             WHERE se.student_id = $1 
             AND se.completed_at BETWEEN $2 AND $3
             AND se.status = 'completed'`,
            [studentId, start_date, end_date]
        );

        const results = resultsRes.rows;
        
        // 3. Group by Subject
        const subjectsMap = new Map<string, any>();

        results.forEach(res => {
            if (!subjectsMap.has(res.subject_id)) {
                subjectsMap.set(res.subject_id, {
                    name: res.subject_name,
                    assessments: {
                        weekly_classwork: [],
                        assignment: [],
                        midterm: [],
                        final_exam: []
                    }
                });
            }
            
            const type = res.assessment_type;
            if (type && subjectsMap.get(res.subject_id).assessments[type]) {
                subjectsMap.get(res.subject_id).assessments[type].push(res.percentage);
            }
        });

        // 4. Calculate Weighted Averages per Subject
        // Hardcoded Default Weights (can be made dynamic later)
        const weights = {
            weekly_classwork: 0.10, // 10%
            assignment: 0.10,       // 10%
            midterm: 0.30,          // 30%
            final_exam: 0.50        // 50%
        };

        const reports: CumulativeSubjectReport[] = [];

        subjectsMap.forEach((data, subjectId) => {
            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            
            const classworkAvg = avg(data.assessments.weekly_classwork);
            const assignmentAvg = avg(data.assessments.assignment);
            const midtermAvg = avg(data.assessments.midterm);
            const finalAvg = avg(data.assessments.final_exam);

            // Total CA (Classwork + Assignments) often lumped together
            const caScore = (classworkAvg * weights.weekly_classwork) + (assignmentAvg * weights.assignment);
            const totalScore = (classworkAvg * weights.weekly_classwork) + 
                               (assignmentAvg * weights.assignment) + 
                               (midtermAvg * weights.midterm) + 
                               (finalAvg * weights.final_exam);

            reports.push({
                subject_id: subjectId,
                subject_name: data.name,
                classwork_score: Math.round(classworkAvg * 10) / 10,
                midterm_score: Math.round(midtermAvg * 10) / 10,
                final_exam_score: Math.round(finalAvg * 10) / 10,
                total_score: Math.round(totalScore * 10) / 10,
                grade: this.calculateGrade(totalScore),
                status: totalScore >= 50 ? 'passed' : 'failed'
            });
        });

        return reports;
    }

    private calculateGrade(score: number): string {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
    }
}

export const resultService = new ResultService();
