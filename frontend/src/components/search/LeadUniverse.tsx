import React, { useState } from 'react';
import { Lead } from '../../types';
import { LeadScoreArc } from '../leads/LeadScoreArc';
import { 
  Sparkles, 
  Building2, 
  ExternalLink, 
  Phone, 
  Mail, 
  Bookmark, 
  Layers, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  BrainCircuit,
  Filter
} from 'lucide-react';

interface LeadUniverseProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onToggleSave?: (id: string, current: boolean) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

export const LeadUniverse: React.FC<LeadUniverseProps> = ({
  leads,
  onSelectLead,
  onToggleSave,
  onOpenVoiceCall,
  onOpenEmailApproval,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [hoveredLead, setHoveredLead] = useState<Lead | null>(leads[0] || null);

  const categories = Array.from(new Set(leads.map(l => l.industry || 'General'))).filter(Boolean);

  const filteredLeads = leads.filter(l => {
    const matchesCategory = selectedCategory === 'all' || (l.industry || 'General') === selectedCategory;
    const score = l.lead_score ?? l.score ?? 0;
    const matchesScore = score >= minScore;
    return matchesCategory && matchesScore;
  });

  const highMatchCount = leads.filter(l => (l.lead_score ?? l.score ?? 0) >= 80).length;
  const mediumMatchCount = leads.filter(l => {
    const s = l.lead_score ?? l.score ?? 0;
    return s >= 50 && s < 80;
  }).length;
  const savedCount = leads.filter(l => l.saved).length;

  return (
    <div className="w-full bg-[#FFFFFF] rounded-2xl border border-[#DDDCD7] shadow-sm overflow-hidden p-6 space-y-6">
      
      {/* Universe Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFEEE9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#3157FF]/10 text-[#3157FF]">
              <BrainCircuit className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#171717] tracking-tight">
              Lead Universe & Cluster Matrix
            </h3>
          </div>
          <p className="text-xs text-[#6F6D68] mt-0.5">
            Interactive visual relationship workspace mapping market fit, intent signals, and reachability.
          </p>
        </div>

        {/* Quick Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-[#171717]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3157FF]" /> High Fit ({highMatchCount})
          </span>
          <span className="flex items-center gap-1.5 text-[#6F6D68]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7657FF]" /> Medium ({mediumMatchCount})
          </span>
          <span className="flex items-center gap-1.5 text-[#6F6D68]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B5F]" /> Priority / Hot
          </span>
          <span className="flex items-center gap-1.5 text-[#6F6D68]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8E94E] border border-[#DDDCD7]" /> Saved ({savedCount})
          </span>
        </div>
      </div>

      {/* 3-Column Hybrid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Filters & Segments (3 cols) */}
        <div className="lg:col-span-3 space-y-4 bg-[#F7F6F2] p-4 rounded-xl border border-[#DDDCD7]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#3157FF]" />
            Universe Filters
          </div>

          <div>
            <label className="text-xs font-medium text-[#6F6D68] block mb-1.5">
              Minimum Fit Score: <span className="font-bold text-[#3157FF]">{minScore}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-[#3157FF] cursor-pointer h-1.5 bg-[#EFEEE9] rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6F6D68] block mb-2">Industry Cluster</label>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#3157FF] text-white shadow-sm'
                    : 'text-[#6F6D68] hover:bg-[#EFEEE9] hover:text-[#171717]'
                }`}
              >
                All Industries ({leads.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all truncate ${
                    selectedCategory === cat
                      ? 'bg-[#3157FF] text-white shadow-sm'
                      : 'text-[#6F6D68] hover:bg-[#EFEEE9] hover:text-[#171717]'
                  }`}
                >
                  {cat} ({leads.filter(l => (l.industry || 'General') === cat).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Lead Node Canvas & Grid (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Interactive Universe Canvas */}
          <div className="relative w-full h-64 bg-[#F7F6F2] rounded-xl border border-[#DDDCD7] p-4 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-25"
              style={{
                backgroundImage: 'radial-gradient(#3157FF 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px'
              }}
            />
            
            {/* Center Core Hub */}
            <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-[#3157FF] to-[#7657FF] text-white flex items-center justify-center shadow-md animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>

            {/* Orbiting Lead Nodes */}
            {filteredLeads.slice(0, 24).map((lead, idx) => {
              const total = Math.min(filteredLeads.length, 24);
              const angle = (idx / total) * 2 * Math.PI;
              const radius = 45 + (idx % 3) * 35;
              const x = 50 + (radius / 100) * 40 * Math.cos(angle);
              const y = 50 + (radius / 100) * 40 * Math.sin(angle);

              const score = lead.lead_score ?? lead.score ?? 0;
              const isHigh = score >= 80;
              const isSaved = lead.saved;
              const isPriority = idx % 4 === 0;

              let nodeColor = 'bg-[#7657FF]';
              if (isSaved) nodeColor = 'bg-[#B8E94E] text-[#171717]';
              else if (isPriority) nodeColor = 'bg-[#FF6B5F]';
              else if (isHigh) nodeColor = 'bg-[#3157FF]';

              const isHovered = hoveredLead?.id === lead.id;
              const compName = lead.business_name || lead.company_name || 'Business';

              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    setHoveredLead(lead);
                    onSelectLead(lead);
                  }}
                  onMouseEnter={() => setHoveredLead(lead)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20 cursor-pointer ${
                    isHovered ? 'scale-150 z-30 ring-4 ring-[#3157FF]/30' : 'hover:scale-125'
                  }`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={`${compName} - ${score}%`}
                >
                  <div className={`w-6 h-6 rounded-full ${nodeColor} text-white font-bold text-[9px] flex items-center justify-center shadow-md border-2 border-white`}>
                    {score}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
            {filteredLeads.slice(0, 6).map((lead) => {
              const compName = lead.business_name || lead.company_name || 'Business';
              const score = lead.lead_score ?? lead.score ?? 0;
              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setHoveredLead(lead);
                    onSelectLead(lead);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer bg-white ${
                    hoveredLead?.id === lead.id
                      ? 'border-[#3157FF] shadow-md ring-1 ring-[#3157FF]'
                      : 'border-[#DDDCD7] hover:border-[#3157FF]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#171717] truncate">{compName}</h4>
                      <p className="text-[11px] text-[#6F6D68] truncate">{lead.industry || 'Business'} · {lead.city || lead.country}</p>
                    </div>
                    <LeadScoreArc score={score} size={36} strokeWidth={3} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Lead Intelligence & Insights (3 cols) */}
        <div className="lg:col-span-3 space-y-4 bg-[#F7F6F2] p-4 rounded-xl border border-[#DDDCD7]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3157FF]" />
              Lead Spotlight
            </span>
            {hoveredLead?.saved && (
              <span className="text-[10px] bg-[#B8E94E]/20 text-[#171717] font-semibold px-2 py-0.5 rounded-md">
                Saved
              </span>
            )}
          </div>

          {hoveredLead ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-bold text-[#171717] leading-tight">
                  {hoveredLead.business_name || hoveredLead.company_name}
                </h4>
                <p className="text-xs text-[#6F6D68] mt-0.5">
                  {hoveredLead.city ? `${hoveredLead.city}, ` : ''}{hoveredLead.country}
                </p>
              </div>

              {/* Match Score & Pitch Trigger */}
              <div className="p-3 bg-white rounded-lg border border-[#DDDCD7] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6F6D68] font-medium">Relevance Fit:</span>
                  <span className="font-bold text-[#3157FF]">
                    {hoveredLead.lead_score ?? hoveredLead.score ?? 0}%
                  </span>
                </div>
                <div className="text-[11px] text-[#6F6D68] line-clamp-2">
                  {hoveredLead.qualification_reasons?.[0] || hoveredLead.pain_points?.[0] || 'Strong candidate identified for digital expansion and modernization.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => onSelectLead(hoveredLead)}
                  className="w-full py-2 px-3 rounded-lg bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-semibold shadow-sm transition-all text-center"
                >
                  View Full Lead Profile
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {onOpenVoiceCall && (
                    <button
                      onClick={() => onOpenVoiceCall(hoveredLead)}
                      className="py-1.5 px-2 rounded-lg bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#171717] text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Phone className="w-3 h-3 text-[#3157FF]" /> Call AI
                    </button>
                  )}
                  {onOpenEmailApproval && (
                    <button
                      onClick={() => onOpenEmailApproval(hoveredLead)}
                      className="py-1.5 px-2 rounded-lg bg-white border border-[#DDDCD7] hover:border-[#7657FF] text-[#171717] text-xs font-medium flex items-center justify-center gap-1 transition-all"
                    >
                      <Mail className="w-3 h-3 text-[#7657FF]" /> Email AI
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-[#6F6D68]">
              Hover or click on any node in the universe to inspect lead intelligence.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
