import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  ArrowRight, 
  X, 
  Edit3, 
  AlertCircle, 
  Flame, 
  Building2, 
  User, 
  ChevronRight,
  Bot
} from 'lucide-react';
import { Lead, EmailCampaignDraft, EmailDispatchResult } from '../../types';
import { api } from '../../services/api';

interface EmailApprovalModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => void;
}

export function EmailApprovalModal({ lead, isOpen, onClose, onLeadUpdated }: EmailApprovalModalProps) {
  if (!isOpen || !lead) return null;

  const [step, setStep] = useState<'generate' | 'review' | 'sent'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState<EmailCampaignDraft | null>(null);
  const [dispatchResult, setDispatchResult] = useState<EmailDispatchResult | null>(null);

  // Business Parameters
  const businessName = lead.business_name || lead.company_name || 'Business';
  const companySlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company';
  
  const [senderCompany, setSenderCompany] = useState('Apex Design Studio');
  const [senderName, setSenderName] = useState('Vikram Patel');
  const [senderEmail, setSenderEmail] = useState('vikram@apex-growth.com');
  const [serviceOffered, setServiceOffered] = useState('Graphic Design & Brand Revamp');
  const [valueHook, setValueHook] = useState(
    `We noticed ${businessName}'s high reputation and put together a bespoke design concept preview that helps convert 35% more inbound customers.`
  );
  const [meetingLink, setMeetingLink] = useState('https://calendly.com/apex-growth/15min');

  // Editable Draft fields
  const [selectedSubject, setSelectedSubject] = useState('');
  const [editableBody, setEditableBody] = useState('');
  const [autoFollowUpEnabled, setAutoFollowUpEnabled] = useState(true);

  // Generate Draft
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      const generated = await api.generateEmailDraft({
        lead_id: lead.id,
        business_name: businessName,
        recipient_email: lead.email && lead.email !== 'Not found' ? lead.email : `contact@${companySlug}.co.uk`,
        decision_maker_name: 'Managing Director / Owner',
        sender_name: senderName,
        sender_company: senderCompany,
        sender_email: senderEmail,
        service_offered: serviceOffered,
        value_hook: valueHook,
        meeting_link: meetingLink
      });

      setDraft(generated);
      setSelectedSubject(generated.subject_line);
      setEditableBody(generated.body);
      setStep('review');
    } catch (e) {
      console.error('Draft generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isOpen && lead) {
      handleGenerateDraft();
    }
  }, [isOpen, lead]);

  // User Approval & Dispatch
  const handleApproveAndSend = async () => {
    if (!draft) return;
    setIsSending(true);

    try {
      const result = await api.sendApprovedEmail({
        lead_id: lead.id,
        draft_id: draft.draft_id,
        approved_subject: selectedSubject,
        approved_body: editableBody,
        enable_auto_followup: autoFollowUpEnabled,
        user_permission_granted: true
      });

      setDispatchResult(result);
      setStep('sent');

      onLeadUpdated({
        ...lead,
        crm_stage: 'Pitched',
        status: 'contacted'
      });
    } catch (e) {
      console.error('Email dispatch failed:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white border border-[#DDDCD7] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEEE9] bg-[#F7F6F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7657FF] text-white flex items-center justify-center shadow-md shadow-[#7657FF]/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#171717] tracking-tight">AI Email Approval & Dispatcher</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/20">
                  Agent 12
                </span>
              </div>
              <p className="text-xs text-[#6F6D68]">
                Human-in-the-loop email generation: reviews draft, requests your permission, and schedules follow-ups.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-[#6F6D68] hover:text-[#171717] rounded-xl hover:bg-[#EFEEE9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Target Lead Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#171717] text-sm">{businessName}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white text-[#3157FF] border border-[#DDDCD7] font-semibold">
                  {lead.city || lead.country || 'Target Prospect'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#3157FF]/10 text-[#3157FF] font-bold">
                  Score: {lead.lead_score ?? lead.score ?? 0}%
                </span>
              </div>
              <div className="text-xs text-[#6F6D68] flex items-center gap-3">
                <span>✉️ Recipient: {lead.email && lead.email !== 'Not found' ? lead.email : `contact@${companySlug}.co.uk`}</span>
                <span>👤 Contact: Managing Director / Owner</span>
              </div>
            </div>
          </div>

          {/* DRAFT REVIEW STATE */}
          {step === 'review' && draft && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Subject Line Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#3157FF]" />
                  <span>Choose High-Converting Subject Line</span>
                </label>
                <div className="space-y-1.5">
                  {[draft.subject_line, ...draft.alternative_subjects].map((subj, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSubject(subj)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        selectedSubject === subj 
                          ? 'bg-[#3157FF]/10 border-[#3157FF] text-[#171717] font-bold shadow-xs' 
                          : 'bg-[#F7F6F2] border-[#DDDCD7] text-[#6F6D68] hover:bg-white hover:text-[#171717]'
                      }`}
                    >
                      <span>{subj}</span>
                      {selectedSubject === subj ? (
                        <CheckCircle2 className="w-4 h-4 text-[#3157FF] shrink-0" />
                      ) : (
                        <span className="text-[10px] text-[#9E9C96] font-mono">Option {idx + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Email Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-[#7657FF]" />
                    <span>Personalized Cold Email Draft (Editable)</span>
                  </label>
                  <span className="text-[11px] text-[#6F6D68]">
                    From: <strong className="text-[#171717]">{senderName} ({senderEmail})</strong>
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-4 text-xs text-[#171717] font-mono leading-relaxed focus:outline-none focus:border-[#3157FF] transition-all resize-none shadow-xs"
                />
              </div>

              {/* Automated Follow-Up Sequence Roadmap */}
              <div className="border border-[#DDDCD7] rounded-2xl p-5 bg-[#F7F6F2] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF6B5F]" />
                    <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">3-Stage Follow-Up Sequence</span>
                  </div>
                  
                  {/* Auto-Followup Switch */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoFollowUpEnabled}
                      onChange={(e) => setAutoFollowUpEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-[#3157FF] focus:ring-0 border-[#DDDCD7]"
                    />
                    <span className="text-xs font-semibold text-[#171717]">
                      Enable Autopilot Follow-Ups
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {draft.follow_ups.map((f, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#3157FF]">Day +{f.day_offset}</span>
                        <span className="text-[#6F6D68] font-mono text-[10px]">{f.title}</span>
                      </div>
                      <p className="text-[11px] text-[#6F6D68] line-clamp-2">
                        {f.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Human Permission Warning Banner */}
              <div className="p-4 rounded-2xl bg-[#3157FF]/5 border border-[#3157FF]/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#3157FF] shrink-0 mt-0.5" />
                <div className="text-xs text-[#171717] space-y-0.5">
                  <span className="font-bold block">Human Consent Guarantee</span>
                  <p className="text-[#6F6D68]">
                    The email will only be dispatched when you click <strong>"Approve & Send to Client"</strong>. No messages are sent automatically without your explicit consent.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* DISPATCHED SUCCESS STATE */}
          {step === 'sent' && dispatchResult && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-8 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#3157FF]/10 text-[#3157FF] mx-auto flex items-center justify-center border border-[#3157FF]/30 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                
                <div>
                  <h4 className="text-lg font-black text-[#171717]">Email Successfully Dispatched!</h4>
                  <p className="text-xs text-[#6F6D68] mt-1 max-w-md mx-auto">
                    Your personalized pitch has been sent to <strong>{lead.company_name}</strong>. CRM stage updated to <strong className="text-[#3157FF] font-semibold">Pitched</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                  <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] text-xs">
                    <span className="text-[10px] text-[#6F6D68] uppercase tracking-wider block">Status</span>
                    <span className="text-[#3157FF] font-bold text-sm mt-0.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3157FF] animate-ping" />
                      Delivered (Tracking Active)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] text-xs">
                    <span className="text-[10px] text-[#6F6D68] uppercase tracking-wider block">Autopilot Sequence</span>
                    <span className="text-[#171717] font-bold text-sm mt-0.5">
                      {autoFollowUpEnabled ? '3 Follow-ups Queued' : 'Manual Follow-up'}
                    </span>
                  </div>
                </div>

                {autoFollowUpEnabled && dispatchResult.next_followup_date && (
                  <div className="text-xs text-[#6F6D68] bg-white border border-[#DDDCD7] p-3 rounded-xl max-w-md mx-auto">
                    📅 First follow-up nudge scheduled for <strong className="text-[#171717]">{dispatchResult.next_followup_date}</strong>.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#EFEEE9] bg-[#F7F6F2] flex items-center justify-between">
          <div className="text-xs text-[#6F6D68]">
            {step === 'review' && 'Review draft wording. Click Approve to dispatch.'}
            {step === 'sent' && 'Outreach logged in CRM.'}
          </div>

          <div className="flex items-center gap-3">
            {step === 'review' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#6F6D68] font-medium text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Cancel / Reject
                </button>

                <button
                  onClick={handleApproveAndSend}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Dispatching Email...' : 'Approve & Send to Client'}</span>
                </button>
              </>
            )}

            {step === 'sent' && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#3157FF] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
