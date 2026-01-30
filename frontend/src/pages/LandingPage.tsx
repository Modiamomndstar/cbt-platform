import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  BarChart3
} from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">CBT Platform</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button onClick={() => navigate('/register-school')}>
                Register School
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Modern Computer-Based Testing Platform
              </h1>
              <p className="text-xl text-indigo-100 mb-8">
                Streamline your school's examination process with our comprehensive CBT solution. 
                Create, schedule, and manage exams with ease.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate('/register-school')}
                  className="bg-white text-indigo-600 hover:bg-gray-100"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="border-white text-white hover:bg-white/10"
                >
                  Login
                </Button>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Timed Exams</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Auto-Grading</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Question Bank</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for Online Exams
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools you need to create, manage, and conduct 
              computer-based tests efficiently.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">
              Get started with CBT Platform in 5 simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Examination Process?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join schools already using our platform to conduct efficient, secure, and 
            scalable computer-based tests.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate('/register-school')}
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              Register Your School
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-white text-white hover:bg-white/10"
            >
              Login to Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-6 w-6 text-indigo-500" />
                <span className="text-lg font-bold text-white">CBT Platform</span>
              </div>
              <p className="text-sm">
                Modern computer-based testing solution for schools and educational institutions.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => navigate('/')} className="hover:text-white">Home</button></li>
                <li><button onClick={() => navigate('/login')} className="hover:text-white">Login</button></li>
                <li><button onClick={() => navigate('/register-school')} className="hover:text-white">Register School</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">User Types</h4>
              <ul className="space-y-2 text-sm">
                <li>School Administrators</li>
                <li>Tutors/Teachers</li>
                <li>Students</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm">
                <li>Exam Management</li>
                <li>Question Bank</li>
                <li>Student Registration</li>
                <li>Analytics & Reports</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} CBT Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
