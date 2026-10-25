import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneCall, 
  PhoneForwarded, 
  PhoneOff, 
  Mic, 
  MicOff,
  Volume2, 
  VolumeX, 
  Building2, 
  CheckCircle2, 
  Flame, 
  X, 
  RotateCcw,
  Sparkles,
  UserCheck,
  Headphones,
  Activity,
  Radio,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Send,
  MessageSquare
} from 'lucide-react';
import { Lead, CallSessionResponse, CallDialogueTurn } from '../../types';
import { api } from '../../services/api';

interface VoiceCallingModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

type CallStep = 'setup' | 'dialing' | 'ringing' | 'connected' | 'not_answered' | 'forwarded' | 'summary';
type CallingMode = 'live_interactive' | 'auto_simulation' | 'real_gsm';

/**
 * Strips slashes, URLs, markdown, emoji and awkward symbols so speech synthesis speaks
 * pure, natural, professional English without saying "slash", "asterisk", etc.
 */
function sanitizeForSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/\s*\/\s*/g, ' or ');
  cleaned = cleaned.replace(/\//g, ' or ');
  cleaned = cleaned.replace(/&/g, ' and ');
  cleaned = cleaned.replace(/@/g, ' at ');
  cleaned = cleaned.replace(/%/g, ' percent ');
  cleaned = cleaned.replace(/\bw\/\b/gi, 'with');
  cleaned = cleaned.replace(/\bb\/w\b/gi, 'between');
  cleaned = cleaned.replace(/https?:\/\/\S+|www\.\S+/gi, '');
  cleaned = cleaned.replace(/[\*\_`#\[\]\(\)\{\}]/g, '');
  cleaned = cleaned.replace(/[^\x00-\x7F]+/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

export function VoiceCallingModal({ lead, isOpen, onClose, onLeadUpdated }: VoiceCallingModalProps) {
  if (!isOpen) return null;

  // Recipient Parameters
  const initialLeadName = lead ? (lead.business_name || lead.company_name || 'Target Business') : 'My Test Store / Business';
  const initialPhone = lead?.phone && lead.phone !== 'Not found' ? lead.phone : '+91 9408082933';
  const initialContact = (lead?.decision_makers && lead.decision_makers[0]?.name) ? lead.decision_makers[0].name : 'Vikram Patel';

  const [targetCompany, setTargetCompany] = useState<string>(initialLeadName);
  const [targetContact, setTargetContact] = useState<string>(initialContact);
  const [targetPhone, setTargetPhone] = useState<string>(initialPhone);
  const [callingMode, setCallingMode] = useState<CallingMode>('live_interactive');

  // Twilio Gateway credentials - Loaded securely from backend environment
  const [showTwilioConfig, setShowTwilioConfig] = useState<boolean>(false);
  const [twilioSid, setTwilioSid] = useState<string>('');
  const [twilioToken, setTwilioToken] = useState<string>('');
  const [twilioFromPhone, setTwilioFromPhone] = useState<string>('+12362044214');
  const [twilioWebhookUrl, setTwilioWebhookUrl] = useState<string>('');

  const [step, setStep] = useState<CallStep>('setup');
  const [callSession, setCallSession] = useState<CallSessionResponse | null>(null);
  const [turns, setTurns] = useState<CallDialogueTurn[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [activeSpeaker, setActiveSpeaker] = useState<'ai' | 'prospect' | 'system' | null>(null);
  const [ringCount, setRingCount] = useState<number>(1);

  // Live 2-Way Speech Recognition (User Speaking with AI)
  const [isListeningToUser, setIsListeningToUser] = useState<boolean>(false);
  const [userSpeechInput, setUserSpeechInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState<boolean>(true);

  // User Business Profile configuration
  const [senderCompany, setSenderCompany] = useState('Apex Growth Studio');
  const [senderName, setSenderName] = useState('Vikram Patel');
  const [senderPhone, setSenderPhone] = useState('+44 20 7946 0999');
  const [serviceOffered, setServiceOffered] = useState('Graphic Design & Commercial Brand Revamp');
  const [valueProposition, setValueProposition] = useState(
    'Delivering bespoke brand redesigns and commercial assets that increase customer acquisition by 40%.'
  );

  const timerRef = useRef<any>(null);
  const ringAudioRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);
  const isPlayingTurnRef = useRef<boolean>(false);
  const currentStepRef = useRef<CallStep>('setup');

  useEffect(() => {
    currentStepRef.current = step;
  }, [step]);

  // Update fields if lead changes
  useEffect(() => {
    if (lead) {
      setTargetCompany(lead.business_name || lead.company_name || 'Target Business');
      setTargetPhone(lead.phone && lead.phone !== 'Not found' ? lead.phone : '+91 9408082933');
      if (lead.decision_makers && lead.decision_makers[0]?.name) {
        setTargetContact(lead.decision_makers[0].name);
      }
    }
  }, [lead]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isAiThinking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      stopSpeechRecognition();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Web Audio Ringtone (440Hz + 480Hz realistic phone ring burst)
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ringAudioRef.current = ctx;

      const playRingBurst = (time: number) => {
        if (!ctx || ctx.state === 'closed') return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.setValueAtTime(0.08, time + 1.6);
        gain.gain.linearRampToValueAtTime(0.0001, time + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 1.8);
        osc2.stop(time + 1.8);
      };

      playRingBurst(ctx.currentTime + 0.2);
      playRingBurst(ctx.currentTime + 3.2);
      playRingBurst(ctx.currentTime + 6.2);
    } catch (e) {
      console.warn('Web Audio Ringtone note:', e);
    }
  };

  const stopRingtone = () => {
    try {
      if (ringAudioRef.current && ringAudioRef.current.state !== 'closed') {
        ringAudioRef.current.close();
      }
      ringAudioRef.current = null;
    } catch (e) {
      // Ignored
    }
  };

  // Natural Speech Synthesis
  const speakText = (text: string, speaker: 'ai' | 'prospect' | 'system'): Promise<void> => {
    return new Promise((resolve) => {
      if (isAudioMuted || typeof window === 'undefined' || !window.speechSynthesis || speaker === 'system') {
        setTimeout(resolve, 800);
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const cleanSpokenText = sanitizeForSpeech(text);
        if (!cleanSpokenText) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
        const voices = window.speechSynthesis.getVoices();

        if (speaker === 'ai') {
          utterance.rate = 1.0;
          utterance.pitch = 1.05;
          const aiVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('George')));
          if (aiVoice) utterance.voice = aiVoice;
        } else {
          utterance.rate = 0.96;
          utterance.pitch = 0.92;
          const prospectVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Guy') || v.name.includes('Mark') || v.name.includes('James') || v.name.includes('Richard')));
          if (prospectVoice) utterance.voice = prospectVoice;
        }

        utterance.onend = () => {
          setTimeout(resolve, 500);
        };
        utterance.onerror = () => {
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('SpeechSynthesis note:', e);
        resolve();
      }
    });
  };

  // Start Live Microphone Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechRecognitionSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningToUser(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleUserSpeechSubmit(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListeningToUser(false);
      };

      recognition.onend = () => {
        setIsListeningToUser(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListeningToUser(false);
    }
  };

  const stopSpeechRecognition = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      // Ignored
    }
    setIsListeningToUser(false);
  };

  // User speaks or sends a response to the AI in real time
  const handleUserSpeechSubmit = async (spokenText?: string) => {
    const textToSend = spokenText || userSpeechInput;
    if (!textToSend.trim() || isAiThinking) return;

    setUserSpeechInput('');
    stopSpeechRecognition();

    const newProspectTurn: CallDialogueTurn = {
      speaker: 'prospect',
      text: textToSend.trim(),
      sentiment: 'interested',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const updatedTurns = [...turns, newProspectTurn];
    setTurns(updatedTurns);
    setActiveSpeaker('prospect');
    setIsAiThinking(true);

    try {
      const historyPayload = updatedTurns.map(t => ({ speaker: t.speaker, text: t.text }));
      const response = await api.interactVoiceTurn({
        user_speech: textToSend.trim(),
        company_name: targetCompany,
        prospect_name: targetContact,
        sender_company: senderCompany,
        sender_name: senderName,
        service_offered: serviceOffered,
        value_proposition: valueProposition,
        conversation_history: historyPayload
      });

      setIsAiThinking(false);

      const newAiTurn: CallDialogueTurn = {
        speaker: 'ai',
        text: response.ai_response_text,
        sentiment: response.sentiment || 'positive',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      const finalTurns = [...updatedTurns, newAiTurn];
      setTurns(finalTurns);
      setActiveSpeaker('ai');

      // AI speaks out loud to the user!
      await speakText(response.ai_response_text, 'ai');

      if (response.is_forwarded || response.is_deal_closed) {
        setStep('forwarded');
        const transferTurn: CallDialogueTurn = {
          speaker: 'system',
          text: `🔥 Warm transfer activated. Call bridged live to ${senderName} on ${senderPhone}.`,
          sentiment: 'forwarded',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setTurns(prev => [...prev, transferTurn]);
      } else {
        setActiveSpeaker(null);
        // Prompt user to speak again automatically
        setTimeout(() => {
          if (currentStepRef.current === 'connected') {
            startSpeechRecognition();
          }
        }, 600);
      }

    } catch (e) {
      console.error('Turn interaction error:', e);
      setIsAiThinking(false);
      setActiveSpeaker(null);
    }
  };

  // Start Call lifecycle
  const handleStartCall = async () => {
    setStep('dialing');
    setCallDuration(0);
    setActiveSpeaker(null);
    setRingCount(1);
    setTurns([]);

    try {
      await new Promise(res => setTimeout(res, 1800));
      
      setStep('ringing');
      playRingtone();

      const ringTimer = setInterval(() => {
        setRingCount(prev => (prev < 4 ? prev + 1 : prev));
      }, 2500);

      const session: CallSessionResponse = await api.initiateVoiceCall({
        lead_id: lead?.id,
        lead_company: targetCompany,
        lead_phone: targetPhone,
        lead_name: targetContact,
        sender_company: senderCompany,
        sender_name: senderName,
        sender_phone: senderPhone,
        service_offered: serviceOffered,
        value_proposition: valueProposition,
        call_goal: 'Qualify & Warm-Transfer live call to Representative',
        make_real_call: callingMode === 'real_gsm',
        twilio_account_sid: twilioSid || undefined,
        twilio_auth_token: twilioToken || undefined,
        twilio_from_phone: twilioFromPhone || undefined,
        twilio_webhook_url: twilioWebhookUrl || undefined
      });

      await new Promise(res => setTimeout(res, 5200));
      clearInterval(ringTimer);
      stopRingtone();

      setCallSession(session);

      if (session.status === 'not_answered') {
        setStep('not_answered');
        return;
      }

      setStep('connected');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      if (callingMode === 'live_interactive') {
        // AI speaks the opening greeting to YOU (the user!)
        const initialSystemTurn: CallDialogueTurn = {
          speaker: 'system',
          text: `Telecom audio connection established with ${targetCompany} (${targetPhone}). Live two-way audio active.`,
          sentiment: 'neutral',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        const initialAiGreeting: CallDialogueTurn = {
          speaker: 'ai',
          text: `Hi ${targetContact || 'there'}! Hello, how are you doing today?`,
          sentiment: 'positive',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        setTurns([initialSystemTurn, initialAiGreeting]);
        setActiveSpeaker('ai');
        await speakText(initialAiGreeting.text, 'ai');
        setActiveSpeaker(null);

        // Turn on microphone to listen to you!
        setTimeout(() => {
          startSpeechRecognition();
        }, 400);

      } else if (callingMode === 'real_gsm') {
        // Real Cellular GSM Call mode via Twilio!
        // The real telephone call is placed to the physical mobile device.
        // Do NOT speak fake prospect turns through laptop speakers.
        setTurns(session.dialogue_turns);
      } else {
        // Auto Simulation stream (demo mode)
        setTurns(session.dialogue_turns);
        for (let i = 0; i < session.dialogue_turns.length; i++) {
          if (currentStepRef.current === 'summary') break;
          const turn = session.dialogue_turns[i];
          setActiveSpeaker(turn.speaker);
          await speakText(turn.text, turn.speaker);
          if (turn.sentiment === 'forwarded' || i === session.dialogue_turns.length - 1) {
            setStep('forwarded');
          }
        }
        setActiveSpeaker(null);
      }

    } catch (e) {
      console.error('Call failed:', e);
      stopRingtone();
      setStep('setup');
    }
  };

  const handleEndCall = () => {
    isPlayingTurnRef.current = false;
    stopRingtone();
    stopSpeechRecognition();
    if (timerRef.current) clearInterval(timerRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStep('summary');
    if (lead && onLeadUpdated) {
      onLeadUpdated({
        ...lead,
        crm_stage: 'Discussion',
        status: 'contacted'
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white border border-[#DDDCD7] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Luxury Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFEEE9] bg-[#F7F6F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3157FF] text-white flex items-center justify-center shadow-lg shadow-[#3157FF]/25">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#171717] tracking-tight">AI Outbound Voice Calling</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#3157FF]/10 text-[#3157FF] border border-[#3157FF]/20">
                  Agent 11 · Autonomous SDR
                </span>
              </div>
              <p className="text-xs text-[#6F6D68]">
                {callingMode === 'live_interactive' ? '🎙️ Talk directly with the AI salesperson using your microphone!' : 'Outbound sales engine with live audio.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAudioMuted(!isAudioMuted);
                if (!isAudioMuted && window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isAudioMuted 
                  ? 'bg-[#FF6B5F]/10 text-[#FF6B5F] border-[#FF6B5F]/20' 
                  : 'bg-white text-[#6F6D68] border-[#DDDCD7] hover:text-[#171717] hover:border-[#3157FF]'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 text-[#6F6D68] hover:text-[#171717] rounded-xl hover:bg-[#EFEEE9] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          
          {/* Target Prospect Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#171717] text-base">{targetCompany}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white text-[#3157FF] border border-[#DDDCD7] font-semibold">
                  {targetContact}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#3157FF]/10 text-[#3157FF] font-bold">
                  {targetPhone}
                </span>
              </div>
              <div className="text-xs text-[#6F6D68] flex items-center gap-3">
                <span className="font-mono text-[#171717]">📞 Dialing: {targetPhone}</span>
                <span>👤 Contact: {targetContact}</span>
              </div>
            </div>

            {(step === 'connected' || step === 'forwarded') && (
              <div className="flex items-center gap-2.5 bg-white border border-[#3157FF]/30 px-3.5 py-1.5 rounded-xl shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#3157FF] animate-ping" />
                <span className="text-xs font-mono font-bold text-[#3157FF]">
                  CALL ACTIVE: {formatSeconds(callDuration)}
                </span>
              </div>
            )}
          </div>

          {/* PHASE 1: SETUP BUSINESS & CALLING ENGINE */}
          {step === 'setup' && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Calling Mode Selector */}
              <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#3157FF]" />
                    <span>Choose Calling Experience</span>
                  </label>
                  <span className="text-[11px] text-[#6F6D68]">Select how you want to interact</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode 1: Live Interactive (Mic 2-Way) */}
                  <div
                    onClick={() => setCallingMode('live_interactive')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      callingMode === 'live_interactive'
                        ? 'border-[#3157FF] bg-white shadow-sm ring-1 ring-[#3157FF]/20'
                        : 'border-[#DDDCD7] bg-white/60 hover:border-[#3157FF]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${callingMode === 'live_interactive' ? 'bg-[#3157FF] text-white' : 'bg-[#EFEEE9] text-[#6F6D68]'}`}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#B8E94E]/20 text-[#2E6B08] font-bold">Recommended</span>
                      </div>
                      <div className="text-xs font-bold text-[#171717]">Talk to AI (Live Mic)</div>
                      <div className="text-[11px] text-[#6F6D68] mt-1 leading-snug">
                        AI calls you in the browser. You speak into your microphone and test if the AI can handle your objections!
                      </div>
                    </div>
                  </div>

                  {/* Mode 2: Auto Simulation */}
                  <div
                    onClick={() => setCallingMode('auto_simulation')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      callingMode === 'auto_simulation'
                        ? 'border-[#3157FF] bg-white shadow-sm'
                        : 'border-[#DDDCD7] bg-white/60 hover:border-[#3157FF]/50'
                    }`}
                  >
                    <div>
                      <div className="mb-2">
                        <div className={`p-2 rounded-lg w-fit ${callingMode === 'auto_simulation' ? 'bg-[#3157FF] text-white' : 'bg-[#EFEEE9] text-[#6F6D68]'}`}>
                          <Headphones className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xs font-bold text-[#171717]">Auto Demo Call</div>
                      <div className="text-[11px] text-[#6F6D68] mt-1 leading-snug">
                        Listen to the AI salesperson execute a complete consultative pitch and objection handling sequence.
                      </div>
                    </div>
                  </div>

                  {/* Mode 3: Real GSM Twilio */}
                  <div
                    onClick={() => setCallingMode('real_gsm')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      callingMode === 'real_gsm'
                        ? 'border-[#7657FF] bg-white shadow-sm ring-1 ring-[#7657FF]/20'
                        : 'border-[#DDDCD7] bg-white/60 hover:border-[#7657FF]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${callingMode === 'real_gsm' ? 'bg-[#7657FF] text-white' : 'bg-[#EFEEE9] text-[#6F6D68]'}`}>
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#059669] font-bold">Twilio Ready</span>
                      </div>
                      <div className="text-xs font-bold text-[#171717]">Real Cellular Call</div>
                      <div className="text-[11px] text-[#6F6D68] mt-1 leading-snug">
                        Dials physical phone via Twilio line +1 (236) 204-4214. Your phone rings in real life!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Twilio Credentials Accordion */}
                {callingMode === 'real_gsm' && (
                  <div className="pt-2 border-t border-[#DDDCD7]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowTwilioConfig(!showTwilioConfig)}
                        className="text-xs font-bold text-[#7657FF] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{showTwilioConfig ? 'Hide Twilio Keys' : 'View Configured Twilio Line (+1 236 204 4214)'}</span>
                        {showTwilioConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-[11px] font-semibold text-[#059669] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                        ✓ Gateway Active: +1 (236) 204-4214
                      </span>
                    </div>

                    {showTwilioConfig && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-[#6F6D68] uppercase block mb-1">Twilio Account SID</label>
                          <input
                            type="text"
                            placeholder="ACxxxxxxxxxxxxxxxx"
                            value={twilioSid}
                            onChange={(e) => setTwilioSid(e.target.value)}
                            className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#7657FF]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#6F6D68] uppercase block mb-1">Twilio Auth Token</label>
                          <input
                            type="password"
                            placeholder="••••••••••••••••"
                            value={twilioToken}
                            onChange={(e) => setTwilioToken(e.target.value)}
                            className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#7657FF]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#6F6D68] uppercase block mb-1">Twilio From Number</label>
                          <input
                            type="text"
                            placeholder="+12362044214"
                            value={twilioFromPhone}
                            onChange={(e) => setTwilioFromPhone(e.target.value)}
                            className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#7657FF]"
                          />
                        </div>
                        <div className="sm:col-span-3 pt-1">
                          <label className="text-[10px] font-bold text-[#6F6D68] uppercase block mb-1">
                            Twilio Webhook URL (Optional for 2-way cellular phone speech via ngrok/localtunnel)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. https://your-domain.loca.lt"
                            value={twilioWebhookUrl}
                            onChange={(e) => setTwilioWebhookUrl(e.target.value)}
                            className="w-full bg-[#F7F6F2] border border-[#DDDCD7] rounded-lg px-2.5 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#7657FF]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Target Recipient Parameters */}
              <div className="border border-[#DDDCD7] rounded-2xl p-5 bg-[#F7F6F2] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#3157FF]" />
                    <span>Recipient Being Called</span>
                  </h4>
                  <span className="text-[11px] text-[#6F6D68]">AI addresses this store & person directly</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                      Store / Company Name
                    </label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="e.g. Dishoom London / My Store"
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                      Contact Person / Title
                    </label>
                    <input
                      type="text"
                      value={targetContact}
                      onChange={(e) => setTargetContact(e.target.value)}
                      placeholder="e.g. Vivek Patel / Store Owner"
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block">
                        Phone Number to Dial
                      </label>
                      <button
                        type="button"
                        onClick={() => setTargetPhone('+919408082933')}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#3157FF]/10 text-[#3157FF] hover:bg-[#3157FF]/20 font-bold cursor-pointer"
                        title="Set to your verified mobile number"
                      >
                        📱 Set My Phone
                      </button>
                    </div>
                    <input
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="+919408082933"
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#3157FF] font-mono font-bold focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>
                </div>
              </div>

              {/* Your Business Profile */}
              <div className="border border-[#DDDCD7] rounded-2xl p-5 bg-[#F7F6F2] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7657FF]" />
                    <span>Your Business Profile & Value Hook</span>
                  </h4>
                  <span className="text-[11px] text-[#6F6D68]">What the AI pitches on the call</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                      Your Business Name
                    </label>
                    <input
                      type="text"
                      value={senderCompany}
                      onChange={(e) => setSenderCompany(e.target.value)}
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                      Your Representative Name
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                      Forwarding Phone / Bridge Line
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="+44 20 7946 0999"
                      className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#3157FF] font-mono font-bold focus:outline-none focus:border-[#3157FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                    Service / Solution Offered
                  </label>
                  <input
                    type="text"
                    value={serviceOffered}
                    onChange={(e) => setServiceOffered(e.target.value)}
                    className="w-full bg-white border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider block mb-1">
                    AI Value Hook & Pitch Strategy
                  </label>
                  <textarea
                    rows={2}
                    value={valueProposition}
                    onChange={(e) => setValueProposition(e.target.value)}
                    className="w-full bg-white border border-[#DDDCD7] rounded-xl p-3 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF] resize-none"
                  />
                </div>
              </div>

            </div>
          )}

          {/* PHASE 2: DIALING STATE */}
          {step === 'dialing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center animate-fadeIn">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#3157FF]/10 text-[#3157FF] flex items-center justify-center border border-[#3157FF]/20 animate-spin">
                  <Activity className="w-8 h-8" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#171717]">Connecting Telecom Gateway...</h4>
                <p className="text-xs text-[#6F6D68]">Routing audio channel to {targetCompany} ({targetPhone})</p>
              </div>
            </div>
          )}

          {/* PHASE 3: RINGING STATE */}
          {step === 'ringing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center animate-fadeIn">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#3157FF]/15 text-[#3157FF] flex items-center justify-center border-2 border-[#3157FF] animate-pulse">
                  <PhoneCall className="w-10 h-10" />
                </div>
                <div className="absolute -inset-3 rounded-full border border-[#3157FF]/30 animate-ping opacity-75" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3157FF]/10 text-[#3157FF] font-mono text-xs font-bold">
                  <span>Ringing Recipient Line</span>
                  <span>·</span>
                  <span>Ring {ringCount} of 4</span>
                </div>
                <h4 className="text-base font-bold text-[#171717]">Calling {targetContact} at {targetCompany}...</h4>
                <p className="text-xs text-[#6F6D68]">Awaiting pick-up on {targetPhone}</p>
              </div>
            </div>
          )}

          {/* PHASE: NOT ANSWERED STATE */}
          {step === 'not_answered' && (
            <div className="p-8 rounded-3xl bg-[#FF6B5F]/5 border-2 border-[#FF6B5F]/30 space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-[#FF6B5F]/15 text-[#FF6B5F] flex items-center justify-center mx-auto">
                <PhoneOff className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-bold text-[#171717]">Call Not Answered</h4>
                <p className="text-xs text-[#6F6D68] leading-relaxed">
                  The recipient at <strong className="text-[#171717] font-semibold">{targetCompany}</strong> ({targetPhone}) did not answer after 4 ring attempts.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleStartCall}
                  className="px-5 py-2.5 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Redial / Try Again</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F7F6F2] text-[#171717] border border-[#DDDCD7] text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* PHASE 4: ACTIVE CONVERSATION & TRANSCRIPT */}
          {(step === 'connected' || step === 'forwarded') && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Reactive Live Waveform & Speaker Status */}
              <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    activeSpeaker === 'ai'
                      ? 'bg-[#3157FF] text-white shadow-md shadow-[#3157FF]/30 scale-105'
                      : activeSpeaker === 'prospect'
                      ? 'bg-[#7657FF] text-white shadow-md shadow-[#7657FF]/30 scale-105'
                      : 'bg-white text-[#6F6D68] border border-[#DDDCD7]'
                  }`}>
                    {activeSpeaker === 'ai' ? <Mic className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#171717] flex items-center gap-2">
                      <span>
                        {callingMode === 'real_gsm'
                          ? `📱 Real Cellular Call Active`
                          : activeSpeaker === 'ai'
                          ? `🤖 AI SDR (${senderName}'s Assistant)`
                          : activeSpeaker === 'prospect'
                          ? `👤 ${targetContact} (You / Store Owner)`
                          : 'Two-Way Audio Line Connected'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6F6D68]">
                      {callingMode === 'real_gsm'
                        ? `Live call dispatched to ${targetPhone} from ${twilioFromPhone}. Answer your mobile phone!`
                        : activeSpeaker === 'ai'
                        ? `AI speaking pitch to ${targetCompany}...`
                        : activeSpeaker === 'prospect'
                        ? `You speaking into microphone...`
                        : (callingMode === 'live_interactive' ? '🎙️ Speak into your mic or type below to talk with the AI!' : 'Live audio stream')}
                    </div>
                  </div>
                </div>

                {/* Animated Waveform Bars */}
                <div className="flex items-center gap-1">
                  {[25, 60, 90, 45, 100, 70, 85, 40, 95, 30].map((h, idx) => (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        activeSpeaker === 'ai'
                          ? 'bg-[#3157FF] animate-bounce'
                          : activeSpeaker === 'prospect' || isListeningToUser
                          ? 'bg-[#7657FF] animate-bounce'
                          : 'bg-[#DDDCD7]'
                      }`}
                      style={{
                        height: (activeSpeaker || isListeningToUser) ? `${h * 0.28}px` : '6px',
                        animationDelay: `${idx * 100}ms`,
                        animationDuration: '650ms'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Cellular Call Banner for Real Phone Call */}
              {callingMode === 'real_gsm' && (
                <div className="p-3.5 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
                    <div>
                      <div className="text-xs font-bold text-[#065F46] flex items-center gap-2">
                        <span>Cellular Call Active on Your Mobile Device</span>
                        {callSession?.twilio_call_sid && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#047857] border border-[#10B981]/30 font-semibold">
                            SID: {callSession.twilio_call_sid}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#047857]">
                        Dialing <span className="font-mono font-bold">{targetPhone}</span> from Twilio number <span className="font-mono font-bold">{twilioFromPhone}</span>. Pick up your phone to hear the AI pitch!
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Transcript Container */}
              <div className="border border-[#DDDCD7] rounded-2xl bg-[#F7F6F2] p-4 max-h-64 overflow-y-auto space-y-3 font-sans">
                {turns.map((turn, idx) => {
                  if (turn.speaker === 'system') {
                    return (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#3157FF]/10 border border-[#3157FF]/20 text-xs text-[#3157FF] font-mono font-medium">
                        {turn.text}
                      </div>
                    );
                  }

                  const isAI = turn.speaker === 'ai';

                  return (
                    <div key={idx} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs transition-all ${
                        isAI 
                          ? 'bg-white border border-[#DDDCD7] text-[#171717] rounded-tl-xs' 
                          : 'bg-[#3157FF] text-white rounded-tr-xs'
                      }`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`font-bold text-[10px] uppercase tracking-wider ${isAI ? 'text-[#3157FF]' : 'text-white/80'}`}>
                            {isAI ? `🤖 AI SDR (${senderName})` : `👤 ${targetContact} (You)`}
                          </span>
                          <span className="text-[10px] opacity-70 font-mono">{turn.timestamp}</span>
                        </div>
                        <p className="text-xs leading-normal">{turn.text}</p>
                      </div>
                    </div>
                  );
                })}

                {isAiThinking && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-[#DDDCD7] rounded-2xl p-3 text-xs text-[#6F6D68] flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#3157FF] animate-ping" />
                      <span>AI is listening and formulating consultative answer...</span>
                    </div>
                  </div>
                )}

                <div ref={transcriptBottomRef} />
              </div>

              {/* 🎙️ LIVE 2-WAY INTERACTIVE MICROPHONE / INPUT BAR */}
              {callingMode === 'live_interactive' && step === 'connected' && (
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#3157FF] shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                      <Mic className={`w-3.5 h-3.5 ${isListeningToUser ? 'text-[#FF6B5F] animate-pulse' : 'text-[#3157FF]'}`} />
                      <span>{isListeningToUser ? 'Listening to your voice... Speak now!' : 'Speak into Microphone or Type Answer:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isListeningToUser) {
                          stopSpeechRecognition();
                        } else {
                          startSpeechRecognition();
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isListeningToUser
                          ? 'bg-[#FF6B5F] text-white shadow-sm animate-pulse'
                          : 'bg-[#3157FF]/10 text-[#3157FF] hover:bg-[#3157FF] hover:text-white'
                      }`}
                    >
                      {isListeningToUser ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isListeningToUser ? 'Stop Mic' : 'Start Mic'}</span>
                    </button>
                  </div>

                  {/* Quick Speech Chips */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-[#6F6D68] font-bold uppercase tracking-wider">
                      <span>Quick Prompts (Click or speak directly into mic):</span>
                      <span className="text-[#3157FF] font-semibold lowercase">answers questions & pitches naturally</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Hi! I'm good, who is this?",
                        "Hello, what is this regarding?",
                        "How much does your service cost?",
                        "What do you guys actually do?",
                        "How does the process work?",
                        "Are you an AI or a real human?",
                        "Can you send an email with details?",
                        "Can I see your portfolio or past work?",
                        "Why should we choose you?",
                        "We already have an agency",
                        "I'm busy, call me later",
                        "Sounds great, let's connect!"
                      ].map((phrase, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleUserSpeechSubmit(phrase)}
                          className="px-2.5 py-1 rounded-md bg-[#F7F6F2] hover:bg-[#3157FF] text-[#171717] hover:text-white text-[11px] font-medium border border-[#DDDCD7] transition-all cursor-pointer shadow-xs"
                        >
                          "{phrase}"
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Input Fallback */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUserSpeechSubmit();
                    }}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={userSpeechInput}
                      onChange={(e) => setUserSpeechInput(e.target.value)}
                      placeholder="Or type what you want to say to the AI..."
                      className="flex-1 bg-[#F7F6F2] border border-[#DDDCD7] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#3157FF]"
                    />
                    <button
                      type="submit"
                      disabled={!userSpeechInput.trim() || isAiThinking}
                      className="p-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] disabled:opacity-40 text-white transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* WARM FORWARDING ALERT BANNER */}
              {step === 'forwarded' && (
                <div className="p-5 rounded-2xl bg-[#3157FF]/10 border-2 border-[#3157FF] shadow-sm animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-full bg-[#3157FF] text-white">
                        <PhoneForwarded className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-[#171717]">
                        🔥 PROSPECT RECEPTIVE — CALL BRIDGED LIVE TO YOU!
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3157FF] text-white font-bold">
                      Bridge Active
                    </span>
                  </div>

                  <p className="text-xs text-[#171717]">
                    Prospect <strong className="font-bold">{targetContact}</strong> agreed to discuss <strong className="text-[#3157FF] font-semibold">{serviceOffered}</strong>. The line has been bridged to your forwarding phone: <strong className="underline font-mono">{senderPhone}</strong>.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleEndCall}
                      className="px-4 py-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Take Over Live & Close Deal (Bridge Connected)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 5: SUMMARY & CRM UPDATES */}
          {step === 'summary' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#DDDCD7] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#3157FF]" />
                    <span>Call Completed & Logged to CRM</span>
                  </h4>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#7657FF]/15 text-[#7657FF] border border-[#7657FF]/25 font-bold">
                    Stage: Discussion
                  </span>
                </div>

                <p className="text-xs text-[#6F6D68] leading-relaxed">
                  {callSession?.call_summary || `Outbound call to ${targetCompany} completed with high customer interest. Call forwarded live to user.`}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] text-xs">
                    <div className="text-[#6F6D68] text-[11px]">Sentiment Score</div>
                    <div className="text-[#3157FF] font-bold text-sm mt-0.5">
                      {callSession?.sentiment_score || 95}% Receptive
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-[#DDDCD7] text-xs">
                    <div className="text-[#6F6D68] text-[11px]">Forward Status</div>
                    <div className="text-[#171717] font-bold text-sm mt-0.5">Forwarded to {senderPhone}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#EFEEE9] bg-[#F7F6F2] flex items-center justify-between">
          <div className="text-xs text-[#6F6D68]">
            {step === 'setup' && `Ready to call ${targetCompany} on ${targetPhone}.`}
            {step === 'dialing' && 'Establishing telecom gateway...'}
            {step === 'ringing' && 'Awaiting prospect pick-up...'}
            {step === 'not_answered' && 'Prospect line did not answer.'}
            {step === 'connected' && (callingMode === 'live_interactive' ? '🎙️ Talk live into your microphone with the AI!' : 'Live dialogue stream active.')}
            {step === 'forwarded' && 'Call bridged directly to your phone number.'}
            {step === 'summary' && 'Record saved in CRM history.'}
          </div>

          <div className="flex items-center gap-3">
            {step === 'setup' && (
              <button
                onClick={handleStartCall}
                className="px-5 py-2.5 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>{callingMode === 'real_gsm' ? `Call ${targetPhone} (Real GSM)` : `Initiate AI Call to ${targetCompany}`}</span>
              </button>
            )}

            {(step === 'connected' || step === 'forwarded') && (
              <button
                onClick={handleEndCall}
                className="px-4 py-2 rounded-xl bg-[#FF6B5F] hover:bg-[#e05347] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call & Save Summary</span>
              </button>
            )}

            {(step === 'summary' || step === 'not_answered') && (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#3157FF] text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close & Return
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
