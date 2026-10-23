import React from 'react';

interface AICoreOrbProps {
  state?: 'idle' | 'searching' | 'completed';
  size?: 'sm' | 'md' | 'lg';
}

export const AICoreOrb: React.FC<AICoreOrbProps> = ({ state = 'idle', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
  };

  const isSearching = state === 'searching';

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
      {/* Background ambient glow */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isSearching
            ? 'bg-gradient-to-tr from-[#3157FF]/60 via-[#7657FF]/60 to-[#FF6B5F]/40 animate-orb-pulse scale-125'
            : 'bg-gradient-to-tr from-[#3157FF]/30 via-[#7657FF]/25 to-[#FF6B5F]/20 filter blur-md'
        }`}
      />

      {/* Fluid Glass Orb Core */}
      <div
        className={`relative w-full h-full rounded-full border border-white/60 shadow-lg backdrop-blur-md overflow-hidden transition-all duration-500 ${
          isSearching ? 'animate-orb-float' : 'hover:scale-105'
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9) 0%, rgba(118, 87, 255, 0.45) 45%, rgba(49, 87, 255, 0.8) 80%, rgba(255, 107, 95, 0.5) 100%)',
          boxShadow: 'inset 0 -4px 10px rgba(49, 87, 255, 0.4), inset 0 4px 8px rgba(255, 255, 255, 0.8), 0 8px 20px -4px rgba(49, 87, 255, 0.25)',
        }}
      >
        {/* Specular gloss highlight */}
        <div className="absolute top-1 left-2 w-1/3 h-1/4 rounded-full bg-white/70 blur-[0.5px] transform -rotate-12" />
        
        {/* Subtle inner animated ring when searching */}
        {isSearching && (
          <div className="absolute inset-1 rounded-full border border-white/40 border-dashed animate-slow-spin opacity-80" />
        )}

        {/* Coral surprise micro-dot */}
        <div className="absolute bottom-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[#FF6B5F] shadow-[0_0_6px_#FF6B5F] opacity-90" />
      </div>
    </div>
  );
};
