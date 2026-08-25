import React, { useState, useEffect } from 'react';
import { Language, NavTab, UserRole } from '../../../types';
import {
  Briefcase,
  FileText,
  Users,
  MessageSquare,
  Clock,
  ChevronRight,
  Plus,
  Download,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { ExportModal, ExportCaseData } from '../../ExportModal';
import { fetchUserCases, fetchCaseDocuments, updateCaseStatus, ACTIVE_CASE_LIMIT } from '../../../lib/supabase';
import { Case } from '../../../types/database';
import { DeadlineTimeline } from '../../DeadlineTimeline';

interface MyCasesViewProps {
  language: Language;
  userId?: string;
  currentUser?: {
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null;
  onStartNewCase: () => void;
  onSelectCase?: (caseId: string) => void;
  onNavigate: (tab: NavTab) => void;
  onViewCaseReport?: (caseId: string) => void;
}

export const MyCasesView: React.FC<MyCasesViewProps> = ({
  language,
  userId,
  currentUser,
  onStartNewCase,
  onSelectCase,
  onNavigate,
  onViewCaseReport,
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'cases'>('dashboard');
  const [exportCaseData, setExportCaseData] = useState<ExportCaseData | null>(null);
  
  const [userCases, setUserCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      id: String(Date.now()),
      sender: 'user',
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: 'Main aapki jaankari note kar rahi hoon. Aap chahein toh aur zaroori documents upload kar sakte hain.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  const [dashboardDocs, setDashboardDocs] = useState<any[]>([]);

  useEffect(() => {
    async function loadCasesAndDocs() {
      const targetUserId = userId || currentUser?.userId || 'guest_citizen';
      try {
        const cases = await fetchUserCases(targetUserId);
        setUserCases(cases);
        if (cases.length > 0) setSelectedCaseId(cases[0].id);

        let allDocsFromDb: any[] = [];
        for (const c of cases) {
          const docs = await fetchCaseDocuments(c.id);
          if (docs && docs.length > 0) {
            allDocsFromDb = [...allDocsFromDb, ...docs];
          }
        }

        let localDocs: any[] = [];
        try {
          const userDocsKey = `mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`;
          const raw = localStorage.getItem(userDocsKey);
          if (raw) localDocs = JSON.parse(raw);
        } catch (e) {}

        const mappedDbDocs = allDocsFromDb.map((d: any) => ({
          id: d.id,
          name: d.file_url ? d.file_url.split('/').pop() || 'Legal Document' : 'Legal Document',
          uploadDate: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: d.is_verified_valid === false ? 'False / Invalid' : 'Verified',
        }));

        const merged = [...localDocs];
        for (const dbDoc of mappedDbDocs) {
          if (!merged.some((m) => m.id === dbDoc.id)) {
            merged.push(dbDoc);
          }
        }
        setDashboardDocs(merged);
      } catch (err) {
        console.warn('Error loading cases or docs in MyCasesView:', err);
      }
    }
    loadCasesAndDocs();
  }, [userId, currentUser?.userId]);

  const activeCase = userCases.find((c) => c.id === selectedCaseId) || userCases[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex flex-col">
      
      {/* Two-tab bar */}
      <div className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 md:px-6">
        <div className="flex gap-1">
          {(['dashboard', 'cases'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSidebarTab(tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer capitalize ${
                activeSidebarTab === tab
                  ? 'border-[#D98800] text-[#D98800]'
                  : 'border-transparent text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {tab === 'dashboard' ? 'Dashboard' : 'My Cases'}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Tab Body */}
        {activeSidebarTab === 'cases' ? (
          <div className="p-6 max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-extrabold text-[#0F172A]">My Cases Directory</h1>
              <button
                onClick={onStartNewCase}
                className="px-4 py-2 bg-[#D98800] hover:bg-[#C27900] text-[#FFFFFF] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Case Consultation</span>
              </button>
            </div>

            {userCases.length === 0 ? (
              <div className="p-8 text-center bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] space-y-3">
                <Briefcase className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <h3 className="text-sm font-bold text-[#0F172A]">No Cases Found</h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  You have not created any cases yet. Click below to start a new case consultation with Mera Wakeel AI.
                </p>
                <button
                  onClick={onStartNewCase}
                  className="px-4 py-2 bg-[#D98800] hover:bg-[#C27900] text-[#FFFFFF] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Consultation</span>
                </button>
              </div>
            ) : (
              <>
                <DeadlineTimeline
                  language={language}
                  citizenId={userId || currentUser?.userId}
                  caseId={userCases[0]?.id || null}
                  title="Court Deadlines"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userCases.map((c) => (
                  <div key={c.id} className="p-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A]">{c.title}</span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        c.status === 'resolved' || c.status === 'closed'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {c.status || 'In Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B]">Case ID: {c.id.slice(0, 12)} • {c.category.toUpperCase()}</p>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {c.ai_summary || 'Legal consultation undergoing via Mera Wakeel AI.'}
                    </p>
                    <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9]">
                      <span className="text-[10px] text-[#94A3B8]">
                        Created: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently'}
                      </span>
                      <div className="flex items-center gap-2">
                        {c.status !== 'closed' && c.status !== 'resolved' && (
                          <button
                            onClick={async () => {
                              const citizenId = userId || currentUser?.userId || 'guest_citizen';
                              await updateCaseStatus(c.id, citizenId, 'closed');
                              setUserCases((prev) => prev.map((item) => item.id === c.id ? { ...item, status: 'closed' } : item));
                            }}
                            className="text-[11px] font-bold text-[#DC2626] hover:bg-[#FEF2F2] px-2 py-0.5 rounded-lg transition-all cursor-pointer border border-[#FECACA]"
                          >
                            Close Case (केस बंद करें)
                          </button>
                        )}
                        {c.status === 'closed' && (() => {
                          const activeCount = userCases.filter((uc) => ['ongoing', 'assessed', 'lawyer_connected'].includes(uc.status)).length;
                          const canReopen = activeCount < ACTIVE_CASE_LIMIT;
                          return (
                            <button
                              onClick={async () => {
                                if (!canReopen) {
                                  alert(language === 'hi' ? 'Aapke paas pehle se 2 active cases hain. Pehle koi active case close karein.' : 'You already have 2 active cases. Close an existing active case first.');
                                  return;
                                }
                                const citizenId = userId || currentUser?.userId || 'guest_citizen';
                                await updateCaseStatus(c.id, citizenId, 'ongoing');
                                setUserCases((prev) => prev.map((item) => item.id === c.id ? { ...item, status: 'ongoing' } : item));
                              }}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all cursor-pointer border flex items-center gap-1 ${
                                canReopen
                                  ? 'text-[#16A34A] hover:bg-[#DCFCE7] border-[#BBF7D0]'
                                  : 'text-[#94A3B8] bg-[#F1F5F9] border-[#E2E8F0] cursor-not-allowed'
                              }`}
                              title={canReopen ? 'Reopen this case' : 'At max active cases (2). Close one first.'}
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          );
                        })()}
                        <button
                          onClick={() => onSelectCase?.(c.id)}
                          className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Case Chat</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onViewCaseReport?.(c.id)}
                          className="text-[11px] font-bold text-[#16A34A] hover:bg-[#DCFCE7] px-2 py-0.5 rounded-lg transition-all cursor-pointer border border-[#BBF7D0] flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View Report</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* DEFAULT: CITIZEN DASHBOARD */
          <>
            {/* Welcome Banner */}
            <div className="p-6 pb-2">
              <h1 className="text-2xl font-extrabold text-[#0F172A] flex items-center gap-2">
                Welcome back, {currentUser?.name && currentUser.name.trim().length > 0 ? currentUser.name : currentUser?.email ? currentUser.email.split('@')[0] : 'Citizen'} <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                {currentUser?.email ? `Logged in as: ${currentUser.email}` : 'Yahan aapke case ki puri progress hai.'}
              </p>
            </div>

        {/* 3-COLUMN DASHBOARD GRID */}
        <div className="p-6 pt-3 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* COLUMN 1 */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Active Case Card */}
            {userCases.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3 text-center">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-[#0F172A]">No Active Cases</h2>
                <p className="text-xs text-[#64748B]">
                  Start an AI consultation to create your first legal case.
                </p>
                <button
                  onClick={onStartNewCase}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#FFFFFF] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Start AI Consultation
                </button>
              </div>
            ) : (
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#0F172A]">{activeCase?.title || 'Active Legal Case'}</h2>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Case ID: {activeCase?.id ? activeCase.id.slice(0, 12) : 'MW-2024'}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold rounded-full uppercase">
                    {activeCase?.status || 'In Progress'}
                  </span>
                </div>

                {/* Stepper Timeline */}
                {(() => {
                  const st = activeCase?.status || 'ongoing';
                  const isLawyerConnected = st === 'lawyer_connected';
                  const isClosed = st === 'resolved' || st === 'closed';
                  const isAssessed = isClosed || isLawyerConnected || st === 'assessed';
                  const step2Done = isClosed || isLawyerConnected || st === 'docs_verified';
                  
                  const stepClass = (done: boolean, active: boolean) =>
                    done
                      ? 'w-6 h-6 rounded-full bg-[#16A34A] text-[#FFFFFF] text-xs font-bold flex items-center justify-center'
                      : active
                      ? 'w-6 h-6 rounded-full bg-[#D97706] text-[#FFFFFF] text-xs font-bold flex items-center justify-center'
                      : 'w-6 h-6 rounded-full bg-[#E2E8F0] text-[#94A3B8] text-xs font-bold flex items-center justify-center';
                  const labelClass = (done: boolean, active: boolean) =>
                    done ? 'text-[9px] text-[#16A34A] font-medium' : active ? 'text-[9px] text-[#D97706] font-medium' : 'text-[9px] text-[#94A3B8]';
                  const textClass = (done: boolean) =>
                    done ? 'text-[10px] font-bold text-[#0F172A]' : 'text-[10px] font-bold text-[#94A3B8]';

                  return (
                    <div className="pt-2 pb-1 relative">
                      <div className="flex items-center justify-between text-center relative z-10">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={stepClass(true, false)}>✓</span>
                          <p className={textClass(true)}>Problem Shared</p>
                          <p className={labelClass(true, false)}>Completed</p>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <span className={stepClass(step2Done, !step2Done)}>
                            {step2Done ? '✓' : '●'}
                          </span>
                          <p className={textClass(step2Done)}>Docs Verified</p>
                          <p className={labelClass(step2Done, !step2Done)}>
                            {step2Done ? 'Completed' : 'In Progress'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <span className={stepClass(isAssessed, false)}>
                            {isAssessed ? '✓' : '○'}
                          </span>
                          <p className={textClass(isAssessed)}>Case Assessed</p>
                          <p className={labelClass(isAssessed, false)}>
                            {isAssessed ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <span className={stepClass(isLawyerConnected || isClosed, false)}>
                            {isLawyerConnected || isClosed ? '✓' : '○'}
                          </span>
                          <p className={textClass(isLawyerConnected || isClosed)}>Lawyer Connected</p>
                          <p className={labelClass(isLawyerConnected || isClosed, false)}>
                            {isLawyerConnected || isClosed ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* AI Summary Card */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0F172A]">AI Summary</span>
                    <button onClick={() => setActiveSidebarTab('cases')} className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer">View Details</button>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {activeCase?.ai_summary || 'Legal advice requested via Mera Wakeel AI platform.'}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-[#0F172A]">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onNavigate('documents')}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#2563EB] p-3 rounded-xl text-left space-y-1 shadow-2xs transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-[#2563EB]" />
                  <p className="text-xs font-bold text-[#0F172A]">Upload Document</p>
                  <p className="text-[10px] text-[#64748B]">Add new document</p>
                </button>

                <button
                  onClick={() => onNavigate('chat')}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#2563EB] p-3 rounded-xl text-left space-y-1 shadow-2xs transition-all cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 text-[#2563EB]" />
                  <p className="text-xs font-bold text-[#0F172A]">Continue Chat</p>
                  <p className="text-[10px] text-[#64748B]">Continue with AI</p>
                </button>

                <button
                  onClick={() => onNavigate('lawyers')}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#2563EB] p-3 rounded-xl text-left space-y-1 shadow-2xs transition-all cursor-pointer"
                >
                  <Users className="w-5 h-5 text-[#2563EB]" />
                  <p className="text-xs font-bold text-[#0F172A]">Find a Lawyer</p>
                  <p className="text-[10px] text-[#64748B]">Connect with expert</p>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('cases')}
                  className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#2563EB] p-3 rounded-xl text-left space-y-1 shadow-2xs transition-all cursor-pointer"
                >
                  <Clock className="w-5 h-5 text-[#2563EB]" />
                  <p className="text-xs font-bold text-[#0F172A]">Case Timeline</p>
                  <p className="text-[10px] text-[#64748B]">View all updates</p>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#0F172A]">Recent Activity</h2>
                {userCases.length > 0 && (
                  <button onClick={() => setActiveSidebarTab('cases')} className="text-[11px] font-bold text-[#2563EB] hover:underline cursor-pointer">View All</button>
                )}
              </div>

              {userCases.length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-2">No recent activity recorded yet.</p>
              ) : (
                <div className="space-y-3 text-xs">
                  {userCases.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                        💬
                      </span>
                      <div>
                        <p className="font-bold text-[#0F172A]">{c.title}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Recently'} • {c.category.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 2 */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* AI Advisor Panel Card */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1F3864] flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#0F172A]">Talk to AI Legal Advisor</h2>
                  <p className="text-xs text-[#64748B]">Instant 24/7 analysis under Indian Penal Code & Civil Laws</p>
                </div>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                Ask questions about property disputes, inheritance rights, FIRs, divorce, lease agreements, or court notices in <b>Hindi, English, or Hinglish</b>.
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  onClick={() => onNavigate('chat')}
                  className="flex-1 px-4 py-2.5 bg-[#1F3864] hover:bg-[#1E293B] text-[#FFFFFF] text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#F59E0B]" />
                  <span>Start AI Legal Chat</span>
                </button>
                <button
                  onClick={onStartNewCase}
                  className="px-4 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] hover:border-[#1F3864] text-[#0F172A] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#16A34A]" />
                  <span>New Case File</span>
                </button>
              </div>
            </div>

            {/* Advocate Connection Card */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-6 h-6 text-[#D97706]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-[#0F172A]">Find & Connect with Advocates</h2>
                  <p className="text-xs text-[#64748B]">Top-rated verified Indian High Court & District Court Advocates</p>
                </div>
              </div>

              <p className="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                Connect directly with experienced property lawyers, criminal defense specialists, and family law experts for full legal representation.
              </p>

              <button
                onClick={() => onNavigate('lawyers')}
                className="w-full px-4 py-2.5 bg-[#FFFFFF] border-2 border-[#1F3864] text-[#1F3864] hover:bg-[#EFF6FF] text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Browse Verified Advocates Directory</span>
              </button>
            </div>

          </div>

          {/* COLUMN 3 */}
          <div className="lg:col-span-3 space-y-6">
            
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-[#0F172A]">Case Summary</h2>
                {userCases.length > 0 && (
                  <button
                    onClick={() => {
                      const c = userCases[0];
                      setExportCaseData({
                        caseId: c.id,
                        caseTitle: c.title || 'Legal Consultation Case',
                        category: c.category,
                        aiVerdict: c.ai_verdict || undefined,
                        aiSummary: c.ai_summary || undefined,
                        confidenceScore: c.confidence_score || undefined,
                      });
                    }}
                    className="px-2.5 py-1 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3 h-3 text-[#2563EB]" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>

              {/* Case Type or Empty State */}
              {userCases.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Active Case</p>
                    <p className="text-xs font-bold text-[#0F172A]">{userCases[0].title}</p>
                    <p className="text-[11px] text-[#2563EB] font-medium">{userCases[0].category} • Status: {userCases[0].status}</p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Description</p>
                    <p className="text-xs text-[#334155] leading-relaxed line-clamp-3">{userCases[0].description}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center space-y-2">
                  <Briefcase className="w-8 h-8 text-[#94A3B8] mx-auto" />
                  <p className="text-xs font-bold text-[#0F172A]">No Active Case File</p>
                  <p className="text-[10px] text-[#64748B]">
                    Click 'New Case File' or consult AI Legal Advisor to start your legal case record.
                  </p>
                  <button
                    onClick={onStartNewCase}
                    className="mt-2 px-3 py-1.5 bg-[#1F3864] text-[#FFFFFF] font-bold text-[11px] rounded-lg cursor-pointer"
                  >
                    Start Case
                  </button>
                </div>
              )}

              {/* Documents Status */}
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Document Vault</p>
                  <button
                    onClick={() => onNavigate('documents')}
                    className="text-[10px] font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {(() => {
                  let savedDocs: any[] = dashboardDocs;
                  if (savedDocs.length === 0) {
                    try {
                      const userDocsKey = `mw_user_uploaded_docs_${currentUser?.userId || 'guest'}`;
                      const raw = localStorage.getItem(userDocsKey);
                      if (raw) savedDocs = JSON.parse(raw);
                    } catch {}
                  }

                  if (savedDocs.length === 0) {
                    return (
                      <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-center space-y-2">
                        <p className="text-xs text-[#64748B]">No documents uploaded yet.</p>
                        <button
                          onClick={() => onNavigate('documents')}
                          className="px-3 py-1 bg-[#2563EB] text-[#FFFFFF] font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          Upload Document
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 text-xs">
                      {savedDocs.slice(0, 3).map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                          <div className="truncate max-w-[140px]">
                            <p className="font-bold text-[#0F172A] truncate">{d.name}</p>
                            <p className="text-[9px] text-[#94A3B8]">{d.uploadDate}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              d.status === 'Verified'
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : d.status === 'False / Invalid'
                                ? 'bg-[#FEE2E2] text-[#991B1B]'
                                : 'bg-[#FEF3C7] text-[#B45309]'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

          </div>

        </div>
      </>
      )}

      </div>

      {exportCaseData && (
        <ExportModal
          caseData={exportCaseData}
          onClose={() => setExportCaseData(null)}
        />
      )}
    </div>
  );
};
