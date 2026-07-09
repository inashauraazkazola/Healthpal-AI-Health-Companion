import { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '../lib/utils';

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
  
  const chunks = text.match(/.{1,200}(\s|$)/g) || [text];
  
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
