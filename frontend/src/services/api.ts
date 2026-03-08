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
      // Don't redirect if we're on a login page already
      const path = window.location.pathname;
      const isLoginPage = path === "/login" || path === "/admin/login" || path === "/student/login";

      if (isLoginPage) {
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

  verifyEmail: (token: string) => api.post("/auth/verify-email", { token }),
  resendVerification: (username: string) => api.post("/auth/resend-verification", { username }),
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
  toggleStatus: (id: string, is_active: boolean) => api.put(`/tutors/${id}/toggle-status`, { is_active }),
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
  assignTutorsBulk: (studentIds: string[], tutorId: string) =>
    api.post(`/students/bulk-assign-tutor`, { studentIds, tutorId }),
  removeTutor: (studentId: string, tutorId: string) =>
    api.delete(`/students/${studentId}/assign-tutor/${tutorId}`),
  resetPassword: (id: string, data?: { sendEmail: boolean }) => api.put(`/students/${id}/reset-password`, data),
};

// Category API (Student Categories)
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

// Exam Category API
export const examCategoryAPI = {
  getAll: () => api.get("/exam-categories"),
  create: (data: any) => api.post("/exam-categories", data),
  update: (id: string, data: any) => api.put(`/exam-categories/${id}`, data),
  delete: (id: string) => api.delete(`/exam-categories/${id}`),
};

// Exam Type API (Assessment Styles)
export const examTypeAPI = {
  getAll: () => api.get("/exam-types"),
  create: (data: any) => api.post("/exam-types", data),
  update: (id: string, data: any) => api.put(`/exam-types/${id}`, data),
  delete: (id: string) => api.delete(`/exam-types/${id}`),
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

  // Get all schedules for school
  getSchoolSchedules: (params?: any) => api.get("/schedules/school-schedules", { params }),

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

  // Get public leaderboard for a competition
  getLeaderboard: (competitionId: string, categoryId?: string) =>
    api.get(`/results/leaderboard/${competitionId}`, { params: { categoryId } }),
};

// AI API
export const aiAPI = {
  explainResult: (resultId: string) => api.post(`/ai/explain-result/${resultId}`),
  explainQuestion: (data: { questionId: string; studentAnswer: string; correctAnswer: string }) =>
    api.post("/ai/explain-question", data),
};

// Billing & Subscription API is shifted down to line 350 for logical grouping

// Payment API (Old/Legacy - keeping for compatibility)
export const paymentAPI = {
  // Get payment plans (legacy)
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
  getAdvancedReportCard: (studentId: string, timeframe?: string) =>
    api.get(`/analytics/advanced-report-card/${studentId}${timeframe ? `?timeframe=${timeframe}` : ''}`),
  getSuperAdminOverview: () => api.get('/analytics/super-admin/overview'),
  issueReport: (data: { studentId: string; title: string; config: any }) =>
    api.post("/analytics/issue-report", data),
  getIssuedReports: (studentId: string) =>
    api.get(`/analytics/issued-reports/${studentId}`),
  getIssuedReport: (reportId: string) =>
    api.get(`/analytics/issued-report/${reportId}`),
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
  // Get billing status, plans, and limits
  getStatus: () => api.get("/billing/status"),
  getPlans: () => api.get("/billing/plans"),
  validateCoupon: (code: string, planType: string) =>
    api.post("/billing/coupon/validate", { code, planType }),
  getPaygBalance: () => api.get("/billing/payg/balance"),
  getPaygHistory: (params?: any) => api.get("/billing/payg/history", { params }),
  getMarketplace: () => api.get("/billing/marketplace"),
  purchaseMarketplaceItem: (data: { featureKey: string; quantity?: number }) => api.post("/billing/marketplace/purchase", data),
  consumeCredits: (featureKey: string) => api.post("/billing/payg/consume", { featureKey }),

  // Unified Payments (Phase 18)
  getPaymentConfig: () => api.get("/payments/config"),
  initializeCheckout: (data: {
    type: 'upgrade' | 'credits',
    planType?: string,
    creditAmount?: number,
    provider: 'stripe' | 'paystack' | 'crypto',
    billingCycle?: 'monthly' | 'yearly'
  }) => api.post("/payments/checkout/initialize", data),
  submitCryptoProof: (data: {
    amount: number,
    transactionHash: string,
    type: string,
    planType?: string,
    credits?: number,
    billingCycle?: string
  }) => api.post("/payments/crypto/submit", data),
};

// ── External Students API ───────────────────────────────────
export const externalStudentAPI = {
  getAll: () => api.get("/tutor/external-students"),
  create: (data: any) => api.post("/tutor/external-students", data),
  update: (id: string, data: any) => api.put(`/tutor/external-students/${id}`, data),
  delete: (id: string) => api.delete(`/tutor/external-students/${id}`),
  upload: (file: File, categoryId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (categoryId && categoryId !== 'none') {
        formData.append("categoryId", categoryId);
    }
    return api.post("/uploads/external-students", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ── School Settings API ─────────────────────────────────────
export const schoolSettingsAPI = {
  get: () => api.get("/school-settings"),
  update: (data: Record<string, any>) => api.put("/school-settings", data),
};

// ── Super Admin API ─────────────────────────────────────────
export const superAdminAPI = {
  // Schools
  getSchools: () => api.get("/super-admin/schools"),
  getSchoolDetails: (id: string) => api.get(`/super-admin/schools/${id}/details`),

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

  // Marketplace
  getMarketplace: () => api.get("/super-admin/marketplace"),
  updateMarketplace: (featureKey: string, data: Record<string, any>) =>
    api.put(`/super-admin/marketplace/${featureKey}`, data),

  // School overrides
  giftPlan: (schoolId: string, planType: string, days: number, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/gift-plan`, { planType, days, reason }),
  revokePlan: (schoolId: string, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/revoke-plan`, { reason }),
  suspendSchool: (schoolId: string, suspended: boolean, reason?: string) =>
    api.post(`/super-admin/schools/${schoolId}/suspend`, { suspended, reason }),
  addCredits: (schoolId: string, credits: number, reason: string) =>
    api.post(`/super-admin/schools/${schoolId}/add-credits`, { credits, reason }),
  deductCredits: (schoolId: string, credits: number, reason: string) =>
    api.post(`/super-admin/schools/${schoolId}/deduct-credits`, { credits, reason }),
  updateSchoolSubscription: (id: string, data: Record<string, any>) =>
    api.patch(`/super-admin/schools/${id}/subscription`, data),
  updateFeatureOverrides: (id: string, overrides: Record<string, any>) =>
    api.post(`/super-admin/schools/${id}/feature-overrides`, { overrides }),
  extendTrial: (schoolId: string, days: number) =>
    api.post(`/super-admin/schools/${schoolId}/extend-trial`, { days }),
  verifySchoolEmail: (schoolId: string) =>
    api.post(`/super-admin/schools/${schoolId}/verify-email`),
  unverifySchoolEmail: (schoolId: string) =>
    api.post(`/super-admin/schools/${schoolId}/unverify-email`),

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

  // Export
  exportData: (type: 'tutors' | 'students' | 'external_students', schoolId?: string) => {
    const url = `${API_BASE_URL}/super-admin/export/${type}${schoolId ? `?school_id=${schoolId}` : ''}`;
    // We use a temporary link to handle the download with the token if possible,
    // but standard browser downloads work better with direct URLs for CSVs
    // provided the server allows it or we attach the token to the URL (less secure)
    // or we fetch as blob. Blob is safest.
    return api.get(url, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },

  // Settings
  getSettings: (params?: { category?: string }) => api.get("/super-admin/settings", { params }),
  updateSetting: (key: string, value: string) => api.put(`/super-admin/settings/${key}`, { value }),
  updateSettingSecure: (data: { key: string, value: string, password: string }) =>
    api.put("/super-admin/settings/secure", data),

  // Payments & Verification (Phase 18)
  getPendingPayments: () => api.get("/super-admin/payments/pending"),
  verifyPayment: (id: string, data: { status: 'completed' | 'failed', adminNotes?: string }) =>
    api.put(`/super-admin/payments/${id}/verify`, data),
};

// Competition API
export const competitionAPI = {
  getAll: () => api.get("/competitions"),
  getById: (id: string) => api.get(`/competitions/${id}`),
  create: (data: any) => api.post("/competitions", data),
  addCategory: (id: string, data: any) => api.post(`/competitions/${id}/categories`, data),
  addStage: (catId: string, data: any) => api.post(`/competitions/categories/${catId}/stages`, data),
  updateStatus: (id: string, status: string) => api.patch(`/competitions/${id}/status`, { status }),
  getAvailableForSchool: () => api.get("/competitions/available/school"),
  getMyCompetitions: () => api.get("/competitions/student/my-competitions"),
  register: (id: string, data: { categoryId: string, studentIds: string[] }) =>
    api.post(`/competitions/${id}/register`, data),
  getFeatured: () => api.get("/competitions/featured"),
  getRewards: (id: string) => api.get(`/competitions/${id}/rewards`),
  setRewards: (id: string, rewards: any[]) => api.post(`/competitions/${id}/rewards`, { rewards }),
  updatePromotion: (id: string, data: any) => api.patch(`/competitions/${id}/promotion`, data),

  // Get hub statistics for super admin
  getHubStats: () => api.get("/competitions/hub-stats"),
};

// ── Messages & Notifications API ──────────────────────────
export const messagesAPI = {
  getInbox: () => api.get("/messages/inbox"),
  getUnreadCount: () => api.get("/messages/unread-count"),
  getRecipients: () => api.get("/messages/recipients"),
  sendMessage: (data: { receiverId: string; receiverRole: string; content: string }) =>
    api.post("/messages/send", data),
  markAsRead: (id: string) => api.patch(`/messages/read/${id}`),
  broadcast: (data: any) => api.post("/messages/broadcast", data),
  getLatestBroadcast: () => api.get("/messages/latest-broadcast"),
  markBroadcastAsViewed: (id: string) => api.post(`/messages/broadcasts/${id}/view`),
};

export default api;
