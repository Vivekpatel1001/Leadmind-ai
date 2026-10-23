import React, { useState, useEffect } from 'react';
import { Lead, PipelineSummary } from '../../types';
import { api } from '../../services/api';
import { 
  Sparkles, 
  Search, 
  RotateCcw, 
  Zap, 
  Send, 
  MessageSquare, 
  Trophy, 
  MapPin, 
  Building2,
  TrendingUp,
  Phone,
  Mail,
  Kanban
} from 'lucide-react';
import { LeadScoreArc } from '../leads/LeadScoreArc';

interface CrmPipelineProps {
  onOpenPitch: (lead: Lead) => void;
  onLeadSelect?: (lead: Lead) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

const STAGES: Array<{ id: 'Discovered' | 'Enriched' | 'Pitched' | 'Discussion' | 'Won'; label: string; icon: string; color: string; bg: string; badgeColor: string }> = [
  { id: 'Discovered', label: 'Discovered', icon: '🔍', color: 'text-[#3157FF]', bg: 'bg-[#F7F6F2] border-[#DDDCD7]', badgeColor: 'bg-[#3157FF]/10 text-[#3157FF] border-[#3157FF]/20' },
  { id: 'Enriched', label: 'Enriched', icon: '⚡', color: 'text-[#7657FF]', bg: 'bg-[#F7F6F2] border-[#DDDCD7]', badgeColor: 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20' },
  { id: 'Pitched', label: 'Pitched', icon: '✉️', color: 'text-[#FF6B5F]', bg: 'bg-[#F7F6F2] border-[#DDDCD7]', badgeColor: 'bg-[#FF6B5F]/10 text-[#FF6B5F] border-[#FF6B5F]/20' },
  { id: 'Discussion', label: 'In Discussion', icon: '💬', color: 'text-[#7657FF]', bg: 'bg-[#F7F6F2] border-[#DDDCD7]', badgeColor: 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20' },
  { id: 'Won', label: 'Won / Closed', icon: '🏆', color: 'text-[#171717]', bg: 'bg-[#F7F6F2] border-[#DDDCD7]', badgeColor: 'bg-[#B8E94E]/25 text-[#171717] border-[#DDDCD7]' },
];

export const CrmPipeline: React.FC<CrmPipelineProps> = ({ 
  onOpenPitch, 
  onLeadSelect,
  onOpenVoiceCall,
  onOpenEmailApproval
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const loadPipelineData = async () => {
    setLoading(true);
    try {
      const [leadsRes, summaryRes] = await Promise.all([
        api.getLeads({ limit: 150 }),
        api.getPipelineSummary()
      ]);
      setLeads(leadsRes.leads || []);
      setSummary(summaryRes);
    } catch (e) {
      console.error('Failed to load CRM pipeline:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineData();
  }, []);

  const handleStageChange = async (leadId: string, nextStage: string) => {
    try {
      await api.updateCrmStage(leadId, nextStage);
      setLeads(prev =>
        prev.map(l => (l.id === leadId ? { ...l, crm_stage: nextStage as any } : l))
      );
      const sum = await api.getPipelineSummary();
      setSummary(sum);
    } catch (e) {
      console.error('Failed to update stage:', e);
    }
  };

  const filteredLeads = leads.filter(l => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const name = l.business_name || l.company_name || '';
    return (
      name.toLowerCase().includes(q) ||
      (l.city && l.city.toLowerCase().includes(q)) ||
      (l.industry && l.industry.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="luxury-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Total in Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-[#3157FF]/10 text-[#3157FF] flex items-center justify-center text-xs font-bold">
              📊
            </div>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight">
            {summary?.total_leads ?? leads.length}
          </div>
          <div className="text-[11px] text-[#6F6D68] font-medium">Discovered across all runs</div>
        </div>

        <div className="luxury-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">High Priority Leads</span>
            <div className="w-7 h-7 rounded-lg bg-[#7657FF]/10 text-[#7657FF] flex items-center justify-center text-xs font-bold">
              🔥
            </div>
          </div>
          <div className="text-3xl font-black text-[#3157FF] tracking-tight">
            {summary?.high_priority_count ?? leads.filter(l => (l.score || 0) >= 80).length}
          </div>
          <div className="text-[11px] text-[#6F6D68] font-medium">Fit Score ≥ 80% (Prime Fit)</div>
        </div>

        <div className="luxury-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Won / Closed Deals</span>
            <div className="w-7 h-7 rounded-lg bg-[#B8E94E]/25 text-[#171717] flex items-center justify-center text-xs font-bold border border-[#DDDCD7]">
              🏆
            </div>
          </div>
          <div className="text-3xl font-black text-[#171717] tracking-tight">
            {summary?.stage_counts?.Won ?? leads.filter(l => l.crm_stage === 'Won').length}
          </div>
          <div className="text-[11px] text-[#6F6D68] font-medium">Converted into clients</div>
        </div>

        <div className="luxury-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-[#6F6D68]">
            <span className="text-xs font-bold uppercase tracking-wider">Conversion Rate</span>
            <div className="w-7 h-7 rounded-lg bg-[#FF6B5F]/10 text-[#FF6B5F] flex items-center justify-center text-xs font-bold">
              📈
            </div>
          </div>
          <div className="text-3xl font-black text-[#FF6B5F] tracking-tight">
            {summary?.conversion_rate ?? 0}%
          </div>
          <div className="text-[11px] text-[#6F6D68] font-medium">Pipeline velocity ratio</div>
        </div>

      </div>

      {/* Filter and Action Header */}
      <div className="luxury-card p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#6F6D68] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search leads in pipeline..."
              className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF]"
            />
          </div>
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="text-xs text-[#6F6D68] hover:text-[#171717] cursor-pointer font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPipelineData}
            className="text-xs text-[#171717] bg-white hover:bg-[#F7F6F2] border border-[#DDDCD7] px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-semibold shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#3157FF]" />
            <span>Refresh Board</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="text-center py-24 text-[#6F6D68] text-sm luxury-card rounded-2xl flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3157FF] animate-spin" />
          <span className="font-semibold text-[#171717]">Synchronizing CRM Pipeline...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(
              l => (l.crm_stage || 'Discovered') === stage.id
            );

            return (
              <div
                key={stage.id}
                className={`rounded-2xl border ${stage.bg} flex flex-col max-h-[78vh] overflow-hidden shadow-xs`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[#DDDCD7] flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span>{stage.icon}</span>
                    <span className={stage.color}>{stage.label}</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono border ${stage.badgeColor}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Lead Cards */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1 bg-[#F7F6F2]">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[#9E9C96] text-xs border border-dashed border-[#DDDCD7] rounded-xl font-medium bg-white/50">
                      No prospects in {stage.label}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border border-[#DDDCD7] hover:border-[#3157FF] rounded-xl p-3.5 space-y-2.5 transition-all shadow-xs group"
                      >
                        {/* Header: Score & Name */}
                        <div className="flex items-start justify-between gap-2">
                          <div
                            onClick={() => onLeadSelect && onLeadSelect(lead)}
                            className="font-bold text-xs text-[#171717] hover:text-[#3157FF] cursor-pointer line-clamp-1 flex-1 transition-colors"
                          >
                            {lead.business_name || lead.company_name}
                          </div>
                          <LeadScoreArc score={lead.lead_score ?? lead.score ?? 0} size={30} strokeWidth={2.5} showLabel={false} />
                        </div>

                        {/* Location & Industry */}
                        <div className="text-[11px] text-[#6F6D68] line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#9E9C96] shrink-0" />
                          <span>{lead.city ? `${lead.city}, ` : ''}{lead.country || 'Global'}</span>
                        </div>

                        {/* Quick Action Toolbar */}
                        <div className="pt-2 border-t border-[#EFEEE9] flex items-center justify-between gap-1">
                          {onOpenVoiceCall && (
                            <button
                              onClick={() => onOpenVoiceCall(lead)}
                              className="p-1.5 bg-[#F7F6F2] hover:bg-[#3157FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#3157FF] rounded-lg transition-all cursor-pointer"
                              title="AI Voice Call"
                            >
                              <Phone className="w-3 h-3 text-[#3157FF] hover:text-white" />
                            </button>
                          )}

                          {onOpenEmailApproval && (
                            <button
                              onClick={() => onOpenEmailApproval(lead)}
                              className="p-1.5 bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#7657FF] rounded-lg transition-all cursor-pointer"
                              title="AI Email Draft"
                            >
                              <Mail className="w-3 h-3 text-[#7657FF] hover:text-white" />
                            </button>
                          )}

                          <button
                            onClick={() => onOpenPitch(lead)}
                            className="flex-1 bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#7657FF] text-[10px] font-semibold py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Generate AI Cold Pitch"
                          >
                            <Zap className="w-3 h-3 text-[#FF6B5F]" />
                            <span>Pitch</span>
                          </button>

                          {/* Quick Advance Button */}
                          {stage.id === 'Discovered' && (
                            <button
                              onClick={() => handleStageChange(lead.id, 'Enriched')}
                              title="Advance to Enriched"
                              className="text-[11px] px-2 py-1 bg-[#F7F6F2] hover:bg-[#3157FF] text-[#171717] hover:text-white border border-[#DDDCD7] rounded-lg transition-all cursor-pointer font-bold"
                            >
                              ⚡➔
                            </button>
                          )}
                          {stage.id === 'Enriched' && (
                            <button
                              onClick={() => handleStageChange(lead.id, 'Pitched')}
                              title="Advance to Pitched"
                              className="text-[11px] px-2 py-1 bg-[#F7F6F2] hover:bg-[#FF6B5F] text-[#171717] hover:text-white border border-[#DDDCD7] rounded-lg transition-all cursor-pointer font-bold"
                            >
                              ✉️➔
                            </button>
                          )}
                          {stage.id === 'Pitched' && (
                            <button
                              onClick={() => handleStageChange(lead.id, 'Discussion')}
                              title="Advance to Discussion"
                              className="text-[11px] px-2 py-1 bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] rounded-lg transition-all cursor-pointer font-bold"
                            >
                              💬➔
                            </button>
                          )}
                          {stage.id === 'Discussion' && (
                            <button
                              onClick={() => handleStageChange(lead.id, 'Won')}
                              title="Mark as Won Deal"
                              className="text-[11px] px-2 py-1 bg-[#B8E94E]/30 hover:bg-[#B8E94E] text-[#171717] border border-[#DDDCD7] rounded-lg transition-all cursor-pointer font-bold"
                            >
                              🏆➔
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
