import React from 'react';
import { 
  Bookmark, 
  ExternalLink, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Zap, 
  Sparkles, 
  Layers 
} from 'lucide-react';
import { Lead } from '../../types';
import { LeadScoreArc } from './LeadScoreArc';

interface LeadCardProps {
  lead: Lead;
  onViewDetails: (lead: Lead) => void;
  onToggleSave: (id: string, currentSaved: boolean) => void;
  onOpenPitch?: (lead: Lead) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onViewDetails,
  onToggleSave,
  onOpenPitch,
  onOpenVoiceCall,
  onOpenEmailApproval
}) => {
  const score = lead.lead_score ?? lead.score ?? 0;
  const companyName = lead.business_name || lead.company_name || 'Business';
  const reasons = lead.qualification_reasons || lead.pain_points || [];

  return (
    <div className="luxury-card rounded-2xl p-5 flex flex-col justify-between space-y-4 group transition-all duration-300">
      
      {/* Header Section */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 
                onClick={() => onViewDetails(lead)}
                className="font-bold text-[#171717] text-sm hover:text-[#3157FF] transition-colors cursor-pointer truncate"
              >
                {companyName}
              </h4>
              {lead.verified && (
                <span title="Verified Registry Source">
                  <ShieldCheck className="w-4 h-4 text-[#3157FF] shrink-0" />
                </span>
              )}
            </div>

            {/* Location & Industry meta */}
            <div className="flex items-center gap-1.5 text-xs text-[#6F6D68]">
              <MapPin className="w-3.5 h-3.5 text-[#9E9C96] shrink-0" />
              <span className="truncate">{[lead.city, lead.country].filter(Boolean).join(', ') || 'Global'}</span>
              <span className="text-[#DDDCD7]">·</span>
              <span className="truncate text-[#171717] font-medium">{lead.industry || 'Business'}</span>
            </div>
          </div>

          {/* Lead Score Arc & Bookmark */}
          <div className="flex items-center gap-2 shrink-0">
            <LeadScoreArc score={score} size={44} strokeWidth={4} />
            <button
              onClick={() => onToggleSave(lead.id, lead.saved)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                lead.saved 
                  ? 'bg-[#B8E94E]/20 border-[#B8E94E] text-[#171717]' 
                  : 'bg-[#F7F6F2] border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717] hover:border-[#9E9C96]'
              }`}
              title={lead.saved ? 'Saved Lead' : 'Save Lead'}
            >
              <Bookmark className="w-3.5 h-3.5" fill={lead.saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Contact info & AI match rationale */}
      <div className="space-y-2 text-xs text-[#6F6D68] border-t border-[#EFEEE9] pt-3.5">
        <div className="flex items-center gap-2 truncate">
          <Mail className="w-3.5 h-3.5 text-[#9E9C96] shrink-0" />
          <span className={`truncate ${lead.email && lead.email !== 'Not found' ? 'text-[#171717] font-medium' : 'text-[#9E9C96] italic'}`}>
            {lead.email || 'No direct email found'}
          </span>
        </div>

        <div className="flex items-center gap-2 truncate">
          <Phone className="w-3.5 h-3.5 text-[#9E9C96] shrink-0" />
          <span className={`truncate ${lead.phone && lead.phone !== 'Not found' ? 'text-[#171717] font-mono' : 'text-[#9E9C96] italic'}`}>
            {lead.phone || 'No direct phone'}
          </span>
        </div>

        {/* AI Qualification Snippet */}
        {reasons.length > 0 && (
          <div className="pt-1 text-[11px] text-[#6F6D68]">
            <div className="flex items-start gap-1.5 bg-[#F7F6F2] p-2 rounded-lg border border-[#DDDCD7]">
              <Sparkles className="w-3 h-3 text-[#3157FF] shrink-0 mt-0.5" />
              <span className="line-clamp-1 text-[#171717] font-medium">{reasons[0]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-[#EFEEE9] pt-3.5 flex items-center justify-between gap-2 text-xs">
        <div>
          {lead.website ? (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#3157FF] hover:text-[#7657FF] hover:underline flex items-center gap-1 text-[11px] font-semibold"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Website ↗</span>
            </a>
          ) : (
            <span className="text-[#9E9C96] italic text-[11px]">No website</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenVoiceCall && (
            <button
              onClick={() => onOpenVoiceCall(lead)}
              className="p-2 rounded-xl bg-[#F7F6F2] hover:bg-[#3157FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#3157FF] transition-all cursor-pointer shadow-xs"
              title="Initiate AI Voice Call & Live Forwarding"
            >
              <Phone className="w-3.5 h-3.5 text-[#3157FF] hover:text-white" />
            </button>
          )}

          {onOpenEmailApproval && (
            <button
              onClick={() => onOpenEmailApproval(lead)}
              className="p-2 rounded-xl bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#7657FF] transition-all cursor-pointer shadow-xs"
              title="AI Email Dispatch & Automated Follow-up"
            >
              <Mail className="w-3.5 h-3.5 text-[#7657FF] hover:text-white" />
            </button>
          )}

          {onOpenPitch && (
            <button
              onClick={() => onOpenPitch(lead)}
              className="flex items-center gap-1 text-xs font-semibold text-[#171717] hover:text-white px-2.5 py-1.5 rounded-xl bg-[#F7F6F2] hover:bg-[#7657FF] border border-[#DDDCD7] hover:border-[#7657FF] transition-all shadow-xs cursor-pointer"
              title="AI Pitch Package"
            >
              <Zap className="w-3 h-3 text-[#FF6B5F]" />
              <span>Pitch</span>
            </button>
          )}

          <button
            onClick={() => onViewDetails(lead)}
            className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-[#171717] hover:bg-[#3157FF] transition-all cursor-pointer shadow-xs"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

    </div>
  );
};
