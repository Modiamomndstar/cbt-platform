import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, RequireAuth } from '@/hooks/useAuth';
import { PlanProvider } from '@/hooks/usePlan';
import { initializeDemoData } from '@/lib/dataStore';
import { Toaster } from '@/components/ui/sonner';

// Public Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import AdminLogin from '@/pages/auth/AdminLogin';
import SchoolRegistrationPage from '@/pages/SchoolRegistrationPage';
import PublicLeaderboard from '@/pages/public/PublicLeaderboard';

// School Admin Pages
import SchoolAdminLayout from '@/pages/school-admin/SchoolAdminLayout';
import SchoolAdminDashboard from '@/pages/school-admin/Dashboard';
import SchoolProfile from '@/pages/school-admin/Profile';
import TutorManagement from '@/pages/school-admin/TutorManagement';
import SchoolAnalytics from '@/pages/school-admin/Analytics';
import CategoryManagement from '@/pages/common/CategoryManagement';
import SchoolStudentManagement from '@/pages/school-admin/StudentManagement';
import SchoolCompetitionHub from '@/pages/school-admin/SchoolCompetitionHub';
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
import ExternalStudents from '@/pages/tutor/ExternalStudents';
import TutorAnalytics from '@/pages/tutor/Analytics';

// Student Pages
import StudentLogin from '@/pages/student/StudentLogin';
import StudentLayout from '@/pages/student/StudentLayout';
import StudentDashboard from '@/pages/student/StudentDashboard';
import TakeExam from '@/pages/student/TakeExam';
import StudentResults from '@/pages/student/StudentResults';
import StudentProfile from '@/pages/student/StudentProfile';
import StudentPerformance from '@/pages/student/StudentPerformance';
import StudentCompetitionHub from '@/pages/student/StudentCompetitionHub';

// Common Pages
import StudentReportCard from './pages/common/StudentReportCard';
import AdvancedReportCard from './pages/common/AdvancedReportCard';

// Super Admin Pages
import SuperAdminLayout from '@/pages/super-admin/SuperAdminLayout';
import SuperAdminDashboard from '@/pages/super-admin/Dashboard';
import SchoolsManagement from '@/pages/super-admin/SchoolsManagement';
import PlatformAnalytics from '@/pages/super-admin/PlatformAnalytics';
import MonetizationPage from '@/pages/super-admin/Monetization';
import SchoolOverridesPage from '@/pages/super-admin/SchoolOverrides';
import StaffManagement from '@/pages/super-admin/StaffManagement';
import SchoolDetails from '@/pages/super-admin/SchoolDetails';
import MarketplaceManagement from '@/pages/super-admin/MarketplaceManagement';
import FinancialAnalytics from '@/pages/super-admin/FinancialAnalytics';
import CompetitionManagement from '@/pages/super-admin/CompetitionManagement';

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
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/register-school" element={<SchoolRegistrationPage />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/leaderboard/:competitionId" element={<PublicLeaderboard />} />

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
        <Route path="competitions" element={<SchoolCompetitionHub />} />
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
        <Route path="external-students" element={<ExternalStudents />} />
        <Route path="results" element={<ExamResults />} />
        <Route path="analytics" element={<TutorAnalytics />} />
      </Route>

      {/* Student Routes */}
      <Route
        path="/student/*"
        element={
          <RequireAuth allowedRoles={['student']} disallowExternal>
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="exam/:scheduleId" element={<TakeExam />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="performance" element={<StudentPerformance />} />
        <Route path="competitions" element={<StudentCompetitionHub />} />
        <Route path="report-card" element={<StudentReportCard />} />
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
        <Route path="schools/:id" element={<SchoolDetails />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="monetization" element={<MonetizationPage />} />
        <Route path="school-overrides" element={<SchoolOverridesPage />} />
        <Route path="marketplace" element={<MarketplaceManagement />} />
        <Route path="finance" element={<FinancialAnalytics />} />
        <Route path="competitions" element={<CompetitionManagement />} />
      </Route>

      {/* Common Protected Routes (not nested under a specific layout) */}
      <Route path="/student/take-exam/:scheduleId" element={<RequireAuth allowedRoles={['student']}><TakeExam /></RequireAuth>} />
      <Route path="/report-card/:studentId?" element={<RequireAuth allowedRoles={['student', 'tutor', 'school_admin']}><StudentReportCard /></RequireAuth>} />
      <Route path="/advanced-report/:studentId?/:reportId?" element={<RequireAuth allowedRoles={['student', 'tutor', 'school_admin']}><AdvancedReportCard /></RequireAuth>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" />
        </BrowserRouter>
      </PlanProvider>
    </AuthProvider>
  );
}

export default App;
