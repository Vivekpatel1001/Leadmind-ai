import React, { useEffect, useState } from 'react';
import { 
  Brain, 
  Sparkles, 
  Send, 
  Trash2, 
  RotateCcw, 
  Globe, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { UserPreference, Lead } from '../../types';
import { api } from '../../services/api';
import { LeadCard } from '../leads/LeadCard';

interface AIMemoryViewProps {
  onViewDetails: (lead: Lead) => void;
  onToggleSave: (id: string, currentSaved: boolean) => void;
}

export const AIMemoryView: React.FC<AIMemoryViewProps> = ({
  onViewDetails,
  onToggleSave
}) => {
  const [profile, setProfile] = useState<{
    top_countries: string[];
    top_industries: string[];
    top_services: string[];
    preferences_list: UserPreference[];
  } | null>(null);
  
  const [queryInput, setQueryInput] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any | null>(null);

  const loadMemory = async () => {
    try {
      const data = await api.getMemoryProfile();
      setProfile(data);
    } catch (e) {
      console.error('Failed to load memory:', e);
    }
  };

  useEffect(() => {
    loadMemory();
  }, []);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isQuerying) return;

    setIsQuerying(true);
    try {
      const res = await api.queryMemory(queryInput.trim());
      setQueryResult(res);
    } catch (e) {
      console.error('Memory query failed:', e);
    } finally {
      setIsQuerying(false);
    }
  };

  const sampleMemoryQueries = [
    'Show the UK graphic design leads we found',
    'Show only the leads I saved',
    'What did we search yesterday?'
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#171717] tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#3157FF]" />
            <span>Connected AI Memory Matrix</span>
          </h2>
          <p className="text-xs text-[#6F6D68] mt-0.5">
            Hierarchical learned knowledge, recurring industry niches, geographic targets, and semantic recall.
          </p>
        </div>

        <button
          onClick={loadMemory}
          className="p-2.5 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717] transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Connected Knowledge Hierarchy Graph Visualizer */}
      <div className="luxury-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#EFEEE9] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3157FF]" />
            <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
              Connected Memory Graph (Country → Sector → Service)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#6F6D68]">
            Auto-synced across runs
          </span>
        </div>

        {/* Visual Graph Nodes */}
        <div className="relative p-4 bg-[#F7F6F2] rounded-xl border border-[#DDDCD7] flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto">
          {/* Level 1: Root */}
          <div className="flex flex-col items-center p-3 rounded-xl bg-white border border-[#DDDCD7] shadow-xs text-center min-w-[120px]">
            <span className="w-6 h-6 rounded-full bg-[#3157FF]/10 text-[#3157FF] flex items-center justify-center font-bold text-xs mb-1">
              AI
            </span>
            <span className="text-xs font-bold text-[#171717]">LeadMind</span>
            <span className="text-[10px] text-[#6F6D68]">Central Core</span>
          </div>

          <div className="text-[#DDDCD7] hidden md:block">➔</div>

          {/* Level 2: Top Countries */}
          <div className="space-y-2 min-w-[140px]">
            <span className="text-[10px] font-bold text-[#6F6D68] uppercase block text-center">Countries</span>
            {(profile?.top_countries?.slice(0, 3) || ['United Kingdom', 'United States']).map((c, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg bg-white border border-[#3157FF]/30 text-xs font-semibold text-[#171717] flex items-center gap-2 shadow-xs">
                <Globe className="w-3 h-3 text-[#3157FF]" />
                <span className="truncate">{c}</span>
              </div>
            ))}
          </div>

          <div className="text-[#DDDCD7] hidden md:block">➔</div>

          {/* Level 3: Top Sectors */}
          <div className="space-y-2 min-w-[150px]">
            <span className="text-[10px] font-bold text-[#6F6D68] uppercase block text-center">Sectors</span>
            {(profile?.top_industries?.slice(0, 3) || ['Restaurants', 'SaaS Tech', 'Healthcare']).map((ind, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg bg-white border border-[#7657FF]/30 text-xs font-semibold text-[#171717] flex items-center gap-2 shadow-xs">
                <Briefcase className="w-3 h-3 text-[#7657FF]" />
                <span className="truncate">{ind}</span>
              </div>
            ))}
          </div>

          <div className="text-[#DDDCD7] hidden md:block">➔</div>

          {/* Level 4: Services */}
          <div className="space-y-2 min-w-[150px]">
            <span className="text-[10px] font-bold text-[#6F6D68] uppercase block text-center">Services Offered</span>
            {(profile?.top_services?.slice(0, 3) || ['Graphic Design', 'SEO Optimization', 'Web Dev']).map((srv, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg bg-white border border-[#FF6B5F]/30 text-xs font-semibold text-[#171717] flex items-center gap-2 shadow-xs">
                <Target className="w-3 h-3 text-[#FF6B5F]" />
                <span className="truncate">{srv}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Semantic Memory Query Bar */}
      <div className="luxury-card p-6 sm:p-7 space-y-4 rounded-2xl">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Semantic Memory Search</h3>
          <p className="text-xs text-[#6F6D68]">Ask the memory matrix about past searches, discovered companies, or preferences:</p>
        </div>

        <form onSubmit={handleQuerySubmit} className="relative flex items-center bg-[#F7F6F2] border border-[#DDDCD7] focus-within:border-[#3157FF] rounded-xl p-1.5 transition-all">
          <Brain className="w-4 h-4 text-[#3157FF] ml-3 shrink-0" />
          <input
            type="text"
            placeholder='e.g. "Show me the UK graphic design leads we found" or "Show saved leads"'
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#171717] placeholder-[#9E9C96] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isQuerying || !queryInput.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3157FF] hover:bg-[#2745d8] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <span>{isQuerying ? 'Querying...' : 'Query Memory'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs text-[#6F6D68] pt-1">
          <span className="font-semibold text-[#171717]">Quick queries:</span>
          {sampleMemoryQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => { setQueryInput(q); }}
              className="px-3 py-1 rounded-full bg-[#EFEEE9] hover:bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#6F6D68] hover:text-[#3157FF] transition-all cursor-pointer text-[11px]"
            >
              "{q}"
            </button>
          ))}
        </div>

        {/* Result Card */}
        {queryResult && (
          <div className="p-5 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3157FF]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Memory Retrieval Result</span>
            </div>
            
            <p className="text-xs text-[#171717] leading-relaxed bg-white p-4 rounded-xl border border-[#DDDCD7] shadow-xs">
              {queryResult.answer}
            </p>

            {queryResult.matched_leads && queryResult.matched_leads.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold text-[#6F6D68] uppercase tracking-wider">
                  Associated Leads ({queryResult.matched_leads.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queryResult.matched_leads.map((l: Lead) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      onViewDetails={onViewDetails}
                      onToggleSave={onToggleSave}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Memory Entities List */}
      <div className="luxury-card rounded-2xl p-6 space-y-4">
        <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
          Memory Entities & Key Preferences ({profile?.preferences_list?.length || 0})
        </h4>

        <div className="divide-y divide-[#EFEEE9]">
          {profile?.preferences_list && profile.preferences_list.length > 0 ? (
            profile.preferences_list.map((pref) => (
              <div key={pref.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#171717]">{pref.key}</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#EFEEE9] text-[10px] text-[#6F6D68] uppercase font-bold">
                      {pref.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6F6D68] mt-0.5">Observed in {pref.frequency} searches</p>
                </div>

                <button
                  onClick={async () => {
                    await api.deleteMemoryPreference(pref.id);
                    loadMemory();
                  }}
                  className="p-1.5 rounded-lg text-[#6F6D68] hover:text-[#FF6B5F] hover:bg-[#FF6B5F]/10 transition-all cursor-pointer"
                  title="Remove preference"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-[#6F6D68] italic py-3">No entities stored in memory matrix yet.</p>
          )}
        </div>
      </div>

    </div>
  );
};
