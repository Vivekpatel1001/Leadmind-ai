import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  User
} from 'lucide-react';
import { api } from '../../services/api';
import { Lead } from '../../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  leads?: Lead[];
}

interface FloatingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchFromChat: (query: string, newLeadsOnly?: boolean) => void;
  onViewDetails: (lead: Lead) => void;
  onExportCSV: () => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  isOpen,
  onClose,
  onSearchFromChat,
  onViewDetails,
  onExportCSV
}) => {
  if (!isOpen) return null;

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: "Hello! I am your LeadMind AI Research Partner. Ask me to find prospects, review your memory matrix, or query discovered leads."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const qLower = userText.toLowerCase();

      if (qLower.includes('export') || qLower.includes('download csv')) {
        onExportCSV();
        setMessages(prev => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: 'I have exported and downloaded your current verified leads in CSV format.'
          }
        ]);
        setIsTyping(false);
        return;
      }

      if (qLower.startsWith('find ') || qLower.startsWith('search ') || qLower.includes('i want ') || qLower.includes('find me ')) {
        const isNewOnly = qLower.includes('new') || qLower.includes('haven\'t seen');
        onSearchFromChat(userText, isNewOnly);
        setMessages(prev => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: `Starting autonomous research for "${userText}". View live multi-agent workflow in the Find Leads workspace.`
          }
        ]);
        setIsTyping(false);
        return;
      }

      const memoryResp = await api.queryMemory(userText);
      setMessages(prev => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: memoryResp.answer,
          leads: memoryResp.matched_leads as any
        }
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: `Error processing request: ${e.message}`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-white border border-[#DDDCD7] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn text-[#171717]">
      
      {/* Header */}
      <div className="p-4 border-b border-[#EFEEE9] bg-[#F7F6F2] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#3157FF] flex items-center justify-center text-white shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#171717] tracking-tight">LeadMind AI Assistant</h3>
            <span className="text-[10px] text-[#3157FF] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3157FF] inline-block animate-pulse"></span>
              Memory Matrix Connected
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#6F6D68] hover:text-[#171717] hover:bg-[#EFEEE9] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#F7F6F2]/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px] ${
              m.sender === 'user' ? 'bg-[#3157FF] text-white' : 'bg-white text-[#3157FF] border border-[#DDDCD7]'
            }`}>
              {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>

            <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
              m.sender === 'user'
                ? 'bg-[#3157FF] text-white shadow-xs'
                : 'bg-white border border-[#DDDCD7] text-[#171717] shadow-xs'
            }`}>
              <p>{m.text}</p>

              {m.leads && m.leads.length > 0 && (
                <div className="mt-2.5 space-y-1.5 pt-2 border-t border-[#EFEEE9]">
                  <p className="text-[10px] font-bold text-[#6F6D68] uppercase tracking-wider">Matching Leads:</p>
                  {m.leads.slice(0, 3).map((l) => (
                    <div
                      key={l.id}
                      onClick={() => onViewDetails(l)}
                      className="p-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] flex items-center justify-between hover:border-[#3157FF] transition-all cursor-pointer"
                    >
                      <span className="font-semibold text-[#171717] truncate max-w-[150px]">{l.company_name}</span>
                      <span className="text-[#3157FF] font-mono font-bold text-[10px] bg-[#3157FF]/10 px-2 py-0.5 rounded-full border border-[#3157FF]/20">{l.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-[#6F6D68] text-xs italic bg-white p-2.5 rounded-xl border border-[#DDDCD7] w-fit shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#3157FF] animate-spin" />
            <span>Consulting agent memory...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#EFEEE9] bg-white flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question or request leads..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7F6F2] border border-[#DDDCD7] text-xs text-[#171717] placeholder-[#9E9C96] focus:outline-none focus:border-[#3157FF]"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2 rounded-xl bg-[#3157FF] hover:bg-[#2745d8] disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
