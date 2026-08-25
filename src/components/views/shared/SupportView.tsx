import React, { useState, useEffect } from 'react';
import { Language } from '../../../types';
import {
  ArrowLeft,
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  Clock,
  MessageSquare,
  History,
} from 'lucide-react';
import { supabase } from '../../../lib/db/client';

interface SupportViewProps {
  language: Language;
  onBackToHome: () => void;
  currentUser?: { userId: string; email: string; role: string; name?: string } | null;
}

interface Ticket {
  id: string;
  token: string;
  subject: string;
  message?: string;
  citizen_id: string;
  citizen_email?: string;
  status: string;
  admin_reply?: string;
  created_at: string;
  updated_at: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'resolved':
    case 'closed':
      return { text: status === 'resolved' ? 'Resolved' : 'Closed', cls: 'bg-[#DCFCE7] text-[#15803D]' };
    case 'in_progress':
      return { text: 'In Progress', cls: 'bg-[#EFF6FF] text-[#1D4ED8]' };
    default:
      return { text: 'Open', cls: 'bg-[#FEF3C7] text-[#B45309]' };
  }
};

export const SupportView: React.FC<SupportViewProps> = ({ language, onBackToHome, currentUser }) => {
  const [subTab, setSubTab] = useState<'submit' | 'track' | 'history'>('submit');
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMsg, setHelpMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState<Ticket | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMsg.trim() || !helpSubject.trim() || isSubmitting) return;
    if (!currentUser) {
      setSubmitError('Please login to submit a support ticket.');
      return;
    }
    if (!supabase) {
      setSubmitError('System not configured. Please contact support.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubmitError('Session expired. Please login again.');
        return;
      }
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          citizen_id: user.id,
          citizen_email: currentUser.email,
          subject: helpSubject.trim(),
          message: helpMsg.trim(),
          status: 'open',
        })
        .select('token')
        .single();
      if (error) {
        setSubmitError(error.message || 'Failed to submit ticket');
        return;
      }
      if (data?.token) {
        setSubmittedToken(data.token);
        setHelpSubject('');
        setHelpMsg('');
        loadMyTickets();
      } else {
        setSubmitError('Failed to submit ticket');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = trackInput.trim().toUpperCase();
    if (!token) return;
    setTrackLoading(true);
    setTrackError(null);
    setTrackResult(null);
    try {
      const res = await fetch(`/api/support/track/${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.success && json.ticket) {
        setTrackResult(json.ticket);
      } else {
        setTrackError(json.error || 'Ticket not found');
      }
    } catch {
      setTrackError('Network error. Please try again.');
    } finally {
      setTrackLoading(false);
    }
  };

  const loadMyTickets = async () => {
    if (!currentUser) return;
    if (!supabase) return;
    setHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHistoryLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, token, subject, message, status, admin_reply, created_at, updated_at')
        .eq('citizen_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        setMyTickets([]);
      } else {
        setMyTickets(data || []);
      }
    } catch {
      setMyTickets([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'history' && currentUser) loadMyTickets();
  }, [subTab, currentUser]);

  const handleTicketClick = (ticket: Ticket) => {
    setSubTab('track');
    setTrackInput(ticket.token);
    setTrackResult(ticket);
    setTrackError(null);
  };

  const renderTicketDetails = (ticket: Ticket) => {
    const badge = statusBadge(ticket.status);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => { setTrackResult(null); setTrackInput(''); }} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] transition-all cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[#64748B]" />
            </button>
            <h3 className="text-sm font-extrabold text-[#0F172A]">Ticket Details</h3>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
        </div>
        <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-3 border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#64748B]">Token</p>
            <p className="text-xs font-mono font-bold text-[#D97706]">{ticket.token}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#64748B]">Subject</p>
            <p className="text-xs font-bold text-[#0F172A]">{ticket.subject}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#64748B]">Created</p>
            <p className="text-[10px] text-[#64748B]">{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        {ticket.message && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#64748B]">Your Message</p>
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
            </div>
          </div>
        )}
        {ticket.admin_reply && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-[#1D4ED8]">Admin Reply</p>
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
              <p className="text-xs text-[#1E3A8A] leading-relaxed whitespace-pre-wrap">{ticket.admin_reply}</p>
            </div>
          </div>
        )}
        {!ticket.admin_reply && (
          <div className="flex items-center gap-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
            <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
            <p className="text-[11px] text-[#92400E]">Awaiting admin response. You will see the reply here once an admin responds.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-[#0F1D38] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A017]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#D4A017] text-[#0F1D38] rounded-2xl shadow-md font-bold">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold">Support & Help</h1>
                  <p className="text-xs text-[#CBD5E1] mt-0.5">Submit, track, and manage your support requests</p>
                </div>
              </div>
              <button onClick={onBackToHome} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4 text-[#D4A017]" />
                Home
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
          {(['submit', 'track', 'history'] as const).map((tab) => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTab === tab ? 'bg-[#F5A623] text-[#0F2557]' : 'text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}>
              {tab === 'submit' ? 'Submit Ticket' : tab === 'track' ? 'Track Ticket' : 'My History'}
            </button>
          ))}
        </div>

        {subTab === 'submit' && (
          <div className="space-y-6">
            <div className="p-5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#1E3A8A] text-white rounded-xl">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1E3A8A]">National Legal Helpline</p>
                  <p className="text-sm font-extrabold text-[#0F172A]">15100 (Free 24x7 Legal Aid)</p>
                </div>
              </div>
              <a href="tel:15100" className="px-4 py-2 bg-[#1E3A8A] text-white font-bold text-xs rounded-xl hover:bg-[#1E40AF]">Call Helpline</a>
            </div>

            <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl space-y-4">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#D97706]" />
                Send Support Message
              </h2>
              {!currentUser && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs font-bold text-[#B45309]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Please login to submit a support ticket.
                </div>
              )}
              {submittedToken && (
                <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] text-xs font-bold rounded-xl space-y-1">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Ticket submitted successfully!</span></div>
                  <p className="font-mono text-sm text-[#166534] bg-white px-3 py-1.5 rounded-lg border border-[#86EFAC] inline-block mt-1">
                    Your Token: <strong>{submittedToken}</strong>
                  </p>
                  <p className="text-[10px] text-[#4B7C60] mt-1">Save this token. Use the Track Ticket tab to check status anytime.</p>
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{submitError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#475569] block mb-1">Subject</label>
                  <input type="text" value={helpSubject} onChange={(e) => setHelpSubject(e.target.value)}
                    placeholder="e.g. Document upload problem / Advocate query"
                    className="w-full text-xs p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]" required />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#475569] block mb-1">Message</label>
                  <textarea rows={4} value={helpMsg} onChange={(e) => setHelpMsg(e.target.value)}
                    placeholder="Describe your technical or platform issue..."
                    className="w-full text-xs p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB]" required />
                </div>
                <button type="submit" disabled={isSubmitting || !currentUser}
                  className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 inline-flex items-center gap-2">
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </form>
            </div>
          </div>
        )}

        {subTab === 'track' && (
          <div className="space-y-4">
            {!trackResult && (
              <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl space-y-4">
                <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#D97706]" />
                  Track Your Ticket
                </h2>
                <p className="text-[11px] text-[#64748B]">Enter the 10-character token you received after submitting your support ticket.</p>
                <form onSubmit={handleTrack} className="flex items-center gap-2">
                  <input type="text" value={trackInput} onChange={(e) => setTrackInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3D4E5" maxLength={10}
                    className="flex-1 text-sm font-mono p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] tracking-widest" />
                  <button type="submit" disabled={trackLoading || !trackInput.trim()}
                    className="px-5 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0">
                    {trackLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    {trackLoading ? 'Tracking...' : 'Track'}
                  </button>
                </form>
                {trackError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#DC2626]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />{trackError}
                  </div>
                )}
              </div>
            )}
            {trackResult && renderTicketDetails(trackResult)}
          </div>
        )}

        {subTab === 'history' && (
          <div className="space-y-4">
            {!currentUser ? (
              <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl text-center">
                <p className="text-xs text-[#64748B]">Please login to view your support history.</p>
              </div>
            ) : historyLoading ? (
              <div className="p-6 text-center">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#94A3B8]" />
                <p className="text-xs text-[#94A3B8] mt-2">Loading your tickets...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="p-6 bg-white border border-[#E2E8F0] rounded-2xl text-center space-y-2">
                <History className="w-8 h-8 text-[#CBD5E1] mx-auto" />
                <p className="text-xs text-[#64748B]">No support tickets yet.</p>
                <button onClick={() => setSubTab('submit')} className="text-xs font-bold text-[#D97706] hover:underline cursor-pointer">Submit your first ticket</button>
              </div>
            ) : (
              <div className="space-y-2">
                {myTickets.map((ticket) => {
                  const badge = statusBadge(ticket.status);
                  return (
                    <button key={ticket.id} onClick={() => handleTicketClick(ticket)}
                      className="w-full text-left p-4 bg-white border border-[#E2E8F0] rounded-2xl hover:border-[#D97700]/40 hover:shadow-sm transition-all cursor-pointer space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{ticket.subject}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-[#64748B]">Token: <strong className="text-[#D97706]">{ticket.token}</strong></p>
                        <p className="text-[10px] text-[#94A3B8]">{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      {ticket.admin_reply && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#1D4ED8] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Admin has replied
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportView;
