import React, { useState, useRef, useEffect } from 'react';
import { Logo } from './Logo';
import { Language, NavTab, UserRole, AppNotification } from '../types';
import { getContent } from './LanguageContent';
import { LANGUAGES } from '../lib/language';
import { isLowBandwidth, setLowBandwidth } from '../lib/pwa';
import { ChevronDown, Menu, X, Wifi, WifiOff, Bell, Phone, MessageSquare, User } from 'lucide-react';

interface NavLink {
  tab: NavTab;
  label: string;
  dot?: string;
  icon?: React.ReactNode;
}

const NAV_LINKS: Record<'citizen' | 'lawyer' | 'guest', NavLink[]> = {
  guest: [
    { tab: 'home',           label: 'Home' },
    { tab: 'how-it-works',   label: 'How It Works' },
    { tab: 'advocates',      label: 'Advocate Directory' },
    { tab: 'free-legal-aid', label: 'Free Govt Legal Aid' },
    { tab: 'support',        label: 'Help' },
  ],
  citizen: [
    { tab: 'home',         label: 'Home' },
    { tab: 'chat',         label: 'Legal Chat',  icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { tab: 'call',         label: 'Voice Call',   icon: <Phone className="w-3.5 h-3.5" />, dot: '#16A34A' },
    { tab: 'documents',    label: 'Document Analysis' },
    { tab: 'lawyers',      label: 'Find Lawyers' },
    { tab: 'my-cases',     label: 'My Dashboard' },
    { tab: 'messages',     label: 'Messages' },
    { tab: 'support',      label: 'Help' },
  ],
  lawyer: [
    { tab: 'home',          label: 'Home' },
    { tab: 'how-it-works',  label: 'How It Works' },
    { tab: 'for-lawyers',   label: 'Advocate Dashboard', dot: '#D98800' },
    { tab: 'messages',      label: 'Messages',           dot: '#2563EB' },
    { tab: 'support',       label: 'Help' },
  ],
};

const MORE_TOOLS_CITIZEN: { tab: NavTab; label: string }[] = [
  { tab: 'advocates',       label: 'Advocate Directory' },
  { tab: 'draft-documents', label: 'Draft Documents' },
  { tab: 'free-legal-aid',  label: 'Free Govt Legal Aid' },
  { tab: 'how-it-works',    label: 'How It Works' },
];

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenAuth: () => void;
  onSignUp: () => void;
  currentUser?: { email: string; role: UserRole; name?: string; userId?: string } | null;
  onLogout?: () => void;
  pendingRequestsCount?: number;
  notifications?: AppNotification[];
  onMarkNotifRead?: (id: string) => void;
  onClearAllNotifs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  language,
  onLanguageChange,
  onOpenAuth,
  onSignUp,
  currentUser,
  onLogout,
  pendingRequestsCount = 0,
  notifications = [],
  onMarkNotifRead,
  onClearAllNotifs,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [lowBandwidth, setLowBandwidthState] = useState<boolean>(() => isLowBandwidth());
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileProfileExpanded, setMobileProfileExpanded] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const t = getContent(language).nav;

  const role = currentUser?.role === 'lawyer' ? 'lawyer'
             : currentUser?.role === 'citizen' ? 'citizen'
             : 'guest';
  const links = NAV_LINKS[role];
  const resourceItems = MORE_TOOLS_CITIZEN;
  const showResources = currentUser?.role === 'citizen';

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!resourcesOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResourcesOpen(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [resourcesOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [profileOpen]);

  useEffect(() => {
    if (!bellOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [bellOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleKey);
      setMobileProfileExpanded(false);
    };
  }, [mobileMenuOpen]);

  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    setLowBandwidth(next);
    setLowBandwidthState(next);
  };

  const languages: { code: Language; label: string }[] = LANGUAGES.map((l) => ({
    code: l.code as Language,
    label: l.nativeLabel,
  }));

  const handleNavClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E5E7EB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Left: Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavClick('home')}
              className="flex items-center text-left focus:outline-none rounded-lg p-1 transition-all cursor-pointer"
              aria-label="Mera Wakeel AI Home"
            >
              <Logo variant="dark" />
            </button>
          </div>

          {/* Center: Desktop Nav Links (Role-based) */}
          <nav className="hidden lg:flex items-center space-x-3.5 xl:space-x-4">
            {links.map(({ tab, label, dot, icon }) => (
              <button
                key={tab}
                onClick={() => handleNavClick(tab)}
                className={`text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  currentTab === tab
                    ? 'text-[#D98800] font-bold border-b-2 border-[#D98800] pb-1'
                    : 'text-[#4B5563] hover:text-[#0F1D38]'
                }`}
              >
                {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
                {icon && <span className="shrink-0">{icon}</span>}
                <span>{label}</span>
                {tab === 'for-lawyers' && pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-red-600 rounded-full animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            ))}

            {/* Resources dropdown — citizen and guest only */}
            {showResources && (
              <div
                ref={resourcesRef}
                className="relative"
                onMouseEnter={() => setResourcesOpen(true)}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  className="flex items-center gap-1 text-xs font-medium text-[#4B5563] hover:text-[#0F1D38] transition-colors cursor-pointer"
                  aria-haspopup="menu"
                  aria-expanded={resourcesOpen}
                >
                  <span>More Tools</span>
                  <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>

                {resourcesOpen && (
                  <div className="absolute top-full right-0 w-48 pt-2 z-50">
                    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl shadow-lg py-2">
                      {resourceItems.map(({ tab: rTab, label: rLabel }) => (
                        <button
                          key={rTab}
                          onClick={() => { handleNavClick(rTab); setResourcesOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${
                            currentTab === rTab
                              ? 'font-semibold text-[#D98800]'
                              : 'text-[#374151] hover:bg-[#F3F4F6]'
                          }`}
                        >
                          {rLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right: Data Saver + Language + Bell + Profile */}
          <div className="hidden lg:flex items-center space-x-2">
            {/* Advocate portal tiny link — only visible when not logged in */}
            {!currentUser && (
              <button
                onClick={() => handleNavClick('for-lawyers')}
                className="text-[10px] font-semibold text-[#94A3B8] hover:text-[#D98800] border border-[#E5E7EB] hover:border-[#D98800] px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                ⚖️ Advocate?
              </button>
            )}
            {/* Language Switcher */}
            <div className="relative group">
              <div className="flex items-center gap-1 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#374151] cursor-pointer">
                <span>{LANGUAGES.find((l) => l.code === language)?.nativeLabel || 'हिंदी'}</span>
                <ChevronDown className="w-3 h-3 text-[#6B7280]" />
              </div>
              <div className="absolute top-full right-0 w-40 pt-1 hidden group-hover:block z-50">
                <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl shadow-md py-1 max-h-72 overflow-y-auto">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => onLanguageChange(lang.code)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium ${
                        language === lang.code
                          ? 'bg-[#FEF3C7] text-[#D98800] font-bold'
                          : 'text-[#374151] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {currentUser ? (
              <div className="flex items-center gap-1.5">
                {/* Notification Bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => setBellOpen(!bellOpen)}
                    className="relative p-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {bellOpen && (
                    <div className="absolute top-full right-0 w-80 pt-2 z-50">
                      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                          <span className="text-sm font-bold text-[#0F172A]">Notifications</span>
                          {notifications.length > 0 && (
                            <button
                              onClick={() => { onClearAllNotifs?.(); setBellOpen(false); }}
                              className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6]">
                          {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                              No new notifications
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => {
                                  onMarkNotifRead?.(n.id);
                                  setBellOpen(false);
                                  if (n.linkTab) handleNavClick(n.linkTab);
                                }}
                                className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-[#F9FAFB] transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : ''}`}
                              >
                                <span className="text-lg shrink-0">{n.icon}</span>
                                <div className="min-w-0">
                                  <p className={`text-xs leading-snug ${n.is_read ? 'font-normal text-[#6B7280]' : 'font-semibold text-[#0F172A]'}`}>
                                    {n.message}
                                  </p>
                                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{n.timeAgo}</p>
                                </div>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0 mt-1" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-extrabold text-[#0F172A] bg-[#DCFCE7] border border-[#86EFAC] hover:bg-[#BBF7D0] transition-all cursor-pointer"
                    title={`Logged in as ${currentUser.email}`}
                  >
                    <span className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute top-full right-0 w-64 pt-2 z-50">
                      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-2">
                        {/* User info */}
                        <div className="px-4 py-2.5 border-b border-[#E5E7EB]">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold shrink-0">
                              {(currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#0F172A]">{currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'User'}</p>
                              <p className="text-[11px] text-[#6B7280] truncate">{currentUser.email}</p>
                            </div>
                          </div>
                        </div>
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => { handleNavClick('admin'); setProfileOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer flex items-center gap-2"
                          >
                            ⚙️ Admin Dashboard
                          </button>
                        )}
                        <button
                          onClick={toggleLowBandwidth}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors cursor-pointer flex items-center gap-2"
                        >
                          {lowBandwidth ? <WifiOff className="w-4 h-4 text-[#2563EB]" /> : <Wifi className="w-4 h-4" />}
                          <span>Data Saver</span>
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${lowBandwidth ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#64748B]'}`}>
                            {lowBandwidth ? 'ON' : 'OFF'}
                          </span>
                        </button>
                        <button
                          onClick={() => { handleNavClick('settings'); setProfileOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                        >
                          Settings
                        </button>
                        <div className="border-t border-[#E5E7EB] mt-1 pt-1">
                          <button
                            onClick={() => { setProfileOpen(false); onLogout?.(); }}
                            className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={onOpenAuth}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={onSignUp}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#FFFFFF] bg-[#D98800] hover:bg-[#C27900] transition-colors shadow-xs cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center space-x-1 lg:hidden">
            {currentUser && (
              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen(!bellOpen)}
                  className="relative p-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute top-full right-0 w-80 pt-2 z-50">
                    <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
                        <span className="text-sm font-bold text-[#0F172A]">Notifications</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => { onClearAllNotifs?.(); setBellOpen(false); }}
                            className="text-xs text-[#DC2626] font-semibold hover:underline cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6]">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                            No new notifications
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => {
                                onMarkNotifRead?.(n.id);
                                setBellOpen(false);
                                if (n.linkTab) handleNavClick(n.linkTab);
                              }}
                              className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-[#F9FAFB] transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : ''}`}
                            >
                              <span className="text-lg shrink-0">{n.icon}</span>
                              <div className="min-w-0">
                                <p className={`text-xs leading-snug ${n.is_read ? 'font-normal text-[#6B7280]' : 'font-semibold text-[#0F172A]'}`}>
                                  {n.message}
                                </p>
                                <p className="text-[10px] text-[#9CA3AF] mt-0.5">{n.timeAgo}</p>
                              </div>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-[#3B82F6] shrink-0 mt-1" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#374151] hover:bg-[#F3F4F6]"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            >
              <Menu className="w-6 h-6 text-[#0F1D38]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] shrink-0">
          <Logo variant="dark" />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {links.map(({ tab, label, icon }) => (
              <button
                key={tab}
                onClick={() => handleNavClick(tab)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold flex items-center gap-2.5 ${
                  currentTab === tab ? 'bg-[#FEF3C7] text-[#D98800]' : 'text-[#374151]'
                }`}
              >
                {icon && <span className="shrink-0 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>}
                <span>{label}</span>
              </button>
            ))}

            {showResources && (
              <>
                <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">More Tools</div>
                {resourceItems.map(({ tab: rTab, label: rLabel }) => (
                  <button
                    key={rTab}
                    onClick={() => handleNavClick(rTab)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-semibold ${
                      currentTab === rTab ? 'bg-[#FEF3C7] text-[#D98800]' : 'text-[#374151]'
                    }`}
                  >
                    {rLabel}
                  </button>
                ))}
              </>
            )}

            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-base font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]"
              >
                ⚙️ Admin Dashboard
              </button>
            )}

            {!currentUser && (
              <button
                onClick={() => handleNavClick('for-lawyers')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-[#D98800] flex items-center gap-1.5"
              >
                <span>⚖️</span>
                <span>Advocate Portal (वकील)</span>
              </button>
            )}
          </div>

          {/* Mobile: Profile Section */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            {currentUser ? (
              <div className="space-y-2">
                {/* Profile section — clickable to expand */}
                <button
                  onClick={() => setMobileProfileExpanded(!mobileProfileExpanded)}
                  className="w-full flex items-center gap-2 px-1 cursor-pointer"
                >
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-extrabold text-[#0F172A] bg-[#DCFCE7] border border-[#86EFAC]">
                    <span className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">
                      {currentUser.name?.trim() || currentUser.email?.split('@')[0] || 'User'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform shrink-0 ${mobileProfileExpanded ? 'rotate-180' : ''}`} />
                </button>
                {mobileProfileExpanded && (
                  <div className="space-y-1">
                    <button
                      onClick={toggleLowBandwidth}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6] flex items-center gap-2"
                    >
                      {lowBandwidth ? <WifiOff className="w-4 h-4 text-[#2563EB]" /> : <Wifi className="w-4 h-4" />}
                      <span>Data Saver</span>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${lowBandwidth ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#64748B]'}`}>
                        {lowBandwidth ? 'ON' : 'OFF'}
                      </span>
                    </button>
                    <button
                      onClick={() => { handleNavClick('settings'); setMobileMenuOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#374151] hover:bg-[#F3F4F6]"
                    >
                      Settings
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={onOpenAuth}
                  className="flex-1 bg-[#F3F4F6] text-[#374151] font-bold py-2.5 rounded-xl text-sm"
                >
                  Login
                </button>
                <button
                  onClick={onSignUp}
                  className="flex-1 bg-[#D98800] text-[#FFFFFF] font-bold py-2.5 rounded-xl text-sm shadow-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile language switcher */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <div className="flex gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    language === lang.code
                      ? 'bg-[#0F1D38] text-[#FFFFFF] border-[#0F1D38]'
                      : 'bg-[#FFFFFF] text-[#374151] border-[#E5E7EB]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
