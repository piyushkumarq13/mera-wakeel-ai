import React from 'react';
import { Language, NavTab } from '../../../types';
import {
  ShieldCheck,
  Lock,
  FileText,
  UserCheck,
  Eye,
  ArrowLeft,
  Mail,
  Phone,
  Scale,
  Users,
  Trash2,
  Smartphone,
  Landmark,
  Siren,
  HeartHandshake,
} from 'lucide-react';
import {
  RefHero,
  RefSectionHeading,
  RefFeatureGrid,
  RefBottomColumns,
} from '../../ReferenceSections';

interface PrivacyPolicyViewProps {
  language: Language;
  onBackToHome: () => void;
  onNavigate?: (tab: NavTab) => void;
}

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const EN = {
  title: 'Privacy Policy & Data Security',
  subtitle: 'DPDP Act 2023 Compliant · End-to-End Encrypted Legal Advisory',
  back: 'Back to Home',
  contactDept: 'Contact Data Protection Team',
  commitments: 'Our Privacy Commitments',
  trustText: 'Secure & Confidential',
  stepsTitle: 'How we protect your data (4 Steps)',
  faqTitle: 'Frequently Asked Questions',
  emergencyTitle: 'Immediate Help',
  emergencyNalsa: 'National Legal Aid',
  emergencyPolice: 'Police Emergency',
  emergencyWomen: 'Women Helpline',
};

const HI: typeof EN = {
  title: 'गोपनीयता और डेटा सुरक्षा नीति',
  subtitle: 'DPDP अधिनियम 2023 अनुपालन · एंड-टू-एंड एन्क्रिप्टेड कानूनी सलाह',
  back: 'होमपेज पर जाएं',
  contactDept: 'डेटा सुरक्षा टीम से संपर्क करें',
  commitments: 'हमारी प्राइवेसी प्रतिबद्धताएं',
  trustText: 'सुरक्षित एवं गोपनीय',
  stepsTitle: 'हम आपके डेटा की सुरक्षा कैसे करते हैं (4 कदम)',
  faqTitle: 'अक्सर पूछे जाने वाले प्रश्न (FAQ)',
  emergencyTitle: 'तत्काल सहायता',
  emergencyNalsa: 'राष्ट्रीय विधिक सहायता',
  emergencyPolice: 'पुलिस आपातकाल',
  emergencyWomen: 'महिला हेल्पलाइन',
};

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ language, onBackToHome, onNavigate }) => {
  const isHi = language === 'hi';
  const S = isHi ? HI : EN;
  const L = (en: string, hi: string) => (isHi ? hi : en);

  const commitmentCards = [
    {
      icon: Scale,
      title: L('DPDP Act 2023 Compliance', 'DPDP अधिनियम 2023 अनुपालन'),
      desc: L(
        'Fully aligned with India\u2019s Digital Personal Data Protection Act 2023 and global data protection standards.',
        'भारत के डिजिटल पर्सनल डेटा प्रोटेक्शन अधिनियम 2023 और वैश्विक डेटा सुरक्षा मानकों के साथ पूर्ण अनुपालन।'
      ),
      onClick: () => scrollToId('psec-1'),
    },
    {
      icon: Lock,
      title: L('256-Bit SSL Encryption', '256-बिट SSL एन्क्रिप्शन'),
      desc: L(
        'All transmissions use banking-grade SSL. Documents are stored in private isolated vaults.',
        'सभी डेटा ट्रांसमिशन बैंकिंग-ग्रेड SSL से सुरक्षित हैं। दस्तावेज़ निजी पृथक वॉल्ट में रहते हैं।'
      ),
      onClick: () => scrollToId('psec-3'),
    },
    {
      icon: ShieldCheck,
      title: L('Zero AI Training Sharing', 'शून्य AI प्रशिक्षण साझाकरण'),
      desc: L(
        'Your private matters are never used to train public commercial AI models or sold to advertisers.',
        'आपके निजी मामलों का उपयोग सार्वजनिक AI मॉडल प्रशिक्षण या विज्ञापनदाताओं को बिक्री के लिए कभी नहीं होता।'
      ),
      onClick: () => scrollToId('psec-3'),
    },
    {
      icon: Users,
      title: L('Confidential Lawyer Matching', 'गोपनीय वकील मिलान'),
      desc: L(
        'Contacts are shared with a verified advocate only when you explicitly request a consultation.',
        'आपके संपर्क सत्यापित अधिवक्ता के साथ केवल तब साझा किए जाते हैं जब आप स्पष्ट रूप से परामर्श मांगते हैं।'
      ),
      onClick: () => scrollToId('psec-3'),
    },
    {
      icon: Smartphone,
      title: L('Local Session Isolation', 'स्थानीय सत्र पृथक्करण'),
      desc: L(
        'Clear your device session cache or delete individual uploaded documents anytime.',
        'किसी भी समय अपना डिवाइस सत्र कैश साफ करें या अपलोड किए दस्तावेज़ हटाएं।'
      ),
      onClick: () => scrollToId('psec-3'),
    },
    {
      icon: Eye,
      title: L('Right to Access', 'डेटा देखने का अधिकार'),
      desc: L(
        'View all saved cases, consultation notes and uploaded documents in your dashboard.',
        'अपने डैशबोर्ड में सभी सहेजे गए केस, परामर्श नोट्स और दस्तावेज़ देखें।'
      ),
      onClick: () => scrollToId('psec-4'),
    },
    {
      icon: UserCheck,
      title: L('Right to Correction & Erasure', 'सुधार और विलोपन का अधिकार'),
      desc: L(
        'Modify profile details or request permanent deletion of stored cases and account data.',
        'प्रोफ़ाइल विवरण बदलें या सहेजे गए केस और खाता डेटा का स्थायी विलोपन अनुरोध करें।'
      ),
      onClick: () => scrollToId('psec-4'),
    },
    {
      icon: Trash2,
      title: L('Right to Withdraw Consent', 'सहमति वापस लेने का अधिकार'),
      desc: L(
        'Revoke consent for lead sharing or document storage instantly from Settings.',
        'लीड साझाकरण या दस्तावेज़ भंडारण की सहमति तुरंत सेटिंग्स से वापस लें।'
      ),
      onClick: () => scrollToId('psec-4'),
    },
    {
      icon: Landmark,
      title: L('India Jurisdiction Storage', 'भारत में डेटा भंडारण'),
      desc: L(
        'Data is processed and stored under the jurisdiction of Indian courts and law.',
        'डेटा भारतीय न्यायालयों और विधि के अधिकार क्षेत्र में संसाधित और संग्रहीत होता है।'
      ),
      onClick: () => scrollToId('psec-1'),
    },
    {
      icon: Mail,
      title: L('Data Protection Officer', 'डेटा संरक्षण अधिकारी'),
      desc: L(
        'Dedicated privacy desk answers questions, grievances and deletion requests.',
        'समर्पित प्राइवेसी डेस्क प्रश्नों, शिकायतों और विलोपन अनुरोधों का जवाब देता है।'
      ),
      onClick: () => scrollToId('psec-5'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-12 font-sans text-[#1F2937]">
      <RefHero
        icon={ShieldCheck}
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
            label: S.contactDept,
            variant: 'gold',
            icon: Mail,
            href: 'mailto:merawakeelai@gmail.com',
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Commitments grid */}
        <section className="space-y-6">
          <RefSectionHeading title={S.commitments} />
          <RefFeatureGrid
            features={commitmentCards.map((c) => ({
              icon: c.icon,
              title: c.title,
              desc: c.desc,
              linkText: isHi ? 'और पढ़ें' : 'Learn more',
              onClick: c.onClick,
            }))}
          />
        </section>

        {/* Policy content */}
        <section className="space-y-6">
          <RefSectionHeading title={isHi ? 'पूरी नीति विवरण' : 'Full Policy Details'} />

          {/* Section 1 */}
          <div id="psec-1" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '1. परिचय और वैधानिक अनुपालन' : '1. Introduction & Regulatory Compliance'}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[#1E293B]">
              {isHi
                ? 'Mera Wakeel AI में हम कानूनी मामलों और दस्तावेज़ों की संवेदनशील प्रकृति को समझते हैं। यह नीति भारत के DPDP अधिनियम 2023 और वैश्विक डेटा सुरक्षा मानकों के अनुसार आपकी व्यक्तिगत जानकारी, कानूनी परामर्श और अपलोड किए दस्तावेज़ों की सुरक्षा की प्रतिबद्धता दर्शाती है।'
                : 'At Mera Wakeel AI, we recognize the sensitive nature of legal matters and documents. This Privacy Policy outlines our commitment to protecting user personal information, legal consultations, and uploaded legal documents in full accordance with the Digital Personal Data Protection (DPDP) Act, 2023 of India and global data protection standards.'}
            </p>
          </div>

          {/* Section 2 */}
          <div id="psec-2" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '2. हम कौन सी जानकारी एकत्र करते हैं' : '2. Information We Collect'}
              </h2>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#334155]">
              <li>
                <strong>{isHi ? 'उपयोगकर्ता प्रोफ़ाइल डेटा:' : 'User Profile Data:'}</strong>{' '}
                {isHi
                  ? 'पंजीकरण के दौरान नाम, ईमेल, फोन नंबर, शहर, राज्य और भाषा वरीयता।'
                  : 'Name, email address, phone number, city, state, and language preference during account registration.'}
              </li>
              <li>
                <strong>{isHi ? 'अधिवक्ता पंजीकरण डेटा:' : 'Advocate Registration Data:'}</strong>{' '}
                {isHi
                  ? 'सत्यापित अधिवक्ताओं के लिए बार काउंसिल नंबर, अभ्यास शहर, अनुभव, शुल्क संरचना और विशेषज्ञता।'
                  : 'State Bar Council enrollment number, practice city, years of experience, fee structure, and legal specialties.'}
              </li>
              <li>
                <strong>{isHi ? 'कानूनी प्रश्न और चैट:' : 'Legal Query & Chat Inputs:'}</strong>{' '}
                {isHi
                  ? 'विवाद, संपत्ति, पारिवारिक, आपराधिक या उपभोक्ता मामलों से संबंधित AI परामर्श में दर्ज पाठ।'
                  : 'Text queries submitted during AI legal consultations regarding disputes, property, family law, criminal proceeds, or consumer complaints.'}
              </li>
              <li>
                <strong>{isHi ? 'अपलोड किए दस्तावेज़:' : 'Uploaded Legal Documents:'}</strong>{' '}
                {isHi
                  ? 'सेल डीड, वसीयत, लीज समझौते, FIR प्रति, स्टाम्प पेपर जैसे दस्तावेज़।'
                  : 'Document images or PDFs uploaded for AI analysis (e.g., Sale Deeds, Wills, Lease Agreements, FIR copies, Stamp Papers).'}
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div id="psec-3" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '3. हम आपकी जानकारी का उपयोग और सुरक्षा कैसे करते हैं' : '3. How We Use & Protect Your Information'}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                <h3 className="font-bold text-[#0F1D38] text-xs uppercase tracking-wide">
                  {isHi ? 'एंड-टू-एंड एन्क्रिप्शन' : 'End-to-End Encryption'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isHi
                    ? 'सभी डेटा ट्रांसमिशन 256-बिट SSL से सुरक्षित हैं। दस्तावेज़ निजी पृथक वॉल्ट में संग्रहीत होते हैं।'
                    : 'All data transmissions use 256-bit SSL. Uploaded documents are stored in private isolated vaults.'}
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                <h3 className="font-bold text-[#0F1D38] text-xs uppercase tracking-wide">
                  {isHi ? 'शून्य व्यावसायिक AI प्रशिक्षण' : 'Zero Commercial AI Training'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isHi
                    ? 'आपके निजी दस्तावेज़ और परामर्श इतिहास कभी भी AI मॉडल प्रशिक्षण या विज्ञापन नेटवर्क के साथ साझा नहीं किए जाते।'
                    : 'Your private legal documents and consultation histories are never used to train commercial AI models or shared with ad networks.'}
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                <h3 className="font-bold text-[#0F1D38] text-xs uppercase tracking-wide">
                  {isHi ? 'गोपनीय वकील मिलान' : 'Confidential Lawyer Matching'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isHi
                    ? 'आपका संपर्क केवल आपके स्पष्ट अनुरोध पर सत्यापित अधिवक्ता को दिया जाता है।'
                    : 'Your contact is shared with a verified advocate only when you explicitly request a direct consultation.'}
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-1.5">
                <h3 className="font-bold text-[#0F1D38] text-xs uppercase tracking-wide">
                  {isHi ? 'स्थानीय सत्र पृथक्करण' : 'Local Session Isolation'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {isHi
                    ? 'आप किसी भी समय अपना सत्र कैश साफ कर सकते हैं या दस्तावेज़ हटा सकते हैं।'
                    : 'You control clearing your session cache or deleting individual uploaded documents at any time.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div id="psec-4" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '4. भारतीय विधि के तहत आपके अधिकार (DPDP अधिनियम 2023)' : '4. Your Rights under Indian Law (DPDP Act 2023)'}
              </h2>
            </div>
            <p className="text-sm text-[#1E293B]">
              {isHi
                ? 'DPDP अधिनियम 2023 के तहत आपको ये स्पष्ट अधिकार प्राप्त हैं:'
                : 'Under the Digital Personal Data Protection Act 2023 you hold the following explicit rights:'}
            </p>
            <div className="space-y-2 text-sm text-[#334155] pl-2">
              <p>
                • <strong>{isHi ? 'डेटा देखने का अधिकार:' : 'Right to Access:'}</strong>{' '}
                {isHi
                  ? 'अपने खाते में सभी केस, परामर्श नोट्स और दस्तावेज़ देखें।'
                  : 'View all saved legal cases, consultation notes, and uploaded documents in your dashboard.'}
              </p>
              <p>
                • <strong>{isHi ? 'सुधार और विलोपन का अधिकार:' : 'Right to Correction & Erasure:'}</strong>{' '}
                {isHi
                  ? 'प्रोफ़ाइल बदलें या अपने डेटा का स्थायी विलोपन अनुरोध करें।'
                  : 'Modify profile information or request permanent deletion of stored cases and account data.'}
              </p>
              <p>
                • <strong>{isHi ? 'सहमति वापस लेने का अधिकार:' : 'Right to Withdraw Consent:'}</strong>{' '}
                {isHi
                  ? 'सेटिंग्स से वकील लीड साझाकरण या दस्तावेज़ भंडारण की सहमति तुरंत वापस लें।'
                  : 'Revoke consent for advocate lead sharing or document storage instantly via Settings.'}
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div id="psec-5" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {isHi ? '5. डेटा संरक्षण अधिकारी से संपर्क करें' : '5. Contact Data Protection Officer'}
              </h2>
            </div>
            <p className="text-sm text-[#64748B]">
              {isHi
                ? 'अपने कानूनी डेटा गोपनीयता के बारे में किसी भी प्रश्न, शिकायत या अनुरोध के लिए डेटा सुरक्षा डेस्क से संपर्क करें:'
                : 'For any questions, grievances, or requests regarding your legal data privacy, contact our Data Protection Desk:'}
            </p>
            <div className="p-4 bg-[#0F2557] text-[#FFFFFF] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-[#F5A623]">Mera Wakeel AI Privacy Desk</div>
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
        </section>

        {/* Bottom 3-col: protection steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={S.stepsTitle}
          steps={[
            {
              title: isHi ? 'एन्क्रिप्ट करें' : 'Encrypt',
              desc: isHi
                ? 'हर संपर्क और दस्तावेज़ 256-बिट SSL से सुरक्षित रहता है।'
                : 'Every transmission and document stays protected with 256-bit SSL.',
            },
            {
              title: isHi ? 'पृथक रखें' : 'Isolate',
              desc: isHi
                ? 'दस्तावेज़ निजी वॉल्ट में संग्रहीत होते हैं, बाहरी मॉडल से अलग।'
                : 'Documents live in private vaults, isolated from public models.',
            },
            {
              title: isHi ? 'सहमति लें' : 'Consent',
              desc: isHi
                ? 'आपके बिना अनुमति कुछ भी साझा नहीं होता।'
                : 'Nothing is shared without your explicit permission.',
            },
            {
              title: isHi ? 'नियंत्रण दें' : 'Control',
              desc: isHi
                ? 'आपके पास हर समय डेटा देखने, सुधारने और हटाने का नियंत्रण है।'
                : 'You always control viewing, correcting and deleting your data.',
            },
          ]}
          faqTitle={S.faqTitle}
          faqs={[
            {
              q: isHi ? 'क्या मेरा कानूनी डेटा साझा किया जाता है?' : 'Is my legal data shared?',
              a: isHi
                ? 'नहीं। आपकी निजी जानकारी, चैट और दस्तावेज़ कभी भी विज्ञापनदाताओं या पब्लिक AI मॉडल के साथ साझा नहीं किए जाते।'
                : 'No. Your private chats, documents and details are never shared with advertisers or public AI models.',
            },
            {
              q: isHi ? 'क्या मैं अपना डेटा हटा सकता हूं?' : 'Can I delete my data?',
              a: isHi
                ? 'हां। सेटिंग्स से स्थानीय कैश साफ करें, और स्थायी विलोपन के लिए डेटा सुरक्षा डेस्क को लिखें।'
                : 'Yes. Clear local cache from Settings, or write to the Data Protection Desk for permanent erasure.',
            },
            {
              q: isHi ? 'मेरा डेटा कहां संग्रहीत है?' : 'Where is my data stored?',
              a: isHi
                ? 'आपका डेटा भारतीय अधिकार क्षेत्र में सुरक्षित सर्वरों पर संग्रहीत होता है।'
                : 'Your data is stored on secure servers under Indian jurisdiction.',
            },
            {
              q: isHi ? 'क्या यह पेज कानूनी सलाह है?' : 'Is this page legal advice?',
              a: isHi
                ? 'नहीं — यह AI-जनित जानकारी है। बाध्यकारी सलाह के लिए बार काउंसिल पंजीकृत अधिवक्ता से परामर्श करें।'
                : 'No — this is AI-generated information. For binding advice, consult a Bar Council-registered advocate.',
            },
          ]}
          emergencyTitle={S.emergencyTitle}
          emergency={[
            {
              icon: Phone,
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

export default PrivacyPolicyView;