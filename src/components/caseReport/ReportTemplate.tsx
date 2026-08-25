import React from 'react';
import { CaseSummary } from '../../types/database';

const LOGO_URL = 'https://zperifsbcjfmngfugfdd.supabase.co/storage/v1/object/public/logo/LOGO.png';

const C = {
  navy: '#0B1F3A',
  navyLight: '#12284A',
  gold: '#B8860B',
  goldLight: '#D4A843',
  goldBg: '#FDF8EF',
  gray: '#64748B',
  grayLight: '#94A3B8',
  grayBorder: '#D8DCE3',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  red: '#8B1A1A',
  green: '#166534',
  amber: '#92400E',
  bodyText: '#1E293B',
  mutedText: '#475569',
};

interface ReportTemplateProps {
  summary: CaseSummary;
  caseId?: string;
  isPdf?: boolean;
}

function formatDate(d: string | null) {
  if (!d) return 'Not provided';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function provTag(source?: string) {
  const s = (source || 'User-stated').toLowerCase();
  let bg = '#E5E7EB'; let fg = '#374151'; let label = 'User-stated';
  if (s.includes('ai') || s.includes('inferred')) { bg = '#DBEAFE'; fg = '#1E40AF'; label = 'AI-inferred'; }
  else if (s.includes('document') || s.includes('upload')) { bg = '#DCFCE7'; fg = '#166534'; label = 'Document-derived'; }
  else if (s.includes('unverified') || s.includes('unknown')) { bg = '#FEF3C7'; fg = '#92400E'; label = 'Unverified'; }
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', fontSize: '8px', fontWeight: 700,
      borderRadius: '2px', background: bg, color: fg, marginLeft: '6px', verticalAlign: 'middle',
      letterSpacing: '0.3px',
    }}>
      {label}
    </span>
  );
}

function missing() {
  return <em style={{ color: C.grayLight, fontStyle: 'italic' }}>Not provided</em>;
}

function needVerify() {
  return <em style={{ color: C.grayLight, fontStyle: 'italic' }}>Needs verification</em>;
}

function SectionBadge({ num }: { num: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '3px', background: C.navy,
      color: C.white, fontSize: '10px', fontWeight: 800, marginRight: '8px',
      border: `1px solid ${C.gold}`, flexShrink: 0,
    }}>
      {num}
    </span>
  );
}

function Section({ num, title, titleHi, children, style: s }: {
  num: number; title: string; titleHi?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: '18px', pageBreakInside: 'avoid', ...s }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '6px',
        borderBottom: `1px solid ${C.grayBorder}`, paddingBottom: '6px', marginBottom: '10px',
      }}>
        <SectionBadge num={num} />
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </span>
          {titleHi && (
            <span style={{ fontSize: '9px', color: C.gray, marginLeft: '6px' }}>{titleHi}</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, source }: { label: string; value: string | null | undefined; source?: string }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '10.5px', color: C.bodyText }}>
        {value || 'Not provided'}
        {source && provTag(source)}
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '6px' }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              background: C.navy, color: C.white, padding: '5px 8px', textAlign: 'left',
              fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px',
              border: `1px solid ${C.navyLight}`,
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? C.white : C.bg }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: '5px 8px', border: `1px solid ${C.grayBorder}`, color: C.bodyText, verticalAlign: 'top' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  let barColor = C.green;
  if (pct < 40) barColor = '#DC2626';
  else if (pct < 70) barColor = C.gold;

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: C.navy, lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: '11px', color: C.gray }}>/100</span>
      </div>
      <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
      </div>
      <p style={{ fontSize: '9px', color: C.gray, fontStyle: 'italic', marginTop: '4px' }}>
        AI-generated preliminary assessment — not a judicial finding.
      </p>
    </div>
  );
}

function Footer({ reportId, version, date }: { reportId?: string; version?: number; date?: string }) {
  return (
    <div style={{
      borderTop: `2px solid ${C.navy}`, paddingTop: '10px', marginTop: '20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8px', color: C.gray,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <img src={LOGO_URL} alt="Mera Wakeel AI" style={{ height: '14px' }} />
          <span style={{ fontWeight: 700, fontSize: '9px', color: C.navy }}>Mera Wakeel AI</span>
        </div>
        <p style={{ fontStyle: 'italic', fontSize: '7.5px' }}>Ghabraiye Nahi, Hum Hain Aapke Saath.</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontWeight: 700, fontSize: '8px', color: C.red }}>CONFIDENTIAL</p>
        <p style={{ fontSize: '7px' }}>This document is confidential. Do not share without authorization.</p>
        <p style={{ fontSize: '7px', marginTop: '1px' }}>{'\u092F\u0939 \u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u093C \u0917\u094B\u092A\u0928\u0940\u092F \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0930\u0942\u092A \u0938\u0947 \u0938\u093E\u091D\u093E \u0928 \u0915\u0930\u0947\u0902\u0964'}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontWeight: 700 }}>Report ID: {reportId || 'N/A'}</p>
        <p>Version: v{version || 1} | {date ? formatDate(date) : 'N/A'}</p>
        <div style={{
          marginTop: '4px', width: '36px', height: '36px', border: `1px solid ${C.grayBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px',
          color: C.grayLight, background: C.bg,
        }}>
          QR
        </div>
      </div>
    </div>
  );
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ summary: s, caseId, isPdf }) => {
  const statusLabel = (s.report_status || 'DRAFT').replace(/_/g, ' ');

  return (
    <div style={{
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      fontSize: '10.5px', lineHeight: '1.6', color: C.bodyText,
      ...(isPdf ? {
        width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '18mm',
        background: C.white,
      } : {}),
    }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingBottom: '12px', marginBottom: '4px', borderBottom: `1px solid ${C.grayBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={LOGO_URL} alt="Mera Wakeel AI" style={{ height: '32px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy, letterSpacing: '0.3px', lineHeight: 1.1 }}>
              Mera Wakeel AI
            </div>
            <div style={{ fontSize: '8px', color: C.gray, marginTop: '1px' }}>{'\u0917\u093C\u0930\u092E \u0935\u0915\u0940\u0932'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9px' }}>
          <div style={{ color: C.gray, fontWeight: 600 }}>REPORT ID</div>
          <div style={{ fontWeight: 800, color: C.navy }}>{s.report_id || 'N/A'}</div>
          <div style={{ color: C.gray, fontWeight: 600, marginTop: '3px' }}>CASE ID</div>
          <div style={{ fontWeight: 700, color: C.navy, fontSize: '8px', wordBreak: 'break-all' }}>{caseId || 'N/A'}</div>
          <div style={{ color: C.gray, fontWeight: 600, marginTop: '3px' }}>GENERATED</div>
          <div style={{ fontWeight: 700, color: C.bodyText }}>{formatDate(s.ai_generated_at)}</div>
          <div style={{ color: C.gray, fontWeight: 600, marginTop: '3px' }}>LAST UPDATED</div>
          <div style={{ fontWeight: 700, color: C.bodyText }}>{formatDate(s.ai_last_updated_at)}</div>
        </div>
      </div>

      {/* Gold accent line */}
      <div style={{ height: '2px', background: C.gold, marginBottom: '12px' }} />

      {/* Confidentiality tag */}
      <div style={{
        display: 'inline-block', padding: '3px 10px', fontSize: '8.5px', fontWeight: 800,
        color: C.red, border: `1px solid ${C.red}`, borderRadius: '2px',
        letterSpacing: '0.5px', marginBottom: '12px',
      }}>
        CONFIDENTIAL — ATTORNEY CASE FILE
      </div>

      {/* Report title block */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: C.navy, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Case Summary Report
        </div>
        <div style={{ fontSize: '11px', color: C.gray, marginTop: '2px' }}>
          {'\u092E\u093E\u092E\u0932\u093E \u0938\u093E\u0930\u093E\u0902\u0936 \u0930\u093F\u092A\u094B\u0930\u094D\u091F'}
        </div>
        <div style={{ fontSize: '8.5px', color: C.grayLight, fontStyle: 'italic', marginTop: '4px' }}>
          This AI-generated legal briefing is for preliminary evaluation purposes only and does not constitute formal legal advice.
        </div>
      </div>

      {/* ── ASSIGNED ADVOCATE ── */}
      {s.assigned_lawyer_name && s.lawyer_accepted_at && (
        <div style={{
          padding: '10px 14px', background: C.goldBg, border: `1px solid ${C.goldLight}`,
          borderRadius: '2px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Assigned Advocate
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', background: C.navy,
              color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, flexShrink: 0,
            }}>
              {s.assigned_lawyer_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: C.navy }}>{s.assigned_lawyer_name}</div>
              <div style={{ fontSize: '9px', color: C.mutedText, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', background: C.green, borderRadius: '50%', color: C.white, fontSize: '7px', textAlign: 'center', lineHeight: '10px' }}>&#10003;</span>
                Bar Council Verified
              </div>
              <div style={{ fontSize: '9px', color: C.gray }}>Assigned on: {formatDate(s.lawyer_accepted_at)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. CASE IDENTIFICATION ── */}
      <Section num={1} title="Case Identification" titleHi={'\u092E\u093E\u092E\u0932\u0947 \u092A\u0939\u0939\u093E\u091A\u093E\u0928'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <KV label="Case Title" value={s.case_title} />
          <KV label="Category" value={s.case_category?.toUpperCase()} />
          <KV label="Sub-Category" value={s.case_sub_category} />
          <KV label="Location" value={s.location} />
          <KV label="Incident Date" value={s.incident_date} />
          <KV label="Status" value={statusLabel} />
        </div>
      </Section>

      {/* ── 2. PARTIES INVOLVED ── */}
      <Section num={2} title="Parties Involved" titleHi={'\u0936\u093E\u092E\u093F\u0932 \u092A\u0915\u094D\u0937'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ padding: '10px', background: C.bg, border: `1px solid ${C.grayBorder}`, borderRadius: '2px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: '4px' }}>
              Complainant / Applicant
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.navy }}>{s.complainant_name || 'Not provided'}</div>
            {s.complainant_role && <div style={{ fontSize: '9.5px', color: C.mutedText, marginTop: '1px' }}>{s.complainant_role}</div>}
            {s.complainant_details && <div style={{ fontSize: '9.5px', color: C.mutedText, marginTop: '3px' }}>{s.complainant_details}</div>}
          </div>
          <div style={{ padding: '10px', background: C.bg, border: `1px solid ${C.grayBorder}`, borderRadius: '2px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: '4px' }}>
              Opposite Party / Respondent
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.navy }}>{s.opposite_party_name || 'Not provided'}</div>
            {s.opposite_party_role && <div style={{ fontSize: '9.5px', color: C.mutedText, marginTop: '1px' }}>{s.opposite_party_role}</div>}
            {s.opposite_party_details && <div style={{ fontSize: '9.5px', color: C.mutedText, marginTop: '3px' }}>{s.opposite_party_details}</div>}
          </div>
        </div>
        {s.relationship_between_parties && (
          <div style={{ fontSize: '9.5px', color: C.mutedText, marginTop: '8px' }}>
            <strong>Relationship:</strong> {s.relationship_between_parties}
          </div>
        )}
      </Section>

      {/* ── 3. EXECUTIVE SUMMARY ── */}
      <Section num={3} title="Executive Case Summary" titleHi={'\u0938\u093E\u0930\u093E\u0902\u0936'}>
        <p style={{ fontSize: '10.5px', color: C.bodyText, whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
          {s.executive_summary || missing()}
        </p>
      </Section>

      {/* ── 4. TIMELINE ── */}
      <Section num={4} title="Chronology / Case Timeline" titleHi={'\u0938\u092E\u092F \u0938\u0942\u091A\u0940'}>
        {s.case_timeline && s.case_timeline.length > 0 ? (
          <DataTable
            headers={['Date', 'Event', 'Source']}
            rows={s.case_timeline.map(item => [
              item.date || 'Unknown',
              item.event,
              item.source || '',
            ])}
          />
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No timeline data available yet.</p>}
      </Section>

      {/* ── 5. KEY FACTS ── */}
      <Section num={5} title="Key Facts" titleHi={'\u092E\u0941\u0916\u094D\u092F \u0924\u0925\u094D\u092F'}>
        {s.key_facts && s.key_facts.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {s.key_facts.map((fact, i) => (
              <li key={i} style={{
                padding: '5px 8px', marginBottom: '3px', fontSize: '10px',
                borderLeft: `2px solid ${C.green}`, background: '#F0FDF4',
                color: C.bodyText, display: 'flex', alignItems: 'flex-start', gap: '6px',
              }}>
                <span style={{ color: C.green, fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
                {fact}
                {provTag('User-stated')}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No key facts extracted yet.</p>}
      </Section>

      {/* ── 6. DISPUTED FACTS ── */}
      <Section num={6} title="Disputed / Unclear Facts" titleHi={'\u0935\u093F\u0935\u093E\u0926\u093F\u0924 \u0924\u0925\u094D\u092F'}>
        {s.disputed_facts && s.disputed_facts.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {s.disputed_facts.map((fact, i) => (
              <li key={i} style={{
                padding: '5px 8px', marginBottom: '3px', fontSize: '10px',
                borderLeft: `2px solid ${C.amber}`, background: '#FFFBEB',
                color: C.amber, display: 'flex', alignItems: 'flex-start', gap: '6px',
              }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>&#9888;</span>
                {fact}
                {provTag('Unverified')}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No disputed facts identified.</p>}
      </Section>

      {/* ── 7. DOCUMENTS & EVIDENCE ── */}
      <Section num={7} title="Documents & Evidence" titleHi={'\u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u093C \u0914\u0930 \u0938\u093E\u0915\u094D\u0937\u094D\u092F'}>
        {s.documents_list && s.documents_list.length > 0 ? (
          <DataTable
            headers={['#', 'Document', 'Provenance']}
            rows={s.documents_list.map((doc, i) => [
              String(i + 1),
              <span style={{ fontWeight: 600 }}>{doc}</span>,
              provTag('Document-derived'),
            ])}
          />
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic', marginBottom: '8px' }}>No documents uploaded yet.</p>}
        {s.evidence_list && s.evidence_list.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: '4px' }}>Evidence</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {s.evidence_list.map((ev, i) => (
                <li key={i} style={{
                  padding: '4px 8px', marginBottom: '2px', fontSize: '10px',
                  background: C.bg, border: `1px solid ${C.grayBorder}`, borderRadius: '2px',
                }}>
                  {ev} {provTag('User-stated')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── 8. WITNESSES ── */}
      <Section num={8} title="Witnesses" titleHi={'\u0917\u0935\u093E\u0939'}>
        {s.witnesses && s.witnesses.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {s.witnesses.map((w, i) => (
              <li key={i} style={{ padding: '4px 8px', marginBottom: '2px', fontSize: '10px', background: C.bg, border: `1px solid ${C.grayBorder}`, borderRadius: '2px' }}>
                {w}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No witnesses identified yet.</p>}
      </Section>

      {/* ── 9. APPLICABLE LAWS ── */}
      <Section num={9} title="Applicable Laws" titleHi={'\u0932\u093E\u0917\u0942 \u0938\u0926\u0928\u0924\u093E'}>
        {s.applicable_laws && s.applicable_laws.length > 0 ? (
          <DataTable
            headers={['Law', 'Section', 'Relevance', 'Citation']}
            rows={s.applicable_laws.map(law => [
              <span style={{ fontWeight: 700 }}>{law.law}</span>,
              law.section,
              law.relevance,
              law.citation || needVerify(),
            ])}
          />
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No applicable law sections identified yet.</p>}
      </Section>

      {/* ── 10. LEGAL QUESTIONS ── */}
      <Section num={10} title="Legal Questions" titleHi={'\u0915\u093E\u0928\u0942\u0928\u0940 \u0938\u0935\u093E\u0932\u0947\u0902'}>
        {s.legal_questions && s.legal_questions.length > 0 ? (
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {s.legal_questions.map((q, i) => (
              <li key={i} style={{ fontSize: '10px', marginBottom: '3px', color: C.bodyText }}>{q}</li>
            ))}
          </ol>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No legal questions identified yet.</p>}
      </Section>

      {/* ── 11. AI ANALYSIS ── */}
      <Section num={11} title="AI-Assisted Preliminary Analysis" titleHi={'\u090F\u0908 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923'}>
        <div style={{
          display: 'inline-block', padding: '2px 8px', fontSize: '8px', fontWeight: 700,
          background: '#EEF2FF', color: '#3730A3', borderRadius: '2px', marginBottom: '8px',
          letterSpacing: '0.3px',
        }}>
          AI-ASSISTED PRELIMINARY ANALYSIS
        </div>
        <p style={{ fontSize: '9px', color: C.gray, fontStyle: 'italic', marginBottom: '6px' }}>
          This section is AI-generated and should not be treated as a judicial finding or legal opinion.
        </p>
        <p style={{ fontSize: '10.5px', color: C.bodyText, whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
          {s.ai_analysis || 'AI analysis pending. Information is being gathered from the conversation and uploaded documents.'}
        </p>
      </Section>

      {/* ── 12. CASE STRENGTH ── */}
      <Section num={12} title="Case Strength Assessment" titleHi={'\u092E\u093E\u092E\u0932\u0947 \u092C\u0932'}>
        {s.case_strength_score != null ? (
          <>
            <ScoreBar score={s.case_strength_score} />
            {s.score_reasoning && (
              <p style={{ fontSize: '10px', color: C.mutedText, marginTop: '6px', lineHeight: '1.6' }}>
                {s.score_reasoning}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic', marginBottom: '6px' }}>Case strength assessment pending.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.green, textTransform: 'uppercase', marginBottom: '4px' }}>
              &#10003; Positive Factors
            </div>
            {s.positive_factors && s.positive_factors.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {s.positive_factors.map((f, i) => (
                  <li key={i} style={{ fontSize: '9.5px', color: C.bodyText, padding: '2px 0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ color: C.green, fontWeight: 700 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: '9.5px', color: C.grayLight, fontStyle: 'italic' }}>None identified yet.</p>}
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: C.amber, textTransform: 'uppercase', marginBottom: '4px' }}>
              &#9888; Uncertain Factors
            </div>
            {s.uncertain_factors && s.uncertain_factors.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {s.uncertain_factors.map((f, i) => (
                  <li key={i} style={{ fontSize: '9.5px', color: C.bodyText, padding: '2px 0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ color: C.amber, fontWeight: 700 }}>&#9888;</span> {f}
                  </li>
                ))}
              </ul>
            ) : <p style={{ fontSize: '9.5px', color: C.grayLight, fontStyle: 'italic' }}>None identified yet.</p>}
          </div>
        </div>
      </Section>

      {/* ── 13. MISSING INFORMATION ── */}
      <Section num={13} title="Missing Information" titleHi={'\u0905\u092A\u0942\u0930\u094D\u0923 \u091C\u093E\u0928\u0915\u093E\u0930\u0940'}>
        {s.missing_information && s.missing_information.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {s.missing_information.map((item, i) => (
              <li key={i} style={{
                padding: '5px 8px', marginBottom: '3px', fontSize: '10px',
                borderLeft: `2px solid ${C.amber}`, background: '#FFFBEB',
                color: C.amber, display: 'flex', alignItems: 'flex-start', gap: '6px',
              }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>&#9888;</span>
                {item}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '10px', color: C.green }}>No missing information identified.</p>}
      </Section>

      {/* ── 14. ACTIONS ALREADY TAKEN ── */}
      <Section num={14} title="Actions Already Taken" titleHi={'\u092A\u0939\u0932\u0947 \u0938\u0947 \u0909\u0920\u093E\u092F\u0947 \u0917\u092F\u0947 \u0915\u0926\u092E'}>
        {s.actions_already_taken && s.actions_already_taken.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {s.actions_already_taken.map((item, i) => (
              <li key={i} style={{ padding: '4px 8px', marginBottom: '2px', fontSize: '10px', background: C.bg, border: `1px solid ${C.grayBorder}`, borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: C.green, fontWeight: 700 }}>&#10003;</span> {item}
              </li>
            ))}
          </ul>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No previous actions recorded.</p>}
      </Section>

      {/* ── 15. RECOMMENDED NEXT STEPS ── */}
      <Section num={15} title="Recommended Next Steps" titleHi={'\u0905\u0917\u0932\u093E \u0915\u0926\u092E'}>
        {s.recommended_next_steps && s.recommended_next_steps.length > 0 ? (
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {s.recommended_next_steps.map((step, i) => (
              <li key={i} style={{ fontSize: '10px', marginBottom: '3px', color: C.bodyText }}>{step}</li>
            ))}
          </ol>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No next steps recommended yet.</p>}
      </Section>

      {/* ── 16. QUESTIONS FOR ADVOCATE ── */}
      <Section num={16} title="Questions for Advocate" titleHi={'\u0935\u0915\u0940\u0932 \u0938\u0947 \u0938\u0935\u093E\u0932\u0947\u0902'}>
        {s.questions_for_lawyer && s.questions_for_lawyer.length > 0 ? (
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {s.questions_for_lawyer.map((q, i) => (
              <li key={i} style={{ fontSize: '10px', marginBottom: '3px', color: C.bodyText }}>{q}</li>
            ))}
          </ol>
        ) : <p style={{ fontSize: '10px', color: C.grayLight, fontStyle: 'italic' }}>No questions for advocate yet.</p>}
      </Section>

      {/* ── FOOTER ── */}
      <Footer reportId={s.report_id} version={s.version} date={s.ai_last_updated_at} />
    </div>
  );
};

export default ReportTemplate;
