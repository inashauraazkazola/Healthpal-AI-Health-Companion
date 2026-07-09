import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { speakText } from "./VoiceTools";
import { cn } from "../lib/utils";

export const PalBuddy = ({ message, isSpeaking, language = 'en-US', onSpeakingChange }: { message?: string, isSpeaking?: boolean, language?: string, onSpeakingChange?: (val: boolean) => void }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-4 relative group", isSpeaking && "z-30")}>
      <motion.div
        whileHover={{ 
          scale: 1.1,
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.9, rotate: 0 }}
        animate={{
          y: isSpeaking ? [0, -15, 0] : [0, -8, 0],
          rotate: isSpeaking ? [-5, 5, -5] : [0, 2, -2, 0],
          scale: isSpeaking ? [1, 1.1, 1] : 1
        }}
        transition={{
          y: { duration: isSpeaking ? 1.5 : 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: isSpeaking ? 1.5 : 5, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        }}
        className="w-40 h-40 flex items-center justify-center relative cursor-pointer"
      >
        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md">
          {/* SVG Content Remains Unchanged */}
          <defs>
            <linearGradient id="grayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <filter id="glowPal" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Body Pulse when speaking */}
          {isSpeaking && (
            <motion.circle 
              initial={{ r: 30, opacity: 0.5 }}
              animate={{ r: 50, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1 }}
              cx="50" cy="60" r="45" fill="none" stroke="#94A3B8" strokeWidth="2" 
            />
          )}

          {/* Connecting tube to chest piece (Moved to back) */}
          <path d="M70 60 Q90 60 90 45" stroke="#94A3B8" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="90" cy="45" r="9" fill="url(#grayGradient)" stroke="#1E293B" strokeWidth="2" />
          <circle cx="90" cy="45" r="4" fill="white" opacity="0.4" />

          {/* Arms (Animated) */}
          <motion.path 
            animate={{ rotate: isSpeaking ? [0, 45, 0] : [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.5 : 2 }}
            d="M30 65 Q20 70 25 80" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" 
          />
          <motion.path 
            animate={{ rotate: isSpeaking ? [0, -45, 0] : [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.5 : 2, delay: 0.2 }}
            d="M70 65 Q80 60 75 80" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" 
          />
          
          {/* Stethoscope Body (Refined UI) */}
          <path 
            d="M30 30 Q30 90 50 90 Q70 90 70 30" 
            stroke="#94A3B8"
            strokeWidth="12" 
            fill="none" 
            strokeLinecap="round" 
            className="transition-colors duration-300"
          />
          <path 
            d="M30 30 Q30 90 50 90 Q70 90 70 30" 
            stroke="#CBD5E1"
            strokeWidth="6" 
            fill="none" 
            strokeLinecap="round" 
            opacity="0.5"
            className="transition-colors duration-300"
          />
          
          {/* Ear pieces */}
          <circle cx="30" cy="25" r="6" fill="#64748B" />
          <circle cx="70" cy="25" r="6" fill="#64748B" />
          
          {/* Face Details */}
          <circle cx="35" cy="65" r="9" fill="#FDA4AF" opacity="0.4" />
          <circle cx="65" cy="65" r="9" fill="#FDA4AF" opacity="0.4" />
          
          {/* Eyes - Blinking */}
          <motion.circle 
            animate={{ scaleY: isSpeaking ? [1, 1.2, 1] : [1, 0.1, 1] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.3 : 3.5 }}
            cx="42" cy="58" r="3.5" fill="#1F2937" 
          />
          <motion.circle 
            animate={{ scaleY: isSpeaking ? [1, 1.2, 1] : [1, 0.1, 1] }}
            transition={{ repeat: Infinity, duration: isSpeaking ? 0.3 : 3.5 }}
            cx="58" cy="58" r="3.5" fill="#1F2937" 
          />
          
          {/* Smile / Talking */}
          <motion.path 
            animate={{ d: isSpeaking ? "M42 75 Q50 85 58 75" : "M44 70 Q50 78 56 70" }}
            stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" 
          />

          {/* Legs (Cute small feet - Sturdy stance) */}
          <path 
            d="M45 90 V108" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" 
          />
          <path 
            d="M55 90 V108" stroke="#1F2937" strokeWidth="3" fill="none" strokeLinecap="round" 
          />
          <rect x="40" y="105" width="8" height="3" rx="1.5" fill="#1F2937" />
          <rect x="52" y="105" width="8" height="3" rx="1.5" fill="#1F2937" />
        </svg>
      </motion.div>
      
      {message && (() => {
        let cleanText = message || '';
        if (cleanText.includes("* *")) {
          cleanText = cleanText.split("* *")[0];
        }
        cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "mt-2 bg-white dark:bg-slate-800/80 dark:backdrop-blur-md text-slate-700 dark:text-slate-200 p-4 rounded-2xl rounded-tl-none shadow-xl border border-emerald-50 dark:border-emerald-900/30 max-w-xs text-sm font-medium z-10 relative group-hover:bg-white dark:group-hover:bg-slate-800",
              isSpeaking && "ring-2 ring-slate-400 shadow-slate-400/20"
            )}
          >
            {cleanText}
            <button 
              onClick={() => speakText(cleanText, language, onSpeakingChange)}
              className="absolute -right-8 top-1/2 -translate-y-1/2 p-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </motion.div>
        );
      })()}
      <span className="mt-2 font-black text-emerald-600 dark:text-emerald-400 font-mono text-[10px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/20">
        PalBuddy V2.5
      </span>
    </div>
  );
};
