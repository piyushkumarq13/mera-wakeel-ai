export const CONNECTION_STATUS_COLORS: Record<string, string> = {
  requested: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  accepted: 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]',
  rejected: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  completed: 'bg-[#F0F9FF] text-[#1E40AF] border-[#BAE6FD]',
};

export const CONNECTION_STATUS_LABELS: Record<string, string> = {
  requested: 'Pending',
  accepted: 'Accepted',
  rejected: 'Declined',
  completed: 'Completed',
};
