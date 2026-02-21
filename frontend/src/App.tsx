import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, RequireAuth } from '@/hooks/useAuth';
import { initializeDemoData } from '@/lib/dataStore';
import { Toaster } from '@/components/ui/sonner';

// Public Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SchoolRegistrationPage from '@/pages/SchoolRegistrationPage';

// School Admin Pages
import SchoolAdminLayout from '@/pages/school-admin/SchoolAdminLayout';
import SchoolAdminDashboard from '@/pages/school-admin/Dashboard';
import SchoolProfile from '@/pages/school-admin/Profile';
import TutorManagement from '@/pages/school-admin/TutorManagement';
import SchoolAnalytics from '@/pages/school-admin/Analytics';
import CategoryManagement from '@/pages/common/CategoryManagement';
import SchoolStudentManagement from '@/pages/school-admin/StudentManagement';
import BillingPage from '@/pages/school-admin/Billing';
import SchoolSettingsPage from '@/pages/school-admin/SchoolSettings';

// Tutor Pages
import TutorLayout from '@/pages/tutor/TutorLayout';
import TutorDashboard from '@/pages/tutor/Dashboard';
import ExamManagement from '@/pages/tutor/ExamManagement';
import CreateExam from '@/pages/tutor/CreateExam';
import QuestionBank from '@/pages/tutor/QuestionBank';
import TutorStudentManagement from '@/pages/tutor/StudentManagement';
import ScheduleExam from '@/pages/tutor/ScheduleExam';
import ExamResults from '@/pages/tutor/ExamResults';

// Student Pages
import StudentLogin from '@/pages/student/StudentLogin';
import StudentLayout from '@/pages/student/StudentLayout';
import StudentDashboard from '@/pages/student/StudentDashboard';
import TakeExam from '@/pages/student/TakeExam';
import StudentResults from '@/pages/student/StudentResults';
import StudentProfile from '@/pages/student/StudentProfile';

// Common Pages
import StudentReportCard from './pages/common/StudentReportCard';

// Super Admin Pages
import SuperAdminLayout from '@/pages/super-admin/SuperAdminLayout';
import SuperAdminDashboard from '@/pages/super-admin/Dashboard';
import SchoolsManagement from '@/pages/super-admin/SchoolsManagement';
import PlatformAnalytics from '@/pages/super-admin/PlatformAnalytics';
import MonetizationPage from '@/pages/super-admin/Monetization';
import SchoolOverridesPage from '@/pages/super-admin/SchoolOverrides';

function AppRoutes() {
  const { isLoading } = useAuth();

  useEffect(() => {
    // Initialize demo data on first load
    initializeDemoData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register-school" element={<SchoolRegistrationPage />} />
      <Route path="/student/login" element={<StudentLogin />} />

      {/* School Admin Routes */}
      <Route
        path="/school-admin/*"
        element={
          <RequireAuth allowedRoles={['school_admin']}>
            <SchoolAdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SchoolAdminDashboard />} />
        <Route path="profile" element={<SchoolProfile />} />
        <Route path="tutors" element={<TutorManagement />} />
        <Route path="students" element={<SchoolStudentManagement />} />
        <Route path="analytics" element={<SchoolAnalytics />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SchoolSettingsPage />} />
      </Route>

      {/* Tutor Routes */}
      <Route
        path="/tutor/*"
        element={
          <RequireAuth allowedRoles={['tutor']}>
            <TutorLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TutorDashboard />} />
        <Route path="exams" element={<ExamManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="exams/create" element={<CreateExam />} />
        <Route path="exams/:examId/questions" element={<QuestionBank />} />
        <Route path="exams/:examId/schedule" element={<ScheduleExam />} />
        <Route path="students" element={<TutorStudentManagement />} />
        <Route path="results" element={<ExamResults />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <RequireAuth allowedRoles={['student']}>
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="exam/:scheduleId" element={<TakeExam />} />
        <Route path="results" element={<StudentResults />} />
      </Route>

      {/* Super Admin Routes */}
      <Route
        path="/super-admin/*"
        element={
          <RequireAuth allowedRoles={['super_admin']}>
            <SuperAdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboard />} />
        <Route path="schools" element={<SchoolsManagement />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="monetization" element={<MonetizationPage />} />
        <Route path="school-overrides" element={<SchoolOverridesPage />} />
      </Route>

      {/* Common Protected Routes (not nested under a specific layout) */}
      <Route path="/student/take-exam/:scheduleId" element={<RequireAuth allowedRoles={['student']}><TakeExam /></RequireAuth>} />
      <Route path="/report-card/:studentId" element={<RequireAuth allowedRoles={['student', 'tutor', 'school_admin']}><StudentReportCard /></RequireAuth>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
