import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, Briefcase, MessageSquare, UserCircle, Send } from 'lucide-react';

export default function BuyerMessages() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [businesses, setBusinesses] = useState({});
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const user = await base44.auth.me();
      const buyerProfiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
      if (buyerProfiles.length === 0) { navigate('/register'); return; }
      setMe(user);

      const convs = await base44.entities.Conversation.filter({ buyer_email: user.email });
      convs.sort((a, b) => new Date(b.last_message_at || b.created_date) - new Date(a.last_message_at || a.created_date));
      setConversations(convs);

      const bizIds = [...new Set(convs.map(c => c.business_id).filter(Boolean))];
      if (bizIds.length > 0) {
        const bizList = await Promise.all(bizIds.map(id => base44.entities.Business.filter({ id })));
        const bizMap = {};
        bizList.flat().forEach(b => { bizMap[b.id] = b; });
        setBusinesses(bizMap);
      }

      if (convs.length > 0) setSelectedConv(convs[0]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    (async () => {
      const msgs = await base44.entities.Message.filter({ conversation_id: selectedConv.id });
      msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setMessages(msgs);
    })();
  }, [selectedConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv) return;
    setSending(true);
    const newMsg = await base44.entities.Message.create({
      business_id: selectedConv.business_id,
      conversation_id: selectedConv.id,
      direction: 'Outbound',
      content: replyText.trim(),
      ai_drafted: false,
      channel: 'Email',
      sender: me?.full_name || me?.email,
    });
    await base44.entities.Conversation.update(selectedConv.id, {
      last_message_at: new Date().toISOString(),
    });
    setMessages(prev => [...prev, newMsg]);
    setReplyText('');
    setSending(false);
  };

  const getLastMsg = (conv) => {
    // We show this from messages cache only for selected; otherwise rely on subject
    return conv.subject || '';
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top buyer nav */}
      <div className="flex items-center gap-1 bg-white border rounded-xl px-4 py-2 shadow-sm">
        <Link to="/community" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <Search className="w-4 h-4" /> Browse Services
        </Link>
        <Link to="/buyer/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          <Briefcase className="w-4 h-4" /> My Jobs
        </Link>
        <Link to="/buyer/messages" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-terracotta text-white transition-colors">
          <MessageSquare className="w-4 h-4" /> Messages
        </Link>
        <Link to="/buyer/account" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors ml-auto">
          <UserCircle className="w-4 h-4" /> {me?.full_name || 'Account'}
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No messages yet.</p>
          <p className="text-sm mt-1">
            <Link to="/community" className="text-blue-600 hover:underline">Browse services</Link>{' '}
            and request a quote to start a conversation.
          </p>
        </div>
      ) : (
        <div className="flex bg-white border rounded-xl overflow-hidden" style={{ height: '70vh' }}>
          {/* Left panel — conversation list */}
          <div className="w-72 flex-shrink-0 border-r overflow-y-auto">
            {conversations.map(conv => {
              const biz = businesses[conv.business_id];
              const isSelected = selectedConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left px-4 py-4 border-b transition-colors ${isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {biz?.name?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{biz?.name || 'Seller'}</p>
                        <p className="text-xs text-slate-500 truncate">{conv.subject || 'No subject'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-slate-400">{formatTime(conv.last_message_at || conv.created_date)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right panel — thread */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConv ? (
              <>
                {/* Thread header */}
                <div className="px-5 py-3 border-b bg-slate-50">
                  <p className="font-semibold text-slate-900">{businesses[selectedConv.business_id]?.name || 'Seller'}</p>
                  <p className="text-xs text-slate-500">{selectedConv.subject || ''}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-8">No messages yet in this conversation.</p>
                  )}
                  {messages.map(msg => {
                    const isOutbound = msg.direction === 'Outbound' || msg.direction === 'outbound';
                    return (
                      <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                          isOutbound
                            ? 'bg-navy text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isOutbound ? 'text-white/60' : 'text-slate-400'}`}>
                            {msg.sender || (isOutbound ? (me?.full_name || 'You') : 'Seller')} · {formatTime(msg.created_date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box */}
                <div className="px-4 py-3 border-t bg-white flex gap-2 items-end">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message…"
                    rows={2}
                    className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: 'var(--nav-bg)' }}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}