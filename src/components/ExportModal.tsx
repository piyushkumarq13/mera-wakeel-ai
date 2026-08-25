import React, { useRef } from 'react';
import { Share2, Printer, Download, FileText, X, Scale, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { CaseSummary } from '../types/database';
import { CaseReportPDF } from './caseReport/CaseReportPDF';

export interface ExportCaseData {
  caseId?: string;
  caseTitle: string;
  category?: string;
  createdAt?: string;
  aiVerdict?: string;
  aiSummary?: string;
  confidenceScore?: number;
  evidenceChecklist?: { description: string; priority?: string; available?: boolean }[];
  caseFacts?: { key: string; value: string }[];
  messages?: { sender: 'user' | 'ai'; text: string; time?: string }[];
}

interface ExportModalProps {
  caseData: ExportCaseData;
  caseSummary?: CaseSummary | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ caseData, caseSummary, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    if (hasFullReport && caseSummary?.case_id) {
      // Server-side PDF generation for full report
      try {
        const res = await fetch('/api/pdf/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: caseSummary.case_id }),
        });
        if (!res.ok) { alert('PDF generation failed.'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MWA-Report-${caseSummary.report_id || caseSummary.case_id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch { alert('PDF generation failed.'); }
    } else {
      // Fallback to browser print for basic summary
      window.print();
    }
  };

  const hasFullReport = caseSummary && caseSummary.executive_summary && caseSummary.report_status !== 'DRAFT';

  const getVerdictBadge = (verdict?: string) => {
    const v = (verdict || '').toLowerCase();
    if (v.includes('correct') || v.includes('user_correct') || v.includes('right')) {
      return {
        label: 'USER IS CORRECT (Legally Strong)',
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      };
    }
    if (v.includes('incorrect') || v.includes('user_incorrect') || v.includes('wrong')) {
      return {
        label: 'USER IS INCORRECT (Legally Weak)',
        color: 'bg-red-500/10 text-red-600 border-red-500/30',
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      };
    }
    return {
      label: 'VERDICT PENDING / NEUTRAL',
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
    };
  };

  const verdictBadge = getVerdictBadge(caseData.aiVerdict);
  const recentMessages = (caseData.messages || []).slice(-5);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0F172A] border border-[#1E2E4F] rounded-3xl shadow-2xl overflow-hidden text-white my-8">
        
        {/* Header */}
        <div className="p-4 bg-[#070D18] border-b border-[#1E2E4F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20">
              <FileText className="w-5 h-5 text-[#F5A623]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{hasFullReport ? 'Full Case Report PDF' : 'Export Legal Case Summary PDF'}</h3>
              <p className="text-[11px] text-slate-400">{hasFullReport ? 'Professional printable case report' : 'Generate official printable case assessment brief'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body & Printable Area */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* PRINT CONTENT CONTAINER */}
          {hasFullReport ? (
            <div ref={printRef} className="print-container">
              <CaseReportPDF summary={caseSummary} />
            </div>
          ) : (
            <>
            {/* Report Header */}
            <div className="border-b-2 border-[#0F172A] pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-[#F5A623]" />
                  <span className="text-lg font-extrabold tracking-tight text-[#0F172A]">MERA WAKEEL AI</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Confidential AI Legal Pre-Assessment Report</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-bold text-slate-700">Date: {new Date().toLocaleDateString('en-IN')}</p>
                <p className="text-[10px]">Ref: {caseData.caseId ? caseData.caseId.slice(0, 12) : 'MW-CASE-ASSESS'}</p>
              </div>
            </div>

            {/* Case Title & Category */}
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Case Matter</span>
              <h2 className="text-lg font-bold text-slate-900">{caseData.caseTitle}</h2>
              {caseData.category && (
                <span className="inline-block mt-1 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 bg-amber-100 rounded-md capitalize">
                  Category: {caseData.category}
                </span>
              )}
            </div>

            {/* AI Legal Verdict & Score */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">AI Legal Assessment Verdict</span>
                {caseData.confidenceScore && (
                  <span className="text-xs font-bold text-slate-700">Case Strength Score: {Math.round(caseData.confidenceScore * 100)}%</span>
                )}
              </div>
              <div className={`p-3 rounded-lg border flex items-center gap-3 ${verdictBadge.color}`}>
                {verdictBadge.icon}
                <span className="font-bold text-sm">{verdictBadge.label}</span>
              </div>
              {caseData.aiSummary && (
                <p className="text-xs text-slate-700 leading-relaxed pt-1">{caseData.aiSummary}</p>
              )}
            </div>

            {/* Key Extracted Facts */}
            {caseData.caseFacts && caseData.caseFacts.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">Key Extracted Case Facts</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {caseData.caseFacts.map((fact, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 capitalize">{fact.key.replace(/_/g, ' ')}:</span>
                      <p className="font-medium text-slate-800">{fact.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Checklist */}
            {caseData.evidenceChecklist && caseData.evidenceChecklist.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">Required Evidence Checklist</h4>
                <ul className="space-y-1.5 text-xs">
                  {caseData.evidenceChecklist.map((ev, idx) => (
                    <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-150">
                      <span className="font-medium text-slate-800">{ev.description}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${ev.available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {ev.available ? 'Verified / Available' : 'Missing / Required'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Conversation Highlights */}
            {recentMessages.length > 0 && (
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">Consultation Highlights</h4>
                <div className="space-y-2 text-xs">
                  {recentMessages.map((msg, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg border ${msg.sender === 'user' ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <p className="text-[10px] font-bold mb-0.5 text-slate-500">{msg.sender === 'user' ? 'Citizen Client' : 'Mera Wakeel AI'}</p>
                      <p className="leading-relaxed line-clamp-3">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal Disclaimer Footer */}
            <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 italic text-center">
              Disclaimer: This AI-generated legal briefing is for preliminary evaluation purposes only and does not constitute a formal legal opinion. Please consult an Advocate registered with the Bar Council of India for representation.
            </div>
            </>
          )}

        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#070D18] border-t border-[#1E2E4F] flex items-center justify-between">
          <p className="text-xs text-slate-400">{hasFullReport ? 'Download your professional case report' : 'Ready to save or print case PDF'}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 text-xs font-bold bg-[#F5A623] hover:bg-[#D98800] text-slate-950 rounded-xl flex items-center gap-2 shadow-lg transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{hasFullReport ? 'Print / Download Report' : 'Print / Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
