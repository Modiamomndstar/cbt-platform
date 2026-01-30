import type {
  School,
  Tutor,
  Student,
  Exam,
  Question,
  ExamSchedule,
  StudentExam,
  LearningMaterial,
  UserSession,
  DashboardStats,
} from '@/types';

// Storage Keys
const STORAGE_KEYS = {
  SCHOOLS: 'cbt_schools',
  TUTORS: 'cbt_tutors',
  STUDENTS: 'cbt_students',
  EXAMS: 'cbt_exams',
  QUESTIONS: 'cbt_questions',
  EXAM_SCHEDULES: 'cbt_exam_schedules',
  STUDENT_EXAMS: 'cbt_student_exams',
  LEARNING_MATERIALS: 'cbt_learning_materials',
  SESSION: 'cbt_session',
};

// Helper functions
const getItem = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Hash password (simple hash for MVP)
export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// Generate random password
export const generatePassword = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Session Management
export const setSession = (session: UserSession): void => {
  setItem(STORAGE_KEYS.SESSION, session);
};

export const getSession = (): UserSession | null => {
  return getItem<UserSession | null>(STORAGE_KEYS.SESSION, null);
};

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

// School Operations
export const createSchool = (school: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): School => {
  const schools = getItem<School[]>(STORAGE_KEYS.SCHOOLS, []);
  const newSchool: School = {
    ...school,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  schools.push(newSchool);
  setItem(STORAGE_KEYS.SCHOOLS, schools);
  return newSchool;
};

export const getSchools = (): School[] => {
  return getItem<School[]>(STORAGE_KEYS.SCHOOLS, []);
};

export const getSchoolById = (id: string): School | undefined => {
  const schools = getSchools();
  return schools.find(s => s.id === id);
};

export const getSchoolByUsername = (username: string): School | undefined => {
  const schools = getSchools();
  return schools.find(s => s.username === username);
};

export const updateSchool = (id: string, updates: Partial<School>): School | null => {
  const schools = getSchools();
  const index = schools.findIndex(s => s.id === id);
  if (index === -1) return null;
  schools[index] = { ...schools[index], ...updates, updatedAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.SCHOOLS, schools);
  return schools[index];
};

// Tutor Operations
export const createTutor = (tutor: Omit<Tutor, 'id' | 'createdAt'>): Tutor => {
  const tutors = getItem<Tutor[]>(STORAGE_KEYS.TUTORS, []);
  const newTutor: Tutor = {
    ...tutor,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  tutors.push(newTutor);
  setItem(STORAGE_KEYS.TUTORS, tutors);
  return newTutor;
};

export const createTutorsBulk = (tutors: Omit<Tutor, 'id' | 'createdAt'>[]): Tutor[] => {
  const existingTutors = getItem<Tutor[]>(STORAGE_KEYS.TUTORS, []);
  const newTutors: Tutor[] = tutors.map(tutor => ({
    ...tutor,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));
  existingTutors.push(...newTutors);
  setItem(STORAGE_KEYS.TUTORS, existingTutors);
  return newTutors;
};

export const getTutors = (): Tutor[] => {
  return getItem<Tutor[]>(STORAGE_KEYS.TUTORS, []);
};

export const getTutorsBySchool = (schoolId: string): Tutor[] => {
  const tutors = getTutors();
  return tutors.filter(t => t.schoolId === schoolId);
};

export const getTutorById = (id: string): Tutor | undefined => {
  const tutors = getTutors();
  return tutors.find(t => t.id === id);
};

export const getTutorByUsername = (username: string, schoolId: string): Tutor | undefined => {
  const tutors = getTutors();
  return tutors.find(t => t.username === username && t.schoolId === schoolId);
};

export const updateTutor = (id: string, updates: Partial<Tutor>): Tutor | null => {
  const tutors = getTutors();
  const index = tutors.findIndex(t => t.id === id);
  if (index === -1) return null;
  tutors[index] = { ...tutors[index], ...updates };
  setItem(STORAGE_KEYS.TUTORS, tutors);
  return tutors[index];
};

export const deleteTutor = (id: string): boolean => {
  const tutors = getTutors();
  const filtered = tutors.filter(t => t.id !== id);
  if (filtered.length === tutors.length) return false;
  setItem(STORAGE_KEYS.TUTORS, filtered);
  return true;
};

// Student Operations
export const createStudent = (student: Omit<Student, 'id' | 'createdAt'>): Student => {
  const students = getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
  const newStudent: Student = {
    ...student,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  students.push(newStudent);
  setItem(STORAGE_KEYS.STUDENTS, students);
  return newStudent;
};

export const createStudentsBulk = (students: Omit<Student, 'id' | 'createdAt'>[]): Student[] => {
  const existingStudents = getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
  const newStudents: Student[] = students.map(student => ({
    ...student,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }));
  existingStudents.push(...newStudents);
  setItem(STORAGE_KEYS.STUDENTS, existingStudents);
  return newStudents;
};

export const getStudents = (): Student[] => {
  return getItem<Student[]>(STORAGE_KEYS.STUDENTS, []);
};

export const getStudentsBySchool = (schoolId: string): Student[] => {
  const students = getStudents();
  return students.filter(s => s.schoolId === schoolId);
};

export const getStudentsByTutor = (tutorId: string): Student[] => {
  const students = getStudents();
  return students.filter(s => s.tutorId === tutorId);
};

export const getStudentById = (id: string): Student | undefined => {
  const students = getStudents();
  return students.find(s => s.id === id);
};

export const getStudentByStudentId = (studentId: string, schoolId: string): Student | undefined => {
  const students = getStudents();
  return students.find(s => s.studentId === studentId && s.schoolId === schoolId);
};

export const updateStudent = (id: string, updates: Partial<Student>): Student | null => {
  const students = getStudents();
  const index = students.findIndex(s => s.id === id);
  if (index === -1) return null;
  students[index] = { ...students[index], ...updates };
  setItem(STORAGE_KEYS.STUDENTS, students);
  return students[index];
};

export const deleteStudent = (id: string): boolean => {
  const students = getStudents();
  const filtered = students.filter(s => s.id !== id);
  if (filtered.length === students.length) return false;
  setItem(STORAGE_KEYS.STUDENTS, filtered);
  return true;
};

// Exam Operations
export const createExam = (exam: Omit<Exam, 'id' | 'createdAt'>): Exam => {
  const exams = getItem<Exam[]>(STORAGE_KEYS.EXAMS, []);
  const newExam: Exam = {
    ...exam,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  exams.push(newExam);
  setItem(STORAGE_KEYS.EXAMS, exams);
  return newExam;
};

export const getExams = (): Exam[] => {
  return getItem<Exam[]>(STORAGE_KEYS.EXAMS, []);
};

export const getExamsBySchool = (schoolId: string): Exam[] => {
  const exams = getExams();
  return exams.filter(e => e.schoolId === schoolId);
};

export const getExamsByTutor = (tutorId: string): Exam[] => {
  const exams = getExams();
  return exams.filter(e => e.tutorId === tutorId);
};

export const getExamById = (id: string): Exam | undefined => {
  const exams = getExams();
  return exams.find(e => e.id === id);
};

export const updateExam = (id: string, updates: Partial<Exam>): Exam | null => {
  const exams = getExams();
  const index = exams.findIndex(e => e.id === id);
  if (index === -1) return null;
  exams[index] = { ...exams[index], ...updates };
  setItem(STORAGE_KEYS.EXAMS, exams);
  return exams[index];
};

export const deleteExam = (id: string): boolean => {
  const exams = getExams();
  const filtered = exams.filter(e => e.id !== id);
  if (filtered.length === exams.length) return false;
  setItem(STORAGE_KEYS.EXAMS, filtered);
  // Also delete related questions and schedules
  const questions = getQuestions().filter(q => q.examId !== id);
  setItem(STORAGE_KEYS.QUESTIONS, questions);
  const schedules = getExamSchedules().filter(s => s.examId !== id);
  setItem(STORAGE_KEYS.EXAM_SCHEDULES, schedules);
  return true;
};

// Question Operations
export const createQuestion = (question: Omit<Question, 'id'>): Question => {
  const questions = getItem<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  const newQuestion: Question = {
    ...question,
    id: generateId(),
  };
  questions.push(newQuestion);
  setItem(STORAGE_KEYS.QUESTIONS, questions);
  return newQuestion;
};

export const createQuestionsBulk = (questions: Omit<Question, 'id'>[]): Question[] => {
  const existingQuestions = getItem<Question[]>(STORAGE_KEYS.QUESTIONS, []);
  const newQuestions: Question[] = questions.map(q => ({
    ...q,
    id: generateId(),
  }));
  existingQuestions.push(...newQuestions);
  setItem(STORAGE_KEYS.QUESTIONS, existingQuestions);
  return newQuestions;
};

export const getQuestions = (): Question[] => {
  return getItem<Question[]>(STORAGE_KEYS.QUESTIONS, []);
};

export const getQuestionsByExam = (examId: string): Question[] => {
  const questions = getQuestions();
  return questions.filter(q => q.examId === examId);
};

export const getQuestionById = (id: string): Question | undefined => {
  const questions = getQuestions();
  return questions.find(q => q.id === id);
};

export const updateQuestion = (id: string, updates: Partial<Question>): Question | null => {
  const questions = getQuestions();
  const index = questions.findIndex(q => q.id === id);
  if (index === -1) return null;
  questions[index] = { ...questions[index], ...updates };
  setItem(STORAGE_KEYS.QUESTIONS, questions);
  return questions[index];
};

export const deleteQuestion = (id: string): boolean => {
  const questions = getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  if (filtered.length === questions.length) return false;
  setItem(STORAGE_KEYS.QUESTIONS, filtered);
  return true;
};

// Exam Schedule Operations
export const createExamSchedule = (schedule: Omit<ExamSchedule, 'id'>): ExamSchedule => {
  const schedules = getItem<ExamSchedule[]>(STORAGE_KEYS.EXAM_SCHEDULES, []);
  const newSchedule: ExamSchedule = {
    ...schedule,
    id: generateId(),
  };
  schedules.push(newSchedule);
  setItem(STORAGE_KEYS.EXAM_SCHEDULES, schedules);
  return newSchedule;
};

export const createExamSchedulesBulk = (schedules: Omit<ExamSchedule, 'id'>[]): ExamSchedule[] => {
  const existingSchedules = getItem<ExamSchedule[]>(STORAGE_KEYS.EXAM_SCHEDULES, []);
  const newSchedules: ExamSchedule[] = schedules.map(s => ({
    ...s,
    id: generateId(),
  }));
  existingSchedules.push(...newSchedules);
  setItem(STORAGE_KEYS.EXAM_SCHEDULES, existingSchedules);
  return newSchedules;
};

export const getExamSchedules = (): ExamSchedule[] => {
  return getItem<ExamSchedule[]>(STORAGE_KEYS.EXAM_SCHEDULES, []);
};

export const getExamSchedulesByExam = (examId: string): ExamSchedule[] => {
  const schedules = getExamSchedules();
  return schedules.filter(s => s.examId === examId);
};

export const getExamSchedulesByStudent = (studentId: string): ExamSchedule[] => {
  const schedules = getExamSchedules();
  return schedules.filter(s => s.studentId === studentId);
};

export const getExamScheduleById = (id: string): ExamSchedule | undefined => {
  const schedules = getExamSchedules();
  return schedules.find(s => s.id === id);
};

export const getExamScheduleByCredentials = (username: string, password: string): ExamSchedule | undefined => {
  const schedules = getExamSchedules();
  return schedules.find(s => s.loginUsername === username && s.loginPassword === password);
};

export const updateExamSchedule = (id: string, updates: Partial<ExamSchedule>): ExamSchedule | null => {
  const schedules = getExamSchedules();
  const index = schedules.findIndex(s => s.id === id);
  if (index === -1) return null;
  schedules[index] = { ...schedules[index], ...updates };
  setItem(STORAGE_KEYS.EXAM_SCHEDULES, schedules);
  return schedules[index];
};

export const deleteExamSchedule = (id: string): boolean => {
  const schedules = getExamSchedules();
  const filtered = schedules.filter(s => s.id !== id);
  if (filtered.length === schedules.length) return false;
  setItem(STORAGE_KEYS.EXAM_SCHEDULES, filtered);
  return true;
};

// Student Exam Operations
export const createStudentExam = (studentExam: Omit<StudentExam, 'id'>): StudentExam => {
  const studentExams = getItem<StudentExam[]>(STORAGE_KEYS.STUDENT_EXAMS, []);
  const newStudentExam: StudentExam = {
    ...studentExam,
    id: generateId(),
  };
  studentExams.push(newStudentExam);
  setItem(STORAGE_KEYS.STUDENT_EXAMS, studentExams);
  return newStudentExam;
};

export const getStudentExams = (): StudentExam[] => {
  return getItem<StudentExam[]>(STORAGE_KEYS.STUDENT_EXAMS, []);
};

export const getStudentExamsByStudent = (studentId: string): StudentExam[] => {
  const studentExams = getStudentExams();
  return studentExams.filter(se => se.studentId === studentId);
};

export const getStudentExamsByExam = (examId: string): StudentExam[] => {
  const studentExams = getStudentExams();
  return studentExams.filter(se => se.examId === examId);
};

export const getStudentExamByScheduleId = (scheduleId: string): StudentExam | undefined => {
  const studentExams = getStudentExams();
  return studentExams.find(se => se.examScheduleId === scheduleId);
};

export const updateStudentExam = (id: string, updates: Partial<StudentExam>): StudentExam | null => {
  const studentExams = getStudentExams();
  const index = studentExams.findIndex(se => se.id === id);
  if (index === -1) return null;
  studentExams[index] = { ...studentExams[index], ...updates };
  setItem(STORAGE_KEYS.STUDENT_EXAMS, studentExams);
  return studentExams[index];
};

// Learning Material Operations
export const createLearningMaterial = (material: Omit<LearningMaterial, 'id'>): LearningMaterial => {
  const materials = getItem<LearningMaterial[]>(STORAGE_KEYS.LEARNING_MATERIALS, []);
  const newMaterial: LearningMaterial = {
    ...material,
    id: generateId(),
  };
  materials.push(newMaterial);
  setItem(STORAGE_KEYS.LEARNING_MATERIALS, materials);
  return newMaterial;
};

export const getLearningMaterials = (): LearningMaterial[] => {
  return getItem<LearningMaterial[]>(STORAGE_KEYS.LEARNING_MATERIALS, []);
};

export const getLearningMaterialsByTutor = (tutorId: string): LearningMaterial[] => {
  const materials = getLearningMaterials();
  return materials.filter(m => m.tutorId === tutorId);
};

export const getLearningMaterialsByExam = (examId: string): LearningMaterial[] => {
  const materials = getLearningMaterials();
  return materials.filter(m => m.examId === examId);
};

export const deleteLearningMaterial = (id: string): boolean => {
  const materials = getLearningMaterials();
  const filtered = materials.filter(m => m.id !== id);
  if (filtered.length === materials.length) return false;
  setItem(STORAGE_KEYS.LEARNING_MATERIALS, filtered);
  return true;
};

// Dashboard Stats
export const getTutorDashboardStats = (tutorId: string): DashboardStats => {
  const exams = getExamsByTutor(tutorId);
  const examIds = exams.map(e => e.id);
  const questions = getQuestions().filter(q => examIds.includes(q.examId));
  const schedules = getExamSchedules().filter(s => examIds.includes(s.examId));
  const studentExams = getStudentExams().filter(se => examIds.includes(se.examId));

  const completedExams = studentExams.filter(se => se.status === 'completed');
  const upcomingExams = schedules.filter(s => s.status === 'scheduled').length;
  
  const totalScore = completedExams.reduce((sum, se) => sum + se.percentage, 0);
  const averageScore = completedExams.length > 0 ? Math.round(totalScore / completedExams.length) : 0;

  return {
    totalExams: exams.length,
    totalStudents: schedules.length,
    totalQuestions: questions.length,
    completedExams: completedExams.length,
    upcomingExams,
    averageScore,
  };
};

export const getSchoolDashboardStats = (schoolId: string): DashboardStats => {
  const exams = getExamsBySchool(schoolId);
  const examIds = exams.map(e => e.id);
  const students = getStudentsBySchool(schoolId);
  const questions = getQuestions().filter(q => examIds.includes(q.examId));
  const schedules = getExamSchedules().filter(s => examIds.includes(s.examId));
  const studentExams = getStudentExams().filter(se => examIds.includes(se.examId));

  const completedExams = studentExams.filter(se => se.status === 'completed');
  const upcomingExams = schedules.filter(s => s.status === 'scheduled').length;
  
  const totalScore = completedExams.reduce((sum, se) => sum + se.percentage, 0);
  const averageScore = completedExams.length > 0 ? Math.round(totalScore / completedExams.length) : 0;

  return {
    totalExams: exams.length,
    totalStudents: students.length,
    totalQuestions: questions.length,
    completedExams: completedExams.length,
    upcomingExams,
    averageScore,
  };
};

// Initialize demo data
export const initializeDemoData = (): void => {
  // Check if data already exists
  if (getSchools().length > 0) return;

  // Create demo school
  const school = createSchool({
    name: 'Demo High School',
    username: 'demoschool',
    password: hashPassword('password123'),
    email: 'admin@demoschool.edu',
    phone: '+1234567890',
    address: '123 Education Street, Learning City',
    description: 'A premier institution for academic excellence',
    isActive: true,
  });

  // Create demo tutor
  const tutor = createTutor({
    schoolId: school.id,
    username: 'demotutor',
    password: hashPassword('tutor123'),
    email: 'tutor@demoschool.edu',
    fullName: 'John Smith',
    subjects: ['Mathematics', 'Physics'],
    isActive: true,
  });

  // Create demo exam
  const exam = createExam({
    schoolId: school.id,
    tutorId: tutor.id,
    title: 'Mathematics Mid-Term Exam',
    description: 'Comprehensive test covering algebra and geometry',
    category: 'SS2',
    duration: 60,
    totalQuestions: 5,
    passingScore: 50,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: true,
  });

  // Create demo questions
  const questions = [
    {
      examId: exam.id,
      questionText: 'What is the value of x in the equation 2x + 5 = 15?',
      questionType: 'multiple_choice' as const,
      options: ['5', '10', '7.5', '20'],
      correctAnswer: 0,
      marks: 10,
      difficulty: 'easy' as const,
    },
    {
      examId: exam.id,
      questionText: 'The area of a circle is calculated using the formula πr².',
      questionType: 'true_false' as const,
      options: ['True', 'False'],
      correctAnswer: 0,
      marks: 5,
      difficulty: 'easy' as const,
    },
    {
      examId: exam.id,
      questionText: 'Solve for y: 3y - 9 = 0',
      questionType: 'fill_blank' as const,
      options: [],
      correctAnswer: '3',
      marks: 10,
      difficulty: 'medium' as const,
    },
    {
      examId: exam.id,
      questionText: 'What is the sum of angles in a triangle?',
      questionType: 'multiple_choice' as const,
      options: ['90°', '180°', '270°', '360°'],
      correctAnswer: 1,
      marks: 5,
      difficulty: 'easy' as const,
    },
    {
      examId: exam.id,
      questionText: 'If a = 3 and b = 4, what is the value of a² + b²?',
      questionType: 'multiple_choice' as const,
      options: ['7', '12', '25', '49'],
      correctAnswer: 2,
      marks: 10,
      difficulty: 'medium' as const,
    },
  ];

  createQuestionsBulk(questions);

  console.log('Demo data initialized successfully');
};

// Clear all data (for testing)
export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};
