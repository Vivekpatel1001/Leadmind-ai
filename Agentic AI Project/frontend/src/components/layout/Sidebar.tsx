import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Building2, 
  History, 
  Bookmark, 
  Cpu, 
  Settings,
  Sparkles,
  Kanban,
  ShieldCheck,
  Zap,
  Globe2
} from 'lucide-react';
import { ActiveTab } from '../../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount?: number;
  totalLeadsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onSelectTab,
  savedCount = 0,
  totalLeadsCount = 0
}) => {
  const mainNav = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'find-leads' as ActiveTab, label: 'Find Leads', icon: Search, badge: 'AI Core' },
    { id: 'my-leads' as ActiveTab, label: 'All Leads', icon: Building2, count: totalLeadsCount },
    { id: 'crm-pipeline' as ActiveTab, label: 'Sales Pipeline', icon: Kanban, badge: 'Auto-CRM' },
    { id: 'saved-leads' as ActiveTab, label: 'Saved Prospects', icon: Bookmark, count: savedCount },
  ];

  const secondaryNav = [
    { id: 'history' as ActiveTab, label: 'Search History', icon: History },
    { id: 'memory' as ActiveTab, label: 'AI Memory Matrix', icon: Cpu },
    { id: 'settings' as ActiveTab, label: 'Settings & Models', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#DDDCD7] bg-[#F7F6F2] flex flex-col justify-between p-4 h-full select-none shrink-0">
      <div className="space-y-6">
        
        {/* Navigation Group: Prospecting */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6F6D68] mb-2">
            Prospecting Engine
          </p>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white text-[#171717] font-semibold border border-[#DDDCD7] shadow-sm' 
                    : 'text-[#6F6D68] hover:text-[#171717] hover:bg-[#EFEEE9]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#3157FF]' : 'text-[#6F6D68]'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                      isActive 
                        ? 'bg-[#3157FF]/10 text-[#3157FF] border-[#3157FF]/20' 
                        : 'bg-[#EFEEE9] text-[#6F6D68] border-[#DDDCD7]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-[#171717] px-1.5 py-0.5 rounded bg-[#EFEEE9]">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation Group: Intelligence */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6F6D68] mb-2">
            Intelligence & Memory
          </p>
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white text-[#171717] font-semibold border border-[#DDDCD7] shadow-sm' 
                    : 'text-[#6F6D68] hover:text-[#171717] hover:bg-[#EFEEE9]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#3157FF]' : 'text-[#6F6D68]'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Provenance Card */}
      <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#DDDCD7] shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717]">
          <ShieldCheck className="w-4 h-4 text-[#3157FF]" />
          <span>Real-World Data Engine</span>
        </div>
        <p className="text-[11px] text-[#6F6D68] leading-relaxed">
          Autonomous multi-agent research with Tavily Live API & verified geographic targeting.
        </p>
      </div>
    </aside>
  );
};
