import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  HelpCircle, 
  MessageCircle, 
  ShieldCheck, 
  CreditCard, 
  Smartphone,
  ArrowRight
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const FAQPage: React.FC = () => {
    const navigate = useNavigate();

  const faqs = [
    {
      category: 'General',
      icon: <HelpCircle className="h-5 w-5 text-indigo-600" />,
      items: [
        {
          q: 'What is CBT Platform?',
          a: 'CBT Platform is a premium computer-based testing solution designed for schools, tutors, and organizations to conduct secure, scalable, and automated examinations.'
        },
        {
          q: 'Is there a free trial?',
          a: 'Yes! You can register your school for free and explore the core features. We also have a Freemium plan for small institutions.'
        }
      ]
    },
    {
      category: 'Security & Integrity',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      items: [
        {
          q: 'How do you prevent cheating?',
          a: 'We use several methods including Secure Mode (detects tab switching), randomized questions/options, and per-student timed sessions.'
        },
        {
          q: 'Is my data secure?',
          a: 'We use industry-standard encryption for all data at rest and in transit. Our servers are hosted in secure environments with regular backups.'
        }
      ]
    },
    {
      category: 'Payments & Credits',
      icon: <CreditCard className="h-5 w-5 text-amber-600" />,
      items: [
        {
          q: 'How does the "Pay As You Go" model work?',
          a: 'You can fund your school wallet with credits. Each student registration for an exam deducts a small amount of credits from your balance.'
        },
        {
          q: 'What are the subscription plans?',
          a: 'We offer Basic, Advanced, and Enterprise plans. Each tier offers different limits on students, tutors, and advanced features like AI analytics.'
        }
      ]
    },
    {
      category: 'Mobile & Access',
      icon: <Smartphone className="h-5 w-5 text-rose-600" />,
      items: [
        {
          q: 'Is there a mobile app?',
          a: 'Yes, we have a native Android APK (v1.0.6) available for download. It is optimized for low-bandwidth environments.'
        },
        {
          q: 'Can students take exams on any device?',
          a: 'Absolutely. Our platform is mobile-responsive and works on any modern web browser, though we recommend our app for the best experience.'
        }
      ]
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full mb-6 border border-slate-200 shadow-sm">
            <MessageCircle className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Support Center</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Frequently Asked <span className="text-indigo-600">Questions.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about the platform. Can't find an answer? 
            Ask our chatbot or contact support.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-8">
          {faqs.map((cat, idx) => (
            <Card key={idx} className="border-none shadow-sm overflow-hidden bg-white rounded-[32px]">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center gap-4 py-6 px-8">
                 <div className="p-3 bg-white rounded-2xl shadow-sm">
                    {cat.icon}
                 </div>
                 <div>
                    <CardTitle className="text-xl font-bold text-slate-900 leading-none">{cat.category}</CardTitle>
                    <CardDescription className="text-xs font-semibold mt-1">Common queries regarding {cat.category.toLowerCase()}</CardDescription>
                 </div>
              </CardHeader>
              <CardContent className="p-8">
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {cat.items.map((item, i) => (
                    <AccordionItem key={i} value={`item-${idx}-${i}`} className="border-none bg-slate-50/50 rounded-2xl px-6 transition-all hover:bg-slate-50">
                      <AccordionTrigger className="hover:no-underline py-5 text-left font-bold text-slate-800 text-lg">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6 font-medium">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Still Need Help? */}
        <div className="mt-20 bg-indigo-600 rounded-[40px] p-12 text-center relative overflow-hidden shadow-2xl shadow-indigo-200">
           <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl -ml-32 -mb-32" />
           </div>
           <div className="relative z-10">
              <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Still have questions?</h3>
              <p className="text-indigo-100 font-medium mb-10 max-w-lg mx-auto">
                 Our support team is always ready to help you set up or answer any technical queries.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                 <Button onClick={() => navigate('/register-school')} size="lg" className="bg-white text-indigo-600 hover:bg-slate-100 font-black px-8 py-7 rounded-2xl text-lg shadow-xl shadow-indigo-900/10">
                    Get Started Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
                 <Button onClick={() => window.location.href='mailto:support@cbtplatform.com'} variant="outline" size="lg" className="border-indigo-400 text-white hover:bg-white/10 font-bold px-8 py-7 rounded-2xl text-lg backdrop-blur-sm">
                    Email Support
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
