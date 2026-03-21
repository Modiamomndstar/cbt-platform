import { db } from '../config/database';
import { logger } from '../utils/logger';

export interface AcademicYear {
    id?: string;
    school_id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active?: boolean;
}

export interface AcademicPeriod {
    id?: string;
    academic_year_id: string;
    name: string;
    period_type: 'term' | 'semester' | 'summer_break' | 'mid_term_break';
    order_index: number;
    start_date: string;
    end_date: string;
}

export interface AcademicWeek {
    id?: string;
    academic_period_id: string;
    week_number: number;
    label?: string;
    start_date?: string;
    end_date?: string;
}

class AcademicCalendarService {
    // 1. Academic Year Management
    async createYear(data: AcademicYear) {
        // Deactivate other years if this one is active
        if (data.is_active) {
            await db.query(`UPDATE academic_years SET is_active = false WHERE school_id = $1`, [data.school_id]);
        }

        const result = await db.query(
            `INSERT INTO academic_years (school_id, name, start_date, end_date, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [data.school_id, data.name, data.start_date, data.end_date, data.is_active || false]
        );
        return result.rows[0];
    }

    async getSchoolYears(schoolId: string) {
        const result = await db.query(
            `SELECT * FROM academic_years WHERE school_id = $1 ORDER BY start_date DESC`,
            [schoolId]
        );
        return result.rows;
    }

    async getActiveYear(schoolId: string) {
        const yearResult = await db.query(
            `SELECT * FROM academic_years WHERE school_id = $1 AND is_active = true`,
            [schoolId]
        );
        const year = yearResult.rows[0];
        if (!year) return null;

        const periodsResult = await db.query(
            `SELECT * FROM academic_periods WHERE academic_year_id = $1 ORDER BY order_index ASC`,
            [year.id]
        );
        const periods = periodsResult.rows;

        for (const period of periods) {
            const weeksResult = await db.query(
                `SELECT * FROM academic_weeks WHERE academic_period_id = $1 ORDER BY week_number ASC`,
                [period.id]
            );
            period.weeks = weeksResult.rows;
        }

        return { ...year, periods };
    }

    // 2. Period Management (Terms/Semesters)
    async addPeriod(data: AcademicPeriod) {
        const result = await db.query(
            `INSERT INTO academic_periods (academic_year_id, name, period_type, order_index, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [data.academic_year_id, data.name, data.period_type, data.order_index, data.start_date, data.end_date]
        );
        return result.rows[0];
    }

    async getYearPeriods(yearId: string) {
        const result = await db.query(
            `SELECT * FROM academic_periods WHERE academic_year_id = $1 ORDER BY order_index ASC`,
            [yearId]
        );
        return result.rows;
    }

    // 3. Weekly Management & Generation
    async generateWeeks(periodId: string, startDate: string, weekCount: number) {
        const weeks: any[] = [];
        let currentStart = new Date(startDate);
        
        for (let i = 1; i <= weekCount; i++) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + 6); // End of the week

            const res = await db.query(
                `INSERT INTO academic_weeks (academic_period_id, week_number, label, start_date, end_date)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [periodId, i, `Week ${i}`, currentStart.toISOString(), currentEnd.toISOString()]
            );
            weeks.push(res.rows[0]);

            // Next week starts day after current end
            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1);
        }
        return weeks;
    }

    async getPeriodWeeks(periodId: string) {
        const result = await db.query(
            `SELECT * FROM academic_weeks WHERE academic_period_id = $1 ORDER BY week_number ASC`,
            [periodId]
        );
        return result.rows;
    }

    /**
     * Preset Generator: Nigeria / Kenya / UK (3 Terms)
     */
    async setupStandardThreeTermYear(schoolId: string, yearName: string, yearStart: string, weeksPerTerm: number = 13) {
        const startDate = new Date(yearStart);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);

        const year = await this.createYear({
            school_id: schoolId,
            name: yearName,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true
        });

        const termNames = ['First Term', 'Second Term', 'Third Term'];
        let currentTermStart = new Date(startDate);

        for (let i = 0; i < 3; i++) {
            const termEnd = new Date(currentTermStart);
            termEnd.setDate(termEnd.getDate() + (weeksPerTerm * 7) - 1);

            const period = await this.addPeriod({
                academic_year_id: year.id,
                name: termNames[i],
                period_type: 'term',
                order_index: i + 1,
                start_date: currentTermStart.toISOString().split('T')[0],
                end_date: termEnd.toISOString().split('T')[0]
            });

            await this.generateWeeks(period.id, currentTermStart.toISOString(), weeksPerTerm);

            // Give a 2-week break between terms
            currentTermStart = new Date(termEnd);
            currentTermStart.setDate(currentTermStart.getDate() + 15);
        }
    }
    
    /**
     * Flexible Program Generator: For Tutorial Centers, Short Courses, etc.
     */
    async setupFlexibleProgram(schoolId: string, name: string, startDate: string, periodCount: number = 1, weeksPerPeriod: number = 6) {
        const start = new Date(startDate);
        const end = new Date(start);
        // Approximate end date based on periods and weeks
        end.setDate(end.getDate() + (periodCount * weeksPerPeriod * 7) + (periodCount * 7)); // Add some padding for breaks

        const year = await this.createYear({
            school_id: schoolId,
            name: name,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
            is_active: true
        });

        for (let i = 0; i < periodCount; i++) {
            const pStart = new Date(start);
            pStart.setDate(pStart.getDate() + (i * weeksPerPeriod * 7) + (i * 7)); // 1 week buffer between periods
            
            const pEnd = new Date(pStart);
            pEnd.setDate(pEnd.getDate() + (weeksPerPeriod * 7) - 1);

            const period = await this.addPeriod({
                academic_year_id: year.id,
                name: periodCount === 1 ? 'Academic Program' : `Module ${i + 1}`,
                period_type: 'term',
                order_index: i + 1,
                start_date: pStart.toISOString().split('T')[0],
                end_date: pEnd.toISOString().split('T')[0]
            });

            await this.generateWeeks(period.id, pStart.toISOString(), weeksPerPeriod);
        }
        return year;
    }
}

export const academicCalendarService = new AcademicCalendarService();
