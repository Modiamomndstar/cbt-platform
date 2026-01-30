import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  schoolLogin: (email: string, password: string) =>
    api.post('/auth/school/login', { email, password }),
  
  tutorLogin: (email: string, password: string) =>
    api.post('/auth/tutor/login', { email, password }),
  
  studentLogin: (email: string, password: string, accessCode?: string) =>
    api.post('/auth/student/login', { email, password, accessCode }),
  
  superAdminLogin: (email: string, password: string) =>
    api.post('/auth/super-admin/login', { email, password }),
  
  getMe: () => api.get('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// School API
export const schoolAPI = {
  register: (data: any) => api.post('/schools/register', data),
  getProfile: () => api.get('/schools/profile'),
  updateProfile: (data: any) => api.put('/schools/profile', data),
  getDashboard: () => api.get('/schools/dashboard'),
};

// Tutor API
export const tutorAPI = {
  getAll: (params?: any) => api.get('/tutors', { params }),
  getById: (id: string) => api.get(`/tutors/${id}`),
  create: (data: any) => api.post('/tutors', data),
  update: (id: string, data: any) => api.put(`/tutors/${id}`, data),
  delete: (id: string) => api.delete(`/tutors/${id}`),
  bulkCreate: (tutors: any[]) => api.post('/tutors/bulk', { tutors }),
  getDashboardStats: () => api.get('/tutors/dashboard/stats'),
};

// Student API
export const studentAPI = {
  getAll: (params?: any) => api.get('/students', { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post('/students', data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  bulkCreate: (students: any[]) => api.post('/students/bulk', { students }),
  getByCategory: (categoryId: string) => api.get(`/students/by-category?categoryId=${categoryId}`),
};

// Category API
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  addStudents: (id: string, studentIds: string[]) =>
    api.post(`/categories/${id}/students`, { studentIds }),
  removeStudents: (id: string, studentIds: string[]) =>
    api.delete(`/categories/${id}/students`, { data: { studentIds } }),
};

// Exam API
export const examAPI = {
  getAll: (params?: any) => api.get('/exams', { params }),
  getById: (id: string) => api.get(`/exams/${id}`),
  create: (data: any) => api.post('/exams', data),
  update: (id: string, data: any) => api.put(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  publish: (id: string) => api.post(`/exams/${id}/publish`),
  unpublish: (id: string) => api.post(`/exams/${id}/unpublish`),
  getByTutor: (tutorId: string) => api.get(`/exams/tutor/${tutorId}`),
  getByCategory: (categoryId: string) => api.get(`/exams/category/${categoryId}`),
};

// Question API
export const questionAPI = {
  getByExam: (examId: string) => api.get(`/questions/exam/${examId}`),
  create: (data: any) => api.post('/questions', data),
  bulkCreate: (examId: string, questions: any[]) =>
    api.post('/questions/bulk', { examId, questions }),
  update: (id: string, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
  aiGenerate: (data: any) => api.post('/questions/ai-generate', data),
  reorder: (examId: string, questionOrders: any[]) =>
    api.post('/questions/reorder', { examId, questionOrders }),
};

// Schedule API - CRITICAL FIX for exam scheduling
export const scheduleAPI = {
  // Get available students for scheduling (FIXED - uses school_id instead of tutor_id)
  getAvailableStudents: (examId: string, categoryId?: string) =>
    api.get('/schedules/available-students', { params: { examId, categoryId } }),
  
  // Get scheduled students for an exam
  getByExam: (examId: string) => api.get(`/schedules/exam/${examId}`),
  
  // Schedule students for exam
  schedule: (data: any) => api.post('/schedules', data),
  
  // Update schedule
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  
  // Cancel schedule
  cancel: (id: string) => api.delete(`/schedules/${id}`),
  
  // Get student's scheduled exams
  getMyExams: () => api.get('/schedules/student/my-exams'),
  
  // Verify access code and start exam
  verifyAccess: (scheduleId: string, accessCode: string) =>
    api.post('/schedules/verify-access', { scheduleId, accessCode }),
};

// Result API
export const resultAPI = {
  // Submit exam answers
  submit: (data: any) => api.post('/results/submit', data),
  
  // Get student's exam result
  getMyResult: (scheduleId: string) => api.get(`/results/my-result/${scheduleId}`),
  
  // Get all results for an exam (tutor/school view)
  getByExam: (examId: string, params?: any) => api.get(`/results/exam/${examId}`, { params }),
  
  // Get student's exam history
  getMyHistory: (params?: any) => api.get('/results/my-history', { params }),
  
  // Grade theory questions
  gradeTheory: (data: any) => api.post('/results/grade-theory', data),
  
  // Get exam statistics
  getStatistics: (examId: string) => api.get(`/results/exam/${examId}/statistics`),
};

// Payment API
export const paymentAPI = {
  // Get payment plans
  getPlans: () => api.get('/payments/plans'),
  
  // Create Stripe payment intent
  createStripeIntent: (planId: string) =>
    api.post('/payments/stripe/create-intent', { planId }),
  
  // Initialize Paystack transaction
  initializePaystack: (planId: string) =>
    api.post('/payments/paystack/initialize', { planId }),
  
  // Verify Paystack payment
  verifyPaystack: (reference: string) =>
    api.post('/payments/paystack/verify', { reference }),
  
  // Get payment history
  getHistory: (params?: any) => api.get('/payments/history', { params }),
  
  // Get subscription status
  getSubscription: () => api.get('/payments/subscription'),
};

// Analytics API
export const analyticsAPI = {
  // School dashboard analytics
  getSchoolDashboard: () => api.get('/analytics/school/dashboard'),
  
  // Tutor dashboard analytics
  getTutorDashboard: () => api.get('/analytics/tutor/dashboard'),
  
  // Student dashboard analytics
  getStudentDashboard: () => api.get('/analytics/student/dashboard'),
  
  // Super admin analytics
  getSuperAdminOverview: () => api.get('/analytics/super-admin/overview'),
};

// Upload API
export const uploadAPI = {
  // Upload students CSV
  uploadStudents: (file: File, categoryId?: string, sendEmail?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId) formData.append('categoryId', categoryId);
    if (sendEmail) formData.append('sendEmail', sendEmail.toString());
    return api.post('/uploads/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Upload tutors CSV
  uploadTutors: (file: File, sendEmail?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sendEmail) formData.append('sendEmail', sendEmail.toString());
    return api.post('/uploads/tutors', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Upload questions CSV
  uploadQuestions: (file: File, examId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('examId', examId);
    return api.post('/uploads/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Download template CSV
  downloadTemplate: (type: string) =>
    api.get(`/uploads/template/${type}`, { responseType: 'blob' }),
};

export default api;
