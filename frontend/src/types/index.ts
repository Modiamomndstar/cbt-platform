// User Roles
export type UserRole = "super_admin" | "school_admin" | "tutor" | "student";

// School Interface
export interface School {
  id: string;
  name: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tutor Interface
export interface Tutor {
  id: string;
  schoolId: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  fullName: string;
  subjects: string[];
  isActive: boolean;
  createdAt: string;
}

// Student Interface
export interface Student {
  id: string;
  schoolId: string;
  tutorId: string;
  studentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  level: string;
  createdAt: string;
}

// Question Interface
export interface Question {
  id: string;
  examId: string;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "fill_blank";
  options: string[];
  correctAnswer: string | number;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
}

// Exam Interface
export interface Exam {
  id: string;
  schoolId: string;
  tutorId: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultImmediately: boolean;
  createdAt: string;
}

// Exam Schedule Interface
export interface ExamSchedule {
  id: string;
  examId: string;
  studentId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "in_progress" | "completed" | "missed" | "rescheduled";
  loginUsername: string;
  loginPassword: string;
  attemptCount: number;
  maxAttempts: number;
}

// Student Exam Result Interface
export interface StudentExam {
  id: string;
  examScheduleId: string;
  studentId: string;
  examId: string;
  questions: string[];
  answers: Record<string, string>;
  score: number;
  totalMarks: number;
  percentage: number;
  status: "in_progress" | "completed" | "timeout";
  startedAt?: string;
  submittedAt?: string;
  timeSpent: number;
}

// Learning Material Interface
export interface LearningMaterial {
  id: string;
  tutorId: string;
  examId: string;
  title: string;
  content: string;
  fileType: "text" | "pdf" | "doc";
  topics: string[];
}

// Current User Session
export interface UserSession {
  id: string;
  role: UserRole;
  username: string;
  email?: string;
  name: string;
  schoolId?: string;
  tutorId?: string;
  studentId?: string;
}

// CSV Upload Template
export interface CSVTutorTemplate {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  phone?: string;
  subjects: string;
}

export interface CSVStudentTemplate {
  studentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  level: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalExams: number;
  totalStudents: number;
  totalQuestions: number;
  completedExams: number;
  upcomingExams: number;
  averageScore: number;
}
