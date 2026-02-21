import axios from "axios";
import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

// prefer a relative path when the frontend and backend share the same origin (nginx proxy)
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"; // fallback to /api for production container

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Don't redirect if we're on the student login page already
      const path = window.location.pathname;
      if (path.startsWith("/student/login")) {
        // Do nothing – let the login form handle the error
      } else if (path.startsWith("/student")) {
        window.location.href = "/student/login";
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authAPI = {
  // backend expects school username rather than email
  schoolLogin: (username: string, password: string) =>
    api.post("/auth/school/login", { username, password }),

  tutorLogin: (schoolId: string, username: string, password: string) =>
    api.post("/auth/tutor/login", { schoolId, username, password }),

  studentLogin: (username: string, password: string, accessCode?: string) =>
    api.post("/auth/student/login", { username, password, accessCode }),

  studentPortalLogin: (username: string, password: string) =>
    api.post("/auth/student/portal-login", { username, password }),

  superAdminLogin: (username: string, password: string) =>
    api.post("/auth/super-admin/login", { username, password }),

  getMe: () => api.get("/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

// School API
export const schoolAPI = {
  register: (data: any) => api.post("/schools/register", data),
  getProfile: () => api.get("/schools/profile"),
  updateProfile: (data: any) => api.put("/schools/profile", data),
  getDashboard: () => api.get("/schools/dashboard"),
};

// Tutor API
export const tutorAPI = {
  getAll: (params?: any) => api.get("/tutors", { params }),
  getById: (id: string) => api.get(`/tutors/${id}`),
  create: (data: any) => api.post("/tutors", data),
  update: (id: string, data: any) => api.put(`/tutors/${id}`, data),
  delete: (id: string) => api.delete(`/tutors/${id}`),
  bulkCreate: (tutors: any[]) => api.post("/tutors/bulk", { tutors }),
  getDashboardStats: () => api.get("/tutors/dashboard/stats"),
  getStudents: (tutorId: string, params?: any) =>
    api.get(`/tutors/${tutorId}/students`, { params }), // params: { categoryId, search }
  getCategories: (tutorId: string) => api.get(`/tutors/${tutorId}/categories`),
};

// Student API
export const studentAPI = {
  getAll: (params?: any) => api.get("/students", { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post("/students", data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  bulkCreate: (students: any[]) => api.post("/students/bulk", { students }),
  getByCategory: (categoryId: string) =>
    api.get(`/students/by-category?categoryId=${categoryId}`),
  assignTutor: (studentId: string, tutorId: string) =>
    api.post(`/students/${studentId}/assign-tutor`, { tutorId }),
  removeTutor: (studentId: string, tutorId: string) =>
    api.delete(`/students/${studentId}/assign-tutor/${tutorId}`),
};

// Category API
export const categoryAPI = {
  getAll: () => api.get("/categories"),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post("/categories", data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  findOrCreate: (name: string) => api.post("/categories/find-or-create", { name }),
  addStudents: (id: string, studentIds: string[]) =>
    api.post(`/categories/${id}/students`, { studentIds }),
  removeStudents: (id: string, studentIds: string[]) =>
    api.delete(`/categories/${id}/students`, { data: { studentIds } }),
};

// Exam API
export const examAPI = {
  getAll: (params?: any) => api.get("/exams", { params }),
  getById: (id: string) => api.get(`/exams/${id}`),
  create: (data: any) => api.post("/exams", data),
  update: (id: string, data: any) => api.put(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  publish: (id: string) => api.post(`/exams/${id}/publish`),
  unpublish: (id: string) => api.post(`/exams/${id}/unpublish`),
  getByTutor: (tutorId: string) => api.get(`/exams/tutor/${tutorId}`),
  getByCategory: (categoryId: string) =>
    api.get(`/exams/category/${categoryId}`),
};

// Question API
export const questionAPI = {
  getByExam: (examId: string) => api.get(`/questions/exam/${examId}`),
  create: (data: any) => api.post("/questions", data),
  bulkCreate: (examId: string, questions: any[]) =>
    api.post("/questions/bulk", { examId, questions }),
  update: (id: string, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
  aiGenerate: (data: any) => api.post("/questions/ai-generate", data),
  reorder: (examId: string, questionOrders: any[]) =>
    api.post("/questions/reorder", { examId, questionOrders }),
};

// Schedule API - CRITICAL FIX for exam scheduling
export const scheduleAPI = {
  // Get available students for scheduling (FIXED - uses school_id instead of tutor_id)
  getAvailableStudents: (examId: string, categoryId?: string) =>
    api.get("/schedules/available-students", {
      params: { examId, categoryId },
    }),

  // Get scheduled students for an exam
  getByExam: (examId: string) => api.get(`/schedules/exam/${examId}`),

  // Schedule students for exam
  schedule: (data: any) => api.post("/schedules", data),

  // Update schedule
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),

  // Cancel schedule
  cancel: (id: string) => api.delete(`/schedules/${id}`),

  // Get student's scheduled exams
  getMyExams: () => api.get("/schedules/student/my-exams"),

  // Verify access code and start exam
  verifyAccess: (scheduleId: string, accessCode: string, timezone?: string) =>
    api.post("/schedules/verify-access", { scheduleId, accessCode, timezone }),

  // Email credentials to student
  emailCredentials: (scheduleId: string) =>
    api.post(`/schedules/email/${scheduleId}`),

  // Email credentials to all scheduled students
  emailAllCredentials: (examId: string) =>
    api.post(`/schedules/email-all/${examId}`),
};

// Result API
export const resultAPI = {
  // Submit exam answers
  submit: (data: any) => api.post("/results/submit", data),

  // Get student's exam result
  getMyResult: (scheduleId: string) =>
    api.get(`/results/my-result/${scheduleId}`),

  // Get all results for an exam (tutor/school view)
  getByExam: (examId: string, params?: any) =>
    api.get(`/results/exam/${examId}`, { params }),

  // Get student's exam history
  getMyHistory: (params?: any) => api.get("/results/my-history", { params }),

  // Grade theory questions
  gradeTheory: (data: any) => api.post("/results/grade-theory", data),

  // Get all results for school (with filters)
  getAll: (params?: any) => api.get("/results/school-results", { params }),

  // Export results
  exportResults: (params?: any) => api.get("/results/export", { params, responseType: 'blob' }),

  // Get detailed result including questions and answers
  getResultDetail: (id: string) => api.get(`/results/${id}/detail`),

  // Get exam statistics
  getStatistics: (examId: string) =>
    api.get(`/results/exam/${examId}/statistics`),
};

// Payment API
export const paymentAPI = {
  // Get payment plans
  getPlans: () => api.get("/payments/plans"),

  // Create Stripe payment intent
  createStripeIntent: (planId: string) =>
    api.post("/payments/stripe/create-intent", { planId }),

  // Initialize Paystack transaction
  initializePaystack: (planId: string) =>
    api.post("/payments/paystack/initialize", { planId }),

  // Verify Paystack payment
  verifyPaystack: (reference: string) =>
    api.post("/payments/paystack/verify", { reference }),

  // Get payment history
  getHistory: (params?: any) => api.get("/payments/history", { params }),

  // Get subscription status
  getSubscription: () => api.get("/payments/subscription"),
};

// Analytics API
export const analyticsAPI = {
  // School dashboard analytics
  getSchoolDashboard: () => api.get("/analytics/school/dashboard"),

  // Tutor dashboard analytics
  getTutorDashboard: () => api.get("/analytics/tutor/dashboard"),

  // Student dashboard analytics
  getStudentDashboard: () => api.get('/analytics/student/dashboard'),
  getStudentReportCard: (studentId: string) => api.get(`/analytics/student-report-card/${studentId}`),
  getSuperAdminOverview: () => api.get('/analytics/super-admin/overview'),
};

// Upload API
export const uploadAPI = {
  // Upload an image (school logo, etc.)
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Upload students CSV
  uploadStudents: (file: File, categoryId?: string, sendEmail?: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    if (categoryId) formData.append("categoryId", categoryId);
    if (sendEmail) formData.append("sendEmail", sendEmail.toString());
    return api.post("/uploads/students", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Upload tutors CSV
  uploadTutors: (file: File, sendEmail?: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    if (sendEmail) formData.append("sendEmail", sendEmail.toString());
    return api.post("/uploads/tutors", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Upload questions CSV
  uploadQuestions: (file: File, examId: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("examId", examId);
    return api.post("/uploads/questions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Download template CSV
  downloadTemplate: (type: string) =>
    api.get(`/uploads/template/${type}`, { responseType: "blob" }),
};

// ── Billing API ─────────────────────────────────────────────
export const billingAPI = {
  getStatus: () => api.get("/billing/status"),
  getPlans: () => api.get("/billing/plans"),
  validateCoupon: (code: string, planType: string) =>
    api.post("/billing/coupon/validate", { code, planType }),
  getPaygBalance: () => api.get("/billing/payg/balance"),
  getPaygHistory: () => api.get("/billing/payg/history"),
};

// ── School Settings API ─────────────────────────────────────
export const schoolSettingsAPI = {
  get: () => api.get("/school-settings"),
  update: (data: Record<string, any>) => api.put("/school-settings", data),
};

// ── Super Admin API ─────────────────────────────────────────
export const superAdminAPI = {
  // Overview
  getOverview: () => api.get("/super-admin/overview"),

  // Plans
  getPlans: () => api.get("/super-admin/plans"),
  updatePlan: (planType: string, data: Record<string, any>) =>
    api.put(`/super-admin/plans/${planType}`, data),

  // Feature flags
  getFeatureFlags: () => api.get("/super-admin/feature-flags"),
  updateFeatureFlag: (featureKey: string, data: Record<string, any>) =>
    api.put(`/super-admin/feature-flags/${featureKey}`, data),

  // School overrides
  giftPlan: (schoolId: string, planType: string, days: number, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/gift-plan`, { planType, days, reason }),
  revokePlan: (schoolId: string, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/revoke-plan`, { reason }),
  suspendSchool: (schoolId: string, suspended: boolean, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/suspend`, { suspended, reason }),
  addCredits: (schoolId: string, credits: number, reason: string) =>
    api.post(`/super-admin/schools/${schoolId}/add-credits`, { credits, reason }),
  extendTrial: (schoolId: string, days: number) =>
    api.post(`/super-admin/schools/${schoolId}/extend-trial`, { days }),

  // Coupons
  getCoupons: () => api.get("/super-admin/coupons"),
  createCoupon: (data: Record<string, any>) => api.post("/super-admin/coupons", data),
  updateCoupon: (id: string, data: Record<string, any>) =>
    api.patch(`/super-admin/coupons/${id}`, data),

  // Staff
  getStaff: () => api.get("/staff"),
  createStaff: (data: Record<string, any>) => api.post("/staff", data),
  updateStaff: (id: string, data: Record<string, any>) => api.patch(`/staff/${id}`, data),
  getAuditLog: () => api.get("/staff/audit-log"),
};

export default api;
