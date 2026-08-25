import { Router } from 'express';
import { ServerContext } from './context';
import { requireAuth, AuthedRequest } from './authMiddleware';
import { getSupabase } from '../lib/db/client';

const LOGO_URL = 'https://zperifsbcjfmngfugfdd.supabase.co/storage/v1/object/public/logo/LOGO.png';

const C = {
  navy: '#0B1F3A', navyLight: '#12284A', gold: '#B8860B', goldLight: '#D4A843',
  goldBg: '#FDF8EF', gray: '#64748B', grayLight: '#94A3B8', grayBorder: '#D8DCE3',
  bg: '#F7F8FA', white: '#FFFFFF', red: '#8B1A1A', green: '#166534',
  amber: '#92400E', bodyText: '#1E293B', mutedText: '#475569',
};

function formatDate(d: string | null) {
  if (!d) return 'Not provided';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

function provTagHtml(label: string) {
  const colors: Record<string, { bg: string; fg: string }> = {
    'User-stated': { bg: '#E5E7EB', fg: '#374151' },
    'AI-inferred': { bg: '#DBEAFE', fg: '#1E40AF' },
    'Document-derived': { bg: '#DCFCE7', fg: '#166534' },
    'Unverified': { bg: '#FEF3C7', fg: '#92400E' },
  };
  const c = colors[label] || colors['User-stated'];
  return `<span style="display:inline-block;padding:1px 6px;font-size:8px;font-weight:700;border-radius:2px;background:${c.bg};color:${c.fg};margin-left:6px;vertical-align:middle;letter-spacing:0.3px;">${label}</span>`;
}

function missingHtml() {
  return `<em style="color:${C.grayLight};font-style:italic">Not provided</em>`;
}

function buildReportHtml(s: any, caseId: string): string {
  const statusLabel = (s.report_status || 'DRAFT').replace(/_/g, ' ');
  const hasAdvocate = s.assigned_lawyer_name && s.lawyer_accepted_at;

  function sectionBadge(num: number) {
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:3px;background:${C.navy};color:${C.white};font-size:10px;font-weight:800;margin-right:8px;border:1px solid ${C.gold};flex-shrink:0;">${num}</span>`;
  }

  function section(num: number, title: string, titleHi: string, content: string) {
    return `<div style="margin-bottom:18px;page-break-inside:avoid;">
      <div style="display:flex;align-items:baseline;gap:6px;border-bottom:1px solid ${C.grayBorder};padding-bottom:6px;margin-bottom:10px;">
        ${sectionBadge(num)}
        <span style="font-size:11px;font-weight:800;color:${C.navy};text-transform:uppercase;letter-spacing:0.5px;">${title}</span>
        <span style="font-size:9px;color:${C.gray};margin-left:6px;">${titleHi}</span>
      </div>
      ${content}
    </div>`;
  }

  function kv(label: string, value: string | null | undefined) {
    return `<div style="margin-bottom:6px;">
      <div style="font-size:9px;font-weight:700;color:${C.gray};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
      <div style="font-size:10.5px;color:${C.bodyText};">${value || 'Not provided'}</div>
    </div>`;
  }

  function dataTable(headers: string[], rows: string[][]) {
    let html = `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:6px;">
      <thead><tr>${headers.map(h => `<th style="background:${C.navy};color:${C.white};padding:5px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;border:1px solid ${C.navyLight};">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((row, ri) => `<tr style="background:${ri % 2 === 0 ? C.white : C.bg};">${row.map(cell => `<td style="padding:5px 8px;border:1px solid ${C.grayBorder};color:${C.bodyText};vertical-align:top;">${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
    return html;
  }

  function listOrEmpty(items: string[] | undefined, emptyMsg: string, color?: string) {
    if (!items || items.length === 0) return `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">${emptyMsg}</p>`;
    return `<ul style="margin:0;padding:0;list-style:none;">${items.map(item => `<li style="padding:4px 8px;margin-bottom:2px;font-size:10px;${color ? `border-left:2px solid ${color};background:${color === C.green ? '#F0FDF4' : '#FFFBEB'};` : `background:${C.bg};border:1px solid ${C.grayBorder};border-radius:2px;`}display:flex;align-items:flex-start;gap:6px;"><span style="font-weight:700;flex-shrink:0;color:${color || C.bodyText};">${color === C.green ? '&#10003;' : color === C.amber ? '&#9888;' : '&#8226;'}</span>${item}${color ? provTagHtml(color === C.green ? 'User-stated' : 'Unverified') : ''}</li>`).join('')}</ul>`;
  }

  // Build sections
  const s1 = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
    ${kv('Case Title', s.case_title)}${kv('Category', s.case_category?.toUpperCase())}${kv('Sub-Category', s.case_sub_category)}
    ${kv('Location', s.location)}${kv('Incident Date', s.incident_date)}${kv('Status', statusLabel)}
  </div>`;

  const s2 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
    <div style="padding:10px;background:${C.bg};border:1px solid ${C.grayBorder};border-radius:2px;">
      <div style="font-size:9px;font-weight:700;color:${C.gray};text-transform:uppercase;margin-bottom:4px;">Complainant / Applicant</div>
      <div style="font-size:11px;font-weight:700;color:${C.navy};">${s.complainant_name || 'Not provided'}</div>
      ${s.complainant_role ? `<div style="font-size:9.5px;color:${C.mutedText};margin-top:1px;">${s.complainant_role}</div>` : ''}
      ${s.complainant_details ? `<div style="font-size:9.5px;color:${C.mutedText};margin-top:3px;">${s.complainant_details}</div>` : ''}
    </div>
    <div style="padding:10px;background:${C.bg};border:1px solid ${C.grayBorder};border-radius:2px;">
      <div style="font-size:9px;font-weight:700;color:${C.gray};text-transform:uppercase;margin-bottom:4px;">Opposite Party / Respondent</div>
      <div style="font-size:11px;font-weight:700;color:${C.navy};">${s.opposite_party_name || 'Not provided'}</div>
      ${s.opposite_party_role ? `<div style="font-size:9.5px;color:${C.mutedText};margin-top:1px;">${s.opposite_party_role}</div>` : ''}
      ${s.opposite_party_details ? `<div style="font-size:9.5px;color:${C.mutedText};margin-top:3px;">${s.opposite_party_details}</div>` : ''}
    </div>
  </div>
  ${s.relationship_between_parties ? `<div style="font-size:9.5px;color:${C.mutedText};margin-top:8px;"><strong>Relationship:</strong> ${s.relationship_between_parties}</div>` : ''}`;

  const s3 = `<p style="font-size:10.5px;color:${C.bodyText};white-space:pre-wrap;line-height:1.7;">${s.executive_summary || missingHtml()}</p>`;

  const s4 = s.case_timeline && s.case_timeline.length > 0
    ? dataTable(['Date', 'Event', 'Source'], s.case_timeline.map((item: any) => [item.date || 'Unknown', item.event, item.source || '']))
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">No timeline data available yet.</p>`;

  const s5 = listOrEmpty(s.key_facts, 'No key facts extracted yet.', C.green);
  const s6 = listOrEmpty(s.disputed_facts, 'No disputed facts identified.', C.amber);

  const s7docs = s.documents_list && s.documents_list.length > 0
    ? dataTable(['#', 'Document', 'Provenance'], s.documents_list.map((doc: string, i: number) => [String(i + 1), `<span style="font-weight:600;">${doc}</span>`, provTagHtml('Document-derived')]))
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;margin-bottom:8px;">No documents uploaded yet.</p>`;
  const s7ev = s.evidence_list && s.evidence_list.length > 0
    ? `<div style="margin-top:10px;"><div style="font-size:9px;font-weight:700;color:${C.gray};text-transform:uppercase;margin-bottom:4px;">Evidence</div><ul style="margin:0;padding:0;list-style:none;">${s.evidence_list.map((ev: string) => `<li style="padding:4px 8px;margin-bottom:2px;font-size:10px;background:${C.bg};border:1px solid ${C.grayBorder};border-radius:2px;">${ev} ${provTagHtml('User-stated')}</li>`).join('')}</ul></div>`
    : '';
  const s7 = s7docs + s7ev;

  const s8 = listOrEmpty(s.witnesses, 'No witnesses identified yet.');

  const s9 = s.applicable_laws && s.applicable_laws.length > 0
    ? dataTable(['Law', 'Section', 'Relevance', 'Citation'], s.applicable_laws.map((law: any) => [`<span style="font-weight:700;">${law.law}</span>`, law.section, law.relevance, law.citation || `<em style="color:${C.grayLight}">Needs verification</em>`]))
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">No applicable law sections identified yet.</p>`;

  const s10 = s.legal_questions && s.legal_questions.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${s.legal_questions.map((q: string) => `<li style="font-size:10px;margin-bottom:3px;color:${C.bodyText};">${q}</li>`).join('')}</ol>`
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">No legal questions identified yet.</p>`;

  const s11 = `<div style="display:inline-block;padding:2px 8px;font-size:8px;font-weight:700;background:#EEF2FF;color:#3730A3;border-radius:2px;margin-bottom:8px;letter-spacing:0.3px;">AI-ASSISTED PRELIMINARY ANALYSIS</div>
    <p style="font-size:9px;color:${C.gray};font-style:italic;margin-bottom:6px;">This section is AI-generated and should not be treated as a judicial finding or legal opinion.</p>
    <p style="font-size:10.5px;color:${C.bodyText};white-space:pre-wrap;line-height:1.7;">${s.ai_analysis || 'AI analysis pending. Information is being gathered from the conversation and uploaded documents.'}</p>`;

  const score = s.case_strength_score;
  const s12 = score != null ? `
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">
      <span style="font-size:28px;font-weight:800;color:${C.navy};line-height:1;">${score}</span>
      <span style="font-size:11px;color:${C.gray};">/100</span>
    </div>
    <div style="width:100%;height:8px;background:#E2E8F0;border-radius:2px;overflow:hidden;">
      <div style="width:${Math.min(100, Math.max(0, score))}%;height:100%;background:${score < 40 ? '#DC2626' : score < 70 ? C.gold : C.green};border-radius:2px;"></div>
    </div>
    <p style="font-size:9px;color:${C.gray};font-style:italic;margin-top:4px;">AI-generated preliminary assessment — not a judicial finding.</p>
    ${s.score_reasoning ? `<p style="font-size:10px;color:${C.mutedText};margin-top:6px;line-height:1.6;">${s.score_reasoning}</p>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
      <div>
        <div style="font-size:9px;font-weight:700;color:${C.green};text-transform:uppercase;margin-bottom:4px;">&#10003; Positive Factors</div>
        ${s.positive_factors && s.positive_factors.length > 0
          ? `<ul style="margin:0;padding:0;list-style:none;">${s.positive_factors.map((f: string) => `<li style="font-size:9.5px;color:${C.bodyText};padding:2px 0;display:flex;align-items:flex-start;gap:4px;"><span style="color:${C.green};font-weight:700;">&#10003;</span> ${f}</li>`).join('')}</ul>`
          : `<p style="font-size:9.5px;color:${C.grayLight};font-style:italic;">None identified yet.</p>`}
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;color:${C.amber};text-transform:uppercase;margin-bottom:4px;">&#9888; Uncertain Factors</div>
        ${s.uncertain_factors && s.uncertain_factors.length > 0
          ? `<ul style="margin:0;padding:0;list-style:none;">${s.uncertain_factors.map((f: string) => `<li style="font-size:9.5px;color:${C.bodyText};padding:2px 0;display:flex;align-items:flex-start;gap:4px;"><span style="color:${C.amber};font-weight:700;">&#9888;</span> ${f}</li>`).join('')}</ul>`
          : `<p style="font-size:9.5px;color:${C.grayLight};font-style:italic;">None identified yet.</p>`}
      </div>
    </div>`
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;margin-bottom:6px;">Case strength assessment pending.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">
        <div><div style="font-size:9px;font-weight:700;color:${C.green};text-transform:uppercase;margin-bottom:4px;">&#10003; Positive Factors</div><p style="font-size:9.5px;color:${C.grayLight};font-style:italic;">None identified yet.</p></div>
        <div><div style="font-size:9px;font-weight:700;color:${C.amber};text-transform:uppercase;margin-bottom:4px;">&#9888; Uncertain Factors</div><p style="font-size:9.5px;color:${C.grayLight};font-style:italic;">None identified yet.</p></div>
      </div>`;

  const s13 = s.missing_information && s.missing_information.length > 0
    ? `<ul style="margin:0;padding:0;list-style:none;">${s.missing_information.map((item: string) => `<li style="padding:5px 8px;margin-bottom:3px;font-size:10px;border-left:2px solid ${C.amber};background:#FFFBEB;color:${C.amber};display:flex;align-items:flex-start;gap:6px;"><span style="font-weight:700;flex-shrink:0;">&#9888;</span>${item}</li>`).join('')}</ul>`
    : `<p style="font-size:10px;color:${C.green};">No missing information identified.</p>`;

  const s14 = listOrEmpty(s.actions_already_taken, 'No previous actions recorded.');

  const s15 = s.recommended_next_steps && s.recommended_next_steps.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${s.recommended_next_steps.map((step: string) => `<li style="font-size:10px;margin-bottom:3px;color:${C.bodyText};">${step}</li>`).join('')}</ol>`
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">No next steps recommended yet.</p>`;

  const s16 = s.questions_for_lawyer && s.questions_for_lawyer.length > 0
    ? `<ol style="margin:0;padding-left:20px;">${s.questions_for_lawyer.map((q: string) => `<li style="font-size:10px;margin-bottom:3px;color:${C.bodyText};">${q}</li>`).join('')}</ol>`
    : `<p style="font-size:10px;color:${C.grayLight};font-style:italic;">No questions for advocate yet.</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Noto Sans Devanagari', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10.5px; line-height: 1.6; color: ${C.bodyText};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div style="padding:0;font-family:'Inter','Noto Sans Devanagari','Helvetica Neue',Arial,sans-serif;font-size:10.5px;line-height:1.6;color:${C.bodyText};">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;margin-bottom:4px;border-bottom:1px solid ${C.grayBorder};">
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="${LOGO_URL}" style="height:32px;object-fit:contain;" />
      <div>
        <div style="font-size:14px;font-weight:800;color:${C.navy};letter-spacing:0.3px;line-height:1.1;">Mera Wakeel AI</div>
        <div style="font-size:8px;color:${C.gray};margin-top:1px;">ग्रम वकील</div>
      </div>
    </div>
    <div style="text-align:right;font-size:9px;">
      <div style="color:${C.gray};font-weight:600;">REPORT ID</div>
      <div style="font-weight:800;color:${C.navy};">${s.report_id || 'N/A'}</div>
      <div style="color:${C.gray};font-weight:600;margin-top:3px;">CASE ID</div>
      <div style="font-weight:700;color:${C.navy};font-size:8px;word-break:break-all;">${caseId || 'N/A'}</div>
      <div style="color:${C.gray};font-weight:600;margin-top:3px;">GENERATED</div>
      <div style="font-weight:700;color:${C.bodyText};">${formatDate(s.ai_generated_at)}</div>
      <div style="color:${C.gray};font-weight:600;margin-top:3px;">LAST UPDATED</div>
      <div style="font-weight:700;color:${C.bodyText};">${formatDate(s.ai_last_updated_at)}</div>
    </div>
  </div>

  <!-- GOLD LINE -->
  <div style="height:2px;background:${C.gold};margin-bottom:12px;"></div>

  <!-- CONFIDENTIALITY -->
  <div style="display:inline-block;padding:3px 10px;font-size:8.5px;font-weight:800;color:${C.red};border:1px solid ${C.red};border-radius:2px;letter-spacing:0.5px;margin-bottom:12px;">CONFIDENTIAL — ATTORNEY CASE FILE</div>

  <!-- TITLE -->
  <div style="text-align:center;margin-bottom:18px;">
    <div style="font-size:16px;font-weight:800;color:${C.navy};letter-spacing:1.5px;text-transform:uppercase;">Case Summary Report</div>
    <div style="font-size:11px;color:${C.gray};margin-top:2px;">मामला सारांश रिपोर्ट</div>
    <div style="font-size:8.5px;color:${C.grayLight};font-style:italic;margin-top:4px;">This AI-generated legal briefing is for preliminary evaluation purposes only and does not constitute formal legal advice.</div>
  </div>

  ${hasAdvocate ? `
  <!-- ASSIGNED ADVOCATE -->
  <div style="padding:10px 14px;background:${C.goldBg};border:1px solid ${C.goldLight};border-radius:2px;margin-bottom:16px;">
    <div style="font-size:9px;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Assigned Advocate</div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:36px;height:36px;border-radius:50%;background:${C.navy};color:${C.white};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;">${s.assigned_lawyer_name.charAt(0)}</div>
      <div>
        <div style="font-size:12px;font-weight:800;color:${C.navy};">${s.assigned_lawyer_name}</div>
        <div style="font-size:9px;color:${C.mutedText};">Bar Council Verified · Assigned on: ${formatDate(s.lawyer_accepted_at)}</div>
      </div>
    </div>
  </div>` : ''}

  <!-- 16 SECTIONS -->
  ${section(1, 'Case Identification', 'मामले पहचान', s1)}
  ${section(2, 'Parties Involved', 'शामिल पक्ष', s2)}
  ${section(3, 'Executive Case Summary', 'सारांश', s3)}
  ${section(4, 'Chronology / Case Timeline', 'समय सूची', s4)}
  ${section(5, 'Key Facts', 'मुख्य तथ्य', s5)}
  ${section(6, 'Disputed / Unclear Facts', 'विवादित तथ्य', s6)}
  ${section(7, 'Documents & Evidence', 'दस्तावेज़ और साक्ष्य', s7)}
  ${section(8, 'Witnesses', 'गवाह', s8)}
  ${section(9, 'Applicable Laws', 'लागू सदनता', s9)}
  ${section(10, 'Legal Questions', 'कानूनी सवालें', s10)}
  ${section(11, 'AI-Assisted Preliminary Analysis', 'एआई विश्लेषण', s11)}
  ${section(12, 'Case Strength Assessment', 'मामले बल', s12)}
  ${section(13, 'Missing Information', 'अपूर्ण जानकारी', s13)}
  ${section(14, 'Actions Already Taken', 'पहले से किये गये कदम', s14)}
  ${section(15, 'Recommended Next Steps', 'अगला कदम', s15)}
  ${section(16, 'Questions for Advocate', 'वकील से सवालें', s16)}

  <!-- FOOTER -->
  <div style="border-top:2px solid ${C.navy};padding-top:10px;margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;font-size:8px;color:${C.gray};">
    <div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        <img src="${LOGO_URL}" style="height:14px;" />
        <span style="font-weight:700;font-size:9px;color:${C.navy};">Mera Wakeel AI</span>
      </div>
      <p style="font-style:italic;font-size:7.5px;">Ghabraiye Nahi, Hum Hain Aapke Saath.</p>
    </div>
    <div style="text-align:center;">
      <p style="font-weight:700;font-size:8px;color:${C.red};">CONFIDENTIAL</p>
      <p style="font-size:7px;">This document is confidential. Do not share without authorization.</p>
      <p style="font-size:7px;margin-top:1px;">यह दस्तावेज़ गोपनीय है। कृपया अनधिकृत रूप से साझा न करें।</p>
    </div>
    <div style="text-align:right;">
      <p style="font-weight:700;">Report ID: ${s.report_id || 'N/A'}</p>
      <p>Version: v${s.version || 1} | ${formatDate(s.ai_last_updated_at)}</p>
    </div>
  </div>

</div>
</body>
</html>`;
}

export function registerPdfRoutes(app: Router, _ctx: ServerContext) {
  app.post('/api/pdf/generate', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { caseId } = req.body;
      if (!caseId) {
        res.status(400).json({ success: false, error: 'caseId required' });
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        res.status(500).json({ success: false, error: 'Database not available' });
        return;
      }

      // Fetch latest case summary
      const { data: summary, error } = await supabase
        .from('case_summaries')
        .select('*')
        .eq('case_id', caseId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !summary) {
        res.status(404).json({ success: false, error: 'Case summary not found' });
        return;
      }

      const html = buildReportHtml(summary, caseId);

      // Dynamic import of puppeteer (so server doesn't crash if chromium not available)
      let puppeteer: any;
      try {
        puppeteer = await import('puppeteer');
      } catch {
        res.status(500).json({ success: false, error: 'PDF engine not available. Chromium may need to be installed.' });
        return;
      }

      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' },
      });

      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="MWA-Report-${summary.report_id || caseId.slice(0, 8)}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (err: any) {
      console.error('PDF generation error:', err);
      res.status(500).json({ success: false, error: err.message || 'PDF generation failed' });
    }
  });
}
