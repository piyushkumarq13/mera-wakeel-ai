import type { Lawyer } from '../../types/database';

export interface CaseMatchContext {
  category?: string;
  text?: string;
  city?: string;
  state?: string;
  excludedLawyerIds?: string[];
}

export interface LawyerSuggestion {
  lawyer: Lawyer;
  score: number;
  reasons: string[];
}

const CATEGORY_SPECIALTY: Record<string, string[]> = {
  property: ['property', 'land', 'real estate', 'rera', 'registry', 'civil', 'inheritance', 'succession'],
  tenant: ['property', 'rent', 'tenant', 'landlord', 'consumer', 'civil'],
  family: ['family', 'divorce', 'matrimonial', 'custody', 'maintenance', 'civil'],
  consumer: ['consumer', 'civil', 'fraud', 'banking', 'insurance'],
  labour: ['labour', 'service', 'employment', 'workmen', 'gratuity'],
  criminal: ['criminal', 'penal', 'bail', 'cheque', 'cyber', 'fraud', 'n.i.', 'ni act'],
  civil: ['civil', 'litigation', 'contract', 'recovery', 'injunction'],
  other: [],
};

const TEXT_CATEGORY_KEYWORDS: Record<string, string[]> = {
  property: ['property', 'land', 'zameen', 'plot', 'registry', 'stamp', 'dakhil', 'kabza', 'encroach', 'builder', 'flat', 'sale', 'partition', 'rera'],
  tenant: ['kiraya', 'rent', 'tenant', 'landlord', 'makan malik', 'kirayedar', 'deposit', 'evict'],
  family: ['divorce', 'custody', 'maintenance', 'matrimonial', 'dowry', 'talaq', 'family', 'husband', 'wife', 'shadi'],
  consumer: ['consumer', 'refund', 'product', 'defective', 'fraud', 'warranty', 'insurance', 'banking'],
  labour: ['salary', 'job', 'terminat', 'resign', 'employer', 'employee', 'labor', 'labour', 'majdoori', 'pf', 'gratuity'],
  criminal: ['cheque', 'cheating', 'fraud', 'fir', 'bail', 'crime', 'criminal', 'theft', 'assault', 'cyber', 'ipc'],
  civil: ['contract', 'injunction', 'tort', 'recovery', 'dispute', 'notice'],
};

/** Infer the case category from free-text keywords (more granular than inferCaseCategory). */
export function inferMatchCategory(text?: string): string {
  const lower = (text || '').toLowerCase();
  let best = 'other';
  let bestCount = 0;
  for (const [cat, kws] of Object.entries(TEXT_CATEGORY_KEYWORDS)) {
    const count = kws.filter((k) => lower.includes(k)).length;
    if (count > bestCount) {
      bestCount = count;
      best = cat;
    }
  }
  return best;
}

export function scoreLawyerForCase(lawyer: Lawyer, ctx: CaseMatchContext): LawyerSuggestion {
  const reasons: string[] = [];
  let score = 0;

  const inferredCat = inferMatchCategory(ctx.text);
  const providedCat = String(ctx.category || '').toLowerCase();
  const cat =
    providedCat && providedCat !== 'other' && providedCat !== 'general'
      ? providedCat
      : inferredCat !== 'other'
      ? inferredCat
      : 'other';

  const specs = (lawyer.specialty || []).map((s) => s.toLowerCase());
  const specText = specs.join(' ');
  const kws = CATEGORY_SPECIALTY[cat] || [];
  const matchedKws = kws.filter((k) => specText.includes(k));

  if (kws.length === 0) {
    score += 30;
  } else if (matchedKws.length > 0) {
    score += 45;
    reasons.push(`Specialty match: ${matchedKws[0]}`);
  } else if (specs.some((s) => s.includes('general'))) {
    score += 15;
    reasons.push('General practice');
  }

  if (lawyer.is_verified || lawyer.verification_status === 'verified') {
    score += 15;
    reasons.push('Verified');
  }

  if (lawyer.available !== false) {
    score += 10;
  }

  const rating = Number(lawyer.rating_avg) || 0;
  score += Math.min(20, (rating / 5) * 20);

  const yrs = Number(lawyer.years_experience) || 0;
  score += Math.min(10, yrs * 0.4);

  const handled = Number(lawyer.total_cases_handled) || 0;
  score += Math.min(5, handled / 100);

  const lc = (lawyer.profile?.city || '').toLowerCase();
  const ls = (lawyer.profile?.state || '').toLowerCase();
  const cc = (ctx.city || '').toLowerCase();
  const cs = (ctx.state || '').toLowerCase();
  if (cc && lc && lc === cc) {
    score += 12;
    reasons.push('Same city');
  } else if (cs && ls && ls === cs) {
    score += 6;
    reasons.push('Same state');
  }

  const excluded = ctx.excludedLawyerIds || [];
  if (excluded.some((id) => id && (id === lawyer.id || id === lawyer.profile_id))) {
    score -= 1000;
    reasons.push('Previously assigned');
  }

  return { lawyer, score: Math.round(score * 100) / 100, reasons };
}

/** Rank all lawyers best-fit for a case; best match first. */
export function rankLawyersForCase(lawyers: Lawyer[], ctx: CaseMatchContext): LawyerSuggestion[] {
  return lawyers
    .map((l) => scoreLawyerForCase(l, ctx))
    .sort((a, b) => b.score - a.score);
}

/** Convenience: top N ranked lawyers for a case (defaults to 5). */
export function topLawyersForCase(lawyers: Lawyer[], ctx: CaseMatchContext, limit = 5): Lawyer[] {
  return rankLawyersForCase(lawyers, ctx)
    .slice(0, limit)
    .map((s) => s.lawyer);
}