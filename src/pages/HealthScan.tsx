import { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Upload, ShieldAlert, CheckCircle2, Loader2, FileSearch, Mic, MicOff, Volume2, X, Zap } from 'lucide-react';
import { PalBuddy } from '../components/PalBuddy';
import { proxyChat, AI_DISCLAIMER } from '../lib/ai';
import { cn } from '../lib/utils';

import { useAuth } from '../hooks/usePersistence';
import { VoiceInputButton, speakText } from '../components/VoiceTools';
import { motion, AnimatePresence } from 'motion/react';

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

function formatMessageToHtml(text: string): string {
  if (!text) return '';
  // Gunakan cleanMessageText terpusat yang memotong semua bentuk kebocoran AI
  const cleanText: string = cleanMessageText(text);
  let html = cleanText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/^&gt;\s*(.*)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^(This AI analysis is informative and does not replace professional medical consultation.*)$/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*/g, '').replace(/#/g, '');
  const blocks = html.split(/\n\n+/);
  return blocks.map(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('<blockquote>') || trimmed.startsWith('<h2>') || trimmed.startsWith('<h3>')) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
}

export const HealthScan = ({ onBack }: { onBack: () => void }) => {
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveIntervalRef = useRef<any>(null);
  const { user } = useAuth();
  const lang = 'en-US';
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Failed to access camera. Please ensure camera permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    stopLiveVision();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (customImage?: string) => {
    const targetImage = customImage || image;
    if (!targetImage) return;
    
    setAnalyzing(true);
    if (!customImage) setResult(null);

    try {
      const base64Content = targetImage.split(',')[1];
      
      const prompt = `
        Analyze this image from a medical context (can be a medical record, X-ray, or skin condition).
        Additional notes from user: "${description || 'No additional notes'}"
        Provide the summary in English.
        
        REQUIRED:
        1. Start with a firm disclaimer: "${AI_DISCLAIMER}"
        2. Explain what is visible technically but simply.
        3. Provide suggestions for next steps (e.g.: "Discuss these notes with your specialist doctor").
        4. DO NOT provide a final diagnostic verdict.
        5. If this is in "Live Mode" (Video Call), provide very brief, concise, and reassuring feedback (maximum of 2 sentences).
      `;

      const text = await proxyChat(prompt, base64Content);
      setResult(text || "Failed to analyze image.");
      if (text && user.settings.voiceEnabled) {
        speakText(text, lang, setIsSpeaking);
      }
    } catch (err) {
      setResult("An error occurred while analyzing the image. Please ensure the image format is correct.");
    } finally {
      setAnalyzing(false);
    }
  };

  const startLiveVision = () => {
    setIsLiveMode(true);
    let framesAnalyzed = 0;
    
    liveIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && !analyzing) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = 300; // Small size for faster processing
        canvas.height = (video.videoHeight / video.videoWidth) * 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          handleAnalyze(dataUrl);
          framesAnalyzed++;
        }
      }
    }, 8000); // Analyze every 8 seconds in live mode
  };

  const stopLiveVision = () => {
    setIsLiveMode(false);
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="font-serif font-black text-slate-900 dark:text-white leading-none italic">Health Scan AI</h2>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block mt-1">Vision Diagnostic Intelligence</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 sm:p-12">
        <canvas ref={canvasRef} className="hidden" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Controls */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] text-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-500/5 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-1000" />
               <div className="relative z-10">
                 <PalBuddy isSpeaking={isSpeaking} message={analyzing ? "Analyzing..." : "Upload medical docs or show me your symptom via camera."} />
                 
                 <div className="mt-8 space-y-4">
                    <div className={cn(
                      "flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all bg-slate-50 dark:bg-slate-800 relative overflow-hidden group/label",
                      image || isCameraActive ? "border-emerald-500" : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                    )}>
                      {image ? (
                        <div className="relative w-full h-full">
                          <img src={image} className="w-full h-full object-cover rounded-[2.3rem]" />
                          <button 
                            onClick={() => setImage(null)}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isCameraActive ? (
                        <div className="relative w-full h-full">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-[2.3rem]" />
                          <div className={cn(
                            "absolute inset-0 border-4 border-emerald-500/30 rounded-[2.3rem] pointer-events-none transition-opacity",
                            isLiveMode ? "opacity-100 animate-pulse" : "opacity-0"
                          )} />
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <button 
                              onClick={capturePhoto}
                              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform border-4 border-slate-200"
                            >
                              <div className="w-full h-full rounded-full border-4 border-slate-900" />
                            </button>
                            <button 
                              onClick={isLiveMode ? stopLiveVision : startLiveVision}
                              className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all",
                                isLiveMode ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                              )}
                            >
                              {isLiveMode ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                              {isLiveMode ? 'Stop Call' : 'Video Call AI'}
                            </button>
                          </div>
                          <button 
                            onClick={stopCamera}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 outline-none"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-6 w-full h-full px-8">
                          <div className="grid grid-cols-2 gap-4 w-full">
                            <button 
                              onClick={() => {
                                setIsCameraActive(true);
                                startCamera();
                              }}
                              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group/btn"
                            >
                              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600 group-hover/btn:scale-110 transition-transform">
                                <Camera className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Camera Log</span>
                            </button>
                            <label className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group/btn cursor-pointer">
                              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center text-blue-600 group-hover/btn:scale-110 transition-transform">
                                <Upload className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Choose File</span>
                               <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-tight font-medium opacity-60">Radiology • Prescription • Skin Condition</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-left">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Symptom Description</label>
                       <div className="relative">
                         <textarea 
                           placeholder="Describe what you feel or ask about this photo..."
                           value={description}
                           onChange={e => setDescription(e.target.value)}
                           className="w-full h-24 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-emerald-500 transition-all text-sm resize-none outline-none dark:text-white"
                         />
                         <div className="absolute right-2 bottom-2">
                            <VoiceInputButton 
                              onResult={(text) => setDescription(prev => prev ? prev + ' ' + text : text)} 
                              language={lang}
                            />
                         </div>
                       </div>
                    </div>
                 </div>

                 <button 
                   disabled={(!image && !isLiveMode) || analyzing}
                   onClick={() => handleAnalyze()}
                   className="w-full mt-6 py-5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.8rem] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 group"
                 >
                   {analyzing ? (
                     <> <Loader2 className="w-4 h-4 animate-spin" /> Analyzing... </>
                   ) : (
                     <> <FileSearch className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Execute AI Analysis </>
                   )}
                 </button>
               </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-8 rounded-[2.5rem] border border-amber-100/50 dark:border-amber-900 flex gap-5 shadow-sm">
              <ShieldAlert className="w-12 h-12 text-amber-500 shrink-0" />
              <div className="space-y-1.5 text-left">
                <p className="text-[10px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-[0.2em]">Clinical Disclaimer</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed font-medium">
                  {AI_DISCLAIMER} This feature does not replace direct clinical consultation with a licensed medical practitioner.
                </p>
              </div>
            </div>
          </div>

          {/* Result Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Analysis Report
              </h3>
              {result && (
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  Ready
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.03)] min-h-[550px] relative transition-all">
               {result ? (
                 <div className="prose prose-sm dark:prose-invert prose-emerald text-left max-w-none">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => speakText(result, lang, setIsSpeaking)}
                        className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors flex items-center gap-2 font-bold text-xs"
                      >
                        <Volume2 className="w-4 h-4" /> {isSpeaking ? 'Listening...' : 'Listen Analysis'}
                      </button>
                    </div>
                     <div className="chat-content text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMessageToHtml(result) }} />
                 </div>
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 opacity-40">
                      <FileSearch className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-sm font-serif font-medium text-slate-400 dark:text-slate-500 italic">"Use the power of Healthpal Vision AI to understand health indications from your medical images."</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-4 uppercase tracking-[0.2em] font-black">Awaiting Uploaded Data</p>
                 </div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
