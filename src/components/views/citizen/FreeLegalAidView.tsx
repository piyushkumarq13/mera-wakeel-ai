import React from 'react';
import { Language } from '../../../types';
import { GOV_SCHEMES, GovScheme } from '../../../lib/govSchemes';
import { ArrowLeft, Phone, Landmark, ShieldCheck, Users, Info, HeartHandshake, Siren } from 'lucide-react';
import {
  RefHero,
  RefSectionHeading,
  RefFeatureGrid,
  RefBottomColumns,
} from '../../ReferenceSections';

interface FreeLegalAidViewProps {
  language: Language;
  onBackToHome: () => void;
}

const stripNonDigits = (value: string): string => value.replace(/\D/g, '');

interface LocRecord {
  en: string | string[];
  hi: string | string[];
}

const UI_STRINGS: Record<string, LocRecord> = {
  title: {
    en: 'Free Government Legal Aid',
    hi: 'निःशुल्क सरकारी विधिक सहायता',
  },
  subtitle: {
    en: 'Justice for every Indian — NALSA, Tele-Law, Lok Adalat. No lawyer fees, no paywall.',
    hi: 'हर भारतीय के लिए न्याय — NALSA, Tele-Law, Lok Adalat। कोई वकील फीस नहीं, कोई भुगतान नहीं।',
  },
  backToHome: { en: 'Back to Home', hi: 'होम पर जाएं' },
  callHelpline: { en: 'Call 15100 — Toll Free', hi: 'कॉल करें 15100 — टोल फ्री' },
  heroTitle: { en: 'Justice is your right', hi: 'न्याय आपका अधिकार है' },
  heroBody: {
    en: 'If you cannot afford a private lawyer, the Government of India provides free legal aid through NALSA, Tele-Law, and Common Service Centres. Eligibility is broad — women, children, SC/ST, persons with disabilities, industrial workers, low-income individuals and more are covered. No lawyer fees, no paywall. You only need to ask.',
    hi: 'यदि आप निजी वकील का खर्च वहन नहीं कर सकते, तो भारत सरकार NALSA, Tele-Law और Common Service Centres के माध्यम से निःशुल्क विधिक सहायता प्रदान करती है। पात्रता व्यापक है — महिलाएं, बच्चे, अनुसूचित जाति/जनजाति, दिव्यांगजन, औद्योगिक कर्मचारी, कम आय वाले व्यक्ति आदि शामिल हैं। कोई वकील फीस नहीं, कोई भुगतान नहीं। आपको बस मांगना है।',
  },
  heroBullets: {
    en: ['Free legal aid is a constitutional right', 'Free lawyers appointed by Legal Services Authorities', 'Toll-free helpline 15100 works across India', 'Available in rural and remote areas too'],
    hi: ['निःशुल्क विधिक सहायता एक संवैधानिक अधिकार है', 'विधिक सेवा प्राधिकरण द्वारा निःशुल्क वकील नियुक्त किए जाते हैं', 'टोल-फ्री हेल्पलाइन 15100 पूरे भारत में कार्य करती है', 'ग्रामीण और दूरदराज के क्षेत्रों में भी उपलब्ध'],
  },
  schemesTitle: { en: 'Available Schemes', hi: 'उपलब्ध योजनाएं' },
  visitWebsite: { en: 'Visit Website', hi: 'वेबसाइट देखें' },
  howNalsaWorks: { en: 'How NALSA works', hi: 'NALSA कैसे काम करता है' },
  howNalsaIntro: {
    en: 'From your first call to the courtroom, the legal aid machinery walks with you at every step — completely free.',
    hi: 'आपकी पहली कॉल से लेकर अदालत तक, विधिक सहायता व्यवस्था हर कदम पर आपके साथ चलती है — पूरी तरह निःशुल्क।',
  },
  step1Title: { en: 'Guardianship', hi: 'संरक्षण' },
  step1Body: {
    en: 'NALSA acts as your legal guardian — it takes up your matter and gives you the right to free legal representation.',
    hi: 'NALSA आपके कानूनी संरक्षक के रूप में कार्य करता है — यह आपका मामला उठाता है और आपको निःशुल्क कानूनी प्रतिनिधित्व का अधिकार देता है।',
  },
  step2Title: { en: 'Application to DLSA', hi: 'जिला विधिक सेवा प्राधिकरण में आवेदन' },
  step2Body: {
    en: 'Approach your District Legal Services Authority (DLSA) with your documents, or call 15100. The DLSA examines your eligibility.',
    hi: 'अपने दस्तावेजों के साथ जिला विधिक सेवा प्राधिकरण (DLSA) से संपर्क करें, या 15100 पर कॉल करें। DLSA आपकी पात्रता की जांच करता है।',
  },
  step3Title: { en: 'Free counsel appointed', hi: 'निःशुल्क अधिवक्ता की नियुक्ति' },
  step3Body: {
    en: 'The DLSA appoints an advocate from its panel to represent you — the lawyer is paid by the State, not by you.',
    hi: 'DLSA अपने पैनल से आपका प्रतिनिधित्व करने के लिए एक अधिवक्ता की नियुक्ति करता है — वकील का शुल्क राज्य द्वारा दिया जाता है, आपके द्वारा नहीं।',
  },
  step4Title: { en: 'Legal aid at no cost', hi: 'बिना किसी खर्च के विधिक सहायता' },
  step4Body: {
    en: 'Court fees, drafting, process serving and representation are covered — from the first hearing to the final order.',
    hi: 'अदालती शुल्क, मसौदा तैयार करना, समन की सेवा और प्रतिनिधित्व शामिल हैं — पहली सुनवाई से अंतिम आदेश तक।',
  },
  faqTitle: { en: 'Frequently Asked Questions', hi: 'अक्सर पूछे जाने वाले प्रश्न (FAQ)' },
  faqEligibleQ: { en: 'Who is eligible for free legal aid?', hi: 'मुफ्त विधिक सहायता के लिए कौन पात्र है?' },
  faqEligibleA: {
    en: 'Women, children, SC/ST members, persons with disabilities, industrial workers, persons in custody, victims of disasters or violence, and low-income individuals are covered under Section 12 of the Legal Services Authorities Act, 1987.',
    hi: 'महिलाएं, बच्चे, अनुसूचित जाति/जनजाति, दिव्यांगजन, औद्योगिक कर्मचारी, हिरासत में व्यक्ति, आपदा या हिंसा के पीड़ित और कम आय वाले व्यक्ति, विधिक सेवा प्राधिकरण अधिनियम, 1987 की धारा 12 के अंतर्गत शामिल हैं।',
  },
  faqFreeQ: { en: 'Is this really free?', hi: 'क्या यह वास्तव में मुफ्त है?' },
  faqFreeA: {
    en: 'Yes. Court fees, drafting and the lawyer\'s fee are paid by the State. You do not pay anything for legal aid under NALSA.',
    hi: 'हां। अदालती शुल्क, मसौदा और वकील का शुल्क राज्य द्वारा दिया जाता है। NALSA के तहत आपको कुछ भी भुगतान नहीं करना पड़ता।',
  },
  faqApplyQ: { en: 'How do I apply?', hi: 'आवेदन कैसे करें?' },
  faqApplyA: {
    en: 'Call toll-free 15100, or visit your nearest District Legal Services Authority (DLSA) or Common Service Centre (CSC). Ask for free legal aid.',
    hi: 'टोल-फ्री 15100 पर कॉल करें, या अपने निकटतम जिला विधिक सेवा प्राधिकरण (DLSA) या कॉमन सर्विस सेंटर (CSC) पर जाएं। मुफ्त विधिक सहायता मांगें।',
  },
  faqDocsQ: { en: 'What documents do I need?', hi: 'किन दस्तावेजों की आवश्यकता है?' },
  faqDocsA: {
    en: 'Identity proof, address proof, and documents related to your case. Income proof helps establish eligibility where an income limit applies.',
    hi: 'पहचान प्रमाण, पते का प्रमाण और आपके मामले से संबंधित दस्तावेज। जहां आय सीमा लागू होती है, वहां पात्रता के लिए आय प्रमाण सहायक होता है।',
  },
  faqAiQ: { en: 'Is this platform legal advice?', hi: 'क्या यह प्लेटफार्म कानूनी सलाह है?' },
  faqAiA: {
    en: 'No — this page is AI-generated guidance. For binding legal advice, always consult a Bar Council-registered advocate or the DLSA.',
    hi: 'नहीं — यह पेज AI द्वारा निर्मित मार्गदर्शन है। बाध्यकारी कानूनी सलाह के लिए हमेशा बार काउंसिल पंजीकृत अधिवक्ता या DLSA से परामर्श करें।',
  },
  emergencyTitle: { en: 'Immediate Help', hi: 'तत्काल सहायता' },
  trustText: { en: 'Secure & Confidential', hi: 'सुरक्षित एवं गोपनीय' },
  disclaimer: {
    en: 'This is AI-generated guidance, not a substitute for a licensed advocate\u2019s advice.',
    hi: 'यह AI द्वारा निर्मित मार्गदर्शन है, यह लाइसेंस प्राप्त अधिवक्ता की सलाह का विकल्प नहीं है।',
  },
  infoNote: {
    en: 'Government schemes and helplines may change. Verify current details on official websites.',
    hi: 'सरकारी योजनाएं और हेल्पलाइन बदल सकती हैं। आधिकारिक वेबसाइटों पर वर्तमान विवरण सत्यापित करें।',
  },
};

const schemeCardMeta: Record<string, { icon: React.ComponentType<{ className?: string }> }> = {
  nalsa: { icon: Landmark },
  'tele-law': { icon: Phone },
  csc: { icon: Users },
  'lok-adalat': { icon: HeartHandshake },
};

const t = (key: string, language: Language): string | string[] => {
  const record = UI_STRINGS[key];
  if (!record) return key;
  if (language === 'hi') return record.hi;
  return record.en;
};

const ts = (key: string, language: Language): string => {
  const value = t(key, language);
  return Array.isArray(value) ? value[0] ?? key : value;
};

const schemeIcon = (scheme: GovScheme): React.ComponentType<{ className?: string }> => {
  const meta = schemeCardMeta[scheme.id];
  return meta ? meta.icon : ShieldCheck;
};

export const FreeLegalAidView: React.FC<FreeLegalAidViewProps> = ({ language, onBackToHome }) => {
  const isHi = language === 'hi';

  const steps = [
    { title: ts('step1Title', language), body: ts('step1Body', language) },
    { title: ts('step2Title', language), body: ts('step2Body', language) },
    { title: ts('step3Title', language), body: ts('step3Body', language) },
    { title: ts('step4Title', language), body: ts('step4Body', language) },
  ];

  const heroBullets = (t('heroBullets', language) as string[]) || [];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-12 font-sans text-[#1F2937]">
      <RefHero
        icon={Landmark}
        title={ts('title', language)}
        subtitle={ts('subtitle', language)}
        actions={[
          {
            label: ts('backToHome', language),
            variant: 'outline',
            icon: ArrowLeft,
            onClick: onBackToHome,
          },
          {
            label: ts('callHelpline', language),
            variant: 'gold',
            icon: Phone,
            href: 'tel:15100',
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Intro highlight */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#0F2557] text-[#F5A623] rounded-2xl shadow-md shrink-0">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F1D38]">{ts('heroTitle', language)}</h2>
              <p className="text-sm text-[#374151] leading-relaxed">{ts('heroBody', language)}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {heroBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-xs sm:text-sm text-[#1F2937] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section heading + Schemes grid */}
        <section className="space-y-6">
          <RefSectionHeading title={ts('schemesTitle', language)} />
          <RefFeatureGrid
            features={GOV_SCHEMES.map((scheme) => ({
              icon: schemeIcon(scheme),
              title: scheme.name,
              desc: scheme.description,
              linkText: `${ts('visitWebsite', language)} · ${scheme.helpline}`,
              href: scheme.website,
            }))}
          />
        </section>

        {/* Bottom 3-col: steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={`${ts('howNalsaWorks', language)} (4 ${isHi ? 'कदम' : 'Steps'})`}
          steps={steps.map((s) => ({ title: s.title, desc: s.body }))}
          faqTitle={ts('faqTitle', language)}
          faqs={[
            { q: ts('faqEligibleQ', language), a: ts('faqEligibleA', language) },
            { q: ts('faqFreeQ', language), a: ts('faqFreeA', language) },
            { q: ts('faqApplyQ', language), a: ts('faqApplyA', language) },
            { q: ts('faqDocsQ', language), a: ts('faqDocsA', language) },
            { q: ts('faqAiQ', language), a: ts('faqAiA', language) },
          ]}
          emergencyTitle={ts('emergencyTitle', language)}
          emergency={[
            {
              icon: Phone,
              color: 'bg-[#16A34A]/15 text-[#16A34A]',
              label: isHi ? 'NALSA / Tele-Law' : 'NALSA / Tele-Law',
              value: '15100',
              href: 'tel:15100',
            },
            {
              icon: Siren,
              color: 'bg-[#DC2626]/15 text-[#DC2626]',
              label: isHi ? 'पुलिस आपातकाल' : 'Police Emergency',
              value: '112',
              href: 'tel:112',
            },
            {
              icon: HeartHandshake,
              color: 'bg-[#DB2777]/15 text-[#DB2777]',
              label: isHi ? 'महिला हेल्पलाइन' : 'Women Helpline',
              value: '181',
              href: 'tel:181',
            },
          ]}
          trustText={ts('trustText', language)}
        />

        {/* Footer disclaimer */}
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-sm">
          <p className="text-center text-xs sm:text-sm text-[#374151] leading-relaxed">
            <Info className="inline-block w-4 h-4 text-[#16A34A] mr-1 -mt-0.5" />
            {ts('disclaimer', language)}
          </p>
          <p className="text-center text-[10px] sm:text-xs text-[#6B7280] mt-2">{ts('infoNote', language)}</p>
        </section>
      </div>
    </div>
  );
};

export default FreeLegalAidView;