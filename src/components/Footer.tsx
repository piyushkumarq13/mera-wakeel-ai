import React from 'react';
import { Logo } from './Logo';
import { Language, NavTab, UserRole } from '../types';
import { getContent } from './LanguageContent';
import { ShieldCheck, ExternalLink, Scale } from 'lucide-react';

interface FooterProps {
  language: Language;
  onTabChange: (tab: NavTab) => void;
  onOpenAuth?: (role: UserRole) => void;
  currentUser?: { email: string; role: UserRole; name?: string; userId?: string } | null;
}

export const Footer: React.FC<FooterProps> = ({ language, onTabChange, onOpenAuth, currentUser }) => {
  const t = getContent(language).footer;

  return (
    <footer className="bg-[#0F1D38] text-[#FFFFFF] border-t border-[#1E2E4F] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#FFFFFF]/15">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-4">
            <Logo variant="light" />
            <p className="text-sm text-[#9CA3AF] leading-relaxed max-w-md">
              {t.tagline}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#D98800] bg-[#FFFFFF]/5 px-3.5 py-2 rounded-xl border border-[#D98800]/20 w-fit font-medium">
              <ShieldCheck className="w-4 h-4 text-[#D98800]" />
              <span>Made with care for Indian Citizens & Advocates</span>
            </div>
          </div>

          {currentUser?.role === 'lawyer' ? (
            <>
              {/* Quick Links Column (Lawyer) */}
              <div className="md:col-span-6 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  Quick Links (Advocate)
                </h4>
                <ul className="space-y-2 text-sm text-[#D1D5DB]">
                  <li>
                    <button
                      onClick={() => onTabChange('home')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('how-it-works')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('for-lawyers')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚖️</span>
                      <span>Advocate Dashboard</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('support')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F5A623] hover:text-[#D4A017] transition-colors cursor-pointer"
                    >
                      Help Center (सहायता)

                    </button>
                  </li>
                </ul>
              </div>

              {/* Platform Info Column */}
              <div className="md:col-span-6 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  Mera Wakeel AI Platform
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Powered by advanced AI models tailored for Indian Legal Codes (BNS, BNSS, BSA, IPC, CRPC), state-specific laws, and document analysis.
                </p>
                <div className="p-3 rounded-xl bg-[#FFFFFF]/5 border border-[#D98800]/20 text-xs text-[#D98800] font-semibold w-fit">
                  Verified Advocate Console
                </div>
              </div>
            </>
          ) : currentUser?.role === 'citizen' ? (
            <>
              {/* Quick Links Column (Citizen) */}
              <div className="md:col-span-6 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  {t.quickLinks}
                </h4>
                <ul className="space-y-2 text-sm text-[#D1D5DB]">
                  <li>
                    <button
                      onClick={() => onTabChange('home')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('how-it-works')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('my-cases')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      My Cases (केस)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('chat')}
                      className="hover:text-[#D98800] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Start Free Consultation</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#D98800]" />
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('draft-documents')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Draft Documents (दस्तावेज़)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('free-legal-aid')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Free Govt Legal Aid (NALSA)
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('support')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F5A623] hover:text-[#D4A017] transition-colors cursor-pointer"
                    >
                      Help Center (सहायता)

                    </button>
                  </li>
                </ul>
              </div>

              {/* Platform Info Column */}
              <div className="md:col-span-6 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  Mera Wakeel AI Platform
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Powered by advanced AI models tailored for Indian Legal Codes (BNS, BNSS, BSA, IPC, CRPC), state-specific laws, and document analysis.
                </p>
                <div className="p-3 rounded-xl bg-[#FFFFFF]/5 border border-[#D98800]/20 text-xs text-[#D98800] font-semibold w-fit">
                  Citizen Kanooni Help Desk
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Quick Links Column (Guest) */}
              <div className="md:col-span-3 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  {t.quickLinks}
                </h4>
                <ul className="space-y-2 text-sm text-[#D1D5DB]">
                  <li>
                    <button
                      onClick={() => onTabChange('home')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('how-it-works')}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('chat')}
                      className="hover:text-[#D98800] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Start Free Consultation</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#D98800]" />
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => onTabChange('support')}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F5A623] hover:text-[#D4A017] transition-colors cursor-pointer"
                    >
                      Help Center (सहायता)

                    </button>
                  </li>
                </ul>
              </div>

              {/* For Advocates Column */}
              <div className="md:col-span-4 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  For Advocates (वकीलों के लिए)
                </h4>
                <ul className="space-y-2 text-sm text-[#D1D5DB]">
                  <li>
                    <button
                      onClick={() => {
                        if (onOpenAuth) {
                          onOpenAuth('lawyer');
                        } else {
                          onTabChange('for-lawyers');
                        }
                      }}
                      className="hover:text-[#D98800] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚖️</span>
                      <span>Advocate Portal Login</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        if (onOpenAuth) {
                          onOpenAuth('lawyer');
                        } else {
                          onTabChange('for-lawyers');
                        }
                      }}
                      className="hover:text-[#D98800] transition-colors cursor-pointer"
                    >
                      Register as Advocate
                    </button>
                  </li>
                  <li className="text-xs text-[#6B7280] leading-relaxed pt-1">
                    Bar Council verified advocates: manage profile, accept client leads, 0% commission.
                  </li>
                </ul>
              </div>

              {/* Platform Info Column */}
              <div className="md:col-span-5 space-y-3">
                <h4 className="font-bold text-[#D98800] text-base">
                  Mera Wakeel AI Platform
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Powered by advanced AI models tailored for Indian Legal Codes (BNS, BNSS, BSA, IPC, CRPC), state-specific laws, and document analysis.
                </p>
                <div className="p-3 rounded-xl bg-[#FFFFFF]/5 border border-[#D98800]/20 text-xs text-[#D98800] font-semibold w-fit">
                  Languages: Hindi | English | Hinglish
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="py-6 text-center border-b border-[#FFFFFF]/10">
          <p className="text-xs sm:text-sm text-[#D98800] italic leading-relaxed max-w-3xl mx-auto px-2">
            "Ye guidance sirf jaankari ke liye hai, professional legal advice ka replacement nahi."
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9CA3AF] gap-4">
          <div className="flex items-center gap-3">
            <p>© {new Date().getFullYear()} Mera Wakeel AI. {t.rights}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onTabChange('privacy')}
              className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              onClick={() => onTabChange('terms')}
              className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              Terms & Security
            </button>
            <span>•</span>
            <button
              onClick={() => onTabChange('settings')}
              className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              Support & Settings
            </button>
            <span>•</span>
            <button
              onClick={() => onTabChange('support')}
              className="hover:text-[#FFFFFF] transition-colors cursor-pointer"
            >
              Help Center
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
