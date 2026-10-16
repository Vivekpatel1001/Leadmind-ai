import React, { useState, useEffect } from 'react';
import { Lead, DecisionMaker, PitchPackage } from '../../types';
import { api } from '../../services/api';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  Zap, 
  Users, 
  Mail, 
  Share2, 
  Calendar,
  ExternalLink,
  ShieldCheck,
  Building2,
  MapPin
} from 'lucide-react';

interface PitchModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

export const PitchModal: React.FC<PitchModalProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadUpdated
}) => {
  if (!isOpen || !lead) return null;

  const [activeTab, setActiveTab] = useState<'email' | 'decision_makers' | 'linkedin' | 'sequence'>('email');
  const [tone, setTone] = useState<string>('value_first');
  const [offerService, setOfferService] = useState<string>('Graphic Design & Brand Revamp');
  const [senderName, setSenderName] = useState<string>('Sales Director');
  const [senderCompany, setSenderCompany] = useState<string>('Apex Studio');
  
  const [pitch, setPitch] = useState<PitchPackage | null>(lead.pitches || null);
  const [decisionMakers, setDecisionMakers] = useState<DecisionMaker[]>(lead.decision_makers || []);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>(lead.crm_stage || 'Discovered');
  const [isUpdatingStage, setIsUpdatingStage] = useState<boolean>(false);

  useEffect(() => {
    if (lead) {
      setPitch(lead.pitches || null);
      setDecisionMakers(lead.decision_makers || []);
      setCurrentStage(lead.crm_stage || 'Discovered');
      
      if (!lead.pitches) {
        handleGeneratePitch();
      }
      if (!lead.decision_makers || lead.decision_makers.length === 0) {
        handleEnrichContacts();
      }
    }
  }, [lead?.id]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleGeneratePitch = async (selectedTone: string = tone) => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      const res = await api.generatePitch({
        lead_id: lead.id,
        business_name: lead.company_name,
        industry: lead.industry,
        city: lead.city,
        country: lead.country,
        website: lead.website,
        offer_service: offerService,
        sender_name: senderName,
        sender_company: senderCompany,
        tone: selectedTone
      });
      setPitch(res);
      if (onLeadUpdated) {
        onLeadUpdated({ ...lead, pitches: res });
      }
    } catch (e) {
      console.error('Failed to generate pitch:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnrichContacts = async () => {
    if (!lead) return;
    setIsEnriching(true);
    try {
      const res = await api.enrichLead(lead.id);
      setDecisionMakers(res.decision_makers || []);
      if (res.crm_stage) setCurrentStage(res.crm_stage);
      if (onLeadUpdated) {
        onLeadUpdated({ ...lead, decision_makers: res.decision_makers, crm_stage: res.crm_stage });
      }
    } catch (e) {
      console.error('Failed to enrich lead:', e);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!lead) return;
    setIsUpdatingStage(true);
    try {
      await api.updateCrmStage(lead.id, newStage);
      setCurrentStage(newStage);
      if (onLeadUpdated) {
        onLeadUpdated({ ...lead, crm_stage: newStage as any });
      }
    } catch (e) {
      console.error('Failed to update stage:', e);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleSendEmail = async () => {
    if (!lead || !pitch) return;
    const recipient = lead.email && lead.email !== 'Not found' ? lead.email : '';
    const subject = pitch.subject_lines[0] || `Partnership inquiry with ${lead.company_name}`;
    
    try {
      await api.dispatchOutreach(lead.id, 'email', pitch.email_body, subject, recipient);
      setCurrentStage('Pitched');
      if (onLeadUpdated) {
        onLeadUpdated({ ...lead, crm_stage: 'Pitched' });
      }
    } catch (e) {
      console.error('Outreach dispatch note:', e);
    }

    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(pitch.email_body)}`;
    window.open(mailto, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171717]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-[#DDDCD7] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#171717]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#EFEEE9] flex items-center justify-between bg-[#F7F6F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7657FF] flex items-center justify-center text-white shadow-md shadow-[#7657FF]/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-[#171717] tracking-tight">{lead.company_name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/20">
                  AI Outreach Studio
                </span>
              </div>
              <p className="text-xs text-[#6F6D68] mt-0.5 flex items-center gap-2">
                <span>{lead.city ? `${lead.city}, ` : ''}{lead.country || 'Global'}</span>
                <span>•</span>
                <span>{lead.industry || 'Business'}</span>
                <span>•</span>
                <span className="text-[#3157FF] font-bold">Fit Score: {lead.score}%</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stage Selector */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-[#DDDCD7]">
              <span className="text-xs text-[#6F6D68] font-semibold">Stage:</span>
              <select
                value={currentStage}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={isUpdatingStage}
                className="bg-transparent text-xs font-bold text-[#3157FF] focus:outline-none cursor-pointer"
              >
                <option value="Discovered">Discovered</option>
                <option value="Enriched">Enriched</option>
                <option value="Pitched">Pitched</option>
                <option value="Discussion">Discussion</option>
                <option value="Won">Won / Closed</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-[#6F6D68] hover:text-[#171717] rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#EFEEE9] bg-[#F7F6F2] px-6 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('email')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'border-[#3157FF] text-[#3157FF]'
                : 'border-transparent text-[#6F6D68] hover:text-[#171717]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cold Pitch Email</span>
          </button>
          <button
            onClick={() => setActiveTab('decision_makers')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'decision_makers'
                ? 'border-[#3157FF] text-[#3157FF]'
                : 'border-transparent text-[#6F6D68] hover:text-[#171717]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Key Contacts ({decisionMakers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('linkedin')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'linkedin'
                ? 'border-[#3157FF] text-[#3157FF]'
                : 'border-transparent text-[#6F6D68] hover:text-[#171717]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>LinkedIn Script</span>
          </button>
          <button
            onClick={() => setActiveTab('sequence')}
            className={`py-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sequence'
                ? 'border-[#3157FF] text-[#3157FF]'
                : 'border-transparent text-[#6F6D68] hover:text-[#171717]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Follow-up Sequence</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-white">

          {/* TAB 1: COLD EMAIL */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Pitch Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-[#F7F6F2] p-4 rounded-2xl border border-[#DDDCD7]">
                <div>
                  <label className="block text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1">
                    Offered Service
                  </label>
                  <input
                    type="text"
                    value={offerService}
                    onChange={(e) => setOfferService(e.target.value)}
                    className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:border-[#3157FF] focus:outline-none"
                    placeholder="e.g. Web Design, SEO"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1">
                    Tone Angle
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => {
                      setTone(e.target.value);
                      handleGeneratePitch(e.target.value);
                    }}
                    className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:border-[#3157FF] focus:outline-none"
                  >
                    <option value="value_first">Value-First (Free Insights)</option>
                    <option value="professional">Executive & Formal</option>
                    <option value="casual">Casual & Direct</option>
                    <option value="direct">Straightforward Solution</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => handleGeneratePitch()}
                    disabled={isGenerating}
                    className="w-full bg-[#3157FF] hover:bg-[#2745d8] disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGenerating ? 'AI Crafting...' : 'Regenerate Pitch'}</span>
                  </button>
                </div>
              </div>

              {/* Subject Lines */}
              {pitch && pitch.subject_lines && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                    High-Converting Subject Lines
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {pitch.subject_lines.map((subject, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-[#F7F6F2] hover:bg-white border border-[#DDDCD7] px-4 py-2.5 rounded-xl text-xs group transition-all"
                      >
                        <span className="text-[#171717] font-semibold">{subject}</span>
                        <button
                          onClick={() => copyToClipboard(subject, `subj_${idx}`)}
                          className="text-[11px] font-semibold px-2.5 py-1 bg-white group-hover:bg-[#3157FF] border border-[#DDDCD7] group-hover:border-[#3157FF] text-[#171717] group-hover:text-white rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          {copiedField === `subj_${idx}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Body */}
              {pitch && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                      Personalized Pitch Copy
                    </span>
                    <button
                      onClick={() => copyToClipboard(pitch.email_body, 'body')}
                      className="text-xs text-[#3157FF] hover:text-[#7657FF] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedField === 'body' ? 'Copied to Clipboard!' : 'Copy Body'}</span>
                    </button>
                  </div>

                  <div className="bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-5 text-xs leading-relaxed text-[#171717] font-mono whitespace-pre-wrap">
                    {pitch.email_body}
                  </div>
                </div>
              )}

              {/* Dispatch Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[#EFEEE9]">
                <div className="text-xs text-[#6F6D68]">
                  Target Recipient: <span className="text-[#171717] font-semibold">{lead.email || 'None found'}</span>
                </div>
                <button
                  onClick={handleSendEmail}
                  className="bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open in Email Client</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DECISION MAKERS */}
          {activeTab === 'decision_makers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#171717]">Identified Key Contacts & Roles</h3>
                  <p className="text-xs text-[#6F6D68]">Executive contacts and decision makers retrieved for outreach.</p>
                </div>
                <button
                  onClick={handleEnrichContacts}
                  disabled={isEnriching}
                  className="bg-white hover:bg-[#F7F6F2] text-[#3157FF] text-xs font-bold py-2 px-3.5 rounded-xl border border-[#DDDCD7] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 text-[#3157FF]" />
                  <span>{isEnriching ? 'Enriching...' : 'Refresh Contacts'}</span>
                </button>
              </div>

              {decisionMakers.length === 0 ? (
                <div className="text-center py-14 text-[#6F6D68] text-xs bg-[#F7F6F2] border border-dashed border-[#DDDCD7] rounded-2xl">
                  No decision makers discovered yet. Click "Refresh Contacts" to run registry lookup.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {decisionMakers.map((dm, i) => (
                    <div
                      key={i}
                      className="bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-4 space-y-2.5 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-[#171717] text-sm">{dm.name}</div>
                          <div className="text-xs text-[#3157FF] font-semibold">{dm.title}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#171717] font-mono border border-[#DDDCD7]">
                          {dm.confidence}% Match
                        </span>
                      </div>

                      <div className="text-xs text-[#6F6D68] space-y-1.5 pt-2 border-t border-[#DDDCD7]">
                        {dm.email && (
                          <div className="flex items-center justify-between">
                            <span>Email: <span className="text-[#171717] font-mono">{dm.email}</span></span>
                            <button
                              onClick={() => copyToClipboard(dm.email || '', `dm_mail_${i}`)}
                              className="text-[10px] text-[#3157FF] hover:underline cursor-pointer font-bold"
                            >
                              {copiedField === `dm_mail_${i}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                        {dm.linkedin_url && (
                          <div className="pt-0.5">
                            <a
                              href={dm.linkedin_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-[#3157FF] hover:underline text-xs font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View LinkedIn Profile ↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LINKEDIN SCRIPT */}
          {activeTab === 'linkedin' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">Custom LinkedIn Connection Note</h3>
                <p className="text-xs text-[#6F6D68]">Strictly formatted under 300 characters to fit the LinkedIn connection limit.</p>
              </div>

              {pitch && (
                <div className="space-y-3.5">
                  <div className="bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-5 text-xs font-mono text-[#171717] relative">
                    {pitch.linkedin_note}
                    <div className="mt-4 flex items-center justify-between text-[11px] text-[#6F6D68] font-sans border-t border-[#DDDCD7] pt-3">
                      <span>Length: <strong className="text-[#171717]">{pitch.linkedin_note.length}</strong> / 300 characters</span>
                      <button
                        onClick={() => copyToClipboard(pitch.linkedin_note, 'li_note')}
                        className="text-[#3157FF] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedField === 'li_note' ? 'Copied!' : 'Copy Script'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FOLLOW-UP SEQUENCE */}
          {activeTab === 'sequence' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">Follow-up Sequence Templates</h3>
                <p className="text-xs text-[#6F6D68]">High-response nudges to re-engage prospects across the sales cycle.</p>
              </div>

              {pitch && (
                <div className="space-y-4">
                  {/* Day 3 */}
                  <div className="bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#7657FF] uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Day 3 — Soft Value Bump</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(pitch.follow_up_day3, 'day3')}
                        className="text-xs text-[#3157FF] font-bold hover:underline cursor-pointer"
                      >
                        {copiedField === 'day3' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-[#171717] font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-[#DDDCD7]">{pitch.follow_up_day3}</p>
                  </div>

                  {/* Day 7 */}
                  <div className="bg-[#F7F6F2] border border-[#DDDCD7] rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FF6B5F] uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Day 7 — Final Nudge / Clean Closure</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(pitch.follow_up_day7, 'day7')}
                        className="text-xs text-[#3157FF] font-bold hover:underline cursor-pointer"
                      >
                        {copiedField === 'day7' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-[#171717] font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-[#DDDCD7]">{pitch.follow_up_day7}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
