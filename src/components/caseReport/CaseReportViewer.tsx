import React from 'react';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { CaseSummary } from '../../types/database';
import { ReportTemplate } from './ReportTemplate';

interface CaseReportViewerProps {
  summary: CaseSummary;
  caseId: string;
  role: 'citizen' | 'lawyer';
  onBack: () => void;
  onDownloadPdf?: () => void;
}

export const CaseReportViewer: React.FC<CaseReportViewerProps> = ({
  summary,
  caseId,
  role,
  onBack,
  onDownloadPdf,
}) => {
  const statusColors: Record<string, string> = {
    READY: 'bg-blue-50 text-blue-700 border-blue-200',
    ACCEPTED: 'bg-green-50 text-green-700 border-green-200',
    FULL_REPORT_UNLOCKED: 'bg-green-50 text-green-700 border-green-200',
    REQUEST_SENT: 'bg-amber-50 text-amber-700 border-amber-200',
    DECLINED: 'bg-red-50 text-red-700 border-red-200',
    DRAFT: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#E8ECF1' }}>

      {/* ── STICKY TOP BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#0B1F3A', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
            padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center',
          }}>
            <ArrowLeft size={18} />
          </button>
          <img
            src="https://zperifsbcjfmngfugfdd.supabase.co/storage/v1/object/public/logo/LOGO.png"
            alt="Mera Wakeel AI"
            style={{ height: '22px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, lineHeight: 1.1 }}>CASE SUMMARY REPORT</div>
            <div style={{ fontSize: '9px', color: '#94A3B8', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {caseId} &middot; v{summary.version}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[summary.report_status] || statusColors.DRAFT}`}>
            {(summary.report_status || 'DRAFT').replace(/_/g, ' ')}
          </span>
          {onDownloadPdf && (
            <button onClick={onDownloadPdf} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', background: '#B8860B', color: '#fff',
              border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer',
            }}>
              <Download size={14} />
              Download PDF
            </button>
          )}
        </div>
      </div>

      {/* ── DOCUMENT BODY ── */}
      <div style={{
        maxWidth: '800px', margin: '24px auto', padding: '0 16px',
      }}>
        {/* Paper container — drop shadow on screen, flat in print */}
        <div style={{
          background: '#fff', border: '1px solid #D8DCE3',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '0',
        }}>
          <ReportTemplate summary={summary} caseId={caseId} isPdf={false} />
        </div>

        {/* Bottom action buttons (mobile-friendly) */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          marginTop: '16px', paddingBottom: '32px',
          justifyContent: 'center',
        }}>
          <button onClick={onBack} style={btnOutline}>
            <ArrowLeft size={14} /> Back to Case
          </button>
          {onDownloadPdf && (
            <button onClick={onDownloadPdf} style={btnPrimary}>
              <Download size={14} /> Download PDF
            </button>
          )}
          <button onClick={() => window.print()} style={btnOutline}>
            <FileText size={14} /> Print
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #case-report-print, #case-report-print * { visibility: visible; }
          #case-report-print { position: absolute; left: 0; top: 0; width: 210mm; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
};

const btnOutline: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '8px 14px', background: 'transparent',
  color: '#0B1F3A', border: '1px solid #0B1F3A', borderRadius: '4px',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
};

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '8px 16px', background: '#0B1F3A', color: '#fff',
  border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
  cursor: 'pointer',
};

export default CaseReportViewer;
