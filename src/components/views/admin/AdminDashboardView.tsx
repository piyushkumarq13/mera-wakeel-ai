import React, { useState, useEffect, useMemo } from 'react';
import { Language } from '../../../types';
import {
  ArrowLeft,
  ShieldCheck,
  BarChart3,
  Activity,
  Users,
  MessageSquare,
  FileText,
  Scale,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  LayoutDashboard,
  Bell,
  User,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  KeyRound,
} from 'lucide-react';
import { TrustStats, Lawyer, VerificationStatus } from '../../../types/database';
import { supabase } from '../../../lib/supabase';

interface AdminDashboardViewProps {
  language: Language;
  onBackToHome: () => void;
  currentUser?: {
    userId: string;
    email: string;
    role: 'citizen' | 'lawyer' | 'admin';
    name?: string;
  } | null;
}

interface SummaryRow {
  event: string;
  date: string;
  count: number;
}

const DEFAULT_STATS: TrustStats = {
  total_consultations: 0,
  resolved_cases: 0,
  verified_lawyers: 0,
  avg_rating: 0,
};

const statusBadge = (status: string): { text: string; cls: string } => {
  if (status === 'verified') {
    return { text: 'Verified', cls: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' };
  }
  if (status === 'rejected') {
    return { text: 'Rejected', cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]' };
  }
  return { text: 'Pending', cls: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' };
};

const formatValue = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const extractSummary = (json: any): SummaryRow[] => {
  const raw = json?.summary ?? json?.events ?? (Array.isArray(json) ? json : []);
  if (!Array.isArray(raw)) return [];
  return raw.map((row: any) => ({
    event: row?.event ?? row?.event_name ?? 'unknown',
    date: row?.date ?? row?.created_at ?? row?.day ?? '',
    count: typeof row?.count === 'number' ? row.count : Number(row?.count ?? 0),
  }));
};

const extractLawyers = (json: any): Lawyer[] => {
  const raw = json?.lawyers ?? json?.data ?? (Array.isArray(json) ? json : []);
  return Array.isArray(raw) ? (raw as Lawyer[]) : [];
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ language, onBackToHome, currentUser }) => {
  const [adminKey, setAdminKey] = useState<string>(() => localStorage.getItem('mw_admin_key') || '');
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem('mw_admin_authed') === '1');
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [stats, setStats] = useState<TrustStats>(DEFAULT_STATS);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [setupPending, setSetupPending] = useState<boolean>(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'lawyers' | 'tickets' | 'users'>('overview');
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});
  const [ticketActionLoading, setTicketActionLoading] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lawyerSearch, setLawyerSearch] = useState('');
  const [lawyerStatusFilter, setLawyerStatusFilter] = useState('');

  // Detect whether the server has ADMIN_API_KEY configured so the operator can
  // be told "Admin setup pending" instead of a misleading "invalid key".
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/status')
      .then((r) => r.json().catch(() => null))
      .then((json) => {
        if (!cancelled && json && typeof json.configured === 'boolean') {
          setSetupPending(!json.configured);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleAuthError = () => {
    setAuthed(false);
    sessionStorage.removeItem('mw_admin_authed');
    setError(setupPending ? 'Admin setup pending — contact developer.' : 'Invalid or expired admin key');
  };

  const fetchAll = async (key: string) => {
    setLoading(true);
    try {
      const [summaryRes, statsRes, lawyersRes] = await Promise.all([
        fetch('/api/analytics/summary', { headers: { 'x-admin-key': key } }),
        fetch('/api/db/stats/trust', { headers: { 'x-admin-key': key } }),
        fetch('/api/db/lawyers', { headers: { 'x-admin-key': key } }),
      ]);
      if (
        summaryRes.status === 401 ||
        summaryRes.status === 403 ||
        statsRes.status === 401 ||
        statsRes.status === 403 ||
        lawyersRes.status === 401 ||
        lawyersRes.status === 403
      ) {
        handleAuthError();
        return;
      }
      if (summaryRes.ok) {
        const json = await summaryRes.json();
        setSummary(extractSummary(json));
      }
      if (statsRes.ok) {
        const json = await statsRes.json();
        const s = json?.stats ?? json;
        setStats({
          total_consultations: Number(s?.total_consultations ?? 0),
          resolved_cases: Number(s?.resolved_cases ?? 0),
          verified_lawyers: Number(s?.verified_lawyers ?? 0),
          avg_rating: Number(s?.avg_rating ?? 0),
        });
      }
      if (lawyersRes.ok) {
        const json = await lawyersRes.json();
        setLawyers(extractLawyers(json));
      }
      // After the existing Promise.all, add:
      const ticketsRes = await fetch('/api/admin/support-tickets', { headers: { 'x-admin-key': key } });
      if (ticketsRes.ok) {
        const json = await ticketsRes.json();
        setSupportTickets(json.tickets || []);
      }
      // Fetch users
      const usersRes = await fetch('/api/admin/users?page=1&limit=20', { headers: { 'x-admin-key': key } });
      if (usersRes.ok) {
        const json = await usersRes.json();
        setUsers(json.users || []);
        setUsersTotal(json.total || 0);
        setUsersPage(1);
      }
    } catch (err) {
      console.warn('AdminDashboardView fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) {
      fetchAll(adminKey);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/summary', {
        headers: { 'x-admin-key': adminKey.trim() },
      });
      if (res.status === 401 || res.status === 403 || !res.ok) {
        setError(setupPending ? 'Admin setup pending — contact developer.' : 'Invalid admin key');
        return;
      }
      localStorage.setItem('mw_admin_key', adminKey.trim());
      sessionStorage.setItem('mw_admin_authed', '1');
      setAuthed(true);
      await fetchAll(adminKey.trim());
    } catch (err) {
      console.warn('Admin login notice:', err);
      setError(setupPending ? 'Admin setup pending — contact developer.' : 'Invalid admin key');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mw_admin_authed');
    localStorage.removeItem('mw_admin_key');
    setAuthed(false);
    setSummary([]);
    setLawyers([]);
    setStats(DEFAULT_STATS);
  };

  const handleVerification = async (lawyerId: string, status: VerificationStatus) => {
    setActionLoading(lawyerId);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/lawyers/${encodeURIComponent(lawyerId)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ verification_status: status }),
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        setNotice(`Lawyer ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
        await fetchAll(adminKey);
      } else {
        setNotice('Action failed. Please retry.');
      }
    } catch (err) {
      console.warn('Verification notice:', err);
      setNotice('Action failed. Please retry.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTicketUpdate = async (ticketId: string, status: string) => {
    setTicketActionLoading(ticketId);
    try {
      const res = await fetch(`/api/admin/support-tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ status, admin_reply: ticketReply[ticketId] || undefined }),
      });
      if (res.ok) {
        const json = await res.json();
        setSupportTickets(prev => prev.map(t => t.id === ticketId ? json.ticket : t));
        setTicketReply(prev => ({ ...prev, [ticketId]: '' }));
        setNotice('Ticket updated successfully.');
      }
    } catch (err) {
      console.warn('Ticket update error:', err);
    } finally {
      setTicketActionLoading(null);
    }
  };

  const fetchUsers = async (page: number, search: string, role: string) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 401 || res.status === 403) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        setUsersTotal(json.total || 0);
        setUsersPage(page);
      }
    } catch (err) {
      console.warn('fetchUsers error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ user_type: newRole }),
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, user_type: newRole } : u));
        setNotice(`Role changed to ${newRole} successfully`);
      } else {
        const json = await res.json().catch(() => null);
        setNotice(json?.error || 'Failed to change role');
      }
    } catch (err) {
      console.warn('handleRoleChange error:', err);
      setNotice('Failed to change role');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(deleteConfirmUser.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (res.status === 401 || res.status === 403) {
        handleAuthError();
        return;
      }
      if (res.ok) {
        setNotice(`User ${deleteConfirmUser.full_name || deleteConfirmUser.id} deleted`);
        setUsers(prev => prev.filter(u => u.id !== deleteConfirmUser.id));
        setUsersTotal(prev => prev - 1);
        setDeleteConfirmUser(null);
      } else {
        const json = await res.json().catch(() => null);
        setNotice(json?.error || 'Failed to delete user');
      }
    } catch (err) {
      console.warn('handleDeleteUser error:', err);
      setNotice('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredLawyers = useMemo(() => {
    if (!lawyerSearch && !lawyerStatusFilter) return lawyers;
    const q = lawyerSearch.toLowerCase();
    return lawyers.filter((l) => {
      const name = (l.profile?.full_name || '').toLowerCase();
      const barNum = (l.bar_council_number || '').toLowerCase();
      const barState = (l.bar_council_state || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || barNum.includes(q) || barState.includes(q);
      const matchesStatus = !lawyerStatusFilter || l.verification_status === lawyerStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [lawyers, lawyerSearch, lawyerStatusFilter]);

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, SummaryRow[]>();
    summary.forEach((row) => {
      const key = row.event;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    });
    const rows: SummaryRow[] = [];
    grouped.forEach((eventRows, event) => {
      eventRows
        .slice()
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .forEach((r) => rows.push({ event, date: r.date, count: r.count }));
    });
    return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [summary]);

  const statCards: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    iconColor: string;
  }[] = [
    {
      label: 'Total Consultations',
      value: stats.total_consultations,
      icon: Activity,
      accent: 'bg-gradient-to-br from-[#D98800] to-[#F5A623]',
      iconColor: 'text-[#0F1D38]',
    },
    {
      label: 'Resolved Cases',
      value: stats.resolved_cases,
      icon: Scale,
      accent: 'bg-gradient-to-br from-[#0F1D38] to-[#1E2E4F]',
      iconColor: 'text-[#F5A623]',
    },
    {
      label: 'Verified Lawyers',
      value: stats.verified_lawyers,
      icon: ShieldCheck,
      accent: 'bg-gradient-to-br from-[#D98800] to-[#F5A623]',
      iconColor: 'text-[#0F1D38]',
    },
    {
      label: 'Avg. Rating',
      value: stats.avg_rating,
      icon: BadgeCheck,
      accent: 'bg-gradient-to-br from-[#0F1D38] to-[#1E2E4F]',
      iconColor: 'text-[#F5A623]',
    },
  ];

  const pendingCount = lawyers.filter((l) => l.verification_status === 'pending').length;

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-[#0F1D38] text-[#FFFFFF] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1E2E4F] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4A017]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-3 bg-[#D4A017] text-[#0F1D38] rounded-2xl shadow-md font-bold">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold leading-tight">Admin Dashboard</h1>
                <p className="text-xs text-[#CBD5E1] mt-0.5">Restricted area — staff only</p>
              </div>
            </div>
            <button
              onClick={onBackToHome}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 border border-[#FFFFFF]/20 text-xs font-bold transition-all cursor-pointer relative z-10"
            >
              <ArrowLeft className="w-4 h-4 text-[#D4A017]" />
              Back to Home
            </button>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#0F1D38] text-[#F5A623] rounded-xl shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#0F1D38]">Enter Admin Key</h2>
                <p className="text-xs text-[#64748B] mt-0.5">Provide the admin key to access internal analytics.</p>
              </div>
            </div>

            {setupPending && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs font-bold text-[#B45309]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Admin setup pending — contact developer.
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] focus:outline-none focus:border-[#D98800] focus:ring-2 focus:ring-[#D98800]/20 text-sm text-[#0F1D38] bg-[#FFFFFF]"
              />
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !adminKey.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#D98800] to-[#F5A623] text-[#0F1D38] text-sm font-extrabold shadow-md hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Checking…' : 'Access Dashboard'}
              </button>
            </form>

            <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
              {[
                { icon: Users, text: 'Lawyer KYC verification queue' },
                { icon: MessageSquare, text: 'Consultation & engagement analytics' },
                { icon: FileText, text: 'Case and document trust stats' },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.text} className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Icon className="w-4 h-4 text-[#D98800] shrink-0" />
                    <span>{row.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="bg-[#0F1D38] text-[#FFFFFF] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1E2E4F] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4A017]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#FFFFFF]/15 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#D4A017] text-[#0F1D38] rounded-2xl shadow-md font-bold">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFFFFF] leading-tight">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-[#CBD5E1] mt-1">
                  Aggregate analytics, trust stats & lawyer KYC verification.
                </p>
                {currentUser && (
                  <p className="text-[11px] text-[#F5A623] mt-1 flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Logged in as: <span className="font-mono">{currentUser.email}</span> ({currentUser.role})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fetchAll(adminKey)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 border border-[#FFFFFF]/20 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-[#D4A017] ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#DC2626]/20 hover:bg-[#DC2626]/30 border border-[#DC2626]/40 text-xs font-bold text-[#FCA5A5] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                Logout
              </button>
              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 border border-[#FFFFFF]/20 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#D4A017]" />
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#059669] shadow-sm">
            <Check className="w-4 h-4 shrink-0" />
            {notice}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-bold text-[#DC2626] shadow-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Admin Tab Bar */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#1E2E4F] pb-3">
          {(['overview', 'lawyers', 'users', 'tickets'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveAdminTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                activeAdminTab === tab
                  ? 'bg-[#F5A623] text-[#0F2557]'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E2E4F]'
              }`}>
              {tab === 'tickets' ? `Support Tickets ${supportTickets.filter(t => t.status === 'open').length > 0 ? `(${supportTickets.filter(t => t.status === 'open').length} open)` : ''}` : tab === 'users' ? `Users (${usersTotal})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeAdminTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-3"
              >
                <div className={`w-11 h-11 rounded-2xl ${card.accent} ${card.iconColor} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-extrabold text-[#0F1D38] mt-1">{formatValue(card.value)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

        {activeAdminTab === 'overview' && (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between gap-2 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D98800]" />
                <h3 className="text-sm font-extrabold text-[#0F1D38]">Events over time</h3>
              </div>
              <span className="text-[10px] font-bold text-[#64748B] bg-[#FFFFFF] border border-[#E2E8F0] rounded-full px-2.5 py-1">
                {summary.length} records
              </span>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#F8FAFC]">
                  <tr className="border-b border-[#E2E8F0] text-[10px] uppercase tracking-wider text-[#64748B]">
                    <th className="px-5 py-2.5 font-extrabold">Event</th>
                    <th className="px-5 py-2.5 font-extrabold">Date</th>
                    <th className="px-5 py-2.5 font-extrabold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-[#94A3B8]">
                        No events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    groupedEvents.map((row, index) => (
                      <tr
                        key={`${row.event}-${row.date}-${index}`}
                        className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      >
                        <td className="px-5 py-2.5 font-bold text-[#0F1D38] capitalize">{row.event.replaceAll('_', ' ')}</td>
                        <td className="px-5 py-2.5 font-mono text-[#64748B]">{row.date}</td>
                        <td className="px-5 py-2.5 font-extrabold text-[#D98800]">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeAdminTab === 'lawyers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={lawyerSearch}
                    onChange={(e) => setLawyerSearch(e.target.value)}
                    placeholder="Search by name, bar council #, or state..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F1D38] bg-[#FFFFFF] focus:outline-none focus:border-[#D98800] focus:ring-2 focus:ring-[#D98800]/20"
                  />
                </div>
                <select
                  value={lawyerStatusFilter}
                  onChange={(e) => setLawyerStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F1D38] bg-[#FFFFFF] focus:outline-none focus:border-[#D98800]"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <span className="text-[10px] font-bold text-[#64748B] bg-[#FFFFFF] border border-[#E2E8F0] rounded-full px-2.5 py-1 shrink-0">
                {filteredLawyers.length} lawyer{filteredLawyers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {filteredLawyers.length === 0 ? (
                <div className="px-5 py-10 text-center text-xs text-[#94A3B8]">No lawyers found.</div>
              ) : (
                filteredLawyers.map((lawyer) => {
                  const badge = statusBadge(lawyer.verification_status);
                  const canAct = lawyer.verification_status === 'pending' || lawyer.verification_status === 'rejected';
                  const name = lawyer.profile?.full_name || lawyer.id;
                  const initials =
                    name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'L';
                  return (
                    <div key={lawyer.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#0F1D38] text-[#F5A623] font-extrabold text-sm flex items-center justify-center shrink-0 border border-[#D98800]/40">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-extrabold text-[#0F1D38] truncate">{name}</p>
                            {lawyer.is_verified && <BadgeCheck className="w-4 h-4 text-[#059669] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                            Bar Reg: <span className="font-mono font-bold text-[#0F1D38]">{lawyer.bar_council_number || '—'}</span>
                            {lawyer.bar_council_state ? ` • ${lawyer.bar_council_state}` : ''}
                          </p>
                          {lawyer.specialty && lawyer.specialty.length > 0 && (
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">
                              {lawyer.specialty.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${badge.cls}`}>
                          {badge.text}
                        </span>
                        {canAct && (
                          <>
                            <button
                              onClick={() => handleVerification(lawyer.id, 'verified')}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-[#FFFFFF] text-[11px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === lawyer.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Verify ✓
                            </button>
                            <button
                              onClick={() => handleVerification(lawyer.id, 'rejected')}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] text-[11px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      )}

        {activeAdminTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); fetchUsers(1, e.target.value, userRoleFilter); }}
                    placeholder="Search by name or phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F1D38] bg-[#FFFFFF] focus:outline-none focus:border-[#D98800] focus:ring-2 focus:ring-[#D98800]/20"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); setUsersPage(1); fetchUsers(1, userSearch, e.target.value); }}
                  className="px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F1D38] bg-[#FFFFFF] focus:outline-none focus:border-[#D98800]"
                >
                  <option value="">All Roles</option>
                  <option value="citizen">Citizen</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <span className="text-[10px] font-bold text-[#64748B] bg-[#FFFFFF] border border-[#E2E8F0] rounded-full px-2.5 py-1 shrink-0">
                {usersTotal} user{usersTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {usersLoading ? (
              <div className="px-5 py-10 text-center text-xs text-[#94A3B8]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-[#94A3B8]">No users found.</div>
            ) : (
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="border-b border-[#E2E8F0] text-[10px] uppercase tracking-wider text-[#64748B]">
                        <th className="px-5 py-3 font-extrabold">Name</th>
                        <th className="px-5 py-3 font-extrabold">Phone</th>
                        <th className="px-5 py-3 font-extrabold">City</th>
                        <th className="px-5 py-3 font-extrabold">Role</th>
                        <th className="px-5 py-3 font-extrabold">Joined</th>
                        <th className="px-5 py-3 font-extrabold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const initials = (u.full_name || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
                        const roleColor = u.user_type === 'admin' ? 'bg-[#DC2626] text-[#FFFFFF]' : u.user_type === 'lawyer' ? 'bg-[#0F1D38] text-[#F5A623]' : 'bg-[#E2E8F0] text-[#64748B]';
                        return (
                          <tr key={u.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg ${roleColor} font-extrabold text-[10px] flex items-center justify-center shrink-0`}>
                                  {initials}
                                </div>
                                <span className="font-bold text-[#0F1D38] truncate max-w-[140px]">{u.full_name || '\u2014'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-[#64748B]">{u.phone || '\u2014'}</td>
                            <td className="px-5 py-3 text-[#64748B]">{u.city || '\u2014'}</td>
                            <td className="px-5 py-3">
                              <select
                                value={u.user_type}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold cursor-pointer focus:outline-none ${
                                  u.user_type === 'admin'
                                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                                    : u.user_type === 'lawyer'
                                    ? 'border-[#D98800]/30 bg-[#FFFBEB] text-[#B45309]'
                                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
                                }`}
                              >
                                <option value="citizen">Citizen</option>
                                <option value="lawyer">Lawyer</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-5 py-3 text-[#94A3B8] text-[10px]">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '\u2014'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => setDeleteConfirmUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FEF2F2] hover:bg-[#FECACA] text-[#DC2626] text-[10px] font-bold transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {usersTotal > 20 && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <button
                      onClick={() => fetchUsers(usersPage - 1, userSearch, userRoleFilter)}
                      disabled={usersPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#64748B] hover:bg-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <span className="text-[10px] font-bold text-[#94A3B8]">
                      Page {usersPage} of {Math.ceil(usersTotal / 20)}
                    </span>
                    <button
                      onClick={() => fetchUsers(usersPage + 1, userSearch, userRoleFilter)}
                      disabled={usersPage * 20 >= usersTotal}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#64748B] hover:bg-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {deleteConfirmUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E2E8F0] p-6 max-w-sm w-full mx-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#FEF2F2] rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0F1D38]">Delete User</h3>
                      <p className="text-[11px] text-[#64748B] mt-0.5">This action cannot be undone.</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Are you sure you want to delete <span className="font-bold text-[#0F1D38]">{deleteConfirmUser.full_name || deleteConfirmUser.id}</span>
                    {' '}(<span className="font-mono text-[10px]">{deleteConfirmUser.user_type}</span>)? All their data will be permanently removed.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setDeleteConfirmUser(null)}
                      disabled={deleteLoading}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-all cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteUser}
                      disabled={deleteLoading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {activeAdminTab === 'tickets' && (
          <div className="space-y-4">
            <h2 className="text-lg font-extrabold text-[#FFFFFF] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#F5A623]" />
              Support Tickets ({supportTickets.length})
            </h2>
            {supportTickets.length === 0 ? (
              <div className="p-6 text-center text-[#64748B] text-xs bg-[#1E293B] rounded-2xl">No support tickets yet.</div>
            ) : (
              <div className="space-y-3">
                {supportTickets.map(ticket => (
                  <div key={ticket.id} className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-[#FFFFFF]">{ticket.subject}</p>
                        <p className="text-[10px] font-mono text-[#F5A623]">Token: {ticket.token}</p>
                        <p className="text-[10px] text-[#64748B]">
                          From: {ticket.citizen_email || ticket.citizen_id.slice(0, 12)} •{' '}
                          {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                        ticket.status === 'resolved' || ticket.status === 'closed'
                          ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                          : ticket.status === 'in_progress'
                          ? 'bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]'
                          : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="bg-[#0F172A] rounded-xl p-3">
                      <p className="text-xs text-[#CBD5E1] leading-relaxed">{ticket.message}</p>
                    </div>
                    {ticket.admin_reply && (
                      <div className="bg-[#1E3A5F] rounded-xl p-3">
                        <p className="text-[10px] font-bold text-[#60A5FA] mb-1">Previous Reply:</p>
                        <p className="text-xs text-[#E2E8F0]">{ticket.admin_reply}</p>
                      </div>
                    )}
                    <div className="space-y-2 pt-1 border-t border-[#334155]">
                      <textarea
                        rows={2}
                        value={ticketReply[ticket.id] || ''}
                        onChange={(e) => setTicketReply(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Write a reply to send back to the citizen (optional)..."
                        className="w-full text-xs p-2.5 bg-[#0F172A] border border-[#334155] rounded-xl text-[#E2E8F0] placeholder:text-[#475569] focus:outline-none focus:border-[#F5A623] resize-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(['in_progress', 'resolved', 'closed'] as const).map(s => (
                          <button
                            key={s}
                            disabled={ticketActionLoading === ticket.id || ticket.status === s}
                            onClick={() => handleTicketUpdate(ticket.id, s)}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 ${
                              s === 'resolved' ? 'bg-[#059669] hover:bg-[#047857] text-[#FFFFFF]'
                              : s === 'closed' ? 'bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF]'
                              : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF]'
                            }`}>
                            {ticketActionLoading === ticket.id ? '...' : `Mark ${s.split('_').join(' ')}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboardView;
