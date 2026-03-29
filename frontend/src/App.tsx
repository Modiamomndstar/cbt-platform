import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, RequireAuth } from '@/hooks/useAuth';
import { PlanProvider } from '@/hooks/usePlan';
import { MessagesProvider } from '@/hooks/useMessages';
import { initializeDemoData } from '@/lib/dataStore';
import { Toaster } from '@/components/ui/sonner';
import TrafficTracker from '@/components/TrafficTracker';

// Public Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import AdminLogin from '@/pages/auth/AdminLogin';
import SchoolRegistrationPage from '@/pages/SchoolRegistrationPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import FAQPage from '@/pages/FAQPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import PublicLeaderboard from '@/pages/public/PublicLeaderboard';
import PricingPage from '@/pages/PricingPage';
import PublicLayout from '@/components/layout/PublicLayout';

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
import SchoolQuestions from '@/pages/school-admin/Questions';
import SchoolSchedules from '@/pages/school-admin/Schedules';
import SchoolResults from '@/pages/school-admin/Results';
import CheckoutPage from '@/pages/school-admin/CheckoutPage';
import AcademicCalendar from '@/pages/school-admin/AcademicCalendar';
import LMSCourses from '@/pages/school-admin/LMSCourses';

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
import CourseList from '@/pages/tutor/CourseList';
import CourseCreate from '@/pages/tutor/CourseCreate';
import CourseBuilder from '@/pages/tutor/CourseBuilder';
import CourseProgress from '@/pages/tutor/CourseProgress';

// Student Pages
import StudentLogin from '@/pages/student/StudentLogin';
import StudentLayout from '@/pages/student/StudentLayout';
import StudentDashboard from '@/pages/student/StudentDashboard';
import TakeExam from '@/pages/student/TakeExam';
import StudentResults from '@/pages/student/StudentResults';
import StudentProfile from '@/pages/student/StudentProfile';
import StudentPerformance from '@/pages/student/StudentPerformance';
import StudentCompetitionHub from '@/pages/student/StudentCompetitionHub';
import StudentResultDetail from '@/pages/student/StudentResultDetail';
import CourseLibrary from '@/pages/student/CourseLibrary';
import CoursePlayer from '@/pages/student/CoursePlayer';
import TermReport from '@/pages/student/TermReport';

// Common Pages
import StudentReportCard from './pages/common/StudentReportCard';
import AdvancedReportCard from './pages/common/AdvancedReportCard';
import MessagesPage from './pages/common/Messages';

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
import SuperAdminProfile from '@/pages/super-admin/Profile';
import CommissionsManagement from '@/pages/super-admin/CommissionsManagement';
import SalesDashboard from '@/pages/super-admin/SalesDashboard';

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
      {/* Public Routes with Unified Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register-school" element={<SchoolRegistrationPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/leaderboard/:competitionId" element={<PublicLeaderboard />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Route>

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
        <Route path="categories" element={<CategoryManagement type="student" />} />
        <Route path="exam-categories" element={<CategoryManagement type="exam" />} />
        <Route path="exam-types" element={<CategoryManagement type="type" />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SchoolSettingsPage />} />
        <Route path="messages" element={<MessagesPage />} />

        {/* Exam Management for School Admin */}
        <Route path="questions" element={<SchoolQuestions />} />
        <Route path="questions/:examId/manage" element={<QuestionBank />} />
        <Route path="schedules" element={<SchoolSchedules />} />
        <Route path="schedules-by-exam/:examId" element={<ScheduleExam />} />
        <Route path="results" element={<SchoolResults />} />
        <Route path="calendar" element={<AcademicCalendar />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="courses" element={<LMSCourses />} />
        <Route path="courses/:id/progress" element={<CourseProgress />} />
        <Route path="courses/:id/review" element={<CoursePlayer />} />
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
        <Route path="student-categories" element={<CategoryManagement type="student" />} />
        <Route path="exam-categories" element={<CategoryManagement type="exam" />} />
        <Route path="exam-types" element={<CategoryManagement type="type" />} />
        <Route path="exams/create" element={<CreateExam />} />
        <Route path="exams/:examId/questions" element={<QuestionBank />} />
        <Route path="exams/:examId/schedule" element={<ScheduleExam />} />
        <Route path="students" element={<TutorStudentManagement />} />
        <Route path="external-students" element={<ExternalStudents />} />
        <Route path="results" element={<ExamResults />} />
        <Route path="analytics" element={<TutorAnalytics />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="courses" element={<CourseList />} />
        <Route path="courses/create" element={<CourseCreate />} />
        <Route path="courses/:id/builder" element={<CourseBuilder />} />
        <Route path="courses/:id/progress" element={<CourseProgress />} />
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
        <Route path="dashboard" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentDashboard /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentProfile /></RequireAuth>} />
        <Route path="exam/:scheduleId" element={<TakeExam />} />
        <Route path="results" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentResults /></RequireAuth>} />
        <Route path="results/:resultId" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentResultDetail /></RequireAuth>} />
        <Route path="performance" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentPerformance /></RequireAuth>} />
        <Route path="competitions" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentCompetitionHub /></RequireAuth>} />
        <Route path="messages" element={<RequireAuth allowedRoles={['student']} disallowExternal><MessagesPage /></RequireAuth>} />
        <Route path="report-card" element={<RequireAuth allowedRoles={['student']} disallowExternal><StudentReportCard /></RequireAuth>} />
        <Route path="term-report" element={<RequireAuth allowedRoles={['student']} disallowExternal><TermReport /></RequireAuth>} />
        <Route path="courses" element={<RequireAuth allowedRoles={['student']} disallowExternal><CourseLibrary /></RequireAuth>} />
        <Route path="courses/:id" element={<RequireAuth allowedRoles={['student']} disallowExternal><CoursePlayer /></RequireAuth>} />
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
        <Route path="commissions" element={<CommissionsManagement />} />
        <Route path="sales-dashboard" element={<SalesDashboard />} />
        <Route path="school-overrides" element={<SchoolOverridesPage />} />
        <Route path="marketplace" element={<MarketplaceManagement />} />
        <Route path="finance" element={<FinancialAnalytics />} />
        <Route path="competitions" element={<CompetitionManagement />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<SuperAdminProfile />} />
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
        <MessagesProvider>
          <BrowserRouter>
            <TrafficTracker />
            <AppRoutes />
            <Toaster position="top-right" />
          </BrowserRouter>
        </MessagesProvider>
      </PlanProvider>
    </AuthProvider>
  );
}

export default App;
