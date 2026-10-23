import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  LayoutGrid, 
  ListFilter, 
  ArrowRight,
  Download,
  Filter,
  CheckCircle2,
  Globe,
  Layers,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AgentStepEvent, Lead } from '../../types';
import { AgentStepper } from './AgentStepper';
import { AICoreOrb } from './AICoreOrb';
import { MarketMap } from './MarketMap';
import { LeadUniverse } from './LeadUniverse';
import { LeadCard } from '../leads/LeadCard';
import { LeadsTable } from '../leads/LeadsTable';

interface FindLeadsViewProps {
  initialQuery?: string;
  initialNewLeadsOnly?: boolean;
  onViewDetails: (lead: Lead) => void;
  onToggleSave: (id: string, currentSaved: boolean) => void;
  onBulkAction: (ids: string[], action: string, extra?: any) => Promise<void>;
  onExportCSV: (ids: string[]) => void;
  onOpenPitch?: (lead: Lead) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

export const FindLeadsView: React.FC<FindLeadsViewProps> = ({
  initialQuery = '',
  initialNewLeadsOnly = false,
  onViewDetails,
  onToggleSave,
  onBulkAction,
  onExportCSV,
  onOpenPitch,
  onOpenVoiceCall,
  onOpenEmailApproval
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [newLeadsOnly, setNewLeadsOnly] = useState(initialNewLeadsOnly);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'universe' | 'grid' | 'table'>('grid');
  
  // Advanced manual constraints
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [service, setService] = useState('');
  const [leadCount, setLeadCount] = useState(25);
  const [exclusions, setExclusions] = useState('');
  const [mustHaveEmail, setMustHaveEmail] = useState(false);
  const [mustHavePhone, setMustHavePhone] = useState(false);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<AgentStepEvent | null>(null);
  const [discoveredLeads, setDiscoveredLeads] = useState<Lead[]>([]);
  const [filterQual, setFilterQual] = useState<string>('ALL');

  const suggestions = [
    { label: 'Find UK restaurants', prompt: 'Find UK restaurants that need graphic design and branding' },
    { label: 'Find London SaaS companies', prompt: 'Find high-growth SaaS startups in London, UK' },
    { label: 'Find 50 new leads in USA', prompt: 'Find 50 dental and medical clinics in New York, USA' },
    { label: 'Find Sydney agencies', prompt: 'Find digital marketing agencies in Sydney, Australia' },
  ];

  const startAutonomousSearch = async (overrideQuery?: string, overrideNewOnly?: boolean) => {
    const q = overrideQuery || query;
    if (!q.trim() || isRunning) return;

    setIsRunning(true);
    setCurrentEvent({
      step: 'understanding',
      title: 'Initializing LeadMind Autonomous Matrix',
      message: 'Agent 1 parsing requirements, territory constraints, and target niche...',
      progress: 8
    });
    setDiscoveredLeads([]);

    const manualOverrides: any = showAdvanced ? {
      country: country || undefined,
      city: city || undefined,
      industry: industry || undefined,
      service: service || undefined,
      lead_count: leadCount,
      exclusions: exclusions ? exclusions.split(',').map(s => s.trim()).filter(Boolean) : [],
      must_have_email: mustHaveEmail,
      must_have_phone: mustHavePhone,
      new_leads_only: overrideNewOnly !== undefined ? overrideNewOnly : newLeadsOnly
    } : undefined;

    try {
      const response = await fetch('/api/v1/search/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          manual_overrides: manualOverrides,
          new_leads_only: overrideNewOnly !== undefined ? overrideNewOnly : newLeadsOnly,
          user_id: 'default_user'
        })
      });

      if (!response.body) throw new Error('Readable stream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData: AgentStepEvent = JSON.parse(line.substring(6));
              setCurrentEvent(eventData);

              if (eventData.step === 'complete' && eventData.data?.leads) {
                setDiscoveredLeads(eventData.data.leads);
                try {
                  confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                } catch (e) {}
              }
            } catch (err) {
              console.error('Failed to parse SSE line:', err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setCurrentEvent({
        step: 'error',
        title: 'Execution Error',
        message: err.message || 'Failed to complete autonomous research workflow.',
        progress: 100
      });
    } finally {
      setIsRunning(false);
    }
  };

  const filteredLeads = discoveredLeads.filter(l => {
    if (filterQual === 'ALL') return true;
    return l.qualification === filterQual;
  });

  const highMatchCount = discoveredLeads.filter(l => (l.score || 0) >= 80).length;
  const medMatchCount = discoveredLeads.filter(l => (l.score || 0) >= 50 && (l.score || 0) < 80).length;
  const lowMatchCount = discoveredLeads.filter(l => (l.score || 0) < 50).length;

  return (
    <div className="relative space-y-8 max-w-6xl mx-auto pb-16">
      
      {/* Background Soft Abstract Shapes for Depth */}
      <div className="absolute -top-12 -left-20 w-80 h-80 rounded-full bg-[#3157FF]/8 filter blur-3xl pointer-events-none" />
      <div className="absolute top-10 -right-20 w-80 h-80 rounded-full bg-[#7657FF]/8 filter blur-3xl pointer-events-none" />
      <div className="absolute top-48 left-1/3 w-32 h-32 rounded-full bg-[#FF6B5F]/5 filter blur-2xl pointer-events-none" />

      {/* Hero Command Center Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center mb-1">
          <AICoreOrb state={isRunning ? 'searching' : 'idle'} size="md" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-[#171717] tracking-tight">
          LEADMIND <span className="text-[#3157FF]">AI</span>
        </h1>
        
        <p className="text-base sm:text-lg font-medium text-[#171717]">
          Find the businesses <span className="text-[#7657FF]">that matter.</span>
        </p>

        <p className="text-xs sm:text-sm text-[#6F6D68] max-w-md mx-auto">
          Tell AI who you're looking for and our autonomous multi-agent matrix will discover, enrich, qualify, and score high-intent leads.
        </p>
      </div>

      {/* Hero Command Box (Neutral Luxury with Cobalt-Violet-Coral Gradient Border) */}
      <div className="command-box-gradient p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5 uppercase tracking-wider">
            <span className="text-[#3157FF]">✦</span> What kind of leads are you looking for?
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#6F6D68] hover:text-[#171717] select-none transition-colors">
            <input
              type="checkbox"
              checked={newLeadsOnly}
              onChange={(e) => setNewLeadsOnly(e.target.checked)}
              className="rounded border-[#DDDCD7] text-[#3157FF] focus:ring-0 cursor-pointer"
            />
            <span>Exclude previously discovered leads</span>
          </label>
        </div>

        {/* Input prompt area */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#F7F6F2] rounded-xl border border-[#DDDCD7] p-2 focus-within:border-[#3157FF] transition-all">
          <div className="flex items-center flex-1 px-3 py-1">
            <Search className="w-4 h-4 text-[#6F6D68] mr-2 shrink-0" />
            <input
              type="text"
              placeholder="e.g. Find 50 UK restaurants that could need graphic design services"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') startAutonomousSearch(); }}
              className="w-full bg-transparent text-xs sm:text-sm text-[#171717] placeholder-[#9E9C96] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                showAdvanced 
                  ? 'bg-[#3157FF]/10 border-[#3157FF] text-[#3157FF]' 
                  : 'bg-white border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717]'
              }`}
              title="Filter Parameters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              disabled={isRunning || !query.trim()}
              onClick={() => startAutonomousSearch()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#3157FF] hover:bg-[#7657FF] disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-[#3157FF]/20 transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span>{isRunning ? 'Researching Market...' : 'Find Leads'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvanced && (
          <div className="p-4 bg-[#F7F6F2] border border-[#DDDCD7] rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-fadeIn">
            <div>
              <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Target Country</label>
              <input
                type="text"
                placeholder="e.g. United Kingdom"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Target City</label>
              <input
                type="text"
                placeholder="e.g. London"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Industry</label>
              <input
                type="text"
                placeholder="e.g. Restaurants, SaaS"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Service Offered</label>
              <input
                type="text"
                placeholder="e.g. Graphic Design, SEO"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
              />
            </div>
          </div>
        )}

        {/* Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F6D68] mr-1">
            Try asking:
          </span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(s.prompt);
                startAutonomousSearch(s.prompt);
              }}
              className="px-3 py-1 rounded-full bg-[#EFEEE9] hover:bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-[#6F6D68] hover:text-[#3157FF] text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Agent Stepper */}
      <AgentStepper 
        currentEvent={currentEvent} 
        isRunning={isRunning} 
        queryTopic={query || 'Businesses'}
        targetRegion={country || 'Global Territory'}
      />

      {/* Discovered Leads Workspace */}
      {discoveredLeads.length > 0 && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Results Header */}
          <div className="luxury-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6F6D68]">
                YOUR LEADS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
                {discoveredLeads.length} <span className="font-semibold text-[#6F6D68] text-lg">businesses found</span>
              </h2>
              
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className="font-bold text-[#3157FF] bg-[#3157FF]/10 px-2 py-0.5 rounded-md">
                  {highMatchCount} High Match
                </span>
                <span className="font-bold text-[#7657FF] bg-[#7657FF]/10 px-2 py-0.5 rounded-md">
                  {medMatchCount} Medium
                </span>
                {lowMatchCount > 0 && (
                  <span className="font-bold text-[#6F6D68] bg-[#EFEEE9] px-2 py-0.5 rounded-md">
                    {lowMatchCount} Low
                  </span>
                )}
              </div>
            </div>

            {/* View Mode and Export Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Qualification Filter Buttons */}
              <div className="flex items-center bg-[#EFEEE9] p-1 rounded-xl text-xs">
                {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setFilterQual(q)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterQual === q 
                        ? 'bg-[#3157FF] text-white shadow-sm' 
                        : 'text-[#6F6D68] hover:text-[#171717]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center bg-[#EFEEE9] p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#6F6D68]'}`}
                  title="Grid Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('universe')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'universe' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#6F6D68]'}`}
                  title="Lead Universe Matrix"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#6F6D68]'}`}
                  title="Directory Table"
                >
                  <ListFilter className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => onExportCSV(discoveredLeads.map(l => l.id))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#171717] text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#3157FF]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Territory Market Map */}
          <MarketMap 
            leads={discoveredLeads}
            onSelectLead={onViewDetails}
          />

          {/* Lead Universe / Grid / Table view */}
          {viewMode === 'universe' ? (
            <LeadUniverse
              leads={filteredLeads}
              onSelectLead={onViewDetails}
              onToggleSave={onToggleSave}
              onOpenVoiceCall={onOpenVoiceCall}
              onOpenEmailApproval={onOpenEmailApproval}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onViewDetails={onViewDetails}
                  onToggleSave={onToggleSave}
                  onOpenPitch={onOpenPitch}
                  onOpenVoiceCall={onOpenVoiceCall}
                  onOpenEmailApproval={onOpenEmailApproval}
                />
              ))}
            </div>
          ) : (
            <LeadsTable
              leads={filteredLeads}
              total={filteredLeads.length}
              isLoading={false}
              onViewDetails={onViewDetails}
              onToggleSave={onToggleSave}
              onBulkAction={onBulkAction}
              onExportCSV={onExportCSV}
              filterParams={{}}
              onFilterChange={() => {}}
              onOpenPitch={onOpenPitch}
              onOpenVoiceCall={onOpenVoiceCall}
              onOpenEmailApproval={onOpenEmailApproval}
            />
          )}
        </div>
      )}

    </div>
  );
};
