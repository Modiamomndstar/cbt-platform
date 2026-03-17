import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  School,
  BarChart3,
  LogOut,
  Shield,
  Menu,
  X,
  DollarSign,
  Gift,
  Users,
  ShoppingBag,
  History,
  Trophy,
  MessageSquare,
  User
} from 'lucide-react';
import { useState } from 'react';
import { BroadcastAlert } from '@/components/BroadcastAlert';

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useMessages();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavigation = [
    { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
    { name: 'Profile', href: '/super-admin/profile', icon: User },
    { name: 'Messages', href: '/super-admin/messages', icon: MessageSquare, badge: unreadCount },
    { name: 'Schools', href: '/super-admin/schools', icon: School, roles: ['super_admin', 'coordinating_admin', 'finance', 'sales_admin'] },
    { name: 'School Overrides', href: '/super-admin/school-overrides', icon: Gift, roles: ['super_admin', 'coordinating_admin'] },
    { name: 'Staff Management', href: '/super-admin/staff', icon: Users, roles: ['super_admin', 'coordinating_admin'] },
    { name: 'Monetization', href: '/super-admin/monetization', icon: DollarSign, roles: ['super_admin', 'finance'] },
    { name: 'Commissions', href: '/super-admin/commissions', icon: DollarSign, roles: ['super_admin', 'finance', 'coordinating_admin'] },
    { name: 'Marketplace', href: '/super-admin/marketplace', icon: ShoppingBag, roles: ['super_admin'] },
    { name: 'Financial Audit', href: '/super-admin/finance', icon: History, roles: ['super_admin', 'finance'] },
    { name: 'Competition Hub', href: '/super-admin/competitions', icon: Trophy, roles: ['super_admin', 'coordinating_admin'] },
    { name: 'Analytics', href: '/super-admin/analytics', icon: BarChart3, roles: ['super_admin', 'finance', 'coordinating_admin'] },
  ];

  // Filter navigation based on staff role
  const navigation = allNavigation.filter(item => {
    // If no roles specified, it's public for all admins
    if (!item.roles) return true;
    
    // Primary super admin (nil UUID) has no staffRole but full access
    if (user?.id === "00000000-0000-0000-0000-000000000000") return true;

    // Check staff role
    return user?.staffRole && item.roles.includes(user.staffRole);
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white fixed h-full">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-amber-400" />
            <span className="font-bold text-lg">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white group"
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3 mb-4 px-4">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-slate-900 font-semibold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">Super Administrator</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
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
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <span className="font-bold">Super Admin</span>
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
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
              <Button
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
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
        <header className="lg:hidden bg-slate-900 text-white p-4">
          <div className="flex justify-between items-center">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold">Super Admin</span>
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-slate-900 font-semibold text-sm">A</span>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <BroadcastAlert />
    </div>
  );
}
