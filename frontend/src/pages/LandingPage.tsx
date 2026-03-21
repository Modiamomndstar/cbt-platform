import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Users,
  Calendar,
  FileText,
  Shield,
  Clock,
  CheckCircle,
  ArrowRight,
  School,
  BookOpen,
  BarChart3,
  Smartphone,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <School className="h-8 w-8 text-indigo-600" />,
      title: 'School Management',
      description: 'Register your school and manage tutors, students, and exams from a centralized dashboard.',
    },
    {
      icon: <Users className="h-8 w-8 text-emerald-600" />,
      title: 'Bulk Registration',
      description: 'Upload tutors and students in bulk using CSV or Excel files for quick setup.',
    },
    {
      icon: <FileText className="h-8 w-8 text-amber-600" />,
      title: 'Question Bank',
      description: 'Upload questions manually, via CSV, or generate them automatically from learning materials.',
    },
    {
      icon: <Calendar className="h-8 w-8 text-rose-600" />,
      title: 'Exam Scheduling',
      description: 'Schedule exams for specific dates and times. Students can only access exams at scheduled times.',
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600" />,
      title: 'Secure Testing',
      description: 'Randomized questions and options ensure each student gets a unique exam experience.',
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-cyan-600" />,
      title: 'Analytics & Reports',
      description: 'Track student performance, exam completion rates, and generate detailed reports.',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Register Your School',
      description: 'Create a school account with your details and logo.',
    },
    {
      step: 2,
      title: 'Add Tutors',
      description: 'Upload tutors individually or in bulk via CSV/Excel.',
    },
    {
      step: 3,
      title: 'Create Exams',
      description: 'Tutors create exams, upload questions, and set parameters.',
    },
    {
      step: 4,
      title: 'Register Students',
      description: 'Add students and schedule their exam times.',
    },
    {
      step: 5,
      title: 'Students Take Exams',
      description: 'Students login at scheduled times and take randomized exams.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,#4f46e5_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,#7c3aed_0%,transparent_50%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-8 border border-white/20 animate-fade-in">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Mobile Ready & AI Powered</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
                Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">CBT Platform</span> for Excellence.
              </h1>
              <p className="text-lg sm:text-xl text-indigo-100/90 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Streamline your school's examination process with our premium computer-based testing solution. 
                Built for security, speed, and real-time analytics.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate('/register-school')}
                  className="bg-white text-indigo-900 hover:bg-gray-100 font-black text-lg py-7 px-8 rounded-2xl shadow-2xl shadow-indigo-500/20 group"
                >
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="border-white/30 text-white hover:bg-white/10 font-bold text-lg py-7 px-8 rounded-2xl backdrop-blur-sm"
                >
                  Dashboard Login
                </Button>
              </div>
            </div>

            <div className="hidden lg:flex justify-end perspective-1000">
              <div className="bg-white/10 backdrop-blur-xl rounded-[40px] p-10 border border-white/20 shadow-[0_0_100px_rgba(79,70,229,0.3)] animate-float">
                <div className="grid grid-cols-2 gap-6">
                  <HeroFeatureCard icon={Clock} label="Timed Exams" color="text-emerald-400" />
                  <HeroFeatureCard icon={CheckCircle} label="Auto-Grading" color="text-amber-400" />
                  <HeroFeatureCard icon={BookOpen} label="Question Bank" color="text-rose-400" />
                  <HeroFeatureCard icon={BarChart3} label="AI Analytics" color="text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-6 tracking-tight">
              Powerful Tools, <span className="text-indigo-600">Perfectly Balanced.</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
              Everything you need to create, manage, and conduct computer-based tests with military-grade security and unmatched efficiency.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <div key={index} className="group p-8 rounded-[32px] bg-white border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 lg:py-32 bg-indigo-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 tracking-tight">How It Works</h2>
            <p className="text-lg text-gray-500 font-medium">
              Get your institution running in minutes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 relative">
             <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-indigo-200/50 z-0" />
            {howItWorks.map((item, index) => (
              <div key={index} className="relative z-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl border-4 border-indigo-50 mb-6">
                  {item.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-3 tracking-tight">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <section className="py-24 lg:py-32 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
               {/* Premium Mobile Mockup */}
               <div className="relative group">
                  <div className="absolute -inset-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity" />
                  <div className="relative w-72 h-[580px] bg-black rounded-[50px] border-[12px] border-gray-900 shadow-[0_50px_100px_rgba(0,0,0,0.2)] overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-20 flex items-center justify-center">
                       <div className="w-12 h-1 bg-gray-700 rounded-full" />
                    </div>
                    <div className="p-8 pt-16 h-full flex flex-col items-center bg-gradient-to-b from-indigo-600 to-indigo-800 relative">
                      <GraduationCap className="h-20 w-20 text-white mb-6 drop-shadow-xl" />
                      <p className="text-white text-3xl font-black tracking-tight mb-2">CBT Go</p>
                      <div className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm mb-8">
                         <p className="text-[10px] text-white font-bold uppercase tracking-widest">Version 1.0.6</p>
                      </div>
                      
                      <div className="w-full space-y-3 mt-auto mb-10">
                         <div className="h-10 bg-white/10 rounded-xl" />
                         <div className="h-10 bg-white/5 rounded-xl border border-white/10" />
                         <div className="h-12 bg-emerald-400 rounded-2xl shadow-lg shadow-emerald-500/20" />
                      </div>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full mb-6 border border-indigo-100">
                <Smartphone className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Mobile Native</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-8 tracking-tight">
                Take Exams <span className="text-indigo-600">Anywhere.</span>
              </h2>
              <p className="text-lg text-gray-500 mb-10 font-medium leading-relaxed">
                Our secure mobile application is optimized for high-stakes testing. 
                Even on slow internet connections, students can experience a seamless, 
                low-latency exam environment with offline-save capability.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5 mb-10">
                <Button
                  size="lg"
                  className="bg-gray-900 hover:bg-black text-white h-auto py-5 px-8 rounded-2xl group transition-all"
                  onClick={() => window.open('/downloads/cbt-platform-v1.0.6.apk', '_blank')}
                >
                  <Download className="mr-4 h-8 w-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <p className="text-[10px] uppercase font-bold text-gray-400 leading-none mb-1">Download for Android</p>
                    <p className="text-xl font-black">Get APK v1.0.6</p>
                  </div>
                </Button>
                
                <div className="p-1 rounded-2xl bg-gradient-to-r from-gray-200 to-gray-100">
                   <div className="bg-white rounded-2xl h-full py-4 px-8 flex items-center">
                      <Smartphone className="h-8 w-8 text-gray-300 mr-4" />
                      <div className="text-left">
                        <p className="text-[10px] uppercase font-bold text-gray-400 leading-none mb-1">Coming Soon</p>
                        <p className="text-lg font-bold text-gray-400">iOS App Store</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100/50">
                <h4 className="font-bold text-indigo-900 mb-3 flex items-center">
                   <Shield className="h-4 w-4 mr-2 text-emerald-500" />
                   Quick Installation Guide
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="flex space-x-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                      <p className="text-xs text-indigo-700 font-medium">Download the APK directly.</p>
                   </div>
                   <div className="flex space-x-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                      <p className="text-xs text-indigo-700 font-medium">Enable 'Unknown Sources'.</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-600 rounded-[48px] p-12 lg:p-24 relative overflow-hidden text-center shadow-[0_50px_100px_rgba(79,70,229,0.3)]">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[100px]" />
             <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400 rounded-full blur-[100px]" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-10 tracking-tight leading-[1.1]">
              The Future of Testing <br className="hidden sm:block" /> starts here.
            </h2>
            <p className="text-xl text-indigo-100 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Join dozens of schools already using our platform to conduct secure and 
              scalable computer-based tests.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button
                size="lg"
                onClick={() => navigate('/register-school')}
                className="bg-white text-indigo-600 hover:bg-gray-100 font-black text-lg py-7 px-10 rounded-2xl shadow-xl"
              >
                Register Your School
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                className="border-indigo-400 text-white hover:bg-white/10 font-bold text-lg py-7 px-10 rounded-2xl"
              >
                Login to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroFeatureCard({ icon: Icon, label, color }: { icon: any, label: string, color: string }) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-5 flex flex-col items-center text-center group cursor-default">
      <div className={cn("mb-4 group-hover:scale-110 transition-transform", color)}>
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-sm font-bold text-gray-900">{label}</p>
    </div>
  );
}
