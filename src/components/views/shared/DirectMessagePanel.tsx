import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DirectMessage,
  fetchDirectMessages,
  sendDirectMessage,
  getSupabase,
  uploadDirectMessageAttachment,
  getSignedUrlForAttachment,
  generateUUID,
} from '../../../lib/supabase';
import {
  Send,
  MessageSquare,
  Scale,
  User,
  CheckCheck,
  ChevronDown,
  Phone,
  MessageCircle,
  FileText,
  Sparkles,
  Info,
  ChevronUp,
  Star,
  RotateCcw,
  AlertCircle,
  Paperclip,
  X,
  Download,
  Image as ImageIcon,
  ArrowLeft,
  Circle,
} from 'lucide-react';
import { ReviewModal } from '../../ReviewModal';

interface DirectMessagePanelProps {
  connectionId: string;
  currentUserId: string;
  currentUserType: 'lawyer' | 'citizen';
  lawyerId?: string;
  currentUserName?: string;
  otherPartyName?: string;
  otherPartyPhone?: string;
  caseTitle?: string;
  caseSummary?: string;
  caseCategory?: string;
  compact?: boolean;
  disabled?: boolean;
  caseClosed?: boolean;
  requestNote?: string;
  otherPartyPhoto?: string | null;
  barCouncilNumber?: string | null;
  city?: string | null;
  onBack?: () => void;
  caseStatus?: string | null;
  isAccepted?: boolean;
  isLawyer?: boolean;
  connectionStatus?: string;
  caseGroups?: Array<{ connectionId: string; caseTitle: string | null; caseStatus: string | null }>;
  onSwitchCase?: (idx: number) => void;
  activeCaseIndex?: number;
  hasMultipleCases?: boolean;
}

interface OptimisticMessage extends DirectMessage {
  failed?: boolean;
  uploading?: boolean;
}

function isConnectionPending(status: string): boolean {
  const s = status?.toLowerCase().trim();
  return s === 'requested' || s === 'pending';
}

function isConnectionRejected(status: string): boolean {
  const s = status?.toLowerCase().trim();
  return s === 'rejected';
}

function getDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const GREETING_ONLY_PATTERN = /^(hi+|hello+|hey+|hlo+|namaste|namaskar|ok|okay|thanks?|thank you|good morning|good evening|good afternoon)[.!?\s]*$/i;

function isBareGreeting(content: string | null | undefined): boolean {
  const trimmed = (content || '').trim();
  if (!trimmed) return true;
  return GREETING_ONLY_PATTERN.test(trimmed);
}

export const DirectMessagePanel: React.FC<DirectMessagePanelProps> = ({
  connectionId,
  currentUserId,
  currentUserType,
  currentUserName = 'You',
  otherPartyName = currentUserType === 'lawyer' ? 'Citizen Client' : 'Your Advocate',
  otherPartyPhone,
  caseTitle,
  caseSummary,
  caseCategory,
  compact = false,
  disabled = false,
  caseClosed: caseClosedProp = false,
  requestNote,
  otherPartyPhoto,
  barCouncilNumber,
  city,
  onBack,
  caseStatus,
  isAccepted,
  isLawyer,
  connectionStatus,
  caseGroups,
  onSwitchCase,
  activeCaseIndex,
  hasMultipleCases,
}) => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(!compact);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [caseClosed, setCaseClosed] = useState(caseClosedProp);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [quickRepliesHidden, setQuickRepliesHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`quickReplies:hidden:${connectionId}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setCaseClosed(caseClosedProp);
  }, [caseClosedProp]);

  useEffect(() => {
    setIsProfileExpanded(false);
    try {
      setQuickRepliesHidden(localStorage.getItem(`quickReplies:hidden:${connectionId}`) === 'true');
    } catch {
      setQuickRepliesHidden(false);
    }
  }, [connectionId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const msgs = await fetchDirectMessages(connectionId);
    setMessages(msgs);
    setLoading(false);
  };

  useEffect(() => {
    const resolveUrls = async () => {
      const toResolve = messages.filter(
        (m) => m.attachment_url && !m.attachment_url.startsWith('uploading://') && !signedUrls[m.attachment_url]
      );
      if (toResolve.length === 0) return;
      const newUrls: Record<string, string> = {};
      await Promise.all(
        toResolve.map(async (m) => {
          if (m.attachment_url) {
            const url = await getSignedUrlForAttachment(m.attachment_url);
            if (url) newUrls[m.attachment_url] = url;
          }
        })
      );
      if (Object.keys(newUrls).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...newUrls }));
      }
    };
    if (messages.length > 0) resolveUrls();
  }, [messages]);
  useEffect(() => {
    load();

    const client = getSupabase();
    let channel: any = null;

    if (client && connectionId) {
      channel = client
        .channel(`dm_chan_${connectionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: 'connection_id=eq.' + connectionId,
          },
          (payload) => {
            if (payload.new) {
              const newMsg = payload.new as DirectMessage;
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });

              if (newMsg.sender_type === 'lawyer' && typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('lawyer_message_received', {
                    detail: {
                      sender_type: 'lawyer',
                      sender_name: otherPartyName,
                      content: newMsg.content,
                      connection_id: connectionId,
                    },
                  })
                );
              }
            }
          }
        )
        .subscribe();
    }

    pollRef.current = setInterval(load, 12000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [connectionId]);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const relevantMessageCount = useMemo(
    () => messages.filter((m) => !isBareGreeting(m.content)).length,
    [messages]
  );

  useEffect(() => {
    if (relevantMessageCount >= 2 && !quickRepliesHidden) {
      setQuickRepliesHidden(true);
      try {
        localStorage.setItem(`quickReplies:hidden:${connectionId}`, 'true');
      } catch {}
    }
  }, [relevantMessageCount, quickRepliesHidden, connectionId]);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return false;
    }
    return true;
  };

  const retryFailedMessage = async (msg: OptimisticMessage) => {
    if (!msg.failed) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, failed: false } : m))
    );
    try {
      const attachment =
        msg.attachment_url && !msg.attachment_url.startsWith('uploading://')
          ? { url: msg.attachment_url, type: msg.attachment_type || '', name: msg.attachment_name || '' }
          : undefined;
      await sendDirectMessage(connectionId, currentUserId, currentUserType, msg.content, attachment);
      await load();
    } catch (err) {
      console.warn('retryFailedMessage error:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, failed: true } : m))
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!validateFile(file)) return;
    setSelectedFile(file);
  };

  const handleSendWithAttachment = async () => {
    const text = input.trim();
    const file = selectedFile;
    if ((!text && !file) || sending) return;
    if (file && !validateFile(file)) return;

    setSending(true);
    setInput('');
    setSelectedFile(null);

    const messageId = generateUUID();

    const optimistic: OptimisticMessage = {
      id: messageId,
      connection_id: connectionId,
      sender_id: currentUserId,
      sender_type: currentUserType,
      content: text || '',
      attachment_url: file ? 'uploading://' + messageId : undefined,
      attachment_type: file ? file.type : undefined,
      attachment_name: file ? file.name : undefined,
      sent_at: new Date().toISOString(),
      failed: false,
      uploading: !!file,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      let storagePath: string | null = null;
      if (file) {
        storagePath = await uploadDirectMessageAttachment(connectionId, messageId, file);
        if (!storagePath) {
          throw new Error('Upload failed');
        }
      }

      const attachment = storagePath
        ? { url: storagePath, type: file!.type, name: file!.name }
        : undefined;
      await sendDirectMessage(connectionId, currentUserId, currentUserType, text, attachment);

      if (currentUserType === 'lawyer' && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lawyer_message_received', {
            detail: {
              sender_type: 'lawyer',
              sender_name: currentUserName || 'Advocate',
              content: text || (file ? '[Attachment: ' + file.name + ']' : ''),
              connection_id: connectionId,
            },
          })
        );
      }
      await load();
    } catch (err: any) {
      if (err?.message?.includes('CASE_CLOSED') || err?.error?.includes?.('CASE_CLOSED')) {
        setCaseClosed(true);
        setMessages((prev) => [
          ...prev,
          {
            id: 'sys_closed_' + Date.now(),
            connection_id: connectionId,
            sender_id: 'system',
            sender_type: 'citizen' as const,
            content: isLawyer ? 'This case has been closed. Chat is locked.' : 'This case has been closed. Chat is locked. Reopen the case from My Dashboard to continue messaging.',
            sent_at: new Date().toISOString(),
          },
        ]);
      } else {
        console.warn('sendDirectMessage with attachment error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id ? { ...m, failed: true, uploading: false } : m
          )
        );
      }
    }

    setSending(false);
  };

  const handleSend = async (customText?: string) => {
    if (selectedFile) {
      handleSendWithAttachment();
      return;
    }
    const text = (customText || input).trim();
    if (!text || sending) return;
    setSending(true);
    if (!customText) setInput('');

    const optimistic: OptimisticMessage = {
      id: 'opt_' + Date.now(),
      connection_id: connectionId,
      sender_id: currentUserId,
      sender_type: currentUserType,
      content: text,
      sent_at: new Date().toISOString(),
      failed: false,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendDirectMessage(connectionId, currentUserId, currentUserType, text);
      if (currentUserType === 'lawyer' && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lawyer_message_received', {
            detail: {
              sender_type: 'lawyer',
              sender_name: currentUserName || 'Advocate',
              content: text,
              connection_id: connectionId,
            },
          })
        );
      }
      await load();
    } catch (err: any) {
      if (err?.message?.includes('CASE_CLOSED') || err?.error?.includes?.('CASE_CLOSED')) {
        setCaseClosed(true);
        setMessages((prev) => [
          ...prev,
          {
            id: 'sys_closed_' + Date.now(),
            connection_id: connectionId,
            sender_id: 'system',
            sender_type: 'citizen' as const,
            content: isLawyer ? 'This case has been closed. Chat is locked.' : 'This case has been closed. Chat is locked. Reopen the case from My Dashboard to continue messaging.',
            sent_at: new Date().toISOString(),
          },
        ]);
      } else {
        console.warn('sendDirectMessage error:', err);
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, failed: true } : m))
        );
      }
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const cleanPhone = otherPartyPhone ? otherPartyPhone.replace(/[^0-9]/g, '') : '';
  const formattedPhone = otherPartyPhone || '+91 9876543210';

  const handleDownloadAttachment = async (storagePath: string, fileName: string) => {
    const signedUrl = await getSignedUrlForAttachment(storagePath);
    if (signedUrl) {
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = fileName;
      a.click();
    }
  };

  const renderAttachment = (msg: OptimisticMessage, isMine: boolean) => {
    if (!msg.attachment_url) return null;

    const isUploading = msg.uploading;
    const isUploadingPath = msg.attachment_url.startsWith('uploading://');
    const signedUrl = isUploadingPath ? null : (signedUrls[msg.attachment_url] || null);

    if (msg.attachment_type?.startsWith('image/')) {
      return (
        <div className="mt-1.5">
          {isUploading ? (
            <div className="w-[200px] h-[140px] rounded-xl bg-[#1F3864]/10 border border-[#E5E7EB] flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-[#6B7280] font-medium">Uploading...</span>
            </div>
          ) : signedUrl ? (
            <div
              className="cursor-pointer group relative inline-block"
              onClick={() => setLightboxUrl(signedUrl)}
            >
              <img
                src={signedUrl}
                alt={msg.attachment_name || 'Attachment'}
                className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-[#E5E7EB] shadow-sm"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors" />
            </div>
          ) : (
            <div className="w-[200px] h-[60px] rounded-xl bg-[#F7F7F5] border border-[#E5E7EB] flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[10px] text-[#6B7280]">Loading image...</span>
            </div>
          )}
        </div>
      );
    }

    if (msg.attachment_type === 'application/pdf') {
      const uploading = msg.uploading;
      return (
        <div className="mt-1.5">
          <div
            className={'flex items-center gap-2 px-3 py-2.5 rounded-xl border ' +
              (isMine ? 'bg-[#1F3864] border-[#1F3864]' : 'bg-[#F7F7F5] border-[#E5E7EB]') +
              (uploading ? ' opacity-70' : '')}
          >
            <div className="w-8 h-8 rounded-lg bg-[#D4A017] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-[#1F3864]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={'text-[11px] font-semibold truncate ' + (isMine ? 'text-white' : 'text-[#222222]')}>
                {msg.attachment_name || 'Document.pdf'}
              </p>
              <p className={'text-[9px] ' + (isMine ? 'text-white/60' : 'text-[#6B7280]')}>
                PDF Document
              </p>
            </div>
            {uploading ? (
              <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadAttachment(msg.attachment_url!, msg.attachment_name || 'document.pdf');
                }}
                className={'p-1.5 rounded-lg transition-colors shrink-0 ' +
                  (isMine ? 'hover:bg-white/10 text-[#D4A017]' : 'hover:bg-[#E5E7EB] text-[#D4A017]')}
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-[#1F3864] hover:bg-[#2D5291] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#D4A017]/30 shadow-sm"
      >
        <MessageSquare className="w-4 h-4 text-[#D4A017]" />
        <span>Message {otherPartyName}</span>
        <span className="ml-auto text-white/60 flex items-center gap-1">
          {messages.length > 0 && (
            <span className="bg-[#D4A017] text-[#1F3864] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </button>
    );
  }

  const isEffectivelyDisabled = disabled || caseClosedProp;

  const messagesWithDates = useMemo(() => {
    const result: Array<{ type: 'date'; key: string; label: string } | { type: 'message'; key: string; msg: OptimisticMessage; dateKey: string }> = [];
    let lastDateKey = '';
    for (const msg of messages) {
      const dateKey = getDateKey(msg.sent_at);
      if (dateKey !== lastDateKey) {
        result.push({ type: 'date', key: `date_${dateKey}`, label: getDateLabel(msg.sent_at) });
        lastDateKey = dateKey;
      }
      result.push({ type: 'message', key: msg.id, msg, dateKey });
    }
    return result;
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
      {/* ════════ Merged Header ════════ */}
      <div className="shrink-0 border-b border-[#E5E7EB]">
        <div className={`flex items-center gap-2.5 px-3 md:px-4 ${isProfileExpanded ? 'py-2.5 md:py-3' : 'py-1.5 md:py-2'}`}>
          {/* Back arrow — mobile only */}
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-1 rounded-xl hover:bg-gray-100 transition-colors md:hidden" aria-label="Back to conversations">
              <ArrowLeft className="w-5 h-5 text-[#222222]" />
            </button>
          )}
          {/* Avatar + Name — clickable to expand/collapse */}
          <button
            type="button"
            onClick={() => setIsProfileExpanded(v => !v)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
          >
            {/* Avatar with online dot */}
            <div className="relative shrink-0">
              {otherPartyPhoto ? (
                <img
                  src={otherPartyPhoto}
                  alt={otherPartyName}
                  className={`rounded-full object-cover ring-2 ring-white shadow-sm transition-all ${isProfileExpanded ? 'w-10 h-10 md:w-11 md:h-11' : 'w-8 h-8'}`}
                />
              ) : (
                <div className={`rounded-full bg-gradient-to-br from-[#D4A017] to-[#B8860B] flex items-center justify-center shadow-sm transition-all ${isProfileExpanded ? 'w-10 h-10 md:w-11 md:h-11' : 'w-8 h-8'}`}>
                  <span className="text-white font-bold text-sm">{otherPartyName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              {isAccepted && (<span className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] rounded-full border-2 border-white" />)}
            </div>
            {/* Name + Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#222222] truncate">{otherPartyName}</h3>
                {caseCategory && (
                  <span className="hidden sm:inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1F3864]/10 text-[#1F3864] capitalize shrink-0">{caseCategory}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-[#6B7280] shrink-0 transition-transform ${isProfileExpanded ? 'rotate-180' : ''}`} />
              </div>
              {isProfileExpanded && (
                <div className="flex items-center gap-1 text-[11px] text-[#6B7280] mt-0.5">
                  {barCouncilNumber && <span>BC: {barCouncilNumber}</span>}
                  {barCouncilNumber && city && <span className="text-[#E5E7EB]">&middot;</span>}
                  {city && <span>{city}</span>}
                  {otherPartyPhone && (barCouncilNumber || city) && <span className="text-[#E5E7EB]">&middot;</span>}
                  {otherPartyPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#6B7280]" />
                      <span className="font-mono">{formattedPhone}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {cleanPhone && (
              <a href={'tel:' + cleanPhone} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all" title="Call Directly">
                <Phone className="w-3 h-3" />
                <span className="hidden sm:inline">Call</span>
              </a>
            )}
            {cleanPhone && (
              <a href={'https://wa.me/' + (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all" title="Open WhatsApp">
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            {caseSummary && (
              <button onClick={() => setShowSummaryDrawer(!showSummaryDrawer)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1F3864]/5 hover:bg-[#1F3864]/10 text-[#1F3864] text-[11px] font-bold rounded-xl border border-[#1F3864]/20 transition-all cursor-pointer">
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showSummaryDrawer ? 'Hide Case' : 'Case AI Details'}</span>
              </button>
            )}
            {compact && (
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ════════ Case-Switch Tabs ════════ */}
      {isProfileExpanded && hasMultipleCases && caseGroups && caseGroups.length > 1 && (
        <div className="shrink-0 px-3 py-2 border-b border-[#E5E7EB] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {caseGroups.map((c, idx) => {
              const isActive = idx === activeCaseIndex;
              return (
                <button key={c.connectionId} onClick={() => onSwitchCase?.(idx)} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${isActive ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-sm' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#1F3864]/30 hover:bg-gray-50'}`}>
                    <Circle className={`w-1.5 h-1.5 ${isActive ? 'fill-white' : 'fill-[#6B7280]'}`} />
                    <span className="truncate max-w-[140px]">{c.caseTitle || 'Case'}</span>
                    {(c.caseStatus === 'closed' || c.caseStatus === 'resolved') && (
                      <span className={`text-[9px] px-1 py-0 rounded ${isActive ? 'bg-white/20' : 'bg-gray-100 text-[#6B7280]'}`}>
                        {c.caseStatus === 'closed' ? 'closed' : 'resolved'}
                      </span>
                    )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ Status Banners ════════ */}
      {connectionStatus && isConnectionPending(connectionStatus) && (
        <div className="shrink-0 px-4 py-2.5 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20">
          <p className="text-xs font-medium text-[#92400E] text-center">
            {isLawyer ? `Accept ${otherPartyName}'s request to start chatting` : `Waiting for Adv. ${otherPartyName} to accept your request...`}
          </p>
        </div>
      )}
      {connectionStatus && isConnectionRejected(connectionStatus) && (
        <div className="shrink-0 px-4 py-2.5 bg-[#EF4444]/10 border-b border-[#EF4444]/20">
          <p className="text-xs font-medium text-[#991B1B] text-center">
            {isLawyer ? 'You have declined this request.' : 'This advocate has declined your request.'}
          </p>
        </div>
      )}
      {caseClosedProp && (
        <div className="shrink-0 px-4 py-2.5 bg-[#EF4444]/10 border-b border-[#EF4444]/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <span className="text-[11px] font-bold text-[#991B1B]">
            {isLawyer ? 'This case is closed. Chat is locked.' : 'This case is closed. Chat is locked. Reopen the case from My Dashboard to continue messaging.'}
          </span>
        </div>
      )}

      {/* ════════ Collapsible AI Case Details Drawer ════════ */}
      {showSummaryDrawer && caseSummary && (
        <div className="bg-[#FFFBF0] border-b border-[#FDE68A] p-3.5 space-y-2 animate-fade-in text-xs text-[#222222] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-extrabold text-[#D4A017]">
              <Sparkles className="w-4 h-4" />
              <span>AI Case Briefing & Summary:</span>
            </div>
            {caseTitle && <span className="font-bold text-[#6B7280] text-[11px]">{caseTitle}</span>}
          </div>
          <p className="bg-white p-2.5 rounded-xl border border-[#FDE68A] text-[#334155] leading-relaxed">
            {caseSummary}
          </p>
        </div>
      )}

      {/* ════════ Scrollable Chat Container ════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-3 bg-[#F7F7F5] min-h-full">
          {requestNote && (
            <div className="bg-[#FFFBF0] border border-[#FDE68A] rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-[#92400E] uppercase tracking-wide">Initial Request</p>
              <p className="text-xs text-[#78350F] leading-relaxed">{requestNote}</p>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center pt-8">
              <div className="w-6 h-6 border-3 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center pt-8 space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#E5E7EB] flex items-center justify-center mx-auto text-[#6B7280]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#222222] font-bold">Start direct communication with {otherPartyName}</p>
              <p className="text-[10px] text-[#6B7280] max-w-xs mx-auto">
                Messages sent here are encrypted and delivered instantly. You can also contact via WhatsApp or Phone call above.
              </p>
            </div>
          ) : (
            messagesWithDates.map((item) => {
              if (item.type === 'date') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>
                );
              }

              const msg = item.msg;
              const isMine = msg.sender_id === currentUserId || msg.sender_type === currentUserType;
              const isFailed = msg.failed && isMine;
              return (
                <div key={item.key} className={'flex ' + (isMine ? 'justify-end' : 'justify-start')}>
                  <div className="max-w-[80%] space-y-0.5">
                    <div
                      className={'px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ' +
                        (isMine
                          ? 'bg-[#1F3864] text-white rounded-br-md border border-[#1F3864]'
                          : 'bg-white text-[#222222] border border-[#E5E7EB] rounded-bl-md') +
                        (isFailed ? ' border-red-400 bg-red-50 text-red-900' : '')}
                    >
                      {msg.content && <span>{msg.content}</span>}
                      {renderAttachment(msg, isMine)}
                    </div>
                    <div className={'flex items-center gap-1 text-[9px] ' + (isMine ? 'justify-end' : 'justify-start') + ' px-1'}>
                      <span className={isFailed ? 'text-red-500' : 'text-[#6B7280]'}>{formatTime(msg.sent_at)}</span>
                      {isMine && !isFailed && !msg.uploading && <CheckCheck className="w-3 h-3 text-[#22C55E]" />}
                      {msg.uploading && <span className="text-[#D4A017] font-medium">Sending...</span>}
                      {isFailed && (
                        <button
                          onClick={() => retryFailedMessage(msg as OptimisticMessage)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors"
                          title="Retry sending"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ════════ Fixed Bottom Area ════════ */}
      {/* ════════ Quick Legal Response Chips (For Advocates) ════════ */}
      {currentUserType === 'lawyer' && !quickRepliesHidden && (
        <div className="px-3 py-2 bg-white border-t border-[#E5E7EB] flex items-center gap-2 overflow-x-auto no-scrollbar text-[10px] shrink-0">
          <span className="text-[#6B7280] font-bold shrink-0">Quick Replies:</span>
          {[
            'I have reviewed your AI case summary.',
            'Please send relevant deed / agreement photos.',
            'When are you free for a brief call?',
            'I will prepare the draft petition notice.',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="bg-[#F7F7F5] hover:bg-[#1F3864] text-[#1F3864] hover:text-white border border-[#E5E7EB] px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              + {chip}
            </button>
          ))}
        </div>
      )}

      {/* ════════ Selected File Preview ════════ */}
      {selectedFile && (
        <div className="px-3 sm:px-4 pt-2 pb-0 bg-white border-t border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F7F5] border border-[#D4A017]/30 rounded-xl">
            {selectedFile.type.startsWith('image/') ? (
              <ImageIcon className="w-4 h-4 text-[#D4A017] shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-[#D4A017] shrink-0" />
            )}
            <span className="text-[11px] text-[#222222] font-medium truncate flex-1">
              {selectedFile.name}
            </span>
            <span className="text-[9px] text-[#6B7280] shrink-0">
              {(selectedFile.size / 1024).toFixed(0)}KB
            </span>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-[#E5E7EB] rounded-lg transition-colors shrink-0"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>
          </div>
        </div>
      )}

      {/* ════════ Input Row ════════ */}
      {!isEffectivelyDisabled && (
      <div className="p-3 sm:p-4 border-t border-[#E5E7EB] bg-white flex gap-2 items-center shrink-0 w-full">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="p-3 rounded-xl text-[#6B7280] hover:text-[#D4A017] hover:bg-[#F7F7F5] transition-colors shrink-0 cursor-pointer disabled:opacity-40"
          title="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentUserType === 'lawyer' ? 'Message ' + otherPartyName + '...' : 'Write a message to your advocate...'}
          className="flex-1 text-xs text-[#222222] bg-[#F7F7F5] border border-[#E5E7EB] focus:border-[#D4A017] focus:ring-1 focus:ring-[#D4A017]/20 rounded-xl px-4 py-3 outline-none font-medium w-full transition-all"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !selectedFile) || sending}
          className="bg-[#1F3864] hover:bg-[#2D5291] disabled:opacity-40 text-[#D4A017] px-4 py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
      )}

      {/* ════════ Image Lightbox ════════ */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Attachment preview"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
