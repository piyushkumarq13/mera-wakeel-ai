import { describe, it, expect } from 'vitest';
import {
  inferMatchCategory,
  scoreLawyerForCase,
  rankLawyersForCase,
  topLawyersForCase,
} from '../src/lib/db/lawyerMatch';
import type { Lawyer } from '../src/types/database';

function makeLawyer(overrides: Partial<Lawyer> & { id: string; specialty: string[] }): Lawyer {
  return {
    id: overrides.id,
    profile_id: `${overrides.id}-profile`,
    specialty: overrides.specialty,
    years_experience: 5,
    bar_council_number: null,
    bar_council_state: null,
    verification_status: 'verified',
    verified_at: null,
    is_verified: true,
    bio: null,
    consultation_fee_range: '₹1,500',
    rating_avg: 4.5,
    total_cases_handled: 20,
    available: true,
    profile_photo_url: null,
    ...overrides,
  };
}

describe('inferMatchCategory', () => {
  it('detects criminal/cheque-bounce matters', () => {
    expect(inferMatchCategory('cheque bounce, FIR against me')).toBe('criminal');
  });

  it('detects property matters', () => {
    expect(inferMatchCategory('zameen kabza property dispute')).toBe('property');
  });

  it('detects family matters', () => {
    expect(inferMatchCategory('divorce aur maintenance')).toBe('family');
  });

  it('defaults to other when nothing matches', () => {
    expect(inferMatchCategory('hello world')).toBe('other');
  });
});

describe('scoreLawyerForCase', () => {
  it('ranks a matching-specialty lawyer above a non-matching one', () => {
    const propertyLawyer = makeLawyer({ id: 'p1', specialty: ['Property Law', 'Land Disputes'] });
    const familyLawyer = makeLawyer({ id: 'f1', specialty: ['Family Law', 'Divorce'] });

    const pScore = scoreLawyerForCase(propertyLawyer, { category: 'property', text: 'zameen plot property' });
    const fScore = scoreLawyerForCase(familyLawyer, { category: 'property', text: 'zameen plot property' });

    expect(pScore.score).toBeGreaterThan(fScore.score);
  });

  it('penalizes a previously assigned lawyer', () => {
    const lawyer = makeLawyer({ id: 'l1', specialty: ['Property Law'] });
    const fresh = scoreLawyerForCase(lawyer, { category: 'property', text: 'property' });
    const reused = scoreLawyerForCase(lawyer, { category: 'property', text: 'property', excludedLawyerIds: ['l1'] });
    expect(fresh.score).toBeGreaterThan(reused.score);
  });

  it('rewards verified, high-rated, experienced lawyers', () => {
    const juniorUnverified = makeLawyer({
      id: 'a',
      specialty: ['Property Law'],
      years_experience: 1,
      rating_avg: 3.0,
      is_verified: false,
      verification_status: 'pending',
    });
    const seniorVerified = makeLawyer({
      id: 'b',
      specialty: ['Property Law'],
      years_experience: 20,
      rating_avg: 5.0,
      is_verified: true,
      verification_status: 'verified',
    });
    const juniorUnverifiedScore = scoreLawyerForCase(juniorUnverified, { category: 'property', text: 'property' });
    const seniorVerifiedScore = scoreLawyerForCase(seniorVerified, { category: 'property', text: 'property' });
    expect(seniorVerifiedScore.score).toBeGreaterThan(juniorUnverifiedScore.score);
  });
});

describe('rankLawyersForCase / topLawyersForCase', () => {
  const lawyers = [
    makeLawyer({ id: '1', specialty: ['Property Law'] }),
    makeLawyer({ id: '2', specialty: ['Family Law'] }),
    makeLawyer({ id: '3', specialty: ['Criminal Law'] }),
    makeLawyer({ id: '4', specialty: ['Labour Law'] }),
    makeLawyer({ id: '5', specialty: ['Consumer Law'] }),
    makeLawyer({ id: '6', specialty: ['Civil Litigation'] }),
  ];

  it('returns the best property lawyers first for a property case', () => {
    const ranked = rankLawyersForCase(lawyers, { category: 'property', text: 'zameen land property' });
    expect(ranked[0].lawyer.id).toBe('1');
    expect(ranked[0].reasons.join(' ').toLowerCase()).toContain('specialty');
  });

  it('returns up to 5 lawyers', () => {
    const top = topLawyersForCase(lawyers, { category: 'property', text: 'property' }, 5);
    expect(top.length).toBe(5);
  });

  it('does not return the previously assigned lawyer in the top set', () => {
    const ranked = rankLawyersForCase(lawyers, { category: 'property', text: 'property', excludedLawyerIds: ['1'] });
    expect(ranked[0].lawyer.id).not.toBe('1');
  });
});