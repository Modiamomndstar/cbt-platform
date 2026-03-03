import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  Search,
  User,
  MessageSquare,
  Clock,
  Megaphone,
  MoreVertical,
  ShieldCheck
} from 'lucide-react';
import { messagesAPI } from '@/services/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMessages } from '@/hooks/useMessages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';



interface Message {
  id: string;
  senderId: string;
  sender_id?: string;
  senderName: string;
  sender_name?: string;
  senderRole: string;
  sender_role?: string;
  content: string;
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
}

interface Broadcast {
  id: string;
  title: string;
  content: string;
  senderName: string;
  sender_name?: string;
  createdAt: string;
  created_at?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { unreadCount: _, refreshUnreadCount } = useMessages();
  const [messages, setMessages] = useState<Message[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'direct' | 'broadcast'>('direct');
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [recipients, setRecipients] = useState<{id: string, name: string, role: string}[]>([]);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      setLoading(true);
      const res = await messagesAPI.getInbox();
      if (res.data.success) {
        setMessages(res.data.data.messages);
        setBroadcasts(res.data.data.broadcasts);
      }
    } catch (err) {
      toast.error("Failed to load inbox");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    setSending(true);
    try {
      const receiverId = (selectedMessage.senderId || selectedMessage.sender_id)!;
      const receiverRole = (selectedMessage.senderRole || selectedMessage.sender_role)!;

      const res = await messagesAPI.sendMessage({
        receiverId,
        receiverRole,
        content: replyContent
      });

      if (res.data.success) {
        toast.success("Message sent");
        setReplyContent('');
        loadInbox();
        refreshUnreadCount();
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCompose = async () => {
    if (composeType === 'broadcast') {
      if (!composeTitle || !composeContent) return;
      setSending(true);
      try {
        const res = await messagesAPI.broadcast({
            title: composeTitle,
            content: composeContent,
            role: 'school'
        });
        if (res.data.success) {
            toast.success("Broadcast sent successfully");
            setComposeOpen(false);
            setComposeTitle('');
            setComposeContent('');
            loadInbox();
        }
      } catch (err) {
        toast.error("Failed to send broadcast");
      } finally {
        setSending(false);
      }
    } else {
      if (!composeRecipient || !composeContent) return;
      setSending(true);
      try {
        const recipient = recipients.find(r => r.id === composeRecipient);
        if (!recipient) return;

        const payload = {
            receiverId: recipient.id,
            receiverRole: recipient.role,
            content: composeContent
        };

        const res = await messagesAPI.sendMessage(payload);
        if (res.data.success) {
            toast.success("Message sent");
            setComposeOpen(false);
            setComposeContent('');
            setComposeRecipient('');
            loadInbox();
            refreshUnreadCount();
        }
      } catch (err) {
        toast.error("Failed to send message");
      } finally {
        setSending(false);
      }
    }
  };

  const loadRecipients = async () => {
    try {
       const res = await messagesAPI.getRecipients();
       if (res.data.success) {
           setRecipients(res.data.data);
       }
    } catch (err) {
        console.error("Failed to load recipients", err);
    }
  };

  useEffect(() => {
    if (composeOpen && composeType === 'direct') {
        loadRecipients();
    }
  }, [composeOpen, composeType]);

  const handleMarkRead = async (id: string) => {
    try {
      await messagesAPI.markAsRead(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true, is_read: true } : m));
      refreshUnreadCount();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update message status");
    }
  };

  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.senderName || m.sender_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedRecipients = recipients.reduce((acc, curr) => {
    const role = curr.role === 'super_admin' ? 'Support' : curr.role.charAt(0).toUpperCase() + curr.role.slice(1) + 's';
    if (!acc[role]) acc[role] = [];
    acc[role].push(curr);
    return acc;
  }, {} as Record<string, typeof recipients>);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Support & Notifications</h1>
          <p className="text-gray-500 text-sm">Communicate with your school community and stay updated</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => setComposeOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2">
                <Send className="h-4 w-4" /> New Message
            </Button>
            <Button onClick={loadInbox} variant="outline" size="sm" className="gap-2">
                <Clock className="h-4 w-4" /> Refresh
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="md:col-span-1 border-0 shadow-sm overflow-hidden flex flex-col h-full bg-white">
          <Tabs defaultValue="inbox" className="h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50/50">
               <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="inbox" className="text-xs font-bold gap-2">
                    <MessageSquare className="h-4 w-4" /> Messages
                  </TabsTrigger>
                  <TabsTrigger value="broadcasts" className="text-xs font-bold gap-2">
                    <Megaphone className="h-4 w-4" /> Announcements
                  </TabsTrigger>
               </TabsList>

               <div className="mt-4 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    className="pl-9 bg-white text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <TabsContent value="inbox" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                {loading ? (
                    <div className="p-10 text-center animate-pulse text-gray-400 font-bold">Loading...</div>
                ) : filteredMessages.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 font-medium italic">No direct messages found</div>
                ) : (
                    <div className="divide-y">
                        {filteredMessages.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    setSelectedMessage(m);
                                    if (!(m.isRead ?? m.is_read)) handleMarkRead(m.id);
                                }}
                                className={`w-full p-4 text-left hover:bg-indigo-50/50 transition-colors flex gap-3 items-start relative ${selectedMessage?.id === m.id ? 'bg-indigo-50' : ''}`}
                            >
                                {!(m.isRead ?? m.is_read) && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-black text-gray-900 truncate">{m.senderName || m.sender_name}</p>
                                        <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                                            {formatDistanceToNow(new Date(m.createdAt || m.created_at || ''), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{m.content}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter text-gray-400">
                                            {(m.senderRole || m.sender_role) === 'super_admin' ? 'Support' : (m.senderRole || m.sender_role)}
                                        </Badge>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="broadcasts" className="flex-1 min-h-0 mt-0">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                        {broadcasts.map((b) => (
                            <div key={b.id} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30">
                                <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                                    <Megaphone className="h-4 w-4 text-indigo-500" />
                                    {b.title}
                                </h3>
                                <p className="text-xs text-indigo-700 mt-2 leading-relaxed">{b.content}</p>
                                <div className="mt-3 flex justify-between items-center text-[10px] text-indigo-500/50 font-bold">
                                    <span>From: {b.senderName || b.sender_name}</span>
                                    <span>{formatDistanceToNow(new Date(b.createdAt || b.created_at || ''))} ago</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="md:col-span-2 border-0 shadow-sm overflow-hidden flex flex-col h-full bg-white relative">
            {!selectedMessage ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                    <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare className="h-10 w-10 text-gray-200" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Select a conversation</h3>
                    <p className="text-sm text-gray-400 max-w-xs mt-2">Pick a direct message to view the full interaction and respond.</p>
                </div>
            ) : (
                <>
                    <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                                <User className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 leading-tight">{selectedMessage.senderName || selectedMessage.sender_name}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100">
                                        {(selectedMessage.senderRole || selectedMessage.sender_role) === 'super_admin' ? 'Support' : (selectedMessage.senderRole || selectedMessage.sender_role)}
                                    </Badge>
                                    <span className="text-[10px] text-gray-400 font-bold">• Active Conversation</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-5 w-5 text-gray-400" />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1 p-6 bg-slate-50/30">
                        <div className="space-y-6">
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                    Conversation Started
                                </div>
                            </div>

                            <div className="flex gap-4 items-start">
                                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center shrink-0">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <div className="max-w-[80%] bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedMessage.content}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-2 text-right">
                                        {new Date(selectedMessage.createdAt || selectedMessage.created_at || '').toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t bg-white">
                        <div className="bg-gray-50 rounded-2xl p-2 border focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-600 transition-all">
                            <textarea
                                className="w-full bg-transparent border-0 focus:ring-0 text-sm p-3 min-h-[100px] resize-none whitespace-pre-wrap"
                                placeholder="Type your message here..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                            />
                            <div className="flex justify-between items-center p-2 pt-0">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 px-2">
                                    <ShieldCheck className="h-3 w-3" /> Secure Message
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 px-6"
                                    onClick={handleSendMessage}
                                    disabled={sending || !replyContent.trim()}
                                >
                                    <Send className="h-4 w-4" /> {sending ? 'Sending...' : 'Send Message'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Card>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden rounded-3xl">
          <div className="bg-indigo-600 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Compose Message</DialogTitle>
              <DialogDescription className="text-indigo-100 font-medium">
                {user?.role === 'super_admin' ? 'Reach out to schools or send a platform-wide broadcast.' : 'Choose a recipient to start a conversation.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6">
            {user?.role === 'super_admin' && (
                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-gray-400">Message Type</Label>
                    <Select value={composeType} onValueChange={(v: any) => setComposeType(v)}>
                        <SelectTrigger className="rounded-xl h-12 bg-gray-50 border-gray-100">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="direct">Direct Message</SelectItem>
                            <SelectItem value="broadcast">Announcement (Broadcast)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {composeType === 'direct' ? (
                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-gray-400">Recipient</Label>
                    <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                        <SelectTrigger className="rounded-xl h-12 bg-gray-50 border-gray-100">
                            <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(groupedRecipients).map(group => (
                                <div key={group}>
                                    <div className="px-2 py-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50">
                                        {group}
                                    </div>
                                    {groupedRecipients[group].map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </div>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="space-y-3">
                    <Label className="text-xs font-black uppercase text-gray-400">Announcement Title</Label>
                    <Input
                        placeholder="e.g. Competition Registration Now Open"
                        className="rounded-xl h-12 bg-gray-50 border-gray-100"
                        value={composeTitle}
                        onChange={(e) => setComposeTitle(e.target.value)}
                    />
                </div>
            )}

            <div className="space-y-3">
                <Label className="text-xs font-black uppercase text-gray-400">Message Content</Label>
                <Textarea
                    placeholder="Type your message here..."
                    className="rounded-xl min-h-[150px] bg-gray-50 border-gray-100 resize-none"
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                />
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black"
                onClick={handleCompose}
                disabled={sending || (composeType === 'direct' && !composeRecipient) || (composeType === 'broadcast' && !composeTitle) || !composeContent}
              >
                {sending ? 'Processing...' : composeType === 'broadcast' ? 'Send Announcement' : 'Send Message'}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
