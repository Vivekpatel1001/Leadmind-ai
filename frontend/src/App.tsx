import React, { useState, useEffect } from 'react';
import { ActiveTab, Lead, DashboardMetrics } from './types';
import { api } from './services/api';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { FindLeadsView } from './components/search/FindLeadsView';
import { LeadsTable } from './components/leads/LeadsTable';
import { LeadDetailModal } from './components/leads/LeadDetailModal';
import { SearchHistoryView } from './components/history/SearchHistoryView';
import { AIMemoryView } from './components/memory/AIMemoryView';
import { SettingsView } from './components/settings/SettingsView';
import { FloatingAssistant } from './components/chat/FloatingAssistant';
import { CrmPipeline } from './components/crm/CrmPipeline';
import { PitchModal } from './components/outreach/PitchModal';
import { VoiceCallingModal } from './components/calling/VoiceCallingModal';
import { EmailApprovalModal } from './components/outreach/EmailApprovalModal';
import { CommandPalette } from './components/common/CommandPalette';
import { Kanban, Building2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  
  // Leads Data Grid state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [filterParams, setFilterParams] = useState<Record<string, any>>({
    limit: 50,
    offset: 0
  });

  // Active Lead Modals & AI Outreach Engines
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [pitchingLead, setPitchingLead] = useState<Lead | null>(null);
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [isDirectDialOpen, setIsDirectDialOpen] = useState(false);
  const [emailApprovalLead, setEmailApprovalLead] = useState<Lead | null>(null);

  // Chat Assistant & Command Palette
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Search initial triggers
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [searchInitialNewOnly, setSearchInitialNewOnly] = useState(false);

  const loadDashboardData = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
    }
  };

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const params = { ...filterParams };
      if (activeTab === 'saved-leads') {
        params.saved_only = true;
      }
      const data = await api.getLeads(params);
      setLeads(data.leads);
      setTotalLeads(data.total);
    } catch (e) {
      console.error('Failed to load leads:', e);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'my-leads' || activeTab === 'saved-leads') {
      loadLeads();
    }
  }, [activeTab, filterParams]);

  // Lead Actions
  const handleToggleSave = async (id: string, currentSaved: boolean) => {
    try {
      const res = await api.toggleSaveLead(id, !currentSaved);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, saved: res.saved } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, saved: res.saved });
      }
      loadDashboardData();
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    try {
      const res = await api.updateLeadNotes(id, notes);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: res.notes } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, notes: res.notes });
      }
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
  };

  const handleSaveTags = async (id: string, tags: string[]) => {
    try {
      const res = await api.updateLeadTags(id, tags);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, tags: res.tags } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, tags: res.tags });
      }
    } catch (e) {
      console.error('Failed to save tags:', e);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.updateLeadStatus(id, status);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: res.status as any } : l));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, status: res.status as any });
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await api.deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      loadDashboardData();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleBulkAction = async (ids: string[], action: string, extra: any = {}) => {
    try {
      await api.bulkAction(ids, action, extra);
      loadLeads();
      loadDashboardData();
    } catch (e) {
      console.error('Bulk action failed:', e);
    }
  };

  const handleExportCSV = async (leadIds: string[] = []) => {
    try {
      const blob = await api.exportCSV(leadIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leadmind_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('CSV Export failed:', e);
    }
  };

  const handleQuickSearch = (query: string, newLeadsOnly: boolean = false) => {
    setSearchInitialQuery(query);
    setSearchInitialNewOnly(newLeadsOnly);
    setActiveTab('find-leads');
  };

  const getTabTitle = (tab: ActiveTab) => {
    switch(tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'find-leads': return 'Autonomous Lead Research';
      case 'my-leads': return 'Lead Directory';
      case 'crm-pipeline': return 'Sales & Outreach Pipeline';
      case 'saved-leads': return 'Saved Prospects';
      case 'history': return 'Execution Timeline';
      case 'memory': return 'Connected AI Memory Matrix';
      case 'settings': return 'Settings & Scoring Engine';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#171717] flex flex-col font-sans selection:bg-[#3157FF] selection:text-white">
      {/* Top Navbar */}
      <Navbar 
        onOpenChat={() => setIsChatOpen(true)} 
        activeViewTitle={getTabTitle(activeTab)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenVoiceCall={() => setIsDirectDialOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'saved-leads') {
              setFilterParams({ limit: 50, offset: 0, saved_only: true });
            } else if (tab === 'my-leads') {
              setFilterParams({ limit: 50, offset: 0 });
            }
          }}
          savedCount={metrics?.saved_leads || 0}
          totalLeadsCount={metrics?.total_leads || 0}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              onQuickSearch={handleQuickSearch}
              onViewDetails={(lead) => setSelectedLead(lead)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'find-leads' && (
            <FindLeadsView
              key={searchInitialQuery + String(searchInitialNewOnly)}
              initialQuery={searchInitialQuery}
              initialNewLeadsOnly={searchInitialNewOnly}
              onViewDetails={(lead) => setSelectedLead(lead)}
              onToggleSave={handleToggleSave}
              onBulkAction={handleBulkAction}
              onExportCSV={handleExportCSV}
              onOpenPitch={(lead) => setPitchingLead(lead)}
              onOpenVoiceCall={(lead) => setCallingLead(lead)}
              onOpenEmailApproval={(lead) => setEmailApprovalLead(lead)}
            />
          )}

          {activeTab === 'crm-pipeline' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-[#171717] tracking-tight flex items-center gap-2">
                  <Kanban className="w-5 h-5 text-[#3157FF]" />
                  <span>Sales & Outreach Pipeline</span>
                </h2>
                <p className="text-xs text-[#6F6D68] mt-0.5">
                  Track client lifecycle stages from Discovered & Enriched to Pitched, Discussion, and Closed Won.
                </p>
              </div>

              <CrmPipeline
                onOpenPitch={(lead) => setPitchingLead(lead)}
                onLeadSelect={(lead) => setSelectedLead(lead)}
                onOpenVoiceCall={(lead) => setCallingLead(lead)}
                onOpenEmailApproval={(lead) => setEmailApprovalLead(lead)}
              />
            </div>
          )}

          {(activeTab === 'my-leads' || activeTab === 'saved-leads') && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-[#171717] tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#3157FF]" />
                  <span>{activeTab === 'saved-leads' ? 'Saved Prospects & Outreach Leads' : 'All Discovered Business Leads'}</span>
                </h2>
                <p className="text-xs text-[#6F6D68] mt-0.5">
                  {activeTab === 'saved-leads' 
                    ? 'Shortlisted prospects ready for cold email, phone call, or LinkedIn campaigns.' 
                    : 'Searchable directory of verified leads from all autonomous research runs.'}
                </p>
              </div>

              <LeadsTable
                leads={leads}
                total={totalLeads}
                isLoading={isLoadingLeads}
                onViewDetails={(lead) => setSelectedLead(lead)}
                onToggleSave={handleToggleSave}
                onBulkAction={handleBulkAction}
                onExportCSV={handleExportCSV}
                filterParams={filterParams}
                onFilterChange={(newParams) => setFilterParams(newParams)}
                onOpenPitch={(lead) => setPitchingLead(lead)}
                onOpenVoiceCall={(lead) => setCallingLead(lead)}
                onOpenEmailApproval={(lead) => setEmailApprovalLead(lead)}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <SearchHistoryView
              onReRunSearch={handleQuickSearch}
              onSelectSearch={(id) => {}}
            />
          )}

          {activeTab === 'memory' && (
            <AIMemoryView
              onViewDetails={(lead) => setSelectedLead(lead)}
              onToggleSave={handleToggleSave}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}

        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onRunSearch={handleQuickSearch}
      />

      {/* Deep-Dive Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onToggleSave={handleToggleSave}
        onSaveNotes={handleSaveNotes}
        onSaveTags={handleSaveTags}
        onUpdateStatus={handleUpdateStatus}
        onDeleteLead={handleDeleteLead}
        onOpenVoiceCall={(lead) => setCallingLead(lead)}
        onOpenEmailApproval={(lead) => setEmailApprovalLead(lead)}
      />

      {/* AI Cold Pitch Package Drawer */}
      <PitchModal
        lead={pitchingLead}
        isOpen={Boolean(pitchingLead)}
        onClose={() => setPitchingLead(null)}
        onLeadUpdated={(updated) => {
          setPitchingLead(updated);
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          if (selectedLead && selectedLead.id === updated.id) {
            setSelectedLead(updated);
          }
          loadDashboardData();
        }}
      />

      {/* Agent 11: AI Voice Calling & Live Phone Forwarding Modal */}
      <VoiceCallingModal
        lead={callingLead}
        isOpen={Boolean(callingLead) || isDirectDialOpen}
        onClose={() => {
          setCallingLead(null);
          setIsDirectDialOpen(false);
        }}
        onLeadUpdated={(updated) => {
          setCallingLead(updated);
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          if (selectedLead && selectedLead.id === updated.id) {
            setSelectedLead(updated);
          }
          loadDashboardData();
        }}
      />

      {/* Agent 12: Human-in-the-Loop AI Email Dispatch Modal */}
      <EmailApprovalModal
        lead={emailApprovalLead}
        isOpen={Boolean(emailApprovalLead)}
        onClose={() => setEmailApprovalLead(null)}
        onLeadUpdated={(updated) => {
          setEmailApprovalLead(updated);
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          if (selectedLead && selectedLead.id === updated.id) {
            setSelectedLead(updated);
          }
          loadDashboardData();
        }}
      />

      {/* Floating AI Chat Assistant */}
      <FloatingAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onSearchFromChat={handleQuickSearch}
        onViewDetails={(lead) => setSelectedLead(lead)}
        onExportCSV={() => handleExportCSV()}
      />
    </div>
  );
}

export default App;
