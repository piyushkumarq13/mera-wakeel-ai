import React from 'react';
import { Language } from '../../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  CheckSquare,
  Plus,
  Brain,
  Briefcase,
  MessageSquareText,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';
import { CaseEvidence, CaseFact, ProfileFact, CaseStatus, Lawyer, LawyerConnection } from '../../types/database';

interface ChatSidebarProps {
  open: boolean;
  language: Language;
  onClose: () => void;
  verdict: 'user_correct' | 'user_incorrect' | 'needs_more_info';
  summaryNotes: string[];
  caseEvidence: CaseEvidence[];
  isEvidenceOpen: boolean;
  onToggleEvidenceOpen: () => void;
  newEvidenceInput: string;
  onNewEvidenceInputChange: (value: string) => void;
  onAddManualEvidence: (desc: string) => void;
  onToggleEvidence: (evId: string, currentVal: boolean) => void;
  rememberedCaseFacts: CaseFact[];
  rememberedProfileFacts: ProfileFact[];
  recommendedLawyers: Lawyer[];
  acceptedConnection?: LawyerConnection | null;
  pendingConnection: LawyerConnection | null;
  categoryMatchedLawyers: Lawyer[];
  allocatedLawyerIndex: number;
  allocatedCategory: string;
  connectedLawyerIds: string[];
  connectingLawyerId: string | null;
  lawyerConnectNotice: string;
  onQuickConnectLawyer: (lawyer: Lawyer) => void;
  onDeclineAndShowNextLawyer: () => void;
  onOpenDirectChat?: () => void;
  caseStatus: CaseStatus;
  onToggleCaseStatus: () => void;
  onFindLawyer?: (category?: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  open,
  language,
  onClose,
  verdict,
  summaryNotes,
  caseEvidence,
  isEvidenceOpen,
  onToggleEvidenceOpen,
  newEvidenceInput,
  onNewEvidenceInputChange,
  onAddManualEvidence,
  onToggleEvidence,
  rememberedCaseFacts,
  rememberedProfileFacts,
  recommendedLawyers,
  acceptedConnection,
  pendingConnection,
  categoryMatchedLawyers,
  allocatedLawyerIndex,
  allocatedCategory,
  connectedLawyerIds,
  connectingLawyerId,
  lawyerConnectNotice,
  onQuickConnectLawyer,
  onDeclineAndShowNextLawyer,
  onOpenDirectChat,
  caseStatus,
  onToggleCaseStatus,
  onFindLawyer,
}) => {
  return (
    <aside
      className={`${
        open ? 'w-full md:w-80 lg:w-88' : 'w-0 opacity-0 pointer-events-none'
      } bg-[#FFFFFF] border-r border-[#E2E8F0] transition-all duration-300 flex flex-col shrink-0 z-10 absolute md:relative inset-y-0 left-0 shadow-lg md:shadow-none`}
    >
      <div className="p-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#D98800]" />
          <h3 className="font-extrabold text-sm text-[#0F1D38]">
            {language === 'hi' ? 'केस स्नैपशॉट' : 'Case Snapshot'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-lg text-[#64748B] hover:text-[#0F1D38]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            {language === 'hi' ? 'कानूनी फैसला स्थिति' : 'Legal Assessment Verdict'}
          </span>

          {verdict === 'user_correct' ? (
            <div className="bg-[#ECFDF5] border border-[#10B981]/30 p-3.5 rounded-xl text-[#047857] space-y-2.5 shadow-2xs">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm">
                    {language === 'hi' ? 'आप सही हैं (User Is Correct)' : language === 'en' ? 'User Is Correct' : 'Aap Sahi Hain (Correct)'}
                  </h4>
                  <p className="text-xs text-[#065F46] mt-0.5 leading-snug">
                    {language === 'hi'
                      ? 'कानून आपके पक्ष में है। कानूनी कार्रवाई के लिए वकील से संपर्क करें।'
                      : 'Legal provisions favor your position. Consult a verified advocate.'}
                  </p>
                </div>
              </div>

              {onFindLawyer && (
                <button
                  onClick={() => onFindLawyer('Property Law')}
                  className="w-full bg-[#0F1D38] hover:bg-[#1E2E4F] text-[#FFFFFF] font-bold py-2 px-3 rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-[#1E2E4F]"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#D98800]" />
                  <span>{language === 'hi' ? 'वकील खोजें (Find a Lawyer)' : 'Find a Verified Lawyer'}</span>
                </button>
              )}
            </div>
          ) : verdict === 'user_incorrect' ? (
            <div className="bg-[#FEF2F2] border border-[#EF4444]/30 p-3.5 rounded-xl text-[#991B1B] flex items-start gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm">
                  {language === 'hi' ? 'आप गलत हैं (In Violation)' : language === 'en' ? 'In Legal Violation' : 'Aap Galat Hain (Incorrect)'}
                </h4>
                <p className="text-xs text-[#7F1D1D] mt-0.5 leading-snug">
                  {language === 'hi'
                    ? 'वर्तमान स्थिति में कानूनी जोखिम है। सही रास्ता चुनें।'
                    : 'Position carries legal risk under current law.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#FFFBEB] border border-[#F59E0B]/30 p-3.5 rounded-xl text-[#B45309] flex items-start gap-3 shadow-2xs">
              <Clock className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5 animate-spin-slow" />
              <div>
                <h4 className="font-extrabold text-sm">
                  {language === 'hi' ? 'विश्लेषण जारी... (Assessing)' : language === 'en' ? 'Still Assessing Case' : 'Pura Mamla Samajh Rahe Hain...'}
                </h4>
                <p className="text-xs text-[#92400E] mt-0.5 leading-snug">
                  {language === 'hi'
                    ? 'बातचीत के आधार पर मूल्यांकन किया जा रहा है।'
                    : 'Gathering details before final legal verdict.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>{language === 'hi' ? 'मुख्य बिंदु (Key Notes)' : 'Case Key Notes'}</span>
            <span className="text-[10px] text-[#D98800] bg-[#FFFBF0] px-2 py-0.5 rounded-full border border-[#FDE68A]">
              Auto-Updated
            </span>
          </div>

          {summaryNotes.length === 0 ? (
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B] space-y-2">
              <FileText className="w-8 h-8 text-[#94A3B8] mx-auto opacity-60" />
              <p>
                {language === 'hi'
                  ? 'केस का सारांश और मुख्य बिंदु यहां जुड़ते जाएंगे जैसे-जैसे बातचीत आगे बढ़ेगी।'
                  : language === 'en'
                  ? 'Case summary and key details will update here as your conversation progresses.'
                  : 'Case summary aur key details yahan add honge jaise-jaise baat aage badhegi.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {summaryNotes.map((note, idx) => (
                <li
                  key={idx}
                  className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-xs text-[#334155] leading-relaxed flex items-start gap-2"
                >
                  <span className="text-[#D98800] font-bold mt-0.5">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2.5 pt-3 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <button
              onClick={onToggleEvidenceOpen}
              className="flex items-center gap-1.5 text-[#0F1D38] hover:text-[#D98800] transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 text-[#D98800]" />
              <span>
                {language === 'hi' ? 'एविडेंस/दस्तावेज़ (Evidence Chahiye)' : 'Evidence Chahiye (Checklist)'}
              </span>
              <span className="text-[10px] text-[#64748B]">
                {isEvidenceOpen ? '▲' : '▼'}
              </span>
            </button>
            <span className="text-[10px] font-mono text-[#D98800] bg-[#FFFBF0] px-2 py-0.5 rounded-full border border-[#FDE68A]">
              {caseEvidence.filter((e) => e.is_available).length}/{caseEvidence.length} Ready
            </span>
          </div>

          {isEvidenceOpen && (
            <div className="space-y-2">
              {caseEvidence.length === 0 ? (
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
                  <p className="text-[11px] leading-relaxed">
                    {language === 'hi'
                      ? 'AI द्वारा बताए गए ज़रूरी दस्तावेज और एविडेंस यहां चेकलिस्ट में जुड़ेंगे।'
                      : 'Required documents and evidence identified by AI will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {caseEvidence.map((ev) => {
                    const isCrit = ev.priority === 'critical';
                    const isHelp = ev.priority === 'helpful';
                    const dotColor = isCrit ? 'bg-[#EF4444]' : isHelp ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]';
                    const badgeLabel = isCrit
                      ? (language === 'hi' ? 'अति आवश्यक' : 'Critical')
                      : isHelp
                      ? (language === 'hi' ? 'सहायक' : 'Helpful')
                      : (language === 'hi' ? 'ऐच्छिक' : 'Optional');

                    return (
                      <div
                        key={ev.id}
                        onClick={() => onToggleEvidence(ev.id, ev.is_available)}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer text-xs ${
                          ev.is_available
                            ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F1D38]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={ev.is_available}
                          onChange={() => {}}
                          className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] text-[#10B981] focus:ring-[#10B981] cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              {badgeLabel}
                            </span>
                          </div>
                          <p className={`font-medium leading-snug break-words ${ev.is_available ? 'line-through opacity-75' : ''}`}>
                            {ev.evidence_description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newEvidenceInput}
                  onChange={(e) => onNewEvidenceInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onAddManualEvidence(newEvidenceInput);
                  }}
                  placeholder={language === 'hi' ? 'नया दस्तावेज जोड़ें...' : 'Add required document...'}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] focus:outline-none focus:border-[#D98800] bg-[#FFFFFF]"
                />
                <button
                  onClick={() => onAddManualEvidence(newEvidenceInput)}
                  disabled={!newEvidenceInput.trim()}
                  className="px-2.5 py-1.5 bg-[#0F1D38] hover:bg-[#1E2E4F] text-[#FFFFFF] text-xs font-bold rounded-lg disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-3 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <div className="flex items-center gap-1.5 text-[#0F1D38]">
              <Brain className="w-4 h-4 text-[#D98800]" />
              <span>{language === 'hi' ? 'याद रखी गई बातें (AI Memory)' : language === 'en' ? 'AI Memory (Saved Facts)' : 'AI Memory (Saved Facts)'}</span>
            </div>
            <span className="text-[10px] font-mono text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              {rememberedCaseFacts.length + rememberedProfileFacts.length} Facts
            </span>
          </div>

          {rememberedCaseFacts.length === 0 && rememberedProfileFacts.length === 0 ? (
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
              <p className="text-[11px] leading-relaxed">
                {language === 'hi'
                  ? 'जब आप नाम, रिश्ता, दस्तावेज या तारीख बताएंगे, AI उन्हें यहां याद रखेगा।'
                  : 'When you share names, relations, dates or documents, AI stores key facts here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rememberedCaseFacts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {language === 'hi' ? 'केस संबंधी विवरण:' : 'Case Facts:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rememberedCaseFacts.map((fact) => (
                      <span
                        key={fact.id || fact.fact_key}
                        className="inline-flex items-center gap-1 bg-[#FFFBF0] border border-[#FDE68A] text-[#92400E] px-2 py-1 rounded-md text-[11px] font-medium shadow-2xs"
                      >
                        <span className="font-mono text-[#D98800] text-[10px]">{fact.fact_key}:</span>
                        <span className="font-bold text-[#0F1D38]">{fact.fact_value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {rememberedProfileFacts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {language === 'hi' ? 'व्यक्तिगत विवरण:' : 'Profile Facts:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {rememberedProfileFacts.map((fact) => (
                      <span
                        key={fact.id || fact.fact_key}
                        className="inline-flex items-center gap-1 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E3A8A] px-2 py-1 rounded-md text-[11px] font-medium shadow-2xs"
                      >
                        <span className="font-mono text-[#2563EB] text-[10px]">{fact.fact_key}:</span>
                        <span className="font-bold text-[#0F1D38]">{fact.fact_value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {recommendedLawyers.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-[#F1F5F9]">
            <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
              <div className="flex items-center gap-1.5 text-[#0F1D38]">
                <Briefcase className="w-4 h-4 text-[#D98800]" />
                <span>{language === 'hi' ? 'आवंटित वकील (Matched Advocate)' : 'Matched Advocate'}</span>
              </div>
              <span className="text-[10px] font-bold text-[#D98800] bg-[#FFFBF0] px-2 py-0.5 rounded-full border border-[#FDE68A] capitalize">
                {allocatedCategory}
              </span>
            </div>

            {(() => {
              if (acceptedConnection) {
                const accName = acceptedConnection.lawyer?.profile?.full_name || recommendedLawyers.find((l) => l.id === acceptedConnection.lawyer_id)?.profile?.full_name || 'Advocate';
                return (
                  <div className="bg-[#ECFDF5] rounded-xl border border-[#10B981]/40 p-3 space-y-2.5 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#0F1D38] text-[#D98800] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {accName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-[#0F1D38] truncate">
                          Adv. {accName}
                        </h4>
                        <p className="text-[10px] font-extrabold text-[#047857] mt-0.5">
                          ✓ Lawyer Connected to Case
                        </p>
                      </div>
                    </div>

                    <div className="p-2 bg-[#FFFFFF] border border-[#10B981]/30 text-[#047857] text-[10px] font-bold rounded-lg text-center">
                      Adv. {accName} accepted the request. Direct chat unlocked.
                    </div>

                    <button
                      onClick={onOpenDirectChat}
                      className="w-full bg-[#0F1D38] hover:bg-[#1E2E4F] text-[#FFFFFF] font-extrabold py-2 px-3 rounded-xl text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquareText className="w-3.5 h-3.5 text-[#D98800]" />
                      <span>Message Adv. {accName}</span>
                    </button>
                  </div>
                );
              }

              if (pendingConnection) {
                const pendName = pendingConnection.lawyer?.profile?.full_name || recommendedLawyers.find((l) => l.id === pendingConnection.lawyer_id)?.profile?.full_name || 'Advocate';
                return (
                  <div className="bg-[#FFFBF0] rounded-xl border border-[#FDE68A] p-3 space-y-2.5 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#D97706] text-[#FFFFFF] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {pendName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-[#92400E] truncate">
                          Adv. {pendName}
                        </h4>
                        <p className="text-[10px] font-bold text-[#B45309] mt-0.5">
                          ⏳ Consultation Request Pending
                        </p>
                      </div>
                    </div>

                    <div className="p-2 bg-[#FFFFFF] border border-[#FDE68A] text-[#B45309] text-[10px] font-semibold rounded-lg text-center leading-relaxed">
                      Request sent to Adv. {pendName}. Awaiting advocate confirmation.
                    </div>
                  </div>
                );
              }

              const list = recommendedLawyers.length > 0 ? recommendedLawyers : categoryMatchedLawyers;
              const currentLawyer = list[allocatedLawyerIndex % list.length] || list[0];
              const rank = list.indexOf(currentLawyer) + 1;
              const isConnected = connectedLawyerIds.includes(currentLawyer.id);
              const isConnecting = connectingLawyerId === currentLawyer.id;

              return (
                <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-3 space-y-2.5 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#0F1D38] text-[#D98800] font-extrabold text-xs flex items-center justify-center shrink-0">
                      {currentLawyer.profile?.full_name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-xs text-[#0F1D38] truncate">
                          Adv. {currentLawyer.profile?.full_name || 'Advocate'}
                        </h4>
                        <span className={`text-[8px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${rank === 1 ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#E2E8F0] text-[#475569]'}`}>
                          #{rank}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#64748B] truncate">
                        {currentLawyer.specialty?.slice(0, 2).join(', ')} • {currentLawyer.years_experience} Yrs
                      </p>
                      <p className="text-[10px] font-bold text-[#10B981] mt-0.5">
                        ★ {currentLawyer.rating_avg?.toFixed(1) || '4.9'} • {currentLawyer.consultation_fee_range || '₹1,500'}
                      </p>
                    </div>
                  </div>

                  {lawyerConnectNotice && (
                    <div className="p-2 bg-[#ECFDF5] border border-[#10B981]/30 text-[#047857] text-[10px] font-bold rounded-lg">
                      {lawyerConnectNotice}
                    </div>
                  )}

                  {isConnected ? (
                    <div className="w-full bg-[#ECFDF5] text-[#047857] border border-[#10B981]/30 text-xs font-extrabold py-2 rounded-xl text-center flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Request Sent ✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onQuickConnectLawyer(currentLawyer)}
                        disabled={isConnecting}
                        className="flex-1 bg-[#0F1D38] hover:bg-[#1E2E4F] text-[#FFFFFF] font-bold py-2 px-2 rounded-xl text-[11px] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3 text-[#D98800]" />
                        <span>{isConnecting ? 'Sending...' : 'Send Request Direct'}</span>
                      </button>
                      {recommendedLawyers.length > 1 && (
                        <button
                          onClick={onDeclineAndShowNextLawyer}
                          className="px-2 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] text-[10px] font-bold rounded-xl cursor-pointer"
                          title="Next Advocate"
                        >
                          Next →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className="p-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className={`w-2.5 h-2.5 rounded-full ${caseStatus === 'closed' ? 'bg-[#64748B]' : 'bg-[#10B981]'}`} />
          <span className="text-[#0F1D38]">
            {caseStatus === 'closed'
              ? (language === 'hi' ? 'केस: बंद (Closed)' : 'Case: Closed')
              : (language === 'hi' ? 'केस: जारी (Active)' : 'Case: Active')}
          </span>
        </div>

        <button
          onClick={onToggleCaseStatus}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
            caseStatus === 'closed'
              ? 'bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#0F1D38] border-[#CBD5E1]'
              : 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]'
          }`}
        >
          {caseStatus === 'closed' ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-[#0F1D38]" />
              <span>{language === 'hi' ? 'केस खोलें' : 'Reopen Case'}</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>{language === 'hi' ? 'केस बंद करें' : 'Mark Closed'}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};