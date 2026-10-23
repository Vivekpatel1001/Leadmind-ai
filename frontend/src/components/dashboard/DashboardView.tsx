import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  Building2, 
  Bookmark, 
  History, 
  Award, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Kanban,
  Cpu,
  Phone,
  Mail
} from 'lucide-react';
import { DashboardMetrics, Lead } from '../../types';
import { AICoreOrb } from '../search/AICoreOrb';
import { LeadScoreArc } from '../leads/LeadScoreArc';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  onQuickSearch: (query: string, newLeadsOnly?: boolean) => void;
  onViewDetails: (lead: Lead) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  onQuickSearch,
  onViewDetails,
  onNavigateToTab
}) => {
  const [quickInput, setQuickInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickInput.trim()) {
      onQuickSearch(quickInput.trim());
    }
  };

  const samplePrompts = [
    'Find UK restaurants needing graphic design and branding',
    'High growth SaaS startups in London, UK',
    'Dental & medical clinics in Manchester',
    'Boutique fashion stores in Edinburgh'
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Hero Command Search Section */}
      <div className="command-box-gradient p-8 sm:p-10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3157FF]/10 text-[#3157FF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Multi-Agent Lead Engine</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-[#171717] tracking-tight leading-tight">
              Find the businesses <span className="text-[#3157FF]">that matter.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#6F6D68] max-w-2xl leading-relaxed">
              Describe your target clients in natural language. Our autonomous agents extract intent, query verified registries & live web intelligence, score high-intent leads, and automate calling and email outreach.
            </p>
          </div>

          <div className="hidden sm:flex shrink-0">
            <AICoreOrb size="md" state="idle" />
          </div>
        </div>

        {/* Search Command Bar */}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative flex items-center bg-[#F7F6F2] border border-[#DDDCD7] focus-within:border-[#3157FF] rounded-2xl p-2 transition-all">
            <Search className="w-5 h-5 text-[#6F6D68] ml-3 shrink-0" />
            <input
              type="text"
              placeholder='e.g. "Find 50 UK restaurants that could need graphic design services"'
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#9E9C96] focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3157FF] hover:bg-[#7657FF] text-white text-xs font-bold shadow-md shadow-[#3157FF]/20 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <span>Search Leads</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Prompt Suggestions */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#6F6D68] pt-1">
          <span className="font-semibold text-[#171717]">Try asking:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onQuickSearch(p)}
              className="px-3 py-1 rounded-full bg-[#EFEEE9] hover:bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#6F6D68] hover:text-[#3157FF] transition-all cursor-pointer text-[11px] font-medium shadow-xs"
            >
              "{p}"
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="luxury-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Leads</span>
            <div className="w-8 h-8 rounded-xl bg-[#3157FF]/10 text-[#3157FF] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight">
            {metrics?.total_leads || 0}
          </div>
          <p className="text-[11px] text-[#6F6D68] font-medium">Verified in lead registry</p>
        </div>

        <div className="luxury-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Saved Prospects</span>
            <div className="w-8 h-8 rounded-xl bg-[#B8E94E]/25 text-[#171717] flex items-center justify-center border border-[#DDDCD7]">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight">
            {metrics?.saved_leads || 0}
          </div>
          <p className="text-[11px] text-[#6F6D68] font-medium">Shortlisted for outreach</p>
        </div>

        <div className="luxury-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">High Match Leads</span>
            <div className="w-8 h-8 rounded-xl bg-[#3157FF]/10 text-[#3157FF] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3157FF] tracking-tight">
            {metrics?.high_match_count || 0}
          </div>
          <p className="text-[11px] text-[#6F6D68] font-medium">Qualification Score ≥ 80%</p>
        </div>

        <div className="luxury-card p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Agent Executions</span>
            <div className="w-8 h-8 rounded-xl bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight">
            {metrics?.total_searches || 0}
          </div>
          <p className="text-[11px] text-[#6F6D68] font-medium">Stored in memory matrix</p>
        </div>

      </div>

      {/* Two Column Section: Recent Searches & Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Searches in Memory */}
        <div className="luxury-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3157FF]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Recent Searches in Memory</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('history')}
              className="text-xs text-[#3157FF] hover:text-[#7657FF] font-bold cursor-pointer"
            >
              View all ➔
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.recent_searches && metrics.recent_searches.length > 0 ? (
              metrics.recent_searches.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-[#F7F6F2] hover:bg-[#EFEEE9] border border-[#DDDCD7] flex items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <p className="font-bold text-[#171717] truncate">"{s.query}"</p>
                    <p className="text-[11px] text-[#6F6D68]">
                      {s.total_found} leads discovered · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onQuickSearch(s.query)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDDCD7] text-[#171717] hover:border-[#3157FF] text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      Re-run
                    </button>
                    <button
                      onClick={() => onQuickSearch(`Find new ${s.parsed_requirements?.industry || 'leads'} in ${s.parsed_requirements?.country || 'UK'}`, true)}
                      className="px-2.5 py-1 rounded-lg bg-[#3157FF] text-white hover:bg-[#2745d8] text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      Find New
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6F6D68] py-4 italic">No past searches recorded yet.</p>
            )}
          </div>
        </div>

        {/* Recently Discovered Leads */}
        <div className="luxury-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#7657FF]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Recently Discovered Leads</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('my-leads')}
              className="text-xs text-[#3157FF] hover:text-[#7657FF] font-bold cursor-pointer"
            >
              View directory ➔
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics?.recent_leads && metrics.recent_leads.length > 0 ? (
              metrics.recent_leads.slice(0, 4).map((l) => (
                <div
                  key={l.id}
                  onClick={() => onViewDetails(l)}
                  className="p-3.5 rounded-xl bg-[#F7F6F2] hover:bg-[#EFEEE9] border border-[#DDDCD7] flex items-center justify-between gap-3 text-xs transition-all cursor-pointer group"
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-[#171717] group-hover:text-[#3157FF] transition-colors truncate">{l.business_name || l.company_name}</p>
                      {l.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#3157FF] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#6F6D68] truncate">
                      {l.industry} · {[l.city, l.country].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <LeadScoreArc score={l.lead_score ?? l.score ?? 0} size={36} strokeWidth={3} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6F6D68] py-4 italic">No leads found yet.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
