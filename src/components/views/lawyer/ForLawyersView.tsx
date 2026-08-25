import React, { useState, useEffect, useRef } from 'react';
import { Language, UserRole } from '../../../types';
import { CaseSummary } from '../../../types/database';
import { Logo } from '../../Logo';
import { Footer } from '../../Footer';
import { fetchLawyerConnectionsForLawyer, updateConnectionStatus, upsertLawyerProfile, uploadCaseDocument } from '../../../lib/supabase';
import { isConnectionAccepted, isConnectionRejected } from '../../../lib/db/status';
import { fetchLatestCaseSummary, ensureCaseSummary } from '../../../lib/db/caseSummary';
import { CaseRequestBrief } from '../../caseReport/CaseRequestBrief';
import { CaseReportViewer } from '../../caseReport/CaseReportViewer';

import { FeatureGrid, type FeatureCardData } from '../../FeatureGrid';
import { OnboardingSteps, type OnboardingStep } from '../../OnboardingSteps';
import { SectionCTA } from '../../SectionCTA';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  Briefcase,
  User,
  BarChart2,
  Star,
  Settings,
  HelpCircle,
  Search,
  Bell,
  MoreVertical,
  ShieldCheck,
  Check,
  Clock,
  Menu,
  X,
  LogOut,
  Phone,
  Plus,
  FileText,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Globe,
  Award,
  DollarSign,
  Camera,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface ForLawyersViewProps {
  language: Language;
  currentUser?: {
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null;
  onOpenLawyerAuth?: () => void;
  onBackToHome: () => void;
  onLoginSuccess?: (role: UserRole, email: string, userId?: string, profile?: any) => void;
  onLogout?: () => void;
  onPendingCountChange?: (count: number) => void;
  onOpenMessages?: (connectionId?: string) => void;
}

interface MatchRequest {
  id: string;
  caseId?: string;
  citizenId?: string;
  lawyerId?: string;
  clientName: string;
  location: string;
  caseType: string;
  description: string;
  timeAgo: string;
  budget: string;
  status: 'pending' | 'accepted' | 'declined';
  photoUrl: string;
}

interface Appointment {
  id: string;
  clientName: string;
  caseType: string;
  date: string;
  timeSlot: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  contact: string;
  notes: string;
}


interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  court: string;
  nextHearing: string;
  stage: string;
  status: 'active' | 'pending_judgment' | 'closed';
}

interface ReviewItem {
  id: string;
  clientName: string;
  rating: number;
  date: string;
  caseType: string;
  comment: string;
  reply?: string;
}

/* How Advocates Work & Grow — 4-feature grid config (card 2 highlighted as Core Feature) */
const FEATURE_CARDS: FeatureCardData[] = [
  {
    icon: FileText,
    iconClass: 'bg-[#FEF3C7] text-[#D97706]',
    title: '1. AI Pre-Summarized Briefs',
    description:
      'Review structured case summaries with factual timelines, applicable laws (BNS, IPC, NI Act, RERA), and uploaded evidence before accepting any client match.',
  },
  {
    icon: Users,
    iconClass: 'bg-[#E0F2FE] text-[#0284C7]',
    title: '2. Matched Jurisdiction Clients',
    description:
      'Receive direct consultation requests from citizens located in your city and state jurisdiction who require your exact practice specialty.',
    highlighted: true,
    badgeText: 'Core Feature',
  },
  {
    icon: DollarSign,
    iconClass: 'bg-[#DCFCE7] text-[#16A34A]',
    title: '3. Set Your Own Fees',
    description:
      'Retain 100% control over your fee structure. Set custom initial consultation charges or retainer terms directly with your clients.',
  },
  {
    icon: Briefcase,
    iconClass: 'bg-[#F3E8FF] text-[#9333EA]',
    title: '4. Practice Management Vault',
    description:
      'Organize client communications, track court hearing dates, manage documents, and collect verified citizen reviews on your profile.',
  },
];

/* 3 Simple Steps to Join as a Verified Advocate */
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    number: 1,
    title: 'Fill Enrolment Form',
    description:
      'Enter your State Bar Council Registration number, court practice locations, and legal specializations.',
    icon: Edit3,
    badgeBg: 'bg-[#0A1628]',
  },
  {
    number: 2,
    title: 'Credential Verification',
    description:
      'Our verification team checks your State Bar Council status and assigns the "Verified Bar Advocate" badge.',
    icon: ShieldCheck,
    badgeBg: 'bg-[#D97706]',
  },
  {
    number: 3,
    title: 'Receive Client Requests',
    description:
      'Your dashboard activates instantly to receive live AI-matched consultation requests from citizens.',
    icon: Bell,
    badgeBg: 'bg-[#16A34A]',
    showSuccess: true,
  },
];

export const ForLawyersView: React.FC<ForLawyersViewProps> = ({
  currentUser,
  onOpenLawyerAuth,
  onBackToHome,
  onLogout,
  onPendingCountChange,
  onOpenMessages,
}) => {
  // IF USER IS NOT LOGGED IN AS A LAWYER (visitor or citizen), SHOW ADVOCATE LANDING PAGE.
  // The landing tree is computed BEFORE the hooks and returned AFTER all hooks so the
  // hook order stays constant on every render (Rules of Hooks).
  const isLandingVisitor = !currentUser || currentUser.role !== 'lawyer';
  const landingPage = isLandingVisitor ? (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col select-none">
        {/* Top Header Bar */}
        <header className="bg-[#0A1628] text-[#FFFFFF] px-4 md:px-8 py-3.5 flex items-center justify-between border-b border-[#1E293B] sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onBackToHome}>
            <Logo size="md" />
            <span className="text-[11px] bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 px-2.5 py-0.5 rounded-full font-bold">
              Advocate Network
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onOpenLawyerAuth?.()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-[#E2E8F0] hover:text-[#FFFFFF] border border-[#334155] hover:border-[#D97706] rounded-xl transition-all cursor-pointer"
            >
              Advocate Login (वकील लॉगिन)
            </button>
            <button
              onClick={() => onOpenLawyerAuth?.()}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-extrabold bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Join as Advocate (पंजीकरण करें)</span>
            </button>
          </div>
        </header>

        {/* Hero Section for Advocates */}
        <section className="bg-gradient-to-b from-[#0A1628] via-[#0F1D38] to-[#1E293B] text-[#FFFFFF] py-16 px-4 md:px-8 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D97706]/20 border border-[#D97706]/50 text-[#F59E0B] text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
              <span>Dedicated Portal for Bar Council Enrolled Advocates</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-[#FFFFFF] tracking-tight leading-tight">
              अपनी वकालत को नया डिजिटल आयाम दें<br />
              <span className="text-[#F59E0B]">Verified Client Matches & Practice Management</span>
            </h1>

            <p className="text-sm md:text-base text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
              Mera Wakeel AI connects verified Bar Council advocates directly with citizens seeking legal consultation across High Courts, District Courts, and Tribunals. Receive pre-summarized AI case briefs, manage hearing dates, and grow your practice seamlessly.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenLawyerAuth?.()}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Register as Advocate (वकील के रूप में जुड़ें)</span>
              </button>
              <button
                onClick={() => onOpenLawyerAuth?.()}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#1E293B] hover:bg-[#334155] text-[#FFFFFF] border border-[#475569] font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Existing Advocate Login (वकील लॉगिन)</span>
              </button>
            </div>
          </div>
        </section>

        {/* How Advocates Work & Earn Money */}
        <section className="py-16 px-4 md:px-8 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F172A]">
              How Advocates Work & Grow on Mera Wakeel (वकील कैसे कार्य और कमाई करते हैं)
            </h2>
            <p className="text-xs md:text-sm text-[#64748B] max-w-2xl mx-auto">
              A transparent, hassle-free digital legal practice engine built specifically for Indian legal practitioners.
            </p>
          </div>

          <FeatureGrid cards={FEATURE_CARDS} />
        </section>

        {/* 3 Step Enrolment */}
        <section className="bg-gradient-to-b from-[#FFFFFF] via-[#F8FAFC] to-[#F1F5F9] py-16 px-4 md:px-8 border-y border-[#E2E8F0]">
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-[28px] md:text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                3 Simple Steps to Join as a Verified Advocate
              </h2>
              <p className="text-xs md:text-sm text-[#64748B]">Enrollment process for Bar Council registered advocates</p>
            </div>

            <OnboardingSteps steps={ONBOARDING_STEPS} />

            <SectionCTA
              title="Ab Verified Advocate Bane"
              subtitle="Bar Council registered advocates ke liye 100% free registration"
              buttonLabel="Register as Advocate (वकील के रूप में जुड़ें)"
              onClick={() => onOpenLawyerAuth?.()}
            />
          </div>
        </section>

        {/* CTA Footer Banner */}
        <section className="bg-[#0A1628] text-[#FFFFFF] py-16 px-4 text-center space-y-6 border-b border-[#1E293B]">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#FFFFFF]">Ready to Expand Your Legal Practice?</h2>
          <p className="text-xs md:text-sm text-[#94A3B8] max-w-xl mx-auto">
            Join over 500+ Bar Council verified advocates providing structured legal consultations across India.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenLawyerAuth?.()}
              className="w-full sm:w-auto px-6 py-3 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
            >
              Sign Up as Advocate (नया वकील खाता बनाएं)
            </button>
            <button
              onClick={() => onOpenLawyerAuth?.()}
              className="w-full sm:w-auto px-6 py-3 bg-[#1E293B] hover:bg-[#334155] text-[#FFFFFF] border border-[#475569] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Advocate Login (वकील लॉगिन)
            </button>
          </div>
        </section>

        {/* Professional Website Footer */}
        <Footer
          language="en"
          onTabChange={() => onBackToHome()}
          onOpenAuth={() => onOpenLawyerAuth?.()}
        />
      </div>
    ) : null;
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'matches' | 'appointments' | 'cases' | 'profile' | 'analytics' | 'reviews' | 'settings'
  >('dashboard');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'This Week' | 'This Month' | 'All Time'>('This Week');
  const [showDropdown, setShowDropdown] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Derive advocate name & email from real logged-in user
  const advocateEmail = currentUser?.email || 'merawakeelai@gmail.com';
  const advocateName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0].toUpperCase() : 'Adv. User');

  // --- MATCHES STATE ---
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const prevPendingIdsRef = useRef<Set<string>>(new Set());

  // --- CASE BRIEF & REPORT STATE ---
  const [selectedBriefRequest, setSelectedBriefRequest] = useState<MatchRequest | null>(null);
  const [selectedBriefSummary, setSelectedBriefSummary] = useState<CaseSummary | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [selectedReportSummary, setSelectedReportSummary] = useState<CaseSummary | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);

  // Load incoming consultation requests from database for current advocate with 10s polling & Realtime
  useEffect(() => {
    async function loadIncomingConnections() {
      if (!currentUser?.userId) {
        setMatchRequests([]);
        prevPendingIdsRef.current.clear();
        if (onPendingCountChange) onPendingCountChange(0);
        return;
      }

      const currentLawyerId = currentUser.userId;
      let conns: any[] = [];

      try {
        conns = await fetchLawyerConnectionsForLawyer(currentLawyerId);
      } catch (err) {
        console.warn('Error loading DB connections in ForLawyersView:', err);
      }

      if (conns && conns.length > 0) {
        const mapped: MatchRequest[] = conns.map((conn) => {
          const st =
            isConnectionAccepted(conn.status)
              ? 'accepted'
              : isConnectionRejected(conn.status)
              ? 'declined'
              : 'pending';

          const clientName =
            conn.citizen_profile?.full_name ||
            (conn.citizen_id ? `Client (${conn.citizen_id.slice(0, 8)})` : 'Citizen Client');

          return {
            id: conn.id,
            caseId: conn.case_id,
            citizenId: conn.citizen_id,
            lawyerId: conn.lawyer_id || currentLawyerId,
            clientName,
            location: conn.citizen_profile?.city || 'Delhi NCR',
            caseType: conn.case?.title || conn.case?.category || 'Legal Consultation Case',
            description: conn.case?.ai_summary || 'Citizen submitted a direct legal consultation request via Mera Wakeel platform.',
            timeAgo: conn.requested_at
              ? new Date(conn.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Recently',
            budget: 'Standard Consultation',
            status: st,
            photoUrl: '',
          };
        });
        setMatchRequests(mapped);

        // Detect new pending requests and show in-app notification
        const currentPendingIds = new Set(
          mapped.filter((m) => m.status === 'pending').map((m) => m.id)
        );
        const newPendingIds = [...currentPendingIds].filter((id) => !prevPendingIdsRef.current.has(id));
        if (newPendingIds.length > 0 && prevPendingIdsRef.current.size > 0) {
          // Only notify if this isn't the initial load (prevPendingIdsRef has entries)
          newPendingIds.forEach((newId) => {
            const newReq = mapped.find((m) => m.id === newId);
            if (newReq) {
              // Use the existing toast pattern from this file (setToastNotice doesn't exist here,
              // but we can create a simple inline notification via the existing onPendingCountChange callback
              // and a local state for notifications)
              console.log('[ForLawyersView] New pending request:', newReq.clientName, newReq.caseType);
              // Show browser notification if permission granted, else use a simple alert as fallback
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Client Request', {
                  body: `${newReq.clientName} requested consultation for ${newReq.caseType}`,
                  icon: '/icons/icon-192.png',
                });
              } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'denied') {
                Notification.requestPermission().then((perm) => {
                  if (perm === 'granted') {
                    new Notification('New Client Request', {
                      body: `${newReq.clientName} requested consultation for ${newReq.caseType}`,
                      icon: '/icons/icon-192.png',
                    });
                  }
                });
              }
              // Also update the badge count via onPendingCountChange (already called below)
            }
          });
        }
        prevPendingIdsRef.current = currentPendingIds;

        const pendingCount = mapped.filter((m) => m.status === 'pending').length;
        if (onPendingCountChange) onPendingCountChange(pendingCount);
      } else {
        setMatchRequests([]);
        prevPendingIdsRef.current.clear();
        if (onPendingCountChange) onPendingCountChange(0);
      }
    }

    loadIncomingConnections();

    return () => {};
  }, [currentUser]);

  const handleAcceptMatch = async (id: string) => {
    const match = matchRequests.find((m) => m.id === id);
    if (!match) return;

    const caseId = match.caseId || match.id;
    const citizenId = match.citizenId || 'guest_citizen';
    const lawyerId = match.lawyerId || currentUser?.userId || 'lawyer_101';

    try {
      await updateConnectionStatus(match.id, caseId, lawyerId, citizenId, 'accepted');

      setMatchRequests((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'accepted' as const } : m))
      );

      // Navigate to the messages page with this connection pre-selected
      onOpenMessages?.(match.id);
    } catch (e) {
      console.error('Error updating connection status to accepted:', e);
      // Show visible error to user
      alert('Failed to accept request. Please try again.');
    }
  };

  const handleDeclineMatch = async (id: string) => {
    const match = matchRequests.find((m) => m.id === id);
    if (match) {
      const caseId = match.caseId || match.id;
      const citizenId = match.citizenId || 'guest_citizen';
      const lawyerId = match.lawyerId || currentUser?.userId || 'lawyer_101';

      try {
        await updateConnectionStatus(match.id, caseId, lawyerId, citizenId, 'rejected');

        setMatchRequests((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: 'declined' as const } : m))
        );
      } catch (e) {
        console.error('Error updating connection status to rejected:', e);
        alert('Failed to decline request. Please try again.');
      }
    }
    setSelectedBriefRequest(null);
    setSelectedBriefSummary(null);
  };

  // --- CASE BRIEF VIEW ---
  const handleViewBrief = async (req: MatchRequest) => {
    setSelectedBriefRequest(req);
    setBriefLoading(true);
    try {
      const caseId = req.caseId || req.id;
      let summary = await fetchLatestCaseSummary(caseId);
      if (!summary) {
        summary = await ensureCaseSummary(caseId);
      }
      setSelectedBriefSummary(summary);
    } catch (err) {
      console.warn('Error loading case brief:', err);
    }
    setBriefLoading(false);
  };

  const handleAcceptFromBrief = async () => {
    if (!selectedBriefRequest) return;
    await handleAcceptMatch(selectedBriefRequest.id);
    setSelectedBriefRequest(null);
    setSelectedBriefSummary(null);
  };

  const handleDeclineFromBrief = async () => {
    if (!selectedBriefRequest) return;
    await handleDeclineMatch(selectedBriefRequest.id);
    setSelectedBriefRequest(null);
    setSelectedBriefSummary(null);
  };

  // --- FULL REPORT VIEW (after acceptance) ---
  const handleViewFullReport = async (req: MatchRequest) => {
    const caseId = req.caseId || req.id;
    try {
      const summary = await fetchLatestCaseSummary(caseId);
      if (summary) {
        setSelectedReportSummary(summary);
        setShowFullReport(true);
      }
    } catch (err) {
      console.warn('Error loading full report:', err);
    }
  };

  const handleAddNewMatchRequest = (clientName: string, caseType: string, budget: string, description: string) => {
    const newReq: MatchRequest = {
      id: `m-${Date.now()}`,
      clientName,
      location: 'Delhi NCR',
      caseType,
      description,
      timeAgo: 'Just now',
      budget,
      status: 'pending',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    };
    setMatchRequests((prev) => [newReq, ...prev]);
  };

  // --- APPOINTMENTS STATE ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // --- CASES STATE ---
  const [cases, setCases] = useState<CaseItem[]>([]);

  // --- PROFILE FORM STATE ---
  const [profileData, setProfileData] = useState({
    barNumber: currentUser?.name ? 'BAR/IN/' + currentUser.name.slice(0, 3).toUpperCase() + '/2026' : '',
    specialty: 'Civil & Criminal Litigation',
    experienceYears: '5',
    city: 'New Delhi',
    state: 'Delhi',
    fee: '₹1,000 / consultation',
    bio: 'Practicing advocate representing clients before District Courts and High Courts.',
    courts: 'District & Sessions Courts, High Court',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
  });
  const [profileSavedToast, setProfileSavedToast] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing advocate profile from DB on load
  useEffect(() => {
    if (currentUser?.userId) {
      fetch('/api/db/lawyers')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.lawyers) {
            const myLawyer = json.lawyers.find(
              (l: any) => l.profile_id === currentUser.userId || l.id === currentUser.userId
            );
            if (myLawyer) {
              setProfileData((prev) => ({
                ...prev,
                barNumber: myLawyer.bar_council_number || prev.barNumber,
                specialty: Array.isArray(myLawyer.specialty) ? myLawyer.specialty.join(', ') : myLawyer.specialty || prev.specialty,
                experienceYears: String(myLawyer.years_experience || prev.experienceYears),
                fee: myLawyer.consultation_fee_range || prev.fee,
                bio: myLawyer.bio || prev.bio,
                photoUrl: myLawyer.profile_photo_url || prev.photoUrl,
                city: myLawyer.profile?.city || prev.city,
                state: myLawyer.profile?.state || prev.state,
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.userId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setProfileData((prev) => ({ ...prev, photoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      if (currentUser?.userId) {
        await upsertLawyerProfile(
          currentUser.userId,
          {
            specialty: profileData.specialty.split(',').map((s) => s.trim()).filter(Boolean),
            years_experience: parseInt(profileData.experienceYears, 10) || 5,
            bar_council_number: profileData.barNumber,
            bio: profileData.bio,
            consultation_fee_range: profileData.fee,
            profile_photo_url: profileData.photoUrl,
          },
          {
            city: profileData.city,
            state: profileData.state,
          }
        );
      }
      setProfileSavedToast(true);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setToastNotice('Failed to save profile. Please try again.');
      setTimeout(() => setToastNotice(null), 3000);
    } finally {
      setIsSavingProfile(false);
    }
    setTimeout(() => setProfileSavedToast(false), 3500);
  };

  // --- REVIEWS STATE ---
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleSendReply = (reviewId: string) => {
    if (!replyText[reviewId]?.trim()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, reply: replyText[reviewId] } : r))
    );
    setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
  };

  // --- SETTINGS STATE ---
  const [settingsState, setSettingsState] = useState({
    acceptingMatches: true,
    instantCalls: true,
    emailAlerts: true,
    whatsappAlerts: true,
  });

  // Rules of Hooks: this early return must come after every hook in this component.
  if (isLandingVisitor) {
    return landingPage;
  }

  // --- FULL REPORT VIEW (after acceptance) ---
  if (showFullReport && selectedReportSummary) {
    return (
      <CaseReportViewer
        summary={selectedReportSummary}
        caseId={selectedReportSummary.case_id}
        role="lawyer"
        onBack={() => { setShowFullReport(false); setSelectedReportSummary(null); }}
        onDownloadPdf={async () => {
          try {
            const res = await fetch('/api/pdf/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ caseId: selectedReportSummary.case_id }),
            });
            if (!res.ok) { alert('PDF generation failed.'); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MWA-Report-${selectedReportSummary.report_id || selectedReportSummary.case_id.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch { alert('PDF generation failed.'); }
        }}
      />
    );
  }

  // --- CASE REQUEST BRIEF VIEW (before acceptance) ---
  if (selectedBriefRequest) {
    if (briefLoading) {
      return (
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[#64748B] mt-3">Loading case brief...</p>
          </div>
        </div>
      );
    }

    if (selectedBriefSummary) {
      return (
        <CaseRequestBrief
          summary={selectedBriefSummary}
          caseId={selectedBriefRequest.caseId || selectedBriefRequest.id}
          onAccept={handleAcceptFromBrief}
          onDecline={handleDeclineFromBrief}
        />
      );
    }

    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#64748B]">Case brief not available.</p>
          <button onClick={() => { setSelectedBriefRequest(null); setSelectedBriefSummary(null); }} className="mt-3 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl cursor-pointer">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col relative">
      
      {/* OVERLAY BACKDROP FOR SLIDE BAR */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-[#000000]/60 z-40 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* SLIDE BAR MENU (THREE-LINE DRAWER) */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#0A1628] text-[#FFFFFF] flex flex-col justify-between p-4 shrink-0 shadow-2xl z-50 overflow-y-auto max-h-screen transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          
          {/* Logo Header with Close Button */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-[#1E293B]">
            <Logo variant="light" />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-[#94A3B8] hover:text-[#FFFFFF] p-1.5 rounded-lg hover:bg-[#1E293B] cursor-pointer"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info Pill */}
          <div className="p-3 bg-[#1E293B] rounded-2xl border border-[#334155] space-y-1">
            <p className="text-xs font-extrabold text-[#FFFFFF] truncate">Adv. {advocateName}</p>
            <p className="text-[10px] text-[#94A3B8] truncate">{advocateEmail}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-[#D97706] text-[#FFFFFF] text-[10px] font-extrabold rounded-md">
              Verified Lawyer Portal
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('matches'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Client Matches</span>
              </div>
              <span className="px-1.5 py-0.5 bg-[#D97706] text-[#FFFFFF] text-[10px] font-extrabold rounded-full">
                {matchRequests.filter((m) => m.status === 'pending').length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('appointments'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Appointments</span>
            </button>

            <button
              onClick={() => { onOpenMessages?.(); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
              </div>
              {matchRequests.filter((m) => m.status === 'pending').length > 0 && (
                <span className="px-1.5 py-0.5 bg-[#D97706] text-[#FFFFFF] text-[10px] font-extrabold rounded-full">
                  {matchRequests.filter((m) => m.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('cases'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'cases'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>My Cases</span>
            </button>

            <button
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => { setActiveTab('reviews'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>Reviews</span>
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FFFFFF] text-[#0A1628] shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-[#1E293B] space-y-2">
          <button
            onClick={onBackToHome}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#FFFFFF] hover:bg-[#1E293B] cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Back to Public Website</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* TOP HEADER BAR WITH THREE-LINE MENU BUTTON */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 md:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* THREE-LINE MENU BUTTON FOR SLIDE BAR */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] cursor-pointer flex items-center justify-center shadow-2xs transition-colors"
            title="Open Menu Drawer"
          >
            <Menu className="w-5 h-5 text-[#D97706]" />
          </button>

          <Logo variant="dark" />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span>Logged in as: <strong className="text-[#0F172A]">{advocateEmail}</strong></span>
          </div>

          <button
            onClick={() => onOpenMessages?.()}
            className="p-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] relative cursor-pointer"
            title="Messages"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-[#EF4444] absolute top-1.5 right-1.5" />
          </button>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-[#CBD5E1]"
            >
              <span>{selectedTimeframe}</span>
              <span className="text-[10px]">⌵</span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-lg py-1 text-xs font-medium z-30">
                {['This Week', 'This Month', 'All Time'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setSelectedTimeframe(tf as any);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC]"
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TOAST NOTICE */}
      {toastNotice && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-[#0A1628] text-[#FFFFFF] border-2 border-[#D97706] p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            className="p-1 hover:bg-[#1E293B] rounded-lg text-[#94A3B8] hover:text-[#FFFFFF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT BODY AREA - OPENS IN FULL VIEW */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: DASHBOARD VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
                Welcome back, Adv. {advocateName} <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Aapka verified advocate dashboard active hai. Yahan aapke naye client matches aur consultation updates hain.
              </p>
            </div>

            {/* 4 METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#64748B]">Accepted Matches</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-[#16A34A]">{matchRequests.filter((m) => m.status === 'accepted').length}</span>
                  <span className="text-[10px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">Connected</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#64748B]">Pending Requests</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-[#D97706]">{matchRequests.filter((m) => m.status === 'pending').length}</span>
                  <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">Action Needed</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#64748B]">Active Conversations</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-[#0F172A]">{matchRequests.filter((m) => m.status === 'accepted').length}</span>
                  <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">Case Chats</span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#64748B]">Appointments</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-[#0F172A]">{appointments.length}</span>
                  <span className="text-[10px] font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">Scheduled</span>
                </div>
              </div>
            </div>

            {/* RECENT MATCH REQUESTS & PROFILE STRENGTH */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#0F172A]">New Client Match Requests</h2>
                  <button
                    onClick={() => setActiveTab('matches')}
                    className="text-xs font-bold text-[#2563EB] hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  {matchRequests.length === 0 ? (
                    <div className="p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center space-y-2">
                      <Users className="w-8 h-8 text-[#94A3B8] mx-auto" />
                      <p className="text-xs font-bold text-[#0F172A]">No Pending Client Requests</p>
                      <p className="text-[11px] text-[#64748B]">New legal consultation requests from citizens will appear here.</p>
                    </div>
                  ) : (
                    matchRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center shrink-0 border border-[#CBD5E1]">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#0F172A]">{req.caseType}</p>
                            <p className="text-[11px] text-[#64748B]">From: <span className="font-bold text-[#0F172A]">{req.clientName}</span>, {req.location} • {req.timeAgo}</p>
                            {!req.description || req.description.trim() === '' ? (
                              <p className="text-[10px] text-[#94A3B8] italic mt-0.5">Direct consultation — no prior chat history</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {req.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleViewBrief(req)}
                                className="px-3 py-1.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                View Brief
                              </button>
                              <button
                                onClick={() => handleDeclineMatch(req.id)}
                                className="px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#64748B] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                  req.status === 'accepted' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#64748B]'
                                }`}
                              >
                                {req.status === 'accepted' ? 'Accepted ✓' : 'Declined'}
                              </span>
                              {req.status === 'accepted' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewFullReport(req)}
                                    className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Full Report</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      onOpenMessages?.(req.id);
                                    }}
                                    className="px-3 py-1.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Message Client</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PROFILE STRENGTH */}
              <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold text-[#0F172A]">Bar Council Verification</h2>
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-full border-4 border-[#2563EB] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-8 h-8 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Verified Advocate</p>
                    <p className="text-[11px] text-[#64748B]">Bar Reg: {profileData.barNumber}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                  <p className="text-[11px] font-bold text-[#64748B]">Registered Practice Details:</p>
                  <p className="text-xs text-[#334155]">{profileData.courts}</p>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="w-full py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-bold text-xs rounded-xl cursor-pointer"
                >
                  Edit Profile Information
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CLIENT MATCHES VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-[#0F172A]">Client Match Requests (क्लाइंट अनुरोध)</h1>
                <p className="text-xs text-[#64748B]">Aapki legal practice specialty se match hone wale naye client inquiries.</p>
              </div>
              <span className="px-3 py-1 bg-[#FEF3C7] text-[#92400E] text-xs font-extrabold rounded-xl border border-[#FDE68A]">
                {matchRequests.filter((m) => m.status === 'pending').length} Active Requests
              </span>
            </div>

            {matchRequests.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3">
                <Users className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F172A]">No Active Client Match Requests</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  When citizens submit consultation requests matching your legal specialty, they will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchRequests.map((req) => (
                  <div key={req.id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center shrink-0 border border-[#CBD5E1]">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-[#0F172A]">{req.clientName}</h3>
                          <p className="text-xs text-[#64748B] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#D97706]" />
                            <span>{req.location}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-[#F1F5F9] text-[#0F172A] text-xs font-extrabold rounded-lg">
                        {req.budget}
                      </span>
                    </div>

                    <div className="space-y-1 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                      <p className="text-xs font-bold text-[#D97706]">{req.caseType}</p>
                      <p className="text-xs text-[#334155] leading-relaxed">{req.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-[#64748B]">{req.timeAgo}</span>
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewBrief(req)}
                            className="px-4 py-2 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Brief
                          </button>
                          <button
                            onClick={() => handleDeclineMatch(req.id)}
                            className="px-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-[#64748B] text-xs font-bold rounded-xl cursor-pointer hover:bg-[#F1F5F9]"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${req.status === 'accepted' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                            {req.status === 'accepted' ? 'Accepted ✓' : 'Declined'}
                          </span>
                          {req.status === 'accepted' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewFullReport(req)}
                                className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Full Report</span>
                              </button>
                              <button
                                onClick={() => {
                                  onOpenMessages?.(req.id);
                                }}
                                className="px-3.5 py-1.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Message Client</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: APPOINTMENTS VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-[#0F172A]">My Appointments & Schedule (अपॉइंटमेंट्स)</h1>
                <p className="text-xs text-[#64748B]">Scheduled consultations and upcoming client meetings.</p>
              </div>
              <button
                onClick={() => {
                  const newAp: Appointment = {
                    id: `ap-${Date.now()}`,
                    clientName: 'Sanjay Rawat',
                    caseType: 'Legal Notice Consultation',
                    date: 'Tomorrow, 02:00 PM',
                    timeSlot: '02:00 PM - 02:30 PM',
                    status: 'confirmed',
                    contact: '+91 98112 23344',
                    notes: 'Consultation regarding landlord tenancy agreement notice.',
                  };
                  setAppointments((prev) => [newAp, ...prev]);
                }}
                className="px-4 py-2.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Time Slot</span>
              </button>
            </div>

            {appointments.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3">
                <Calendar className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F172A]">No Upcoming Appointments</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Your upcoming client consultations and scheduled legal meetings will be listed here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((ap) => (
                  <div key={ap.id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-[#DCFCE7] text-[#166534] text-[10px] font-extrabold rounded-md">
                          {ap.status.toUpperCase()}
                        </span>
                        <span className="text-xs font-extrabold text-[#0F172A]">{ap.clientName}</span>
                      </div>
                      <p className="text-xs font-bold text-[#D97706]">{ap.caseType}</p>
                      <p className="text-xs text-[#64748B] flex items-center gap-3 pt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#0F172A]" />{ap.date}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#0F172A]" />{ap.contact}</span>
                      </p>
                      <p className="text-xs text-[#334155] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] mt-2">{ap.notes}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenMessages?.()}
                        className="px-3.5 py-2 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Start Call</span>
                      </button>
                      <button
                        onClick={() => onOpenMessages?.()}
                        className="px-3.5 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl cursor-pointer border border-[#CBD5E1]"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: CASES VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-[#0F172A]">My Represented Cases (मामले)</h1>
                <p className="text-xs text-[#64748B]">Track court hearings, filings, and case litigation status.</p>
              </div>
              <button
                onClick={() => {
                  const newCase: CaseItem = {
                    id: `cs-${Date.now()}`,
                    caseNumber: `WP/2026/${Math.floor(1000 + Math.random() * 9000)}`,
                    title: 'New Client Representation Case',
                    clientName: 'Rahul Verma',
                    court: 'Delhi High Court',
                    nextHearing: '28 Aug 2026',
                    stage: 'First Hearing / Notice Issued',
                    status: 'active',
                  };
                  setCases((prev) => [newCase, ...prev]);
                }}
                className="px-4 py-2.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Court Case</span>
              </button>
            </div>

            {cases.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F172A]">No Court Cases Registered</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  Click 'Add Court Case' above to track hearings, cause lists, and case stages under your advocacy representation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cases.map((c) => (
                  <div key={c.id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-[#FEF3C7] text-[#92400E] text-[10px] font-extrabold rounded-md">
                        {c.caseNumber}
                      </span>
                      <span className="text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full">
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#0F172A]">{c.title}</h3>
                      <p className="text-xs text-[#64748B]">Client: <strong>{c.clientName}</strong></p>
                      <p className="text-xs text-[#D97706] font-bold mt-1">{c.court}</p>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1 text-xs">
                      <p className="font-bold text-[#0F172A]">Next Hearing: <span className="text-[#DC2626]">{c.nextHearing}</span></p>
                      <p className="text-[#64748B]">Stage: {c.stage}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          // Open a simple prompt for updating hearing date
                          const newDate = prompt(`Update hearing date for ${c.caseNumber}:`, c.nextHearing);
                          if (newDate && newDate.trim()) {
                            // In a real app, this would call an API to update the case
                            // For now, update local state
                            setCases((prev) => prev.map((cc) => cc.id === c.id ? { ...cc, nextHearing: newDate.trim() } : cc));
                            setToastNotice(`Hearing date updated for ${c.caseNumber}`);
                            setTimeout(() => setToastNotice(null), 3000);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl border border-[#CBD5E1] cursor-pointer"
                      >
                        Update Hearing Date
                      </button>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*,application/pdf';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              try {
                                setToastNotice(`Uploading court order for ${c.caseNumber}...`);
                                await uploadCaseDocument(c.id, file, currentUser?.userId || 'guest_citizen');
                                setToastNotice(`Court order uploaded successfully for ${c.caseNumber}`);
                              } catch (err) {
                                console.error('Court order upload error:', err);
                                setToastNotice(`Failed to upload court order. Please try again.`);
                              }
                              setTimeout(() => setToastNotice(null), 3000);
                            }
                          };
                          input.click();
                        }}
                        className="px-3 py-1.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Upload Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 6: PROFILE VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Advocate Profile Manager (प्रोफाइल)</h1>
              <p className="text-xs text-[#64748B]">Manage your Bar Council accreditation, practice specialties, and public directory details.</p>
            </div>

            {profileSavedToast && (
              <div className="bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] p-4 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                <span>Advocate Profile details saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 shadow-2xs space-y-6">
              
              {/* ADVOCATE PROFILE PICTURE UPLOAD CARD */}
              <div className="p-5 rounded-2xl bg-[#0A1628] text-[#FFFFFF] border border-[#1E293B] space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#FFFFFF] flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#F59E0B]" />
                      <span>Advocate Profile Photo (प्रोफाइल फोटो)</span>
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">
                      Your profile photo will be displayed across the Mera Wakeel AI Advocate Directory and consultation cards.
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#D97706]/20 text-[#F59E0B] border border-[#D97706]/40 px-2.5 py-1 rounded-full font-bold shrink-0">
                    Advocate Only
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                  {/* Avatar Preview */}
                  <div className="relative group shrink-0">
                    {profileData.photoUrl ? (
                      <img
                        src={profileData.photoUrl}
                        alt="Advocate Profile"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-[#F59E0B] shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-[#1E293B] border-2 border-[#334155] flex items-center justify-center text-[#F59E0B]">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-[#D97706] hover:bg-[#B45309] text-white rounded-full shadow-md transition-all cursor-pointer"
                      title="Upload New Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Upload Actions & Controls */}
                  <div className="space-y-2.5 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Profile Photo from Device</span>
                      </button>

                      <div className="text-[11px] text-[#94A3B8] font-medium">
                        Upload directly from device files (JPG, PNG, WEBP)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Advocate Full Name</label>
                  <input
                    type="text"
                    value={advocateName}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F172A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Registered Email</label>
                  <input
                    type="email"
                    value={advocateEmail}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Bar Council Reg. Number</label>
                  <input
                    type="text"
                    value={profileData.barNumber}
                    onChange={(e) => setProfileData({ ...profileData, barNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Primary Legal Specialty</label>
                  <input
                    type="text"
                    value={profileData.specialty}
                    onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Years of Experience</label>
                  <input
                    type="text"
                    value={profileData.experienceYears}
                    onChange={(e) => setProfileData({ ...profileData, experienceYears: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0F172A]">Consultation Fee Range</label>
                  <input
                    type="text"
                    value={profileData.fee}
                    onChange={(e) => setProfileData({ ...profileData, fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0F172A]">Practicing Courts & Benches</label>
                <input
                  type="text"
                  value={profileData.courts}
                  onChange={(e) => setProfileData({ ...profileData, courts: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0F172A]">Professional Bio / Profile Summary</label>
                <textarea
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-3 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Saving Profile...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 7: ANALYTICS VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Practice Analytics & Insights (विश्लेषण)</h1>
              <p className="text-xs text-[#64748B]">Consultation stats, client reach, and revenue performance.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1">
                <p className="text-xs font-bold text-[#64748B]">Total Connected Cases</p>
                <p className="text-2xl font-extrabold text-[#0F172A]">{matchRequests.filter((m) => m.status === 'accepted').length}</p>
                <p className="text-[10px] text-[#16A34A]">Verified Client Connections</p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1">
                <p className="text-xs font-bold text-[#64748B]">Client Rating Average</p>
                <p className="text-2xl font-extrabold text-[#D97706]">
                  {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) + ' ★' : 'New Advocate'}
                </p>
                <p className="text-[10px] text-[#64748B]">Based on {reviews.length} citizen review(s)</p>
              </div>
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1">
                <p className="text-xs font-bold text-[#64748B]">Active Case Conversations</p>
                <p className="text-2xl font-extrabold text-[#0F172A]">{matchRequests.filter((m) => m.status === 'accepted').length}</p>
                <p className="text-[10px] text-[#2563EB]">Real-time Direct Messaging</p>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Practice Inquiry Categories</h3>
              {matchRequests.length === 0 ? (
                <p className="text-xs text-[#64748B]">No inquiry requests received yet. Categories will populate dynamically as citizens submit requests.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {Object.entries(
                    matchRequests.reduce<Record<string, number>>((acc, req) => {
                      const cat = req.caseType || 'General Legal Consultation';
                      acc[cat] = (acc[cat] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([category, count]) => {
                    const numCount = Number(count);
                    const pct = Math.round((numCount / matchRequests.length) * 100);
                    return (
                      <div key={category}>
                        <div className="flex justify-between font-bold mb-1">
                          <span>{category}</span>
                          <span>{pct}% ({numCount})</span>
                        </div>
                        <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0A1628]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 8: REVIEWS VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Client Reviews & Testimonials (समीक्षाएं)</h1>
              <p className="text-xs text-[#64748B]">Public ratings and feedback from verified citizens.</p>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3">
                <Star className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F172A]">No Client Reviews Yet</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  When citizens rate and review your legal consultation services, their feedback will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#0F172A]">{r.clientName}</h3>
                        <p className="text-[11px] text-[#64748B]">{r.caseType} • {r.date}</p>
                      </div>
                      <span className="text-sm font-extrabold text-[#D97706]">{r.rating}.0 ★</span>
                    </div>

                    <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                      "{r.comment}"
                    </p>

                    {r.reply ? (
                      <div className="bg-[#FEF3C7] border border-[#FDE68A] p-3 rounded-xl text-xs space-y-1">
                        <p className="font-bold text-[#92400E]">Your Reply:</p>
                        <p className="text-[#78350F]">{r.reply}</p>
                      </div>
                    ) : (
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Write a reply to client..."
                          value={replyText[r.id] || ''}
                          onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                          className="flex-1 px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706]"
                        />
                        <button
                          onClick={() => handleSendReply(r.id)}
                          className="px-3.5 py-2 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 9: SETTINGS VIEW */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-extrabold text-[#0F172A]">Advocate Settings & Preferences (सेटिंग्स)</h1>
              <p className="text-xs text-[#64748B]">Manage availability, notifications, and security options.</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Practice Availability</h3>

                <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Accepting New Client Matches</p>
                    <p className="text-[11px] text-[#64748B]">Show profile in MeraWakeel AI advocate directory.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsState.acceptingMatches}
                    onChange={(e) => setSettingsState({ ...settingsState, acceptingMatches: e.target.checked })}
                    className="w-5 h-5 accent-[#D97706] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Instant Consultation Phone Calls</p>
                    <p className="text-[11px] text-[#64748B]">Allow clients to request direct helpline call connections.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsState.instantCalls}
                    onChange={(e) => setSettingsState({ ...settingsState, instantCalls: e.target.checked })}
                    className="w-5 h-5 accent-[#D97706] cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider">Alerts & Notifications</h3>

                <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">Email Alerts</p>
                    <p className="text-[11px] text-[#64748B]">Receive instant email alerts on new client match requests.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsState.emailAlerts}
                    onChange={(e) => setSettingsState({ ...settingsState, emailAlerts: e.target.checked })}
                    className="w-5 h-5 accent-[#D97706] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">WhatsApp Updates</p>
                    <p className="text-[11px] text-[#64748B]">Send appointment reminders directly to WhatsApp.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsState.whatsappAlerts}
                    onChange={(e) => setSettingsState({ ...settingsState, whatsappAlerts: e.target.checked })}
                    className="w-5 h-5 accent-[#D97706] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => alert('Settings saved!')}
                  className="px-6 py-2.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Professional Website Footer */}
      <Footer
        language="en"
        onTabChange={() => onBackToHome()}
        currentUser={currentUser}
      />
    </div>
  );
};
