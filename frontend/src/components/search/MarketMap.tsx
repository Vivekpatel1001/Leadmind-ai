import React from 'react';
import { Lead } from '../../types';
import { MapPin, Globe } from 'lucide-react';

interface MarketMapProps {
  leads: Lead[];
  activeRegion?: string;
  onSelectLead?: (lead: Lead) => void;
}

export const MarketMap: React.FC<MarketMapProps> = ({
  leads = [],
  activeRegion = 'Global',
  onSelectLead,
}) => {
  const mapDots = leads.map((lead, idx) => {
    const seed = (lead.id.charCodeAt(0) || 50) + idx * 17;
    const country = (lead.country || '').toLowerCase();
    const companyName = lead.business_name || lead.company_name || 'Company';
    const score = lead.lead_score ?? lead.score ?? 0;
    
    let baseLeft = 48;
    let baseTop = 38;
    
    if (country.includes('uk') || country.includes('united kingdom') || country.includes('london') || country.includes('england')) {
      baseLeft = 46 + (seed % 6);
      baseTop = 26 + ((seed * 3) % 8);
    } else if (country.includes('us') || country.includes('united states') || country.includes('america') || country.includes('new york') || country.includes('california')) {
      baseLeft = 20 + (seed % 14);
      baseTop = 32 + ((seed * 2) % 12);
    } else if (country.includes('canada') || country.includes('toronto')) {
      baseLeft = 22 + (seed % 12);
      baseTop = 22 + ((seed * 2) % 8);
    } else if (country.includes('australia') || country.includes('sydney') || country.includes('nz') || country.includes('new zealand')) {
      baseLeft = 82 + (seed % 8);
      baseTop = 72 + ((seed * 2) % 10);
    } else if (country.includes('germany') || country.includes('france') || country.includes('spain') || country.includes('italy')) {
      baseLeft = 49 + (seed % 6);
      baseTop = 30 + ((seed * 2) % 8);
    } else if (country.includes('india') || country.includes('japan') || country.includes('singapore') || country.includes('asia')) {
      baseLeft = 70 + (seed % 12);
      baseTop = 42 + ((seed * 2) % 12);
    } else {
      baseLeft = 30 + (seed % 50);
      baseTop = 25 + ((seed * 3) % 45);
    }

    const isHighMatch = score >= 80;
    const isCoral = isHighMatch && idx % 3 === 0;

    return {
      lead,
      companyName,
      score,
      x: baseLeft,
      y: baseTop,
      isHighMatch,
      isCoral,
    };
  });

  return (
    <div className="relative w-full rounded-2xl bg-[#EFEEE9]/70 border border-[#DDDCD7] p-5 overflow-hidden transition-all">
      {/* Editorial Header */}
      <div className="flex items-center justify-between mb-3 z-10 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3157FF] animate-ping" />
          <span className="text-xs font-semibold text-[#171717] tracking-wider uppercase flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#3157FF]" />
            Territory Intelligence Map
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#6F6D68]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3157FF]" /> High Fit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#7657FF]" /> Match
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF6B5F]" /> Priority
          </span>
        </div>
      </div>

      {/* Map Graphic Canvas */}
      <div className="relative w-full h-44 sm:h-56 bg-[#F7F6F2] rounded-xl border border-[#DDDCD7] overflow-hidden flex items-center justify-center select-none">
        
        {/* Soft World Grid Lines */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(#DDDCD7 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Minimal Editorial Continents */}
        <svg viewBox="0 0 1000 500" className="w-full h-full opacity-35 text-[#C8C7C0] fill-current">
          <path d="M 120,90 Q 200,80 250,110 Q 280,160 260,220 Q 210,240 180,210 Q 130,160 120,90 Z" />
          <path d="M 270,270 Q 320,290 310,380 Q 270,440 250,420 Q 240,330 270,270 Z" />
          <path d="M 450,100 Q 520,90 530,160 Q 480,190 440,160 Q 430,120 450,100 Z" />
          <path d="M 460,200 Q 550,210 540,340 Q 490,390 450,330 Q 440,240 460,200 Z" />
          <path d="M 550,110 Q 750,90 790,200 Q 720,260 630,240 Q 560,190 550,110 Z" />
          <path d="M 750,320 Q 840,310 830,400 Q 760,420 740,370 Q 730,340 750,320 Z" />
        </svg>

        {/* Active Region Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#3157FF]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Discovered Lead Nodes */}
        {mapDots.map((dot, idx) => (
          <button
            key={dot.lead.id || idx}
            onClick={() => onSelectLead?.(dot.lead)}
            title={`${dot.companyName} (${dot.lead.city || dot.lead.country || 'Global'}) - Score: ${dot.score}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 hover:scale-150 z-20 cursor-pointer"
            style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
          >
            <div className="relative flex items-center justify-center">
              {dot.isHighMatch && (
                <span 
                  className={`absolute w-4 h-4 rounded-full opacity-60 animate-ping ${
                    dot.isCoral ? 'bg-[#FF6B5F]' : 'bg-[#3157FF]'
                  }`} 
                />
              )}
              
              <div 
                className={`w-2.5 h-2.5 rounded-full border border-white shadow-sm transition-transform ${
                  dot.isCoral 
                    ? 'bg-[#FF6B5F]' 
                    : dot.isHighMatch 
                    ? 'bg-[#3157FF]' 
                    : 'bg-[#7657FF]'
                }`} 
              />

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-[#171717] text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap pointer-events-none z-30">
                <span className="font-semibold">{dot.companyName}</span>
                <span className="text-[#DDDCD7] text-[9px]">
                  {dot.lead.city ? `${dot.lead.city}, ` : ''}{dot.lead.country} · Fit: {dot.score}%
                </span>
              </div>
            </div>
          </button>
        ))}

        {leads.length === 0 && (
          <div className="text-center z-10">
            <p className="text-xs text-[#6F6D68] font-medium">
              Start an autonomous research run to illuminate businesses across the globe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
