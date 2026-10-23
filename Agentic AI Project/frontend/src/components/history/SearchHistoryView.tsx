import React, { useEffect, useState } from 'react';
import { 
  History, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  Search,
  Globe2,
  Zap,
  ListFilter
} from 'lucide-react';
import { SearchHistoryItem } from '../../types';
import { api } from '../../services/api';

interface SearchHistoryViewProps {
  onReRunSearch: (query: string, newLeadsOnly?: boolean) => void;
  onSelectSearch: (searchId: string) => void;
}

export const SearchHistoryView: React.FC<SearchHistoryViewProps> = ({
  onReRunSearch,
  onSelectSearch
}) => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSearchHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load search history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#171717] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#3157FF]" />
            <span>Search History & Execution Timeline</span>
          </h2>
          <p className="text-xs text-[#6F6D68] mt-0.5">
            Editorial log of autonomous agent research runs and memory milestones.
          </p>
        </div>

        <button
          onClick={loadHistory}
          className="p-2.5 rounded-xl bg-white hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#6F6D68] hover:text-[#171717] transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* History Items Timeline */}
      {isLoading ? (
        <div className="p-16 text-center text-[#6F6D68] luxury-card rounded-2xl">
          <div className="flex items-center justify-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#3157FF] animate-spin" />
            <span className="text-sm font-semibold text-[#171717]">Loading execution timeline...</span>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 text-center text-[#6F6D68] luxury-card rounded-2xl space-y-2">
          <p className="text-base font-bold text-[#171717]">No searches recorded yet</p>
          <p className="text-xs text-[#6F6D68]">Launch a lead research run to track execution history.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-[#DDDCD7] ml-4 space-y-6 pl-6">
          {history.map((item, idx) => (
            <div
              key={item.id}
              className="relative luxury-card p-5 rounded-2xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
            >
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[31px] top-6 w-3 h-3 rounded-full bg-[#3157FF] ring-4 ring-[#F7F6F2]" />

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-[#171717] text-sm">
                    "{item.query}"
                  </h4>
                  {item.excluded_previous && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#7657FF]/10 text-[#7657FF] border border-[#7657FF]/20 rounded-full">
                      Incremental (New Only)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[#6F6D68] text-xs">
                  <span className="text-[#171717] font-semibold">{item.parsed_requirements?.industry || 'General Business'}</span>
                  <span className="text-[#DDDCD7]">·</span>
                  <span>{item.parsed_requirements?.country || 'UK'}</span>
                  {item.parsed_requirements?.service && (
                    <>
                      <span className="text-[#DDDCD7]">·</span>
                      <span className="text-[#3157FF] font-semibold">Need: {item.parsed_requirements.service}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-[#6F6D68] pt-2 border-t border-[#EFEEE9]">
                  <span className="flex items-center gap-1.5 text-[#171717] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#3157FF]" />
                    <strong>{item.total_found}</strong> businesses ({item.high_match_count} High Fit)
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#9E9C96]" />
                    {item.execution_time_seconds}s execution
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#9E9C96]" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectSearch(item.id)}
                  className="px-3.5 py-2 rounded-xl bg-[#3157FF]/10 hover:bg-[#3157FF]/20 border border-[#3157FF]/20 text-[#3157FF] text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5" />
                    View Results
                  </span>
                </button>

                <button
                  onClick={() => onReRunSearch(item.query)}
                  className="px-3.5 py-2 rounded-xl bg-[#F7F6F2] hover:bg-[#EFEEE9] border border-[#DDDCD7] text-[#171717] text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  Re-run
                </button>

                <button
                  onClick={() => onReRunSearch(item.query, true)}
                  className="px-4 py-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Find New
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
