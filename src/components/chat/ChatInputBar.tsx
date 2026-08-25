import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';
import { Mic, MicOff, Paperclip, Send, X } from 'lucide-react';
import { AudioCaptureSession, startWebAudioCapture } from '../../lib/webAudioCapture';
import { PLACEHOLDERS } from './parts';

interface ChatInputBarProps {
  language: Language;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  onSend: () => void;
  selectedFile: File | null;
  filePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  voiceOutputEnabled: boolean;
  onToggleVoiceOutput: (enabled: boolean) => void;
  stopSpeechOutput: () => void;
  fileSizeError?: string | null;
  aiStatus?: 'active' | 'error' | 'reconnecting';
  onStop?: () => void;
  disabled?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  language,
  inputText,
  setInputText,
  isLoading,
  onSend,
  selectedFile,
  filePreview,
  fileInputRef,
  onFileChange,
  onRemoveFile,
  voiceOutputEnabled,
  onToggleVoiceOutput,
  stopSpeechOutput,
  fileSizeError,
  aiStatus,
  onStop,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const webAudioSessionRef = useRef<AudioCaptureSession | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';

    const maxHeight = 112;
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > 0) {
      const targetHeight = Math.min(scrollHeight, maxHeight);
      textarea.style.height = `${targetHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [inputText]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const toggleListening = async () => {
    stopSpeechOutput();

    if (isListening) {
      setIsListening(false);
      setMicVolume(0);

      // Stop SpeechRecognition first and capture its base text
      let baseText = inputText.trim();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      if (webAudioSessionRef.current) {
        const whisperText = await webAudioSessionRef.current.stopAndTranscribe(language);
        webAudioSessionRef.current = null;
        if (whisperText && whisperText.trim()) {
          // Replace the live-recognition text with the final Whisper transcript
          setInputText(whisperText.trim());
        } else if (!whisperText || !whisperText.trim()) {
          // If Whisper returned nothing, keep the SpeechRecognition text
          setInputText(baseText);
        }
      } else {
        // No web audio session, keep SpeechRecognition text
        setInputText(baseText);
      }
      return;
    }

    setIsListening(true);
    const audioSession = await startWebAudioCapture((vol) => setMicVolume(vol));

    if (!audioSession) {
      console.warn('Web Audio capture initialization returned null');
    } else {
      webAudioSessionRef.current = audioSession;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'en' ? 'en-IN' : 'hi-IN';

        let baseText = inputText.trim();

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }

          const trimmed = currentTranscript.trim();
          if (trimmed) {
            setInputText(baseText ? `${baseText} ${trimmed}` : trimmed);
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition notice:', err?.error || err);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition live preview start notice:', err);
      }
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-[#FFFFFF] border-t border-[#E2E8F0] space-y-2 shrink-0">
      <div className="flex items-center justify-between px-1 text-xs">
        <div>
          {selectedFile ? (
            <div className="inline-flex items-center gap-2 bg-[#F0F5FE] text-[#1E3A8A] px-3 py-1.5 rounded-xl border border-[#CBD5E1] font-medium shadow-2xs">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Document preview"
                  className="w-7 h-7 object-cover rounded-md border border-[#CBD5E1] shrink-0"
                />
              ) : (
                <Paperclip className="w-4 h-4 text-[#D98800] shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="truncate max-w-[160px] text-xs font-semibold text-[#0F1D38]">
                  {selectedFile.name}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Photo Document
                </span>
              </div>
              <button
                onClick={onRemoveFile}
                className="p-1 text-[#64748B] hover:text-[#EF4444] hover:bg-[#CBD5E1]/50 rounded-full transition-colors ml-1 cursor-pointer"
                title="Remove document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-[#64748B]">
              {language === 'hi' ? 'दस्तावेज़/नोटिस की फोटो अटैच करें (Stamp Paper, Will, Registry, etc.)' : 'Attach Document Photo (Stamp Paper, Will, Registry, etc.)'}
            </span>
          )}
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#334155]">
          <span>
            {language === 'hi'
              ? 'AI की आवाज़ में जवाब'
              : language === 'en'
              ? "Hear AI's reply aloud"
              : 'AI ki awaaz me jawab'}
          </span>
          <input
            type="checkbox"
            checked={voiceOutputEnabled}
            onChange={(e) => {
              onToggleVoiceOutput(e.target.checked);
              if (!e.target.checked) stopSpeechOutput();
            }}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#D98800] relative"></div>
        </label>
      </div>

      <div className="bg-[#F8FAFC] rounded-2xl p-2.5 border border-[#CBD5E1] focus-within:border-[#0F1D38] focus-within:ring-2 focus-within:ring-[#0F1D38]/10 transition-all flex items-end gap-2 shadow-2xs relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          className="hidden"
          accept="image/*,application/pdf"
        />
        {fileSizeError && (
          <div className="absolute -top-8 left-0 right-0 text-xs text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/30 px-2 py-1 rounded-lg animate-fade-in">
            {fileSizeError}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2.5 rounded-xl text-[#64748B] hover:text-[#0F1D38] hover:bg-[#E2E8F0] transition-colors cursor-pointer shrink-0 mb-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach legal document photo (Stamp Paper, Registry, Will, Sale Deed, FIR, Notice, PDF)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder={disabled ? (language === 'hi' ? 'Case band hai — naye sandesh band hain' : 'Case closed — messages disabled') : PLACEHOLDERS[language]}
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent border-0 focus:outline-none resize-none text-sm leading-relaxed text-[#0F1D38] placeholder-[#94A3B8] py-1.5 px-1 min-h-[28px] max-h-[112px] overflow-y-hidden transition-all duration-75 disabled:cursor-not-allowed"
        />

        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 mb-0.5 relative ${
            isListening
              ? 'bg-[#EF4444] text-[#FFFFFF] animate-pulse shadow-md'
              : 'text-[#64748B] hover:text-[#0F1D38] hover:bg-[#E2E8F0]'
          }`}
          title="Speak message"
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {isListening && (
            <div className="absolute -right-1 -top-1 w-6 h-6 flex items-center justify-center">
              <div
                className="w-4 h-4 rounded-full bg-[#FFFFFF]/30 animate-ping"
                style={{ transform: `scale(${0.5 + micVolume * 1.5})` }}
              />
            </div>
          )}
        </button>

        {isLoading && onStop ? (
          <button
            onClick={onStop}
            className="w-10 h-10 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-[#FFFFFF] flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 mb-0.5 animate-pulse"
            title="Stop generating"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={disabled || isLoading || (!inputText.trim() && !selectedFile)}
            className="w-10 h-10 rounded-xl bg-[#0F1D38] hover:bg-[#1A2D54] disabled:opacity-40 text-[#FFFFFF] flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 mb-0.5 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-4 h-4 text-[#D98800]" />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-1 text-[11px] text-[#64748B] px-1 pt-0.5">
        <div className="flex items-center gap-1.5 font-medium shrink-0">
          <span className={`w-2 h-2 rounded-full animate-ping ${
            aiStatus === 'active' ? 'bg-[#10B981]' :
            aiStatus === 'error' ? 'bg-[#EF4444]' :
            'bg-[#F59E0B]'
          }`} />
          <span className={`text-[#0F1D38] font-bold ${
            aiStatus === 'error' ? 'text-[#EF4444]' :
            aiStatus === 'reconnecting' ? 'text-[#F59E0B]' : ''
          }`}>
            {aiStatus === 'active' ? 'Groq AI Active' :
             aiStatus === 'error' ? 'Groq AI Error' :
             'Reconnecting…'}
          </span>
        </div>
      </div>
    </div>
  );
};