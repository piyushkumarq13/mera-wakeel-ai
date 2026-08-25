import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SearchX, RefreshCcw, ShieldCheck, MapPin, Star, Scale, IndianRupee, X, CheckCircle2 } from 'lucide-react';
import { type Lawyer } from '../../../types/database';
import { createLawyerConnection, generateUUID, trackEvent } from '../../../lib/supabase';
import { ReviewModal } from '../../ReviewModal';
import { AdvocateDirectoryHeader } from '../../advocates/AdvocateDirectoryHeader';
import { CategoryFilterTabs, type CategoryOption } from '../../advocates/CategoryFilterTabs';
import { AdvocateGrid } from '../../advocates/AdvocateGrid';
import { AdvocateCardSkeleton } from '../../advocates/AdvocateCardSkeleton';
import { displayName, initials, feeText } from '../../advocates/AdvocateCard';

interface AdvocateDirectoryViewProps {
  currentUser?: {
    userId: string;
    email: string;
    role: 'citizen' | 'lawyer';
    name?: string;
  } | null;
  onBackToHome: () => void;
  onRequireAuth?: () => void;
}

/* Fixed practice-area tabs. The lawyers schema stores `specialty[]` (no
   dedicated category column), so each tab filters by matching keywords
   against a lawyer's specialty list — same approach as the existing directory. */
const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All Lawyers (सभी वकील)' },
  { id: 'property', label: 'Property & Land (ज़मीन-जायदाद)' },
  { id: 'family', label: 'Family & Divorce (पारिवारिक)' },
  { id: 'criminal', label: 'Criminal Law (आपराधिक)' },
  { id: 'consumer', label: 'Consumer & Fraud (उपभोक्ता)' },
  { id: 'labour', label: 'Labour & Employment (रोजगार)' },
  { id: 'civil', label: 'Civil Litigation (सिविल)' },
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  property: ['property', 'land', 'real estate', 'rera', 'registry', 'tenant', 'mut.ton'],
  family: ['family', 'divorce', 'marriage', 'matrimonial', 'custody', 'maintenance', 'child'],
  criminal: ['criminal', 'ipc', 'bns', 'bail', 'cheating', 'cyber', 'penal'],
  consumer: ['consumer', 'fraud', 'insurance', 'banking', 'refund', 'forgery'],
  labour: ['labour', 'employment', 'industrial', 'workmen', 'salary', 'service'],
  civil: ['civil', 'litigation', 'contract', 'injunction', 'tort', 'recovery'],
};

export const AdvocateDirectoryView: React.FC<AdvocateDirectoryViewProps> = ({
  currentUser,
  onBackToHome,
  onRequireAuth,
}) => {
  const [advocates, setAdvocates] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('all');

  // Request + Rate + Profile state
  const [requestTarget, setRequestTarget] = useState<Lawyer | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Lawyer | null>(null);
  const [selectedAdvocate, setSelectedAdvocate] = useState<Lawyer | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchAdvocates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/lawyers');
      const json = await res.json();
      if (json && json.success && Array.isArray(json.lawyers)) {
        setAdvocates(json.lawyers as Lawyer[]);
      } else {
        setAdvocates([]);
        if (json && json.success === false) setError('Database connection unavailable. Kripya baad mein prayas karein.');
      }
    } catch (err) {
      console.error('Error fetching advocate directory:', err);
      setError('Advocate directory load fail ho gaya. Apna internet check karke dobara try karein.');
      setAdvocates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvocates();
  }, [fetchAdvocates]);

  // Debounced (300ms) client-side search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Auto-open an advocate detail if landing directly on /advocates/:id
  useEffect(() => {
    const m = window.location.pathname.match(/^\/advocates\/(.+)$/);
    if (m && advocates.length > 0) {
      const found = advocates.find((l) => l.id === m[1] || l.profile_id === m[1]);
      if (found) setSelectedAdvocate(found);
    }
  }, [advocates]);

  const filteredAdvocates = useMemo(() => {
    return advocates.filter((lawyer) => {
      const haystack = [
        lawyer.profile?.full_name || '',
        lawyer.profile?.city || '',
        lawyer.profile?.state || '',
        lawyer.bar_council_number || '',
        (lawyer.specialty || []).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !debouncedQuery || haystack.includes(debouncedQuery);

      if (category === 'all') return matchesSearch;

      const specs = (lawyer.specialty || []).join(' ').toLowerCase();
      const keywords = CATEGORY_KEYWORDS[category] || [];
      const matchesCategory = keywords.some((kw) => specs.includes(kw));
      return matchesSearch && matchesCategory;
    });
  }, [advocates, debouncedQuery, category]);

  const openProfile = (lawyer: Lawyer) => {
    setSelectedAdvocate(lawyer);
    window.history.pushState({}, '', `/advocates/${lawyer.id}`);
  };

  const closeProfile = () => {
    setSelectedAdvocate(null);
    window.history.pushState({}, '', '/advocates');
  };

  const handleSendRequest = async () => {
    if (!requestTarget) return;
    if (!currentUser?.userId && onRequireAuth) {
      setRequestTarget(null);
      onRequireAuth();
      return;
    }
    setSendingRequest(true);
    const citizenId = currentUser?.userId || 'guest_citizen';
    let ok = false;
    try {
      const result = await createLawyerConnection(citizenId, requestTarget.id, generateUUID());
      trackEvent('lawyer_connection_requested', {
        lawyer_id: requestTarget.id,
        user_id: citizenId,
      });
      ok = true;
      setToast(result.sms_sent ? `Vakeel ko SMS bhej diya gaya` : `✅ Consultation request bhej diya gaya — ${displayName(requestTarget)}`);
    } catch (err: any) {
      console.warn('Error sending consultation request:', err);
      const msg = err?.message || '';
      setToast(msg.includes('Lawyer not found') ? 'Advocate abhi available nahi hain.' : 'Request nahi bheja ja saka — dobara prayas karein.');
    } finally {
      setSendingRequest(false);
      if (ok) setRequestTarget(null);
      setTimeout(() => setToast(null), 4500);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setCategory('all');
  };

  /* ---------- Profile detail screen (in-page, URL /advocates/:id) ---------- */
  if (selectedAdvocate) {
    const l = selectedAdvocate;
    const name = displayName(l);
    const city = l.profile?.city || '';
    const state = l.profile?.state || '';
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
        <div className="bg-[#0A1628] text-[#FFFFFF] py-4 px-4 md:px-8 border-b border-[#1E293B]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeProfile}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#F59E0B] hover:text-[#FFFFFF] cursor-pointer"
            >
              <span className="p-1.5 rounded-full bg-[#1E293B] hover:bg-[#334155] transition-colors">
                <X className="w-3.5 h-3.5" />
              </span>
              Back to Directory
            </button>
            <span className="px-2.5 py-0.5 bg-[#D97706]/20 border border-[#D97706]/50 text-[#F59E0B] text-[10px] font-bold rounded-full">
              ⚖️ Verified Directory
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-5">
          {/* Profile banner */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="relative shrink-0 self-start md:self-center">
                {l.profile_photo_url ? (
                  <img
                    src={l.profile_photo_url}
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#E2E8F0] shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center font-extrabold text-2xl border-2 border-[#E2E8F0]">
                    {initials(l)}
                  </div>
                )}
                {l.is_verified && (
                  <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#D97706] text-white border-2 border-white flex items-center justify-center shadow">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold">{name}</h1>
                <p className="text-sm font-bold text-[#D97706]">
                  {l.specialty?.[0] || 'Legal Advocate'}
                  {l.bar_council_number ? ` • Reg: ${l.bar_council_number}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[city, state].filter(Boolean).join(', ') || 'India'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                    {l.rating_avg || 0} ({l.review_count || 0} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" />
                    {l.years_experience || 0} Yrs Experience
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-center">
                <button
                  type="button"
                  onClick={() => setRequestTarget(l)}
                  className="px-5 py-3 bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Scale className="w-4 h-4" />
                  Request Consultation
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTarget(l)}
                  className="px-5 py-3 bg-[#FFFFFF] border border-[#D97706] text-[#D97706] hover:bg-[#FEF3C7] text-xs font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Star className="w-4 h-4" />
                  Rate Advocate
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-5 mt-5 border-t border-[#E2E8F0]">
              {(l.specialty || []).map((t) => (
                <span key={t} className="px-3 py-1 bg-[#F1F5F9] text-[#334155] text-xs font-bold rounded-full border border-[#E2E8F0]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Stats + fee */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-[#64748B]">Consultation Fee</p>
              <p className="text-sm font-extrabold text-[#0F172A] flex items-center justify-center gap-1 mt-1">
                <IndianRupee className="w-3.5 h-3.5 text-[#D97706]" />
                {feeText(l)}
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-[#64748B]">Experience</p>
              <p className="text-xl font-extrabold text-[#0F172A] mt-1">{l.years_experience || 0} Yrs</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-[#64748B]">Rating</p>
              <p className="text-xl font-extrabold text-[#D97706] mt-1">{l.rating_avg || 0} ★</p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm text-center">
              <p className="text-xs font-bold text-[#64748B]">Cases Handled</p>
              <p className="text-xl font-extrabold text-[#0F172A] mt-1">{l.total_cases_handled || 0}+</p>
            </div>
          </div>

          {/* About */}
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-[#0F172A] mb-2">About {name}</h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              {l.bio || `Adv. ${l.profile?.full_name || ''} is a Bar Council registered advocate. Specialization: ${(l.specialty || []).join(', ') || 'Legal consultation'}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------- Directory list ---------------------------- */
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      <AdvocateDirectoryHeader
        title="Find & Contact Verified Advocates"
        subtitle="Select an advocate for your legal case or let AI auto-assign the best match."
        badge="⚖️ Verified Directory"
        searchQuery={query}
        onSearchChange={setQuery}
        onBack={onBackToHome}
      />

      <CategoryFilterTabs categories={CATEGORIES} active={category} onChange={setCategory} />

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        {/* Results count */}
        <div className="flex items-center justify-between pb-5">
          <p className="text-xs font-bold text-[#64748B]">
            Showing{' '}
            <span className="text-[#0F172A]">{loading ? '…' : filteredAdvocates.length}</span>{' '}
            Verified Advocates in Bar Directory
          </p>
          {(query || category !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-bold text-[#D97706] hover:text-[#B45309] cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <AdvocateCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-[#FFFFFF] border border-[#FECACA] rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#0F172A]">Advocate directory load nahi ho saka</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchAdvocates}
              className="px-5 py-2.5 bg-[#0A1628] hover:bg-[#1E293B] text-white text-xs font-extrabold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Retry (पुनः प्रयास करें)
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredAdvocates.length === 0 && (
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3">
            <SearchX className="w-10 h-10 text-[#94A3B8] mx-auto" />
            <p className="text-sm font-bold text-[#0F172A]">कोई वकील नहीं मिला (No advocates found)</p>
            <p className="text-xs text-[#64748B]">Try searching with a different court, city, or practice area.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 bg-[#F1F5F9] text-[#0F172A] text-xs font-bold rounded-xl hover:bg-[#E2E8F0] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Real data grid */}
        {!loading && !error && filteredAdvocates.length > 0 && (
          <AdvocateGrid
            advocates={filteredAdvocates}
            onRequest={setRequestTarget}
            onRate={setReviewTarget}
            onProfile={openProfile}
          />
        )}
      </div>

      {/* REQUEST CONSULTATION MODAL */}
      {requestTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Request Consultation</h3>
              <button
                type="button"
                onClick={() => setRequestTarget(null)}
                className="p-1.5 hover:bg-[#F1F5F9] rounded-xl text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center gap-3">
              {requestTarget.profile_photo_url ? (
                <img
                  src={requestTarget.profile_photo_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-[#CBD5E1]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center font-extrabold border border-[#CBD5E1]">
                  {initials(requestTarget)}
                </div>
              )}
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-bold text-[#0F172A] truncate">{displayName(requestTarget)}</p>
                <p className="text-[#D97706] font-semibold truncate">{requestTarget.specialty?.[0] || 'Legal Specialist'}</p>
                <p className="text-[11px] text-[#64748B]">
                  {requestTarget.profile?.city || ''} {requestTarget.profile?.state || ''} • {feeText(requestTarget)}
                </p>
              </div>
            </div>

            {!currentUser?.userId && (
              <p className="text-[11px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
                Aap login nahi hain. Request bhejne ke liye aapko login karna hoga.
              </p>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0F172A] block">Brief Legal Issue Note (संक्षिप्त समस्या)</label>
              <textarea
                rows={2}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Apne mamle ke bare me santhshipt me likhein..."
                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#D97706] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setRequestTarget(null)}
                className="px-4 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingRequest}
                onClick={handleSendRequest}
                className={`px-6 py-2.5 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                  sendingRequest
                    ? 'bg-[#CBD5E1] text-[#64748B] cursor-wait'
                    : 'bg-[#D97706] hover:bg-[#B45309] text-[#FFFFFF] cursor-pointer'
                }`}
              >
                {sendingRequest ? 'Sending...' : 'Send Request (अनुरोध भेजें)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATE MODAL — tied to real advocate.id */}
      {reviewTarget && (
        <ReviewModal
          lawyerId={reviewTarget.id}
          lawyerName={displayName(reviewTarget)}
          citizenId={currentUser?.userId || 'guest_citizen'}
          lawyerPhotoUrl={reviewTarget.profile_photo_url || undefined}
          specialty={reviewTarget.specialty}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setToast('⭐ Dhanyawad! Aapka review safaltapoorvak darj ho gaya hai.');
            setTimeout(() => setToast(null), 4000);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] max-w-md bg-[#0A1628] text-white border-2 border-[#D97706] p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
            <span>{toast}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 hover:bg-[#1E293B] rounded-lg text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvocateDirectoryView;