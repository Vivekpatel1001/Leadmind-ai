import React from 'react';

interface LeadScoreArcProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const LeadScoreArc: React.FC<LeadScoreArcProps> = ({
  score,
  size = 54,
  strokeWidth = 4.5,
  showLabel = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Color logic according to LeadMind AI palette
  const gradientId = `lead-score-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3157FF" />
            <stop offset="70%" stopColor="#7657FF" />
            <stop offset="100%" stopColor="#FF6B5F" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EFEEE9"
          strokeWidth={strokeWidth}
        />

        {/* Dynamic Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-[#171717] tracking-tight leading-none">
            {clampedScore}
          </span>
          <span className="text-[8px] font-semibold text-[#6F6D68] uppercase tracking-wider">
            Fit
          </span>
        </div>
      )}
    </div>
  );
};
