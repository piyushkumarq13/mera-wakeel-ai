import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bluetooth,
  Grid,
  FileUp,
  Camera,
  Scale,
  X,
  Sparkles,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import { speakNaturalMaleVoice, stopNaturalVoice } from '../lib/audioVoice';
import { sendGeminiChatMessage, fileToBase64, FileData } from '../lib/geminiApi';
import { startWebAudioCapture, AudioCaptureSession } from '../lib/webAudioCapture';
import { fetchCaseMessages, fetchFactsBlock } from '../lib/supabase';
import { APP_CONFIG } from '../constants';

// Web Audio API dual-tone phone ring generator for realistic call feel
function playCallRingtone() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 440;
    osc2.frequency.value = 480;

    gain.gain.value = 0.08;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.setValueAtTime(0, now + 0.8);
    gain.gain.setValueAtTime(0.08, now + 1.1);
    gain.gain.setValueAtTime(0, now + 1.9);

    osc1.start(now);
    osc2.start(now);

    const stopRingtone = () => {
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch (e) {}
    };

    setTimeout(stopRingtone, 2100);
    return stopRingtone;
  } catch (e) {
    return null;
  }
}

interface AICallModalProps {
  isOpen: boolean;
  language: Language;
  caseId?: string | null;
  citizenId?: string | null;
  onEndCall: (transcript: Array<{ sender_type: 'user' | 'ai'; content: string; fileAttached?: string }>) => void;
  onLiveMessage?: (msg: { sender_type: 'user' | 'ai'; content: string; fileAttached?: string }) => void;
}

export const AICallModal: React.FC<AICallModalProps> = ({
  isOpen,
  language,
  caseId,
  citizenId,
  onEndCall,
  onLiveMessage,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isBluetoothActive, setIsBluetoothActive] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [dialedDigits, setDialedDigits] = useState('');
  
  // Call status
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'speaking' | 'listening' | 'processing'>('connecting');
  const [attachedFile, setAttachedFile] = useState<{ name: string; data: FileData } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Background conversation transcript memory & DB history
  const transcriptRef = useRef<Array<{ sender_type: 'user' | 'ai'; content: string; fileAttached?: string }>>([]);
  const caseHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Audio & Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const callAudioSessionRef = useRef<AudioCaptureSession | null>(null);
  const [inCallVolume, setInCallVolume] = useState<number>(0);
  const isListeningActiveRef = useRef<boolean>(false);
  const isCallActiveRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<any>(null);
  const lastTranscriptRef = useRef<string>('');
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Synchronized refs to avoid stale closure issues in SpeechRecognition events
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const CALL_INTRO = language === 'hi'
    ? 'बताइए सर मैं आपकी क्या हेल्प कर सकती हूँ'
    : language === 'en'
    ? 'Tell me sir, how can I help you'
    : 'Bataiye sir main aapki kya help kar sakti hu';

  // Start Call Timer, Load Past Memory, & Play Intro when modal opens
  useEffect(() => {
    if (!isOpen) {
      isCallActiveRef.current = false;
      stopNaturalVoice();
      isListeningActiveRef.current = false;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      if (callAudioSessionRef.current) {
        callAudioSessionRef.current.cancel();
        callAudioSessionRef.current = null;
      }
      setCallDuration(0);
      setCallState('connecting');
      transcriptRef.current = [];
      caseHistoryRef.current = [];
      return;
    }

    // Load past case history messages from database/localStorage so AI never forgets!
    if (caseId) {
      fetchCaseMessages(caseId).then((pastMsgs) => {
        if (pastMsgs && pastMsgs.length > 0) {
          caseHistoryRef.current = pastMsgs.map((m: any) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content || '',
          }));
        }
      });
    }

    // Start Call: Show 'ringing' state first for ~2.2s with ringtone sound for realistic feel
    isCallActiveRef.current = true;
    setCallState('ringing');
    transcriptRef.current = [];

    const stopRing = playCallRingtone();

    // Timer interval
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Play Natural Intro Voice after 2.2s ringing
    const timer = setTimeout(() => {
      if (!isCallActiveRef.current) return;
      if (stopRing) stopRing();

      setCallState('speaking');
      // Record intro in transcript
      transcriptRef.current.push({
        sender_type: 'ai',
        content: CALL_INTRO,
      });

      speakNaturalMaleVoice(
        CALL_INTRO,
        language,
        () => {
          if (isCallActiveRef.current) setCallState('speaking');
        },
        () => {
          if (isCallActiveRef.current) {
            setCallState('listening');
            startContinuousListening();
          }
        }
      );
    }, 2200);

    return () => {
      isCallActiveRef.current = false;
      clearTimeout(timer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopNaturalVoice();
      isListeningActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      if (callAudioSessionRef.current) {
        callAudioSessionRef.current.cancel();
        callAudioSessionRef.current = null;
      }
    };
  }, [isOpen, caseId]);

  // Format Timer as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler when user finishes speaking (detected via VAD or SpeechRecognition)
  const handleUserFinishedSpeaking = async () => {
    if (!isCallActiveRef.current || !isListeningActiveRef.current) return;
    isListeningActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    // Instant check: use real-time SpeechRecognition transcript first (0ms network delay)
    let finalSpeech = lastTranscriptRef.current.trim();

    if (callAudioSessionRef.current) {
      if (!finalSpeech) {
        // Fallback to Groq Whisper STT only if SpeechRecognition produced empty transcript
        finalSpeech = (await callAudioSessionRef.current.stopAndTranscribe(language)).trim();
      } else {
        callAudioSessionRef.current.cancel();
      }
      callAudioSessionRef.current = null;
    }

    if (!isCallActiveRef.current) return;

    if (finalSpeech) {
      processUserSpokenInput(finalSpeech);
    } else {
      setCallState('listening');
      startContinuousListening();
    }
  };

  // Continuous Web Audio stream capture + Groq Whisper STT + SpeechRecognition
  const startContinuousListening = async () => {
    if (!isCallActiveRef.current || isMutedRef.current || isListeningActiveRef.current) return;

    try {
      if (callAudioSessionRef.current) {
        callAudioSessionRef.current.cancel();
        callAudioSessionRef.current = null;
      }

      isListeningActiveRef.current = true;
      setCallState('listening');

      // Start Web Audio Stream Capture with Volume Detection & Voice Activity Detection (VAD)
      const audioSession = await startWebAudioCapture(
        (vol) => {
          if (isCallActiveRef.current) setInCallVolume(vol);
        },
        () => {
          // User started speaking - clear any pending silence timers
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        },
        () => {
          // User stopped speaking -> trigger AI response after brief 700ms pause
          handleUserFinishedSpeaking();
        },
        700 // 700ms natural conversational pause
      );

      if (!isCallActiveRef.current) {
        if (audioSession) audioSession.cancel();
        return;
      }

      if (audioSession) {
        callAudioSessionRef.current = audioSession;
      }

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.onstart = null;
              recognitionRef.current.onresult = null;
              recognitionRef.current.onerror = null;
              recognitionRef.current.onend = null;
              recognitionRef.current.abort();
            } catch (e) {}
          }

          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          const langMap: Record<string, string> = {
            en: 'en-IN',
            hi: 'hi-IN',
            hinglish: 'hi-IN',
            ta: 'ta-IN',
            te: 'te-IN',
            mr: 'mr-IN',
            bn: 'bn-IN',
            kn: 'kn-IN',
            gu: 'gu-IN',
          };
          recognition.lang = langMap[language] || 'hi-IN';

        lastTranscriptRef.current = '';

        recognition.onstart = () => {
          if (!isCallActiveRef.current) return;
          isListeningActiveRef.current = true;
          setCallState('listening');
        };

        recognition.onresult = (event: any) => {
          if (!isCallActiveRef.current) return;
          let fullSpeech = '';
          for (let i = 0; i < event.results.length; i++) {
            fullSpeech += event.results[i][0].transcript + ' ';
          }

          const trimmed = fullSpeech.trim();
          if (trimmed) {
            lastTranscriptRef.current = trimmed;

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            // Wait 700ms after user stops speaking before responding
            silenceTimerRef.current = setTimeout(() => {
              handleUserFinishedSpeaking();
            }, 700);
          }
        };

        recognition.onerror = (err: any) => {
          const errorName = err?.error || err;
          if (errorName !== 'no-speech' && errorName !== 'aborted') {
            console.warn('Speech recognition notice:', errorName);
          }
        };

        recognition.onend = () => {
          if (isCallActiveRef.current && callStateRef.current === 'listening' && !isMutedRef.current && !isListeningActiveRef.current) {
            setTimeout(() => {
              if (isCallActiveRef.current && callStateRef.current === 'listening' && !isListeningActiveRef.current) {
                startContinuousListening();
              }
            }, 250);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      }
    } catch (e) {
      console.warn('Call listening start error:', e);
      isListeningActiveRef.current = false;
    }
  };

  // Handle User Input (Spoken text or document)
  const processUserSpokenInput = async (spokenText: string, fileData?: FileData | null) => {
    if (!isCallActiveRef.current) return;

    stopNaturalVoice();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (callAudioSessionRef.current) {
      callAudioSessionRef.current.cancel();
      callAudioSessionRef.current = null;
    }

    setCallState('processing');

    const userMsg = {
      sender_type: 'user' as const,
      content: spokenText,
      fileAttached: fileData?.fileName,
    };

    // Add user turn to transcript memory and notify live chat parent
    transcriptRef.current.push(userMsg);
    if (onLiveMessage) {
      onLiveMessage(userMsg);
    }

    // Format combined chat history (past DB history + current call turns) for Gemini API
    const currentCallHistory = transcriptRef.current.map((t) => ({
      role: t.sender_type === 'user' ? ('user' as const) : ('assistant' as const),
      content: t.content,
    }));
    const fullCombinedHistory = [...caseHistoryRef.current, ...currentCallHistory];

    try {
      const response = await sendGeminiChatMessage(
        spokenText || 'Aapke samne uploaded document ka vishleshan karein aur samjhayein.',
        fullCombinedHistory.slice(-30), // Send last 30 messages of history so AI never forgets!
        language,
        fileData,
        true, // isCallMode = true for short, clean conversational phone call answers
        caseId,
        citizenId
      );

      if (!isCallActiveRef.current) return;

      // Clean AI reply of any markdown symbols, slashes, asterisks, hashes, numbers, tags
      const aiReply = (response.text || '')
        .replace(/\[\[.*?\]\]/gi, '')
        .replace(/Ye guidance sirf jaankari ke liye hai[^\.\n]*/gi, '')
        .replace(/This guidance is for informational purposes only[^\.\n]*/gi, '')
        .replace(/and does not constitute legal advice[^\.\n]*/gi, '')
        .replace(/Please consult a licensed advocate[^\.\n]*/gi, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[*_#`~/\\]/g, ' ')
        .replace(/^[\s\-*•\d\.\)]+/gm, '')
        .replace(/\b\d+\.\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const aiMsg = {
        sender_type: 'ai' as const,
        content: aiReply,
      };

      // Add AI reply to transcript memory and notify live chat parent
      transcriptRef.current.push(aiMsg);
      if (onLiveMessage) {
        onLiveMessage(aiMsg);
      }

      // Clear attached file notice after processing
      setAttachedFile(null);
      setUploadStatus(null);

      if (!isCallActiveRef.current) return;

      // Speak reply in Natural Female AI Voice
      setCallState('speaking');
      speakNaturalMaleVoice(
        aiReply,
        language,
        () => {
          if (isCallActiveRef.current) setCallState('speaking');
        },
        () => {
          if (isCallActiveRef.current) {
            setCallState('listening');
            startContinuousListening();
          }
        }
      );
    } catch (err) {
      if (!isCallActiveRef.current) return;
      console.error('Call AI processing error:', err);
      const fallbackReply = 'Samasya samajhne me dikkat aayi. Kripya apni baat dobara kahein.';
      speakNaturalMaleVoice(
        fallbackReply,
        language,
        () => {
          if (isCallActiveRef.current) setCallState('speaking');
        },
        () => {
          if (isCallActiveRef.current) {
            setCallState('listening');
            startContinuousListening();
          }
        }
      );
    }
  };

  // Handle Document Upload during Live Call
  const handleFileUploadDuringCall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setUploadStatus(`Analyzing ${file.name}...`);

    try {
      const base64Info = await fileToBase64(file);
      setAttachedFile({ name: file.name, data: base64Info });

      // Trigger instant AI document analysis during live call
      const promptText = `User ne abhi live call ke dauran yeh document upload kiya hai (${file.name}). Kripya is document ko turant padhein aur short me 2-3 aam wakyo me batayein.`;
      
      await processUserSpokenInput(promptText, base64Info);
    } catch (err) {
      console.error('File upload during call error:', err);
      setUploadStatus('Document read nahi ho saka. Kripya clear photo upload karein.');
    }
  };

  // Handle Mute toggle
  const handleToggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (newMute) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (callAudioSessionRef.current) {
        callAudioSessionRef.current.cancel();
        callAudioSessionRef.current = null;
      }
    } else {
      startContinuousListening();
    }
  };

  // End Call Handler
  const handleEndCallClick = () => {
    isCallActiveRef.current = false;
    stopNaturalVoice();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (callAudioSessionRef.current) {
      callAudioSessionRef.current.cancel();
      callAudioSessionRef.current = null;
    }

    onEndCall(transcriptRef.current);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A1120] text-[#FFFFFF] flex flex-col justify-between p-6 sm:p-10 select-none animate-fadeIn">
      
      {/* TOP BAR: TIMER & QUALITY STATUS */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#94A3B8]">
        <div className="flex items-center gap-2 bg-[#1E293B]/80 px-3.5 py-1.5 rounded-full border border-[#334155]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-[#F8FAFC]">HD Voice Call</span>
        </div>

        <div className="font-mono text-base sm:text-lg font-bold text-[#D98800] bg-[#1E293B]/80 px-4 py-1.5 rounded-full border border-[#D98800]/30 shadow-inner">
          {formatTime(callDuration)}
        </div>

        <button
          onClick={handleEndCallClick}
          className="p-2 rounded-full hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#FFFFFF] transition-colors"
          title="Minimize Call"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* CENTER AREA: AI AVATAR, ANIMATING VOICE WAVES & CALL STATE */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 my-auto text-center">
        
        {/* Animated Avatar Sphere */}
        <div className="relative flex items-center justify-center">
          
          {/* Ringing Ripples */}
          {callState === 'ringing' && (
            <>
              <div className="absolute w-56 h-56 rounded-full bg-[#3B82F6]/25 animate-ping" />
              <div className="absolute w-48 h-48 rounded-full bg-[#2563EB]/30 animate-pulse" />
            </>
          )}

          {/* Glowing Voice Ripples */}
          {callState === 'speaking' && (
            <>
              <div className="absolute w-56 h-56 rounded-full bg-[#D98800]/20 animate-ping" />
              <div className="absolute w-48 h-48 rounded-full bg-[#D98800]/30 animate-pulse" />
            </>
          )}

          {callState === 'listening' && (
            <div className="absolute w-44 h-44 rounded-full bg-[#10B981]/20 animate-pulse" />
          )}

          {/* Main Avatar Badge with Project Logo */}
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-[#FFFFFF] border-4 border-[#D98800] shadow-2xl flex items-center justify-center relative z-10 p-2 transition-transform duration-300 transform hover:scale-105 overflow-hidden">
            <img
              src={APP_CONFIG.logoUrl}
              alt="Mera Wakeel AI Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* AI Name & Title */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FFFFFF]">
            Mera Wakeel AI
          </h2>
          <p className="text-sm text-[#CBD5E1] font-medium flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D98800]" />
            <span>Senior AI Legal Counsel</span>
          </p>
        </div>

        {/* Dynamic Status Indicator Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E293B] border border-[#334155] text-xs font-bold text-[#E2E8F0] shadow-md">
          {callState === 'ringing' && (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-ping" />
              <span>Calling Mera Wakeel AI... (घंटी बज रही है)</span>
            </>
          )}

          {callState === 'connecting' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span>Connecting call...</span>
            </>
          )}

          {callState === 'speaking' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#D98800] animate-pulse" />
              <span>Advocate Speaking...</span>
            </>
          )}

          {callState === 'listening' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span>Listening to you... (Aap bolein)</span>
            </>
          )}

          {callState === 'processing' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-spin" />
              <span>Analyzing legal provisions & document...</span>
            </>
          )}
        </div>

        {/* Document analysis upload status notice if attached during call */}
        {uploadStatus && (
          <div className="bg-[#1E293B] border border-[#D98800]/50 px-4 py-2 rounded-xl text-xs text-[#FDE68A] flex items-center gap-2 max-w-sm">
            <CheckCircle2 className="w-4 h-4 text-[#D98800] shrink-0" />
            <span className="truncate">{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* KEYPAD MODAL OVERLAY */}
      {showKeypad && (
        <div className="bg-[#1E293B] border border-[#334155] rounded-3xl p-6 max-w-xs mx-auto w-full mb-6 text-center space-y-4 shadow-2xl animate-scaleUp">
          <div className="flex justify-between items-center text-xs text-[#94A3B8]">
            <span>In-Call Dialpad</span>
            <button onClick={() => setShowKeypad(false)} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xl font-mono font-bold tracking-widest text-[#D98800] min-h-[32px] bg-[#0F172A] py-1 px-3 rounded-lg border border-[#334155]">
            {dialedDigits || '—'}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
              <button
                key={digit}
                onClick={() => setDialedDigits((prev) => prev + digit)}
                className="bg-[#0F172A] hover:bg-[#334155] text-white font-bold py-3 rounded-2xl text-lg transition-all"
              >
                {digit}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL BUTTONS GRID */}
      <div className="max-w-md mx-auto w-full space-y-6">
        
        {/* Row 1: Feature Controls (Mute, Speaker, Bluetooth, Keypad, Upload Doc, Camera) */}
        <div className="grid grid-cols-6 gap-2 sm:gap-3 text-center">
          
          {/* Mute Button */}
          <button
            onClick={handleToggleMute}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-[#EF4444] text-white shadow-lg'
                : 'bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] font-bold mt-1">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isSpeakerOn
                ? 'bg-[#0F1D38] text-[#D98800] border border-[#D98800]/40'
                : 'bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]'
            }`}
            title="Speaker"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span className="text-[10px] font-bold mt-1">Speaker</span>
          </button>

          {/* Bluetooth Button */}
          <button
            onClick={() => setIsBluetoothActive(!isBluetoothActive)}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isBluetoothActive
                ? 'bg-[#2563EB] text-white'
                : 'bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]'
            }`}
            title="Bluetooth"
          >
            <Bluetooth className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Audio</span>
          </button>

          {/* Keypad Button */}
          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              showKeypad
                ? 'bg-[#D98800] text-white'
                : 'bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]'
            }`}
            title="Keypad"
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Keypad</span>
          </button>

          {/* Document Upload Button (Requirement 6) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUploadDuringCall}
            accept=".jpg,.jpeg,.png,.pdf,.webp,.heic"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-[#D98800] flex flex-col items-center justify-center transition-all cursor-pointer border border-[#D98800]/30"
            title="Upload Document / Notice"
          >
            <FileUp className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Doc</span>
          </button>

          {/* Camera Capture Button (Requirement 6) */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileUploadDuringCall}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-[#10B981] flex flex-col items-center justify-center transition-all cursor-pointer border border-[#10B981]/30"
            title="Camera Photo Scan"
          >
            <Camera className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1">Camera</span>
          </button>

        </div>

        {/* Row 2: Prominent Red End Call Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleEndCallClick}
            className="w-20 h-20 rounded-full bg-[#EF4444] hover:bg-[#DC2626] active:scale-95 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer border-4 border-[#0A1120]"
            title="End Call"
          >
            <PhoneOff className="w-8 h-8 fill-current" />
          </button>
        </div>

      </div>

    </div>
  );
};
