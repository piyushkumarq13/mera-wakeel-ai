export type Language = 'hi' | 'en' | 'hinglish' | 'ta' | 'te' | 'mr' | 'bn' | 'kn' | 'gu' | 'ml' | 'pa' | 'or' | 'ur';

export type UserRole = 'citizen' | 'lawyer' | 'admin';

export type NavTab = 'home' | 'how-it-works' | 'for-lawyers' | 'my-cases' | 'chat' | 'call' | 'lawyers' | 'advocates' | 'documents' | 'settings' | 'auth' | 'register' | 'privacy' | 'terms' | 'draft-documents' | 'free-legal-aid' | 'admin' | 'knowledge-base' | 'support' | 'messages' | 'case-report';

export interface TrustStat {
  label: string;
  value: string;
  subtext: string;
}

export interface StepItem {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

export interface SlideData {
  id: string | number;
  title: string;
  category?: string;
  subtitle?: string;
  headline?: string;
  content?: any;
  [key: string]: any;
}

export interface DeckMetadata {
  title: string;
  subtitle?: string;
}

export interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp?: string;
  isFallback?: boolean;
}

export interface DemoCaseResult {
  id: string;
  title: string;
  status: string;
}

export interface AppNotification {
  id: string;
  type: 'connection_accepted' | 'connection_declined' | 'new_request'
      | 'new_message' | 'deadline_soon';
  message: string;
  icon: string;
  is_read: boolean;
  linkTab?: NavTab;
  created_at: string;
  timeAgo: string;
}

