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
  FileText,
  MessageSquare
} from 'lucide-react';
import { useState } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { useMessages } from '@/hooks/useMessages';
import { FeatureLockedModal, FeatureLockBadge } from '@/components/common/FeatureLock';
import { BroadcastAlert } from '@/components/BroadcastAlert';

export default function StudentLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const { unreadCount } = useMessages();
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
    { name: 'Messages', href: '/student/messages', icon: MessageSquare, badge: unreadCount },
    { name: 'My Performance', href: '/student/performance', icon: TrendingUp, feature: 'advanced_analytics' },
    { name: 'Competitions', href: '/student/competitions', icon: Award },
    { name: 'Exam Results', href: '/student/results', icon: BookOpen },
    { name: 'Report Card', href: '/student/report-card', icon: FileText, feature: 'advanced_analytics' },
    { name: 'My Profile', href: '/student/profile', icon: User },
  ].filter(item => {
    if (user?.isExternal) {
      return ['Dashboard', 'Exam Results', 'Report Card'].includes(item.name);
    }
    return true;
  }) as ({ name: string; href: string; icon: any; badge?: number; feature?: string })[];

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
          <div className="flex items-center space-x-3">
            {user?.schoolLogo && !user?.isExternal ? (
              <img src={user.schoolLogo} alt="School Logo" className="h-10 w-10 object-contain rounded-md" />
            ) : (
              <GraduationCap className="h-10 w-10 text-emerald-600" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate leading-tight">
                {!user?.isExternal ? user?.schoolName : (user?.isExternal ? 'Exam Access Area' : 'Student Portal')}
              </p>
              {!user?.isExternal && user?.schoolName && (
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
                   Student Portal
                </p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
                {item.feature && !isFeatureAllowed(item.feature) && <FeatureLockBadge />}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-emerald-700 font-bold">
                {studentName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{studentName}</p>
              <p className="text-xs text-gray-500 font-medium">Student</p>
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
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
               <div className="flex items-center space-x-2">
                {user?.schoolLogo && !user?.isExternal ? (
                  <img src={user.schoolLogo} alt="School Logo" className="h-8 w-8 object-contain rounded" />
                ) : (
                  <GraduationCap className="h-8 w-8 text-emerald-600" />
                )}
                <span className="font-bold text-gray-900 truncate max-w-[140px]">
                  {!user?.isExternal ? user?.schoolName : 'Exam Access'}
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-500" />
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
                  <div className="flex items-center space-x-2">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.feature && !isFeatureAllowed(item.feature) && <FeatureLockBadge />}
                  </div>
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
      <main className="flex-1 lg:ml-64 relative">
        {/* Top Header - Desktop Branded & Student Profile */}
        <header className="hidden lg:flex bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 sticky top-0 z-30 justify-between items-center px-8 shadow-sm">
          {!user?.isExternal ? (
            <div className="flex items-center space-x-4">
              {user?.schoolLogo ? (
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
                  <img src={user.schoolLogo} alt="School Logo" className="h-10 w-10 object-contain" />
                </div>
              ) : (
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <GraduationCap className="h-8 w-8 text-emerald-600" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                  {user?.schoolName}
                </h1>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
                  Student Learning Management System
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                <LayoutDashboard className="h-6 w-6 text-gray-400" />
              </div>
              <h1 className="text-lg font-bold text-gray-600 tracking-tight">Exam Access Area</h1>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="text-right flex flex-col justify-center">
              <p className="text-sm font-black text-gray-900 leading-none">{studentName}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase tracking-wider">Active Student</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 transform transition-transform hover:scale-105 cursor-pointer border-2 border-white">
              <span className="text-white font-black text-lg">
                {studentName.charAt(0)}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-gray-100 rounded-lg">
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              {user?.schoolLogo && !user?.isExternal && (
                <img src={user.schoolLogo} alt="School Logo" className="h-8 w-8 object-contain rounded" />
              )}
              <span className="font-bold text-gray-900 truncate max-w-[180px]">
                {!user?.isExternal ? user?.schoolName : 'Exam Access Area'}
              </span>
            </div>
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-700 font-bold text-sm">
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
      <BroadcastAlert />
    </div>
  );
}
