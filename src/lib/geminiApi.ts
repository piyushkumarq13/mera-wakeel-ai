/**
 * Client service to communicate with server-side Gemini API endpoints.
 */

import { fetchFactsBlock } from './supabase';
import { searchKnowledgeBase, formatRAGContext } from './rag';

export interface FileData {
  mimeType: string;
  data: string; // Base64 string
  fileName?: string;
}

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeminiChatResponse {
  text: string;
  error?: string;
  documentAnalysis?: {
    documentType?: string;
    hasSignature?: boolean;
    hasStamp?: boolean;
    extractedNames?: string[];
    extractedDates?: string[];
    keyClauses?: string[];
    summary?: string;
  };
}

/**
 * Send a chat message with optional image/PDF file attachment to server-side Gemini/Groq API.
 * Grounds AI response in real legal_knowledge_base statutory chunks using RAG vector similarity search.
 */
export async function sendGeminiChatMessage(
  prompt: string,
  history: ChatApiMessage[],
  language: 'hi' | 'en' | 'hinglish' = 'hi',
  file?: FileData | null,
  isCallMode: boolean = false,
  caseId?: string | null,
  citizenId?: string | null,
  passedFactsBlock?: string | null,
  category?: any,
  excludedLawyerIds?: string[],
  signal?: AbortSignal
): Promise<GeminiChatResponse> {
  try {
    let factsBlock = passedFactsBlock || '';
    if (!file && !factsBlock && (caseId || citizenId)) {
      factsBlock = await fetchFactsBlock(caseId || null, citizenId || null);
    }

    // Skip RAG Vector Similarity Search for document attachments to eliminate unnecessary database latency
    let ragContext = '';
    if (!file && prompt && prompt.trim()) {
      try {
        const retrievedChunks = await searchKnowledgeBase(prompt, category || null, 4);
        const { contextText } = formatRAGContext(retrievedChunks, 0.25);
        ragContext = contextText;
      } catch (e) {
        console.warn('RAG similarity search warning:', e);
      }
    }

    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history,
        language,
        isCallMode,
        caseId: caseId || null,
        citizenId: citizenId || null,
        factsBlock: factsBlock || '',
        ragContext: ragContext || '',
        caseCategory: category || null,
        excludedLawyerIds: Array.isArray(excludedLawyerIds) ? excludedLawyerIds : [],
        file: file
          ? {
              mimeType: file.mimeType,
              data: file.data,
              fileName: file.fileName,
            }
          : null,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.text || 'Kripya dobara koshish karein.',
      documentAnalysis: data.documentAnalysis,
    };
  } catch (err: any) {
    console.error('Gemini API request failed:', err);
    throw err;
  }
}

/**
 * Helper to convert File to Base64
 */
export function fileToBase64(file: File): Promise<{ mimeType: string; data: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 portion from data URL
      const base64Index = result.indexOf(';base64,');
      let base64Data = result;
      let mimeType = file.type || 'application/octet-stream';

      if (base64Index !== -1) {
        mimeType = result.substring(5, base64Index) || mimeType;
        base64Data = result.substring(base64Index + 8);
      }

      // Fallback mimeType detection by file extension if type is empty
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'heic') mimeType = 'image/heic';
      }

      // If it's an image, compress it using a canvas to avoid Groq rate limit (8000 TPM limit)
      if (mimeType.startsWith('image/') && typeof window !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1200; // max width/height for fast transmission and clear OCR reading
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Output as JPEG with optimal quality for OCR and fast network speed
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
            const compBase64Index = compressedDataUrl.indexOf(';base64,');
            resolve({
              mimeType: 'image/jpeg',
              data: compressedDataUrl.substring(compBase64Index + 8),
              fileName: file.name,
            });
            return;
          }
          // fallback if canvas fails
          resolve({ mimeType, data: base64Data, fileName: file.name });
        };
        img.onerror = () => {
          // fallback on error
          resolve({ mimeType, data: base64Data, fileName: file.name });
        };
        img.src = result;
      } else {
        // Not an image, or SSR
        resolve({
          mimeType,
          data: base64Data,
          fileName: file.name,
        });
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
