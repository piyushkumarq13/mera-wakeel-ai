import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language, UserRole } from '../../../types';
import {
  fetchLawyerConnectionsForCitizen,
  fetchLawyerConnectionsForLawyer,
  markMessagesAsRead,
} from '../../../lib/supabase';
import {
  isConnectionAccepted,
} from '../../../lib/db/status';
import {
  CONNECTION_STATUS_LABELS,
} from '../../../lib/constants';
import { DirectMessagePanel } from './DirectMessagePanel';
import {
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  Search,
  Users,
} from 'lucide-react';
import type { LawyerConnection } from '../../../types/database';

interface MessagesViewProps {
  language: Language;
  currentUser: {
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  };
  onBackToHome: () => void;
  initialConnectionId?: string;
}

interface Conversation {
  connectionId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyPhoto: string | null;
  otherPartyPhone: string | null;
  barCouncilNumber: string | null;
  city: string | null;
  status: string;
  caseTitle: string | null;
  caseStatus: string | null;
  requestNote: string | null;
  requestedAt: string | null;
}

interface ConversationGroup {
  otherPartyId: string;
  otherPartyName: string;
  otherPartyPhoto: string | null;
  otherPartyPhone: string | null;
  barCouncilNumber: string | null;
  city: string | null;
  cases: Conversation[];
  primaryIndex: number;
}

function mapConnectionForCitizen(conn: LawyerConnection): Conversation {
  const lawyerProfile = conn.lawyer?.profile;
  return {
    connectionId: conn.id,
    otherPartyId: conn.lawyer_id,
    otherPartyName: lawyerProfile?.full_name || conn.lawyer?.id || 'Unknown Advocate',
    otherPartyPhoto: conn.lawyer?.profile_photo_url || null,
    otherPartyPhone: lawyerProfile?.phone || null,
    barCouncilNumber: conn.lawyer?.bar_council_number || null,
    city: lawyerProfile?.city || null,
    status: conn.status,
    caseTitle: conn.case?.title || null,
    caseStatus: (conn.case as any)?.status || null,
    requestNote: conn.request_note || conn.case?.citizen_note || null,
    requestedAt: conn.requested_at || null,
  };
}

function mapConnectionForLawyer(conn: LawyerConnection): Conversation {
  const citizenProfile = conn.citizen_profile;
  return {
    connectionId: conn.id,
    otherPartyId: conn.citizen_id,
    otherPartyName: citizenProfile?.full_name || conn.citizen_id?.slice(0, 8) || 'Client',
    otherPartyPhoto: citizenProfile?.phone ? null : null,
    otherPartyPhone: citizenProfile?.phone || null,
    barCouncilNumber: null,
    city: citizenProfile?.city || null,
    status: conn.status,
    caseTitle: conn.case?.title || null,
    caseStatus: (conn.case as any)?.status || null,
    requestNote: conn.request_note || conn.case?.citizen_note || null,
    requestedAt: conn.requested_at || null,
  };
}

const STATUS_PRIORITY: Record<string, number> = {
  accepted: 0,
  completed: 0,
  requested: 1,
  rejected: 2,
};

function pickPrimaryCase(cases: Conversation[]): number {
  const CASE_SCORE: Record<string, number> = {
    ongoing: 0,
    assessed: 0,
    lawyer_connected: 0,
    requested: 5,
    pending: 5,
    closed: 10,
    resolved: 10,
  };

  let bestIdx = 0;
  let bestScore = Infinity;
  let bestTime = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const cs = CASE_SCORE[c.caseStatus || ''] ?? 15;
    const ss = (STATUS_PRIORITY[c.status] ?? 3) * 0.1;
    const score = cs + ss;
    const time = c.requestedAt ? new Date(c.requestedAt).getTime() : 0;

    if (score < bestScore || (score === bestScore && time > bestTime)) {
      bestScore = score;
      bestTime = time;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function groupConversations(convs: Conversation[]): ConversationGroup[] {
  const byParty = new Map<string, Conversation[]>();
  for (const conv of convs) {
    const arr = byParty.get(conv.otherPartyId) || [];
    arr.push(conv);
    byParty.set(conv.otherPartyId, arr);
  }

  const groups: ConversationGroup[] = [];
  for (const [, cases] of byParty) {
    groups.push({
      otherPartyId: cases[0].otherPartyId,
      otherPartyName: cases[0].otherPartyName,
      otherPartyPhoto: cases[0].otherPartyPhoto,
      otherPartyPhone: cases[0].otherPartyPhone,
      barCouncilNumber: cases[0].barCouncilNumber,
      city: cases[0].city,
      cases,
      primaryIndex: pickPrimaryCase(cases),
    });
  }

  groups.sort((a, b) => {
    const ac = a.cases[a.primaryIndex];
    const bc = b.cases[b.primaryIndex];
    const pa = STATUS_PRIORITY[ac.status] ?? 3;
    const pb = STATUS_PRIORITY[bc.status] ?? 3;
    if (pa !== pb) return pa - pb;
    const da = ac.requestedAt ? new Date(ac.requestedAt).getTime() : 0;
    const db = bc.requestedAt ? new Date(bc.requestedAt).getTime() : 0;
    return db - da;
  });

  return groups;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'requested':
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

function caseStatusBadge(status: string | null): { label: string; color: string } {
  switch (status) {
    case 'ongoing':
      return { label: 'Active', color: 'bg-blue-100 text-blue-700' };
    case 'assessed':
      return { label: 'Assessed', color: 'bg-indigo-100 text-indigo-700' };
    case 'lawyer_connected':
      return { label: 'Connected', color: 'bg-emerald-100 text-emerald-700' };
    case 'closed':
      return { label: 'Closed', color: 'bg-gray-100 text-gray-500' };
    case 'resolved':
      return { label: 'Resolved', color: 'bg-gray-100 text-gray-500' };
    default:
      return { label: status || 'New', color: 'bg-slate-100 text-slate-600' };
  }
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  language,
  currentUser,
  onBackToHome,
  initialConnectionId,
}) => {
  const isLawyer = currentUser?.role === 'lawyer';

  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [activeCaseIdx, setActiveCaseIdx] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!currentUser?.userId) return;
    try {
      const connections = isLawyer
        ? await fetchLawyerConnectionsForLawyer(currentUser.userId)
        : await fetchLawyerConnectionsForCitizen(currentUser.userId);

      const mapFn = isLawyer ? mapConnectionForLawyer : mapConnectionForCitizen;
      const allConvs = connections.map(mapFn);
      const grouped = groupConversations(allConvs);

      setGroups(grouped);

      setSelectedConv((prev) => {
        if (!prev) return null;
        for (const g of grouped) {
          for (const c of g.cases) {
            if (c.connectionId === prev.connectionId) return c;
          }
        }
        return null;
      });
    } catch (err) {
      console.warn('loadConversations error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.userId, isLawyer]);

  useEffect(() => {
    loadConversations();
    pollRef.current = setInterval(loadConversations, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadConversations]);

  useEffect(() => {
    if (!initialConnectionId || selectedConv) return;
    for (const g of groups) {
      for (const c of g.cases) {
        if (c.connectionId === initialConnectionId || c.otherPartyId === initialConnectionId) {
          setSelectedConv(c);
          setActiveCaseIdx((prev) => ({ ...prev, [g.otherPartyId]: g.cases.indexOf(c) }));
          return;
        }
      }
    }
  }, [initialConnectionId, groups, selectedConv]);

  useEffect(() => {
    if (selectedConv && isConnectionAccepted(selectedConv.status)) {
      markMessagesAsRead(selectedConv.connectionId, isLawyer ? 'lawyer' : 'citizen').catch(() => {});
    }
  }, [selectedConv, isLawyer]);

  const handleSelectGroup = (group: ConversationGroup) => {
    const idx = activeCaseIdx[group.otherPartyId] ?? group.primaryIndex;
    setSelectedConv(group.cases[idx]);
  };

  const handleSwitchCase = (group: ConversationGroup, caseIdx: number) => {
    setActiveCaseIdx((prev) => ({ ...prev, [group.otherPartyId]: caseIdx }));
    setSelectedConv(group.cases[caseIdx]);
  };

  const isAccepted = selectedConv ? isConnectionAccepted(selectedConv.status) : false;
  const currentUserType = isLawyer ? 'lawyer' as const : 'citizen' as const;

  const selectedGroup = selectedConv
    ? groups.find((g) => g.cases.some((c) => c.connectionId === selectedConv.connectionId))
    : null;
  const hasMultipleCases = selectedGroup ? selectedGroup.cases.length > 1 : false;

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.otherPartyName.toLowerCase().includes(q) ||
      g.cases.some((c) => (c.caseTitle || '').toLowerCase().includes(q))
    );
  });

  const badge = selectedConv ? caseStatusBadge(selectedConv.caseStatus) : null;

  return (
    <div className="flex-1 flex flex-row min-h-0 overflow-hidden bg-[#F7F7F5] max-h-[calc(100dvh-56px)]">
      {/* ── Left column: conversation list ── */}
      <div
        className={`
          ${selectedConv ? 'hidden' : 'flex flex-col'}
          md:flex md:flex-col md:w-[360px] md:border-r md:border-[#E5E7EB]
          w-full shrink-0 bg-white min-h-0 overflow-hidden
        `}
      >
        {/* Header */}
        <div className="border-b border-[#E5E7EB] p-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors md:hidden"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="p-2 rounded-xl bg-[#1F3864]/10">
              <MessageSquare className="w-5 h-5 text-[#1F3864]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-[#222222]">Messages</h1>
              <p className="text-[11px] text-[#6B7280]">
                {groups.length} conversation{groups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] shrink-0 flex justify-center">
          <div className="relative w-full max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or case..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F7F7F5] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#1F3864] focus:ring-1 focus:ring-[#1F3864]/20 text-[#222222] placeholder-[#6B7280] transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            /* Skeleton loading */
            <div className="p-3 space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                    <div className="h-2.5 bg-gray-200 rounded-full w-1/2" />
                  </div>
                  <div className="h-4 w-12 bg-gray-200 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F7F7F5] flex items-center justify-center mb-4">
                {searchQuery ? (
                  <Search className="w-8 h-8 text-[#6B7280]" />
                ) : (
                  <MessageSquare className="w-8 h-8 text-[#6B7280]" />
                )}
              </div>
              <h3 className="text-base font-bold text-[#222222] mb-1">
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </h3>
              <p className="text-sm text-[#6B7280] max-w-[260px]">
                {searchQuery
                  ? 'Try a different search term.'
                  : isLawyer
                    ? 'Accept a client request to start messaging.'
                    : 'Connect with an advocate to start messaging.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]/50">
              {filteredGroups.map((group) => {
                const idx = activeCaseIdx[group.otherPartyId] ?? group.primaryIndex;
                const display = group.cases[idx] || group.cases[0];
                if (!display) return null;

                const cb = caseStatusBadge(display.caseStatus);
                const isActive = isConnectionAccepted(display.status);
                const isCurrentlySelected = selectedConv?.otherPartyId === group.otherPartyId;
                const multiCount = group.cases.length;

                return (
                  <button
                    key={group.otherPartyId}
                    onClick={() => handleSelectGroup(group)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all
                      ${isCurrentlySelected
                        ? 'bg-[#1F3864]/5 border-l-[3px] border-l-[#1F3864]'
                        : 'border-l-[3px] border-l-transparent hover:bg-gray-50 active:bg-gray-100'
                      }
                    `}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {group.otherPartyPhoto ? (
                        <img
                          src={group.otherPartyPhoto}
                          alt={group.otherPartyName}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1F3864] to-[#2D5291] flex items-center justify-center shadow-sm">
                          <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#22C55E] rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-[#222222] truncate">
                          {group.otherPartyName}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border shrink-0 ${statusBadgeColor(display.status)}`}>
                          {CONNECTION_STATUS_LABELS[display.status] || display.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded ${cb.color}`}>
                          {cb.label}
                        </span>
                        {display.caseTitle && (
                          <span className="text-xs text-[#6B7280] truncate">
                            {display.caseTitle}
                          </span>
                        )}
                      </div>

                      {display.requestNote && (
                        <p className="text-[11px] text-[#6B7280] truncate mt-1">
                          {display.requestNote}
                        </p>
                      )}

                      {multiCount > 1 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#F7F7F5] rounded">
                            <Users className="w-3 h-3 text-[#6B7280]" />
                            <span className="text-[10px] font-semibold text-[#6B7280]">
                              {multiCount} cases
                            </span>
                            <ChevronRight className="w-3 h-3 text-[#6B7280]" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column: chat panel ── */}
      <div
        className={`
          ${selectedConv ? 'flex flex-col' : 'hidden'}
          md:flex md:flex-col md:flex-1 w-full min-h-0
        `}
      >
        {selectedConv ? (
          <DirectMessagePanel
            connectionId={selectedConv.connectionId}
            currentUserId={currentUser.userId}
            currentUserType={currentUserType}
            lawyerId={isLawyer ? currentUser.userId : selectedConv.otherPartyId}
            currentUserName={currentUser.name}
            otherPartyName={selectedConv.otherPartyName}
            otherPartyPhone={selectedConv.otherPartyPhone || undefined}
            caseTitle={selectedConv.caseTitle || undefined}
            disabled={!isAccepted}
            caseClosed={selectedConv.caseStatus === 'closed' || selectedConv.caseStatus === 'resolved'}
            requestNote={selectedConv.requestNote || undefined}
            otherPartyPhoto={selectedConv.otherPartyPhoto}
            barCouncilNumber={selectedConv.barCouncilNumber}
            city={selectedConv.city}
            onBack={() => setSelectedConv(null)}
            caseStatus={selectedConv.caseStatus}
            isAccepted={isAccepted}
            isLawyer={isLawyer}
            connectionStatus={selectedConv.status}
            caseGroups={selectedGroup?.cases.map(c => ({
              connectionId: c.connectionId,
              caseTitle: c.caseTitle,
              caseStatus: c.caseStatus,
            }))}
            onSwitchCase={(idx) => selectedGroup && handleSwitchCase(selectedGroup, idx)}
            activeCaseIndex={selectedGroup ? (activeCaseIdx[selectedGroup.otherPartyId] ?? selectedGroup.primaryIndex) : 0}
            hasMultipleCases={hasMultipleCases}
          />
        ) : (
          /* Desktop placeholder */
          <div className="hidden md:flex flex-col items-center justify-center flex-1 min-h-0 bg-[#F7F7F5]">
            <div className="w-20 h-20 rounded-2xl bg-[#1F3864]/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-[#1F3864]" />
            </div>
            <h3 className="text-lg font-bold text-[#222222] mb-1">Select a conversation</h3>
            <p className="text-sm text-[#6B7280] max-w-[260px] text-center">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function isConnectionPending(status: string): boolean {
  const s = status?.toLowerCase().trim();
  return s === 'requested' || s === 'pending';
}
