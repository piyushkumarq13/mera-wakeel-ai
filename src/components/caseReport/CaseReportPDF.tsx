import React from 'react';
import { CaseSummary } from '../../types/database';
import { ReportTemplate } from './ReportTemplate';

interface CaseReportPDFProps {
  summary: CaseSummary;
  caseId?: string;
}

export const CaseReportPDF: React.FC<CaseReportPDFProps> = ({ summary, caseId }) => {
  return (
    <div id="case-report-pdf" style={{ background: '#fff' }}>
      <ReportTemplate summary={summary} caseId={caseId || summary.case_id || ''} isPdf={true} />
    </div>
  );
};

export default CaseReportPDF;
