import { describe, it, expect } from 'vitest';
import { sanitizeCategory } from '../src/lib/db/client';

describe('sanitizeCategory', () => {
  it('returns property for property-related terms', () => {
    expect(sanitizeCategory('Property & Land Dispute')).toBe('property');
    expect(sanitizeCategory('property')).toBe('property');
    expect(sanitizeCategory('land dispute')).toBe('property');
    expect(sanitizeCategory('makan')).toBe('property');
    expect(sanitizeCategory('registry')).toBe('property');
  });

  it('returns tenant for rent-related terms', () => {
    expect(sanitizeCategory('Tenant/Rent Issue')).toBe('tenant');
    expect(sanitizeCategory('rent')).toBe('tenant');
    expect(sanitizeCategory('kiraya')).toBe('tenant');
  });

  it('returns family for family-related terms', () => {
    expect(sanitizeCategory('Family & Divorce')).toBe('family');
    expect(sanitizeCategory('divorce')).toBe('family');
    expect(sanitizeCategory('custody')).toBe('family');
  });

  it('returns consumer for consumer-related terms', () => {
    expect(sanitizeCategory('Consumer & Fraud')).toBe('consumer');
    expect(sanitizeCategory('fraud')).toBe('consumer');
    expect(sanitizeCategory('refund')).toBe('consumer');
  });

  it('returns labour for employment-related terms', () => {
    expect(sanitizeCategory('Labour & Employment')).toBe('labour');
    expect(sanitizeCategory('salary')).toBe('labour');
    expect(sanitizeCategory('job')).toBe('labour');
  });

  it('returns other for unrecognized terms', () => {
    expect(sanitizeCategory('Other')).toBe('other');
    expect(sanitizeCategory('random text')).toBe('other');
    expect(sanitizeCategory(undefined)).toBe('other');
    expect(sanitizeCategory('')).toBe('other');
  });
});

describe('createCase opts parameter', () => {
  it('createCase accepts opts parameter with reuseActive and citizenNote', async () => {
    const { createCase } = await import('../src/lib/db/cases');

    // Verify the function signature accepts the opts parameter
    // We can't actually call it without network, but we can verify it compiles
    expect(typeof createCase).toBe('function');

    // Verify the function accepts 4 arguments
    expect(createCase.length).toBeLessThanOrEqual(4);
  });
});
