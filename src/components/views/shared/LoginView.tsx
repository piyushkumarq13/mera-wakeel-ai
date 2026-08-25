import React, { useState, useEffect } from 'react';
import { Language, UserRole } from '../../../types';
import { Logo } from '../../Logo';
import { HowToDemo } from '../../HowToDemo';
import { APP_CONFIG } from '../../../constants';
import { supabase, fetchProfile } from '../../../lib/supabase';
import {
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  Play,
  ChevronDown,
} from 'lucide-react';

interface LoginViewProps {
  language: Language;
  onLoginSuccess: (role: UserRole, email: string, userId?: string, profile?: any) => void;
  onGoToRegister: () => void;
  onGoToLawyerPortal?: () => void;
  onBackToHome: () => void;
  initialRole?: UserRole;
}

function cleanErrorMessage(error: any, fallbackMessage: string): string {
  if (!error) return fallbackMessage;
  let msg = typeof error === 'string' ? error : error.message || error.error_description || '';
  if (typeof msg === 'object') {
    try { msg = JSON.stringify(msg); } catch { msg = ''; }
  }
  msg = String(msg).trim();
  if (!msg || msg === '{}' || msg === '[object Object]' || msg.includes('Invalid login credentials')) {
    return fallbackMessage;
  }
  return msg;
}

export const LoginView: React.FC<LoginViewProps> = ({
  language,
  onLoginSuccess,
  onGoToRegister,
  onBackToHome,
  initialRole = 'citizen',
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');
    const cleanEmail = email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setErrorMessage('Galat Email ya Password. Kripya details check karke punah prayas karein.');
          setIsSubmitting(false);
          return;
        }

        if (data?.user) {
          const profile = await fetchProfile(data.user.id);
          const metaName = data.user.user_metadata?.full_name || '';
          const mergedProfile = profile
            ? { ...profile, full_name: profile.full_name || metaName || null }
            : metaName
            ? { full_name: metaName, user_type: 'citizen' }
            : null;
          const detectedRole: UserRole = profile?.user_type === 'lawyer' ? 'lawyer' : profile?.user_type === 'admin' ? 'admin' : 'citizen';
          setIsSubmitting(false);
          onLoginSuccess(detectedRole, data.user.email || cleanEmail, data.user.id, mergedProfile);
          return;
        }
      }

      setErrorMessage('Database authentication failed. Kripya valid login credentials enter karein.');
      setIsSubmitting(false);
      return;

    } catch (err: any) {
      const msg = cleanErrorMessage(err, 'An error occurred during authentication.');
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row select-none overflow-y-auto">
      <div className="lg:w-[420px] xl:w-[460px] bg-gradient-to-b from-[#0F1D38] via-[#162B50] to-[#0A1424] text-[#FFFFFF] p-5 sm:p-8 flex flex-col justify-between shrink-0 h-auto lg:min-h-screen overflow-y-auto relative shadow-xl border-b lg:border-b-0 lg:border-r border-[#FFFFFF]/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A017]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-4 lg:space-y-6 z-10">
          <div className="flex items-center justify-between">
            <Logo variant="light" />
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs text-[#D4A017] hover:text-[#FFFFFF] bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20 px-3 py-1.5 rounded-full transition-all cursor-pointer font-bold border border-[#D4A017]/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Homepage</span>
            </button>
          </div>

          <div className="inline-flex items-center gap-2 bg-[#FFFFFF]/10 border border-[#D4A017]/50 text-[#D4A017] px-3.5 py-1 rounded-full text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {role === 'lawyer' ? 'Advocate Legal Portal (अधिवक्ता)' : 'Citizen Kanooni Portal (नागरिक)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDemoOpen((o) => !o)}
            aria-expanded={demoOpen}
            className={`w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              demoOpen
                ? 'bg-[#D4A017]/20 border-[#D4A017]/60 text-[#FFD766]'
                : 'bg-[#FFFFFF]/10 border-[#FFFFFF]/20 text-[#E2E8F0] hover:bg-[#FFFFFF]/20 hover:border-[#D4A017]/40'
            }`}
          >
            <span className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-[#D4A017]" />
              <span>How to Login? (लॉगिन कैसे करें)</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${demoOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="space-y-2">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#FFFFFF] leading-tight">
              {role === 'lawyer'
                ? 'Empowering Advocates with AI Research & Client Connect'
                : APP_CONFIG.subtitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed opacity-90">
              {role === 'lawyer'
                ? 'Access automated summaries, client case timelines, key evidence analysis & secure messaging.'
                : 'Simple Hindi & English me instant kanooni guidance, document analysis aur verified advocates se direct connect.'}
            </p>
          </div>

          <div className="hidden sm:block space-y-2.5 pt-2">
            {role === 'lawyer' ? (
              <>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>AI Pre-Analysis & Timeline Extractor</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>State Bar Council Verification Badge</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>0% Commission on Client Consultations</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>100% Free AI Instant Legal Advisory</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>Supreme Court & High Court Precedents</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#F8FAFC]">
                  <CheckCircle className="w-4 h-4 text-[#D4A017] shrink-0 mt-0.5" />
                  <span>Verified State Bar Council Advocates</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="z-10 w-full px-5 sm:px-8 py-4 min-h-0 shrink-0">
          <HowToDemo
            type="login"
            userType={role === 'lawyer' ? 'advocate' : 'citizen'}
            open={demoOpen}
          />
        </div>

        <div className="hidden lg:flex pt-6 mt-6 border-t border-[#FFFFFF]/15 z-10 items-center justify-between">
          <span className="text-xs text-[#CBD5E1] flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#D4A017]" />
            Digital India Legal AI
          </span>
          <span className="text-xs text-[#D4A017] font-semibold">v2.5</span>
        </div>
      </div>

      <div className="flex-1 bg-[#FFFFFF] flex flex-col min-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-1 text-xs text-[#1F3864] font-bold bg-[#F1F5F9] px-3 py-1.5 rounded-full"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D4A017]" />
            Home
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-md mx-auto space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">
                {role === 'lawyer' ? 'Advocate Portal Login' : 'Citizen Account Login'}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Apna registered email aur password enter karein
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Email Address <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'lawyer' ? 'advocate@barcouncil.in' : 'apna@email.com'}
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] focus:border-[#D4A017] rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Password (पासवर्ड) <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="पासवर्ड डालें"
                    className="w-full bg-[#FFFFFF] border border-[#CBD5E1] focus:border-[#D4A017] rounded-xl pl-9 pr-10 py-2.5 text-xs outline-none text-[#0F172A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#94A3B8] hover:text-[#0F1D38] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F1D38] hover:bg-[#1E2E4F] text-[#FFFFFF] font-extrabold py-3.5 px-4 rounded-xl text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Logging in...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#D4A017]" />
                    <span>Login to Portal</span>
                  </>
                )}
              </button>

              <p className="text-center text-xs text-[#64748B] pt-1">
                Naya account nahi hai?{' '}
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="text-[#D98800] font-bold hover:underline cursor-pointer"
                >
                  Register karein ?
                </button>
              </p>
            </form>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0] px-6 py-4 bg-[#FFFFFF] shrink-0">
          <div className="max-w-md mx-auto text-center">
            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
              System automatically detects your role from your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
