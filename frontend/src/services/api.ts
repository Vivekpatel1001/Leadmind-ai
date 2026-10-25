import { Lead, DashboardMetrics, SearchHistoryItem, UserPreference, SearchRequirements } from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/metrics`);
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    return res.json();
  },

  // Leads
  async getLeads(params: Record<string, any> = {}): Promise<{ total: number; leads: Lead[]; limit: number; offset: number }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const res = await fetch(`${API_BASE}/leads?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  async getLead(id: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${id}`);
    if (!res.ok) throw new Error('Failed to fetch lead');
    return res.json();
  },

  async toggleSaveLead(id: string, saved?: boolean): Promise<{ id: string; saved: boolean }> {
    const res = await fetch(`${API_BASE}/leads/${id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved !== undefined ? { saved } : {})
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
  },

  async updateLeadNotes(id: string, notes: string): Promise<{ id: string; notes: string }> {
    const res = await fetch(`${API_BASE}/leads/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error('Failed to update notes');
    return res.json();
  },

  async updateLeadTags(id: string, tags: string[]): Promise<{ id: string; tags: string[] }> {
    const res = await fetch(`${API_BASE}/leads/${id}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags })
    });
    if (!res.ok) throw new Error('Failed to update tags');
    return res.json();
  },

  async updateLeadStatus(id: string, status: string): Promise<{ id: string; status: string }> {
    const res = await fetch(`${API_BASE}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async deleteLead(id: string): Promise<{ status: string; deleted_id: string }> {
    const res = await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete lead');
    return res.json();
  },

  async bulkAction(lead_ids: string[], action: string, extra: Record<string, any> = {}): Promise<{ affected: number }> {
    const res = await fetch(`${API_BASE}/leads/bulk-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids, action, ...extra })
    });
    if (!res.ok) throw new Error('Bulk action failed');
    return res.json();
  },

  // Search
  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    const res = await fetch(`${API_BASE}/search/history`);
    if (!res.ok) throw new Error('Failed to fetch search history');
    return res.json();
  },

  async getSearchById(id: string): Promise<{ search: SearchHistoryItem; leads: Lead[] }> {
    const res = await fetch(`${API_BASE}/search/${id}`);
    if (!res.ok) throw new Error('Failed to fetch search');
    return res.json();
  },

  // Memory
  async getMemoryProfile(): Promise<{ top_countries: string[]; top_industries: string[]; top_services: string[]; preferences_list: UserPreference[] }> {
    const res = await fetch(`${API_BASE}/memory`);
    if (!res.ok) throw new Error('Failed to fetch memory profile');
    return res.json();
  },

  async queryMemory(query: string): Promise<{ answer: string; intent: string; matched_leads: Lead[]; matched_searches: any[]; matched_preferences: any[] }> {
    const res = await fetch(`${API_BASE}/memory/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error('Failed to query memory');
    return res.json();
  },

  async deleteMemoryPreference(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/memory/preference/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete preference');
  },

  // Export
  async exportCSV(leadIds: string[] = []): Promise<Blob> {
    const res = await fetch(`${API_BASE}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: leadIds })
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },

  // Settings
  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  // Outreach & CRM Agents (Agents 7, 8, 9, 10)
  async generatePitch(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/pitch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate pitch');
    return res.json();
  },

  async enrichLead(leadId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/enrich/${leadId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to enrich lead');
    return res.json();
  },

  async updateCrmStage(leadId: string, stage: string, notes?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, stage, notes })
    });
    if (!res.ok) throw new Error('Failed to update CRM stage');
    return res.json();
  },

  async getPipelineSummary(): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/pipeline/summary`);
    if (!res.ok) throw new Error('Failed to fetch pipeline summary');
    return res.json();
  },

  async dispatchOutreach(leadId: string, channel: string, message: string, subject?: string, recipient?: string): Promise<any> {
    const params = new URLSearchParams({
      lead_id: leadId,
      channel,
      message,
      ...(subject ? { subject } : {}),
      ...(recipient ? { recipient } : {})
    });
    const res = await fetch(`${API_BASE}/outreach/dispatch?${params.toString()}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to dispatch outreach');
    return res.json();
  },

  // Agent 11: AI Voice Calling & Warm Forwarding
  async getTwilioStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/twilio/status`);
    if (!res.ok) throw new Error('Failed to fetch Twilio status');
    return res.json();
  },

  async initiateVoiceCall(payload: {
    lead_id?: string;
    lead_company: string;
    lead_phone?: string;
    lead_name?: string;
    lead_role?: string;
    sender_company: string;
    sender_name: string;
    sender_phone: string;
    service_offered: string;
    value_proposition: string;
    call_goal?: string;
    make_real_call?: boolean;
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_from_phone?: string;
    twilio_webhook_url?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/call/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to initiate voice call');
    return res.json();
  },

  async interactVoiceTurn(payload: {
    user_speech: string;
    company_name: string;
    prospect_name?: string;
    sender_company?: string;
    sender_name?: string;
    service_offered?: string;
    value_proposition?: string;
    conversation_history?: Array<{ speaker: string; text: string }>;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/call/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to process live voice turn');
    return res.json();
  },

  async getLiveCallTranscript(identifier?: string): Promise<any> {
    const param = identifier ? `?identifier=${encodeURIComponent(identifier)}` : '';
    const res = await fetch(`${API_BASE}/outreach/voice/live-transcript${param}`);
    if (!res.ok) throw new Error('Failed to fetch live transcript');
    return res.json();
  },

  // Agent 12: AI Email Draft & Follow-up Engine
  async generateEmailDraft(payload: {
    lead_id: string;
    business_name: string;
    recipient_email?: string;
    decision_maker_name?: string;
    sender_name: string;
    sender_company: string;
    sender_email: string;
    service_offered: string;
    value_hook: string;
    meeting_link?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/email/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to generate email draft');
    return res.json();
  },

  async sendApprovedEmail(payload: {
    lead_id: string;
    draft_id: string;
    approved_subject: string;
    approved_body: string;
    enable_auto_followup: boolean;
    user_permission_granted: boolean;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to dispatch approved email');
    return res.json();
  },

  async getLeadActivities(leadId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/outreach/lead/${leadId}/activities`);
    if (!res.ok) throw new Error('Failed to fetch lead activities');
    return res.json();
  }
};
