import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { FeatureLockedModal, FeatureLockBadge } from '@/components/common/FeatureLock';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  BookOpen,
  CreditCard,
  Settings,
  Trophy,
  MessageSquare,
  Calendar,
  FileText,
  GraduationCap,
  Layers
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { schoolAPI } from '@/services/api';
import { useMessages } from '@/hooks/useMessages';
import { BroadcastAlert } from '@/components/BroadcastAlert';
import { getImageUrl } from '@/lib/imageUtils';

export default function SchoolAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const { unreadCount } = useMessages();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lockModal, setLockModal] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' });
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolLogo, setSchoolLogo] = useState<string>('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await schoolAPI.getProfile();
        if (response.data.success) {
          const data = response.data.data;
          setSchoolName(data.name || '');
          setSchoolLogo(data.logoUrl || data.logo_url || '');
        }
      } catch {
        // Fallback to session data
        setSchoolName(user?.name || 'School Admin');
      }
    };
    loadProfile();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/school-admin/dashboard', icon: LayoutDashboard },
    { name: 'Messages', href: '/school-admin/messages', icon: MessageSquare, badge: unreadCount },
    { name: 'Tutors', href: '/school-admin/tutors', icon: Users },
    { name: 'Student Groups', href: '/school-admin/categories', icon: Layers },
    { name: 'Exam Categories', href: '/school-admin/exam-categories', icon: BookOpen },
    { name: 'Assessment Styles', href: '/school-admin/exam-types', icon: Layers },
    { name: 'Internal Students', href: '/school-admin/students', icon: BookOpen },
    { name: 'Question Bank', href: '/school-admin/questions', icon: BookOpen },
    { name: 'Exam Schedules', href: '/school-admin/schedules', icon: Calendar },
    { name: 'Competition Hub', href: '/school-admin/competitions', icon: Trophy },
    { name: 'Exam Results', href: '/school-admin/results', icon: FileText },
    { name: 'Billing & Plans', href: '/school-admin/billing', icon: CreditCard },
    { name: 'Settings', href: '/school-admin/settings', icon: Settings },
  ] as ({ name: string; href: string; icon: any; badge?: number; feature?: string })[];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => navigate('/school-admin/dashboard')}
            className="flex items-center space-x-2"
          >
            {schoolLogo ? (
              <img src={getImageUrl(schoolLogo) || undefined} alt="School logo" className="h-8 w-8 object-contain" />
            ) : (
              <GraduationCap className="h-8 w-8 text-indigo-600" />
            )}
            <span className="font-bold text-gray-900 truncate">{schoolName || 'School Admin'}</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                if (item.feature && !isFeatureAllowed(item.feature)) {
                  setLockModal({ open: true, feature: item.name });
                  return;
                }
                navigate(item.href);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
                {item.feature && !isFeatureAllowed(item.feature) && <FeatureLockBadge />}
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4 px-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-700 font-semibold">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">School Administrator</p>
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
              <span className="font-bold text-gray-900">School Admin</span>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.feature && !isFeatureAllowed(item.feature)) {
                      setLockModal({ open: true, feature: item.name });
                      return;
                    }
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
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
      <main className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold text-gray-900">School Admin</span>
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-700 font-semibold text-sm">
                {user?.name?.charAt(0) || 'A'}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      <FeatureLockedModal
        isOpen={lockModal.open}
        onClose={() => setLockModal({ ...lockModal, open: false })}
        featureName={lockModal.feature}
      />
      <BroadcastAlert />
    </div>
  );
}
