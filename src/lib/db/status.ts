import type { ConnectionStatus, CaseStatus } from '../../types/database';

/**
 * Canonical DB statuses are:
 *   lawyer_connections.status: 'requested' | 'accepted' | 'rejected' | 'completed'
 *   cases.status:             'ongoing' | 'assessed' | 'closed' | 'resolved' | 'lawyer_connected'
 *
 * Older client builds wrote legacy spellings ('pending', 'declined', 'approved',
 * 'lawyer_connected') directly. These helpers map every legacy value to its
 * canonical form so both old rows and new rows behave identically on read and write.
 */

export function normalizeConnectionStatus(status?: string | null): ConnectionStatus {
  if (!status) return 'requested';
  const s = String(status).toLowerCase().trim();
  if (s === 'accepted' || s === 'approved' || s === 'lawyer_connected') return 'accepted';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (s === 'completed') return 'completed';
  return 'requested';
}

export function normalizeCaseStatus(status?: string | null): CaseStatus {
  if (!status) return 'ongoing';
  const s = String(status).toLowerCase().trim();
  if (s === 'lawyer_connected' || s === 'accepted' || s === 'approved') return 'lawyer_connected';
  if (s === 'resolved') return 'resolved';
  if (s === 'closed') return 'closed';
  if (s === 'assessed') return 'assessed';
  return 'ongoing';
}

export function isConnectionAccepted(status?: string | null): boolean {
  const s = normalizeConnectionStatus(status);
  return s === 'accepted' || s === 'completed';
}

export function isConnectionPending(status?: string | null): boolean {
  return normalizeConnectionStatus(status) === 'requested';
}

export function isConnectionRejected(status?: string | null): boolean {
  return normalizeConnectionStatus(status) === 'rejected';
}

export function isCaseLawyerAllocated(status?: string | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'lawyer_connected' || s === 'accepted' || s === 'approved';
}

/**
 * Deduplicate connection rows keyed by (lawyer_id, case_id) — the same citizen can
 * surface under multiple id spellings (guest uuid vs resolved profile uuid vs legacy
 * seed id). Keeps the first row unless a later row is 'accepted' and the first is not.
 */
export function dedupeConnections<T extends { lawyer_id: string; case_id: string; status?: string | null }>(
  rows: T[]
): T[] {
  const seen = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.lawyer_id}::${row.case_id}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, row);
    } else if (normalizeConnectionStatus(row.status) === 'accepted' && normalizeConnectionStatus(existing.status) !== 'accepted') {
      seen.set(key, row);
    }
  }
  return Array.from(seen.values());
}