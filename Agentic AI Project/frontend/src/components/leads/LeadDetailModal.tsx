import React, { useState } from 'react';
import { 
  X, 
  Bookmark, 
  ExternalLink, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Check, 
  Copy,
  CheckCircle2, 
  Trash2, 
  Phone, 
  Mail, 
  Zap, 
  Tag, 
  Sparkles, 
  Bot 
} from 'lucide-react';
import { Lead } from '../../types';
import { LeadScoreArc } from './LeadScoreArc';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onToggleSave: (id: string, currentSaved: boolean) => void;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  onSaveTags: (id: string, tags: string[]) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDeleteLead?: (id: string) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onToggleSave,
  onSaveNotes,
  onSaveTags,
  onUpdateStatus,
  onDeleteLead,
  onOpenVoiceCall,
  onOpenEmailApproval
}) => {
  if (!lead) return null;

  const [notes, setNotes] = useState(lead.notes || '');
  const [tags, setTags] = useState<string[]>(lead.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [status, setStatus] = useState(lead.status || 'new');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const score = lead.lead_score ?? lead.score ?? 0;
  const companyName = lead.business_name || lead.company_name || 'Business';
  const reasons: string[] = lead.qualification_reasons || lead.pain_points || [];

  const handleCopy = (text: string, field: string) => {
    if (!text || text === 'Not found') return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const val = newTagInput.trim();
      if (!tags.includes(val)) {
        const updated = [...tags, val];
        setTags(updated);
        onSaveTags(lead.id, updated);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    onSaveTags(lead.id, updated);
  };

  const handleNotesBlur = async () => {
    if (notes !== lead.notes) {
      setIsSaving(true);
      await onSaveNotes(lead.id, notes);
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as any);
    await onUpdateStatus(lead.id, newStatus);
  };

  const breakdown = lead.score_breakdown || {
    location: 25,
    industry: 25,
    relevance: 20,
    data_quality: 12,
    other: 8,
    total: score
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/50 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-[#DDDCD7] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#EFEEE9] bg-[#F7F6F2] flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-[#171717] tracking-tight">{companyName}</h2>
              {lead.verified && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-[#3157FF]/10 text-[#3157FF] border border-[#3157FF]/20 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Registry
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#6F6D68]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#9E9C96]" />
                {[lead.address, lead.city, lead.country].filter(Boolean).join(', ') || 'Global'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium text-[#171717]">
                <Building2 className="w-3.5 h-3.5 text-[#9E9C96]" />
                {lead.industry || 'Business'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(lead.id, lead.saved)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                lead.saved
                  ? 'bg-[#B8E94E]/20 border-[#B8E94E] text-[#171717]'
                  : 'bg-white border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717]'
              }`}
              title={lead.saved ? 'Saved Lead' : 'Save Lead'}
            >
              <Bookmark className="w-4 h-4" fill={lead.saved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717] transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Outreach Action Command Bar */}
        <div className="px-6 py-3 bg-[#EFEEE9] border-b border-[#DDDCD7] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6F6D68] uppercase tracking-wider">AI Direct Outreach:</span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-white text-[#3157FF] font-bold border border-[#DDDCD7] shadow-xs">
              Fit Score: {score}%
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenVoiceCall && (
              <button
                onClick={() => {
                  onClose();
                  onOpenVoiceCall(lead);
                }}
                className="px-4 py-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>AI Voice Calling</span>
              </button>
            )}

            {onOpenEmailApproval && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEmailApproval(lead);
                }}
                className="px-4 py-2 rounded-xl bg-[#7657FF] hover:bg-[#6242e8] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>AI Email Follow-up</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs bg-white">
          
          {/* Contact Bar Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-0.5">Email</span>
                <p className={`truncate font-semibold ${lead.email && lead.email !== 'Not found' ? 'text-[#171717]' : 'text-[#9E9C96] italic'}`}>
                  {lead.email || 'Not found'}
                </p>
              </div>
              {lead.email && lead.email !== 'Not found' && (
                <button
                  onClick={() => handleCopy(lead.email!, 'email')}
                  className="p-1.5 rounded-lg bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#6F6D68] cursor-pointer"
                  title="Copy email"
                >
                  {copiedField === 'email' ? <CheckCircle2 className="w-4 h-4 text-[#3157FF]" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-0.5">Phone</span>
                <p className={`truncate font-semibold font-mono ${lead.phone && lead.phone !== 'Not found' ? 'text-[#171717]' : 'text-[#9E9C96] italic'}`}>
                  {lead.phone || 'Not found'}
                </p>
              </div>
              {lead.phone && lead.phone !== 'Not found' && (
                <button
                  onClick={() => handleCopy(lead.phone!, 'phone')}
                  className="p-1.5 rounded-lg bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#6F6D68] cursor-pointer"
                  title="Copy phone"
                >
                  {copiedField === 'phone' ? <CheckCircle2 className="w-4 h-4 text-[#3157FF]" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] flex items-center justify-between">
              <div className="truncate pr-2">
                <span className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-0.5">Website</span>
                <p className="truncate font-semibold">
                  {lead.website ? (
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-[#3157FF] hover:underline flex items-center gap-1">
                      <span>{lead.website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <span className="text-[#9E9C96] italic">Not found</span>}
                </p>
              </div>
            </div>
          </div>

          {/* AI Match & Score Breakdown Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* AI Qualification Rationale */}
            <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">AI Intelligence Analysis</h3>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  lead.qualification === 'HIGH' ? 'bg-[#3157FF]/10 text-[#3157FF] border-[#3157FF]/20' :
                  lead.qualification === 'MEDIUM' ? 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20' :
                  'bg-[#EFEEE9] text-[#6F6D68] border-[#DDDCD7]'
                }`}>
                  {lead.qualification} Match
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs text-[#171717] font-semibold">Target Criteria & Signals:</p>
                <ul className="space-y-2">
                  {reasons.map((reason: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-[#6F6D68] leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-[#3157FF] shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[#DDDCD7] text-[11px] text-[#6F6D68] flex items-center justify-between">
                <span>Data Source: <strong className="text-[#171717]">{lead.source}</strong></span>
                <span>Provenance: <strong className="text-[#3157FF]">Verified Registry</strong></span>
              </div>
            </div>

            {/* Score Breakdown Bars */}
            <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">Fit Score Breakdown</h3>
                <LeadScoreArc score={score} size={40} strokeWidth={4} />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[#6F6D68] mb-1 font-medium">
                    <span>Location Fit (25%)</span>
                    <span className="font-mono text-[#171717] font-bold">{breakdown.location}/25</span>
                  </div>
                  <div className="w-full bg-[#EFEEE9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#3157FF] h-full rounded-full" style={{ width: `${(breakdown.location / 25) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#6F6D68] mb-1 font-medium">
                    <span>Industry & Sector (25%)</span>
                    <span className="font-mono text-[#171717] font-bold">{breakdown.industry}/25</span>
                  </div>
                  <div className="w-full bg-[#EFEEE9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#7657FF] h-full rounded-full" style={{ width: `${(breakdown.industry / 25) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#6F6D68] mb-1 font-medium">
                    <span>Relevance & Need (25%)</span>
                    <span className="font-mono text-[#171717] font-bold">{breakdown.relevance}/25</span>
                  </div>
                  <div className="w-full bg-[#EFEEE9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#FF6B5F] h-full rounded-full" style={{ width: `${(breakdown.relevance / 25) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#6F6D68] mb-1 font-medium">
                    <span>Data Quality (25%)</span>
                    <span className="font-mono text-[#171717] font-bold">{breakdown.data_quality}/25</span>
                  </div>
                  <div className="w-full bg-[#EFEEE9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#B8E94E] h-full rounded-full" style={{ width: `${(breakdown.data_quality / 25) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Outreach Status & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#6F6D68] uppercase tracking-wider block mb-1.5">Lead Status</label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#3157FF] cursor-pointer"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted / Active Client</option>
                  <option value="irrelevant">Mark as Irrelevant</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#6F6D68] uppercase tracking-wider block mb-1.5">Custom Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#3157FF]/10 border border-[#3157FF]/20 text-[#3157FF] text-xs font-medium flex items-center gap-1.5">
                      <Tag className="w-3 h-3" />
                      <span>{t}</span>
                      <button onClick={() => handleRemoveTag(t)} className="hover:text-red-500 ml-1">×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type tag and press Enter..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#6F6D68] uppercase tracking-wider block mb-1.5">
                Prospecting Notes {isSaving && <span className="text-[#3157FF] text-[10px] normal-case">(Saving...)</span>}
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Private notes regarding this account, previous conversations, or proposal ideas..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Delete Action footer */}
          {onDeleteLead && (
            <div className="pt-3 border-t border-[#DDDCD7] flex items-center justify-between text-xs text-[#6F6D68]">
              <span>Discovered: {new Date(lead.created_at).toLocaleDateString()}</span>
              <button
                onClick={() => {
                  if (confirm('Remove this lead record?')) {
                    onDeleteLead(lead.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 text-[#FF6B5F] hover:text-[#e05347] font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
