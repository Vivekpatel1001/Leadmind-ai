export interface ScoreBreakdown {
  location: number;
  industry: number;
  relevance: number;
  data_quality: number;
  other: number;
  total: number;
  query_fit?: number;
}

export interface LeadProvenance {
  source: string;
  url?: string;
}

export interface Lead {
  id: string;
  user_id: string;
  business_name: string;
  company_name?: string; // Compatibility alias
  industry?: string;
  business_type?: string;
  country?: string;
  city?: string;
  region?: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  social_links?: Record<string, string>;
  description?: string;
  source: string;
  source_url?: string;
  provenance?: LeadProvenance[];
  sources_count: number;
  verified: boolean;
  qualification: 'HIGH' | 'MEDIUM' | 'LOW';
  qualification_reasons: string[];
  pain_points?: string[]; // Qualification reasons alias
  lead_score: number;
  score?: number; // Normalized score alias
  score_breakdown: ScoreBreakdown;
  search_ids: string[];
  tags: string[];
  notes: string;
  saved: boolean;
  status: 'new' | 'contacted' | 'irrelevant' | 'converted';
  crm_stage?: 'Discovered' | 'Enriched' | 'Pitched' | 'Discussion' | 'Won' | 'Lost';
  decision_makers?: DecisionMaker[];
  pitches?: PitchPackage;
  outreach_logs?: OutreachLogItem[];
  duplicate_status: string;
  created_at: string;
  updated_at: string;
  last_seen: string;
}

export interface DecisionMaker {
  name: string;
  title: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  confidence: number;
  source: string;
}

export interface PitchPackage {
  lead_id?: string;
  business_name: string;
  subject_lines: string[];
  email_body: string;
  follow_up_day3: string;
  follow_up_day7: string;
  linkedin_note: string;
  value_proposition: string;
  call_to_action: string;
  tone: string;
}

export interface OutreachLogItem {
  channel: string;
  timestamp: string;
  subject?: string;
  message: string;
  recipient?: string;
  status: string;
}

export interface PipelineSummary {
  total_leads: number;
  stage_counts: Record<string, number>;
  high_priority_count: number;
  conversion_rate: number;
}

export interface SearchRequirements {
  country?: string;
  city?: string;
  region?: string;
  industry?: string;
  business_type?: string;
  service?: string;
  company_size?: string;
  lead_count: number;
  exclusions: string[];
  must_have_email: boolean;
  must_have_phone: boolean;
  must_have_website: boolean;
  new_leads_only: boolean;
  clarification_needed?: string;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  parsed_requirements: SearchRequirements;
  total_found: number;
  high_match_count: number;
  medium_match_count: number;
  low_match_count: number;
  excluded_previous: boolean;
  execution_time_seconds: number;
  created_at: string;
}

export interface UserPreference {
  id: string;
  category: string;
  key: string;
  frequency: number;
  value: Record<string, any>;
  updated_at: string;
}

export interface AgentStepEvent {
  step: 'understanding' | 'planning' | 'researching' | 'deduplicating' | 'qualifying' | 'scoring' | 'memory_check' | 'memory_recall' | 'complete' | 'error';
  title: string;
  message: string;
  progress: number;
  data?: any;
}

export interface CallDialogueTurn {
  speaker: 'ai' | 'prospect' | 'system';
  text: string;
  sentiment: 'neutral' | 'interested' | 'skeptical' | 'objection' | 'positive' | 'forwarded';
  timestamp: string;
}

export interface CallSessionResponse {
  call_id: string;
  lead_id?: string;
  status: string;
  prospect_name: string;
  prospect_title: string;
  dialogue_turns: CallDialogueTurn[];
  sentiment_score: number;
  objection_detected?: string;
  objection_handled?: string;
  forward_status: string;
  forward_target_number?: string;
  call_summary: string;
  crm_stage_updated: string;
  duration_seconds: number;
  real_call_dispatched?: boolean;
  twilio_call_sid?: string;
  telecom_carrier_notice?: string;
}

export interface EmailFollowUpItem {
  stage: number;
  day_offset: number;
  title: string;
  subject: string;
  body: string;
  status: 'scheduled' | 'sent' | 'opened' | 'cancelled';
  scheduled_for: string;
}

export interface EmailCampaignDraft {
  draft_id: string;
  lead_id: string;
  to_email: string;
  to_name: string;
  from_name: string;
  from_email: string;
  subject_line: string;
  alternative_subjects: string[];
  body: string;
  cta_text: string;
  cta_url?: string;
  follow_ups: EmailFollowUpItem[];
  created_at: string;
  requires_user_approval: boolean;
}

export interface EmailDispatchResult {
  success: boolean;
  message_id: string;
  lead_id: string;
  status: string;
  dispatched_at: string;
  active_followup_count: number;
  next_followup_date?: string;
  crm_stage: string;
}

export interface DashboardMetrics {
  total_leads: number;
  saved_leads: number;
  total_searches: number;
  new_leads_this_week: number;
  high_match_count: number;
  medium_match_count: number;
  low_match_count: number;
  recent_searches: SearchHistoryItem[];
  recent_leads: Lead[];
  top_industries: { industry: string; count: number }[];
  top_locations: { location: string; count: number }[];
}

export type ActiveTab = 'dashboard' | 'find-leads' | 'my-leads' | 'crm-pipeline' | 'saved-leads' | 'history' | 'search-results' | 'memory' | 'settings';
