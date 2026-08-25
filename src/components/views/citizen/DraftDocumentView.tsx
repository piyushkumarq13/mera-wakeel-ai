import React, { useRef, useState } from 'react';
import { Language } from '../../../types';
import {
  DOCUMENT_TEMPLATES,
  DocumentTemplateKey,
  renderDocument,
} from '../../../lib/documentTemplates';
import { generateDocument, trackEvent } from '../../../lib/supabase';
import {
  FileText,
  ArrowLeft,
  Sparkles,
  Download,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  Phone,
  Siren,
  HeartHandshake,
} from 'lucide-react';
import {
  RefHero,
  RefSectionHeading,
  RefFeatureGrid,
  RefBottomColumns,
} from '../../ReferenceSections';

interface DraftDocumentViewProps {
  language: Language;
  currentUser?: { userId: string; email: string; role: 'citizen' | 'lawyer'; name?: string } | null;
  onBackToHome: () => void;
}

interface GeneratedResult {
  docxBase64: string;
  fileName: string;
  text: string;
  mimeType: string;
}

const EN: Record<string, string> = {
  back: 'Back to Home',
  title: 'AI Document Drafting',
  subtitle: 'Generate professionally drafted legal documents with AI assistance.',
  templatesTitle: 'Available Templates',
  chooseTemplate: 'Choose a Template',
  templatesHelp: 'Select the type of legal document you want to draft.',
  step1Title: 'Step 1 — Choose a Template',
  step1Subtitle: 'Select the type of legal document you want to draft.',
  step2Title: 'Step 2 — Fill in the Details',
  step3Title: 'Step 3 — Generate & Download',
  draftWith: 'Draft with this template',
  stepsTitle: 'How to draft (4 Steps)',
  stepA: 'Create your account',
  stepADesc: 'Sign in as a Citizen to save your drafted documents and case history.',
  stepB: 'Choose a template',
  stepBDesc: 'Pick the legal document you need — notice, agreement, complaint or application.',
  stepC: 'Fill in the details',
  stepCDesc: 'Enter the required names, dates and amounts. The live preview updates instantly.',
  stepD: 'Generate & download',
  stepDDesc: 'AI drafts a ready PDF or Word file which you can download and review.',
  faqTitle: 'Frequently Asked Questions',
  faqLegalQ: 'Is drafting legal advice?',
  faqLegalA: 'No — generated drafts are AI assistance for preliminary use. Always get a final review from a Bar Council-registered advocate before filing.',
  faqFormatQ: 'Which format do I get?',
  faqFormatA: 'Documents are generated as Word (.docx) files so you can edit them before printing or filing.',
  faqFreeQ: 'Is document drafting free?',
  faqFreeA: 'Yes. AI document drafting on this platform is completely free for registered citizens.',
  faqReviewQ: 'Should I still consult an advocate?',
  faqReviewA: 'Yes. Legal documents should be reviewed and finalised by a qualified advocate before they are used or filed in any court.',
  emergencyTitle: 'Immediate Help',
  emergencyNalsa: 'National Legal Aid',
  emergencyPolice: 'Police Emergency',
  emergencyWomen: 'Women Helpline',
  trustText: 'Secure & Confidential',
  generate: 'Generate with AI',
  generating: 'Generating…',
  required: 'Required',
  reset: 'Reset Form',
  draftPreview: 'Draft Preview',
  draftPreviewHint: 'Live plain-text draft built from your entries.',
  showPreview: 'Show Preview',
  hidePreview: 'Hide Preview',
  selectTemplate: 'Please select a template to begin.',
  generated: 'Document generated. Downloading…',
  downloadAgain: 'Download Again',
  generatedPreview: 'Generated Document Preview',
  error: 'Something went wrong while generating the document. Please try again.',
  disclaimer: 'This is AI-generated guidance, not a substitute for a licensed advocate\u2019s advice.',
  disclaimerNote: 'Legal drafting should be reviewed and finalised by a qualified advocate before it is used or filed.',
  emptyPreview: 'Fill in the fields above to see a live draft preview.',
};

const HI: Record<string, string> = {
  back: 'होम पर वापस जाएँ',
  title: 'AI दस्तावेज़ निर्माण',
  subtitle: 'AI सहायता से पेशेवर कानूनी दस्तावेज़ बनाएँ।',
  templatesTitle: 'उपलब्ध टेम्पलेट्स (Available Templates)',
  chooseTemplate: 'टेम्पलेट चुनें',
  templatesHelp: 'जिस प्रकार का कानूनी दस्तावेज़ बनाना है उसे चुनें।',
  step1Title: 'चरण 1 — टेम्पलेट चुनें',
  step1Subtitle: 'जिस प्रकार का कानूनी दस्तावेज़ बनाना है उसे चुनें।',
  step2Title: 'चरण 2 — विवरण भरें',
  step3Title: 'चरण 3 — बनाएँ और डाउनलोड करें',
  draftWith: 'इस टेम्पलेट से बनाएं',
  stepsTitle: 'कैसे बनाएं (4 कदम)',
  stepA: 'अपना खाता बनाएं',
  stepADesc: 'नागरिक के रूप में साइन इन करें ताकि अपने दस्तावेज़ और केस इतिहास सुरक्षित रहें।',
  stepB: 'टेम्पलेट चुनें',
  stepBDesc: 'अपने लिए ज़रूरी कानूनी दस्तावेज़ चुनें — नोटिस, समझौता, शिकायत या आवेदन।',
  stepC: 'विवरण भरें',
  stepCDesc: 'नाम, तिथियां और राशियां दर्ज करें। लाइव पूर्वावलोकन तुरंत अपडेट होता है।',
  stepD: 'बनाएँ और डाउनलोड करें',
  stepDDesc: 'AI तैयार PDF या Word फ़ाइल बनाता है जिसे आप डाउनलोड और समीक्षा कर सकते हैं।',
  faqTitle: 'अक्सर पूछे जाने वाले प्रश्न (FAQ)',
  faqLegalQ: 'क्या दस्तावेज़ बनाना कानूनी सलाह है?',
  faqLegalA: 'नहीं — तैयार दस्तावेज़ केवल प्रारंभिक उपयोग के लिए AI सहायता हैं। दाखिल करने से पहले हमेशा बार काउंसिल पंजीकृत अधिवक्ता से अंतिम समीक्षा कराएं।',
  faqFormatQ: 'मुझे कौन सा फॉर्मेट मिलेगा?',
  faqFormatA: 'दस्तावेज़ Word (.docx) फ़ाइल के रूप में बनते हैं ताकि आप छपाई या दाखिल करने से पहले उनमें संपादन कर सकें।',
  faqFreeQ: 'क्या दस्तावेज़ बनाना मुफ्त है?',
  faqFreeA: 'हां। इस प्लेटफार्म पर AI दस्तावेज़ निर्माण पंजीकृत नागरिकों के लिए पूरी तरह मुफ्त है।',
  faqReviewQ: 'क्या मुझे अभी भी अधिवक्ता से परामर्श करना चाहिए?',
  faqReviewA: 'हां। किसी भी अदालत में उपयोग या दाखिल करने से पहले कानूनी दस्तावेज़ की समीक्षा किसी योग्य अधिवक्ता से कराएं।',
  emergencyTitle: 'तत्काल सहायता',
  emergencyNalsa: 'राष्ट्रीय विधिक सहायता',
  emergencyPolice: 'पुलिस आपातकाल',
  emergencyWomen: 'महिला हेल्पलाइन',
  trustText: 'सुरक्षित एवं गोपनीय',
  generate: 'AI से बनाएं',
  generating: 'बन रहा है…',
  required: 'आवश्यक',
  reset: 'फ़ॉर्म रीसेट करें',
  draftPreview: 'ड्राफ़्ट पूर्वावलोकन',
  draftPreviewHint: 'आपकी जानकारी से बना लाइव सादा-पाठ ड्राफ़्ट।',
  showPreview: 'पूर्वावलोकन दिखाएँ',
  hidePreview: 'पूर्वावलोकन छिपाएँ',
  selectTemplate: 'शुरू करने के लिए कृपया एक टेम्पलेट चुनें।',
  generated: 'दस्तावेज़ तैयार है। डाउनलोड हो रहा है…',
  downloadAgain: 'फिर से डाउनलोड करें',
  generatedPreview: 'तैयार दस्तावेज़ का पूर्वावलोकन',
  error: 'दस्तावेज़ बनाने में कुछ समस्या हुई। कृपया पुनः प्रयास करें।',
  disclaimer: 'यह AI-जनित मार्गदर्शन है, यह किसी लाइसेंस प्राप्त अधिवक्ता की सलाह का विकल्प नहीं है।',
  disclaimerNote: 'कानूनी दस्तावेज़ का उपयोग या दाखिल करने से पहले उसकी समीक्षा किसी योग्य अधिवक्ता से कराएँ।',
  emptyPreview: 'लाइव ड्राफ़्ट पूर्वावलोकन देखने के लिए ऊपर के फ़ील्ड भरें।',
};

const STRINGS: Record<string, Record<string, string>> = { en: EN, hi: HI };

function tr(language: Language, key: string): string {
  return (STRINGS[language] && STRINGS[language][key]) || EN[key];
}

const TEMPLATE_KEYS = Object.keys(DOCUMENT_TEMPLATES) as DocumentTemplateKey[];

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function triggerDownload(href: string, fileName: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const DraftDocumentView: React.FC<DraftDocumentViewProps> = ({
  language,
  currentUser,
  onBackToHome,
}) => {
  const [selectedKey, setSelectedKey] = useState<DocumentTemplateKey | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedResult | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const formSectionRef = useRef<HTMLElement | null>(null);

  const selectedTemplate = selectedKey ? DOCUMENT_TEMPLATES[selectedKey] : null;

  const allRequiredFilled = selectedTemplate
    ? selectedTemplate.fields.every((f) => !f.required || (values[f.key] ?? '').trim() !== '')
    : false;

  const setField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const selectTemplate = (key: DocumentTemplateKey) => {
    setSelectedKey(key);
    setValues({});
    setGeneratedResult(null);
    setSuccessMsg(null);
    setError(null);
    window.setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const resetForm = () => {
    setValues({});
    setGeneratedResult(null);
    setSuccessMsg(null);
    setError(null);
  };

  const downloadResult = (result: GeneratedResult) => {
    const baseName = result.fileName || `${selectedKey || 'document'}-draft`;
    if (result.docxBase64) {
      const blob = base64ToBlob(result.docxBase64, result.mimeType || DOCX_MIME);
      const url = URL.createObjectURL(blob);
      triggerDownload(url, baseName);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } else {
      const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, baseName);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  };

  const handleGenerate = async () => {
    if (!selectedKey) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await generateDocument(selectedKey, values, currentUser?.userId);
      if (!result) {
        throw new Error('Empty response from document generation.');
      }
      downloadResult(result);
      setGeneratedResult(result);
      setSuccessMsg(tr(language, 'generated'));
      trackEvent('document_generated', { template: selectedKey, user_id: currentUser?.userId });
    } catch (err) {
      setError(tr(language, 'error'));
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full border border-[#E2E8F0] bg-white rounded-lg px-3 py-2 text-sm text-[#0F1D38] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-[#D98800] transition-all';

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-14 font-sans text-[#1F2937]">
      <RefHero
        icon={FileText}
        title={tr(language, 'title')}
        subtitle={tr(language, 'subtitle')}
        actions={[
          {
            label: tr(language, 'back'),
            variant: 'outline',
            icon: ArrowLeft,
            onClick: onBackToHome,
          },
          {
            label: tr(language, 'chooseTemplate'),
            variant: 'gold',
            icon: Sparkles,
            onClick: () => {
              document.getElementById('mw-templates')?.scrollIntoView({ behavior: 'smooth' });
            },
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {currentUser && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0F1D38] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-full w-fit shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            <span className="uppercase tracking-wide">{currentUser.name || currentUser.email?.split('@')[0]}</span>
          </div>
        )}

        {/* Section heading + Templates grid */}
        <section id="mw-templates" className="space-y-6 scroll-mt-6">
          <RefSectionHeading title={tr(language, 'templatesTitle')} />
          <RefFeatureGrid
            features={TEMPLATE_KEYS.map((key) => {
              const template = DOCUMENT_TEMPLATES[key];
              return {
                icon: FileText,
                title: template.label,
                desc: template.description,
                linkText: tr(language, 'draftWith'),
                onClick: () => selectTemplate(key),
              };
            })}
          />
        </section>

        {/* Step 2 — dynamic form */}
        {selectedTemplate && (
          <section
            ref={formSectionRef}
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 scroll-mt-6"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#F5A623] text-[#0F2557] text-sm font-black flex items-center justify-center">
                  2
                </span>
                <h2 className="text-lg font-black text-[#0F1D38]">{tr(language, 'step2Title')}</h2>
              </div>
              <button
                onClick={resetForm}
                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#D98800] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {tr(language, 'reset')}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              <span className="text-[#D98800]">*</span> {tr(language, 'required')}
            </p>
            <div className="space-y-4">
              {selectedTemplate.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-bold text-[#0F1D38] mb-1.5">
                    {field.label}
                    {field.required && <span className="text-[#D98800]"> *</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className={inputBase}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className={inputBase}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Step 3 — generate & download */}
        {selectedTemplate && (
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-[#F5A623] text-[#0F2557] text-sm font-black flex items-center justify-center">
                3
              </span>
              <h2 className="text-lg font-black text-[#0F1D38]">{tr(language, 'step3Title')}</h2>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!allRequiredFilled || loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#E0940F] disabled:bg-slate-300 disabled:cursor-not-allowed text-[#0F2557] font-black px-6 py-3 rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? tr(language, 'generating') : tr(language, 'generate')}
            </button>

            {error && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl px-3 py-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {successMsg && generatedResult && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => downloadResult(generatedResult)}
                    className="flex items-center gap-2 bg-[#0F2557] hover:bg-[#0F1D38] text-[#F5A623] font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {tr(language, 'downloadAgain')}
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F1D38] mb-2">{tr(language, 'generatedPreview')}</h3>
                  <pre className="whitespace-pre-wrap bg-[#0F2557] text-gray-100 text-xs rounded-xl p-4 max-h-80 overflow-y-auto leading-relaxed">
                    {generatedResult.text}
                  </pre>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Draft preview */}
        {selectedTemplate && (
          <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D98800]" />
                <h2 className="text-base font-black text-[#0F1D38]">{tr(language, 'draftPreview')}</h2>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${showPreview ? 'rotate-180' : ''}`}
              />
            </button>
            <p className="text-xs text-slate-500 mt-1 mb-3">{tr(language, 'draftPreviewHint')}</p>
            {showPreview && (
              <div className="bg-[#0F2557] rounded-xl p-4">
                {selectedTemplate.fields.some((f) => (values[f.key] ?? '').trim() !== '') ? (
                  <pre className="whitespace-pre-wrap text-gray-100 text-xs leading-relaxed max-h-80 overflow-y-auto">
                    {renderDocument(selectedKey, values)}
                  </pre>
                ) : (
                  <p className="text-xs text-gray-400 italic">{tr(language, 'emptyPreview')}</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Bottom 3-col: steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={tr(language, 'stepsTitle')}
          steps={[
            { title: tr(language, 'stepA'), desc: tr(language, 'stepADesc') },
            { title: tr(language, 'stepB'), desc: tr(language, 'stepBDesc') },
            { title: tr(language, 'stepC'), desc: tr(language, 'stepCDesc') },
            { title: tr(language, 'stepD'), desc: tr(language, 'stepDDesc') },
          ]}
          faqTitle={tr(language, 'faqTitle')}
          faqs={[
            { q: tr(language, 'faqLegalQ'), a: tr(language, 'faqLegalA') },
            { q: tr(language, 'faqFormatQ'), a: tr(language, 'faqFormatA') },
            { q: tr(language, 'faqFreeQ'), a: tr(language, 'faqFreeA') },
            { q: tr(language, 'faqReviewQ'), a: tr(language, 'faqReviewA') },
          ]}
          emergencyTitle={tr(language, 'emergencyTitle')}
          emergency={[
            {
              icon: Phone,
              color: 'bg-[#16A34A]/15 text-[#16A34A]',
              label: tr(language, 'emergencyNalsa'),
              value: '15100',
              href: 'tel:15100',
            },
            {
              icon: Siren,
              color: 'bg-[#DC2626]/15 text-[#DC2626]',
              label: tr(language, 'emergencyPolice'),
              value: '112',
              href: 'tel:112',
            },
            {
              icon: HeartHandshake,
              color: 'bg-[#DB2777]/15 text-[#DB2777]',
              label: tr(language, 'emergencyWomen'),
              value: '181',
              href: 'tel:181',
            },
          ]}
          trustText={tr(language, 'trustText')}
        />

        {/* Footer disclaimer */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl text-[#D98800] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-[#0F1D38]">{tr(language, 'disclaimer')}</p>
              <p className="text-xs text-slate-500 mt-1">{tr(language, 'disclaimerNote')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DraftDocumentView;