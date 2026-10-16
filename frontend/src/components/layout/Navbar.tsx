import React from 'react';
import { Bot, Command, Search, Sparkles } from 'lucide-react';
import { AICoreOrb } from '../search/AICoreOrb';

interface NavbarProps {
  onOpenChat: () => void;
  activeViewTitle: string;
  onOpenCommandPalette?: () => void;
  onOpenVoiceCall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenChat, 
  activeViewTitle,
  onOpenCommandPalette,
  onOpenVoiceCall
}) => {
  return (
    <header className="h-16 border-b border-[#DDDCD7] bg-[#F7F6F2]/90 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none">
      
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <AICoreOrb size="sm" state="idle" />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-[#171717]">
              LEADMIND <span className="text-[#3157FF]">AI</span>
            </span>
            <span className="text-[10px] font-medium text-[#6F6D68] hidden sm:inline">
              Find the businesses that matter.
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#DDDCD7] mx-1 hidden md:block" />

        <div className="hidden md:flex items-center gap-1.5 text-xs">
          <span className="text-[#6F6D68]">Workspace</span>
          <span className="text-[#DDDCD7]">/</span>
          <span className="font-semibold text-[#171717]">{activeViewTitle}</span>
        </div>
      </div>

      {/* Global Quick Action & Command Center Trigger */}
      <div className="flex items-center gap-3">
        {/* Command Search Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-xs text-[#6F6D68] hover:text-[#171717] shadow-sm transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[#3157FF]" />
          <span className="text-[11px] font-medium">Quick Command</span>
          <div className="flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded bg-[#EFEEE9] text-[10px] font-mono text-[#6F6D68]">
            <Command className="w-2.5 h-2.5" /> K
          </div>
        </button>

        {/* Live Agents Status */}
        <div className="hidden lg:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white border border-[#DDDCD7] text-[#171717] shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3157FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3157FF]"></span>
          </span>
          <span className="text-[11px] font-medium">
            12 Autonomous Agents <span className="text-[#3157FF] font-semibold">Active</span>
          </span>
        </div>

        {/* Quick Direct Dial Button */}
        <button
          onClick={onOpenVoiceCall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DDDCD7] hover:border-[#3157FF] text-xs font-semibold text-[#171717] hover:text-[#3157FF] shadow-sm transition-all active:scale-95 cursor-pointer"
          title="Direct Dial or Test Real Phone Call"
        >
          <span className="text-[#3157FF]">📞</span>
          <span className="hidden sm:inline">Direct Dial / Test Call</span>
        </button>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
      </div>
    </header>
  );
};
