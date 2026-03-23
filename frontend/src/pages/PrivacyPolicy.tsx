import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Eye, Lock, Database, Globe, Mail } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-slate-600">Last Updated: March 23, 2026</p>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Database className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">1. Information We Collect</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-indigo-600 mb-2">School Data</h3>
                <p className="text-sm text-slate-600">Name, institutional address, email, and primary contact phone numbers.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-indigo-600 mb-2">Student Data</h3>
                <p className="text-sm text-slate-600">Student names, registration IDs, and performance analytics uploaded by the school.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-indigo-600 mb-2">Usage Data</h3>
                <p className="text-sm text-slate-600">Logs of exam sessions, timing, and security monitor data to prevent cheating.</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Eye className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">2. How We Use Information</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We use your data solely to provide, support, and improve the CBT experience. This includes 
              generating report cards, analyzing class performance trend, and sending vital transactional 
              notifications regarding exam schedules and billing updates.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">3. Security and Data Protection</h2>
            </div>
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="h-2 bg-green-500" />
              <CardContent className="pt-6">
                <p className="text-slate-600 mb-4 font-medium">Your data security is our top priority:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <Shield className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>SSL/TLS Encryption for all data transfers.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <Shield className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Encrypted database storage for sensitive passwords.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <Shield className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Strict internal access controls and audit logs.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-slate-600">
                    <Shield className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>No data sharing with 3rd-party advertisers.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">4. AI Processing</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We utilize advanced AI models to assist tutors in generating high-quality questions and 
              providing insights into student performance. Student responses are handled securely 
              within our private architecture and are never sold or used for public training of AI models.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Globe className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">5. Cookies & Tracking</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We use "essential cookies" to maintain your login session and verify your identity as you 
              navigate the platform. These are required for the system to function securely.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-top border-slate-200 text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">
            For privacy inquiries or to request data deletion, contact:<br />
            <span className="text-indigo-600 font-bold tracking-wide mt-1 block">privacy@mycbtplatform.cc</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
