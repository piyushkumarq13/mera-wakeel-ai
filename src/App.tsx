/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Language, NavTab, UserRole, AppNotification } from './types';
import { Case } from './types/database';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { HowItWorksSection } from './components/HowItWorksSection';
import { StatsBanner } from './components/StatsBanner';
import { DownloadAppSection } from './components/DownloadAppSection';
import { Footer } from './components/Footer';
import { LoginView } from './components/views/shared/LoginView';
import { RegisterView } from './components/views/shared/RegisterView';
import { ChatView } from './components/views/citizen/ChatView';
import { DocumentsView } from './components/views/citizen/DocumentsView';
import { LawyersView } from './components/views/citizen/LawyersView';
import { AdvocateDirectoryView } from './components/views/citizen/AdvocateDirectoryView';
import { SettingsView } from './components/views/shared/SettingsView';
import { ForLawyersView } from './components/views/lawyer/ForLawyersView';
import { MyCasesView } from './components/views/citizen/MyCasesView';
import { MessagesView } from './components/views/shared/MessagesView';
import { PrivacyPolicyView } from './components/views/shared/PrivacyPolicyView';
import { TermsConditionsView } from './components/views/shared/TermsConditionsView';
import { DraftDocumentView } from './components/views/citizen/DraftDocumentView';
import { FreeLegalAidView } from './components/views/citizen/FreeLegalAidView';
import { AdminDashboardView } from './components/views/admin/AdminDashboardView';
import { KnowledgeBaseView } from './components/views/admin/KnowledgeBaseView';
import { SupportView } from './components/views/shared/SupportView';
import { CaseReportPage } from './components/caseReport/CaseReportPage';
import { CallCasePickerModal } from './components/CallCasePickerModal';
import { supabase, fetchProfile, createOrUpdateProfile, resolveDisplayName, createCase, fetchUserCases, fetchLawyerConnectionsForCitizen, fetchLawyerConnectionsForLawyer, getSupabase } from './lib/supabase';
import { fetchCaseDeadlines } from './lib/db/deadlines';
import { updateSeoMeta } from './lib/seo';
import { formatTimeAgo } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { resolveLanguageFromStorage, saveLanguageToStorage } from './components/LanguageSelector';

// ---------------------------------------------------------------------------
// URL ROUTING — multi-page paths for every tab (History API).
// Back/forward buttons work natively and pages are deep-linkable.
// ---------------------------------------------------------------------------
const TAB_PATHS: Record<NavTab, string> = {
  home: '/',
  'how-it-works': '/how-it-works',
  auth: '/login',
  register: '/register',
  'for-lawyers': '/for-lawyers',
  'my-cases': '/my-cases',
  chat: '/chat',
  call: '/call',
  lawyers: '/lawyers',
  advocates: '/advocates',
  documents: '/documents',
  settings: '/settings',
  privacy: '/privacy',
  terms: '/terms',
  'draft-documents': '/draft-documents',
  'free-legal-aid': '/free-legal-aid',
  admin: '/admin',
  support: '/support',
  'knowledge-base': '/knowledge-base',
  messages: '/messages',
  'case-report': '/case-report',
};

function tabFromPath(path: string): NavTab {
  const match = (Object.entries(TAB_PATHS) as Array<[NavTab, string]>).find(([, p]) => p === path);
  return match ? match[0] : 'home';
}

// Maps the stored profile.preferred_language value (e.g. 'hindi', 'tamil') to the app Language code.
function languageFromProfile(lang?: string | null): Language {
  switch (lang?.toLowerCase()) {
    case 'english': return 'en';
    case 'hinglish': return 'hinglish';
    case 'tamil': return 'ta';
    case 'telugu': return 'te';
    case 'marathi': return 'mr';
    case 'bengali': return 'bn';
    case 'kannada': return 'kn';
    case 'gujarati': return 'gu';
    case 'malayalam': return 'ml';
    case 'punjabi': return 'pa';
    case 'odia': return 'or';
    case 'urdu': return 'ur';
    case 'hindi':
    default: return 'hinglish';
  }
}

export default function App() {
  // Default language reads from localStorage first, then falls back to Hindi
  const [language, setLanguage] = useState<Language>(() => resolveLanguageFromStorage());
  const [currentTab, setCurrentTab] = useState<NavTab>(() => tabFromPath(window.location.pathname));
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseReportCaseId, setCaseReportCaseId] = useState<string | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('citizen');
  const [pendingRedirectTab, setPendingRedirectTab] = useState<NavTab | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null>(null);
  const [lawyerDirectoryCategory, setLawyerDirectoryCategory] = useState<string | null>(null);
  const [pendingMessageConnectionId, setPendingMessageConnectionId] = useState<string | undefined>(undefined);

  const [isCallPickerOpen, setIsCallPickerOpen] = useState(false);
  const [callPickerCases, setCallPickerCases] = useState<Case[]>([]);
  const [isCreatingCallCase, setIsCreatingCallCase] = useState(false);

  const [isChatPickerOpen, setIsChatPickerOpen] = useState(false);
  const [chatPickerCases, setChatPickerCases] = useState<Case[]>([]);
  const [isCreatingChatCase, setIsCreatingChatCase] = useState(false);

  const PROTECTED_TABS: NavTab[] = [
    'my-cases',
    'chat',
    'call',
    'documents',
    'settings',
    'draft-documents',
    'lawyers',
    'admin',
    'messages',
  ];

  const citizenOnlyTabs: NavTab[] = ['my-cases', 'chat', 'call', 'documents', 'lawyers', 'advocates', 'draft-documents'];
  const lawyerOnlyTabs: NavTab[] = ['for-lawyers'];

  // Single shared guard function for all tab resolution logic.
  // Ensures consistent role-based redirects regardless of navigation source.
  function resolveAllowedTab(tab: NavTab, user: { userId: string; email: string; role: UserRole; name?: string } | null): NavTab {
    if (PROTECTED_TABS.includes(tab) && !user) return 'auth';
    if ((tab === 'auth' || tab === 'register') && user) {
      return user.role === 'lawyer' ? 'for-lawyers' : user.role === 'admin' ? 'admin' : 'my-cases';
    }
    if (tab === 'admin' && user?.role !== 'admin') {
      return user?.role === 'lawyer' ? 'for-lawyers' : 'my-cases';
    }
    if (user?.role === 'lawyer' && citizenOnlyTabs.includes(tab)) return 'for-lawyers';
    if (user?.role === 'citizen' && lawyerOnlyTabs.includes(tab)) return 'my-cases';
    if (user?.role === 'admin' && (citizenOnlyTabs.includes(tab) || lawyerOnlyTabs.includes(tab))) return 'admin';
    return tab;
  }

  // Keep up-to-date refs so the popstate listener (registered once) can read
  // the current auth state and tab without re-subscribing.
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const currentTabRef = useRef(currentTab);
  currentTabRef.current = currentTab;

  // Browser Back/Forward:
  // - Derives the tab from the URL and re-renders (in-app navigation).
  // - If Back lands on the same tab (i.e. the app root / a sentinel entry),
  //   it pushes a new entry so the user can NEVER navigate out of the site.
  // - A sentinel entry is added on first load so Back from the root does not
  //   drop the user onto the external referrer page.
  useEffect(() => {
    if (!sessionStorage.getItem('mw_sentinel_used')) {
      window.history.pushState({ mw: true }, '', window.location.pathname);
      sessionStorage.setItem('mw_sentinel_used', '1');
    }

    const handlePop = () => {
      let tab = tabFromPath(window.location.pathname);
      tab = resolveAllowedTab(tab, currentUserRef.current);
      const didChange = tab !== currentTabRef.current;
      currentTabRef.current = tab;
      setCurrentTab(tab);
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (!didChange) {
        window.history.pushState({ mw: true }, '', TAB_PATHS[tab]);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Tab change (via navigation) -> push the matching URL path.
  const prevTabRef = useRef(currentTab);
  useEffect(() => {
    if (prevTabRef.current === currentTab) return;
    prevTabRef.current = currentTab;
    const path = TAB_PATHS[currentTab];
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [currentTab]);

  useEffect(() => {
    updateSeoMeta(currentTab);
  }, [currentTab]);

  // RTL support for Urdu language
  useEffect(() => {
    const isRTL = language === 'ur';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isRTL);
    if (isRTL) {
      document.body.style.textAlign = 'right';
    } else {
      document.body.style.textAlign = '';
    }
  }, [language]);

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    saveLanguageToStorage(language);
  }, [language]);

  // Clear pending message target after MessagesView consumes it
  useEffect(() => {
    if (currentTab !== 'messages' && pendingMessageConnectionId) {
      setPendingMessageConnectionId(undefined);
    }
  }, [currentTab, pendingMessageConnectionId]);

  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [activeCaseNotice, setActiveCaseNotice] = useState<string | null>(null);

  const handleStartNewCase = async () => {
    if (isCreatingCase) return;
    if (!currentUser) {
      setPendingRedirectTab('chat');
      setAuthInitialRole('citizen');
      setCurrentTab('auth');
      return;
    }
    setIsCreatingCase(true);
    try {
      const userId = currentUser.userId;
      const userCases = await fetchUserCases(userId);
      const activeCases = userCases?.filter((c) => c.status !== 'closed' && c.status !== 'resolved') || [];

      if (activeCases.length >= 2) {
        setActiveCaseNotice(`Aapke paas pehle se ${activeCases.length} active cases hain. Maximum 2 active cases allowed. Naya case shuru karne ke liye pehle kisi existing case ko Close karein.`);
        setTimeout(() => setActiveCaseNotice(null), 6000);
        return;
      }

      const activeCase = activeCases[0];

      if (activeCase) {
        setActiveCaseId(activeCase.id);
        setCurrentTab('chat');
        setActiveCaseNotice(`⚠️ Aapka ek active case pehle se chal raha hai (${activeCase.title || 'Legal Consultation'}). Naya case shuru karne ke liye pehle pichhle case ko Close karein.`);
        setTimeout(() => setActiveCaseNotice(null), 6000);
        return;
      }

      const newCase = await createCase(userId, 'New Legal Consultation', 'other', { reuseActive: true });
      setActiveCaseId(newCase.id);
      setCurrentTab('chat');
    } catch (err) {
      console.error('Error starting new case:', err);
    } finally {
      setIsCreatingCase(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuthSession() {
      if (!supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const profile = await fetchProfile(session.user.id);
          const role: UserRole = profile?.user_type === 'lawyer' ? 'lawyer' : profile?.user_type === 'admin' ? 'admin' : 'citizen';
          const name = resolveDisplayName({
            profile,
            metadata: session.user.user_metadata || null,
            email: session.user.email,
            phone: profile?.phone,
            role,
          });
          setCurrentUser({
            userId: session.user.id,
            email: session.user.email || '',
            role,
            name,
          });

          // Best-effort: persist the real name into the DB profile when the
          // profile row is empty but the auth metadata still has it, so the
          // navbar keeps showing the user's name after every refresh.
          const metaName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          if (profile && !profile.full_name && metaName) {
            createOrUpdateProfile({ ...profile, full_name: String(metaName).trim() }).catch(() => {});
          }

          if (profile?.preferred_language) {
            setLanguage(languageFromProfile(profile.preferred_language));
          }
        }
      } catch (err) {
        console.warn('Initial session lookup warning:', err);
      }
    }

    initAuthSession();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && isMounted) {
          const profile = await fetchProfile(session.user.id);
          const role: UserRole = profile?.user_type === 'lawyer' ? 'lawyer' : profile?.user_type === 'admin' ? 'admin' : 'citizen';
          const name = resolveDisplayName({
            profile,
            metadata: session.user.user_metadata || null,
            email: session.user.email,
            phone: profile?.phone,
            role,
          });
          setCurrentUser({
            userId: session.user.id,
            email: session.user.email || '',
            role,
            name,
          });
        } else if (event === 'SIGNED_OUT' && isMounted) {
          setCurrentUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
        isMounted = false;
      };
    }
  }, []);

  // Direct URL guard: if a protected page is loaded while logged-out
  // (e.g. someone opens /chat directly), force them to the login page.
  useEffect(() => {
    if (!currentUser && PROTECTED_TABS.includes(currentTab)) {
      setPendingRedirectTab(currentTab);
      setAuthInitialRole('citizen');
      const allowed = resolveAllowedTab('auth', null);
      setCurrentTab(allowed);
      window.history.replaceState({}, '', TAB_PATHS[allowed]);
      return;
    }
    // Logged-in users hitting the login page are sent to their dashboard.
    if (currentUser && (currentTab === 'auth' || currentTab === 'register')) {
      const candidate = pendingRedirectTab || (currentUser.role === 'lawyer' ? 'for-lawyers' : currentUser.role === 'admin' ? 'admin' : 'my-cases');
      const allowed = resolveAllowedTab(candidate, currentUser);
      setPendingRedirectTab(null);
      setCurrentTab(allowed);
      window.history.replaceState({}, '', TAB_PATHS[allowed]);
    }
    // Admin route guard: non-admin users cannot access /admin
    if (currentUser && currentTab === 'admin' && currentUser.role !== 'admin') {
      const allowed = resolveAllowedTab('admin', currentUser);
      setCurrentTab(allowed);
      window.history.replaceState({}, '', TAB_PATHS[allowed]);
    }
  }, [currentUser, currentTab]);

  const handleTabChange = (tab: NavTab) => {
    const allowed = resolveAllowedTab(tab, currentUser);
    if (allowed !== tab) {
      setCurrentTab(allowed);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (tab === 'call') {
      (async () => {
        const citizenId = currentUser?.userId || 'guest_citizen';
        try {
          const cases = await fetchUserCases(citizenId);
          setCallPickerCases(cases || []);
        } catch {
          setCallPickerCases([]);
        }
        setIsCallPickerOpen(true);
      })();
      return;
    }

    if (tab === 'chat') {
      (async () => {
        const citizenId = currentUser?.userId || 'guest_citizen';
        try {
          const cases = await fetchUserCases(citizenId);
          setChatPickerCases(cases || []);
        } catch {
          setChatPickerCases([]);
        }
        setIsChatPickerOpen(true);
      })();
      return;
    }

    setCurrentTab(tab);
    if (tab === 'how-it-works') {
      const el = document.getElementById('how-it-works');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCallPickerSelectCase = (caseId: string) => {
    setIsCallPickerOpen(false);
    setActiveCaseId(caseId);
    setCurrentTab('call');
  };

  const handleCallPickerCreateNewCase = async () => {
    if (!currentUser) return;
    setIsCreatingCallCase(true);
    try {
      const newCase = await createCase(currentUser.userId, 'New Case (Voice Call)');
      setIsCallPickerOpen(false);
      setActiveCaseId(newCase.id);
      setCurrentTab('call');
    } catch (e: any) {
      if (e?.message === 'ACTIVE_CASE_LIMIT_REACHED') {
        alert(language === 'hi' ? 'Aapke paas pehle se 2 active cases hain. Naya case banane ke liye pehle koi existing case close karein.' : 'You already have 2 active cases. Close an existing case before creating a new one.');
      } else {
        console.warn('Failed to create case from call picker:', e);
      }
    } finally {
      setIsCreatingCallCase(false);
    }
  };

  const handleChatPickerSelectCase = (caseId: string) => {
    setIsChatPickerOpen(false);
    setActiveCaseId(caseId);
    setCurrentTab('chat');
  };

  const handleChatPickerCreateNewCase = async () => {
    if (!currentUser) return;
    setIsCreatingChatCase(true);
    try {
      const newCase = await createCase(currentUser.userId, 'New Legal Consultation');
      setIsChatPickerOpen(false);
      setActiveCaseId(newCase.id);
      setCurrentTab('chat');
    } catch (e: any) {
      if (e?.message === 'ACTIVE_CASE_LIMIT_REACHED') {
        alert(language === 'hi' ? 'Aapke paas pehle se 2 active cases hain. Naya case banane ke liye pehle koi existing case close karein.' : 'You already have 2 active cases. Close an existing case before creating a new one.');
      } else {
        console.warn('Failed to create case from chat picker:', e);
      }
    } finally {
      setIsCreatingChatCase(false);
    }
  };

  const handleOpenAuth = (role: UserRole = 'citizen') => {
    setAuthInitialRole(role);
    setCurrentTab('auth');
  };

  const handleLoginSuccess = (role: UserRole, email: string, userId?: string, profile?: any) => {
    const finalUserId = userId || `user_${Date.now()}`;
    const name = resolveDisplayName({
      profile,
      metadata: profile?.user_metadata || null,
      email,
      phone: profile?.phone,
      role,
    });
    const userObj = {
      userId: finalUserId,
      email,
      role,
      name,
    };
    setCurrentUser(userObj);

    // Privacy: never carry the previous user's active case into the new session.
    setActiveCaseId(null);

    if (profile?.preferred_language) {
      setLanguage(languageFromProfile(profile.preferred_language));
    }

    const candidate = pendingRedirectTab || (role === 'lawyer' ? 'for-lawyers' : role === 'admin' ? 'admin' : 'my-cases');
    const allowed = resolveAllowedTab(candidate, userObj);
    setPendingRedirectTab(null);
    setCurrentTab(allowed);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear all user-cached items from localStorage
    try {
      localStorage.removeItem('mw_user_uploaded_docs');
      localStorage.removeItem('mw_qa_history');
      localStorage.removeItem('mw_active_case_id');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mw_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {}

    setCurrentUser(null);
    setCurrentTab('home');
  };

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [incomingAdvocateMsg, setIncomingAdvocateMsg] = useState<{
    senderName: string;
    content: string;
  } | null>(null);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

  // Notification fetch helper
  async function fetchUnreadCountForConnection(connectionId: string, currentUserId: string): Promise<number> {
    const client = getSupabase();
    if (!client) return 0;
    const { count } = await client
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connectionId)
      .eq('is_read', false)
      .neq('sender_id', currentUserId);
    return count ?? 0;
  }

  async function fetchNotifications(userId: string, userRole: UserRole): Promise<AppNotification[]> {
    const notifs: AppNotification[] = [];
    const now = new Date();

    if (userRole === 'citizen') {
      try {
        const connections = await fetchLawyerConnectionsForCitizen(userId);
        for (const conn of connections) {
          if (conn.status === 'accepted' || conn.status === 'rejected') {
            const name = conn.lawyer?.profile?.full_name || 'Your advocate';
            notifs.push({
              id: `conn-${conn.id}-${conn.status}`,
              type: conn.status === 'accepted' ? 'connection_accepted' : 'connection_declined',
              message: conn.status === 'accepted'
                ? `${name} accepted your request`
                : `${name} declined your request`,
              icon: conn.status === 'accepted' ? '✅' : '❌',
              is_read: false,
              linkTab: conn.status === 'accepted' ? 'messages' : undefined,
              created_at: conn.requested_at || now.toISOString(),
              timeAgo: formatTimeAgo(conn.requested_at || now.toISOString()),
            });
          }
        }
      } catch {}

      try {
        const connections = await fetchLawyerConnectionsForCitizen(userId);
        const accepted = connections.filter(c => c.status === 'accepted');
        const results = await Promise.allSettled(
          accepted.map(c => fetchUnreadCountForConnection(c.id, userId))
        );
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value > 0) {
            const conn = accepted[i];
            const name = conn.lawyer?.profile?.full_name || 'Your advocate';
            notifs.push({
              id: `msg-${conn.id}`,
              type: 'new_message',
              message: `${r.value} new message${r.value > 1 ? 's' : ''} from ${name}`,
              icon: '💬',
              is_read: false,
              linkTab: 'messages',
              created_at: now.toISOString(),
              timeAgo: 'Recently',
            });
          }
        });
      } catch {}

      try {
        const deadlines = await fetchCaseDeadlines(userId);
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        for (const d of deadlines) {
          const due = new Date(d.due_date);
          const diff = due.getTime() - now.getTime();
          if (diff > 0 && diff <= threeDays) {
            notifs.push({
              id: `deadline-${d.id}`,
              type: 'deadline_soon',
              message: `Deadline in ${Math.ceil(diff / 86400000)}d: ${d.deadline_type}`,
              icon: '⚠️',
              is_read: false,
              linkTab: 'my-cases',
              created_at: d.due_date,
              timeAgo: formatTimeAgo(d.due_date),
            });
          }
        }
      } catch {}
    }

    if (userRole === 'lawyer') {
      try {
        const connections = await fetchLawyerConnectionsForLawyer(userId);
        const pending = connections.filter(c => c.status === 'requested');
        for (const conn of pending) {
          const name = conn.citizen_profile?.full_name || 'A citizen';
          notifs.push({
            id: `req-${conn.id}`,
            type: 'new_request',
            message: `${name} sent you a case request`,
            icon: '📋',
            is_read: false,
            linkTab: 'for-lawyers',
            created_at: conn.requested_at || now.toISOString(),
            timeAgo: formatTimeAgo(conn.requested_at || now.toISOString()),
          });
        }
      } catch {}

      try {
        const connections = await fetchLawyerConnectionsForLawyer(userId);
        const accepted = connections.filter(c => c.status === 'accepted');
        const results = await Promise.allSettled(
          accepted.map(c => fetchUnreadCountForConnection(c.id, userId))
        );
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value > 0) {
            const conn = accepted[i];
            const name = conn.citizen_profile?.full_name || 'A citizen';
            notifs.push({
              id: `msg-${conn.id}`,
              type: 'new_message',
              message: `${r.value} new message${r.value > 1 ? 's' : ''} from ${name}`,
              icon: '💬',
              is_read: false,
              linkTab: 'messages',
              created_at: now.toISOString(),
              timeAgo: 'Recently',
            });
          }
        });
      } catch {}
    }

    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    return notifs.filter(n =>
      !n.is_read || new Date(n.created_at).getTime() > sevenDaysAgo
    );
  }

  // Poll + Realtime for notifications
  useEffect(() => {
    if (!currentUser) { setAppNotifications([]); return; }

    let pollTimer: ReturnType<typeof setInterval>;
    let channelConn: any = null;
    let channelMsg: any = null;

    const load = async () => {
      const notifs = await fetchNotifications(currentUser.userId, currentUser.role);
      setAppNotifications(notifs);
    };

    load();
    pollTimer = setInterval(load, 30_000);

    const client = getSupabase();
    if (client) {
      channelConn = client
        .channel('notif_connections')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lawyer_connections' }, load)
        .subscribe();

      channelMsg = client
        .channel('notif_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, load)
        .subscribe();
    }

    return () => {
      clearInterval(pollTimer);
      if (client) {
        if (channelConn) client.removeChannel(channelConn);
        if (channelMsg) client.removeChannel(channelMsg);
      }
    };
  }, [currentUser?.userId]);

  const handleMarkNotifRead = (id: string) => {
    setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleClearAllNotifs = () => setAppNotifications([]);

  useEffect(() => {
    const handleLawyerMsg = (e: any) => {
      if (e.detail && e.detail.content) {
        setIncomingAdvocateMsg({
          senderName: e.detail.sender_name || 'Advocate',
          content: e.detail.content,
        });
      }
    };

    window.addEventListener('lawyer_message_received', handleLawyerMsg);
    return () => {
      window.removeEventListener('lawyer_message_received', handleLawyerMsg);
    };
  }, []);

  // Pages where Footer is required
  const SHOW_FOOTER_PAGES: NavTab[] = ['home', 'how-it-works', 'documents', 'settings', 'privacy', 'terms', 'lawyers', 'advocates', 'support', 'draft-documents', 'free-legal-aid'];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#111827] font-sans">
      
      {/* ADVOCATE MESSAGE NOTIFICATION BANNER */}
      {incomingAdvocateMsg && (
        <div className="sticky top-0 bg-[#0A1628] text-[#FFFFFF] border-b-2 border-[#D97706] px-4 py-3 shadow-xl z-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#D97706] text-[#FFFFFF] font-bold flex items-center justify-center shrink-0">
              💬
            </div>
            <div className="text-xs md:text-sm min-w-0">
              <p className="font-extrabold text-[#F59E0B] truncate">
                Message from {incomingAdvocateMsg.senderName}
              </p>
              <p className="text-slate-200 truncate font-medium">"{incomingAdvocateMsg.content}"</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIncomingAdvocateMsg(null);
                setCurrentTab('lawyers');
              }}
              className="px-3.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-black rounded-xl cursor-pointer shadow-xs transition-all"
            >
              Open Chat (चैट खोलें)
            </button>
            <button
              onClick={() => setIncomingAdvocateMsg(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Sticky App Header & Top Navigation Bar */}
      {currentTab !== 'auth' && currentTab !== 'chat' && currentTab !== 'for-lawyers' && (
        <Navbar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          language={language}
          onLanguageChange={setLanguage}
          onOpenAuth={() => handleOpenAuth('citizen')}
          onSignUp={() => {
            setAuthInitialRole('citizen');
            handleTabChange('register');
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
          pendingRequestsCount={pendingRequestsCount}
          notifications={appNotifications}
          onMarkNotifRead={handleMarkNotifRead}
          onClearAllNotifs={handleClearAllNotifs}
        />
      )}

      {/* Main View Area */}
      <main className="flex-grow flex flex-col relative">
        {activeCaseNotice && (
          <div className="bg-[#FEF3C7] border-b border-[#F59E0B]/30 px-4 py-3 text-xs md:text-sm font-bold text-[#92400E] flex items-center justify-between shadow-xs z-50 animate-fadeIn">
            <div className="flex items-center gap-2 max-w-5xl mx-auto">
              <span className="text-base">⚠️</span>
              <span>{activeCaseNotice}</span>
            </div>
            <button
              onClick={() => setActiveCaseNotice(null)}
              className="text-[#B45309] hover:text-[#78350F] p-1 font-black cursor-pointer text-base"
            >
              ✕
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-grow flex flex-col"
          >
            {currentTab === 'home' || currentTab === 'how-it-works' ? (
              <>
                {/* 1. Hero Section */}
                <HeroBanner
                  language={language}
                  onStartConsultation={() => handleTabChange('chat')}
                  onNavigate={handleTabChange}
                />

                {/* 2. 3-Step How It Works Section */}
                <HowItWorksSection
                  onStart={() => handleTabChange('chat')}
                />

                {/* 3. Dark Navy Stats Banner */}
                <StatsBanner />

                {/* 4. Download Our App */}
                <DownloadAppSection />
              </>
            ) : currentTab === 'auth' ? (
              <LoginView
                language={language}
                onLoginSuccess={handleLoginSuccess}
                onGoToRegister={() => handleTabChange('register')}
                onGoToLawyerPortal={() => handleTabChange('for-lawyers')}
                onBackToHome={() => handleTabChange('home')}
                initialRole={authInitialRole}
              />
            ) : currentTab === 'register' ? (
              <RegisterView
                language={language}
                onLoginSuccess={handleLoginSuccess}
                onGoToLogin={() => handleTabChange('auth')}
                onBackToHome={() => handleTabChange('home')}
                initialRole={authInitialRole}
              />
            ) : currentTab === 'for-lawyers' ? (
              <ForLawyersView
                language={language}
                currentUser={currentUser}
                onOpenLawyerAuth={() => {
                  setAuthInitialRole('lawyer');
                  handleTabChange('register');
                }}
                onBackToHome={() => handleTabChange('home')}
                onOpenMessages={(connectionId) => {
                  setPendingMessageConnectionId(connectionId);
                  handleTabChange('messages');
                }}
                onPendingCountChange={setPendingRequestsCount}
                onLoginSuccess={handleLoginSuccess}
                onLogout={handleLogout}
              />
            ) : currentTab === 'my-cases' ? (
              <MyCasesView
                language={language}
                userId={currentUser?.userId}
                currentUser={currentUser}
                onStartNewCase={handleStartNewCase}
                onSelectCase={(cId) => {
                  setActiveCaseId(cId);
                  setCurrentTab('chat');
                }}
                onViewCaseReport={(cId) => {
                  setCaseReportCaseId(cId);
                  handleTabChange('case-report');
                }}
                onNavigate={handleTabChange}
              />
            ) : currentTab === 'messages' ? (
              <MessagesView
                language={language}
                currentUser={currentUser}
                onBackToHome={() => handleTabChange('my-cases')}
                initialConnectionId={pendingMessageConnectionId}
              />
            ) : currentTab === 'case-report' ? (
              <CaseReportPage
                caseId={caseReportCaseId || activeCaseId}
                currentUser={currentUser}
                onBack={() => handleTabChange('my-cases')}
                onNavigate={handleTabChange}
              />
            ) : currentTab === 'chat' || currentTab === 'call' ? (
              <ChatView
                language={language}
                onLanguageChange={setLanguage}
                currentUser={currentUser}
                activeCaseId={activeCaseId}
                onBackToHome={() => handleTabChange('home')}
                onBackToCases={() => handleTabChange('my-cases')}
                onStartNewCase={handleStartNewCase}
                onFindLawyer={(category) => {
                  setLawyerDirectoryCategory(category || null);
                  setCurrentTab('lawyers');
                }}
                autoOpenCall={currentTab === 'call'}
              />
            ) : currentTab === 'documents' ? (
              <DocumentsView
                language={language}
                currentUser={currentUser}
                activeCaseId={activeCaseId}
                onBackToHome={() => handleTabChange('home')}
              />
            ) : currentTab === 'lawyers' ? (
              <LawyersView
                language={language}
                currentUser={currentUser}
                activeCaseId={activeCaseId}
                preSelectedCategory={lawyerDirectoryCategory}
                onBackToHome={() => handleTabChange('home')}
                onNavigateToChat={(cId) => {
                  if (cId) setActiveCaseId(cId);
                  setCurrentTab('chat');
                }}
                onGoToMessages={() => handleTabChange('messages')}
                onRequireAuth={() => handleOpenAuth('citizen')}
              />
            ) : currentTab === 'advocates' ? (
              <AdvocateDirectoryView
                currentUser={currentUser}
                onBackToHome={() => handleTabChange('home')}
                onRequireAuth={() => handleOpenAuth('citizen')}
              />
            ) : currentTab === 'settings' ? (
              <SettingsView
                language={language}
                onBackToHome={() => handleTabChange('home')}
                currentUser={currentUser}
                onNavigate={handleTabChange}
              />
            ) : currentTab === 'privacy' ? (
              <PrivacyPolicyView
                language={language}
                onBackToHome={() => handleTabChange('home')}
                onNavigate={handleTabChange}
              />
            ) : currentTab === 'terms' ? (
              <TermsConditionsView
                language={language}
                onBackToHome={() => handleTabChange('home')}
                onNavigate={handleTabChange}
              />
            ) : currentTab === 'draft-documents' ? (
              <DraftDocumentView
                language={language}
                currentUser={currentUser}
                onBackToHome={() => handleTabChange('home')}
              />
            ) : currentTab === 'free-legal-aid' ? (
              <FreeLegalAidView
                language={language}
                onBackToHome={() => handleTabChange('home')}
              />
            ) : currentTab === 'admin' ? (
              <AdminDashboardView
                language={language}
                onBackToHome={() => handleTabChange('home')}
                currentUser={currentUser}
              />
            ) : currentTab === 'knowledge-base' ? (
              <KnowledgeBaseView
                onBackToHome={() => handleTabChange('home')}
              />
            ) : currentTab === 'support' ? (
              <SupportView
                language={language}
                onBackToHome={() => handleTabChange('home')}
                currentUser={currentUser}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Required Footer for specific pages */}
      {SHOW_FOOTER_PAGES.includes(currentTab) && (
        <Footer
          language={language}
          onTabChange={handleTabChange}
          onOpenAuth={(role: UserRole) => {
            setAuthInitialRole(role);
            if (role === 'lawyer') {
              handleTabChange('register');
            } else {
              handleTabChange('auth');
            }
          }}
          currentUser={currentUser}
        />
      )}

      <CallCasePickerModal
        isOpen={isCallPickerOpen}
        onClose={() => setIsCallPickerOpen(false)}
        cases={callPickerCases}
        onSelectCase={handleCallPickerSelectCase}
        onCreateNewCase={handleCallPickerCreateNewCase}
        isCreatingCase={isCreatingCallCase}
      />

      <CallCasePickerModal
        isOpen={isChatPickerOpen}
        onClose={() => setIsChatPickerOpen(false)}
        cases={chatPickerCases}
        onSelectCase={handleChatPickerSelectCase}
        onCreateNewCase={handleChatPickerCreateNewCase}
        isCreatingCase={isCreatingChatCase}
      />

    </div>
  );
}
