import React from 'react';
import { Language, NavTab } from '../../../types';
import {
  ArrowLeft,
  MessageSquare,
  FileText,
  ScrollText,
  Scale,
  Landmark,
  CalendarClock,
  Users,
  MessageCircle,
  BookOpen,
  Settings,
  HelpCircle,
  WifiOff,
  Phone,
  Sparkles,
  Siren,
  HeartHandshake,
} from 'lucide-react';
import {
  RefHero,
  RefSectionHeading,
  RefFeatureGrid,
  RefBottomColumns,
} from '../../ReferenceSections';

interface HelpViewProps {
  language: Language;
  onBackToHome: () => void;
  onNavigate: (tab: NavTab) => void;
}

const features = [
  {
    icon: MessageSquare,
    tab: 'chat' as NavTab,
    title: { en: 'AI Legal Chat (24×7)', hi: 'AI कानूनी चैट (24×7)' },
    desc: {
      en: 'Talk to Advocate Naya about any legal issue in 9 Indian languages. Get honest case-strength verdicts, legal citations, and next steps.',
      hi: '9 भारतीय भाषाओं में एडवोकेट नया से किसी भी कानूनी समस्या पर बात करें। केस की असली ताकत, कानूनी धाराएं और अगले कदम जानें।',
    },
  },
  {
    icon: ScrollText,
    tab: 'draft-documents' as NavTab,
    title: { en: 'Draft Legal Documents', hi: 'कानूनी दस्तावेज़ तैयार करें' },
    desc: {
      en: 'Generate Legal Notice, Rent Agreement, Consumer Complaint, RTI Application, Employment Termination Notice — ready PDF or Word.',
      hi: 'लीगल नोटिस, किराया समझौता, उपभोक्ता शिकायत, RTI आवेदन, नौकरी समाप्ति नोटिस — PDF या Word तैयार करें।',
    },
  },
  {
    icon: Scale,
    tab: 'lawyers' as NavTab,
    title: { en: 'Find Verified Lawyers', hi: 'सत्यापित वकील खोजें' },
    desc: {
      en: 'Browse Bar-Council verified advocates by specialty and city. Send a consultation request and chat directly — no phone sharing.',
      hi: 'विशेषज्ञता और शहर के अनुसार बार काउंसिल सत्यापित अधिवक्ताओं को खोजें। परामर्श अनुरोध भेजें और सीधे चैट करें।',
    },
  },
  {
    icon: Landmark,
    tab: 'free-legal-aid' as NavTab,
    title: { en: 'Free Govt Legal Aid', hi: 'मुफ्त सरकारी विधिक सहायता' },
    desc: {
      en: 'NALSA, Tele-Law, Common Service Centres, Lok Adalat. Toll-free helpline 15100. Free legal representation for eligible citizens.',
      hi: 'NALSA, Tele-Law, Common Service Centres, Lok Adalat। टोल-फ्री हेल्पलाइन 15100। पात्र नागरिकों के लिए मुफ्त कानूनी प्रतिनिधित्व।',
    },
  },
  {
    icon: CalendarClock,
    tab: 'my-cases' as NavTab,
    title: { en: 'My Cases & Deadlines', hi: 'मेरे केस और समय-सीमाएं' },
    desc: {
      en: 'Track every case, its AI verdict and confidence score. Add court deadlines to the timeline and receive daily reminders.',
      hi: 'हर केस, उसका AI फैसला और कॉन्फिडेंस स्कोर ट्रैक करें। कोर्ट डेडलाइन टाइमलाइन में जोड़ें और दैनिक रिमाइंडर पाएं।',
    },
  },
  {
    icon: Users,
    tab: 'for-lawyers' as NavTab,
    title: { en: 'Advocate Portal', hi: 'अधिवक्ता पोर्टल' },
    desc: {
      en: 'Advocates register with bar-council details, get verified by admin, receive citizen consultation requests and manage clients.',
      hi: 'अधिवक्ता बार काउंसिल विवरण के साथ पंजीकरण करें, प्रशासन से सत्यापन पाएं, नागरिक अनुरोध प्राप्त करें।',
    },
  },
  {
    icon: MessageCircle,
    tab: 'chat' as NavTab,
    title: { en: 'WhatsApp Integration', hi: 'WhatsApp एकीकरण' },
    desc: {
      en: 'Continue your legal consultation over WhatsApp. Cases and messages stay synced with the platform.',
      hi: 'WhatsApp पर अपनी कानूनी परामर्श जारी रखें। केस और संदेश प्लेटफार्म से जुड़े रहते हैं।',
    },
  },
  {
    icon: BookOpen,
    tab: 'my-cases' as NavTab,
    title: { en: 'Knowledge Base & Citations', hi: 'ज्ञानकोश और कानूनी धाराएं' },
    desc: {
      en: '30+ Indian statutes with exact sections are embedded. Clickable citation cards appear inside AI answers for verification.',
      hi: '30+ भारतीय कानूनों की सटीक धाराएं जुड़ी हैं। AI जवाब में क्लिक होने वाले सिटेशन कार्ड दिखते हैं।',
    },
  },
  {
    icon: Settings,
    tab: 'settings' as NavTab,
    title: { en: 'Settings & Privacy', hi: 'सेटिंग्स और गोपनीयता' },
    desc: {
      en: 'Choose from 9 languages, toggle AI voice, control notifications, clear device cache. DPDP Act compliance.',
      hi: '9 भाषाओं में से चुनें, AI आवाज चालू/बंद करें, सूचनाएं नियंत्रित करें। DPDP अधिनियम अनुपालन।',
    },
  },
  {
    icon: WifiOff,
    tab: 'home' as NavTab,
    title: { en: 'Offline PWA & Data Saver', hi: 'ऑफलाइन PWA और डेटा सेवर' },
    desc: {
      en: 'Install the app on your phone, browse offline, and enable Data-Saver mode from the top bar to use less data.',
      hi: 'ऐप को फोन पर इंस्टॉल करें, ऑफलाइन उपयोग करें, और कम डेटा के लिए ऊपर बार से डेटा सेवर चालू करें।',
    },
  },
];

const stepsData = [
  {
    title: { en: 'Create your account', hi: 'अपना खाता बनाएं' },
    desc: {
      en: 'Register with your email as a Citizen. Advocates register separately through the Advocate Portal.',
      hi: 'नागरिक के रूप में अपने ईमेल से पंजीकरण करें। अधिवक्ता अलग से अधिवक्ता पोर्टल से पंजीकरण करें।',
    },
  },
  {
    title: { en: 'Describe your legal issue', hi: 'अपनी कानूनी समस्या बताएं' },
    desc: {
      en: 'Open AI Legal Chat and explain your problem in your own language. Upload documents like sale deeds or notices for analysis.',
      hi: 'AI कानूनी चैट खोलें और अपनी भाषा में समस्या समझाएं। विश्लेषण के लिए सेल डीड या नोटिस जैसे दस्तावेज़ अपलोड करें।',
    },
  },
  {
    title: { en: 'Get a verdict & case plan', hi: 'फैसला और केस योजना पाएं' },
    desc: {
      en: 'AI gives an honest verdict (strong/weak position), a confidence score, and a checklist of evidence you may need.',
      hi: 'AI ईमानदार फैसला (मजबूत/कमजोर स्थिति), कॉन्फिडेंस स्कोर और आवश्यक सबूतों की चेकलिस्ट देता है।',
    },
  },
  {
    title: { en: 'Draft documents / connect a lawyer', hi: 'दस्तावेज़ बनाएं / वकील से जुड़ें' },
    desc: {
      en: 'Generate ready legal documents, or connect with a verified advocate for full representation.',
      hi: 'तैयार कानूनी दस्तावेज़ बनाएं, या पूर्ण प्रतिनिधित्व के लिए सत्यापित अधिवक्ता से जुड़ें।',
    },
  },
];

const faqs = [
  {
    q: { en: 'Is the AI advice legally valid?', hi: 'क्या AI की सलाह कानूनी रूप से मान्य है?' },
    a: {
      en: 'No — this is AI guidance for preliminary understanding only. Always consult a Bar Council-registered advocate before taking legal action.',
      hi: 'नहीं — यह केवल प्रारंभिक समझ के लिए AI मार्गदर्शन है। कानूनी कार्रवाई से पहले हमेशा बार काउंसिल पंजीकृत अधिवक्ता से परामर्श करें।',
    },
  },
  {
    q: { en: 'How many languages are supported?', hi: 'कितनी भाषाएं समर्थित हैं?' },
    a: {
      en: '9 languages: Hindi, English, Hinglish, Tamil, Telugu, Marathi, Bengali, Kannada and Gujarati.',
      hi: '9 भाषाएं: हिंदी, अंग्रेजी, हिंग्लिश, तमिल, तेलुगु, मराठी, बंगाली, कन्नड़ और गुजराती।',
    },
  },
  {
    q: { en: 'Does the platform charge anything?', hi: 'क्या प्लेटफार्म कुछ शुल्क लेता है?' },
    a: {
      en: 'AI consultation is free. Document drafting is free. Lawyer consultation fees are decided between you and the advocate.',
      hi: 'AI परामर्श मुफ्त है। दस्तावेज़ निर्माण मुफ्त है। वकील का परामर्श शुल्क आप और अधिवक्ता के बीच तय होता है।',
    },
  },
  {
    q: { en: 'How do I enroll for free government legal aid?', hi: 'मुफ्त सरकारी विधिक सहायता कैसे लें?' },
    a: {
      en: 'Call 15100 toll-free, visit your District Legal Services Authority (DLSA), or see the Free Govt Legal Aid page for full steps.',
      hi: 'टोल-फ्री 15100 पर कॉल करें, अपने जिला विधिक सेवा प्राधिकरण (DLSA) जाएं, या मुफ्त सरकारी विधिक सहायता पेज पूरे चरण देखें।',
    },
  },
  {
    q: { en: 'Can I install this as an app?', hi: 'क्या मैं इसे ऐप के रूप में इंस्टॉल कर सकता हूं?' },
    a: {
      en: 'Yes — open the site on your phone browser and choose "Add to Home Screen" from the browser menu. It works offline too.',
      hi: 'हां — फोन ब्राउज़र पर साइट खोलें और ब्राउज़र मेन्यू से "Add to Home Screen" चुनें। यह ऑफलाइन भी काम करती है।',
    },
  },
];

export const HelpView: React.FC<HelpViewProps> = ({ language, onBackToHome, onNavigate }) => {
  const isHi = language === 'hi';
  const L = (rec: { en: string; hi: string }) => (isHi ? rec.hi : rec.en);

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-14 font-sans text-[#1F2937]">
      <RefHero
        icon={HelpCircle}
        title={isHi ? 'सहायता केंद्र (Help Center)' : 'Help Center'}
        subtitle={isHi ? 'हर सुविधा कैसे काम करती है — पूरा गाइड' : 'How every feature works — complete guide'}
        actions={[
          {
            label: isHi ? 'होम पर जाएं' : 'Back Home',
            variant: 'outline',
            icon: ArrowLeft,
            onClick: onBackToHome,
          },
          {
            label: isHi ? 'अभी परामर्श शुरू करें' : 'Start Free Consultation',
            variant: 'gold',
            icon: Sparkles,
            onClick: () => onNavigate('chat'),
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Section heading + Features grid */}
        <section className="space-y-6">
          <RefSectionHeading title={isHi ? 'सभी सुविधाएं (Features)' : 'All Features'} />
          <RefFeatureGrid
            features={features.map((f) => ({
              icon: f.icon,
              title: L(f.title),
              desc: L(f.desc),
              linkText: isHi ? 'पेज खोलें' : 'Open page',
              onClick: () => onNavigate(f.tab),
            }))}
          />
        </section>

        {/* Bottom 3-col: steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={isHi ? 'शुरुआत कैसे करें (4 कदम)' : 'How To Get Started (4 Steps)'}
          steps={stepsData.map((s) => ({ title: L(s.title), desc: L(s.desc) }))}
          faqTitle={isHi ? 'अक्सर पूछे जाने वाले प्रश्न (FAQ)' : 'Frequently Asked Questions'}
          faqs={faqs.map((fq) => ({ q: L(fq.q), a: L(fq.a) }))}
          emergencyTitle={isHi ? 'तत्काल सहायता (Emergency)' : 'Immediate Help'}
          emergency={[
            {
              icon: Phone,
              color: 'bg-[#16A34A]/15 text-[#16A34A]',
              label: isHi ? 'राष्ट्रीय विधिक सेवा' : 'National Legal Aid',
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
          trustText={isHi ? 'सुरक्षित एवं गोपनीय' : 'Secure & Confidential'}
        />
      </div>
    </div>
  );
};

export default HelpView;