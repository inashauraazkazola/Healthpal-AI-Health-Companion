import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '../lib/utils';
const cleanMessageText = (rawText: string): string => {
    if (!rawText) return "";
    let clean = rawText;

    // 1. Remove <think>...</think> blocks (chain-of-thought tags)
    clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    clean = clean.replace(/<think>[\s\S]*/gi, '').trim();

    // 2. If text contains 'Final Polish' — only keep the text after it
    const finalPolishRegex = /Final\s+Polish\s*:?\s*/i;
    if (finalPolishRegex.test(clean)) {
        const parts = clean.split(finalPolishRegex);
        if (parts.length > 1) clean = parts[parts.length - 1].trim();
    }

    // 3. Remove 'Thinking Process:' block if near the top
    if (clean.includes("Thinking Process:")) {
        const idx = clean.indexOf("Thinking Process:");
        if (idx < 150) {
            let content = clean.substring(idx + "Thinking Process:".length).trim();
            if (content.includes("\n\n")) {
                content = content.split("\n\n").slice(1).join("\n\n").trim();
            }
            clean = content;
        } else {
            clean = clean.split("Thinking Process:")[0].trim();
        }
    }

    // 4. Remove 'Analyze the Request:' block if near the top
    if (clean.includes("Analyze the Request:")) {
        const idx = clean.indexOf("Analyze the Request:");
        if (idx < 150) {
            let content = clean.substring(idx + "Analyze the Request:".length).trim();
            if (content.includes("\n\n")) {
                const subParts = content.split("\n\n");
                const filteredParts = subParts.filter(p => {
                    const t = p.trim().toLowerCase();
                    return !(t.startsWith('-') || t.startsWith('*') || /^\d+\./.test(t)
                        || t.includes("determine the output") || t.includes("draft the content")
                        || t.includes("check constraints") || t.includes("refine the output")
                        || t.includes("final polish"));
                });
                if (filteredParts.length > 0) content = filteredParts.join("\n\n").trim();
            }
            clean = content;
        } else {
            clean = clean.split("Analyze the Request:")[0].trim();
        }
    }

    // 5. Remove '* *' separator (leaked reasoning boundary)
    if (clean.includes("* *")) {
        const parts = clean.split("* *");
        if (parts.length >= 3) {
            clean = parts[parts.length - 1].trim();
        } else {
            const idx = clean.indexOf("* *");
            clean = idx < 150 ? (parts[1] ? parts[1].trim() : clean) : parts[0].trim();
        }
    }

    // 6. Strip leaked reasoning keyword lines
    const reasoningLinePattern = /^(?:\d+\.\s*|[-*]\s*)?\b(?:Determine|Drafting|Draft|Review|Refine|Formulate|Thinking|Process|Context|Rule|Constraint|Translate|Interpret|Analyze|Output format|Identify|Consider|Step \d+)\b.*$/gim;
    clean = clean.replace(reasoningLinePattern, '');

    // 7. Strip decorative instruction labels from leaked drafts
    clean = clean.replace(/Heading\s*\d*\s*:\s*/gi, '');
    clean = clean.replace(/Content\s*\d*\s*:\s*/gi, '');
    clean = clean.replace(/Section\s*\d*\s*:\s*/gi, '');

    // 8. Strip all leaked markdown symbols
    clean = clean.replace(/[#*<>_`]/g, '');

    // 9. Normalize excessive blank lines (max 2 consecutive newlines)
    clean = clean.replace(/\n{3,}/g, '\n\n');

    // 10. Remove trailing stray whitespace/asterisks
    clean = clean.trim().replace(/[\s\*]+$/, '');

    // 11. Prepend default disclaimer only if response has no structured headings
    const disclaimer = "This AI analysis is informative and does not replace professional medical consultation. Please consult a licensed medical professional.";
    const hasCapitalizedHeading = clean.split('\n').some(line => {
        const trimmed = line.trim();
        return trimmed.length > 3 && trimmed === trimmed.toUpperCase() && /^[A-Z\s\d\-\&]+$/.test(trimmed);
    });
    const hasNewStructure = hasCapitalizedHeading
        || clean.toUpperCase().includes("CATATAN MEDIS")
        || clean.toUpperCase().includes("SALAM DAN EMPATI")
        || clean.toUpperCase().includes("MEDICAL DISCLAIMER")
        || clean.toUpperCase().includes("GREETINGS AND EMPATHY")
        || clean.toUpperCase().includes("CONDITION ANALYSIS");
    if (!hasNewStructure && !clean.startsWith(disclaimer) && !clean.startsWith(`> ${disclaimer}`)) {
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
