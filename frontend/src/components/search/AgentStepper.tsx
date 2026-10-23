import React from 'react';
import { CheckCircle2, Loader2, Sparkles, ArrowRight, Brain, Zap } from 'lucide-react';
import { AgentStepEvent } from '../../types';

interface AgentStepperProps {
  currentEvent: AgentStepEvent | null;
  isRunning: boolean;
  queryTopic?: string;
  targetRegion?: string;
}

export const AgentStepper: React.FC<AgentStepperProps> = ({ 
  currentEvent, 
  isRunning,
  queryTopic = 'Target Businesses',
  targetRegion = 'Market Territory'
}) => {
  if (!currentEvent && !isRunning) return null;

  const stages = [
    { key: 'understanding', label: 'UNDERSTAND', desc: 'Requirements & Intent', accent: 'cobalt' },
    { key: 'planning', label: 'DISCOVER', desc: 'Territory Discovery', accent: 'violet' },
    { key: 'researching', label: 'RESEARCH', desc: 'Multi-Source Registry', accent: 'coral' },
    { key: 'deduplicating', label: 'QUALIFY', desc: 'Deduplicate & Clean', accent: 'violet' },
    { key: 'qualifying', label: 'SCORE', desc: 'AI Fit & Pain Points', accent: 'cobalt' },
    { key: 'memory_check', label: 'REMEMBER', desc: 'Persistent Knowledge', accent: 'lime' },
  ];

  const getStageStatus = (stageKey: string) => {
    if (!currentEvent) return 'pending';
    if (currentEvent.step === 'complete') return 'completed';
    if (currentEvent.step === 'error') return 'error';

    const order = ['understanding', 'planning', 'researching', 'deduplicating', 'qualifying', 'memory_check', 'complete'];
    const currentIndex = order.indexOf(currentEvent.step);
    const stageIndex = order.indexOf(stageKey);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-[#DDDCD7] p-6 shadow-sm space-y-6 transition-all">
      
      {/* Top Research Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFEEE9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#3157FF] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3157FF]" />
              Researching Your Market
            </span>
          </div>
          <h3 className="text-base font-bold text-[#171717] mt-1">
            {targetRegion.toUpperCase()} <span className="text-[#6F6D68] font-normal mx-1">→</span> {queryTopic.toUpperCase()}
          </h3>
          <p className="text-xs text-[#6F6D68] mt-0.5">
            {currentEvent?.message || 'Coordinating specialized agents across APIs and registries...'}
          </p>
        </div>

        {/* Progress % Indicator */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-mono font-bold text-[#3157FF] bg-[#3157FF]/10 px-3 py-1 rounded-full border border-[#3157FF]/20">
            {currentEvent?.progress || 0}% Complete
          </span>
          <div className="w-32 bg-[#EFEEE9] h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#3157FF] via-[#7657FF] to-[#FF6B5F] transition-all duration-300 rounded-full"
              style={{ width: `${currentEvent?.progress || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* High-Level Node Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stages.map((stage) => {
          const status = getStageStatus(stage.key);
          
          return (
            <div
              key={stage.key}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                status === 'completed'
                  ? 'bg-[#3157FF]/5 border-[#3157FF]/30 text-[#171717]'
                  : status === 'active'
                  ? 'bg-[#7657FF]/10 border-[#7657FF] text-[#171717] shadow-sm'
                  : 'bg-[#F7F6F2] border-[#DDDCD7] text-[#6F6D68] opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider">
                  {stage.label}
                </span>

                {status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-[#3157FF]" />
                )}
                {status === 'active' && (
                  <Loader2 className="w-4 h-4 text-[#7657FF] animate-spin" />
                )}
                {status === 'pending' && (
                  <span className="w-2 h-2 rounded-full bg-[#DDDCD7]" />
                )}
              </div>

              <span className="text-[10px] text-[#6F6D68] truncate font-medium">
                {stage.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
