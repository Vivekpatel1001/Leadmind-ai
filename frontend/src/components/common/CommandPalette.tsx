import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Building2, Kanban, Bookmark, History, Cpu, ArrowRight, X } from 'lucide-react';
import { ActiveTab } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onRunSearch: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onRunSearch,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via state if mounted
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickActions = [
    { label: 'Find 50 UK Graphic Design Prospects', query: 'Find UK restaurants needing graphic design and branding', icon: Sparkles, color: 'text-[#3157FF]' },
    { label: 'Find London SaaS & Tech Startups', query: 'Find high-growth SaaS startups in London, UK', icon: Sparkles, color: 'text-[#7657FF]' },
    { label: 'Find New York E-Commerce Brands', query: 'Find US ecommerce brands in New York needing SEO', icon: Sparkles, color: 'text-[#FF6B5F]' },
    { label: 'Go to Autonomous CRM & Outreach Pipeline', tab: 'crm-pipeline' as ActiveTab, icon: Kanban, color: 'text-[#7657FF]' },
    { label: 'Go to Saved Leads', tab: 'saved-leads' as ActiveTab, icon: Bookmark, color: 'text-[#B8E94E]' },
    { label: 'Go to AI Memory Matrix', tab: 'memory' as ActiveTab, icon: Cpu, color: 'text-[#38C8C0]' },
  ];

  const filtered = quickActions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#171717]/40 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl border border-[#DDDCD7] shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#EFEEE9] gap-3">
          <Search className="w-5 h-5 text-[#6F6D68]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                onRunSearch(query.trim());
                onClose();
              }
            }}
            placeholder="Search leads, run AI commands, or navigate... (Press Enter to execute)"
            className="flex-1 bg-transparent text-sm text-[#171717] placeholder-[#9E9C96] focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-md text-[#6F6D68] hover:bg-[#EFEEE9] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {query.trim().length > 0 && (
            <button
              onClick={() => {
                onRunSearch(query.trim());
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#3157FF]/10 text-[#3157FF] hover:bg-[#3157FF]/15 transition-all text-left text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4" />
                <span>Execute Autonomous Search: "{query}"</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="px-3 py-1 text-[11px] font-semibold text-[#9E9C96] uppercase tracking-wider">
            Quick Actions & Navigations
          </div>

          {filtered.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.query) {
                  onRunSearch(item.query);
                } else if (item.tab) {
                  onNavigate(item.tab);
                }
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#F7F6F2] transition-all text-left text-xs font-medium text-[#171717] group"
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span>{item.label}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#DDDCD7] group-hover:text-[#3157FF] transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#F7F6F2] border-t border-[#EFEEE9] flex items-center justify-between text-[11px] text-[#6F6D68]">
          <span>LeadMind AI Command Palette</span>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#DDDCD7] text-[10px] font-mono">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
