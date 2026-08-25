import React, { useState, useEffect } from 'react';
import { Language, UserRole } from '../../../types';
import { Lawyer, Case, Review } from '../../../types/database';
import { fetchLawyersDirectory, createLawyerConnection, fetchUserCases, createCase, fetchLawyerConnectionsForCitizen, fetchLawyerReviews, trackEvent } from '../../../lib/supabase';
import { isConnectionAccepted, isConnectionRejected } from '../../../lib/db/status';
import { rankLawyersForCase } from '../../../lib/db/lawyerMatch';
import { ReviewModal } from '../../ReviewModal';
import { Logo } from '../../Logo';
import {
  ArrowLeft,
  Share2,
  Heart,
  Briefcase,
  MapPin,
  Globe,
  CheckCircle2,
  MessageSquare,
  Search,
  ChevronRight,
  User,
  Send,
  Clock,
  X,
  Star,
  AlertCircle,
} from 'lucide-react';

interface LawyersViewProps {
  language?: Language;
  currentUser?: {
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null;
  activeCaseId?: string | null;
  preSelectedCategory?: string | null;
  onBackToHome: () => void;
  onNavigateToChat?: (caseId?: string) => void;
  onGoToMessages?: (lawyerId?: string) => void;
  onRequireAuth?: () => void;
}


export const LawyersView: React.FC<LawyersViewProps> = ({
  language = 'hi',
  currentUser,
  activeCaseId,
  preSelectedCategory,
  onBackToHome,
  onNavigateToChat,
  onGoToMessages,
  onRequireAuth,
}) => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(preSelectedCategory || 'all');
  const [isLoading, setIsLoading] = useState(true);

  // Cases State
  const [userCases, setUserCases] = useState<Case[]>([]);
  const [selectedCaseForRequest, setSelectedCaseForRequest] = useState<string | null>(activeCaseId || null);

  // Detail View State
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'stories' | 'faqs'>('about');
  const [selectedDate, setSelectedDate] = useState<number>(13);
  const [selectedTime, setSelectedTime] = useState<string>('11:00 AM');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Connection Request & Direct Advocate Chat States
  // Map of lawyer.id -> 'none' | 'pending' | 'accepted'
  const [requestStatuses, setRequestStatuses] = useState<Record<string, 'none' | 'pending' | 'accepted'>>({});

  // Review Modal State
  const [reviewingLawyer, setReviewingLawyer] = useState<Lawyer | null>(null);
  const [selectedLawyerReviews, setSelectedLawyerReviews] = useState<Review[]>([]);

  // My Requests State
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  // Load My Requests
  const loadMyRequests = async () => {
    const citizenId = currentUser?.userId || 'guest_citizen';
    try {
      const conns = await fetchLawyerConnectionsForCitizen(citizenId);
      setMyRequests(conns || []);

      const statusMap: Record<string, 'none' | 'pending' | 'accepted'> = {};
      (conns || []).forEach((conn: any) => {
        const caseStatus = (conn.case as any)?.status;
        if (caseStatus === 'closed' || caseStatus === 'resolved') return;

        const isAcc = isConnectionAccepted(conn.status);
        const isDeclined = isConnectionRejected(conn.status);
        const st: 'none' | 'pending' | 'accepted' = isAcc ? 'accepted' : isDeclined ? 'none' : 'pending';
        const keys = [conn.lawyer_id, conn.lawyer?.id, conn.lawyer?.profile_id].filter(Boolean);
        keys.forEach((k) => {
          if (statusMap[k] !== 'accepted') {
            statusMap[k] = st;
          }
        });
      });
      setRequestStatuses((prev) => ({ ...prev, ...statusMap }));
    } catch (err) {
      console.warn('Failed to load my requests:', err);
    }
  };

  // Request Modal State & Toast State
  const [requestModalLawyer, setRequestModalLawyer] = useState<Lawyer | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestCategory, setRequestCategory] = useState('Property & Land Dispute');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Load reviews for selected lawyer
  useEffect(() => {
    if (selectedLawyer?.id) {
      fetchLawyerReviews(selectedLawyer.id)
        .then((revs) => setSelectedLawyerReviews(revs || []))
        .catch(() => setSelectedLawyerReviews([]));
    } else {
      setSelectedLawyerReviews([]);
    }
  }, [selectedLawyer?.id]);

  useEffect(() => {
    let isMounted = true;
    async function loadData(isBackground = false) {
      if (!isBackground) {
        setIsLoading(true);
      }
      try {
        // Always fetch lawyers directory from DB
        const lawyerData = await fetchLawyersDirectory();
        if (!isMounted) return;
        setLawyers(lawyerData);

        // Always fetch user cases for logged-in users and guest citizens
        const citizenId = currentUser?.userId || 'guest_citizen';
        const casesData = await fetchUserCases(citizenId);
        if (!isMounted) return;

        if (casesData && casesData.length > 0) {
          setUserCases(casesData);
          const activeCases = casesData.filter((c) => c.status !== 'closed');
          if (activeCases.length > 0) {
            setSelectedCaseForRequest((prev) => prev || activeCases[0].id);
          }
        } else {
          setUserCases([]);
        }

        // Load existing connections ONLY from Supabase DB — no localStorage fallback
        if (citizenId) {
          const existingConns = await fetchLawyerConnectionsForCitizen(citizenId);
          if (!isMounted) return;

          const statusMap: Record<string, 'none' | 'pending' | 'accepted'> = {};

          if (existingConns && existingConns.length > 0) {
            existingConns.forEach((conn: any) => {
              const caseStatus = (conn.case as any)?.status;
              if (caseStatus === 'closed' || caseStatus === 'resolved') return;

              const isAcc = isConnectionAccepted(conn.status);
              const isDeclined = isConnectionRejected(conn.status);
              const st: 'none' | 'pending' | 'accepted' = isAcc ? 'accepted' : isDeclined ? 'none' : 'pending';

              const connLawyerName = (conn.lawyer?.profile?.full_name || '').toLowerCase().trim();

              lawyerData.forEach((l) => {
                const lName = (l.profile?.full_name || '').toLowerCase().trim();
                const isIdMatch =
                  l.id === conn.lawyer_id ||
                  l.id === conn.lawyer?.id ||
                  l.profile_id === conn.lawyer_id ||
                  l.profile_id === conn.lawyer?.profile_id;

                const isNameMatch = Boolean(lName && connLawyerName && (lName.includes(connLawyerName) || connLawyerName.includes(lName)));

                if (isIdMatch || isNameMatch) {
                  if (statusMap[l.id] !== 'accepted') {
                    statusMap[l.id] = st;
                  }
                }
              });

              const keys = [conn.lawyer_id, conn.lawyer?.id, conn.lawyer?.profile_id].filter(Boolean);
              keys.forEach((k) => {
                if (statusMap[k] !== 'accepted') {
                  statusMap[k] = st;
                }
              });
            });
          }

          // Statuses derived strictly from verified DB rows
          setRequestStatuses(statusMap);
        } else {
          // Not logged in — clear connection state
          setUserCases([]);
          setRequestStatuses({});
        }
      } catch (e) {
        console.error('Error loading lawyers directory or cases:', e);
      } finally {
        if (!isBackground && isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData(false);
    const interval = setInterval(() => loadData(true), 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.userId]);

  // Open Request Modal instantly & refresh latest active cases
  const handleOpenRequestModal = async (lawyer: Lawyer) => {
    setRequestModalLawyer(lawyer);
    setRequestNote('');
    setRequestCategory('Property & Land Dispute');

    const citizenId = currentUser?.userId || 'guest_citizen';
    let latestCases = await fetchUserCases(citizenId);
    if (!latestCases || latestCases.length === 0) {
      latestCases = await fetchUserCases('guest_citizen');
    }

    if (latestCases && latestCases.length > 0) {
      setUserCases(latestCases);
    }

    setSelectedCaseForRequest(null);
  };

  // Send request handler
  const handleConfirmSendRequest = async (lawyerId: string) => {
    if (requestStatuses[lawyerId] === 'pending' || requestStatuses[lawyerId] === 'accepted') return;

    const hasDescription = requestNote.trim().length > 0;
    if (!selectedCaseForRequest && !hasDescription) return;

    const targetLawyer = lawyers.find((l) => l.id === lawyerId) || selectedLawyer || requestModalLawyer;
    const name = targetLawyer?.profile?.full_name || 'Advocate';

    setRequestStatuses((prev) => ({ ...prev, [lawyerId]: 'pending' }));
    setRequestModalLawyer(null);

    const citizenId = currentUser?.userId || 'guest_citizen';
    let caseIdToUse = selectedCaseForRequest;

    if (!caseIdToUse) {
      const descriptionText = requestNote.trim();
      const derivedTitle = descriptionText.length > 60
        ? descriptionText.substring(0, 60).trim() + '...'
        : descriptionText;
      const safeCategory = requestCategory || 'other';

      try {
        const newCase = await createCase(citizenId, derivedTitle, safeCategory, {
          reuseActive: false,
          citizenNote: descriptionText,
        });
        caseIdToUse = newCase.id;
        setUserCases((prev) => [newCase, ...prev]);
      } catch (err: any) {
        if (err?.message === 'ACTIVE_CASE_LIMIT_REACHED') {
          setToastNotice('Aapke paas pehle se 2 active cases hain. Naya advocate request bhejne ke liye pehle koi case close karein.');
        } else {
          console.warn('Failed to auto-create case for direct request:', err);
          setToastNotice('Request bhejne mein dikkat aayi — dobara prayas karein.');
        }
        setTimeout(() => setToastNotice(null), 5000);
        setRequestStatuses((prev) => ({ ...prev, [lawyerId]: 'none' }));
        return;
      }
    }

    try {
      const result = await createLawyerConnection(citizenId, lawyerId, caseIdToUse, requestNote.trim() || undefined);
      trackEvent('lawyer_connection_requested', { lawyer_id: lawyerId, case_id: caseIdToUse, user_id: citizenId });

      setRequestStatuses((prev) => ({ ...prev, [lawyerId]: 'pending' }));

      const selectedCaseObj = userCases.find((c) => c.id === caseIdToUse);
      const caseTitle = selectedCaseObj?.title || requestNote.trim().substring(0, 40) || 'Direct Consultation Request';

      setToastNotice(result.sms_sent ? 'Vakeel ko SMS bhej diya gaya' : `Consultation request for "${caseTitle}" sent to Adv. ${name}! Waiting for advocate response.`);

      setTimeout(() => {
        setToastNotice((curr) => (curr?.includes(`sent to Adv. ${name}`) ? null : curr));
      }, 5000);

      loadMyRequests();
    } catch (err: any) {
      console.warn('Error creating lawyer connection:', err);
      const msg = err?.message || '';
      if (msg === 'ALREADY_REQUESTED' || msg.includes('ALREADY_REQUESTED')) {
        setToastNotice('You already have a pending request with this advocate — please wait for their response.');
      } else if (msg.includes('Lawyer not found')) {
        setToastNotice('Advocate abhi available nahi hain.');
      } else {
        setToastNotice('Request nahi bheja ja saka — dobara prayas karein.');
      }
      setTimeout(() => setToastNotice(null), 5000);
      setRequestStatuses((prev) => ({ ...prev, [lawyerId]: 'none' }));
    }
  };

  // AI Automatic Lawyer Assignment Fallback
  const handleAiAutoAssignLawyer = async () => {
    if (lawyers.length === 0) return;

    const citizenId = currentUser?.userId || 'guest_citizen';
    let caseIdToUse = selectedCaseForRequest || activeCaseId;

    // Auto-create a lightweight case if none exists (avoid fake UUIDs)
    if (!caseIdToUse) {
      try {
        const newCase = await createCase(citizenId, 'Direct Consultation Request', 'other');
        caseIdToUse = newCase.id;
      } catch (err: any) {
        if (err?.message === 'ACTIVE_CASE_LIMIT_REACHED') {
          setToastNotice('Aapke paas pehle se 2 active cases hain. Naya case banane ke liye pehle koi case close karein.');
        } else {
          console.warn('Failed to auto-create case for AI assign:', err);
          setToastNotice('Request bhejne mein dikkat aayi — dobara prayas karein.');
        }
        setTimeout(() => setToastNotice(null), 5000);
        return;
      }
    }

    const selectedCaseObj = userCases.find((c) => c.id === caseIdToUse);
    const caseText = `${selectedCaseObj?.title || ''} ${selectedCaseObj?.category || ''} ${requestCategory || ''}`;
    const suggestions = rankLawyersForCase(lawyers, {
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      text: caseText,
      excludedLawyerIds: [],
    });
    const matchedLawyer = suggestions[0]?.lawyer || lawyers.find((l) => l.is_verified) || lawyers[0];
    const name = matchedLawyer.profile?.full_name || 'Advocate';

    setRequestStatuses((prev) => ({ ...prev, [matchedLawyer.id]: 'pending' }));

    try {
      await createLawyerConnection(citizenId, matchedLawyer.id, caseIdToUse);
    } catch (e) {
      console.warn('Error in AI auto assign:', e);
    }

    setToastNotice(`🤖 AI Auto-Assigned Adv. ${name} for your case! Request sent to advocate portal.`);

    setTimeout(() => {
      setToastNotice((curr) => (curr?.includes(`AI Auto-Assigned Adv. ${name}`) ? null : curr));
    }, 5000);
  };


  const categories = [
    { id: 'all', label: 'All Lawyers (सभी वकील)' },
    { id: 'property', label: 'Property & Land (ज़मीन-जायदाद)' },
    { id: 'family', label: 'Family & Divorce (पारिवारिक)' },
    { id: 'criminal', label: 'Criminal Law (आपराधिक)' },
    { id: 'consumer', label: 'Consumer & Fraud (उपभोक्ता)' },
    { id: 'labour', label: 'Labour & Employment (रोजगार)' },
    { id: 'civil', label: 'Civil Litigation (सिविल)' },
  ];

  const filteredLawyers = lawyers.filter((lawyer) => {
    const fullName = lawyer.profile?.full_name || 'Advocate';
    const city = lawyer.profile?.city || '';
    const state = lawyer.profile?.state || '';
    const barNo = lawyer.bar_council_number || '';
    const specialties = (lawyer.specialty || []).join(' ').toLowerCase();

    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      barNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialties.includes(searchQuery.toLowerCase());

    if (selectedCategory === 'all') return matchesSearch;

    const matchesCategory = specialties.includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });


  // Render Shared Overlay Modals & Toasts
  const renderModals = () => (
    <>
      {/* TOAST NOTICE BANNER */}
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

      {/* REQUEST CONSULTATION MODAL */}
      {requestModalLawyer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <Logo variant="dark" />
              </div>
              <button
                onClick={() => setRequestModalLawyer(null)}
                className="p-2 hover:bg-[#F1F5F9] rounded-xl text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Lawyer Info Badge */}
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center gap-3">
                <img
                  src={
                    requestModalLawyer.profile_photo_url ||
                    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80'
                  }
                  alt="Lawyer"
                  className="w-12 h-12 rounded-xl object-cover border border-[#CBD5E1]"
                />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-[#0F172A]">
                    Adv. {requestModalLawyer.profile?.full_name || 'Advocate'}
                  </p>
                  <p className="text-[#D97706] font-semibold">
                    {requestModalLawyer.specialty?.[0] || 'Legal Specialist'} • Bar Reg: {requestModalLawyer.bar_council_number || 'Verified'}
                  </p>
                  <p className="text-[#64748B] text-[11px]">
                    {requestModalLawyer.profile?.city || 'Delhi'}, {requestModalLawyer.profile?.state || 'India'}
                  </p>
                </div>
              </div>

                            {/* SELECT CASE SECTION (Optional) — always shown */}
              {(() => {
                const ACTIVE_CASE_STATUSES = new Set(['ongoing', 'assessed', 'lawyer_connected']);
                const runningCases = userCases.filter((c) => ACTIVE_CASE_STATUSES.has(c.status));
                const activeCaseCount = runningCases.length;
                const isAtCap = activeCaseCount >= 2;

                return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#0F172A] flex items-center justify-between">
                        <span>Select Existing Case (Optional)</span>
                        {runningCases.length > 0 && (
                          <span className="text-[11px] text-[#64748B] font-semibold">{runningCases.length} Case(s)</span>
                        )}
                      </label>
                      
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        <div
                          onClick={() => setSelectedCaseForRequest(null)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                            selectedCaseForRequest === null
                              ? 'bg-[#FEF3C7] border-[#D97706] shadow-2xs ring-1 ring-[#D97706]'
                              : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-[#0F172A]">None — describe it below instead</span>
                            <p className="text-[11px] text-[#64748B]">Skip case selection and just describe your issue</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            selectedCaseForRequest === null ? 'border-[#D97706] bg-[#D97706] text-[#FFFFFF]' : 'border-[#CBD5E1]'
                          }`}>
                            {selectedCaseForRequest === null && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                        </div>

                        {runningCases.map((c) => {
                          const isAllotted = c.status === 'lawyer_connected' || Boolean(c.assigned_lawyer_id);
                          const isSelected = selectedCaseForRequest === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                if (isAllotted) {
                                  setToastNotice('Adv. is already allotted for this case. Select an unassigned case or describe a new issue below.');
                                  setTimeout(() => setToastNotice(null), 4000);
                                  return;
                                }
                                setSelectedCaseForRequest(c.id);
                              }}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                                isAllotted
                                  ? 'bg-[#F1F5F9] border-[#CBD5E1] opacity-70 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#FEF3C7] border-[#D97706] shadow-2xs ring-1 ring-[#D97706]'
                                  : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[#0F172A]">{c.title}</span>
                                  <span className="px-2 py-0.5 bg-[#0A1628] text-[#FFFFFF] text-[9px] font-bold rounded-full uppercase">
                                    {c.category}
                                  </span>
                                  {isAllotted && (
                                    <span className="px-2 py-0.5 bg-[#10B981] text-[#FFFFFF] text-[9px] font-bold rounded-full uppercase">
                                      Advocate Allotted
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#64748B] line-clamp-1">
                                  {c.ai_summary || c.citizen_note || 'Identified in AI Consultation Chat'}
                                </p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected ? 'border-[#D97706] bg-[#D97706] text-[#FFFFFF]' : 'border-[#CBD5E1]'
                              }`}>
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                );
              })()}

              {/* CATEGORY DROPDOWN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] block">
                  Issue Category
                </label>
                <select
                  value={requestCategory}
                  onChange={(e) => setRequestCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706] cursor-pointer"
                >
                  <option value="Property & Land Dispute">Property & Land Dispute</option>
                  <option value="Tenant/Rent Issue">Tenant/Rent Issue</option>
                  <option value="Family & Divorce">Family & Divorce</option>
                  <option value="Consumer & Fraud">Consumer & Fraud</option>
                  <option value="Labour & Employment">Labour & Employment</option>
                  <option value="Other">Other</option>
                </select>
              </div>

{/* Account Linked Contact Info */}
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex items-center justify-between text-xs">
                <span className="text-[#64748B] font-medium">Account Linked Contact:</span>
                <span className="font-bold text-[#0F172A]">{currentUser?.email || 'Attached with Account'}</span>
              </div>

              {/* Case Note / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0F172A] block">
                  Describe Your Issue (used to help the advocate understand your case)
                </label>
                <textarea
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Describe your legal issue in detail — what happened, who is involved, what outcome you want..."
                  className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706] resize-none"
                />
                {!selectedCaseForRequest && requestNote.trim().length > 0 && requestNote.trim().length < 15 && (
                  <p className="text-[11px] text-[#D97706] font-medium">Add a bit more detail so the advocate can help faster</p>
                )}
              </div>
            </div>

              {/* Active Case Cap Warning */}
              {userCases.filter((c) => ['ongoing', 'assessed', 'lawyer_connected'].includes(c.status)).length >= 2 && !selectedCaseForRequest && (
                <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span className="text-[11px] font-bold text-[#92400E]">
                    You have 2 active cases. Select an existing case above or close one before sending a new request.
                  </span>
                </div>
              )}

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setRequestModalLawyer(null)}
                className="px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              {(() => {
                const hasCase = Boolean(selectedCaseForRequest);
                const hasDescription = requestNote.trim().length > 0;
                const canSend = hasCase || hasDescription;
                return (
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={() => handleConfirmSendRequest(requestModalLawyer.id)}
                    className={`px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-md ${
                      canSend
                        ? 'bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] cursor-pointer'
                        : 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Request</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewingLawyer && (
        <ReviewModal
          lawyerId={reviewingLawyer.id}
          lawyerName={reviewingLawyer.profile?.full_name || 'Advocate'}
          citizenId={currentUser?.userId || 'guest_citizen'}
          lawyerPhotoUrl={reviewingLawyer.profile_photo_url}
          specialty={reviewingLawyer.specialty}
          onClose={() => setReviewingLawyer(null)}
          onSuccess={() => {
            setToastNotice('⭐ Dhanyawad! Aapka advocate review safaltapoorvak darj ho gaya hai.');
            setTimeout(() => setToastNotice(null), 4000);
            if (selectedLawyer?.id) {
              fetchLawyerReviews(selectedLawyer.id)
                .then((revs) => setSelectedLawyerReviews(revs || []))
                .catch(() => {});
            }
          }}
        />
      )}
    </>
  );

  // -------------------------------------------------------------
  // SCREEN 2: ADVOCATE DETAIL PROFILE (when selectedLawyer !== null)
  // -------------------------------------------------------------
  if (selectedLawyer) {
    const lawyerId = selectedLawyer.id;
    const reqStatus = requestStatuses[lawyerId] || 'none';
    const lawyerName = selectedLawyer.profile?.full_name || 'Advocate Profile';
    const lawyerCity = selectedLawyer.profile?.city || 'Delhi';
    const lawyerState = selectedLawyer.profile?.state || 'India';
    const photo =
      selectedLawyer.profile_photo_url ||
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
        {/* TOP BAR HEADER */}
        <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <button
            onClick={() => setSelectedLawyer(null)}
            className="flex items-center gap-2 text-xs font-bold text-[#0F172A] hover:text-[#2563EB] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Advocates Directory (वकील सूची)</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const shareUrl = window.location.origin + '/lawyers/' + selectedLawyer?.id;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  setToastNotice('Link copied to clipboard!');
                  setTimeout(() => setToastNotice(null), 3000);
                }).catch(() => {
                  setToastNotice('Failed to copy link');
                  setTimeout(() => setToastNotice(null), 3000);
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl cursor-pointer border border-[#CBD5E1]"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer border transition-colors ${
                isSaved
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                  : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border-[#CBD5E1]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#DC2626]' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* MAIN DETAIL CONTAINER */}
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          
          {/* REQUEST STATUS BANNER */}
          {reqStatus === 'pending' && (
            <div className="bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] p-4 rounded-2xl flex items-center gap-3 shadow-xs">
              <Clock className="w-5 h-5 text-[#D97706] shrink-0 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold text-[#78350F]">Consultation Request Sent to Adv. {lawyerName} (अनुरोध भेजा गया)</p>
                <p className="text-[11px] text-[#B45309]">Request sent to advocate's portal. Waiting for advocate response.</p>
              </div>
            </div>
          )}

          {reqStatus === 'accepted' && (
            <div className="bg-[#DCFCE7] border border-[#86EFAC] text-[#166534] p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-[#14532D]">Request Accepted by Adv. {lawyerName}! (अनुरोध स्वीकृत)</p>
                  <p className="text-[11px] text-[#15803D]">You are now directly connected. Click "Message Advocate" to chat.</p>
                </div>
              </div>
              <button
                onClick={() => onGoToMessages?.(selectedLawyer?.id)}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] text-xs font-extrabold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Advocate Now</span>
              </button>
            </div>
          )}

          {/* TOP PROFILE BANNER CARD */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 md:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Photo & Info */}
              <div className="flex items-start md:items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-[#CBD5E1] shadow-md bg-[#F1F5F9]">
                    <img src={photo} alt={lawyerName} className="w-full h-full object-cover" />
                  </div>
                  {selectedLawyer.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#2563EB] text-[#FFFFFF] border-2 border-[#FFFFFF] flex items-center justify-center text-xs font-bold shadow-xs">
                      ✓
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl md:text-2xl font-extrabold text-[#0F172A]">
                    Adv. {lawyerName}
                  </h1>
                  <p className="text-xs font-bold text-[#D97706]">
                    {selectedLawyer.specialty?.[0] || 'Legal Specialist'} • Reg: {selectedLawyer.bar_council_number || 'Verified'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] pt-1">
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-[#0F172A]" />
                      <span>{selectedLawyer.years_experience || 10}+ Years Exp</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0F172A]" />
                      <span>{lawyerCity}, {lawyerState}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#0F172A]" />
                      <span>Hindi, English</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 self-start md:self-center w-full md:w-auto">
                {reqStatus === 'none' && (
                  <button
                    onClick={() => handleOpenRequestModal(selectedLawyer)}
                    className="w-full sm:w-auto px-5 py-3 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer text-center"
                  >
                    Send Consultation Request (अनुरोध भेजें)
                  </button>
                )}

                {reqStatus === 'pending' && (
                  <div className="px-4 py-2 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-xs font-extrabold rounded-2xl flex items-center gap-1.5">
                    <Clock className="w-4 h-4 animate-spin text-[#D97706]" />
                    <span>Request Pending...</span>
                  </div>
                )}

                {reqStatus === 'accepted' && (
                  <button
                    onClick={() => onGoToMessages?.(selectedLawyer?.id)}
                    className="w-full sm:w-auto px-5 py-3 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Advocate (बातचीत करें)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Specialty Tag Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#E2E8F0]">
              {(selectedLawyer.specialty || ['Property Law', 'Civil Disputes']).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[#F1F5F9] text-[#0F172A] text-xs font-bold rounded-full border border-[#E2E8F0]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* STAT METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-[#64748B]">Cases Handled</p>
              <p className="text-2xl font-extrabold text-[#0F172A]">{selectedLawyer.total_cases_handled || 50}+</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-[#64748B]">Success Rate</p>
              <p className="text-2xl font-extrabold text-[#0F172A]">94%</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-[#64748B]">Client Rating</p>
              <p className="text-2xl font-extrabold text-[#D97706]">{selectedLawyer.rating_avg || 4.9} ★</p>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-1 text-center sm:text-left">
              <p className="text-xs font-bold text-[#64748B]">Consultation Fee</p>
              <p className="text-sm font-extrabold text-[#0F172A]">{selectedLawyer.consultation_fee_range || '₹1,500 / session'}</p>
            </div>
          </div>

          {/* MAIN SPLIT CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT TABS NAVIGATION & CONTENT (8 cols) */}
            <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 shadow-2xs space-y-6">
              <div className="flex items-center gap-6 border-b border-[#E2E8F0] text-xs font-bold">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`pb-3 border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'about'
                      ? 'border-[#D97706] text-[#0F172A]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  About Advocate
                </button>

                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-3 border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-[#D97706] text-[#0F172A]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Reviews
                </button>

                <button
                  onClick={() => setActiveTab('stories')}
                  className={`pb-3 border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'stories'
                      ? 'border-[#D97706] text-[#0F172A]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Success Stories
                </button>

                <button
                  onClick={() => setActiveTab('faqs')}
                  className={`pb-3 border-b-2 cursor-pointer transition-colors ${
                    activeTab === 'faqs'
                      ? 'border-[#D97706] text-[#0F172A]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  FAQs
                </button>
              </div>

              {activeTab === 'about' && (
                <div className="space-y-4 text-xs text-[#334155] leading-relaxed">
                  <p>{selectedLawyer.bio || `Adv. ${lawyerName} is an experienced Advocate registered with Bar Council. Specializing in legal consultation, documentation verification, and Court litigation representation.`}</p>
                  <div className="pt-2 border-t border-[#F1F5F9] space-y-1">
                    <p className="font-bold text-[#0F172A]">Bar Council Reg. Number: {selectedLawyer.bar_council_number}</p>
                    <p className="text-[#64748B]">Practicing Courts: District Courts, High Court & Tribunals</p>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-3 text-xs text-[#334155]">
                  <div className="flex items-center justify-between bg-[#FFFBEB] p-3 rounded-2xl border border-[#FDE68A]">
                    <div>
                      <h4 className="font-extrabold text-[#0F172A]">Client Reviews & Feedback</h4>
                      <p className="text-[11px] text-[#D97706]">Rating: {selectedLawyer.rating_avg || 4.9} ★ ({selectedLawyerReviews.length} Verified Reviews)</p>
                    </div>
                    <button
                      onClick={() => {
                        if (!currentUser?.userId && onRequireAuth) {
                          onRequireAuth();
                          return;
                        }
                        setReviewingLawyer(selectedLawyer);
                      }}
                      className="px-3 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#FFFFFF]" />
                      <span>Write Review</span>
                    </button>
                  </div>

                  {selectedLawyerReviews.length === 0 ? (
                    <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center space-y-1">
                      <p className="font-bold text-[#0F172A]">Be the First to Review Adv. {lawyerName}</p>
                      <p className="text-[11px] text-[#64748B]">Click the "Write Review" button above to share your consultation experience.</p>
                    </div>
                  ) : (
                    selectedLawyerReviews.map((rev) => (
                      <div key={rev.id} className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0F172A]">Verified Citizen</span>
                          <span className="text-[#D97706] font-bold">{rev.rating}.0 ★</span>
                        </div>
                        {rev.review_text && <p>{rev.review_text}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'stories' && (
                <div className="space-y-2 text-xs text-[#334155]">
                  <p className="font-bold text-[#0F172A]">Property & Land Dispute Resolution</p>
                  <p>Successfully resolved ancestral property partition & boundary dispute through mediation and High Court writ petition.</p>
                </div>
              )}

              {activeTab === 'faqs' && (
                <div className="space-y-2 text-xs text-[#334155]">
                  <p className="font-bold text-[#0F172A]">Q: What documents are needed for first consultation?</p>
                  <p>A: Bring relevant deeds, mutation copies, notices, and ID proof.</p>
                </div>
              )}
            </div>

            {/* RIGHT BOOK CONSULTATION CARD (4 cols) */}
            <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 shadow-2xs space-y-5">
              <h2 className="text-sm font-bold text-[#0F172A]">Book Consultation Slot</h2>

              <div className="space-y-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
                  <span>Available Dates</span>
                  <span>Aug 2026</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#64748B] font-semibold pt-1">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#0F172A]">
                  {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                        selectedDate === day
                          ? 'bg-[#D97706] text-[#FFFFFF] font-extrabold shadow-xs'
                          : 'hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-[#0F172A]">Select Time</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['10:00 AM', '11:00 AM', '04:00 PM', '05:00 PM'].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-3 rounded-xl font-bold border transition-colors cursor-pointer ${
                        selectedTime === slot
                          ? 'bg-[#D97706] text-[#FFFFFF] border-[#D97706] shadow-xs'
                          : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {reqStatus === 'none' && (
                <button
                  onClick={() => handleOpenRequestModal(selectedLawyer)}
                  className="w-full py-3 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                >
                  Send Consultation Request
                </button>
              )}

              {reqStatus === 'pending' && (
                <button
                  disabled
                  className="w-full py-3 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold text-xs rounded-xl cursor-not-allowed text-center"
                >
                  Request Pending Advocate Approval
                </button>
              )}

              {reqStatus === 'accepted' && (
                <button
                  onClick={() => onGoToMessages?.(selectedLawyer?.id)}
                  className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Start Direct Advocate Chat</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {renderModals()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // SCREEN: MY REQUESTS (when showMyRequests is true)
  // -------------------------------------------------------------
  if (showMyRequests) {
    const statusColors: Record<string, string> = {
      requested: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
      accepted: 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]',
      rejected: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
      completed: 'bg-[#F0F9FF] text-[#1E40AF] border-[#BAE6FD]',
    };
    const statusLabels: Record<string, string> = {
      requested: 'Pending',
      accepted: 'Accepted',
      rejected: 'Declined',
      completed: 'Completed',
    };

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
        <div className="bg-[#0A1628] text-[#FFFFFF] py-3.5 px-4 md:px-8 border-b border-[#1E293B] shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setShowMyRequests(false)}
              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#FFFFFF] rounded-xl cursor-pointer shrink-0 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-extrabold text-[#FFFFFF] tracking-tight">My Advocate Requests</h1>
              <p className="text-[11px] text-[#94A3B8]">Track your pending, accepted, and declined consultation requests.</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
          {myRequests.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-[#94A3B8] mx-auto" />
              <p className="text-sm font-bold text-[#0F172A]">No Requests Yet</p>
              <p className="text-xs text-[#64748B]">Send a consultation request to an advocate to see it here.</p>
              <button
                onClick={() => setShowMyRequests(false)}
                className="px-4 py-2 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer"
              >
                Browse Advocates
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((conn: any) => {
                const lawyer = conn.lawyer;
                const lawyerName = lawyer?.profile?.full_name || 'Advocate';
                const caseData = conn.case;
                const caseTitle = caseData?.title || 'Legal Consultation';
                const reqNote = conn.request_note || caseData?.citizen_note || '';
                const status = conn.status || 'requested';
                const createdAt = conn.requested_at
                  ? new Date(conn.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '';
                const statusBadge = statusColors[status] || statusColors.requested;
                const statusLabel = statusLabels[status] || status;

                return (
                  <div key={conn.id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#CBD5E1] shrink-0 bg-[#F1F5F9]">
                          <img
                            src={lawyer?.profile_photo_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80'}
                            alt={lawyerName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-[#0F172A] truncate">Adv. {lawyerName}</p>
                          <p className="text-[11px] text-[#64748B] truncate">{caseTitle}</p>
                          {reqNote && (
                            <p className="text-[11px] text-[#94A3B8] line-clamp-1 italic">{reqNote}</p>
                          )}
                        </div>
                      </div>
                      <span className={"px-2.5 py-1 text-[10px] font-bold rounded-lg border shrink-0 " + statusBadge}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
                      <span className="text-[10px] text-[#94A3B8]">{createdAt}</span>
                      {(status === 'accepted' || status === 'requested') && (
                        <button
                          onClick={() => {
                            setShowMyRequests(false);
                            onGoToMessages?.(lawyer?.id);
                          }}
                          className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Open Chat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 3: ADVOCATES DIRECTORY LIST (Default view when selectedLawyer === null)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* COMPACT SLEEK HEADER BANNER */}
      <div className="bg-[#0A1628] text-[#FFFFFF] py-3.5 px-4 md:px-8 border-b border-[#1E293B] shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#FFFFFF] rounded-xl cursor-pointer shrink-0 transition-colors"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-extrabold text-[#FFFFFF] tracking-tight">
                  Find & Contact Verified Advocates
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-[#1E293B] border border-[#334155] text-[#F59E0B] text-[10px] font-bold rounded-full">
                  ⚖️ Verified Directory
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] hidden md:block">
                Select an advocate for your legal case or let AI auto-assign the best match.
              </p>
            </div>
          </div>

          {/* Right Sleek Compact Search Bar */}
          <div className="relative w-full md:w-80 shrink-0 flex items-center gap-2">
            <button
              onClick={() => {
                loadMyRequests();
                setShowMyRequests(true);
              }}
              className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#FFFFFF] text-xs font-bold rounded-xl border border-[#334155] hover:border-[#D97706] cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>My Requests</span>
            </button>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, city, court..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-[#1E293B] border border-[#334155] rounded-xl text-xs text-[#FFFFFF] placeholder-[#64748B] focus:outline-none focus:border-[#D97706]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[10px] font-bold text-[#94A3B8] hover:text-[#FFFFFF]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0A1628] text-[#FFFFFF] border-[#0A1628] shadow-xs'
                  : 'bg-[#FFFFFF] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* LAWYERS LISTING GRID */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        <div className="flex items-center justify-between pb-4">
          <p className="text-xs font-bold text-[#64748B]">
            Showing <span className="text-[#0F172A]">{filteredLawyers.length}</span> Advocates in Bar Directory
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-[#64748B]">
            Loading advocates directory from Bar Council network...
          </div>
        ) : filteredLawyers.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3">
            <User className="w-10 h-10 text-[#94A3B8] mx-auto" />
            <p className="text-sm font-bold text-[#0F172A]">No Advocates Found</p>
            <p className="text-xs text-[#64748B]">Try searching with a different court, city, or practice area.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-4 py-2 bg-[#F1F5F9] text-[#0F172A] text-xs font-bold rounded-xl hover:bg-[#E2E8F0]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLawyers.map((lawyer) => {
              const reqStatus = requestStatuses[lawyer.id] || 'none';
              const name = lawyer.profile?.full_name || 'Advocate Profile';
              const city = lawyer.profile?.city || 'Delhi';
              const state = lawyer.profile?.state || 'India';
              const photo =
                lawyer.profile_photo_url ||
                'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';

              return (
                <div
                  key={lawyer.id}
                  onClick={() => setSelectedLawyer(lawyer)}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#D97706] rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-4">
                    {/* Header Photo & Info */}
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={photo}
                          alt={name}
                          className="w-16 h-16 rounded-xl object-cover border border-[#CBD5E1] bg-[#F1F5F9]"
                        />
                        {lawyer.verification_status === 'verified' ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#2563EB] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center border border-[#FFFFFF]" title="Verified Advocate">
                            ✓
                          </span>
                        ) : lawyer.verification_status === 'rejected' ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#DC2626] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center border border-[#FFFFFF]" title="Verification rejected">
                            ✕
                          </span>
                        ) : (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#F59E0B] text-[#FFFFFF] text-[10px] font-bold flex items-center justify-center border border-[#FFFFFF]" title="Verification pending">
                            …
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h3 className="text-sm font-extrabold text-[#0F172A] group-hover:text-[#D97706] transition-colors truncate">
                          Adv. {name}
                        </h3>
                        <p className="text-[11px] font-bold text-[#D97706] truncate">
                          {lawyer.specialty?.[0] || 'Legal Advocate'}
                        </p>
                        <p className="text-[10px] text-[#64748B] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#64748B]" />
                          <span>{city}, {state}</span>
                        </p>
                      </div>
                    </div>

                    {/* Request badge if sent */}
                    {reqStatus === 'pending' && (
                      <div className="bg-[#FEF3C7] text-[#92400E] text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 animate-spin text-[#D97706]" />
                        <span>Request Sent (Pending Approval)</span>
                      </div>
                    )}

                    {reqStatus === 'accepted' && (
                      <div className="bg-[#DCFCE7] text-[#166534] text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Request Accepted (Ready to Message)</span>
                      </div>
                    )}

                    {/* Stats Pill Row */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F1F5F9] text-xs">
                      <div className="bg-[#F8FAFC] p-2 rounded-lg text-center">
                        <p className="text-[10px] text-[#64748B]">Experience</p>
                        <p className="font-extrabold text-[#0F172A]">{lawyer.years_experience || 10}+ Yrs</p>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded-lg text-center">
                        <p className="text-[10px] text-[#64748B]">Rating</p>
                        <p className="font-extrabold text-[#D97706]">{lawyer.rating_avg || 4.9} ★ <span className="text-[#94A3B8] font-semibold text-[10px]">({lawyer.review_count || 0})</span></p>
                      </div>
                    </div>

                    {/* Specialties tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(lawyer.specialty || ['Property', 'Civil']).slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-0.5 bg-[#F1F5F9] text-[#334155] text-[10px] font-bold rounded-md border border-[#E2E8F0]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-[#64748B]">Consultation</p>
                      <p className="text-xs font-bold text-[#0F172A]">{lawyer.consultation_fee_range || '₹1,500 / session'}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {reqStatus === 'none' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenRequestModal(lawyer);
                          }}
                          className="px-2.5 py-1.5 bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          Request
                        </button>
                      )}

                      {reqStatus === 'pending' && (
                        <span className="px-2 py-1.5 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold rounded-xl border border-[#FDE68A] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#D97706]" />
                          <span>Pending</span>
                        </span>
                      )}

                      {reqStatus === 'accepted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGoToMessages?.(lawyer.id);
                          }}
                          className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-[#FFFFFF] text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                          title="Direct Message Advocate"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!currentUser?.userId && onRequireAuth) {
                            onRequireAuth();
                            return;
                          }
                          setReviewingLawyer(lawyer);
                        }}
                        className="px-2 py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Rate & Review Advocate"
                      >
                        <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                        <span>Rate</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLawyer(lawyer);
                        }}
                        className="px-2.5 py-1.5 bg-[#0A1628] hover:bg-[#D97706] text-[#FFFFFF] text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renderModals()}
    </div>
  );
};
