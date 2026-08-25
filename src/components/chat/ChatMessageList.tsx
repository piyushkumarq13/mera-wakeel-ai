import React, { useState } from 'react';
import { Language } from '../../types';
import { Paperclip, Scale, ShieldCheck, Volume2, Sparkles, Copy, Check, X } from 'lucide-react';
import { APP_CONFIG } from '../../constants';
import { ChatMessage, extractCitations, QUICK_CHIPS } from './parts';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  language: Language;
  currentUserName?: string;
  isSpeaking: boolean;
  speakText: (text: string) => void;
  stopSpeechOutput: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onQuickChip: (chip: string) => void;
  onRetryMessage?: (messageId: string) => void;
}

function MarkdownRenderer({ text }: { text: string }) {
  // Simple safe markdown parser for bold, headers, bullet lists
  const lines = text.split('\n');
  return (
    <div className="whitespace-pre-wrap">
      {lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-sm font-bold text-[#0F1D38] mt-2 mb-1">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-base font-bold text-[#0F1D38] mt-2 mb-1">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-lg font-bold text-[#0F1D38] mt-2 mb-1">{line.slice(2)}</h1>;
        }
        // Bullet lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <p key={idx} className="ml-4 flex items-start gap-2"><span className="text-[#D98800] shrink-0">•</span>{line.slice(2)}</p>;
        }
        // Bold inline
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p key={idx}>
            {parts.map((part, pi) =>
              part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                <strong key={pi} className="font-bold">{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  language,
  currentUserName,
  isSpeaking,
  speakText,
  stopSpeechOutput,
  messagesEndRef,
  onQuickChip,
  onRetryMessage,
}) => {
  const [citationPopover, setCitationPopover] = useState<{ citation: string; x: number; y: number } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      {messages.map((msg) => {
        const isUser = msg.sender_type === 'user';
        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#CBD5E1] shadow-2xs overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                <img
                  src={APP_CONFIG.logoUrl}
                  alt="Mera Wakeel AI Logo"
                  className="w-full h-full object-contain rounded-full"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-4 shadow-xs text-sm leading-relaxed ${
                isUser
                  ? 'bg-[#0F1D38] text-[#F8FAFC] rounded-2xl rounded-tr-xs border border-[#1E2E4F]'
                  : 'bg-[#FFFFFF] text-[#1E293B] rounded-2xl rounded-tl-xs border border-[#E2E8F0]'
              }`}
            >
              {msg.attachedFile && (
                <div className="mb-2.5 p-2 px-3 rounded-xl bg-[#FFFFFF]/10 border border-[#FFFFFF]/20 text-xs font-medium flex items-center justify-between gap-2 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3.5 h-3.5 text-[#D98800] shrink-0" />
                    <span className="font-semibold text-white">📎 Document attach kiya gaya</span>
                  </div>
                  <span className="truncate max-w-[130px] text-[11px] text-[#D98800] font-mono">{msg.attachedFile}</span>
                </div>
              )}

              {isUser ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <MarkdownRenderer text={msg.content} />
              )}

              {!isUser && extractCitations(msg.content).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {extractCitations(msg.content).map((c, ci) => (
                    <button
                      key={ci}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCitationPopover({ citation: c, x: rect.left + window.scrollX, y: rect.top + window.scrollY - 80 });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0F1D38] text-[#F5A623] text-[10px] font-bold border border-[#F5A623]/50 cursor-pointer hover:bg-[#1E2E4F] transition-all"
                      title={`Cite: ${c} — click to view`}
                    >
                      <Scale className="w-3 h-3" />
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {!isUser && (
                <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] text-[10px] text-[#64748B] italic flex items-center gap-1.5 leading-tight">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D98800] shrink-0" />
                  <span>This is AI-generated guidance, not a substitute for a licensed advocate's advice.</span>
                </div>
              )}

              <div
                className={`text-[10px] mt-2 font-medium flex items-center gap-2 ${
                  isUser ? 'text-[#94A3B8] justify-end' : 'text-[#64748B]'
                }`}
              >
                <span>
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
                {!isUser && (
                  <>
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeechOutput();
                        } else {
                          speakText(msg.content);
                        }
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F1D38] text-[11px] font-semibold transition-all cursor-pointer border border-[#CBD5E1]"
                      title="Aawaaz mein suno"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-[#D98800] animate-bounce' : 'text-[#64748B]'}`} />
                      <span>{isSpeaking ? 'Roko (Stop)' : 'Aawaaz mein Suno'}</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(msg.content).catch(() => {});
                        setCopiedMessageId(msg.id);
                        setTimeout(() => setCopiedMessageId(null), 1500);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F1D38] text-[11px] font-semibold transition-all cursor-pointer border border-[#CBD5E1]"
                      title="Copy message"
                    >
                      {copiedMessageId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span className="hidden sm:inline text-[#16A34A]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </button>
                  </>
                )}
                {msg.isError && onRetryMessage && (
                  <button
                    onClick={() => onRetryMessage(msg.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FEF2F2] hover:bg-[#FECACA] text-[#DC2626] text-[11px] font-semibold transition-all cursor-pointer border border-[#EF4444]/50"
                    title="Retry"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>

            {isUser && (
              <div className="w-8 h-8 rounded-full bg-[#D98800] text-[#FFFFFF] flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
        );
      })}

      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#CBD5E1] shadow-2xs overflow-hidden shrink-0 flex items-center justify-center p-0.5">
            <img
              src={APP_CONFIG.logoUrl}
              alt="Mera Wakeel AI Logo"
              className="w-full h-full object-contain rounded-full animate-pulse"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-2xl rounded-tl-xs border border-[#E2E8F0] shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D98800] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#0F1D38] animate-ping delay-100" />
            <span className="w-2 h-2 rounded-full bg-[#D98800] animate-ping delay-200" />
            <span className="text-xs text-[#64748B] font-medium ml-1">
              {language === 'hi' ? 'AI विश्लेषण कर रही है...' : 'AI is analyzing law...'}
            </span>
          </div>
        </div>
      )}

      {messages.length <= 1 && !isLoading && (
        <div className="py-8 px-4 max-w-xl mx-auto text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-[#0F1D38] text-[#D98800] mx-auto flex items-center justify-center shadow-md border border-[#D98800]/40 p-1">
            <img
              src={APP_CONFIG.logoUrl}
              alt="Mera Wakeel AI"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-extrabold text-[#0F1D38]">
              {language === 'hi' ? 'नमस्ते, मैं एडवोकेट नया हूँ' : 'Namaste, I am Advocate Naya'}
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
              {language === 'hi'
                ? 'अपनी कानूनी समस्या (प्रॉपर्टी, किराया, कंज्यूमर शिकायत या नोटिस) साझा करें या कोई दस्तावेज अपलोड करें।'
                : 'Share your legal concern (property, tenant, consumer dispute, or notice) or upload a document.'}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
              {language === 'hi' ? 'त्वरित शुरुआत के लिए सवाल चुनें' : 'Quick Start Legal Queries'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_CHIPS[language].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onQuickChip(chip)}
                  className="bg-[#FFFFFF] hover:bg-[#F0F5FE] border border-[#CBD5E1] hover:border-[#D98800] text-[#0F1D38] text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D98800]" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
      {citationPopover && (
        <div
          className="fixed z-50 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xl max-w-sm"
          style={{ left: citationPopover.x, top: citationPopover.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs font-bold text-[#0F1D38] mb-1">Legal Citation</p>
              <p className="text-sm text-[#1E293B] font-mono bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">{citationPopover.citation}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(citationPopover.citation).catch(() => {});
                setCitationPopover(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#0F1D38] text-[#F5A623] text-[10px] font-bold border border-[#F5A623]/50 cursor-pointer hover:bg-[#1E2E4F] transition-all shrink-0"
              title="Copy citation"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <button
            onClick={() => setCitationPopover(null)}
            className="absolute top-1 right-1 p-1 text-[#64748B] hover:text-[#EF4444] cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};