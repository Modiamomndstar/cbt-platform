import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu, X, ArrowRight, Twitter, Linkedin, Facebook } from 'lucide-react';
import { cn } from '@/lib/utils';
import TrafficTracker from '@/components/analytics/TrafficTracker';
import Chatbot from '@/components/common/Chatbot';

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Login', href: '/login' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <TrafficTracker />
      {/* Header */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
          isScrolled 
            ? "bg-white/80 backdrop-blur-md border-gray-100 py-3 shadow-sm" 
            : "bg-transparent border-transparent py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-black">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center space-x-2 group"
            >
              <div className="bg-indigo-600 p-1.5 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">
                CBT Platform
              </span>
            </button>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "text-sm font-bold transition-colors hover:text-indigo-600",
                    location.pathname === item.href ? "text-indigo-600" : "text-gray-600"
                  )}
                >
                  {item.name}
                </button>
              ))}
              <Button 
                onClick={() => navigate('/register-school')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6 h-11 shadow-lg shadow-indigo-200"
              >
                Register School
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-xl bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <nav className="fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold">CBT Platform</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-4 rounded-2xl text-lg font-bold transition-all",
                    location.pathname === item.href 
                      ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {item.name}
                </button>
              ))}
              <div className="pt-6">
                <Button 
                  onClick={() => {
                    navigate('/register-school');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-7 rounded-2xl text-lg shadow-xl shadow-indigo-100"
                >
                  Register School
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      <Chatbot />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-2 mb-6">
                <div className="bg-indigo-500 p-1.5 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">CBT Platform</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Empowering educational institutions with secure, scalable, and intelligent computer-based testing solutions.
              </p>
              <div className="flex space-x-4 mt-8">
                <a href="https://x.com/mycbtplatform" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-xl transition-all shadow-sm">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://linkedin.com/company/cbtplatform" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-xl transition-all shadow-sm">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="https://www.facebook.com/mycbtplatform" target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-xl transition-all shadow-sm">
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Platform</h4>
              <ul className="space-y-4 text-sm">
                <li><button onClick={() => navigate('/')} className="hover:text-indigo-400 transition-colors">Home</button></li>
                <li><button onClick={() => navigate('/pricing')} className="hover:text-indigo-400 transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-indigo-400 transition-colors">Login</button></li>
                <li><button onClick={() => navigate('/register-school')} className="hover:text-indigo-400 transition-colors">Register School</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Use Cases</h4>
              <ul className="space-y-4 text-sm">
                <li><span className="cursor-default">Schools & K-12</span></li>
                <li><span className="cursor-default">Tutors & Coaching</span></li>
                <li><span className="cursor-default">Certifications</span></li>
                <li><span className="cursor-default">Corporate Training</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Connect</h4>
              <ul className="space-y-4 text-sm">
                <li><span className="cursor-default">Contact Support</span></li>
                <li><span className="cursor-default">Documentation</span></li>
                <li><span className="cursor-default">API Reference</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-xs font-medium">
            <p>&copy; {new Date().getFullYear()} CBT Platform. All rights reserved.</p>
            <div className="flex space-x-8">
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms of Service</button>
              <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors">FAQ</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
