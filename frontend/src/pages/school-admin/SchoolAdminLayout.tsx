import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  BarChart3,
  LogOut,
  GraduationCap,
  Menu,
  X,
  BookOpen,
  CreditCard,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { schoolAPI } from '@/services/api';

export default function SchoolAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('');
  const [schoolLogo, setSchoolLogo] = useState<string>('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await schoolAPI.getProfile();
        if (response.data.success) {
          setSchoolName(response.data.data.name || '');
          setSchoolLogo(response.data.data.logo_url || '');
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
    { name: 'School Profile', href: '/school-admin/profile', icon: UserCircle },
    { name: 'Tutor Management', href: '/school-admin/tutors', icon: Users },
    { name: 'Student Management', href: '/school-admin/students', icon: GraduationCap },
    { name: 'Student Categories', href: '/school-admin/categories', icon: BookOpen },
    { name: 'Analytics', href: '/school-admin/analytics', icon: BarChart3 },
    { name: 'Billing & Plan', href: '/school-admin/billing', icon: CreditCard },
    { name: 'Settings', href: '/school-admin/settings', icon: Settings },
  ];

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
              <img src={schoolLogo} alt="School logo" className="h-8 w-8 object-contain" />
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
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
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
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
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
    </div>
  );
}
