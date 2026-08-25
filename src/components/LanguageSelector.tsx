import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '../types';
import { PreferredLanguage } from '../types/database';
import { LANGUAGE_OPTIONS } from '../lib/translations';
import { createOrUpdateProfile } from '../lib/db/auth';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  userId?: string | null;
  compact?: boolean;
  className?: string;
}

const LANG_STORAGE_KEY = 'mw_language';

/**
 * Maps the app Language type to the DB preferred_language value and vice versa.
 */
function langToDb(lang: Language): PreferredLanguage {
  const map: Record<string, PreferredLanguage> = {
    hi: 'hindi',
    en: 'english',
    hinglish: 'hinglish',
    mr: 'marathi',
    bn: 'bengali',
    ta: 'tamil',
    te: 'telugu',
    gu: 'gujarati',
    kn: 'kannada',
    ml: 'malayalam',
    pa: 'punjabi',
    or: 'odia',
    ur: 'urdu',
  };
  return map[lang] || 'hindi';
}

function dbToLang(db: string | null | undefined): Language {
  if (!db) return 'hi';
  const map: Record<string, Language> = {
    hindi: 'hi',
    english: 'en',
    hinglish: 'hinglish',
    marathi: 'mr',
    bengali: 'bn',
    tamil: 'ta',
    telugu: 'te',
    gujarati: 'gu',
    kannada: 'kn',
    malayalam: 'ml',
    punjabi: 'pa',
    odia: 'or',
    urdu: 'ur',
  };
  return map[db.toLowerCase()] || 'hi';
}

export function resolveLanguageFromStorage(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored) {
      const match = LANGUAGE_OPTIONS.find((l) => l.code === stored);
      if (match) return stored as Language;
    }
  } catch {}
  return 'hi';
}

export function saveLanguageToStorage(lang: Language) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  userId,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (code: Language) => {
    setIsOpen(false);
    if (code === currentLanguage) return;

    onLanguageChange(code);
    saveLanguageToStorage(code);

    // Persist to Supabase profile if user is logged in
    if (userId) {
      try {
        createOrUpdateProfile({
          id: userId,
          preferred_language: langToDb(code),
        }).catch(() => {});
      } catch {}
    }
  };

  const currentOption = LANGUAGE_OPTIONS.find((l) => l.code === currentLanguage) || LANGUAGE_OPTIONS[0];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[10px] font-bold bg-[#FFFFFF] border-[#CBD5E1] hover:border-[#D4A017] text-[#334155]'
            : 'px-3 py-2 text-xs font-bold bg-[#FFFFFF] border-[#CBD5E1] hover:border-[#D4A017] text-[#334155]'
        }`}
      >
        <Globe className={compact ? 'w-3 h-3 text-[#D4A017]' : 'w-3.5 h-3.5 text-[#D4A017]'} />
        <span>{currentOption.nativeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-[#94A3B8] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px] max-h-[320px] overflow-y-auto">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelect(opt.code as Language)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-all cursor-pointer hover:bg-[#F8FAFC] ${
                currentLanguage === opt.code
                  ? 'bg-[#FEF3C7] font-bold text-[#92400E]'
                  : 'text-[#334155]'
              }`}
            >
              <span className="flex-1">{opt.nativeLabel}</span>
              {currentLanguage === opt.code && (
                <Check className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
