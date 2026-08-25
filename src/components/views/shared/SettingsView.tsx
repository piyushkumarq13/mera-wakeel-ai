import React, { useState } from 'react';
import { Language, UserRole, NavTab } from '../../../types';
import { PreferredLanguage } from '../../../types/database';
import { LANGUAGES } from '../../../lib/language';
import { createOrUpdateProfile } from '../../../lib/supabase';
import {
  Settings,
  ShieldCheck,
  Volume2,
  Globe,
  CheckCircle2,
  Lock,
  ArrowLeft,
  User,
  Trash2,
  Bell,
  FileText,
  Smartphone,
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

interface SettingsViewProps {
  language: Language;
  onBackToHome: () => void;
  currentUser?: { email: string; role: UserRole; name?: string; userId?: string } | null;
  onNavigate?: (tab: NavTab) => void;
}

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  onBackToHome,
  currentUser,
  onNavigate,
}) => {
  const [appLang, setAppLang] = useState<Language>(language || 'hi');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState<'normal' | 'slow'>('normal');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const isHi = appLang === 'hi';
  const L = (en: string, hi: string) => (isHi ? hi : en);

  const handleSave = async () => {
    if (currentUser?.userId) {
      const prefMap: Record<string, PreferredLanguage> = {
        hi: 'hindi', en: 'english', hinglish: 'hinglish', ta: 'tamil',
        te: 'telugu', mr: 'marathi', bn: 'bengali', kn: 'kannada', gu: 'gujarati',
        ml: 'malayalam', pa: 'punjabi', or: 'odia', ur: 'urdu',
      };
      try {
        await createOrUpdateProfile({ id: currentUser.userId, preferred_language: prefMap[appLang] || 'hindi' });
      } catch (e) {
        console.warn('Failed to persist language preference:', e);
      }
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleClearLocalCache = () => {
    try {
      const uid = currentUser?.userId || 'guest';
      localStorage.removeItem(`mw_user_uploaded_docs_${uid}`);
      localStorage.removeItem(`mw_qa_history_${uid}`);
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 4000);
    } catch (e) {
      console.warn('Error clearing local cache:', e);
    }
  };

  const categoryCards = [
    {
      icon: User,
      title: L('Account Overview', 'खाता जानकारी'),
      desc: L(
        'View your identity, email, role category and encryption status.',
        'अपनी पहचान, ईमेल, भूमिका और एन्क्रिप्शन स्थिति देखें।'
      ),
      onClick: () => scrollToId('set-sec-account'),
    },
    {
      icon: Globe,
      title: L('Consultation Language', 'परामर्श की भाषा'),
      desc: L(
        'Pick from Hindi, English, Hinglish and regional Indian scripts.',
        'हिंदी, इंग्लिश, हिंग्लिश और क्षेत्रीय भारतीय भाषाओं में से चुनें।'
      ),
      onClick: () => scrollToId('set-sec-lang'),
    },
    {
      icon: Volume2,
      title: L('AI Voice Assistance', 'आवाज सहायता'),
      desc: L(
        'Enable natural speech for AI legal answers and adjust speed.',
        'AI कानूनी जवाबों के लिए प्राकृतिक आवाज़ चालू करें और गति बदलें।'
      ),
      onClick: () => scrollToId('set-sec-voice'),
    },
    {
      icon: Bell,
      title: L('Notification & Case Alerts', 'नोटिफिकेशन और अलर्ट'),
      desc: L(
        'Control advocate reply alerts and case status notices.',
        'अधिवक्ता उत्तर अलर्ट और केस स्टेटस सूचनाओं पर नियंत्रण रखें।'
      ),
      onClick: () => scrollToId('set-sec-notif'),
    },
    {
      icon: Trash2,
      title: L('Local Vault Cache', 'स्थानीय वॉल्ट कैश'),
      desc: L(
        'Clear locally stored drafts and consultation caches on this device.',
        'इस डिवाइस पर स्थानीय ड्राफ्ट और परामर्श कैश साफ़ करें।'
      ),
      onClick: () => scrollToId('set-sec-vault'),
    },
    {
      icon: ShieldCheck,
      title: L('Security & DPDP Compliance', 'सुरक्षा एवं DPDP अनुपालन'),
      desc: L(
        'Read how your legal data stays encrypted and confidential.',
        'जानें कि आपका कानूनी डेटा एन्क्रिप्टेड और गोपनीय कैसे रहता है।'
      ),
      onClick: () => scrollToId('set-sec-security'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F5] pb-12 font-sans text-[#1F2937]">
      <RefHero
        icon={Settings}
        title={L('App Settings & Privacy Controls', 'ऐप सेटिंग्स और गोपनीयता नियंत्रण')}
        subtitle={L(
          'Manage your consultation language, audio voice, notifications and data privacy',
          'अपनी परामर्श भाषा, आवाज सहायता, नोटिफिकेशन और डेटा गोपनीयता प्रबंधित करें'
        )}
        actions={[
          {
            label: L('Back to Home', 'होमपेज पर जाएं'),
            variant: 'outline',
            icon: ArrowLeft,
            onClick: onBackToHome,
          },
          {
            label: L('Save Preferences', 'सेव करें (Save)'),
            variant: 'gold',
            icon: CheckCircle2,
            onClick: handleSave,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Category quick-nav grid */}
        <section className="space-y-6">
          <RefSectionHeading title={L('All Settings & Controls', 'सभी सेटिंग्स और नियंत्रण')} />
          <RefFeatureGrid
            features={categoryCards.map((c) => ({
              icon: c.icon,
              title: c.title,
              desc: c.desc,
              linkText: L('Open', 'पेज खोलें'),
              onClick: c.onClick,
            }))}
          />
        </section>

        {/* Settings panels */}
        <section className="space-y-6">
          <RefSectionHeading title={L('Settings Detail', 'सेटिंग्स विवरण')} />

          {/* Account */}
          <div id="set-sec-account" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-4 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
                <User className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {L('Account Overview', 'खाता जानकारी (Account Details)')}
              </h2>
              <span className="ml-auto text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]">
                {currentUser ? 'Active Account' : 'Guest Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#334155]">
              <div>
                <span className="font-bold text-[#64748B]">User Identity:</span>{' '}
                <span className="font-extrabold text-[#0F172A]">{currentUser?.name || currentUser?.email?.split('@')[0] || 'Guest Citizen'}</span>
              </div>
              <div>
                <span className="font-bold text-[#64748B]">Account Email:</span>{' '}
                <span className="font-mono text-[#0F172A]">{currentUser?.email || 'merawakeelai@gmail.com'}</span>
              </div>
              <div>
                <span className="font-bold text-[#64748B]">Role Category:</span>{' '}
                <span className="font-extrabold text-[#D98800] uppercase">{currentUser?.role === 'lawyer' ? 'Verified Advocate' : 'Citizen (नागरिक)'}</span>
              </div>
              <div>
                <span className="font-bold text-[#64748B]">Encryption Status:</span>{' '}
                <span className="text-[#16A34A] font-bold">256-Bit SSL Active</span>
              </div>
            </div>
          </div>

          {/* Language */}
          <div id="set-sec-lang" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-4 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {L('Preferred Consultation Language', 'परामर्श की भाषा')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setAppLang(l.code as Language)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    appLang === l.code
                      ? 'bg-[#0F2557] text-[#FFFFFF] border-[#0F2557] shadow-md'
                      : 'bg-[#FFFFFF] text-[#1E293B] border-[#E2E8F0] hover:border-[#F5A623]'
                  }`}
                >
                  <div className="font-extrabold text-sm flex items-center justify-between">
                    <span>{l.nativeLabel} ({l.label})</span>
                    {appLang === l.code && <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />}
                  </div>
                  <div className="text-xs opacity-80 mt-1">{l.script} script support</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div id="set-sec-voice" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-4 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {L('AI Voice Assistance', 'आवाज सहायता (AI Voice Speech)')}
              </h2>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-[#64748B]">
                {L('Listen to AI legal answers spoken in natural neural human voice', 'परामर्श जवाबों को प्राकृतिक हिंदी/इंग्लिश आवाज में सुनें')}
              </div>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  voiceEnabled ? 'bg-[#0F2557]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    voiceEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {voiceEnabled && (
              <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-[#334155]">Speech Speed ({L('आवाज की गति', 'Speech Speed')}):</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVoiceSpeed('normal')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      voiceSpeed === 'normal'
                        ? 'bg-[#0F2557] text-[#FFFFFF] border-[#0F2557]'
                        : 'bg-[#FFFFFF] text-[#64748B] border-[#CBD5E1]'
                    }`}
                  >
                    Normal Speed
                  </button>
                  <button
                    onClick={() => setVoiceSpeed('slow')}
                    className={`px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      voiceSpeed === 'slow'
                        ? 'bg-[#0F2557] text-[#FFFFFF] border-[#0F2557]'
                        : 'bg-[#FFFFFF] text-[#64748B] border-[#CBD5E1]'
                    }`}
>
                    {L('Slow', 'धीमी')}
                    </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div id="set-sec-notif" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-4 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#0F1D38] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#FFEDD5] text-[#EA580C] flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {L('Notification & Case Alerts', 'नोटिफिकेशन और केस अपडेट अलर्ट')}
              </h2>
            </div>

            <div className="space-y-2 pt-1 text-xs text-[#334155]">
              <div className="flex items-center justify-between py-1.5 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#64748B]" />
                  <span>Advocate consultation reply alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#0F2557] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#64748B]" />
                  <span>Case status & document verification notices</span>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#0F2557] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Vault cache */}
          <div id="set-sec-vault" className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-2xl p-6 sm:p-8 space-y-3 scroll-mt-6">
            <div className="flex items-center gap-2.5 text-[#991B1B] font-extrabold text-base">
              <span className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </span>
              <h2 className="text-[20px] font-extrabold">
                {L('Local Data Vault Cache', 'स्थानीय वॉल्ट कैश साफ करें')}
              </h2>
              {clearedNotice && (
                <span className="ml-auto text-xs font-extrabold text-[#16A34A] flex items-center gap-1 bg-[#DCFCE7] px-2.5 py-1 rounded-full border border-[#86EFAC]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Vault cache cleared!</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#7F1D1D] leading-relaxed">
              {L(
                'Clear locally stored draft uploaded documents or consultation caches on this device. Your verified account cases stored securely on servers remain safe.',
                'इस डिवाइस पर स्थानीय ड्राफ्ट दस्तावेज़ या परामर्श कैश साफ़ करें। सर्वर पर सुरक्षित आपके सत्यापित केस सुरक्षित रहते हैं।'
              )}
            </p>
            <button
              onClick={handleClearLocalCache}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-[#FFFFFF] font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {L('Clear Local Device Cache', 'स्थानीय डिवाइस कैश साफ़ करें')}
            </button>
          </div>

          {/* Security */}
          <div id="set-sec-security" className="p-6 sm:p-8 bg-[#0F2557] text-[#FFFFFF] rounded-2xl space-y-4 shadow-lg border border-[#1E2E4F] scroll-mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[#F5A623]">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-extrabold text-[20px]">
                  {L('Data Security & DPDP Act Compliance', 'सुरक्षा एवं गोपनीयता गारंटी (DPDP Act 2023)')}
                </h2>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('privacy')}
                  className="text-xs font-bold text-[#F5A623] hover:underline flex items-center gap-1 cursor-pointer bg-[#FFFFFF]/10 px-3 py-1.5 rounded-xl border border-[#F5A623]/30 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{L('Read Full Privacy Policy', 'पूरी गोपनीयता नीति पढ़ें')}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#E2E8F0]">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                <div>
                  <strong>256-Bit SSL Encryption:</strong> All legal conversations and uploaded case documents are protected with banking-grade SSL encryption.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                <div>
                  <strong>Zero AI Training Sharing:</strong> Your private case facts are never shared with public commercial LLMs or advertising networks.
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
            {savedNotice ? (
              <span className="text-xs font-extrabold text-[#16A34A] flex items-center gap-1.5 bg-[#DCFCE7] px-3.5 py-1.5 rounded-xl border border-[#86EFAC]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{L('Settings updated successfully!', 'सेटिंग्स सुरक्षित हो गईं!')}</span>
              </span>
            ) : <span />}

            <button
              onClick={handleSave}
              className="bg-[#0F2557] hover:bg-[#1E2E4F] text-[#F5A623] font-extrabold px-8 py-3 rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              {L('Save Preferences', 'सेव करें (Save)')}
            </button>
          </div>
        </section>

        {/* Bottom 3-col: setup steps / FAQ / emergency */}
        <RefBottomColumns
          stepsTitle={L('How to set up (4 Steps)', 'सेटिंग्स कैसे करें (4 कदम)')}
          steps={[
            {
              title: L('Choose language', 'भाषा चुनें'),
              desc: L('Pick the language for your consultations and answers.', 'अपने परामर्श और जवाबों के लिए भाषा चुनें।'),
            },
            {
              title: L('Enable voice', 'आवाज़ चालू करें'),
              desc: L('Turn on AI speech and set your preferred speed.', 'AI आवाज़ चालू करें और अपनी पसंदीदा गति चुनें।'),
            },
            {
              title: L('Manage alerts', 'अलर्ट प्रबंधित करें'),
              desc: L('Control notifications for case status and replies.', 'केस स्टेटस और उत्तरों की सूचनाएं नियंत्रित करें।'),
            },
            {
              title: L('Save & stay protected', 'सेव करें और सुरक्षित रहें'),
              desc: L('Save preferences and review your privacy policy.', 'सेटिंग्स सेव करें और अपनी गोपनीयता नीति पढ़ें।'),
            },
          ]}
          faqTitle={L('Frequently Asked Questions', 'अक्सर पूछे जाने वाले प्रश्न (FAQ)')}
          faqs={[
            {
              q: L('Are my preferences saved securely?', 'क्या मेरी सेटिंग्स सुरक्षित रूप से सेव होती हैं?'),
              a: L('Yes. Your language preference is saved to your verified profile on secure encrypted servers.', 'हां। आपकी भाषा वरीयता सुरक्षित एन्क्रिप्टेड सर्वर पर आपके सत्यापित प्रोफ़ाइल में सेव होती है।'),
            },
            {
              q: L('What does clearing vault cache do?', 'वॉल्ट कैश साफ़ करने से क्या होता है?'),
              a: L('It removes locally stored drafts and consultation caches on this device only. Server cases remain safe.', 'यह केवल इस डिवाइस पर स्थानीय ड्राफ्ट और परामर्श कैश हटाता है। सर्वर केस सुरक्षित रहते हैं।'),
            },
            {
              q: L('How does DPDP compliance protect me?', 'DPDP अनुपालन मेरी रक्षा कैसे करता है?'),
              a: L('Your data is encrypted, never trained into commercial AI, and shared with a lawyer only on your request.', 'आपका डेटा एन्क्रिप्टेड रहता है, व्यावसायिक AI में कभी नहीं जाता, और केवल आपके अनुरोध पर वकील से साझा होता है।'),
            },
            {
              q: L('Is this page legal advice?', 'क्या यह पेज कानूनी सलाह है?'),
              a: L('No — this is app configuration. For binding legal advice consult a Bar Council-registered advocate.', 'नहीं — यह ऐप कॉन्फ़िगरेशन है। बाध्यकारी कानूनी सलाह के लिए बार काउंसिल पंजीकृत अधिवक्ता से परामर्श करें।'),
            },
          ]}
          emergencyTitle={L('Immediate Help', 'तत्काल सहायता')}
          emergency={[
            {
              icon: Phone,
              color: 'bg-[#16A34A]/15 text-[#16A34A]',
              label: L('National Legal Aid', 'राष्ट्रीय विधिक सहायता'),
              value: '15100',
              href: 'tel:15100',
            },
            {
              icon: Siren,
              color: 'bg-[#DC2626]/15 text-[#DC2626]',
              label: L('Police Emergency', 'पुलिस आपातकाल'),
              value: '112',
              href: 'tel:112',
            },
            {
              icon: HeartHandshake,
              color: 'bg-[#DB2777]/15 text-[#DB2777]',
              label: L('Women Helpline', 'महिला हेल्पलाइन'),
              value: '181',
              href: 'tel:181',
            },
          ]}
          trustText={L('Secure & Confidential', 'सुरक्षित एवं गोपनीय')}
        />
      </div>
    </div>
  );
};

export default SettingsView;