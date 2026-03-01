import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Menu,
  X,
  User,
  TrendingUp,
  Award,
  BookOpen,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { FeatureLockedModal, FeatureLockBadge } from '@/components/common/FeatureLock';

export default function StudentLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState('');

  const studentName = user?.name || 'Student';

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Performance', href: '/student/performance', icon: TrendingUp, feature: 'advanced_analytics' },
    { name: 'Competitions', href: '/student/competitions', icon: Award },
    { name: 'Exam Results', href: '/student/results', icon: BookOpen },
    { name: 'Report Card', href: '/student/report-card', icon: FileText, feature: 'advanced_analytics' },
    { name: 'My Profile', href: '/student/profile', icon: User },
  ];

  const handleNavClick = (item: any) => {
    if (item.feature && !isFeatureAllowed(item.feature)) {
      setLockedFeature(item.name);
      setShowLockModal(true);
      return;
    }
    navigate(item.href);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">Student Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              {item.feature && !isFeatureAllowed(item.feature) && <FeatureLockBadge />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4 px-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 font-semibold">
                {studentName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{studentName}</p>
              <p className="text-xs text-gray-500">Student</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-900">Student Portal</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.feature && !isFeatureAllowed(item.feature) && <FeatureLockBadge />}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-gray-900">Student Portal</span>
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 font-semibold text-sm">
                {studentName.charAt(0)}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      <FeatureLockedModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        featureName={lockedFeature}
        description={`${lockedFeature} is available on our Advanced and Enterprise plans. Ask your school administrator to upgrade to unlock this feature for all students.`}
      />
    </div>
  );
}
