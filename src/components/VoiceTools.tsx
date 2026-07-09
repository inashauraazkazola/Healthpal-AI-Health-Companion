import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
const cleanMessageText = (rawText: string): string => {
    if (!rawText) return "";
    let clean = rawText;

    // Hapus tag <think>...</think> jika ada
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/<think>[\s\S]*/gi, '').trim();

    // Hapus "Thinking Process:" jika berada di awal/dekat awal, atau potong jika di akhir
    if (clean.includes("Thinking Process:")) {
        const idx = clean.indexOf("Thinking Process:");
        if (idx < 150) {
            let content = clean.substring(idx + "Thinking Process:".length).trim();
            if (content.includes("\n\n")) {
                const subParts = content.split("\n\n");
                const firstPart = subParts[0].trim();
                const looksLikeReasoning = firstPart.startsWith("-") || firstPart.startsWith("*") || /^\d+\./.test(firstPart) || firstPart.toLowerCase().includes("should") || firstPart.toLowerCase().includes("will suggest") || firstPart.toLowerCase().includes("user");
                if (looksLikeReasoning) {
                    content = subParts.slice(1).join("\n\n").trim();
                } else {
                    content = subParts.slice(1).join("\n\n").trim();
                }
            }
            clean = content;
        } else {
            clean = clean.split("Thinking Process:")[0].trim();
        }
    }

    // Hapus "* *" jika berada di awal/dekat awal, atau potong jika di akhir
    if (clean.includes("* *")) {
        const parts = clean.split("* *");
        if (parts.length >= 3) {
            clean = parts[parts.length - 1].trim();
        } else {
            const idx = clean.indexOf("* *");
            if (idx < 150) {
                clean = parts[1] ? parts[1].trim() : clean;
            } else {
                clean = parts[0].trim();
            }
        }
    }

    // Bersihkan sisa spasi atau karakter bintang menggantung di paling bawah
    clean = clean.trim().replace(/[\s\*]+$/, '');

    // 4. Pastikan struktur wajib: Disclaimer Medis di paling atas
    const disclaimer = "This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.";
    if (!clean.startsWith(disclaimer) && !clean.startsWith(`> ${disclaimer}`)) {
        clean = clean.replace(/^This AI analysis is informative.*?\n+/gi, '');
        clean = `> ${disclaimer}\n\n${clean.trim()}`;
    }

    return clean;
};

export const useSpeechRecognition = (onResult: (text: string) => void, language: string = 'en-US') => {
  const [isListening, setIsListening] = useState(false);
  
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    recognition.start();
  };

  return { isListening, startListening };
};

export const speakText = (text: string, language: string = 'en-US', onStateChange?: (speaking: boolean) => void) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  // Gunakan cleanMessageText terpusat — memotong SEMUA bentuk kebocoran AI
  const cleaned = cleanMessageText(text || '');
  // Hapus simbol markdown agar TTS tidak mengeja bintang/hash
  const cleanTextForSpeech = cleaned.replace(/[\*#_>]/g, '').trim();
  const chunks = cleanTextForSpeech.match(/.{1,200}(\s|$)/g) || [cleanTextForSpeech];
  
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk.trim());
    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1.1; 
    
    utterance.onstart = () => onStateChange?.(true);
    utterance.onend = () => {
      if (index === chunks.length - 1) onStateChange?.(false);
    };
    utterance.onerror = () => onStateChange?.(false);

    window.speechSynthesis.speak(utterance);
  });
};

export const VoiceInputButton = ({ onResult, className, language }: { onResult: (text: string) => void, className?: string, language?: string }) => {
  const { isListening, startListening } = useSpeechRecognition(onResult, language);
  return (
    <button 
      type="button"
      onClick={startListening}
      className={cn(
        "p-2 rounded-xl transition-all h-full flex items-center justify-center", 
        isListening ? "bg-rose-100 text-rose-500 animate-pulse ring-2 ring-rose-500" : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500",
        className
      )}
      title="Voice Input"
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
};
