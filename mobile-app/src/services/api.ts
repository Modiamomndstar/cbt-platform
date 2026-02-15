import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this with your backend URL
const API_BASE_URL = 'http://10.122.202.12:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string, accessCode?: string) =>
    api.post('/auth/student/portal-login', { username, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Schedule API
export const scheduleAPI = {
  getMyExams: () => api.get('/schedules/student/my-exams'),
  verifyAccess: (scheduleId: string, accessCode: string) =>
    api.post('/schedules/verify-access', { scheduleId, accessCode }),
};

// Exam API
export const examAPI = {
  getQuestions: (examId: string) => api.get(`/questions/exam/${examId}`),
};

// Result API
export const resultAPI = {
  submitExam: (data: any) => api.post('/results/submit', data),
  getMyHistory: () => api.get('/results/my-history'),
  getMyResult: (scheduleId: string) => api.get(`/results/my-result/${scheduleId}`),
};

// Analytics API
export const analyticsAPI = {
  getStudentDashboard: () => api.get('/analytics/student/dashboard'),
};

export default api;
