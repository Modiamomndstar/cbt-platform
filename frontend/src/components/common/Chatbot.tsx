import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  HelpCircle,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string; time: string }[]>([
    { 
      role: 'bot', 
      content: 'Hello! 👋 Welcome to CBT Platform. How can I assist you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { 
      role: 'user' as const, 
      content: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      let botResponse = '';
      const input = userMsg.content.toLowerCase();

      if (input.includes('price') || input.includes('cost') || input.includes('plan')) {
        botResponse = "We have flexible plans starting from a Free trial. Check our [Pricing Page](/pricing) for details on Basic, Advanced, and Enterprise plans!";
      } else if (input.includes('register') || input.includes('account') || input.includes('sign up')) {
        botResponse = "Registering is easy! Just head to our [Registration Page](/register-school) and follow the simple steps.";
      } else if (input.includes('exam') || input.includes('test')) {
        botResponse = "Our platform supports various exam styles with secure anti-cheat features. You can create exams as a school or tutor.";
      } else if (input.includes('faq') || input.includes('help')) {
        botResponse = "I recommend checking our [FAQ Page](/faq) for detailed answers to common questions.";
      } else {
        botResponse = "That sounds interesting! Please tell me more, or would you like to speak with a human representative?";
      }

      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const QuickAction = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all border border-slate-100 hover:border-indigo-200"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <Card className="w-[380px] h-[550px] mb-4 shadow-2xl border-none overflow-hidden animate-in slide-in-from-bottom-10 duration-300 flex flex-col bg-white rounded-[32px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center relative">
                <Bot className="h-6 w-6 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-black tracking-tight leading-none">CBT Assistant</CardTitle>
                <CardDescription className="text-indigo-100 text-xs mt-1 font-medium italic opacity-80">Always here to help</CardDescription>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <CardContent 
            className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            ref={scrollRef}
          >
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}
              >
                <div 
                  className={cn(
                    "p-4 rounded-3xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-100" 
                      : "bg-slate-100 text-slate-800 rounded-tl-none"
                  )}
                >
                  {msg.content.includes('[') ? (
                    (() => {
                        const parts = msg.content.split(/(\[.*?\]\(.*?\))/g);
                        return parts.map((part, index) => {
                            const match = part.match(/\[(.*?)\]\((.*?)\)/);
                            if (match) {
                                return <button key={index} onClick={() => navigate(match[2])} className="font-bold underline">{match[1]}</button>;
                            }
                            return part;
                        });
                    })()
                  ) : msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 font-bold">{msg.time}</span>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-2xl w-fit">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
          </CardContent>

          {/* Quick Actions (only if no messages beyond first) */}
          <div className="px-6 pb-2 flex flex-wrap gap-2">
            <QuickAction icon={Sparkles} label="Pricing" onClick={() => setInputValue('Tell me about pricing')} />
            <QuickAction icon={MessageSquarePlus} label="Register" onClick={() => setInputValue('How do I register?')} />
            <QuickAction icon={HelpCircle} label="FAQ" onClick={() => setInputValue('Show me the FAQ')} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <form 
              onSubmit={handleSendMessage}
              className="flex items-center gap-2"
            >
              <Input 
                placeholder="Type your message..."
                className="bg-white border-none shadow-sm focus-visible:ring-indigo-500 rounded-2xl h-12 text-sm font-medium"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="h-12 w-12 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 rounded-2xl shrink-0 active:scale-95 transition-all"
                disabled={!inputValue.trim() || isTyping}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center h-16 w-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] shadow-2xl shadow-indigo-500/40 transition-all duration-300 hover:scale-110 hover:-translate-y-1 active:scale-90 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <MessageCircle className="h-8 w-8 relative z-10" />
          
          {/* Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-4 border-white rounded-full flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </div>
        </button>
      )}
    </div>
  );
};

export default Chatbot;
