import React from 'react';
import {
  FileText,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Shield,
  X,
} from 'lucide-react';
import { CaseSummary } from '../../types/database';

interface CaseRequestBriefProps {
  summary: CaseSummary;
  caseId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const CaseRequestBrief: React.FC<CaseRequestBriefProps> = ({
  summary,
  caseId,
  onAccept,
  onDecline,
}) => {
  const formatDate = (d: string | null) => {
    if (!d) return 'Not specified';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="bg-[#0F172A] text-white rounded-t-2xl p-5 text-center">
          <h1 className="text-sm font-extrabold tracking-wide">MERA WAKEEL AI</h1>
          <h2 className="text-lg font-extrabold text-[#D98800] mt-1">New Case Request</h2>
          <p className="text-[10px] text-gray-400 mt-1">Review the case brief below before accepting or declining.</p>
        </div>

        {/* Brief Content */}
        <div className="bg-white border border-[#E2E8F0] border-t-0 rounded-b-2xl shadow-sm">

          {/* Case Type & Title */}
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Case Type</p>
                <p className="text-sm font-extrabold text-[#0F172A] mt-0.5">
                  {summary.case_category?.toUpperCase() || 'OTHER'} Dispute
                </p>
              </div>
              <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold rounded-full">
                {summary.report_status?.replace(/_/g, ' ') || 'NEW'}
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-bold text-[#64748B] uppercase">Case Title</p>
              <p className="text-sm font-bold text-[#0F172A] mt-0.5">{summary.case_title || 'Untitled Case'}</p>
            </div>
          </div>

          {/* Location & Date */}
          <div className="px-6 py-3 border-b border-[#E2E8F0] grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#2563EB]" />
              <div>
                <p className="text-[10px] font-bold text-[#64748B]">LOCATION</p>
                <p className="text-[11px] font-bold text-[#0F172A]">{summary.location || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2563EB]" />
              <div>
                <p className="text-[10px] font-bold text-[#64748B]">INCIDENT DATE</p>
                <p className="text-[11px] font-bold text-[#0F172A]">{formatDate(summary.incident_date)}</p>
              </div>
            </div>
          </div>

          {/* Short Brief */}
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Short Case Brief</p>
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
              <p className="text-[11px] text-[#334155] leading-relaxed whitespace-pre-wrap">
                {summary.short_brief || summary.executive_summary || 'No brief available.'}
              </p>
            </div>
          </div>

          {/* Key Facts */}
          {summary.key_facts && summary.key_facts.length > 0 && (
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Key Facts</p>
              <ul className="space-y-1.5">
                {summary.key_facts.slice(0, 8).map((fact, i) => (
                  <li key={i} className="text-[11px] text-[#334155] flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-[#16A34A] mt-0.5 shrink-0" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents Available */}
          {summary.documents_list && summary.documents_list.length > 0 && (
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Documents Available</p>
              <ul className="space-y-1.5">
                {summary.documents_list.map((doc, i) => (
                  <li key={i} className="text-[11px] text-[#334155] flex items-start gap-2">
                    <FileText className="w-3 h-3 text-[#2563EB] mt-0.5 shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Assessment (Limited) */}
          {summary.case_strength_score != null && (
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">AI Case Assessment</p>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-3 border-[#2563EB] flex items-center justify-center">
                  <span className="text-base font-extrabold text-[#0F172A]">{summary.case_strength_score}</span>
                  <span className="text-[8px] text-[#64748B]">/100</span>
                </div>
                <p className="text-[10px] text-[#64748B] italic">Preliminary AI assessment. Full analysis available after acceptance.</p>
              </div>
            </div>
          )}

          {/* Missing Info Notice */}
          {summary.missing_information && summary.missing_information.length > 0 && (
            <div className="px-6 py-3 border-b border-[#E2E8F0]">
              <div className="bg-[#FFFBEB] p-3 rounded-xl border border-[#FDE68A] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
                <p className="text-[10px] text-[#92400E]">
                  {summary.missing_information.length} information item(s) still missing. Full details available after case acceptance.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-5 flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 px-4 py-3 bg-white border-2 border-[#E2E8F0] hover:border-[#DC2626] text-[#DC2626] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseRequestBrief;
