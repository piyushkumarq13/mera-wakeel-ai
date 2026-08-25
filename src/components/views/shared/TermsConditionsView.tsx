import React from 'react';
import { Language, NavTab } from '../../../types';
import {
  ScrollText,
  FileCheck,
  UserCheck,
  AlertTriangle,
  Cpu,
  BadgeCheck,
  Ban,
  MessageSquare,
  Lock,
  Scale,
  Mail,
  ArrowLeft,
  Phone,
  Gavel,
  Siren,
  HeartHandshake,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import {
  RefHero,
  RefSectionHeading,
  RefFeatureGrid,
  RefBottomColumns,
} from '../../ReferenceSections';

interface TermsConditionsViewProps {
  language: Language;
  onBackToHome: () => void;
  onNavigate?: (tab: NavTab) => void;
}

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const EN = {
  title: 'Terms & Conditions',
  subtitle: 'Use of Service · Liability Limits · DPDP 2023 Compliant',
  back: 'Back to Home',
  contactSupport: 'Contact Support',
  terms: 'Our Usage Terms',
  fullTerms: 'Full Terms of Use',
  trustText: 'Trusted & Transparent',
  stepsTitle: 'How these terms work (4 Steps)',
  faqTitle: 'Frequently Asked Questions',
  emergencyTitle: 'Immediate Help',
  emergencyNalsa: 'National Legal Aid',
  emergencyPolice: 'Police Emergency',
  emergencyWomen: 'Women Helpline',
};

const HI: typeof EN = {
  title: 'नियम और शर्तें',
  subtitle: 'सेवा का उपयोग · देयता सीमाएं · DPDP 2023 अनुपालन',
  back: 'होमपेज पर जाएं',
  contactSupport: 'सहायता से संपर्क करें',
  terms: 'हमारे उपयोग के नियम',
  fullTerms: 'उपयोग की पूरी शर्तें',
  trustText: 'विश्वसनीय एवं पारदर्शी',
  stepsTitle: 'ये नियम कैसे लागू होते हैं (4 कदम)',
  faqTitle: 'अक्सर पूछे जाने वाले प्रश्न (FAQ)',
  emergencyTitle: 'तत्काल सहायता',
  emergencyNalsa: 'राष्ट्रीय विधिक सहायता',
  emergencyPolice: 'पुलिस आपातकाल',
  emergencyWomen: 'महिला हेल्पलाइन',
};

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ language, onBackToHome, onNavigate }) => {
  const isHi = language === 'hi';
  const S = isHi ? HI : EN;
  const L = (en: string, hi: string) => (isHi ? hi : en);

  const termCards = [
    {
      icon: FileCheck,
      title: L('Acceptance of Terms', 'नियमों की स्वीकृति'),
      desc: L(
        'By creating an account or using any feature, you agree to all terms on this page.',
        'खाता बनाते ही या कोई भी सुविधा उपयोग करते ही आप इस पेज के सभी नियमों से सहमत होते हैं।'
      ),
      onClick: () => scrollToId('tsec-1'),
    },
    {
      icon: UserCheck,
      title: L('Minimum Age 18+', 'न्यूनतम आयु 18+'),
      desc: L(
        'Service is available only to Indian citizens and residents aged 18 or above.',
        'सेवा केवल 18 वर्ष या उससे अधिक आयु के भारतीय नागरिकों और निवासियों के लिए है।'
      ),
      onClick: () => scrollToId('tsec-1'),
    },
    {
      icon: AlertTriangle,
      title: L('Not Legal Advice', 'कानूनी सलाह नहीं'),
      desc: L(
        'All AI outputs are informational. They are not a substitute for an advocate\u2019s opinion.',
        'सभी AI उत्तर केवल जानकारी हैं। वे किसी अधिवक्ता की राय का विकल्प नहीं हैं।'
      ),
      onClick: () => scrollToId('tsec-2'),
    },
    {
      icon: Cpu,
      title: L('AI-Generated Content', 'AI-जनित सामग्री'),
      desc: L(
        'Answers may contain errors. Verify critical details with a verified advocate.',
        'उत्तरों में त्रुटियां हो सकती हैं। महत्वपूर्ण बातें सत्यापित अधिवक्ता से पुष्टि करें।'
      ),
      onClick: () => scrollToId('tsec-2'),
    },
    {
      icon: BadgeCheck,
      title: L('Verified Advocates', 'सत्यापित अधिवक्ता'),
      desc: L(
        'Advocate profiles show Bar Council details available on public registers.',
        'अधिवक्ता प्रोफ़ाइल सार्वजनिक रजिस्टरों पर उपलब्ध बार काउंसिल विवरण दिखाती हैं।'
      ),
      onClick: () => scrollToId('tsec-2'),
    },
    {
      icon: Ban,
      title: L('No Illicit Use', 'अवैध उपयोग नहीं'),
      desc: L(
        'Do not use the platform for unlawful, fraudulent or harmful activities.',
        'प्लेटफ़ॉर्म का उपयोग अवैध, धोखाधड़ी या हानिकारक गतिविधियों के लिए न करें।'
      ),
      onClick: () => scrollToId('tsec-3'),
    },
    {
      icon: MessageSquare,
      title: L('User Responsibility', 'उपयोगकर्ता जिम्मेदारी'),
      desc: L(
        'You are responsible for the accuracy of information you submit to your cases.',
        'आप अपने केस में दर्ज जानकारी की सटीकता के लिए स्वयं जिम्मेदार हैं।'
      ),
      onClick: () => scrollToId('tsec-4'),
    },
    {
      icon: Lock,
      title: L('Account Security', 'खाता सुरक्षा'),
      desc: L(
        'Keep your credentials private and report unauthorized access immediately.',
        'अपने क्रेडेंशियल निजी रखें और अनधिकृत पहुंच की तुरंत रिपोर्ट करें।'
      ),
      onClick: () => scrollToId('tsec-4'),
    },
    {
      icon: Scale,
      title: L('Liability Limits', 'देयता सीमाएं'),
      desc: L(
        'The platform limits liability for reliance on AI-generated information.',
        'प्लेटफ़ॉर्म AI-जनित जानकारी पर निर्भरता के लिए देयता सीमित करता है।'
      ),
      onClick: () => scrollToId('tsec-5'),
    },
    {
      icon: Mail,
      title: L('Termination & Contact', 'समाप्ति और संपर्क'),
      desc: L(
        'We may suspend accounts violating these terms. Support is one email away.',
        'नियम तोड़ने वाले खाते निलंबित हो सकते हैं। सहायता एक ईमेल की दूरी पर है।'
      ),
      onClick: () => scrollToId('tsec-5'),
    },
    {
      icon: Gavel,
      title: L('Advocate (Wakeel) Terms', 'वकील के विशेष नियम'),
      desc: L(
        'Separate obligations for registered advocates — verification, ethics, fees and conduct.',
        'पंजीकृत अधिवक्ताओं के लिए अलग दायित्व — सत्यापन, आचरण, शुल्क और अनुशासन।'
      ),
      onClick: () => scrollToId('tsec-6'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-12 font-sans text-[#1F2937]">
      <RefHero
        icon={ScrollText}
        title={S.title}
        subtitle={S.subtitle}
        actions={[
          {
            label: S.back,
            variant: 'outline',
            icon: ArrowLeft,
            onClick: onBackToHome,
          },
          {
            label: S.contactSupport,
            variant: 'gold',
            icon: Mail,
            href: 'mailto:merawakeelai@gmail.com',
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Terms quick-nav grid */}
        <section className="space-y-6">
          <RefSectionHeading title={S.terms} />
          <RefFeatureGrid
            features={termCards.map((c) => ({
              icon: c.icon,
              title: c.title,
              desc: c.desc,
              linkText: isHi ? 'और पढ़ें' : 'Learn more',
              onClick: c.onClick,
            }))}
          />
        </section>

        {/* Full terms content */}
        <section className="space-y-6">
          <RefSectionHeading title={S.fullTerms} />

          {/* Section 1 */}
          <div id="tsec-1" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '1. नियमों की स्वीकृति और पात्रता' : '1. Acceptance of Terms & Eligibility'}
              </h2>
            </div>
            <p className="text-sm text-[#6B7280]">
              {isHi
                ? 'Mera Wakeel AI का उपयोग करके, पंजीकरण करके या किसी सुविधा तक पहुंचकर आप इन नियमों से पूर्ण रूप से सहमत होते हैं। सेवा केवल भारत में रहने वाले 18 वर्ष या उससे अधिक आयु के व्यक्तियों के लिए है।'
                : 'By accessing, registering, or using any feature of Mera Wakeel AI, you agree to be bound by these Terms. The service is offered only to persons aged 18 years or above residing in India.'}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#334155]">
              <li>
                <strong>{isHi ? 'पात्रता:' : 'Eligibility:'}</strong>{' '}
                {isHi
                  ? 'आपको अपने प्रस्तुत विवरणों की सत्यता बनाए रखना अनिवार्य है।'
                  : 'You must keep the details you provide accurate and truthful.'}
              </li>
              <li>
                <strong>{isHi ? 'बाइंडिंग अनुबंध:' : 'Binding Agreement:'}</strong>{' '}
                {isHi
                  ? 'गेस्ट मोड में भी ये नियम लागू रहते हैं।'
                  : 'These terms remain applicable even in Guest Mode usage.'}
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div id="tsec-2" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '2. कानूनी सलाह से अस्वीकरण' : '2. Disclaimer of Legal Advice'}
              </h2>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed">
              {isHi
                ? 'AI द्वारा उत्पन्न सभी प्रतिक्रियाएं, दस्तावेज़ के खाके और कानूनी जानकारी केवल सामान्य जानकारी के लिए हैं। वे लाइसेंस प्राप्त अधिवक्ता का परामर्श, कानूनी राय या पेशेवर सेवाएं नहीं हैं। कोई भी बाध्यकारी कार्रवाई करने से पहले बार काउंसिल पंजीकृत अधिवक्ता से परामर्श करें।'
                : 'All AI-generated responses, document templates, and legal information are provided for general information only. They are not legal advice, a legal opinion, or professional services. Always consult a Bar Council-registered advocate before making any binding decision or filing any legal action.'}
            </p>
            <div className="p-4 bg-[#FFF7ED] border border-[#FDBA74] rounded-xl text-xs text-[#9A3412]">
              {isHi
                ? 'महत्वपूर्ण: Mera Wakeel AI पर AI सेवाएं और अधिवक्ता दोनों के बीच अंतर करें। अधिवक्ता परामर्श की पुष्टि उसके बार काउंसिल पंजीकरण से करें।'
                : 'Important: Distinguish between AI services and advocate consultations on Mera Wakeel AI. Verify an advocate\u2019s consultation through their Bar Council registration.'}
            </div>
          </div>

          {/* Section 3 */}
          <div id="tsec-3" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '3. स्वीकार्य उपयोग और निषिद्ध गतिविधियां' : '3. Acceptable Use & Prohibited Activities'}
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#334155]">
              <li>
                {isHi
                  ? 'किसी अवैध, धोखाधड़ी या दुर्भावनापूर्ण उद्देश्य के लिए प्लेटफ़ॉर्म का उपयोग नहीं करें।'
                  : 'Do not use the platform for any unlawful, fraudulent, or malicious purpose.'}
              </li>
              <li>
                {isHi
                  ? 'दूसरों के अधिकारों का उल्लंघन करने वाली या भड़काऊ सामग्री अपलोड या साझा न करें।'
                  : 'Do not upload or share content that violates others\u2019 rights or is defamatory.'}
              </li>
              <li>
                {isHi
                  ? 'सिस्टम में बाधा डालने, स्क्रैप करने या अनधिकृत पहुंच बनाने का प्रयास न करें।'
                  : 'Do not attempt to disrupt, scrape, or gain unauthorized access to the system.'}
              </li>
              <li>
                {isHi
                  ? 'उल्लंघन पर सेवा बिना किसी पूर्व सूचना के निलंबित या समाप्त हो सकती है।'
                  : 'Violations may lead to suspension or termination of service without prior notice.'}
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div id="tsec-4" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '4. उपयोगकर्ता जिम्मेदारियां और सामग्री' : '4. User Responsibilities & Content'}
              </h2>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed">
              {isHi
                ? 'आप अपने केस, चैट और अपलोड की गई सामग्री की सटीकता और वैधता के लिए जिम्मेदार हैं। आप अपने खाते की गोपनीयता बनाए रखने और अनधिकृत पहुंच की तुरंत रिपोर्ट करने के लिए सहमत होते हैं।'
                : 'You are responsible for the accuracy and lawfulness of your cases, chats, and uploaded content. You agree to maintain the confidentiality of your account and promptly report any unauthorized use.'}
            </p>
          </div>

          {/* Section 5 */}
          <div id="tsec-5" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '5. देयता सीमाएं, समाप्ति और संपर्क' : '5. Liability Limits, Termination & Contact'}
              </h2>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              {isHi
                ? 'कानून द्वारा अनुमत सीमा तक, Mera Wakeel AI AI-जनित जानकारी के उपयोग से उत्पन्न प्रत्यक्ष या अप्रत्यक्ष क्षति के लिए उत्तरदायी नहीं होगा। हम नियमों का उल्लंघन करने वाले खातों को निलंबित कर सकते हैं। प्रश्नों या शिकायतों के लिए सहायता डेस्क से संपर्क करें।'
                : 'To the extent permitted by law, Mera Wakeel AI shall not be liable for direct or indirect damages arising from reliance on AI-generated information. We may suspend accounts that violate these terms. Contact our support desk for questions or grievances.'}
            </p>
            <div className="p-4 bg-[#0F2557] text-[#FFFFFF] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-[#F5A623]">Mera Wakeel AI Support Desk</div>
                <div className="text-[#CBD5E1]">merawakeelai@gmail.com</div>
              </div>
              <a
                href="mailto:merawakeelai@gmail.com"
                className="px-4 py-2 rounded-xl bg-[#F5A623] text-[#0F2557] font-bold text-xs hover:bg-[#E0940F] transition-colors cursor-pointer"
              >
                {isHi ? 'ईमेल करें' : 'Email Us'}
              </a>
            </div>
          </div>

          {/* Section 6 — Advocate (Wakeel) specific terms */}
          <div id="tsec-6" className="bg-white rounded-2xl border-2 border-[#0F2557] shadow-sm p-6 sm:p-8 space-y-4 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#0F2557] text-[#F5A623] flex items-center justify-center">
                <Gavel className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '6. अधिवक्ता (वकील) के लिए विशेष नियम और शर्तें' : '6. Special Terms & Conditions for Advocates (Wakeels)'}
              </h2>
            </div>
            <p className="text-sm text-[#334155] leading-relaxed">
              {isHi
                ? 'यह अनुभाग Mera Wakeel AI पर पंजीकरण करने वाले सभी अधिवक्ताओं (वकीलों) पर लागू होता है। नागरिक खातों के नियमों के अलावा, निम्नलिखित अनिवार्य दायित्व भी लागू रहते हैं:'
                : 'This section applies to all advocates (Wakeels) registering on Mera Wakeel AI. In addition to the general user terms, the following mandatory obligations apply:'}
            </p>

            <div className="space-y-2 text-sm text-[#334155]">
              <p>
                <Gavel className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'बार काउंसिल सत्यापन:' : 'Bar Council Verification:'}</strong>{' '}
                {isHi
                  ? 'आपकी प्रोफ़ाइल पर राज्य बार काउंसिल पंजीकरण संख्या और विवरण सार्वजनिक रजिस्टरों के अनुसार प्रदर्शित होंगे। गलत या मिथ्या पंजीकरण संख्या देने पर खाता स्थायी रूप से प्रतिबंधित और संबंधित बार काउंसिल को सूचित किया जाएगा।'
                  : 'Your State Bar Council enrolment number and details will be displayed on your public profile as per public registers. Submitting false or fabricated enrolment details will result in permanent suspension and reporting to the relevant Bar Council.'}
              </p>
              <p>
                <FileCheck className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'व्यावसायिक आचरण:' : 'Professional Conduct:'}</strong>{' '}
                {isHi
                  ? 'आप बार काउंसिल ऑफ इंडिया के नियमों और पेशेवर आचरण मानकों का पालन करने के लिए सहमत हैं। केस जीतने की झूठी गारंटी या भ्रामक वादे निषिद्ध हैं।'
                  : 'You agree to abide by the rules and professional conduct standards of the Bar Council of India. Falsely guaranteeing case outcomes or making misleading promises is strictly prohibited.'}
              </p>
              <p>
                <BookOpen className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'AI उद्धरणों की जिम्मेदारी:' : 'Responsibility for AI Citations:'}</strong>{' '}
                {isHi
                  ? 'किसी भी AI-जनित केस लॉ, नजीर या कानूनी उद्धरण को मुवक्किल से साझा करने से पहले आपकी जिम्मेदारी है कि उसकी सटीकता स्वयं सत्यापित करें। गलत उद्धरण की जिम्मेदारी अधिवक्ता की होगी, प्लेटफ़ॉर्म की नहीं।'
                  : 'Before sharing any AI-generated case law, precedent, or legal citation with a client, you are responsible for independently verifying its accuracy. The advocate bears responsibility for incorrect citations, not the platform.'}
              </p>
              <p>
                <ShieldCheck className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'गोपनीयता और मुवक्किल अधिकार:' : 'Confidentiality & Client Rights:'}</strong>{' '}
                {isHi
                  ? 'मुवक्किल के मामले की सभी जानकारी गोपनीय रहेगी। मुवक्किल से उचित तरीके से बातचीत करें, किसी भी परिस्थिति में मुवक्किल को परेशान या दुर्व्यवहार न करें।'
                  : 'All client matter information remains confidential. Communicate with clients respectfully and never harass or abuse a client under any circumstances.'}
              </p>
              <p>
                <Scale className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'शुल्क पारदर्शिता:' : 'Fee Transparency:'}</strong>{' '}
                {isHi
                  ? 'आपकी प्रोफ़ाइल पर बताया गया परामर्श शुल्क बाध्यकारी है। छिपी हुई फीस नहीं लगाई जाएगी। Mera Wakeel AI परामर्श पर 0% कमीशन लेता है।'
                  : 'The consultation fee shown on your profile is binding. No hidden charges will be levied. Mera Wakeel AI charges 0% commission on consultations.'}
              </p>
              <p>
                <Ban className="w-4 h-4 inline mr-1.5 text-[#D98800]" />
                <strong>{isHi ? 'अनुशासन और समाप्ति:' : 'Discipline & Termination:'}</strong>{' '}
                {isHi
                  ? 'लगातार देर से उत्तर, दुर्व्यवहार, आपराधिक आचरण या अनसुलझी मुवक्किल शिकायतों पर खाता निलंबित या स्थायी रूप से हटाया जा सकता है। पुनः अनुमति केवल सुधार के प्रमाण के बाद ही दी जाएगी।'
                  : 'Accounts may be suspended or permanently removed for habitual delayed responses, misconduct, unethical behaviour, or unresolved client complaints. Reinstatement is granted only upon evidence of corrective action.'}
              </p>
            </div>
          </div>
        </section>

        {/* Bottom 3-col: steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={S.stepsTitle}
          steps={[
            {
              title: isHi ? 'सहमति दें' : 'Accept',
              desc: isHi
                ? 'नियमों की स्वीकृति देकर खाता बनाएं या गेस्ट मोड उपयोग करें।'
                : 'Agree to terms and create an account or continue in Guest Mode.',
            },
            {
              title: isHi ? 'सुरक्षित उपयोग करें' : 'Use Lawfully',
              desc: isHi
                ? 'प्लेटफ़ॉर्म का उपयोग केवल वैध और नैतिक उद्देश्यों के लिए करें।'
                : 'Use the platform only for lawful and ethical purposes.',
            },
            {
              title: isHi ? 'खाता सुरक्षित रखें' : 'Secure Account',
              desc: isHi
                ? 'अपनी जानकारी गोपनीय रखें और समस्याओं की रिपोर्ट करें।'
                : 'Keep your credentials private and report any issue immediately.',
            },
            {
              title: isHi ? 'सहायता से जुड़ें' : 'Contact Support',
              desc: isHi
                ? 'प्रश्नों और शिकायतों के लिए सहायता डेस्क को लिखें।'
                : 'Write to the support desk for questions and grievances.',
            },
          ]}
          faqTitle={S.faqTitle}
          faqs={[
            {
              q: isHi ? 'क्या यह पेज कानूनी सलाह है?' : 'Is this page legal advice?',
              a: isHi
                ? 'नहीं — ये उपयोग की शर्तें हैं। बाध्यकारी कानूनी सलाह के लिए बार काउंसिल पंजीकृत अधिवक्ता से परामर्श करें।'
                : 'No — these are terms of use. For binding legal advice consult a Bar Council-registered advocate.',
            },
            {
              q: isHi ? 'क्या मैं अपने केस की जानकारी साझा कर सकता हूं?' : 'Can I share my case details?',
              a: isHi
                ? 'आपकी जानकारी केवल आपके अनुरोध पर सत्यापित अधिवक्ता के साथ साझा की जाती है।'
                : 'Your details are shared with a verified advocate only on your explicit request.',
            },
            {
              q: isHi ? 'दुरुपयोग पर क्या होता है?' : 'What happens on misuse?',
              a: isHi
                ? 'अवैध या दुर्भावनापूर्ण उपयोग पर आपका खाता बिना सूचना निलंबित हो सकता है।'
                : 'Unlawful or malicious use may lead to immediate suspension of your account.',
            },
            {
              q: isHi ? 'नियम बदल सकते हैं?' : 'Can terms change?',
              a: isHi
                ? 'हां, सेवा में सुधार के लिए नियम समय-समय पर अपडेट हो सकते हैं। नए संस्करण इसी पृष्ठ पर प्रकाशित होंगे।'
                : 'Yes, terms may be updated periodically. The latest version is always published on this page.',
            },
            {
              q: isHi ? 'वकीलों के लिए अलग नियम हैं?' : 'Are there separate rules for advocates?',
              a: isHi
                ? 'हां — धारा 6 में अधिवक्ताओं के लिए विशेष नियम हैं: बार काउंसिल सत्यापन, पेशेवर आचरण, AI उद्धरणों की जांच, शुल्क पारदर्शिता और अनुशासन।'
                : 'Yes — Section 6 covers special advocate rules: Bar Council verification, professional conduct, AI citation checks, fee transparency and discipline.',
            },
          ]}
          emergencyTitle={S.emergencyTitle}
          emergency={[
            {
              icon: Gavel,
              color: 'bg-[#16A34A]/15 text-[#16A34A]',
              label: S.emergencyNalsa,
              value: '15100',
              href: 'tel:15100',
            },
            {
              icon: Siren,
              color: 'bg-[#DC2626]/15 text-[#DC2626]',
              label: S.emergencyPolice,
              value: '112',
              href: 'tel:112',
            },
            {
              icon: HeartHandshake,
              color: 'bg-[#DB2777]/15 text-[#DB2777]',
              label: S.emergencyWomen,
              value: '181',
              href: 'tel:181',
            },
          ]}
          trustText={S.trustText}
        />
      </div>
    </div>
  );
};

export default TermsConditionsView;