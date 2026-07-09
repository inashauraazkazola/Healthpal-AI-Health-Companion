import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/usePersistence';
import { proxyChat, AI_DISCLAIMER } from '../lib/ai';
import { PalBuddy } from '../components/PalBuddy';
import { Send, ArrowLeft, Bot, User, ShieldAlert, Volume2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { VoiceInputButton, speakText } from '../components/VoiceTools';

function cutLeakedReasoning(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  let cleaned = text;
  // Potong SEMUA teks mulai dari "* *" / "**" / "Wait, check constraints" menggunakan regex
  const regexCut = /\*\s*\*|\*\*|Wait,\s*check\s*constraints|check\s*constraints/i;
  if (regexCut.test(cleaned)) {
    cleaned = cleaned.split(regexCut)[0];
  }
  // Keyword cadangan
  const trashMarkers = ['* Okay', '* Output', '* Note:', '*Note:'];
  for (const marker of trashMarkers) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1) cleaned = cleaned.substring(0, idx);
  }
  return cleaned.trim().replace(/[\s\*]+$/, '');
}

function formatMessageToHtml(text: string): string {
  if (!text) return '';
  
  let cleanText = cutLeakedReasoning(text);

  // Escape HTML tags to prevent XSS
  let html = cleanText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert blockquotes (e.g. &gt; This AI analysis...)
  html = html.replace(/^&gt;\s*(.*)$/gm, '<blockquote>$1</blockquote>');

  // Also convert any standalone medical disclaimer lines to blockquotes to ensure green box styling applies
  html = html.replace(/^(This AI analysis is informative and does not replace professional medical consultation.*)$/gim, '<blockquote>$1</blockquote>');

  // Convert bold text **text** to <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert headings (e.g. ## heading)
  html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');

  // Strip all remaining raw asterisks (*) and hash symbols (#) from the text
  html = html.replace(/\*/g, '').replace(/#/g, '');

  // Process paragraphs
  const blocks = html.split(/\n\n+/);
  const processedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('<blockquote>') || trimmed.startsWith('<h2>') || trimmed.startsWith('<h3>')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return processedBlocks.join('');
}

export const AIChat = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const lang = 'en-US';

  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);

  useEffect(() => {
    if (user) {
      setMessages([
        { 
          role: 'ai', 
          content: "Hello! I am PalBuddy, your smart health friend."         }
      ]);
    }
  }, []);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  const handleSend = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = textToSend.trim();
    if (!customInput) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'PalBuddy'}: ${m.content}`).join('\n');
      const prompt = [
        `The user manages: ${user.selectedDiseases.join(', ')}.`,
        handsFree ? 'Hands-free mode is on — keep it short and easy to listen to.' : '',
        history ? `Recent conversation:\n${history}` : '',
        `User says: "${userMsg}"`,
        '/no_think',
      ].filter(Boolean).join('\n');

      let text = await proxyChat(prompt);
      // ── LAPIS KEDUA: Potong kebocoran teks batin sebelum masuk ke state ──
      text = cutLeakedReasoning(text);
      setMessages(prev => [...prev, { role: 'ai', content: text }]);
      
      // Auto speak based on voiceEnabled, handsFree or length
      // Bersihkan teks untuk TTS agar tidak mengucapkan simbol bintang
      const cleanTextForSpeech = text.replace(/[\*#_>]/g, '').trim();
      if (user.settings.voiceEnabled || handsFree || (text.length < 300 && !handsFree)) {
        speakText(cleanTextForSpeech, lang, setIsSpeaking);
      }
    } catch (error) {
      console.error("AI Error:", error);
      let errorMessage = "Sorry, PalBuddy is currently unable to connect.";
      
      if (error instanceof Error) {
        errorMessage += ` (${error.message})`;
      }
      setMessages(prev => [...prev, { role: 'ai', content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4 text-left">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center relative">
               <Bot className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
               {isSpeaking && (
                 <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
               )}
             </div>
             <div>
               <h2 className="font-bold text-slate-800 dark:text-white leading-none">PalBuddy</h2>
               <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Health AI</span>
             </div>
          </div>
        </div>
        <button 
          onClick={() => setHandsFree(!handsFree)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            handsFree ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          )}
        >
          {handsFree ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          {handsFree ? "Hands-Free On" : "Hands-Free Off"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex justify-center mb-8">
           <PalBuddy 
             isSpeaking={isSpeaking} 
             message={messages[messages.length - 1]?.role === 'ai' ? messages[messages.length - 1]?.content.substring(0, 50) + '...' : "Listening..."} 
             language={lang}
             onSpeakingChange={setIsSpeaking}
           />
        </div>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={cn(
                "flex items-start gap-3",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-slate-200 dark:bg-slate-800" : "bg-emerald-500"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600 dark:text-slate-400" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={cn(
                "max-w-[85%] md:max-w-[70%] p-4 rounded-3xl text-sm leading-relaxed text-left relative group",
                msg.role === 'user' 
                  ? "bg-slate-900 dark:bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-500/10 dark:shadow-none" 
                  : "bg-white dark:bg-slate-900/80 dark:backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800"
              )}>
                {msg.role === 'ai' && (
                  <button 
                    onClick={() => speakText(msg.content, lang, setIsSpeaking)}
                    className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                {msg.role === 'ai' && i > 0 && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-50 dark:border-white/5 text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                    <ShieldAlert className="w-3 h-3" /> Medical Alert
                  </div>
                )}
                <div 
                  className="chat-content text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessageToHtml(msg.content) }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex items-center gap-2 text-emerald-500 text-xs italic">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            PalBuddy is typing...
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex gap-3">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Type your symptoms or questions here..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-6 pr-14 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm dark:text-white"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <VoiceInputButton 
                onResult={(text) => handleSend(text)} 
                language={lang}
                className="bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/30" 
              />
            </div>
          </div>
          <button 
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3 font-medium">
          *PalBuddy does not replace professional medical consultation.
        </p>
      </div>
    </div>
  );
};
