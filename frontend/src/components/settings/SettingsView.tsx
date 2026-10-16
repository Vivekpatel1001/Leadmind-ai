import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Key, 
  Sliders, 
  CheckCircle2, 
  Save,
  Globe,
  Bot
} from 'lucide-react';
import { api } from '../../services/api';

export const SettingsView: React.FC = () => {
  const [weights, setWeights] = useState({
    location: 0.25,
    industry: 0.25,
    relevance: 0.25,
    data_quality: 0.15,
    other: 0.10
  });

  const [tavilyKey, setTavilyKey] = useState('');
  const [hasTavily, setHasTavily] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [hasGemini, setHasGemini] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(data => {
      if (data.scoring_weights) setWeights(data.scoring_weights);
      setHasGemini(data.has_gemini_key);
      if (data.has_tavily_key !== undefined) setHasTavily(data.has_tavily_key);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        scoring_weights: weights,
        tavily_api_key: tavilyKey || undefined,
        gemini_api_key: geminiKey || undefined
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to update settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-[#171717] tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#3157FF]" />
          <span>Platform Settings & Scoring Weights</span>
        </h2>
        <p className="text-xs text-[#6F6D68] mt-0.5">
          Tune algorithmic weights and configure external AI intelligence search providers.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Scoring Weights */}
        <div className="luxury-card p-6 sm:p-7 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#171717] uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-[#3157FF]" />
              <span>Lead Scoring Weights (0–100 Scale)</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#3157FF] bg-[#3157FF]/10 px-3 py-1 rounded-full">
              Total: {Math.round((weights.location + weights.industry + weights.relevance + weights.data_quality + weights.other) * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between text-[#6F6D68] font-medium">
                <span>Location Match (City/Country)</span>
                <span className="font-mono text-[#3157FF] font-bold">{Math.round(weights.location * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={weights.location}
                onChange={(e) => setWeights({ ...weights, location: parseFloat(e.target.value) })}
                className="w-full accent-[#3157FF]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[#6F6D68] font-medium">
                <span>Industry & Niche Fit</span>
                <span className="font-mono text-[#7657FF] font-bold">{Math.round(weights.industry * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={weights.industry}
                onChange={(e) => setWeights({ ...weights, industry: parseFloat(e.target.value) })}
                className="w-full accent-[#7657FF]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[#6F6D68] font-medium">
                <span>Business Relevance & Need</span>
                <span className="font-mono text-[#FF6B5F] font-bold">{Math.round(weights.relevance * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={weights.relevance}
                onChange={(e) => setWeights({ ...weights, relevance: parseFloat(e.target.value) })}
                className="w-full accent-[#FF6B5F]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[#6F6D68] font-medium">
                <span>Contact Completeness (Email/Phone)</span>
                <span className="font-mono text-[#171717] font-bold">{Math.round(weights.data_quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.05"
                value={weights.data_quality}
                onChange={(e) => setWeights({ ...weights, data_quality: parseFloat(e.target.value) })}
                className="w-full accent-[#171717]"
              />
            </div>
          </div>
        </div>

        {/* Live Web Intelligence Provider (Tavily) */}
        <div className="luxury-card p-6 sm:p-7 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#171717] uppercase tracking-wider">
              <Globe className="w-4 h-4 text-[#3157FF]" />
              <span>Tavily AI Live Web Search Engine</span>
            </div>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              hasTavily ? 'bg-[#3157FF]/10 text-[#3157FF]' : 'bg-[#EFEEE9] text-[#6F6D68]'
            }`}>
              Tavily: {hasTavily ? 'Connected & Active' : 'Not configured'}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#171717] block">
              Tavily API Key
            </label>
            <input
              type="password"
              placeholder="Paste tvly-dev-... (configured by default)"
              value={tavilyKey}
              onChange={(e) => setTavilyKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF] font-mono"
            />
            <p className="text-[11px] text-[#6F6D68]">
              Powers real-time deep web research and verified geographic lead discovery.
            </p>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-1">
          <div>
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-[#3157FF] font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully!
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

    </div>
  );
};
