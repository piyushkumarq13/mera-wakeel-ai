export type PreferredLanguage = 'hindi' | 'english' | 'hinglish' | 'tamil' | 'telugu' | 'marathi' | 'bengali' | 'kannada' | 'gujarati' | 'malayalam' | 'punjabi' | 'odia' | 'urdu';
export type UserType = 'citizen' | 'lawyer' | 'admin';
export type CaseCategory = 'property' | 'tenant' | 'family' | 'consumer' | 'labour' | 'other';
export type CaseStatus = 'ongoing' | 'assessed' | 'closed' | 'resolved' | 'lawyer_connected';
export type AIVerdict = 'user_correct' | 'user_incorrect' | 'needs_more_info';
export type MessageSenderType = 'user' | 'ai';
export type MessageType = 'text' | 'voice' | 'document_reference';
export type DocumentType = 'stamp_paper' | 'will' | 'registry' | 'sale_deed' | 'power_of_attorney' | 'affidavit' | 'contract' | 'court_notice' | 'lease_agreement' | 'legal_notice' | 'other' | 'unknown';
export type EvidencePriority = 'critical' | 'helpful' | 'optional';
export type ConnectionStatus = 'requested' | 'accepted' | 'rejected' | 'completed';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type DeadlineType = 'hearing' | 'filing' | 'response';
export type ReportStatus = 'DRAFT' | 'AI_GENERATING' | 'READY' | 'REQUEST_SENT' | 'LAWYER_VIEWED_BRIEF' | 'ACCEPTED' | 'DECLINED' | 'FULL_REPORT_UNLOCKED' | 'UPDATED';
export type LawyerRequestStatus = 'none' | 'pending' | 'accepted' | 'declined';

export interface Profile {
  id: string; // references auth.users(id)
  full_name: string | null;
  phone: string | null;
  user_type: UserType;
  preferred_language: PreferredLanguage;
  city: string | null;
  state: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Lawyer {
  id: string;
  profile_id: string;
  is_seed?: boolean;
  specialty: string[];
  years_experience: number;
  bar_council_number: string | null;
  bar_council_state: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  is_verified: boolean;
  bio: string | null;
  consultation_fee_range: string | null;
  rating_avg: number;
  total_cases_handled: number;
  available: boolean;
  profile_photo_url: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined profile object if fetched with join
  profile?: Profile;

  // Populated by the server directory endpoint (item 3) for trust badges.
  review_count?: number;
}

export interface Case {
  id: string;
  citizen_id: string;
  title: string | null;
  category: CaseCategory | null;
  status: CaseStatus;
  ai_verdict: AIVerdict | null;
  ai_summary: string | null;
  confidence_score: number | null;
  assigned_lawyer_id: string | null;
  citizen_note?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined lawyer
  assigned_lawyer?: Lawyer;
}

export interface Message {
  id: string;
  case_id: string;
  sender_type: MessageSenderType;
  content: string;
  message_type: MessageType;
  language?: PreferredLanguageOverlay | null;
  created_at?: string;
}

/** Flexible language field overlay accepting both short codes and long codes. */
export type PreferredLanguageOverlay = string;

export interface Document {
  id: string;
  case_id: string;
  file_url: string;
  document_type: DocumentType | null;
  ai_extracted_text: string | null;
  ai_analysis: string | null;
  is_verified_valid: boolean | null;
  uploaded_at?: string;
}

export interface CaseEvidence {
  id: string;
  case_id: string;
  evidence_description: string;
  is_available: boolean;
  priority: EvidencePriority;
}

export interface LawyerConnection {
  id: string;
  case_id: string;
  citizen_id: string;
  lawyer_id: string;
  status: ConnectionStatus;
  request_note?: string | null;
  requested_at?: string;

  // Joined fields
  lawyer?: Lawyer;
  case?: Case;
  citizen_profile?: Profile;
}

export interface Review {
  id: string;
  lawyer_id: string;
  citizen_id: string;
  rating: number;
  review_text: string | null;
  created_at?: string;
}

export interface CaseFact {
  id: string;
  case_id: string;
  fact_key: string;
  fact_value: string;
  updated_at?: string;
}

export interface ProfileFact {
  id: string;
  profile_id: string;
  fact_key: string;
  fact_value: string;
  updated_at?: string;
}

export interface LegalKnowledgeBase {
  id: string;
  act_name: string;
  section_number: string | null;
  content: string;
  embedding?: number[];
  category: CaseCategory | null;
}

export interface CaseDeadline {
  id: string;
  case_id: string;
  citizen_id: string;
  deadline_type: DeadlineType;
  due_date: string;
  notes: string | null;
  reminder_sent: boolean;
  created_at?: string;

  // Joined case for display
  case?: Case;
}

export interface GeneratedDocument {
  id: string;
  citizen_id: string;
  template_key: string;
  title: string;
  content: string | null;
  file_url: string | null;
  model: string | null;
  created_at?: string;
}

export interface AnalyticsEvent {
  id?: number;
  event_name: string;
  user_id?: string | null;
  payload?: Record<string, any> | null;
  created_at?: string;
}

export interface TrustStats {
  total_consultations: number;
  resolved_cases: number;
  verified_lawyers: number;
  avg_rating: number;
}

export interface CaseSummary {
  id: string;
  case_id: string;
  version: number;

  case_title: string | null;
  case_category: string | null;
  case_sub_category: string | null;
  incident_date: string | null;
  location: string | null;

  complainant_name: string | null;
  complainant_role: string | null;
  complainant_details: string | null;
  opposite_party_name: string | null;
  opposite_party_role: string | null;
  opposite_party_details: string | null;
  relationship_between_parties: string | null;

  executive_summary: string | null;
  key_facts: string[];
  disputed_facts: string[];

  documents_list: string[];
  evidence_list: string[];
  witnesses: string[];

  applicable_laws: Array<{ law: string; section: string; relevance: string; citation?: string }>;
  legal_questions: string[];
  ai_analysis: string | null;
  ai_reasoning: string | null;

  case_strength_score: number | null;
  score_reasoning: string | null;
  positive_factors: string[];
  uncertain_factors: string[];

  actions_already_taken: string[];
  recommended_next_steps: string[];
  case_timeline: Array<{ date: string; event: string; source?: string }>;

  missing_information: string[];
  questions_for_lawyer: string[];

  report_id: string | null;
  report_status: ReportStatus;
  short_brief: string | null;

  assigned_lawyer_id: string | null;
  assigned_lawyer_name: string | null;
  lawyer_accepted_at: string | null;
  lawyer_request_status: LawyerRequestStatus;

  ai_generated_at: string | null;
  ai_last_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LawyerNote {
  id: string;
  case_id: string;
  lawyer_id: string;
  notes: string | null;
  legal_strategy: string | null;
  client_instructions: string | null;
  next_hearing: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}
