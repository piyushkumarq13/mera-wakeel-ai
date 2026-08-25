import React, { useState, useEffect } from 'react';
import { NavTab, UserRole } from '../../types';
import { CaseSummary } from '../../types/database';
import { fetchLatestCaseSummary, ensureCaseSummary } from '../../lib/db/caseSummary';
import { CaseReportViewer } from './CaseReportViewer';

interface CaseReportPageProps {
  caseId: string | null;
  currentUser?: {
    userId: string;
    email: string;
    role: UserRole;
    name?: string;
  } | null;
  onBack: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const CaseReportPage: React.FC<CaseReportPageProps> = ({
  caseId,
  currentUser,
  onBack,
  onNavigate,
}) => {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!caseId) { setLoading(false); return; }
    loadSummary();
  }, [caseId]);

  async function loadSummary() {
    if (!caseId) return;
    setLoading(true);
    try {
      let s = await fetchLatestCaseSummary(caseId);
      if (!s) {
        setGenerating(true);
        s = await ensureCaseSummary(caseId);
        setGenerating(false);
      }
      setSummary(s);
    } catch (err) {
      console.warn('Error loading case summary:', err);
    }
    setLoading(false);
  }

  async function handleDownloadPdf() {
    if (!summary || !caseId) return;
    try {
      const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF generation failed' }));
        console.error('PDF error:', err);
        alert('PDF generation failed. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MWA-Report-${summary.report_id || caseId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('PDF generation failed. Please try again.');
    }
  }

  if (!caseId) {
    return (
      <div style={{ minHeight: '100vh', background: '#E8ECF1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#64748B' }}>No case selected.</p>
          <button onClick={onBack} style={{
            marginTop: '12px', padding: '8px 16px', background: '#0B1F3A', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}>
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  if (loading || generating) {
    return (
      <div style={{ minHeight: '100vh', background: '#E8ECF1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid #0B1F3A',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto',
          }} />
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '10px' }}>
            {generating ? 'Generating case report...' : 'Loading case report...'}
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ minHeight: '100vh', background: '#E8ECF1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#64748B' }}>Case report not available.</p>
          <button onClick={onBack} style={{
            marginTop: '12px', padding: '8px 16px', background: '#0B1F3A', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          }}>
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <CaseReportViewer
      summary={summary}
      caseId={caseId}
      role={currentUser?.role === 'lawyer' ? 'lawyer' : 'citizen'}
      onBack={onBack}
      onDownloadPdf={handleDownloadPdf}
    />
  );
};

export default CaseReportPage;
