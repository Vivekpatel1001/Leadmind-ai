import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Bookmark, 
  Trash2, 
  ExternalLink, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  Tag, 
  Phone 
} from 'lucide-react';
import { Lead } from '../../types';
import { LeadScoreArc } from './LeadScoreArc';

interface LeadsTableProps {
  leads: Lead[];
  total: number;
  isLoading: boolean;
  onViewDetails: (lead: Lead) => void;
  onToggleSave: (id: string, currentSaved: boolean) => void;
  onBulkAction: (ids: string[], action: string, extra?: any) => Promise<void>;
  onExportCSV: (ids: string[]) => void;
  filterParams: Record<string, any>;
  onFilterChange: (params: Record<string, any>) => void;
  onOpenPitch?: (lead: Lead) => void;
  onOpenVoiceCall?: (lead: Lead) => void;
  onOpenEmailApproval?: (lead: Lead) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  total,
  isLoading,
  onViewDetails,
  onToggleSave,
  onBulkAction,
  onExportCSV,
  filterParams,
  onFilterChange,
  onOpenPitch,
  onOpenVoiceCall,
  onOpenEmailApproval
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [showTagModal, setShowTagModal] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(leads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    await onBulkAction(selectedIds, 'status', { status });
    setSelectedIds([]);
  };

  const handleBulkSave = async (save: boolean) => {
    if (selectedIds.length === 0) return;
    await onBulkAction(selectedIds, save ? 'save' : 'unsave');
    setSelectedIds([]);
  };

  const handleBulkTagSubmit = async () => {
    if (selectedIds.length === 0 || !bulkTagInput.trim()) return;
    await onBulkAction(selectedIds, 'tag', { tag: bulkTagInput.trim() });
    setBulkTagInput('');
    setShowTagModal(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) {
      await onBulkAction(selectedIds, 'delete');
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Toolbar */}
      <div className="luxury-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#6F6D68] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, city, industry..."
              value={filterParams.query || ''}
              onChange={(e) => onFilterChange({ ...filterParams, query: e.target.value, offset: 0 })}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF]"
            />
          </div>

          <button
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showFiltersDrawer 
                ? 'bg-[#3157FF]/10 border-[#3157FF] text-[#3157FF]' 
                : 'bg-white border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Right side bulk actions & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#EFEEE9] p-1 rounded-xl border border-[#DDDCD7] animate-fadeIn">
              <span className="text-xs font-bold text-[#3157FF] bg-[#3157FF]/10 border border-[#3157FF]/20 px-2.5 py-1 rounded-lg">
                {selectedIds.length} Selected
              </span>

              <button
                onClick={() => handleBulkSave(true)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-[#171717] transition-all cursor-pointer shadow-xs"
              >
                Save
              </button>

              <button
                onClick={() => setShowTagModal(true)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-[#171717] transition-all cursor-pointer shadow-xs"
              >
                Tag
              </button>

              <button
                onClick={() => handleBulkStatus('contacted')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F7F6F2] text-xs font-semibold text-[#171717] transition-all cursor-pointer shadow-xs"
              >
                Mark Contacted
              </button>

              <button
                onClick={handleBulkDelete}
                className="p-1.5 rounded-lg bg-[#FF6B5F]/10 hover:bg-[#FF6B5F]/20 border border-[#FF6B5F]/30 text-[#FF6B5F] transition-all cursor-pointer"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => onExportCSV(selectedIds)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-xs font-semibold text-[#171717] transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#3157FF]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Options Drawer */}
      {showFiltersDrawer && (
        <div className="p-4 bg-white border border-[#DDDCD7] rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs animate-fadeIn shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Country</label>
            <input
              type="text"
              placeholder="e.g. United Kingdom"
              value={filterParams.country || ''}
              onChange={(e) => onFilterChange({ ...filterParams, country: e.target.value, offset: 0 })}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">City</label>
            <input
              type="text"
              placeholder="e.g. London"
              value={filterParams.city || ''}
              onChange={(e) => onFilterChange({ ...filterParams, city: e.target.value, offset: 0 })}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider mb-1 block">Qualification</label>
            <select
              value={filterParams.qualification || ''}
              onChange={(e) => onFilterChange({ ...filterParams, qualification: e.target.value || undefined, offset: 0 })}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-[#171717] focus:outline-none focus:border-[#3157FF]"
            >
              <option value="">All Matches</option>
              <option value="HIGH">HIGH Match</option>
              <option value="MEDIUM">MEDIUM Match</option>
              <option value="LOW">LOW Match</option>
            </select>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <label className="flex items-center gap-2 cursor-pointer text-[#6F6D68] hover:text-[#171717]">
              <input
                type="checkbox"
                checked={!!filterParams.has_email}
                onChange={(e) => onFilterChange({ ...filterParams, has_email: e.target.checked || undefined, offset: 0 })}
                className="rounded border-[#DDDCD7] text-[#3157FF] focus:ring-0"
              />
              <span className="font-semibold text-xs text-[#171717]">Has Email</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-[#6F6D68] hover:text-[#171717]">
              <input
                type="checkbox"
                checked={!!filterParams.has_phone}
                onChange={(e) => onFilterChange({ ...filterParams, has_phone: e.target.checked || undefined, offset: 0 })}
                className="rounded border-[#DDDCD7] text-[#3157FF] focus:ring-0"
              />
              <span className="font-semibold text-xs text-[#171717]">Has Phone</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Table Grid */}
      <div className="luxury-card rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFEEE9]/80 border-b border-[#DDDCD7] text-[#6F6D68] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedIds.length === leads.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#DDDCD7] text-[#3157FF]"
                  />
                </th>
                <th className="p-3.5">Business & Category</th>
                <th className="p-3.5">Territory</th>
                <th className="p-3.5">Contact Intelligence</th>
                <th className="p-3.5 text-center">AI Fit</th>
                <th className="p-3.5 text-center">Match Level</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EFEEE9] bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-[#6F6D68]">
                    <div className="flex items-center justify-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-[#3157FF] animate-spin" />
                      <span className="text-sm font-semibold text-[#171717]">Querying verified business records...</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center text-[#6F6D68]">
                    <p className="font-bold text-[#171717] text-sm mb-1">No matching businesses found</p>
                    <p className="text-xs text-[#6F6D68]">Try adjusting your filters or start a new autonomous research run.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const companyName = lead.business_name || lead.company_name || 'Business';
                  const score = lead.lead_score ?? lead.score ?? 0;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-[#F7F6F2] transition-colors ${
                        isSelected ? 'bg-[#3157FF]/5' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead.id)}
                          className="rounded border-[#DDDCD7] text-[#3157FF]"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span 
                              onClick={() => onViewDetails(lead)} 
                              className="font-bold text-[#171717] hover:text-[#3157FF] transition-colors cursor-pointer"
                            >
                              {companyName}
                            </span>
                            {lead.verified && (
                              <span title="Verified source">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#3157FF] shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6F6D68]">{lead.industry || 'Business'}</p>
                        </div>
                      </td>

                      <td className="p-3.5 text-[#171717]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-[#9E9C96] shrink-0" />
                          <span>{[lead.city, lead.country].filter(Boolean).join(', ') || 'Global'}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-[#6F6D68]">
                            <Mail className="w-3 h-3 text-[#9E9C96] shrink-0" />
                            <span className={lead.email && lead.email !== 'Not found' ? 'text-[#171717] font-medium' : 'text-[#9E9C96] italic'}>
                              {lead.email || 'Not found'}
                            </span>
                          </div>
                          {lead.website && (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#3157FF] hover:underline flex items-center gap-1 truncate max-w-[140px] font-semibold"
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{lead.website.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex justify-center">
                          <LeadScoreArc score={score} size={36} strokeWidth={3} />
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          lead.qualification === 'HIGH' ? 'bg-[#3157FF]/10 text-[#3157FF] border-[#3157FF]/20' :
                          lead.qualification === 'MEDIUM' ? 'bg-[#7657FF]/10 text-[#7657FF] border-[#7657FF]/20' :
                          'bg-[#EFEEE9] text-[#6F6D68] border-[#DDDCD7]'
                        }`}>
                          {lead.qualification}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-[11px] font-semibold text-[#171717] capitalize px-2 py-0.5 rounded-md bg-[#EFEEE9]">
                          {lead.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onToggleSave(lead.id, lead.saved)}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              lead.saved
                                ? 'bg-[#B8E94E]/20 border-[#B8E94E] text-[#171717]'
                                : 'bg-[#F7F6F2] border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717]'
                            }`}
                            title={lead.saved ? 'Saved' : 'Save'}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={lead.saved ? 'currentColor' : 'none'} />
                          </button>

                          {onOpenVoiceCall && (
                            <button
                              onClick={() => onOpenVoiceCall(lead)}
                              className="p-1.5 rounded-xl bg-[#F7F6F2] hover:bg-[#3157FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#3157FF] transition-all cursor-pointer"
                              title="AI Voice Call"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#3157FF] hover:text-white" />
                            </button>
                          )}

                          {onOpenEmailApproval && (
                            <button
                              onClick={() => onOpenEmailApproval(lead)}
                              className="p-1.5 rounded-xl bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#7657FF] transition-all cursor-pointer"
                              title="AI Email Dispatch"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#7657FF] hover:text-white" />
                            </button>
                          )}

                          {onOpenPitch && (
                            <button
                              onClick={() => onOpenPitch(lead)}
                              className="px-2.5 py-1 rounded-xl bg-[#F7F6F2] hover:bg-[#7657FF] text-[#171717] hover:text-white border border-[#DDDCD7] hover:border-[#7657FF] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                              title="Generate AI Cold Pitch"
                            >
                              <Zap className="w-3 h-3 text-[#FF6B5F]" />
                              <span>Pitch</span>
                            </button>
                          )}

                          <button
                            onClick={() => onViewDetails(lead)}
                            className="px-3 py-1 rounded-xl bg-[#171717] hover:bg-[#3157FF] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 bg-[#EFEEE9]/50 border-t border-[#DDDCD7] flex items-center justify-between text-xs text-[#6F6D68]">
          <div>
            Showing <strong className="text-[#171717] font-bold">{leads.length}</strong> of <strong className="text-[#171717] font-bold">{total}</strong> verified prospects
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={(filterParams.offset || 0) === 0}
              onClick={() => onFilterChange({ ...filterParams, offset: Math.max(0, (filterParams.offset || 0) - (filterParams.limit || 50)) })}
              className="p-1.5 rounded-xl bg-white border border-[#DDDCD7] text-[#171717] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F6F2] transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={(filterParams.offset || 0) + (filterParams.limit || 50) >= total}
              onClick={() => onFilterChange({ ...filterParams, offset: (filterParams.offset || 0) + (filterParams.limit || 50) })}
              className="p-1.5 rounded-xl bg-white border border-[#DDDCD7] text-[#171717] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F6F2] transition-all cursor-pointer shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#DDDCD7] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[#171717]">Add Tag to {selectedIds.length} Leads</h3>
            <input
              type="text"
              placeholder="Tag name (e.g. Q4 Priority)"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-3.5 py-2 rounded-xl bg-[#EFEEE9] text-[#6F6D68] hover:text-[#171717] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkTagSubmit}
                className="px-4 py-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-semibold shadow-sm"
              >
                Apply Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
