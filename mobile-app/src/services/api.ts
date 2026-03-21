import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 💡 TESTING TIP:
// 1. For Production: Use 'https://mycbtplatform.cc/api'
// 2. For Local Phone Testing: Use your computer's local IP (e.g., 'http://192.168.1.5:5000/api')
//    Ensure both computer and phone are on the same Wi-Fi.
// const API_BASE_URL = 'http://10.143.80.37:5000/api';
const API_BASE_URL = 'https://mycbtplatform.cc/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // 💡 Security/Firewall Tip:
    'User-Agent': 'CBT-Mobile-v1',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
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
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
    }
    console.error(`API Error [${error.config?.url}]:`, error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/student/portal-login', { username, password }),
  loginExam: (username: string, password: string, accessCode?: string) =>
    api.post('/auth/student/login', { username, password, accessCode }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Messaging & Notifications API
export const messagesAPI = {
  getInbox: () => api.get('/messages/inbox'),
  getUnreadCount: () => api.get('/messages/unread-count'),
  getLatestBroadcast: () => api.get('/messages/latest-broadcast'),
  markBroadcastAsViewed: (id: string) => api.post(`/messages/broadcasts/${id}/view`),
};

// Schedule API
export const scheduleAPI = {
  getMyExams: () => api.get('/schedules/student/my-exams'),
  verifyAccess: (scheduleId: string, accessCode: string) =>
    api.post('/schedules/verify-access', { scheduleId, accessCode }),
};

export const examAPI = {
  getQuestions: (examId: string) => api.get(`/questions/exam/${examId}`),
  getSecurityStatus: (scheduleId: string) => 
    api.get(`/exams/security/session-status/${scheduleId}`),
  recordViolation: (data: { scheduleId: string; violationType: string; metadata?: any }) => 
    api.post("/exams/security/violation", data),
  uploadIdentitySnapshot: (scheduleId: string, imageUri: string) => {
    const formData = new FormData();
    formData.append('scheduleId', scheduleId);
    // @ts-ignore
    formData.append('image', {
      uri: imageUri,
      name: `identity_${scheduleId}.jpg`,
      type: 'image/jpeg',
    });
    return api.post("/exams/security/identity-snapshot", formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Result API
export const resultAPI = {
  submitExam: (data: {
    scheduleId: string;
    answers: Record<string, any>;
    timeSpentMinutes: number;
    violations?: any[];
    flaggedQuestions?: string[];
    autoSubmitted?: boolean;
  }) => api.post('/results/submit', data),
  getMyHistory: (params?: any) => api.get('/results/my-history', { params }),
  getMyResult: (scheduleId: string) => api.get(`/results/my-result/${scheduleId}`),
  getResultDetail: (resultId: string) => api.get(`/results/${resultId}/detail`),
};

// Analytics API
export const analyticsAPI = {
  getStudentDashboard: (params?: any) => api.get('/analytics/student/dashboard', { params }),
  getPerformanceAnalytics: (params?: any) => api.get('/analytics/student/performance', { params }),
  getIssuedReports: (studentId: string) => api.get(`/analytics/reports/issued/${studentId}`),
  getIssuedReportDetail: (reportId: string) => api.get(`/analytics/reports/detail/${reportId}`),
};

// Student Portal Specific API (LMS, AI, Academic Clock)
export const studentPortalAPI = {
  getDashboard: (params?: any) => api.get('/student-portal/dashboard', { params }),
  generateStudyPlan: () => api.get('/student-portal/generate-study-plan'),
};

// Competition API
export const competitionAPI = {
  getCompetitions: () => api.get('/competitions/student/hub'),
  register: (competitionId: string) => api.post(`/competitions/${competitionId}/register`),
};

// AI API
export const aiAPI = {
  explainResult: (resultId: string) => api.post(`/ai/explain-result/${resultId}`),
  explainQuestion: (data: { questionId: string; studentAnswer: string; correctAnswer: string }) =>
    api.post("/ai/explain-question", data),
};

export const courseAPI = {
  getAll: (params?: any) => api.get('/courses', { params }),
  getById: (id: string) => api.get(`/courses/${id}`),
  updateProgress: (courseId: string, contentId: string) => 
    api.post(`/courses/${courseId}/progress/${contentId}`),
  aiAssistant: (data: { lessonContent: string; userMessage: string; history: any[] }) =>
    api.post('/courses/ai-assistant', data),
};

// Academic Calendar API
export const academicCalendarAPI = {
  getYears: () => api.get('/academic-calendar/years'),
};

export default api;
