import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, BookOpen, Clock, Users, Zap, AlertTriangle } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-slate-600">Last Updated: March 23, 2026</p>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">1. Acceptance of Terms</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              By registering a School Account on CBT Platform, you agree to be bound by these Terms of Service. 
              These terms govern your access to and use of our platform, including any content, functionality, 
              and services offered on or through the platform. If you do not agree to these terms, 
              you must not access or use the platform.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">2. Description of Services</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              CBT Platform provides an online Computer-Based Testing (CBT) and Learning Management System (LMS). 
              Our services include exam creation tools, automated marking systems, AI-powered analytics, 
              and administrative dashboards for educational institutions.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">3. Subscription and Payments</h2>
            </div>
            <Card className="border-none shadow-sm bg-white">
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">•</span>
                    <p className="text-slate-600"><span className="font-semibold">Plans:</span> Access is based on the selected subscription level (Free, Basic, Advanced, etc.).</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">•</span>
                    <p className="text-slate-600"><span className="font-semibold">Trial:</span> New accounts receive a 14-day free trial. Accounts revert to the Free tier upon expiry.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">•</span>
                    <p className="text-slate-600"><span className="font-semibold">Billing:</span> All fees are non-refundable unless required by applicable law.</p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">4. Data Ownership & Responsibility</h2>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              Institutional privacy is core to our mission. The registered school maintains full ownership 
              of all data related to its tutors, students, and exams.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-2">School Duty</h3>
                <p className="text-sm text-slate-600">Schools are responsible for the integrity of exams and the accuracy of student records.</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-2">Compliance</h3>
                <p className="text-sm text-slate-600">Schools must ensure they have legal rights to collect information from their students.</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">5. AI Features Disclosure</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The platform utilizes Artificial Intelligence (AI) for question generation and analytics. 
              While we strive for excellence, schools should review all AI-generated content before 
              administering exams to students.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">6. Limitation of Liability</h2>
            </div>
            <p className="text-slate-600 leading-relaxed italic">
              CBT Platform shall not be liable for any indirect, incidental, special, or consequential 
              damages resulting from the use or inability to use the service, including unauthorized 
              access to or alteration of your transmissions or data.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-top border-slate-200 text-center">
          <p className="text-slate-500 text-sm">
            Questions about our Terms? Contact <a href="mailto:support@mycbtplatform.cc" className="text-indigo-600 font-medium hover:underline">support@mycbtplatform.cc</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
