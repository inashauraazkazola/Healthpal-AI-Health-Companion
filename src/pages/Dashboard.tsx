import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth, usePersistence, safeParse } from '../hooks/usePersistence';
import { DISEASE_REGISTRY, UNIVERSAL_WIDGETS } from '../lib/registry';
import { 
  Heart, Pill, Wallet, Activity, TrendingUp, MessageCircle, MessageSquare,
  Camera, FileText, Settings, LogOut, ChevronRight, ChevronDown, Calculator,
  Plus, Calendar, Clock, X, Flame, Zap, Droplets, Check, Mic, MicOff, Volume2, Moon, Smile, ShieldCheck,
  BarChart3, CreditCard, Trophy, Utensils, Download, Table, Search, MapPin, Navigation, Phone, ExternalLink, BookOpen, FolderOpen,
  FolderPlus, Upload, Share2, Edit2, Trash2, MoreVertical, Folder, ArrowLeft, MoreHorizontal, File
} from 'lucide-react';
import { PalBuddy } from '../components/PalBuddy';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { BottomNav, TabType } from '../components/BottomNav';
import { AI_DISCLAIMER, proxyChat, cleanMessageText } from '../lib/ai';
import { speakText as speakTextShared, useSpeechRecognition, VoiceInputButton as VoiceInputButtonShared } from '../components/VoiceTools';
import { HealthData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, Brush, LineChart, Line 
} from 'recharts';

// Alias lokal — semua panggilan tetap bisa pakai nama lama ini
const cutLeakedReasoning = cleanMessageText;

export const Dashboard = ({ onNavigate }: { onNavigate: (page: any) => void }) => {
  const { user, logout, updateUser } = useAuth();

  const getLocalDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [healthData, setHealthData] = usePersistence<HealthData>(`hp_data_${user?.id || 'temp'}`, {
    userId: user?.id || '',
    bmiData: [],
    expenses: [],
    symptoms: [],
    dailySteps: [],
    activities: [],
    documents: [],
    streak: 0,
    lastUpdate: '',
    aiInsights: 'Welcome! Press any tracker menu to start your day.',
    badges: [],
    medications: [],
    mealLogs: [],
    hydrationLogs: [],
    mentalHealth: [],
    sleepLogs: [],
    vitalLogs: [],
  }, user?.id);

  const displayedAiInsights = useMemo(() => {
    let rawText = healthData.aiInsights;
    if (rawText === 'Selamat datang! Tekan salah satu menu pelacak untuk memulai hari Anda.') {
      rawText = "Welcome! Press any tracker menu to start your day.";
    }
    return cutLeakedReasoning(rawText || '');
  }, [healthData.aiInsights]);

  const [symptomSeverity, setSymptomSeverity] = useState(1);
  const [symptomInput, setSymptomInput] = useState({ description: '', severity: 1 });
  const [mentalInput, setMentalInput] = useState({ mood: 'neutral', stressLevel: 1, note: '' });
  const [sleepInput, setSleepInput] = useState({ duration: 8, quality: 'good' as any });
  const [isAnalyzingSymptoms, setIsAnalyzingSymptoms] = useState(false);
  const [isAnalyzingMental, setIsAnalyzingMental] = useState(false);
  const [isAnalyzingSleep, setIsAnalyzingSleep] = useState(false);
  const [bmiAiInsight, setBmiAiInsight] = useState<string | null>(null);
  const [isGeneratingBmiAi, setIsGeneratingBmiAi] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [modalInput, setModalInput] = useState('');
  const [isPalSpeaking, setIsPalSpeaking] = useState(false);

  const speakText = (text: string) => {
    const lang = 'en-US';
    let cleanText: string = text;
    if (cleanText.includes("* *")) {
      cleanText = cleanText.split("* *")[0];
    }
    cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
    speakTextShared(cleanText, lang, setIsPalSpeaking);
  };

  // Auto-speak daily insights if enabled
  const hasSpokenRef = useRef(false);
  useEffect(() => {
    if (user?.settings?.voiceEnabled && displayedAiInsights && !hasSpokenRef.current && !isPalSpeaking) {
      speakText(displayedAiInsights);
      hasSpokenRef.current = true;
    }
  }, [displayedAiInsights, user?.settings?.voiceEnabled]);
  const [bmiInput, setBmiInput] = useState({ height: user?.biometrics?.height || '', weight: user?.biometrics?.weight || '' });
  const [bmiResult, setBmiResult] = useState<{ value: number; status: string; color: string; tips: string } | null>(null);
  const [symptomAiFeedback, setSymptomAiFeedback] = useState<string | null>(null);
  const [nutritionAiFeedback, setNutritionAiFeedback] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isGeneratingSymptomAi, setIsGeneratingSymptomAi] = useState(false);
  const [isGeneratingNutritionAi, setIsGeneratingNutritionAi] = useState(false);
  const [meals, setMeals] = useState<Record<string, { content: string, feedback: string | null, isAnalyzing: boolean }>>({
    Breakfast: { content: '', feedback: null, isAnalyzing: false },
    Lunch: { content: '', feedback: null, isAnalyzing: false },
    Dinner: { content: '', feedback: null, isAnalyzing: false },
    Snack: { content: '', feedback: null, isAnalyzing: false },
  });
  const [financeInput, setFinanceInput] = useState({ name: '', price: '' });
  const [medInputs, setMedInputs] = useState<{ id: string; name: string; timesPerDay: string }[]>([
    { id: crypto.randomUUID(), name: '', timesPerDay: '1' }
  ]);
  const [vitalInput, setVitalInput] = useState({ 
    type: 'blood-pressure' as any, 
    value: '', 
    value2: '', // for systolic/diastolic
    unit: 'mmHg' 
  });
  const [selectedVaultFile, setSelectedVaultFile] = useState<any | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [waterCount, setWaterCount] = useState(0);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAnalyzingMedId, setIsAnalyzingMedId] = useState<string | null>(null);
  const [isAnalyzingHydration, setIsAnalyzingHydration] = useState(false);
  const [isAnalyzingSteps, setIsAnalyzingSteps] = useState(false);
  const [analyzingMealType, setAnalyzingMealType] = useState<string | null>(null);
  
  // Location States
  const [searchLocation, setSearchLocation] = useState('');
  const [activeLocationCategory, setActiveLocationCategory] = useState('Hospitals');

  // Accelerometer States
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [liveSteps, setLiveSteps] = useState(0);
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const lastUpdate = useRef(0);
  const stepThreshold = 12;
  
  // --- Voice & History Features ---
  const [inputHistory, setInputHistory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('healthpal_input_history');
    return safeParse(saved) || {};
  });

  const addToHistory = (category: string, value: string) => {
    if (!value || String(value).trim() === '') return;
    setInputHistory(prev => {
      const catHistory = prev[category] || [];
      if (catHistory.includes(value)) return prev;
      const newHistory = [value, ...catHistory].slice(0, 5); // Keep last 5
      const newState = { ...prev, [category]: newHistory };
      localStorage.setItem('healthpal_input_history', JSON.stringify(newState));
      return newState;
    });
  };

  const VoiceInputButton = ({ onResult, className }: { onResult: (text: string) => void, className?: string }) => {
    const lang = 'en-US';
    return <VoiceInputButtonShared onResult={onResult} className={className} language={lang} />;
  };

  const HistorySuggestions = ({ category, onSelect }: { category: string, onSelect: (val: string) => void }) => {
    const history = inputHistory[category] || [];
    if (history.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {history.map((val, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(val)}
            className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-full border border-slate-100 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-500 transition-all max-w-[150px] truncate"
          >
            {val}
          </button>
        ))}
      </div>
    );
  };
  // --------------------------------

  const startLiveTracking = async () => {
    if (typeof DeviceMotionEvent === 'undefined') {
      alert("Motion sensor is not available on this device. Please use a smartphone for this feature.");
      return;
    }
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          alert("Permission to access motion sensor was denied.");
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    setIsLiveTracking(true);
    setLiveSteps(0);
  };

  useEffect(() => {
    if (!isLiveTracking) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;

      const now = Date.now();
      if (now - lastUpdate.current > 100) {
        const diffX = Math.abs(lastAccel.current.x - (accel.x || 0));
        const diffY = Math.abs(lastAccel.current.y - (accel.y || 0));
        const diffZ = Math.abs(lastAccel.current.z - (accel.z || 0));
        
        // Simple heuristic: if magnitude of change is > threshold, count as step
        if (diffX + diffY + diffZ > stepThreshold) {
          setLiveSteps(prev => prev + 1);
        }

        lastAccel.current = { x: accel.x || 0, y: accel.y || 0, z: accel.z || 0 };
        lastUpdate.current = now;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isLiveTracking]);

  const saveLiveSteps = () => {
    if (liveSteps > 0) {
      const today = getLocalDate();
      const currentSteps = (healthData.dailySteps || []).find(s => s.date === today)?.count || 0;
      handleLog('activity-tracker', { steps: (currentSteps + liveSteps).toString() });
    }
    setIsLiveTracking(false);
    setLiveSteps(0);
  };

  // --- NEW: Health Score Calculation ---
  const healthScore = useMemo(() => {
    let score = 50; // Starting point
    const today = getLocalDate();
    
    // Streak impact (max 20)
    score += Math.min((healthData.streak || 0) * 2, 20);
    
    // Hydration impact (today) - searching through activities for hydration logs
    const todayActivities = (healthData.activities || []).filter(a => a.date === today);
    let todayWater = 0;
    todayActivities.forEach(act => {
      const waterMatch = act.description.match(/(?:Hydration|Hidrasi): (\d+)/);
      if (waterMatch) todayWater = Math.max(todayWater, parseInt(waterMatch[1]));
    });
    
    if (todayWater >= 8) score += 15;
    else if (todayWater > 0) score += 5;

    // Meds impact
    const todayMeds = (healthData.medications || []).filter(m => m.date === today);
    if (todayMeds.length > 0) {
      const takenCount = todayMeds.filter(m => m.taken).length;
      score += (takenCount / todayMeds.length) * 15;
    }

    // Symptoms impact (penalty)
    const todaySymptoms = (healthData.symptoms || []).filter(s => s.date === today);
    score -= todaySymptoms.length * 5;

    return Math.min(Math.max(Math.round(score), 0), 100);
  }, [healthData]);

  // --- NEW: Daily Quests ---
  const dailyQuests = useMemo(() => {
    const today = getLocalDate();
    const quests = [
      { id: 'water', label: 'Drink 8 Glasses of Water', icon: <Droplets className="w-4 h-4" />, target: 8, current: 0 },
      { id: 'meds', label: 'Take All Medications', icon: <Pill className="w-4 h-4" />, target: 1, current: 0 },
      { id: 'steps', label: 'Walk 5,000 Steps', icon: <TrendingUp className="w-4 h-4" />, target: 5000, current: 0 },
      { id: 'symptom', label: "Record Today's Symptoms", icon: <Activity className="w-4 h-4" />, target: 1, current: 0 },
    ];

    // Calc progress
    const todayActivities = (healthData.activities || []).filter(a => a.date === today);
    let todayWater = 0;
    todayActivities.forEach(act => {
      const waterMatch = act.description.match(/(?:Hydration|Hidrasi): (\d+)/);
      if (waterMatch) todayWater = Math.max(todayWater, parseInt(waterMatch[1]));
    });
    quests[0].current = todayWater;

    const todayMeds = (healthData.medications || []).filter(m => m.date === today);
    if (todayMeds.length > 0) {
      quests[1].current = todayMeds.every(m => m.taken) ? 1 : 0;
    } else {
      quests[1].current = 1; // Default pass if no meds scheduled
    }
    
    const todaySteps = (healthData.dailySteps || []).find(s => s.date === today)?.count || 0;
    quests[2].current = todaySteps;

    const todaySymptoms = (healthData.symptoms || []).filter(s => s.date === today).length;
    quests[3].current = todaySymptoms >= 1 ? 1 : 0;

    return quests;
  }, [healthData]);

  const dailyProgressPercent = useMemo(() => {
    if (dailyQuests.length === 0) return 0;
    const totalProgress = dailyQuests.reduce((acc, quest) => {
      const progress = quest.id === 'water' || quest.id === 'steps' 
        ? (quest.current / quest.target) * 100 
        : (quest.current >= quest.target ? 100 : 0);
      return acc + Math.min(progress, 100);
    }, 0);
    return Math.round(totalProgress / dailyQuests.length);
  }, [dailyQuests]);

  const userDiseases = useMemo(() => {
    return DISEASE_REGISTRY.filter(d => user?.selectedDiseases?.includes(d.id));
  }, [user?.selectedDiseases]);

  const monthlyExpenses = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(m => ({ name: m, total: 0 }));
    
    healthData.expenses?.forEach(exp => {
      if (exp && exp.date && exp.amount !== undefined) {
        const date = new Date(exp.date);
        const monthIdx = date.getMonth();
        if (data[monthIdx]) {
          data[monthIdx].total += exp.amount;
        }
      }
    });

    return data;
  }, [healthData.expenses]);

  const medicationStats = useMemo(() => {
    const stats: Record<string, { taken: number; total: number }> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    healthData.medications?.forEach(med => {
      if (!med || !med.date || !med.name) return;
      const [year, month] = med.date.split('-').map(Number);
      if (month === currentMonth + 1 && year === currentYear) {
        if (!stats[med.name]) {
          stats[med.name] = { taken: 0, total: 0 };
        }
        stats[med.name].total++;
        if (med.taken) {
          stats[med.name].taken++;
        }
      }
    });

    const result = Object.entries(stats).map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 10) + '..' : name,
      fullName: name,
      count: data.taken,
      total: data.total
    }));

    return result;
  }, [healthData.medications]);

  const symptomHeatmapData = useMemo(() => {
    const last14Days = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const dateStr = getLocalDate(d);
      
      // Find symptoms for this day
      const daySymptoms = healthData.symptoms?.filter(s => s.date === dateStr) || [];
      const maxSeverity = daySymptoms.length > 0 
        ? Math.max(...daySymptoms.map(s => (s as any).severity || 1)) 
        : 0;
        
      const latestSymptom = daySymptoms[daySymptoms.length - 1];

      return {
        date: dateStr,
        displayDate: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        severity: maxSeverity,
        mood: latestSymptom?.mood || 'happy',
        text: latestSymptom?.text || 'Healthy'
      };
    });
    return last14Days;
  }, [healthData.symptoms]);

  const hydrationStats = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: getLocalDate(d),
        glasses: 0,
        meals: 0,
        steps: 0,
        meds: 0
      };
    });

    last7Days.forEach(d => {
       const dayMeds = (healthData.medications || []).filter(m => m.date === d.fullDate && m.taken);
       d.meds = dayMeds.length;
       
       const daySteps = (healthData.dailySteps || []).find(s => s.date === d.fullDate);
       if (daySteps) {
         d.steps = daySteps.count;
       }
    });

    healthData.activities?.forEach(act => {
      const actDate = act.date;
      const dayData = last7Days.find(d => d.fullDate === actDate);
      if (dayData) {
        // Hydration logic
        const waterMatch = act.description.match(/(?:Hydration|Hidrasi): (\d+)/);
        if (waterMatch) {
          dayData.glasses = Math.max(dayData.glasses, parseInt(waterMatch[1]));
        }
        
        // Steps logic (fallback if not in dailySteps)
        const stepsMatch = act.description.match(/(?:Today's Steps|Langkah Hari Ini): (\d+)/);
        if (stepsMatch && !dayData.steps) {
           dayData.steps = Math.max(dayData.steps || 0, parseInt(stepsMatch[1]));
        }

        // Meal patterns logic
        if (act.description.includes('Diet:') || act.description.includes('Pola Makan:')) {
          const splitKey = act.description.includes('Diet:') ? 'Diet:' : 'Pola Makan:';
          const mealParts = act.description.split(splitKey)[1].split('|');
          let count = 0;
          mealParts.forEach(part => {
             if (part.includes(':') && part.split(':')[1].trim().length > 0 && !part.includes('Hydration') && !part.includes('Hidrasi')) {
               count++;
             }
          });
          dayData.meals = Math.max(dayData.meals || 0, count);
        }
      }
    });

    return last7Days;
  }, [healthData.activities, healthData.medications, healthData.dailySteps]);

  const bmiHistoryData = useMemo(() => {
    // Get last 7 entries or entries from last 30 days
    return (healthData.bmiData || []).slice(-7).map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }));
  }, [healthData.bmiData]);

  const sleepHistoryData = useMemo(() => {
    return (healthData.sleepLogs || []).slice(-7).map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }));
  }, [healthData.sleepLogs]);

  const mentalHistoryData = useMemo(() => {
    return (healthData.mentalHealth || []).slice(-7).map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }));
  }, [healthData.mentalHealth]);

  const vitalHistoryData = useMemo(() => {
    const logs = healthData.vitalLogs || [];
    // Group by type for easier charting
    const bp = logs.filter(l => l.type === 'blood-pressure').slice(-7).map(l => {
      const [sys, dia] = l.value.split('/').map(Number);
      return { date: l.date, sys, dia, displayDate: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) };
    });
    const glucose = logs.filter(l => l.type === 'glucose').slice(-7).map(l => ({
      date: l.date,
      value: parseFloat(l.value),
      displayDate: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }));
    const heart = logs.filter(l => l.type === 'heart-rate').slice(-7).map(l => ({
      date: l.date,
      value: parseFloat(l.value),
      displayDate: new Date(l.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }));
    
    return { bp, glucose, heart };
  }, [healthData.vitalLogs]);

  const dayInsights = useMemo(() => {
    if (!selectedDay) return null;
    
    const daySymptoms = (healthData.symptoms || []).filter(s => s.date === selectedDay);
    const daySteps = (healthData.dailySteps || []).find(s => s.date === selectedDay)?.count || 0;
    const dayMeds = (healthData.medications || []).filter(m => m.date === selectedDay);
    const dayExpenses = (healthData.expenses || []).filter(e => e.date === selectedDay);
    const dayBmi = (healthData.bmiData || []).find(b => b.date === selectedDay);
    
    let hydration = 0;
    let meals: string[] = [];
    
    (healthData.activities || []).filter(a => a.date === selectedDay).forEach(act => {
       const waterMatch = act.description.match(/(?:Hydration|Hidrasi): (\d+)/);
       if (waterMatch) hydration = Math.max(hydration, parseInt(waterMatch[1]));
       
       if (act.description.includes('Diet:') || act.description.includes('Pola Makan:')) {
          const splitKey = act.description.includes('Diet:') ? 'Diet:' : 'Pola Makan:';
          const content = act.description.split(splitKey)[1].split('|')[0];
          meals = content.split(',').map(m => m.trim()).filter(Boolean);
       }
    });

    return {
      date: selectedDay,
      formattedDate: new Date(selectedDay).toLocaleDateString('en-US', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
      }),
      symptoms: daySymptoms,
      steps: daySteps,
      meds: dayMeds,
      expenses: dayExpenses,
      bmi: dayBmi,
      hydration,
      meals
    };
  }, [selectedDay, healthData]);

  const allWidgets = useMemo(() => {
    const mandatory = [
      'activity-tracker', 
      'medication-tracker', 
      'health-finance', 
      'symptom-logger'
    ];
    const specific = userDiseases.flatMap(d => d.widgets);
    return [...new Set([...mandatory, ...specific])];
  }, [userDiseases]);

  useEffect(() => {
    if (!user) return;
    const today = getLocalDate();
    
    // Basic streak check on first load of the day
    if (healthData.lastUpdate !== today && healthData.lastUpdate) {
      const lastDate = new Date(healthData.lastUpdate);
      const diff = Math.floor((new Date(today).getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diff > 1) {
        setHealthData(prev => ({ ...prev, streak: 0 }));
      }
    }

    // Initialize meals from persistence
    const todayLog = (healthData.mealLogs || []).find(log => log.date === today);
    if (todayLog) {
      setMeals(prev => {
        const next = { ...prev };
        Object.keys(todayLog.meals).forEach(key => {
          next[key] = { ...next[key], ...todayLog.meals[key] };
        });
        return next;
      });
    }
  }, [user, healthData.lastUpdate]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 }
    }
  };

  if (!user) return null;

  const generateAiInsight = async (newData: HealthData) => {
    setIsGeneratingAi(true);
    try {
      const prompt = `
        Brief analysis of the user's health condition based on the latest log:
        - Disease/Conditions: ${userDiseases.map(d => d.name).join(', ')}
        - Last BMI: ${(newData.bmiData || [])[(newData.bmiData || []).length - 1]?.value || 'N/A'}
        - Steps: ${(newData.dailySteps || [])[(newData.dailySteps || []).length - 1]?.count || 0}
        - Symptoms: ${(newData.symptoms || [])[(newData.symptoms || []).length - 1]?.text || 'None'}
        - Streak: ${newData.streak || 0} days
        
        Provide 1-2 sentences of brief advice in English. Include the medical disclaimer at the end: "${AI_DISCLAIMER}"
      `;

      let text = await proxyChat(prompt);
      text = cutLeakedReasoning(text);
      if (text) {
        setHealthData(prev => ({ ...prev, aiInsights: text }));
        speakText(text.replace(/[\*#_>]/g, '').trim());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const generateSymptomFeedback = async (symptom: string, symptomId: string) => {
    setIsGeneratingSymptomAi(true);
    setIsAnalyzingSymptoms(true);
    try {
      const prompt = `
        Analyze user symptoms: "${symptom}".
        User's current health conditions: ${userDiseases.map(d => d.name).join(', ')}.
        
        Provide a detailed guidance guide in English with the following structure (use bullet points for easy reading):
        1. **Brief Analysis**: Potential mild causes of this symptom associated with the user's medical history.
        2. **Solutions & Actions**:
           - **Medication/Treatment Suggestion**: Suggest safe over-the-counter (OTC) medicine categories (like paracetamol, antacids, etc. as appropriate for the symptoms) or self-care at home.
           - **Nutrition & Food**: Suggest what should be consumed (e.g., soft foods, warm water, specific fruits) or what to avoid.
           - **Lifestyle**: Resting position, warm/cold compress, or mild physical actions.
        3. **Danger Signs (Red Flags)**: Specific danger signs of when the user MUST immediately consult a doctor or go to the hospital.
        
        Must include this medical disclaimer at the very end: "${AI_DISCLAIMER}"
      `;

      let text = await proxyChat(prompt);
      text = cutLeakedReasoning(text);
      const feedback = text || "Sorry, I cannot process feedback at this time.";
      setSymptomAiFeedback(feedback);
      speakText(feedback.replace(/[\*#_>]/g, '').trim());
      
      // Update health data with the history
      setHealthData(prev => ({
        ...prev,
        symptoms: prev.symptoms.map(s => s.id === symptomId ? { ...s, aiFeedback: feedback } : s)
      }));
    } catch (e) {
      console.error(e);
      setSymptomAiFeedback("An error occurred while contacting PalBuddy. Please check your connection or your API Key.");
    } finally {
      setIsGeneratingSymptomAi(false);
      setIsAnalyzingSymptoms(false);
    }
  };

  const generateNutritionFeedback = async (mealType: string) => {
    const content = meals[mealType].content;
    if (!content) return;

    setMeals(prev => ({
      ...prev,
      [mealType]: { ...prev[mealType], isAnalyzing: true, feedback: null }
    }));

    try {
      const prompt = `
        User just ate ${mealType}: "${content}".
        User's health condition: ${userDiseases.map(d => d.name).join(', ')}.
        Health goal: ${user.healthGoal}.
        
        Provide a brief analysis (2-3 sentences) in English:
        1. Is this food healthy/suitable for the user's condition?
        2. Suggestions for improvement if it is not healthy.
        3. Compatibility percentage (0-100%).
        
        Include a brief medical disclaimer.
      `;

      let text = await proxyChat(prompt);
      text = cutLeakedReasoning(text);
      const feedback = text || "Feedback not available.";
      setMeals(prev => ({
        ...prev,
        [mealType]: { ...prev[mealType], feedback, isAnalyzing: false }
      }));
      if (text) speakText(text.replace(/[\*#_>]/g, '').trim());
    } catch (e) {
      console.error(e);
      setMeals(prev => ({
        ...prev,
        [mealType]: { ...prev[mealType], feedback: "Failed to analyze nutrition.", isAnalyzing: false }
      }));
    }
  };

  const generateMedicationAnalysis = async (medId: string, medName: string) => {
    setIsAnalyzingMedId(medId);
    try {
      const prompt = `
        As the PalBuddy medical AI assistant, analyze the following medication for the user:
        Medication: ${medName}
        User's Health Conditions: ${userDiseases.map(d => d.name).join(', ')}
        Biometrics: Weight ${user?.biometrics?.weight}kg, Height ${user?.biometrics?.height}cm
        
        Provide the analysis in English covering:
        1. **Dosage Analysis**: Is the dosage reasonable or is there an overdose risk based on the user's profile?
        2. **Suitability**: Is this medication appropriate/suitable for the indications/conditions of the user? Are there any contraindications?
        
        Use a professional yet easy-to-understand tone. Use bullet points.
        Include the required medical disclaimer: "${AI_DISCLAIMER}"
      `;

      let text = await proxyChat(prompt);
      text = cutLeakedReasoning(text);
      if (text) {
        setHealthData(prev => ({
          ...prev,
          medications: prev.medications?.map(m => m.id === medId ? { ...m, analysis: text || "Analysis not available." } : m) || []
        }));
        speakText(text.replace(/[\*#_>]/g, '').trim());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingMedId(null);
    }
  };

  const generateHydrationAnalysis = async () => {
    setIsAnalyzingHydration(true);
    const today = getLocalDate();
    try {
      const prompt = `
        As the PalBuddy medical AI assistant, analyze the following daily hydration level of the user:
        Water Intake: ${waterCount} Glasses
        User's Health Conditions: ${userDiseases.map(d => d.name).join(', ')}
        Biometrics: Weight ${user?.biometrics?.weight}kg, Height ${user?.biometrics?.height}cm
        Activity Level: ${user?.activityLevel}
        
        Provide a concise and compact analysis in English:
        1. Is the hydration sufficient?
        2. Specific recommendations based on the user's health conditions (e.g., if kidney or heart conditions, fluid restrictions might apply).
        
        Include the required medical disclaimer: "${AI_DISCLAIMER}"
      `;

      let text = await proxyChat(prompt);
      text = cutLeakedReasoning(text);
      if (text) {
        setHealthData(prev => {
          const logs = [...(prev.hydrationLogs || [])];
          const idx = logs.findIndex(l => l.date === today);
          if (idx >= 0) logs[idx] = { ...logs[idx], amount: waterCount, analysis: text || "" };
          else logs.push({ date: today, amount: waterCount, analysis: text || "" });
          return { ...prev, hydrationLogs: logs };
        });
        speakText(text.replace(/[\*#_>]/g, '').trim());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingHydration(false);
    }
  };

  const generateNutritionAnalysis = async (mealType: string) => {
    setAnalyzingMealType(mealType);
    const today = getLocalDate();
    const mealContent = meals[mealType].content;
    try {
      const prompt = `
        As the PalBuddy medical AI assistant, analyze the user's following ${mealType} menu:
        Menu: ${mealContent}
        User's Health Conditions: ${userDiseases.map(d => d.name).join(', ')}
        Biometrics: Weight ${user?.biometrics?.weight}kg, Height ${user?.biometrics?.height}cm
        
        Provide a nutrition analysis including:
        1. **Nutritional Quality**: Analysis of macronutrients and micronutrients of the menu.
        2. **Condition Relevance**: Is this menu suitable for someone with ${userDiseases.map(d => d.name).join(', ')}?
        3. **Mealtime Relevance**: Is this menu appropriate to eat for ${mealType}?
        
        Provide brief bullet points in English.
        Include the required medical disclaimer: "${AI_DISCLAIMER}"
      `;

      const text = await proxyChat(prompt);
      if (text) {
        setHealthData(prev => {
          const logs = [...(prev.mealLogs || [])];
          let dayLog = logs.find(l => l.date === today);
          if (!dayLog) {
            dayLog = { date: today, meals: {} };
            logs.push(dayLog);
          }
          dayLog.meals[mealType] = { 
            content: mealContent, 
            feedback: meals[mealType].feedback,
            analysis: text || "" 
          };
          return { ...prev, mealLogs: logs };
        });
        speakText(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingMealType(null);
    }
  };

  const generateStepsAnalysis = async () => {
    setIsAnalyzingSteps(true);
    const today = getLocalDate();
    const stepCount = (healthData.dailySteps || []).find(s => s.date === today)?.count || 0;
    try {
      const prompt = `
        As the PalBuddy medical AI assistant, analyze the user's physical activity based on daily step count:
        Steps: ${stepCount}
        Target: 5000-10000 steps
        User's Health Conditions: ${userDiseases.map(d => d.name).join(', ')}
        Biometrics: Weight ${user?.biometrics?.weight}kg, Height ${user?.biometrics?.height}cm
        
        Provide the analysis in English covering:
        1. The benefits of this step count for the user's health conditions.
        2. Whether this has reached the target daily physical activity level.
        
        Include the required medical disclaimer: "${AI_DISCLAIMER}"
      `;

      const text = await proxyChat(prompt);
      if (text) {
        setHealthData(prev => ({
          ...prev,
          dailySteps: prev.dailySteps?.map(s => s.date === today ? { ...s, analysis: text || "" } : s) || []
        }));
        speakText(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingSteps(false);
    }
  };

  const generateBmiInsight = async (latestBmi: number, history: any[]) => {
    setIsGeneratingBmiAi(true);
    try {
      const prompt = `
        As the PalBuddy health assistant, provide a short analysis (max 3 sentences) in English about the user's current BMI (${latestBmi}).
        History data of last 5 entries: ${JSON.stringify(history.slice(-5))}
        If there is a significant weight increase or decrease from previous data, provide encouragement or light nutritional advice.
        Use a supportive, friendly, and pleasant tone.
        End with a relevant short health tip.
        Include the required brief medical disclaimer: "${AI_DISCLAIMER}"
      `;
      const text = await proxyChat(prompt);
      if (text) {
        setBmiAiInsight(text || null);
        speakText(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingBmiAi(false);
    }
  };

  const generateMentalAnalysis = async (mId: string) => {
    setIsAnalyzingMental(true);
    try {
      const mental = healthData.mentalHealth?.find(m => m.id === mId);
      if (!mental) return;
      const prompt = `
        Analyze user's mental condition: Mood ${mental.mood}, Stress Level ${mental.stressLevel}/5, Note: "${mental.note}".
        User profile: ${userDiseases.map(d => d.name).join(', ')}.
        Provide brief psychological support and stress management tips in English.
        Include medical disclaimer: "${AI_DISCLAIMER}"
      `;
      const text = await proxyChat(prompt);
      if (text) {
        setHealthData(prev => ({
          ...prev,
          mentalHealth: prev.mentalHealth?.map(m => m.id === mId ? { ...m, analysis: text } : m)
        }));
        speakText(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingMental(false);
    }
  };

  const generateSleepAnalysis = async (sId: string) => {
    setIsAnalyzingSleep(true);
    try {
      const sleep = healthData.sleepLogs?.find(s => s.id === sId);
      if (!sleep) return;
      const prompt = `
        Analyze user's sleep: Duration ${sleep.duration} hours, Quality ${sleep.quality}.
        User profile: ${userDiseases.map(d => d.name).join(', ')}.
        Provide sleep hygiene/quality improvement tips in English.
        Include medical disclaimer: "${AI_DISCLAIMER}"
      `;
      const text = await proxyChat(prompt);
      if (text) {
        setHealthData(prev => ({
          ...prev,
          sleepLogs: prev.sleepLogs?.map(s => s.id === sId ? { ...s, analysis: text } : s)
        }));
        speakText(text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingSleep(false);
    }
  };

  const handleBmiCalc = () => {
    const h = parseFloat(bmiInput.height.toString()) / 100;
    const w = parseFloat(bmiInput.weight.toString());
    
    if (!h || !w) return;
    
    const bmi = w / (h * h);
    let status = '';
    let color = '';
    let tips = '';

    if (bmi < 18.5) {
      status = 'Underweight';
      color = 'text-blue-500';
      tips = 'Focus on calorie-dense, protein-rich nutrition. Incorporate strength training to build muscle mass.';
    } else if (bmi >= 18.5 && bmi < 25) {
      status = 'Normal Weight';
      color = 'text-emerald-500';
      tips = 'Your condition is excellent! Maintain a balanced diet and stay active for at least 30 minutes a day.';
    } else if (bmi >= 25 && bmi < 30) {
      status = 'Overweight';
      color = 'text-orange-500';
      tips = 'Reduce sugar and saturated fat intake. Increase the duration of cardio activities like brisk walking or swimming.';
    } else {
      status = 'Obese';
      color = 'text-rose-500';
      tips = 'Highly recommended to consult with a nutritionist. Focus on gradual calorie reduction and a regular exercise routine.';
    }

    setBmiResult({ value: parseFloat(bmi.toFixed(1)), status, color, tips });
  };

  const handleLog = (type: string, value: any) => {
    const today = getLocalDate();
    let newData = { ...healthData };

    switch (type) {
      case 'bmi-calc':
        addToHistory('bmi_height', String(value.height));
        addToHistory('bmi_weight', String(value.weight));
        newData.bmiData = newData.bmiData || [];
        newData.bmiData.push({ 
          date: today, 
          value: parseFloat(value.value),
          weight: parseFloat(value.weight),
          height: parseFloat(value.height)
        });
        generateBmiInsight(parseFloat(value.value), newData.bmiData);
        break;
      case 'activity-tracker':
        newData.activities = newData.activities || [];
        newData.dailySteps = newData.dailySteps || [];
        if (typeof value === 'string') {
          newData.activities.push({ id: crypto.randomUUID(), description: value, date: today });
          
          // If it's a meal summary, update mealLogs too
          if (value.startsWith('Pola Makan:')) {
            newData.mealLogs = newData.mealLogs || [];
            const existingIdx = newData.mealLogs.findIndex(log => log.date === today);
            const mealEntry = {
              date: today,
              meals: Object.fromEntries(
                Object.entries(meals).map(([k, v]) => [k, { content: v.content, feedback: v.feedback }])
              )
            };
            if (existingIdx > -1) newData.mealLogs[existingIdx] = mealEntry;
            else newData.mealLogs.push(mealEntry);
          }
        } else {
          // Handle object value (usually from step-tracker)
          if (value.description) {
            newData.activities.push({ id: crypto.randomUUID(), description: value.description, date: today });
          }
          
          if (value.steps !== undefined) {
            const stepCount = parseInt(value.steps);
            if (!isNaN(stepCount)) {
              addToHistory('steps_today', String(value.steps));
              const stepIdx = newData.dailySteps.findIndex(s => s.date === today);
              if (stepIdx > -1) {
                newData.dailySteps[stepIdx].count = stepCount;
              } else {
                newData.dailySteps.push({ date: today, count: stepCount });
              }
              // Add to activities for hydration/activity chart parsing
              newData.activities.push({ 
                id: crypto.randomUUID(), 
                description: `Today's Steps: ${stepCount} Steps`, 
                date: today 
              });
            }
          }
        }
        break;
      case 'symptom-logger':
        newData.symptoms = newData.symptoms || [];
        const sId = crypto.randomUUID();
        const symptomText = typeof value === 'object' ? value.description : value;
        addToHistory('symptom_descriptions', String(symptomText));
        const severity = typeof value === 'object' ? value.severity : symptomSeverity;
        
        newData.symptoms.push({ 
          id: sId, 
          text: symptomText, 
          date: today, 
          mood: severity >= 4 ? 'sad' : severity >= 2 ? 'neutral' : 'happy',
          severity: severity 
        });
        // Trigger specific AI symptom feedback
        generateSymptomFeedback(symptomText, sId);
        setSymptomSeverity(1); 
        setSymptomInput({ description: '', severity: 1 });
        break;
      case 'medication-tracker':
        newData.medications = newData.medications || [];
        if (Array.isArray(value)) {
          value.forEach((med: any) => {
            if (med.name) {
              addToHistory('medication_names', String(med.name));
              const times = parseInt(med.timesPerDay) || 1;
              const medNameWithFreq = `${med.name} (${times}x sehari)`;
              
              // Remove any existing untaken schedules for this specific named med today to avoid duplicates on resave
              newData.medications = newData.medications!.filter(m => 
                !(m.date === today && m.name === medNameWithFreq && !m.taken)
              );

              for (let i = 0; i < times; i++) {
                newData.medications.push({ 
                  id: crypto.randomUUID(), 
                  name: medNameWithFreq, 
                  time: `Dosis ${i + 1}`, 
                  taken: false, 
                  date: today 
                });
              }
            }
          });
        } else {
          newData.medications.push({ id: crypto.randomUUID(), name: value, time: 'Sekarang', taken: true, date: today });
        }
        break;
      case 'health-finance':
        if (typeof value === 'object') {
          addToHistory('finance_names', String(value.name));
          newData.expenses = newData.expenses || [];
          newData.expenses.push({ 
            id: crypto.randomUUID(), 
            amount: parseFloat(value.price), 
            description: value.name, 
            date: today 
          });
        }
        break;
      case 'doc-vault':
        newData.documents = newData.documents || [];
        const dateObjDoc = new Date();
        const daysDoc = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthsDoc = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        newData.documents.push({
          id: crypto.randomUUID(),
          name: value.name,
          type: value.type || 'file',
          date: today,
          fileData: value.fileData,
          size: value.size,
          isFolder: value.isFolder || false,
          parentId: value.parentId || null,
          metadata: {
            day: daysDoc[dateObjDoc.getDay()],
            date: dateObjDoc.getDate().toString(),
            month: monthsDoc[dateObjDoc.getMonth()],
            year: dateObjDoc.getFullYear().toString()
          }
        });
        break;
      case 'mental-health':
        newData.mentalHealth = newData.mentalHealth || [];
        const mId = crypto.randomUUID();
        newData.mentalHealth.push({
          id: mId,
          date: today,
          mood: value.mood,
          stressLevel: value.stressLevel,
          note: value.note
        });
        generateMentalAnalysis(mId);
        break;
      case 'sleep-tracker':
        newData.sleepLogs = newData.sleepLogs || [];
        const sleepId = crypto.randomUUID();
        newData.sleepLogs.push({
          id: sleepId,
          date: today,
          duration: value.duration,
          quality: value.quality
        });
        generateSleepAnalysis(sleepId);
        break;
      case 'step-tracker':
        newData.dailySteps = newData.dailySteps || [];
        newData.dailySteps.push({ date: today, count: parseInt(value) });
        break;
      case 'bmi-calc':
        newData.bmiData = newData.bmiData || [];
        newData.bmiData.push({
          date: today,
          weight: value.weight,
          height: value.height,
          value: value.bmi || value.value,
          category: value.category
        });
        break;
      case 'vitals-tracker':
        newData.vitalLogs = newData.vitalLogs || [];
        newData.vitalLogs.push({
          id: crypto.randomUUID(),
          date: today,
          type: value.type,
          value: value.value,
          unit: value.unit
        });
        break;
    }

    // Process Streak
    if (newData.lastUpdate !== today) {
      newData.streak += 1;
      newData.lastUpdate = today;
    }

    setHealthData(newData);
    
    // If it's NOT a symptom and NOT health-finance (which uses objects), close the modal immediately as before
    if (type !== 'symptom-logger' && type !== 'health-finance') {
      setActiveModal(null);
      setModalInput('');
      setBmiResult(null);
    }
    
    // Only generate general AI insight if no specialized analysis was triggered
    if (!['symptom-logger', 'mental-health', 'sleep-tracker'].includes(type as string)) {
      generateAiInsight(newData);
    }
  };

  const quickLogWater = () => {
    const today = getLocalDate();
    const todayActivities = (healthData.activities || []).filter(a => a.date === today);
    let currentWater = 0;
    todayActivities.forEach(act => {
      const waterMatch = act.description.match(/(?:Hydration|Hidrasi): (\d+)/);
      if (waterMatch) currentWater = Math.max(currentWater, parseInt(waterMatch[1]));
    });
    handleLog('activity-tracker', `Hydration: ${currentWater + 1} Glasses`);
  };

  const quickLogSteps = () => {
    const today = getLocalDate();
    const currentSteps = (healthData.dailySteps || []).find(s => s.date === today)?.count || 0;
    handleLog('activity-tracker', { steps: (currentSteps + 1000).toString() });
  };

  const toggleMedication = (id: string) => {
    setHealthData(prev => ({
      ...prev,
      medications: prev.medications?.map(m => m.id === id ? { ...m, taken: !m.taken } : m) || []
    }));
  };

  const handleFileChange = async (e: any, parentId: string | null = null) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let targetParentId = parentId;

    // Detect if this is a directory upload (webkitdirectory)
    // If so, we create a folder for the root of this upload
    if (files[0].webkitRelativePath && !parentId) {
      const rootFolderName = files[0].webkitRelativePath.split('/')[0];
      const folderId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];
      const dateObjDoc = new Date();
      const daysDoc = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthsDoc = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      setHealthData(prev => ({
        ...prev,
        documents: [
          ...(prev.documents || []),
          {
            id: folderId,
            name: rootFolderName,
            type: 'folder',
            date: today,
            isFolder: true,
            parentId: parentId,
            metadata: {
              day: daysDoc[dateObjDoc.getDay()],
              date: dateObjDoc.getDate().toString(),
              month: monthsDoc[dateObjDoc.getMonth()],
              year: dateObjDoc.getFullYear().toString()
            }
          }
        ]
      }));
      targetParentId = folderId;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar. Maksimal 5MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const sizeKB = Math.round(file.size / 1024);
        const sizeDisplay = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        
        handleLog('doc-vault', { 
          name: file.name, 
          type: file.type, 
          fileData: base64,
          size: sizeDisplay,
          parentId: targetParentId
        });
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    e.target.value = '';
  };

  const handleCreateFolder = () => {
    const folderName = prompt("Folder Name:", "");
    if (!folderName) return;

    handleLog('doc-vault', {
      name: folderName,
      type: 'folder',
      isFolder: true,
      parentId: currentFolderId
    });
  };

  const handleRename = (id: string, currentName: string) => {
    setRenamingItemId(id);
    setRenameValue(currentName);
  };

  const saveRename = () => {
    if (!renamingItemId) return;
    setHealthData(prev => ({
      ...prev,
      documents: prev.documents?.map(doc => 
        doc.id === renamingItemId ? { ...doc, name: renameValue } : doc
      )
    }));
    setRenamingItemId(null);
    setRenameValue("");
  };

  const handleDeleteDoc = (id: string) => {
    if (!confirm("Are you sure? This will delete all files inside if it's a folder.")) return;
    
    setHealthData(prev => {
      const itemsToDelete = new Set([id]);
      prev.documents?.forEach(d => {
        if (d.parentId === id) itemsToDelete.add(d.id);
      });
      return {
        ...prev,
        documents: prev.documents?.filter(doc => !itemsToDelete.has(doc.id)) || []
      };
    });
  };

  const handleShareDoc = async (doc: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.name,
          text: `Medical Document: ${doc.name}`,
          url: window.location.href
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      alert("Sharing not supported in this browser");
    }
  };

  const handleDownloadDoc = (doc: any) => {
    if (!doc.fileData) return;
    const link = document.createElement("a");
    link.href = doc.fileData;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDocuments = () => {
    const currentDocs = (healthData.documents || []).filter(doc => doc.parentId === (currentFolderId || null));
    const breadcrumbs: any[] = [];
    let tempId = currentFolderId;
    while (tempId) {
      const folder = healthData.documents?.find(doc => doc.id === tempId);
      if (folder) {
        breadcrumbs.unshift(folder);
        tempId = folder.parentId || null;
      } else {
        tempId = null;
      }
    }

    return (
      <div className="space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div>
            <h3 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight italic leading-none flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-emerald-500" /> 
              Medical Cabinet
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">
              Organize your health documents
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <label className="h-12 px-6 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
               <Upload className="w-4 h-4" /> Upload Folder
               <input 
                 type="file" 
                 // @ts-ignore
                 webkitdirectory="" 
                 // @ts-ignore
                 directory="" 
                 className="hidden" 
                 onChange={(e) => handleFileChange(e, currentFolderId)} 
               />
             </label>
             <label className="h-12 px-6 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest ring-offset-2 hover:ring-2 ring-emerald-500">
               <Upload className="w-4 h-4" /> Upload File
               <input type="file" multiple className="hidden" onChange={(e) => handleFileChange(e, currentFolderId)} />
             </label>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setCurrentFolderId(null)}
            className={cn("whitespace-nowrap transition-colors", !currentFolderId ? "text-emerald-600" : "text-slate-400 hover:text-slate-600")}
          >
            Root
          </button>
          {breadcrumbs.map((folder, idx) => (
            <div key={folder.id} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button 
                onClick={() => setCurrentFolderId(folder.id)}
                className={cn("whitespace-nowrap transition-colors", idx === breadcrumbs.length - 1 ? "text-emerald-600" : "text-slate-400 hover:text-slate-600")}
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {currentFolderId && (
          <button 
            onClick={() => {
              const current = healthData.documents?.find(d => d.id === currentFolderId);
              setCurrentFolderId(current?.parentId || null);
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-emerald-600 transition-colors px-2 pb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Go back to previous folder
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentDocs.length > 0 ? (
            currentDocs.map(doc => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={doc.id}
                className={cn(
                  "group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 transition-all hover:shadow-2xl hover:shadow-emerald-100/50 dark:hover:shadow-none cursor-pointer overflow-hidden",
                  renamingItemId === doc.id && "ring-2 ring-emerald-500"
                )}
                onClick={() => {
                  if (doc.isFolder) setCurrentFolderId(doc.id);
                  else setSelectedVaultFile(doc);
                }}
              >
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleRename(doc.id, doc.name)} 
                      className="p-2.5 bg-white/90 backdrop-blur-md text-slate-600 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-90 shadow-sm"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!doc.isFolder && (
                      <>
                        <button 
                          onClick={() => handleDownloadDoc(doc)} 
                          className="p-2.5 bg-white/90 backdrop-blur-md text-slate-600 rounded-xl border border-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-90 shadow-sm"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleShareDoc(doc)} 
                          className="p-2.5 bg-white/90 backdrop-blur-md text-slate-600 rounded-xl border border-slate-100 hover:bg-purple-50 hover:text-purple-600 transition-all active:scale-90 shadow-sm"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteDoc(doc.id)} 
                      className="p-2.5 bg-white/90 backdrop-blur-md text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-50 transition-all active:scale-90 shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex flex-col gap-5">
                  <div className={cn(
                    "w-16 h-16 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-3 duration-500",
                    doc.isFolder ? "bg-amber-50 dark:bg-amber-950/20 text-amber-500" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500"
                  )}>
                    {doc.isFolder ? <Folder className="w-9 h-9 fill-current" /> : <FileText className="w-9 h-9" />}
                  </div>
                  
                  <div className="space-y-2">
                    {renamingItemId === doc.id ? (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveRename()}
                          onBlur={saveRename}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 ring-emerald-500"
                        />
                        <button onClick={saveRename} className="p-2 bg-emerald-500 text-white rounded-xl"><Check className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-slate-800 dark:text-white truncate transition-colors group-hover:text-emerald-600 leading-tight">{doc.name}</h4>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {doc.metadata ? `${doc.metadata.day}, ${doc.metadata.date} ${doc.metadata.month} ${doc.metadata.year}` : doc.date}
                      </div>
                      {!doc.isFolder && (
                         <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300">
                           <Activity className="w-3 h-3" />
                           {doc.size || 'Unknown'}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
               <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-6">
                 <FolderOpen className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                   transition={{ duration: 3, repeat: Infinity }}
                   className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white"
                 >
                   <Plus className="w-5 h-5" />
                 </motion.div>
               </div>
               <p className="text-base font-black text-slate-400 italic">No items yet</p>
               <p className="text-[10px] text-slate-300 mt-2 uppercase font-black tracking-[0.2em]">Start organizing your documents now</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePlusAction = (action: 'reference' | 'feedback' | 'documents' | 'about') => {
    switch (action) {
      case 'reference':
        onNavigate('reference');
        break;
      case 'feedback':
        setActiveModal('dev-feedback');
        break;
      case 'documents':
        setActiveTab('documents');
        break;
      case 'about':
        setActiveModal('about-app');
        break;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const renderHome = () => (
    <div className="space-y-12">
      {/* Dynamic Hero Section */}
      <div 
        className="bg-linear-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-[3rem] p-8 sm:p-14 mb-10 relative overflow-hidden text-white shadow-2xl shadow-emerald-200/50 dark:shadow-none transition-all group"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-10 text-left">
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-8">
                <motion.div 
                  initial={{ rotate: -15, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  className="relative w-32 h-32 flex items-center justify-center group/score cursor-help"
                >
                   <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl group-hover/score:bg-white/20 transition-all" />
                   <svg className="w-full h-full transform -rotate-90 filter drop-shadow-xl">
                     <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
                     <motion.circle 
                       initial={{ strokeDashoffset: 351.8 }}
                       animate={{ strokeDashoffset: 351.8 - (351.8 * healthScore) / 100 }}
                       cx="64" cy="64" r="56" 
                       stroke="white" 
                       strokeWidth="12" 
                       fill="transparent" 
                       strokeDasharray={351.8}
                       strokeLinecap="round"
                       className="transition-all duration-1000 ease-out shadow-emerald-400"
                     />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{healthScore}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Health Score</span>
                   </div>
                   <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] py-2 px-4 rounded-xl opacity-0 group-hover/score:opacity-100 transition-all whitespace-nowrap pointer-events-none shadow-2xl border border-white/10 z-50">
                      Score: Streak + Hydration + Meds Adherence
                   </div>
                </motion.div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-4">
                    <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">AI Health Engine Live</span>
                  </div>
                  <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-[0.9] mb-4">
                    Hello, <br />
                    <span className="italic font-serif opacity-90">{user?.username && user.username.includes('@') ? user.username.split('@')[0] : user.username}</span>
                  </h1>
                  <div className="text-emerald-50 text-sm font-medium flex items-center gap-3">
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg">
                       {healthScore >= 80 ? <Flame className="w-4 h-4 text-orange-300 fill-current" /> : <Activity className="w-4 h-4 text-emerald-200" />}
                       <span className="font-bold">{healthScore >= 80 ? 'EXCELLENT' : 'STABLE'}</span>
                    </div>
                    {healthScore >= 80 ? "Your condition is excellent today! 🔥" : "Keep maintaining your health rhythm. 👍"}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('personalize')}
                  className="bg-white/15 backdrop-blur-md text-white font-bold py-4 px-8 rounded-2xl transition-all border border-white/30 flex items-center gap-3 shadow-xl group/btn"
                >
                  <TrendingUp className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Condition Settings
                </motion.button>
                <div className="flex items-center gap-3">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className={cn(
                      "bg-white text-emerald-600 font-bold py-4 px-8 rounded-2xl transition-all shadow-2xl flex items-center gap-3 active:scale-95 hover:shadow-emerald-500/20",
                      isExportMenuOpen && "ring-2 ring-emerald-500"
                    )}
                  >
                    <Download className="w-5 h-5" /> Get Report <ChevronRight className={cn("w-4 h-4 transition-transform", isExportMenuOpen && "rotate-180")} />
                  </motion.button>

                  <AnimatePresence>
                    {isExportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.8 }}
                        className="flex items-center gap-2 bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl"
                      >
                        <button 
                          onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }}
                          title="PDF"
                          className="w-12 h-12 flex items-center justify-center bg-red-600 text-white rounded-xl shadow-lg hover:scale-110 transition-all font-black text-[10px]"
                        >
                          PDF
                        </button>
                        <button 
                          onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }}
                          title="CSV"
                          className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-110 transition-all font-black text-[10px]"
                        >
                          CSV
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-emerald-400/20 blur-[60px] rounded-full animate-pulse" />
              <PalBuddy 
                isSpeaking={isPalSpeaking} 
                message={displayedAiInsights || "Tell me if you have any complaints today!"} 
                language='en-US'
                onSpeakingChange={setIsPalSpeaking}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Health Tips Section */}
      {userDiseases.length > 0 && (
        <section className="mb-10 text-left">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" /> Special Health Tips For You
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest">Based on Health Profile</span>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {userDiseases.map((disease, idx) => (
              <div 
                key={`${disease.id}-${idx}`}
                className="min-w-[280px] sm:min-w-[320px] bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{disease.name}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-black">{disease.category}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {disease.details?.tips}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        <div className="lg:col-span-2 space-y-8">
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-500" /> Your Personal Trackers
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {UNIVERSAL_WIDGETS.filter(w => (allWidgets.length === 0 || allWidgets.includes(w.id)) && !['step-tracker', 'bmi-calc'].includes(w.id)).map(w => (
                  <WidgetCard 
                    key={w.id} 
                    title={w.title} 
                    desc={w.description} 
                    icon={getIcon(w.id)} 
                    onClick={() => setActiveModal(w.id)}
                  />
                ))}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.section variants={itemVariants} className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" /> Step Tracker
                </h3>
              </div>
              <div className="space-y-4">
                 {isLiveTracking ? (
                   <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border-2 border-emerald-500/20 flex items-center justify-between animate-pulse">
                      <div>
                         <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Tracking Live...</p>
                         <p className="text-2xl font-black text-emerald-500">{liveSteps} <span className="text-xs">steps</span></p>
                      </div>
                      <button 
                        onClick={saveLiveSteps}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-emerald-600 transition-all active:scale-95"
                      >
                        Stop & Save
                      </button>
                   </div>
                 ) : (
                   <div className="flex gap-4">
                     <button 
                        onClick={startLiveTracking}
                        className="flex-1 py-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold flex items-center justify-center gap-2 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-all"
                     >
                       <Activity className="w-4 h-4" /> Start Tracking
                     </button>
                     <button 
                        onClick={() => setActiveModal('step-tracker')}
                        className="px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
                        title="Manual Input"
                     >
                       <Settings className="w-5 h-5" />
                     </button>
                   </div>
                 )}
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-emerald-500" /> BMI & Anthropometry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Height (cm)</label>
                  <input 
                    type="number"
                    value={bmiInput.height}
                    onChange={e => setBmiInput(prev => ({ ...prev, height: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none outline-none dark:text-white ring-1 ring-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Weight (kg)</label>
                  <input 
                    type="number"
                    value={bmiInput.weight}
                    onChange={e => setBmiInput(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none outline-none dark:text-white ring-1 ring-slate-100"
                  />
                </div>
                <button 
                  onClick={() => { handleBmiCalc(); setActiveModal('bmi-calc'); }}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg"
                >
                  Check & Save
                </button>
              </div>
            </motion.section>
          </div>

          <motion.section variants={itemVariants} className="space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 px-2">
              <Heart className="w-5 h-5 text-rose-500" /> Specific Clinical Modules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {userDiseases.map(d => (
                 <WidgetCard 
                  key={d.id} 
                  title={d.name} 
                  desc={d.details?.definition || "Specific module for your condition"} 
                  icon={<ChevronRight />} 
                  onClick={() => setActiveModal(`disease_${d.id}`)}
                  referenceUrl={d.referenceUrl}
                 />
               ))}
               {userDiseases.length === 0 && (
                 <div className="col-span-2 py-8 bg-slate-100 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-sm">
                   No specific modules yet. Please configure your health conditions.
                 </div>
               )}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-emerald-500" /> Community Report
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <p className="text-sm text-slate-500">Common health trends:</p>
                   <CommunityStat label="Flu Symptoms" value="32%" color="bg-emerald-400" />
                   <CommunityStat label="Fatigue" value="28%" color="bg-teal-400" />
                   <CommunityStat label="Headache" value="15%" color="bg-slate-300" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <Heart className="w-10 h-10 text-emerald-500 mb-4 animate-pulse" />
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">85% Users Community</p>
                  <p className="text-xs text-emerald-700/70">Feel better with routine use.</p>
                </div>
             </div>
          </motion.section>
        </div>

        <div className="lg:col-span-1 space-y-8">
           <motion.section variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm border-t-4 border-t-emerald-500">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                   <Zap className="w-5 h-5 text-emerald-500" />
                   <h3 className="font-bold text-slate-800 dark:text-white">AI Health Insights</h3>
                 </div>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                <p className="text-sm text-emerald-800 dark:text-emerald-400 leading-relaxed italic">
                  {displayedAiInsights || "Welcome! Log some data daily for AI analysis."}
                </p>
              </div>
           </motion.section>
        </div>
      </div>
    </div>
  );

  const renderMissions = () => (
    <div className="space-y-8 text-left">
      <div className="space-y-2 mb-8 px-2 flex items-end justify-between">
          <div>
            <h3 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight italic leading-none">
              Daily Wellness Missions
            </h3>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-2">
              {dailyProgressPercent === 100 
                ? 'PERFECT DAY! ALL MISSIONS COMPLETED' 
                : `${dailyProgressPercent}% Achievement Rate`}
            </p>
          </div>
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500 flex items-center justify-center shadow-sm">
                <Trophy className="w-3 h-3 text-white" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dailyQuests.map((quest, idx) => {
            const progress = quest.id === 'water' || quest.id === 'steps' 
              ? (quest.current / quest.target) * 100 
              : (quest.current >= quest.target ? 100 : 0);
            const isDone = progress >= 100;
            
            return (
              <motion.div 
                key={quest.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "p-6 rounded-[2.5rem] border transition-all flex flex-col justify-between relative overflow-hidden group", 
                  isDone 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:shadow-emerald-500/10"
                )}
              >
                {isDone && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-6 h-6 text-emerald-500 opacity-20" />
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 rounded-2xl transition-all shadow-sm", 
                      isDone ? "bg-emerald-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500"
                    )}>
                      {quest.icon}
                    </div>
                    {isDone ? (
                      <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full uppercase">Finished</span>
                    ) : (
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                    )}
                  </div>
                  
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition-colors">{quest.label}</h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {quest.id === 'water' || quest.id === 'steps' 
                        ? `${quest.current.toLocaleString()} / ${quest.target.toLocaleString()}` 
                        : (isDone ? 'COMPLETE' : 'IN PROGRESS')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progress, 100)}%` }}
                      className={cn(
                        "h-full transition-all duration-1000 ease-out", 
                        isDone ? "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-emerald-300"
                      )}
                    />
                  </div>

                  {!isDone && (
                    <div className="flex items-center gap-2">
                      {quest.id === 'water' && (
                        <button 
                          onClick={quickLogWater}
                          className="flex-1 py-3 px-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                        >
                          +1 Glass
                        </button>
                      )}
                      {quest.id === 'steps' && (
                        <button 
                          onClick={quickLogSteps}
                          className="flex-1 py-3 px-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-tight hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95"
                        >
                          +1k Steps
                        </button>
                      )}
                      {quest.id === 'meds' && (
                        <button 
                          onClick={() => setActiveModal('medication-tracker')}
                          className="flex-1 py-3 px-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-2xl text-[10px] font-black uppercase tracking-tight hover:bg-pink-600 hover:text-white transition-all transform active:scale-95"
                        >
                          Check Meds
                        </button>
                      )}
                      {quest.id === 'symptom' && (
                        <button 
                          onClick={() => setActiveModal('symptom-logger')}
                          className="flex-1 py-3 px-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl text-[10px] font-black uppercase tracking-tight hover:bg-amber-600 hover:text-white transition-all transform active:scale-95"
                        >
                          Log Symptoms
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

      <div className="pt-8">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 px-2">Award Badges</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
           {[
             { id: 'h2o', name: 'Water Warrior', icon: '💧', desc: 'Optimal Hydration', active: (hydrationStats.find(s => s.fullDate === getLocalDate())?.glasses || 0) >= 8 },
             { id: 'med', name: 'Med Master', icon: '💊', desc: 'Meds Taken', active: (healthData.medications || []).filter(m => m.date === getLocalDate()).some(m => m.taken) },
             { id: 'symptom', name: 'Self Aware', icon: '📝', desc: 'Symptoms Logged', active: (healthData.symptoms || []).some(s => s.date === getLocalDate()) },
             { id: 'new', name: 'Daily Starter', icon: '🌱', desc: 'Good Start', active: healthData.lastUpdate === getLocalDate() || dailyQuests.some(q => q.current > 0) }
           ].map(badge => (
             <div 
               key={badge.id}
               className={cn(
                 "p-6 rounded-[2.5rem] border transition-all flex flex-col items-center text-center gap-3",
                 badge.active 
                   ? "bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-500/20 shadow-lg" 
                   : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 opacity-40 grayscale"
               )}
             >
                <div className="text-4xl group-hover:scale-110 transition-transform">{badge.icon}</div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">{badge.name}</p>
                   <p className={cn("text-[8px] font-bold mt-1 uppercase", badge.active ? "text-emerald-500" : "text-slate-400")}>
                     {badge.active ? 'ACTIVE' : 'LOCKED'}
                   </p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );

  const renderDayInsights = () => {
    if (!dayInsights) return null;

    const { formattedDate, symptoms, steps, meds, hydration, meals, expenses, bmi } = dayInsights;

    return (
      <AnimatePresence mode="wait">
        <motion.div 
          key={dayInsights.date}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/5 mt-8"
        >
          <div className="flex items-center justify-between mb-8">
             <div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white">{formattedDate}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                   {"Daily Wellness Summary"}
                </p>
             </div>
             <button 
               onClick={() => setSelectedDay(null)}
               className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
             >
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Core Metrics */}
             <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/50">
                <h5 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4" /> Core Vitality
                </h5>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-xs text-slate-500">Steps</span>
                     <span className="font-bold text-slate-800 dark:text-white">{steps.toLocaleString()}</span>
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs text-slate-500">Hydration</span>
                     <span className="font-bold text-slate-800 dark:text-white">{hydration} Glasses</span>
                   </div>
                   {bmi && (
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-slate-500">BMI</span>
                       <span className={cn("font-bold px-2 py-0.5 rounded-lg text-[10px] text-white bg-emerald-500")}>
                         {bmi.value}
                       </span>
                     </div>
                   )}
                </div>
             </div>

             {/* Nutrition & Habits */}
             <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/50">
                <h5 className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-4 flex items-center gap-2">
                   <Utensils className="w-4 h-4" /> {"Nutrition Patterns"}
                </h5>
                <div className="flex flex-wrap gap-2">
                   {meals.length > 0 ? meals.map((meal, idx) => (
                     <span key={idx} className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900">
                        {meal}
                     </span>
                   )) : (
                     <p className="text-[10px] text-slate-400 italic">No meal records yet</p>
                   )}
                </div>
             </div>

             {/* Medications */}
             <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl p-6 border border-rose-100 dark:border-rose-900/50">
                <h5 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest mb-4 flex items-center gap-2">
                   <Pill className="w-4 h-4" /> {"Medication Adherence"}
                </h5>
                <div className="space-y-3">
                   {meds.length > 0 ? meds.map((med, idx) => (
                     <div key={idx} className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate flex-1">{med.name}</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase",
                          med.taken ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        )}>
                          {med.taken ? 'TAKEN' : 'SKIPPED'}
                        </div>
                     </div>
                   )) : (
                     <p className="text-[10px] text-slate-400 italic">{"No meds scheduled"}</p>
                   )}
                </div>
             </div>
          </div>

          {/* Symptoms & Notes Section */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h5 className="text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" /> Recorded Symptoms
                   </h5>
                   <div className="space-y-4">
                      {symptoms.length > 0 ? symptoms.map((s, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{(s as any).emoji || '🤒'}</span>
                              <span className="text-[10px] font-black uppercase text-rose-500">{(s as any).severityName || 'Ill'}</span>
                           </div>
                           <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{s.text}"</p>
                        </div>
                      )) : (
                        <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-2xl border border-emerald-50/50 dark:border-emerald-900/20 text-center">
                           <p className="text-sm text-emerald-600/60 font-medium">✨ No health complaints recorded</p>
                        </div>
                      )}
                   </div>
                </div>

                <div>
                   <h5 className="text-xs font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-blue-500" /> Health Expenses
                   </h5>
                   <div className="space-y-3">
                      {expenses.length > 0 ? expenses.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                           <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{e.description}</span>
                           <span className="text-xs font-bold text-slate-900 dark:text-white">${e.amount?.toLocaleString()}</span>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-400 italic text-center py-4">No expenses recorded</p>
                      )}
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderCharts = () => (
    <div className="space-y-8 text-left">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-500/5 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
           <div>
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-emerald-500" /> Mood & Symptom Summary (14 Days)
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Use this data for doctor consultation</p>
           </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-3">
          {symptomHeatmapData.map((day) => {
             const moodEmoji = day.severity === 0 ? '😶' : day.severity === 1 ? '😊' : day.severity === 2 ? '🙂' : day.severity === 3 ? '😐' : day.severity === 4 ? '😟' : '😫';
             const colors = [
               'bg-slate-50 border-transparent',
               'bg-emerald-100 border-emerald-200/30',
               'bg-emerald-300 border-emerald-400/30',
               'bg-emerald-500 border-emerald-600/30',
               'bg-emerald-700 border-emerald-800/30',
               'bg-emerald-950 border-black/30',
             ];
             return (
               <div 
                 key={day.date}
                 onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                 className={cn(
                   "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer group hover:scale-110 shadow-sm hover:shadow-md",
                   colors[day.severity],
                   selectedDay === day.date ? "ring-4 ring-emerald-500/50 scale-110 border-white z-10 shadow-xl" : "border-transparent"
                 )}
               >
                 <span className="text-xl leading-none">{moodEmoji}</span>
                 <span className="text-[7px] font-black opacity-60 uppercase">{day.displayDate.split(' ')[0]}</span>
               </div>
             );
          })}
        </div>
        {renderDayInsights()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* BMI Analytics */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
           <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 mb-6">
             <Calculator className="w-4 h-4 text-emerald-500" /> BMI Analysis
           </h4>
           <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={bmiHistoryData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      setSelectedDay(data.activePayload[0].payload.date);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Brush dataKey="displayDate" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
           <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 mb-6">
             <CreditCard className="w-4 h-4 text-emerald-500" /> Expense Analysis
           </h4>
           <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={monthlyExpenses} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(data: any) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const monthName = data.activePayload[0].payload.name;
                      const sampleExpense = healthData.expenses?.find(e => {
                        const d = new Date(e.date);
                        const mName = d.toLocaleDateString('en-US', { month: 'short' });
                        return mName === monthName;
                      });
                      if (sampleExpense) setSelectedDay(sampleExpense.date);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} tickFormatter={(val) => val >= 1000 ? `$${val / 1000}k` : `$${val}`} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Brush dataKey="name" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Medication Recap */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
           <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 mb-6">
             <Pill className="w-4 h-4 text-emerald-500" /> Medication Recap
           </h4>
           {medicationStats.length > 0 ? (
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medicationStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }} interval={0} angle={-45} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any, name: string, props: any) => {
                        if (name === 'Total Scheduled') return [`${value} doses`, name];
                        return [`${value} of ${props.payload.total} doses`, name];
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar name="Total Scheduled" dataKey="total" fill="#fbcfe8" radius={[4, 4, 0, 0]} barSize={12} />
                    <Bar name="Taken" dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={12} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 opacity-60">
               <Pill className="w-8 h-8 text-slate-200" />
               <p className="text-[10px] text-slate-400 italic">No medication data for this month.</p>
             </div>
           )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
           <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 mb-6">
             <TrendingUp className="w-4 h-4 text-emerald-500" /> Nutrition & Activity
           </h4>
           <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hydrationStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: any, name: string) => {
                      if (name.includes('Langkah') || name.includes('Steps')) return [`${(value * 1000).toLocaleString()} steps`, name];
                      if (name.includes('Gizi') || name.includes('Nutrition')) return [`${value} meals`, name];
                      if (name.includes('Hidrasi') || name.includes('Hydration')) return [`${value} glasses`, name];
                      return [value, name];
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar name="Hydration" dataKey="glasses" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar name="Nutrition" dataKey="meals" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar name="Steps (k)" dataKey={(d:any) => d.steps / 1000} fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                  <Brush dataKey="date" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );

  const renderLocations = () => {
    const staticPlaces = [
      { id: 1, name: 'Central General Hospital', type: 'Hospitals', address: 'Jl. Merdeka No. 10, Jakarta', phone: '(021) 555-0192', distance: '1.2 km' },
      { id: 2, name: 'Kimia Farma Pharmacy', type: 'Pharmacies', address: 'Jl. Thamrin No. 45, Jakarta', phone: '(021) 555-0382', distance: '0.5 km' },
      { id: 3, name: 'Mother & Child Hospital', type: 'Hospitals', address: 'Jl. Sudirman Kav 22, Jakarta', phone: '(021) 555-0441', distance: '2.8 km' },
      { id: 4, name: 'K-24 Pharmacy', type: 'Pharmacies', address: 'Jl. Kebon Jeruk No. 1, Jakarta', phone: '(021) 555-0772', distance: '1.5 km' },
      { id: 5, name: 'Medika Clinic', type: 'Clinics', address: 'Jl. Ahmad Yani No. 88, Jakarta', phone: '(021) 555-0991', distance: '0.8 km' },
      { id: 6, name: 'Siloam Hospital', type: 'Hospitals', address: 'Jl. Gatot Subroto No. 12, Jakarta', phone: '(021) 555-0333', distance: '3.5 km' },
      { id: 7, name: 'Guardian Pharmacy', type: 'Pharmacies', address: 'Mall Grand Indonesia, Jakarta', phone: '(021) 555-0111', distance: '0.3 km' },
      { id: 8, name: 'Kebayoran Health Clinic', type: 'Clinics', address: 'Jl. Radio Dalam No. 5, Jakarta', phone: '(021) 555-0222', distance: '1.7 km' },
    ];

    const filteredPlaces = staticPlaces.filter(place => {
      const matchesCategory = activeLocationCategory === 'All' || place.type === activeLocationCategory;
      const matchesSearch = place.name.toLowerCase().includes(searchLocation.toLowerCase()) || 
                           place.address.toLowerCase().includes(searchLocation.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    const categories = [
      { id: 'All', label: 'All' },
      { id: 'Hospitals', label: 'Hospitals' },
      { id: 'Pharmacies', label: 'Pharmacies' },
      { id: 'Clinics', label: 'Clinics' }
    ];

    const handleSearchOnMaps = () => {
      const query = `${activeLocationCategory !== 'All' ? activeLocationCategory : 'medical facilities'} ${searchLocation ? 'near ' + searchLocation : 'near me'}`;
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, '_blank');
    };

    return (
      <div className="space-y-8 text-left h-full">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative group flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Search city or your address..." 
                className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] py-5 pl-14 pr-6 text-sm font-bold shadow-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all dark:text-white"
              />
            </div>
            <button 
              onClick={handleSearchOnMaps}
              className="bg-emerald-500 text-white px-8 py-4 rounded-[2rem] font-bold text-sm shadow-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <Navigation className="w-4 h-4" /> Find Nearest
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button 
                key={cat.id} 
                onClick={() => setActiveLocationCategory(cat.id)}
                className={cn(
                  "whitespace-nowrap px-6 py-3 rounded-full text-xs font-black uppercase border transition-all",
                  activeLocationCategory === cat.id 
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200" 
                    : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
          <div className="bg-slate-100 dark:bg-slate-950 rounded-[3rem] relative overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[300px]">
             <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-slate-900/10 backdrop-blur-[2px]">
               <MapPin className="w-12 h-12 text-rose-500 animate-bounce mb-4" />
               <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Interactive Map</h4>
               <p className="text-xs text-slate-500 text-center mb-6 max-w-[240px]">
                 Searching for medical facilities near your location...
               </p>
               <button 
                onClick={handleSearchOnMaps}
                className="px-8 py-4 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold text-sm shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-2 border border-slate-100 dark:border-slate-800"
               >
                 <ExternalLink className="w-5 h-5" /> Full View in Google Maps
               </button>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto pr-2 no-scrollbar pb-10">
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((place) => (
                <div key={place.id} className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-emerald-200 transition-all group">
                  <div className="flex gap-4">
                    <div className={cn("p-3 rounded-2xl", place.type === 'Hospitals' ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-500")}>
                      {place.type === 'Hospitals' ? <Heart className="w-6 h-6" /> : <Pill className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{place.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{place.type} • {place.distance}</p>
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                         <MapPin className="w-3.5 h-3.5" /> {place.address}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex gap-3">
                    <a href={`tel:${place.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">
                      <Phone className="w-4 h-4" /> Call
                    </a>
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name + ' ' + place.address)}`, '_blank')} 
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Navigation className="w-4 h-4" /> Route
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold">No locations found</p>
                <p className="text-xs">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('HEALTHPAL MEDICAL REPORT', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`User Profile: ${user.username} (${user.email})`, 20, 35);
    doc.text(`Current Streak: ${healthData.streak} Days`, 20, 42);
    doc.text(`Report Date: ${new Date().toLocaleString()}`, 20, 49);
    
    doc.setDrawColor(200);
    doc.line(20, 55, 190, 55);

    doc.setFontSize(14);
    doc.text('Personalized Diseases Loaded:', 20, 65);
    doc.setFontSize(10);
    userDiseases.forEach((d, i) => doc.text(`- ${d.name} (${d.category})`, 25, 72 + (i * 6)));

    doc.setFontSize(14);
    const yOffset = 75 + (userDiseases.length * 6);
    doc.text('Latest Symptom Logs:', 20, yOffset);
    (healthData.symptoms || []).slice(-5).forEach((s, i) => {
      doc.text(`${s.date}: ${s.text}`, 25, yOffset + 7 + (i * 6));
    });

    doc.save(`Healthpal_Report_${user.username}.pdf`);
  };

  const handleExportCSV = () => {
    // Basic CSV data
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "HealthPal Medical Report\n";
    csvContent += `User Profile,${user.username} (${user.email})\n`;
    csvContent += `Current Streak,${healthData.streak} Days\n`;
    csvContent += `Report Date,${new Date().toLocaleString()}\n\n`;

    csvContent += "Diseases/Conditions\n";
    userDiseases.forEach(d => {
      csvContent += `${d.name},${d.category}\n`;
    });
    csvContent += "\n";

    csvContent += "Symptom Logs\n";
    csvContent += "Date,Symptom\n";
    (healthData.symptoms || []).forEach(s => {
      csvContent += `"${s.date}","${s.text.replace(/"/g, '""')}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Healthpal_Report_${user.username}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen pb-44"
    >
      {/* Top Header */}
      <motion.header variants={itemVariants} className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center border border-emerald-200">
            <Heart className="w-6 h-6 text-emerald-600 fill-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-black text-slate-900 dark:text-white tracking-tight leading-none italic">Healthpal</h2>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1 block">Your Personal Wellness Companion</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Streak Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full border border-orange-100 dark:border-orange-900 font-bold text-xs">
            <Flame className="w-4 h-4 fill-current" /> {healthData.streak} Day Streak
          </div>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate('aichat')}
            className="p-3 bg-white dark:bg-slate-900/80 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-emerald-600"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate('scan')}
            className="p-3 bg-white dark:bg-slate-900/80 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-emerald-600"
          >
            <Camera className="w-5 h-5" />
          </motion.button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-3 bg-white dark:bg-slate-900/80 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-rose-400"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate('profile')}
            className="p-3 bg-white dark:bg-slate-900/80 dark:backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-slate-400 dark:text-slate-500"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence mode="popLayout">
        <motion.div
           key={activeTab}
           variants={containerVariants}
           initial="hidden"
           animate="visible"
           exit="hidden"
           className="focus:outline-none"
        >
          {activeTab === 'home' && renderHome()}
          {activeTab === 'missions' && renderMissions()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'charts' && renderCharts()}
          {activeTab === 'locations' && renderLocations()}
        </motion.div>
      </AnimatePresence>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab: any) => setActiveTab(tab)}
        onPlusAction={handlePlusAction}
        language="en"
      />

      {/* Input Modal System */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 text-slate-900">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => { setActiveModal(null); }}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ y: "100%", opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: "100%", opacity: 0 }}
               className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl h-[95vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
             >
                <div className="p-8 flex-1 overflow-y-auto no-scrollbar pb-32">
                  <button onClick={() => { setActiveModal(null); setSymptomAiFeedback(null); setNutritionAiFeedback(null); }} className="absolute right-6 top-6 p-2 bg-slate-50 dark:bg-slate-800 rounded-full z-[70] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                
                {activeModal === 'daily-quests-achievements' ? (
                   <div className="space-y-8 text-left">
                     <div className="space-y-1">
                       <h3 className="text-3xl font-serif font-black text-slate-900 tracking-tight italic leading-none">Wellness Quests</h3>
                       <p className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">Your Daily Health Protocol</p>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {dailyQuests.map(quest => {
                          const progress = quest.id === 'water' || quest.id === 'steps' 
                            ? (quest.current / quest.target) * 100 
                            : (quest.current >= quest.target ? 100 : 0);
                          const isDone = progress >= 100;
                          
                          return (
                            <div key={quest.id} className="relative p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-500">
                              {isDone && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -mr-8 -mt-8 flex items-end justify-start p-3">
                                  <Check className="w-4 h-4 text-emerald-600" />
                                </div>
                              )}
                              
                              <div className="flex items-start gap-4 mb-4">
                                <div className={cn(
                                  "p-3 rounded-2xl transition-all shadow-sm", 
                                  isDone ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
                                )}>
                                   {quest.icon}
                                </div>
                                <div className="flex-1">
                                  <p className={cn("text-[11px] font-black uppercase tracking-tight leading-tight mb-1", isDone ? "text-emerald-700" : "text-slate-800")}>
                                    {quest.label}
                                  </p>
                                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    <span>{isDone ? 'Mission Completed' : 'Progress'}</span>
                                    <span>{quest.current} / {quest.target}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                                 <motion.div 
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min(progress, 100)}%` }}
                                   className={cn("h-full", isDone ? "bg-emerald-600" : "bg-emerald-400")}
                                 />
                              </div>

                              {!isDone && (
                                <div className="flex items-center gap-2">
                                  {quest.id === 'water' && (
                                    <button 
                                      onClick={quickLogWater}
                                      className="flex-1 py-2.5 px-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-tight hover:bg-blue-600 hover:text-white transition-all transform active:scale-95"
                                    >
                                      +1 Glass
                                    </button>
                                  )}
                                  {quest.id === 'steps' && (
                                    <button 
                                      onClick={quickLogSteps}
                                      className="flex-1 py-2.5 px-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-tight hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95"
                                    >
                                      +1k Steps
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                     </div>

                     <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Award Badges</h4>
                           <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg">Daily Update</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           {[
                             { 
                               id: 'h2o', 
                               name: 'Water Warrior', 
                               icon: '💧', 
                               desc: '8 Glasses Hydration', 
                               active: dailyQuests.find(q => q.id === 'water')?.current! >= 8,
                               color: 'from-blue-400 to-blue-600'
                             },
                             { 
                               id: 'med', 
                               name: 'Med Master', 
                               icon: '💊', 
                               desc: 'Scheduled Medication', 
                               active: dailyQuests.find(q => q.id === 'meds')?.current! >= 1,
                               color: 'from-emerald-400 to-emerald-600'
                             },
                             { 
                               id: 'symptom', 
                               name: 'Self Aware', 
                               icon: '📝', 
                               desc: 'Symptom Status', 
                               active: dailyQuests.find(q => q.id === 'symptom')?.current! >= 1,
                               color: 'from-amber-400 to-amber-600'
                             }
                           ].map(badge => (
                             <div 
                               key={badge.id}
                               className={cn(
                                 "p-5 rounded-[2rem] border transition-all flex flex-col items-center text-center gap-2 relative overflow-hidden group",
                                 badge.active 
                                   ? "bg-white border-emerald-100 shadow-xl shadow-emerald-500/5" 
                                   : "bg-slate-50 border-slate-100 opacity-50 grayscale"
                               )}
                             >
                                {badge.active && (
                                  <div className={cn("absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br opacity-10 rounded-full blur-xl", badge.color)} />
                                )}
                                
                                <div className={cn(
                                  "w-14 h-14 rounded-full flex items-center justify-center text-3xl mb-1 transition-all duration-500 relative z-10",
                                  badge.active ? "bg-emerald-50 scale-110 shadow-lg shadow-emerald-100" : "bg-slate-100"
                                )}>
                                  {badge.icon}
                                </div>

                                <div className="relative z-10">
                                   <p className={cn("text-[9px] font-black uppercase tracking-widest", badge.active ? "text-emerald-900" : "text-slate-500")}>
                                     {badge.name}
                                   </p>
                                   <p className={cn("text-[8px] font-bold mt-0.5 uppercase tracking-tight", badge.active ? "text-emerald-500" : "text-slate-400")}>
                                     {badge.active ? badge.desc : 'Belum Didapat'}
                                   </p>
                                </div>

                                {badge.active && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-md"
                                  >
                                    <Check className="w-2 h-2 text-white" />
                                  </motion.div>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                   </div>
                ) : activeModal.startsWith('disease_') ? (
                  // Disease Detailed Info Modal
                  <div className="space-y-6">
                    {(() => {
                      const diseaseId = activeModal.split('_')[1];
                      const disease = DISEASE_REGISTRY.find(d => d.id === diseaseId);
                      if (!disease) return null;
                      return (
                        <>
                          <div className="space-y-1">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-rose-400 bg-clip-text text-transparent">
                               {disease.name}
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Health Guide</span>
                          </div>

                          <div className="space-y-4 text-left">
                            <section className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                               <h4 className="text-xs font-black text-rose-600 uppercase mb-1">Definition</h4>
                               <p className="text-sm text-slate-700 leading-relaxed">{disease.details?.definition || "Explanation of the medical condition."}</p>
                            </section>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <section className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                 <h4 className="text-[10px] font-black text-slate-400 uppercase mb-1">Causes & Risks</h4>
                                 <p className="text-xs text-slate-600 leading-relaxed">{disease.details?.causes || "Common risk factors."}</p>
                              </section>
                              <section className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                 <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-1">Common Symptoms</h4>
                                 <p className="text-xs text-slate-700 leading-relaxed">{disease.details?.symptoms || "Signs to watch out for."}</p>
                              </section>
                            </div>

                            <section className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                               <div className="p-2 bg-blue-500 text-white rounded-lg min-w-[32px]"><Zap className="w-4 h-4" /></div>
                               <div>
                                 <h4 className="text-xs font-black text-blue-600 uppercase mb-1">Advice & Management</h4>
                                 <p className="text-xs text-slate-700 leading-relaxed font-medium">{disease.details?.tips || "Healthy lifestyle for this condition."}</p>
                               </div>
                            </section>
                          </div>

                          {disease.referenceUrl && (
                            <a 
                              href={disease.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all mb-2"
                            >
                              <ExternalLink className="w-4 h-4" /> Buka Referensi Medis Penyakit
                            </a>
                          )}

                          <button 
                            onClick={() => setActiveModal(disease.widgets[0])}
                            className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-5 h-5" /> Catat Log Sekarang
                          </button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // General Logger Modal
                  <>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                       Log {formatWidgetTitle(activeModal)}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6">Input today's data to keep your streak active.</p>

                    <div className="space-y-4">
                       {activeModal === 'activity-tracker' ? (
                          <div className="space-y-8 text-left">
                            {/* Combined Hydration Section */}
                             <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                                <div className="flex justify-between items-center mb-4">
                                   <div className="flex items-center gap-2">
                                      <Droplets className="w-5 h-5 text-blue-500" />
                                      <h4 className="text-sm font-bold text-slate-800">Hydration Target</h4>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <button 
                                        onClick={generateHydrationAnalysis}
                                        disabled={isAnalyzingHydration}
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white",
                                          isAnalyzingHydration ? "text-slate-400 border-slate-100" : "text-blue-600 border-blue-100 hover:bg-blue-50"
                                        )}
                                      >
                                        {isAnalyzingHydration ? (
                                          <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        ) : <Zap className="w-2.5 h-2.5" />}
                                        Smart Analysis
                                      </button>
                                      <div className="text-xl font-black text-blue-600">{waterCount} / 8</div>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-8 gap-1.5 mb-4">
                                    {[...Array(8)].map((_, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setWaterCount(i + 1)}
                                        className={cn(
                                          "h-8 rounded-lg transition-all flex items-center justify-center",
                                          i < waterCount ? "bg-blue-500 text-white" : "bg-white text-slate-200"
                                        )}
                                      >
                                        <Droplets className={cn("w-3 h-3", i < waterCount ? "fill-current" : "")} />
                                      </button>
                                    ))}
                                 </div>

                                 {healthData.hydrationLogs?.find(l => l.date === getLocalDate())?.analysis && (
                                   <div className="p-4 bg-white/60 rounded-2xl border border-blue-100 text-[10px] text-blue-800 italic leading-relaxed relative pr-8">
                                     <Zap className="w-2.5 h-2.5 inline mr-1 text-blue-500" />
                                     {(() => {
                                       let cleanText = healthData.hydrationLogs.find(l => l.date === getLocalDate())?.analysis || '';
                                       if (cleanText.includes("* *")) {
                                         cleanText = cleanText.split("* *")[0];
                                       }
                                       cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
                                       return cleanText;
                                     })()}
                                     <button 
                                       onClick={() => speakText(healthData.hydrationLogs!.find(l => l.date === getLocalDate())!.analysis!)} 
                                       className="absolute right-2 top-2 text-blue-500 opacity-60 hover:opacity-100"
                                     >
                                       <Volume2 className="w-3 h-3" />
                                     </button>
                                   </div>
                                 )}
                             </div>

                             {/* Nutrition Section */}
                             <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                   <Utensils className="w-5 h-5 text-orange-500" />
                                   <h4 className="text-sm font-bold text-slate-800">AI Diet Tracker</h4>
                                </div>
                                <div className="space-y-4">
                                  {['Breakfast', 'Lunch', 'Dinner'].map(type => (
                                    <div key={type} className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <label className="text-[10px] font-black uppercase text-slate-400">{type} Meal</label>
                                          {meals[type].feedback && <span className="text-[10px] font-bold text-emerald-500">Analyzed</span>}
                                        </div>
                                        <button 
                                          onClick={() => generateNutritionAnalysis(type)}
                                          disabled={!meals[type].content || analyzingMealType === type}
                                          className={cn(
                                            "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all",
                                            analyzingMealType === type ? "text-slate-400 border-slate-100" : "text-blue-600 border-blue-100 hover:bg-blue-50"
                                          )}
                                        >
                                          {analyzingMealType === type ? (
                                            <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                          ) : <Zap className="w-2.5 h-2.5" />}
                                          Deep Analysis
                                        </button>
                                      </div>
                                      <div className="relative">
                                        <textarea
                                          placeholder={`What did you eat for ${type.toLowerCase()}?`}
                                          value={meals[type].content}
                                          onChange={e => setMeals(prev => ({
                                            ...prev,
                                            [type]: { ...prev[type], content: e.target.value }
                                          }))}
                                          className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm h-16 pr-20"
                                        />
                                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                          <VoiceInputButton 
                                            onResult={(text) => setMeals(prev => ({
                                              ...prev,
                                              [type]: { ...prev[type], content: prev[type].content ? prev[type].content + ' ' + text : text }
                                            }))} 
                                          />
                                          <button
                                            onClick={() => generateNutritionFeedback(type)}
                                            disabled={!meals[type].content || meals[type].isAnalyzing}
                                            className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 disabled:opacity-30"
                                          >
                                            {meals[type].isAnalyzing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
                                          </button>
                                        </div>
                                      </div>
                                      <HistorySuggestions 
                                        category={`meals_${type}`} 
                                        onSelect={(val) => setMeals(prev => ({
                                          ...prev,
                                          [type]: { ...prev[type], content: val }
                                        }))} 
                                      />
                                      
                                      {(meals[type].feedback || healthData.mealLogs?.find(l => l.date === getLocalDate())?.meals[type]?.analysis) && (
                                        <motion.div 
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          className="space-y-2 pt-1"
                                        >
                                          {meals[type].feedback && (
                                            <div className="flex items-start gap-2">
                                              <div className="flex-1 text-[11px] text-emerald-600 leading-relaxed italic pl-1">
                                                <Zap className="w-2.5 h-2.5 inline mr-1 mb-0.5 animate-pulse" />
                                                {(() => {
                                                  let cleanText = meals[type].feedback || '';
                                                  if (cleanText.includes("* *")) {
                                                    cleanText = cleanText.split("* *")[0];
                                                  }
                                                  cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
                                                  return cleanText;
                                                })()}
                                              </div>
                                              <button onClick={() => speakText(meals[type].feedback!)} className="p-1 text-emerald-500 hover:text-emerald-600">
                                                <Volume2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                          {healthData.mealLogs?.find(l => l.date === getLocalDate())?.meals[type]?.analysis && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed italic whitespace-pre-wrap relative pr-8">
                                              <Zap className="w-2.5 h-2.5 inline mr-1 text-blue-500" />
                                              {(() => {
                                                let cleanText = healthData.mealLogs.find(l => l.date === getLocalDate())?.meals[type]?.analysis || '';
                                                if (cleanText.includes("* *")) {
                                                  cleanText = cleanText.split("* *")[0];
                                                }
                                                cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
                                                return cleanText;
                                              })()}
                                              <button 
                                                onClick={() => speakText(healthData.mealLogs!.find(l => l.date === getLocalDate())!.meals[type]!.analysis!)} 
                                                className="absolute right-2 top-2 text-blue-500 opacity-60 hover:opacity-100"
                                              >
                                                <Volume2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                             </div>
                             
                             <button 
                               onClick={() => {
                                 const mealSummary = Object.entries(meals)
                                   .filter(([_, data]) => data.content)
                                   .map(([type, data]) => {
                                      addToHistory(`meals_${type}`, data.content);
                                      return `${type}: ${data.content}`;
                                   })
                                   .join(' | ');
                                 handleLog('activity-tracker', { 
                                   description: `Diet: ${mealSummary} | Hydration: ${waterCount} Glasses`
                                 });
                                 setActiveModal(null);
                                 setModalInput('');
                               }}
                               className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
                             >
                               Save Activity
                             </button>
                          </div>
                       ) : activeModal === 'bmi-calc' ? (
                          <div className="space-y-8 text-left">
                             {bmiResult ? (
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center space-y-6"
                               >
                                 <div className="space-y-1">
                                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Body Mass Index Result</p>
                                   <div className={cn("text-6xl font-black", bmiResult.color)}>{bmiResult.value}</div>
                                   <p className={cn("text-sm font-bold uppercase tracking-tight", bmiResult.color)}>{bmiResult.status}</p>
                                 </div>
                                 
                                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 text-left space-y-3">
                                   <div className="flex items-center justify-between text-slate-800 font-bold text-xs">
                                     <div className="flex items-center gap-2">
                                       <Zap className="w-4 h-4 text-emerald-500" /> PalBuddy Health Tips
                                     </div>
                                     <button onClick={() => speakText(bmiResult.tips)} className="p-1 text-emerald-500 hover:text-emerald-600">
                                       <Volume2 className="w-4 h-4" />
                                     </button>
                                   </div>
                                   <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                     {bmiResult.tips}
                                   </p>
                                 </div>

                                 <button 
                                   onClick={() => {
                                     handleLog('bmi-calc', { value: bmiResult.value, weight: bmiInput.weight, height: bmiInput.height });
                                   }}
                                   className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                                 >
                                   <Check className="w-5 h-5" /> Save to History
                                 </button>
                               </motion.div>
                             ) : (
                               <div className="space-y-6">
                                 <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-slate-400">Height (cm)</label>
                                     <input 
                                       type="number"
                                       placeholder="170"
                                       value={bmiInput.height}
                                       onChange={e => setBmiInput(prev => ({ ...prev, height: e.target.value }))}
                                       className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                     />
                                   </div>
                                   <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase text-slate-400">Weight (kg)</label>
                                     <input 
                                       type="number"
                                       placeholder="65"
                                       value={bmiInput.weight}
                                       onChange={e => setBmiInput(prev => ({ ...prev, weight: e.target.value }))}
                                       className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                     />
                                   </div>
                                 </div>
                                 <button 
                                   onClick={handleBmiCalc}
                                   className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg hover:bg-emerald-600 transition-all"
                                 >
                                   Calculate BMI
                                 </button>
                               </div>
                             )}
                          </div>
                       ) : activeModal === 'hydration-tracker' ? (
                          <div className="space-y-8 text-left">
                             <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center text-blue-500 relative">
                                   <Droplets className="w-10 h-10 fill-current" />
                                   <motion.div 
                                     animate={{ scale: [1, 1.2, 1] }} 
                                     transition={{ repeat: Infinity, duration: 2 }}
                                     className="absolute inset-0 bg-blue-200 rounded-full -z-10 opacity-30" 
                                   />
                                </div>
                                <div className="text-center">
                                   <div className="text-3xl font-black text-slate-800">{waterCount} / 8</div>
                                   <div className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Glasses Completed</div>
                                </div>
                             </div>

                             <div className="flex justify-center">
                               <button 
                                 onClick={generateHydrationAnalysis}
                                 disabled={isAnalyzingHydration}
                                 className={cn(
                                   "px-4 py-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-50",
                                   isAnalyzingHydration ? "text-slate-400 border-slate-100" : "text-blue-600 border-blue-100 hover:bg-blue-100"
                                 )}
                               >
                                 {isAnalyzingHydration ? (
                                   <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                 ) : <Zap className="w-3 h-3" />}
                                 Smart Hydration Analysis
                               </button>
                             </div>

                             {healthData.hydrationLogs?.find(l => l.date === getLocalDate())?.analysis && (
                               <motion.div 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="p-5 bg-white border border-blue-100 rounded-3xl shadow-sm text-xs text-slate-600 leading-relaxed italic relative overflow-hidden"
                                >
                                 <div className="flex items-center gap-2 mb-2">
                                   <Zap className="w-3 h-3 text-blue-500" />
                                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Insights</span>
                                 </div>
                                 {healthData.hydrationLogs.find(l => l.date === getLocalDate())?.analysis}
                               </motion.div>
                             )}

                             <div className="grid grid-cols-4 gap-3">
                               {[...Array(8)].map((_, i) => (
                                 <button
                                   key={i}
                                   onClick={() => setWaterCount(i + 1)}
                                   className={cn(
                                     "h-16 rounded-2xl transition-all flex items-center justify-center border-2",
                                     i < waterCount 
                                       ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-200 scale-105" 
                                       : "bg-white border-slate-100 text-slate-200 hover:border-blue-200"
                                   )}
                                 >
                                   <Droplets className={cn("w-6 h-6", i < waterCount ? "fill-current" : "")} />
                                 </button>
                               ))}
                             </div>

                             <div className="space-y-4">
                               <p className="text-[11px] text-slate-500 text-center font-medium italic">
                                 "Sufficient hydration helps your concentration and body metabolism."
                               </p>
                               <button 
                                 onClick={() => {
                                   handleLog('activity-tracker', `Hydration: ${waterCount} Glasses`);
                                   setActiveModal(null);
                                 }}
                                 className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95"
                               >
                                 Save Water Progress
                               </button>
                             </div>
                          </div>
                        ) : activeModal === 'nutrition-tracker' ? (
                          <div className="space-y-6 text-left">
                            <PalBuddy isSpeaking={isPalSpeaking} message="Record what you eat today. My AI will provide instant nutritional analysis based on your health condition." />
                            <div className="space-y-6">
                              {['Breakfast', 'Lunch', 'Dinner'].map(type => (
                                <div key={type} className="space-y-3">
                                  <div className="flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{type} Meal</label>
                                       {meals[type].feedback && (
                                         <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                           <Check className="w-3 h-3" /> Analyzed
                                         </span>
                                       )}
                                     </div>
                                     <button 
                                       onClick={() => generateNutritionAnalysis(type)}
                                       disabled={!meals[type].content || analyzingMealType === type}
                                       className={cn(
                                         "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all bg-white",
                                         analyzingMealType === type ? "text-slate-400 border-slate-100" : "text-blue-600 border-blue-100 hover:bg-blue-50"
                                       )}
                                     >
                                       {analyzingMealType === type ? (
                                         <div className="w-2.5 h-2.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                       ) : <Zap className="w-2.5 h-2.5" />}
                                       Deep Analysis
                                     </button>
                                  </div>
                                  <div className="relative">
                                    <textarea
                                      placeholder={`What did you eat for ${type.toLowerCase()}?`}
                                      value={meals[type].content}
                                      onChange={e => setMeals(prev => ({
                                        ...prev,
                                        [type]: { ...prev[type], content: e.target.value }
                                      }))}
                                      className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm h-20 pr-12"
                                    />
                                    <button
                                      onClick={() => generateNutritionFeedback(type)}
                                      disabled={!meals[type].content || meals[type].isAnalyzing}
                                      className="absolute right-3 bottom-3 p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 disabled:opacity-30 transition-all"
                                      title="Nutrition Analysis"
                                    >
                                      {meals[type].isAnalyzing ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Zap className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  {meals[type].feedback && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="space-y-2 pt-1"
                                    >
                                      <div className="text-[11px] text-emerald-600 leading-relaxed italic pl-1">
                                        <Zap className="w-2.5 h-2.5 inline mr-1 mb-0.5 animate-pulse" />
                                        {meals[type].feedback}
                                      </div>
                                      {healthData.mealLogs?.find(l => l.date === getLocalDate())?.meals[type]?.analysis && (
                                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-[10px] text-blue-800 leading-relaxed italic whitespace-pre-wrap">
                                          <Zap className="w-2.5 h-2.5 inline mr-1 text-blue-500" />
                                          {healthData.mealLogs.find(l => l.date === getLocalDate())?.meals[type]?.analysis}
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              ))}

                              <div className="pt-4">
                                <button 
                                  onClick={() => {
                                    const mealSummary = Object.entries(meals)
                                      .filter(([_, data]) => data.content)
                                      .map(([type, data]) => `${type}: ${data.content}`)
                                      .join(' | ');
                                    handleLog('activity-tracker', `Diet: ${mealSummary}`);
                                    setActiveModal(null);
                                    setMeals({
                                      Breakfast: { content: '', feedback: null, isAnalyzing: false },
                                      Lunch: { content: '', feedback: null, isAnalyzing: false },
                                      Dinner: { content: '', feedback: null, isAnalyzing: false },
                                      Snack: { content: '', feedback: null, isAnalyzing: false },
                                    });
                                  }}
                                  className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                >
                                  Save Meal Log
                                </button>
                              </div>
                            </div>
                          </div>
                       ) : activeModal === 'health-finance' ? (
                         <div className="space-y-4">
                           <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Medication / Service Name</label>
                             <div className="relative">
                               <input 
                                 type="text"
                                 placeholder="Example: Paracetamol, Blood Test..."
                                 value={financeInput.name}
                                 onChange={e => setFinanceInput(prev => ({ ...prev, name: e.target.value }))}
                                 className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all pr-12"
                               />
                               <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <VoiceInputButton 
                                    onResult={(text) => setFinanceInput(prev => ({ ...prev, name: text }))} 
                                    className="p-1 h-10 w-10"
                                  />
                               </div>
                             </div>
                             <HistorySuggestions 
                               category="finance_names" 
                               onSelect={(val) => setFinanceInput(prev => ({ ...prev, name: val }))} 
                             />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Price (USD)</label>
                             <input 
                               type="number"
                               placeholder="50"
                               value={financeInput.price}
                               onChange={e => setFinanceInput(prev => ({ ...prev, price: e.target.value }))}
                               className="w-full p-4 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                             />
                           </div>
                           <button 
                             onClick={() => {
                               handleLog('health-finance', financeInput);
                               setFinanceInput({ name: '', price: '' });
                               setActiveModal(null);
                             }}
                             disabled={!financeInput.name || !financeInput.price}
                             className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
                           >
                             Save Expense
                           </button>

                           {(healthData.expenses || []).length > 0 && (
                             <div className="pt-6 border-t border-slate-100">
                               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent History</h4>
                               <div className="space-y-2 max-h-40 overflow-y-auto pr-2 text-left">
                                 {(healthData.expenses || []).slice().reverse().map((exp) => (
                                   <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                     <div className="text-xs font-bold text-slate-700">{exp.description}</div>
                                     <div className="text-xs font-black text-emerald-600">${exp.amount.toLocaleString()}</div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                         </div>
                       ) : activeModal === 'medication-tracker' ? (
                         <div className="space-y-6 text-left">
                           {(healthData.medications || []).filter(m => m.date === getLocalDate()).length > 0 && (
                             <div className="space-y-4 mb-8">
                               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Today's Intake Confirmation</h4>
                               <div className="space-y-2">
                                 {(healthData.medications || [])
                                   .filter(m => m.date === getLocalDate())
                                   .map(med => (
                                     <div key={med.id} className="space-y-2">
                                       <div
                                         className={cn(
                                           "w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left",
                                           med.taken 
                                             ? "bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm" 
                                             : "bg-white border-slate-100 text-slate-600 hover:border-emerald-100"
                                         )}
                                       >
                                         <div className="flex items-center gap-3 font-sans flex-1 cursor-pointer" onClick={() => toggleMedication(med.id)}>
                                           <div className={cn(
                                             "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                             med.taken ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                           )}>
                                             <Check className="w-4 h-4" />
                                           </div>
                                           <div className="flex flex-col">
                                             <span className="text-sm font-bold">{med.name}</span>
                                             <span className="text-[10px] text-slate-400 font-medium">{med.time}</span>
                                           </div>
                                         </div>
                                         
                                         <div className="flex items-center gap-2">
                                           {med.taken && <span className="text-[10px] font-black uppercase text-emerald-600 mr-2">Taken</span>}
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); generateMedicationAnalysis(med.id, med.name); }}
                                             disabled={isAnalyzingMedId === med.id}
                                             className={cn(
                                               "p-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                                               med.analysis ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-100"
                                             )}
                                           >
                                             {isAnalyzingMedId === med.id ? (
                                               <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                             ) : <Zap className="w-3 h-3" />}
                                             {med.analysis ? 'Re-Analyze' : 'Smart Analysis'}
                                           </button>
                                         </div>
                                       </div>
                                       {med.analysis && (
                                         <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl relative overflow-hidden">
                                           <div className="flex items-center gap-2 mb-2">
                                             <Zap className="w-3 h-3 text-blue-500" />
                                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">AI Medical Insights</span>
                                           </div>
                                           <div className="text-[11px] text-slate-600 dark:text-blue-200 leading-relaxed whitespace-pre-wrap italic">
                                             {(() => {
                                               let cleanText = med.analysis || '';
                                               if (cleanText.includes("* *")) {
                                                 cleanText = cleanText.split("* *")[0];
                                               }
                                               cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
                                               return cleanText;
                                             })()}
                                           </div>
                                         </div>
                                       )}
                                     </div>
                                   ))}
                               </div>
                               <div className="h-px bg-slate-100 mt-8" />
                             </div>
                           )}

                           <div className="space-y-4">
                             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left block">Add New Medication Schedule</h4>
                             {medInputs.map((med, index) => (
                               <motion.div 
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 key={med.id} 
                                 className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative"
                               >
                                 <button 
                                   onClick={() => setMedInputs(prev => prev.filter(m => m.id !== med.id))}
                                   className="absolute right-4 top-4 p-1 hover:bg-slate-200 rounded-lg transition-colors"
                                 >
                                   <X className="w-3 h-3 text-slate-400" />
                                 </button>
                                 
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left block">Medication Name</label>
                                     <div className="relative">
                                       <input 
                                         type="text"
                                         placeholder="Example: Metformin, Aspirin..."
                                         value={med.name}
                                         onChange={e => {
                                           const newMeds = [...medInputs];
                                           newMeds[index].name = e.target.value;
                                           setMedInputs(newMeds);
                                         }}
                                         className="w-full bg-white dark:bg-slate-800 border-none ring-1 ring-slate-100 dark:ring-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 pr-10"
                                       />
                                       <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                          <VoiceInputButton 
                                            onResult={(text) => {
                                              const newMeds = [...medInputs];
                                              newMeds[index].name = text;
                                              setMedInputs(newMeds);
                                            }} 
                                            className="p-1 h-8 w-8"
                                          />
                                       </div>
                                     </div>
                                     <HistorySuggestions 
                                       category="medication_names" 
                                       onSelect={(val) => {
                                          const newMeds = [...medInputs];
                                          newMeds[index].name = val;
                                          setMedInputs(newMeds);
                                       }} 
                                     />
                                 </div>

                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left block">Frequency (Times Per Day)</label>
                                    <div className="flex gap-2">
                                      {['1', '2', '3', '4'].map(num => (
                                        <button
                                          key={num}
                                          onClick={() => {
                                             const newMeds = [...medInputs];
                                             newMeds[index].timesPerDay = num;
                                             setMedInputs(newMeds);
                                          }}
                                          className={cn(
                                            "w-10 h-10 rounded-xl text-xs font-bold transition-all border",
                                            med.timesPerDay === num ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100" : "bg-white text-slate-400 border-slate-100"
                                          )}
                                        >
                                          {num}x
                                        </button>
                                      ))}
                                    </div>
                                 </div>
                               </motion.div>
                             ))}
                           </div>

                           <button 
                             onClick={() => setMedInputs(prev => [...prev, { id: crypto.randomUUID(), name: '', timesPerDay: '1' }])}
                             className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-all"
                           >
                             <Plus className="w-4 h-4" /> Add Another Medication
                           </button>

                           <button 
                             onClick={() => {
                               handleLog('medication-tracker', medInputs);
                               setMedInputs([{ id: crypto.randomUUID(), name: '', timesPerDay: '1' }]);
                             }}
                             disabled={medInputs.every(m => !m.name)}
                             className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50"
                           >
                             Save All Medication Schedules
                            </button>
                         </div>
                       ) : activeModal === 'charts-view' ? (
                          <div className="space-y-8 text-left max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
                            <PalBuddy isSpeaking={isPalSpeaking} message="Here is a visual recap of all your activities and health status." />
                            
                            {/* BMI Analytics Chart */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                               <div className="flex items-center justify-between mb-6">
                                 <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      <Calculator className="w-4 h-4 text-emerald-500" /> BMI Analytics
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Weight History</p>
                                 </div>
                               </div>
                               {bmiHistoryData.length > 0 ? (
                                 <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                       <BarChart 
                                         data={bmiHistoryData} 
                                         margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                         onClick={(data: any) => {
                                           if (data && data.activePayload && data.activePayload[0]) {
                                             setSelectedDay(data.activePayload[0].payload.date);
                                           }
                                         }}
                                       >
                                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                         <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                                         <YAxis axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                                         <Tooltip cursor={{ fill: '#f1f5f9', cursor: 'pointer' }} contentStyle={{ borderRadius: '0.75rem', border: 'none', fontSize: '10px' }} />
                                         <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer" />
                                         <Brush dataKey="displayDate" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                                       </BarChart>
                                    </ResponsiveContainer>
                                 </div>
                               ) : <p className="text-[10px] text-slate-400 text-center py-4 italic">No data available</p>}
                            </div>

                            {/* Finance Analytics Chart */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                               <div className="flex items-center justify-between mb-6">
                                 <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-emerald-500" /> Health Expense Analysis
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Medical Costs</p>
                                 </div>
                               </div>
                               <div className="h-48 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                       data={monthlyExpenses} 
                                       margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                       onClick={(data: any) => {
                                         if (data && data.activePayload && data.activePayload[0]) {
                                           const monthName = data.activePayload[0].payload.name;
                                           const sampleExpense = healthData.expenses?.find(e => {
                                             const d = new Date(e.date);
                                             const mName = d.toLocaleDateString('en-US', { month: 'short' });
                                             return mName === monthName;
                                           });
                                           if (sampleExpense) setSelectedDay(sampleExpense.date);
                                         }
                                       }}
                                     >
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} tickFormatter={(value) => value >= 1000 ? `$${value / 1000}k` : `$${value}`} />
                                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '0.75rem', border: 'none', fontSize: '10px' }} />
                                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                                      <Brush dataKey="name" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                                    </BarChart>
                                  </ResponsiveContainer>
                               </div>
                            </div>

                            {/* Medication Adherence Chart */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                               <div className="flex items-center justify-between mb-6">
                                 <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      <Pill className="w-4 h-4 text-emerald-500" /> {"Medication Summary"}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{"Total Consumption Per Type (This Month)"}</p>
                                 </div>
                               </div>
                               {medicationStats.length > 0 ? (
                                 <div className="h-48 w-full">
                                     <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={medicationStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis 
                                          dataKey="name" 
                                          axisLine={false} 
                                          tickLine={false} 
                                          tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }}
                                          interval={0}
                                          angle={-45}
                                          textAnchor="end"
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }} />
                                        <Tooltip 
                                          cursor={{ fill: '#f1f5f9' }} 
                                          contentStyle={{ borderRadius: '0.75rem', border: 'none', fontSize: '10px' }}
                                          formatter={(value: any, _name: any, props: any) => [
                                            `${value} of ${props.payload.total} doses taken`, 
                                            props.payload.fullName
                                          ]}
                                        />
                                        <Bar name="Total Scheduled" dataKey="total" fill="#fbcfe8" radius={[4, 4, 0, 0]} barSize={12} />
                                        <Bar name="Taken" dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={12} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                 </div>
                               ) : (
                                 <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                                   <Pill className="w-8 h-8 text-slate-200" />
                                   <p className="text-[10px] text-slate-400 italic">No medication data for this month.</p>
                                 </div>
                               )}
                            </div>

                            {/* Activity Analytics Chart */}
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                               <div className="flex items-center justify-between mb-6">
                                 <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-emerald-500" /> {"Nutrition & Activity Analysis"}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{"Status Last 7 Days"}</p>
                                 </div>
                               </div>
                               <div className="h-48 w-full">
                                   <ResponsiveContainer width="100%" height="100%">
                                     <BarChart 
                                       data={hydrationStats} 
                                       margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                       onClick={(data: any) => {
                                         if (data && data.activePayload && data.activePayload[0]) {
                                           setSelectedDay(data.activePayload[0].payload.fullDate);
                                         }
                                       }}
                                     >
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                                       <Tooltip cursor={{ fill: '#f1f5f9', cursor: 'pointer' }} contentStyle={{ borderRadius: '0.75rem', border: 'none', fontSize: '10px' }} />
                                       <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
                                       <Bar name="Hydration" dataKey="glasses" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} cursor="pointer" />
                                       <Bar name="Meals" dataKey="meals" fill="#f97316" radius={[4, 4, 0, 0]} barSize={8} cursor="pointer" />
                                       <Bar name="Steps (k)" dataKey={(d) => d.steps / 1000} fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} cursor="pointer" />
                                       <Brush dataKey="date" height={20} stroke="#10b98199" fill="transparent" travellerWidth={10} />
                                     </BarChart>
                                   </ResponsiveContainer>
                               </div>
                            </div>



                            {/* Sleep & Mental Chart */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
                                    <Moon className="w-4 h-4 text-indigo-500" /> {"Sleep Quality"}
                                  </h4>
                                  {sleepHistoryData.length > 0 ? (
                                    <div className="h-40 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={sleepHistoryData}>
                                          <XAxis dataKey="displayDate" hide />
                                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                                          <Bar dataKey="duration" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : <p className="text-[8px] text-slate-400 text-center py-4 italic">No sleep data</p>}
                               </div>
                               <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
                                    <Smile className="w-4 h-4 text-purple-500" /> {"Stress Levels"}
                                  </h4>
                                  {mentalHistoryData.length > 0 ? (
                                    <div className="h-40 w-full">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={mentalHistoryData}>
                                          <XAxis dataKey="displayDate" hide />
                                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                                          <Bar dataKey="stressLevel" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  ) : <p className="text-[8px] text-slate-400 text-center py-4 italic">No mood data</p>}
                               </div>
                            </div>

                            <button 
                              onClick={() => setActiveModal(null)}
                              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl transition-all"
                            >
                              {"Close Charts"}
                            </button>
                          </div>
                        ) : activeModal === 'dev-feedback' ? (
                          <div className="space-y-6 text-left">
                            <PalBuddy message="Your feedback is highly valuable to us. Help us make this app even better!" />
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Feedback or Issues</label>
                              <textarea 
                                placeholder="Type your feedback or bug report here..."
                                value={modalInput}
                                onChange={e => setModalInput(e.target.value)}
                                className="w-full bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm min-h-[120px]"
                              />
                            </div>
                            <button 
                              onClick={() => {
                                handleLog('feedback', modalInput);
                                setModalInput('');
                                setActiveModal(null);
                              }}
                              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                              Kirim Feedback ✉️
                            </button>
                          </div>
                        ) : activeModal === 'doc-vault' ? (
                          <div className="space-y-4 text-left max-h-[80vh] overflow-hidden flex flex-col">
                             <div className="flex-shrink-0">
                               <PalBuddy isSpeaking={isPalSpeaking} message="Securely save and access your medical documents in the Health Vault." />
                             </div>
                             
                             {selectedVaultFile ? (
                               <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                  <div className="flex items-center justify-between">
                                     <button 
                                       onClick={() => setSelectedVaultFile(null)}
                                       className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                     >
                                       <X className="w-4 h-4" /> Back to List
                                     </button>
                                     <div className="text-right">
                                       <span className="text-[10px] font-black uppercase text-slate-300 block leading-tight">{selectedVaultFile.name}</span>
                                       {selectedVaultFile.metadata && (
                                         <span className="text-[8px] font-black uppercase text-emerald-500 tracking-tighter">
                                           {selectedVaultFile.metadata.day}, {selectedVaultFile.metadata.date} {selectedVaultFile.metadata.month} {selectedVaultFile.metadata.year}
                                         </span>
                                       )}
                                       <div className="flex gap-2 mt-2 justify-end">
                                          <button onClick={() => { handleRename(selectedVaultFile.id, selectedVaultFile.name); setActiveModal(null); }} className="text-[8px] font-black uppercase text-slate-400 hover:text-emerald-500">Rename</button>
                                          <button onClick={() => handleDownloadDoc(selectedVaultFile)} className="text-[8px] font-black uppercase text-slate-400 hover:text-blue-500">Download</button>
                                          <button onClick={() => handleShareDoc(selectedVaultFile)} className="text-[8px] font-black uppercase text-slate-400 hover:text-purple-500">Share</button>
                                       </div>
                                     </div>
                                  </div>
                                  <div className="flex-1 bg-slate-900 rounded-[2rem] overflow-hidden relative flex items-center justify-center p-4">
                                     {selectedVaultFile.fileData?.startsWith('data:image') ? (
                                       <img 
                                         src={selectedVaultFile.fileData} 
                                         alt={selectedVaultFile.name}
                                         className="max-w-full max-h-full object-contain"
                                       />
                                     ) : selectedVaultFile.fileData?.startsWith('data:application/pdf') ? (
                                       <div className="text-center space-y-4">
                                          <div className="p-6 bg-white/10 rounded-full inline-block">
                                            <FileText className="w-12 h-12 text-white" />
                                          </div>
                                          <p className="text-white font-bold text-sm">Dokumen PDF Terdeteksi</p>
                                          <p className="text-slate-400 text-xs">Aplikasi ini berjalan dalam lingkungan iFrame. <br/> Gunakan tombol di bawah untuk membuka di tab baru.</p>
                                          <a 
                                            href={selectedVaultFile.fileData} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-xs"
                                          >
                                            Open Full Document
                                          </a>
                                       </div>
                                     ) : (
                                       <div className="text-white text-center">
                                          <p className="text-sm font-bold">File format cannot be previewed directly.</p>
                                       </div>
                                     )}
                                  </div>
                               </div>
                             ) : (
                               <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                                  <div className="flex flex-col gap-3">
                                     <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Upload New</h4>
                                     </div>
                                     <div 
                                       onClick={() => document.getElementById('vault-file-input')?.click()}
                                       className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                                     >
                                        <div className="p-3 bg-white rounded-2xl shadow-sm scale-90 group-hover:scale-100 transition-transform">
                                          <Plus className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 group-hover:text-blue-600">Tap to Upload File</p>
                                        <p className="text-[9px] text-slate-300">Format: JPG, PNG, PDF (Max 5MB)</p>
                                     </div>
                                  </div>

                                  <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                                     <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex-shrink-0">
                                       Saved Files ({ (healthData.documents || []).length })
                                     </h4>
                                     <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-2">
                                        {(healthData.documents || []).length > 0 ? (
                                          [...(healthData.documents || [])].reverse().map(doc => (
                                            <div 
                                              key={doc.id}
                                              onClick={() => setSelectedVaultFile(doc)}
                                              className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all cursor-pointer group text-left"
                                            >
                                               <div className="flex items-center gap-3">
                                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                     <FileText className="w-5 h-5" />
                                                  </div>
                                                  <div>
                                                     <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{doc.name}</p>
                                                     <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{doc.date} • {doc.size || 'Unknown size'}</p>
                                                  </div>
                                               </div>
                                               <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                          ))
                                        ) : (
                                          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 opacity-30">
                                             <FileText className="w-12 h-12" />
                                             <p className="text-xs font-bold italic">No saved files yet</p>
                                          </div>
                                        )}
                                     </div>
                                  </div>
                               </div>
                             )}
                          </div>
                        ) : activeModal === 'step-tracker' ? (
                          <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4 text-left">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Log Steps</h4>
                                </div>
                                <button 
                                  onClick={generateStepsAnalysis}
                                  disabled={isAnalyzingSteps || !modalInput}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800",
                                    isAnalyzingSteps ? "text-slate-400 border-slate-200 dark:border-slate-700" : "text-emerald-600 border-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                  )}
                                >
                                  {isAnalyzingSteps ? (
                                    <div className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                  ) : <Zap className="w-2.5 h-2.5" />}
                                  Smart Analysis
                                </button>
                              </div>
                              <div className="space-y-4 text-left">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400">Total Daily Steps</label>
                                  <div className="relative">
                                    <input 
                                      type="number"
                                      placeholder="Example: 5000"
                                      value={modalInput}
                                      onChange={e => setModalInput(e.target.value)}
                                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-none outline-none dark:text-white ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500 transition-all text-sm pr-12"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                       <VoiceInputButton 
                                         onResult={(text) => {
                                            const num = text.replace(/[^0-9]/g, '');
                                            if (num) setModalInput(num);
                                            else setModalInput(text);
                                         }} 
                                         className="p-1 h-10 w-10"
                                       />
                                    </div>
                                  </div>
                                  <HistorySuggestions category="steps_today" onSelect={setModalInput} />
                                </div>

                                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden group">
                                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Activity className="w-24 h-24 text-white" />
                                  </div>
                                  <div className="relative z-10 flex flex-col items-center gap-4">
                                    {isLiveTracking ? (
                                      <>
                                        <div className="flex flex-col items-center">
                                          <span className="text-4xl font-black text-white animate-pulse">{liveSteps}</span>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Steps Detected</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                          <motion.div 
                                            className="h-full bg-emerald-500"
                                            animate={{ width: ["0%", "100%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                          />
                                        </div>
                                        <button 
                                          onClick={saveLiveSteps}
                                          className="w-full py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                                        >
                                          Save & Stop
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-center">
                                          <h5 className="text-white font-bold text-sm">Live Step Tracker</h5>
                                          <p className="text-slate-400 text-[10px] mt-1">Use your phone's accelerometer sensor to count steps in real-time.</p>
                                        </div>
                                        <button 
                                          onClick={startLiveTracking}
                                          className="w-full py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                          <Activity className="w-4 h-4" />
                                          Start Tracking
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {healthData.dailySteps?.find(s => s.date === getLocalDate())?.analysis && (
                                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-[10px] text-emerald-800 dark:text-emerald-400 italic leading-relaxed relative pr-8">
                                    <Zap className="w-2.5 h-2.5 inline mr-1 text-emerald-500" />
                                    {healthData.dailySteps.find(s => s.date === getLocalDate())?.analysis}
                                    <button 
                                      onClick={() => speakText(healthData.dailySteps!.find(s => s.date === getLocalDate())!.analysis!)} 
                                      className="absolute right-2 top-2 text-emerald-500 opacity-60 hover:opacity-100"
                                    >
                                      <Volume2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <button 
                                  onClick={() => {
                                    handleLog('activity-tracker', { steps: modalInput });
                                    setActiveModal(null);
                                    setModalInput('');
                                  }}
                                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95"
                                >
                                  Save Steps
                                </button>
                              </div>
                          </div>
                        ) : activeModal === 'bmi-calc' ? (
                          <div className="space-y-6 text-left">
                            <PalBuddy message="Monitor your Body Mass Index (BMI) periodically to maintain an ideal weight." />
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-left">Height (cm)</label>
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      placeholder="170"
                                      value={bmiInput.height}
                                      onChange={e => setBmiInput(prev => ({ ...prev, height: e.target.value }))}
                                      className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm pr-10"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                       <VoiceInputButton onResult={(text) => setBmiInput(prev => ({ ...prev, height: text.replace(/[^0-9.]/g, '') }))} className="p-1 h-8 w-8" />
                                    </div>
                                  </div>
                                  <HistorySuggestions category="bmi_height" onSelect={(val) => setBmiInput(prev => ({ ...prev, height: val }))} />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-left">Weight (kg)</label>
                                  <div className="relative">
                                    <input 
                                      type="number" 
                                      placeholder="65"
                                      value={bmiInput.weight}
                                      onChange={e => setBmiInput(prev => ({ ...prev, weight: e.target.value }))}
                                      className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm pr-10"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                       <VoiceInputButton onResult={(text) => setBmiInput(prev => ({ ...prev, weight: text.replace(/[^0-9.]/g, '') }))} className="p-1 h-8 w-8" />
                                    </div>
                                  </div>
                                  <HistorySuggestions category="bmi_weight" onSelect={(val) => setBmiInput(prev => ({ ...prev, weight: val }))} />
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                const h = parseFloat(bmiInput.height.toString()) / 100;
                                const w = parseFloat(bmiInput.weight.toString());
                                if (h > 0 && w > 0) {
                                  const bmi = w / (h * h);
                                  handleLog('bmi-calc', { value: bmi.toFixed(1), weight: w, height: h * 100 });
                                }
                              }}
                              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                              Calculate & Save BMI
                            </button>
                          </div>
                        ) : activeModal === 'health-finance' ? (
                          <div className="space-y-6 text-left">
                            <PalBuddy message="Record your medical expenses for better health financial management." />
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-left">Description / Expense Name</label>
                                  <div className="relative">
                                    <input 
                                      type="text" 
                                      placeholder="Example: Doctor Consultation, Flu Medicine..."
                                      value={financeInput.name}
                                      onChange={e => setFinanceInput(prev => ({ ...prev, name: e.target.value }))}
                                      className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm pr-10"
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                       <VoiceInputButton onResult={(text) => setFinanceInput(prev => ({ ...prev, name: text }))} className="p-1 h-8 w-8" />
                                    </div>
                                  </div>
                                  <HistorySuggestions category="finance_names" onSelect={(val) => setFinanceInput(prev => ({ ...prev, name: val }))} />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block text-left">Amount (USD)</label>
                                  <input 
                                    type="number" 
                                    placeholder="50"
                                    value={financeInput.price}
                                    onChange={e => setFinanceInput(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                  />
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                handleLog('health-finance', financeInput);
                                setFinanceInput({ name: '', price: '' });
                                setActiveModal(null);
                              }}
                              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95 mt-4"
                            >
                              Save Expense
                            </button>
                          </div>
                         ) : activeModal === 'mental-health' ? (
                           <div className="space-y-6 text-left">
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Today's Mood</label>
                               <div className="grid grid-cols-5 gap-2">
                                 {[
                                   { id: 'happy', emoji: '🤩' },
                                   { id: 'good', emoji: '😊' },
                                   { id: 'neutral', emoji: '😐' },
                                   { id: 'sad', emoji: '😔' },
                                   { id: 'angry', emoji: '😫' }
                                 ].map(m => (
                                   <button
                                     key={m.id}
                                     onClick={() => setMentalInput(prev => ({ ...prev, mood: m.id }))}
                                     className={cn(
                                       "p-3 rounded-2xl border transition-all text-2xl flex items-center justify-center",
                                       mentalInput.mood === m.id ? "bg-purple-50 border-purple-500 grayscale-0" : "bg-white border-slate-100 grayscale"
                                     )}
                                   >
                                     {m.emoji}
                                   </button>
                                 ))}
                               </div>
                             </div>
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Stress Level: {mentalInput.stressLevel}/5</label>
                               <input 
                                 type="range" min="1" max="5" step="1"
                                 value={mentalInput.stressLevel}
                                 onChange={e => setMentalInput(prev => ({ ...prev, stressLevel: parseInt(e.target.value) }))}
                                 className="w-full accent-purple-500"
                               />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Feelings Note (Optional)</label>
                               <textarea 
                                 placeholder="What is on your mind?"
                                 value={mentalInput.note}
                                 onChange={e => setMentalInput(prev => ({ ...prev, note: e.target.value }))}
                                 className="w-full bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm h-24"
                               />
                             </div>
                             <button 
                               onClick={() => {
                                 handleLog('mental-health', mentalInput);
                                 setMentalInput({ mood: 'neutral', stressLevel: 1, note: '' });
                               }}
                               disabled={isAnalyzingMental}
                               className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl shadow-xl shadow-purple-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                             >
                               {isAnalyzingMental ? (
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <>
                                   <Smile className="w-5 h-5" />
                                   Save Mood & Well-being
                                 </>
                               )}
                             </button>
                             {healthData.mentalHealth?.[healthData.mentalHealth.length - 1]?.analysis && (
                               <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-xs text-purple-800 italic leading-relaxed">
                                 <Zap className="w-3 h-3 inline mr-1 text-purple-500" />
                                 {healthData.mentalHealth[healthData.mentalHealth.length - 1].analysis}
                               </div>
                             )}
                           </div>
                         ) : activeModal === 'sleep-tracker' ? (
                           <div className="space-y-6 text-left">
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Sleep Duration: {sleepInput.duration} Hours</label>
                               <input 
                                 type="range" min="1" max="15" step="0.5"
                                 value={sleepInput.duration}
                                 onChange={e => setSleepInput(prev => ({ ...prev, duration: parseFloat(e.target.value) }))}
                                 className="w-full accent-blue-500"
                               />
                             </div>
                             <div className="space-y-4">
                               <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Sleep Quality</label>
                               <div className="grid grid-cols-2 gap-3">
                                 {[
                                   { id: 'poor', label: 'Poor', icon: '😴' },
                                   { id: 'fair', label: 'Fair', icon: '🥱' },
                                   { id: 'good', label: 'Good', icon: '😇' },
                                   { id: 'excellent', label: 'Excellent', icon: '🛌' }
                                 ].map(q => (
                                   <button
                                     key={q.id}
                                     onClick={() => setSleepInput(prev => ({ ...prev, quality: q.id as any }))}
                                     className={cn(
                                       "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                                       sleepInput.quality === q.id ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-slate-100 text-slate-400"
                                     )}
                                   >
                                     <span className="text-xl">{q.icon}</span>
                                     <span className="text-[10px] font-bold uppercase tracking-widest">{q.label}</span>
                                   </button>
                                 ))}
                               </div>
                             </div>
                             <button 
                               onClick={() => {
                                 handleLog('sleep-tracker', sleepInput);
                                 setSleepInput({ duration: 8, quality: 'good' as any });
                               }}
                               disabled={isAnalyzingSleep}
                               className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                             >
                               {isAnalyzingSleep ? (
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <>
                                   <Moon className="w-5 h-5" />
                                   Save Sleep Log
                                 </>
                               )}
                             </button>
                             {healthData.sleepLogs?.[healthData.sleepLogs.length - 1]?.analysis && (
                               <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs text-indigo-800 italic leading-relaxed">
                                 <Zap className="w-3 h-3 inline mr-1 text-indigo-500" />
                                 {healthData.sleepLogs[healthData.sleepLogs.length - 1].analysis}
                               </div>
                             )}
                           </div>
                         ) : activeModal === 'about-app' ? (
                           <div className="space-y-6 text-left">
                             <div className="flex flex-col items-center justify-center py-6">
                               <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 mb-4">
                                 <Heart className="w-10 h-10 fill-current" />
                               </div>
                               <h4 className="text-xl font-black text-slate-800 dark:text-white">Healthpal PWA</h4>
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Version 2.0.0 Stable</p>
                             </div>

                             <div className="space-y-4">
                               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                 <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2">About Application</h5>
                                 <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                   Healthpal is an AI-powered personal health assistant designed to help you track vital metrics, physical activities, and daily medical adherence.
                                 </p>
                               </div>

                               <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                                 <h5 className="text-[10px] font-black uppercase text-emerald-600 mb-2">Core Pillars</h5>
                                 <ul className="space-y-2">
                                   {[
                                     { icon: <Zap className="w-3 h-3" />, text: 'Generative AI Health Engine' },
                                     { icon: <ShieldCheck className="w-3 h-3" />, text: '100% Local Data Privacy' },
                                     { icon: <Activity className="w-3 h-3" />, text: 'Integrated Clinical Modules' }
                                   ].map((item, i) => (
                                     <li key={i} className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                                       {item.icon}
                                       {item.text}
                                     </li>
                                   ))}
                                 </ul>
                               </div>

                               <div className="p-4 bg-slate-900 rounded-2xl text-white">
                                  <div className="flex items-center justify-between mb-2">
                                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copyright</span>
                                     <span className="text-[10px] font-bold">© 2026 suki to sukses</span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 leading-tight">Created with dedication to improve quality of life through smart and inclusive health monitoring technology.</p>
                               </div>
                             </div>

                             <button 
                               onClick={() => setActiveModal(null)}
                               className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 mt-4"
                             >
                               Close Info
                             </button>
                           </div>
                         ) : activeModal === 'vitals-tracker' ? (
                           <div className="space-y-6 text-left">
                             <PalBuddy message="Record your vital parameters for more accurate health monitoring." />
                             <div className="space-y-4">
                               <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {[
                                   { id: 'blood-pressure', label: 'Blood Pressure', icon: '🩺', unit: 'mmHg' },
                                   { id: 'glucose', label: 'Blood Sugar', icon: '🩸', unit: 'mg/dL' },
                                   { id: 'heart-rate', label: 'Heart Rate', icon: '💓', unit: 'bpm' },
                                   { id: 'oxygen', label: 'Oxygen', icon: '💨', unit: '%' },
                                   { id: 'temperature', label: 'Temperature', icon: '🌡️', unit: '°C' }
                                 ].map(type => (
                                   <button
                                     key={type.id}
                                     onClick={() => setVitalInput(prev => ({ ...prev, type: type.id as any, unit: type.unit }))}
                                     className={cn(
                                       "p-3 rounded-2xl border transition-all flex flex-col items-center gap-1",
                                       vitalInput.type === type.id ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-100 text-slate-400"
                                     )}
                                   >
                                     <span className="text-xl">{type.icon}</span>
                                     <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                                   </button>
                                 ))}
                               </div>

                               <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Value ({vitalInput.unit})</label>
                                 {vitalInput.type === 'blood-pressure' ? (
                                   <div className="flex items-center gap-2">
                                      <input 
                                        type="number" placeholder="Sys (120)"
                                        value={vitalInput.value}
                                        onChange={e => setVitalInput(prev => ({ ...prev, value: e.target.value }))}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm w-full"
                                      />
                                      <span className="text-slate-300 font-bold">/</span>
                                      <input 
                                        type="number" placeholder="Dia (80)"
                                        value={vitalInput.value2}
                                        onChange={e => setVitalInput(prev => ({ ...prev, value2: e.target.value }))}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm w-full"
                                      />
                                   </div>
                                 ) : (
                                   <input 
                                     type="number"
                                     placeholder={`Input ${vitalInput.type}...`}
                                     value={vitalInput.value}
                                     onChange={e => setVitalInput(prev => ({ ...prev, value: e.target.value }))}
                                     className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                                   />
                                 )}
                               </div>
                             </div>

                             <button 
                               onClick={() => {
                                 const finalValue = vitalInput.type === 'blood-pressure' 
                                   ? `${vitalInput.value}/${vitalInput.value2}` 
                                   : vitalInput.value;
                                 handleLog('vitals-tracker', { type: vitalInput.type, value: finalValue, unit: vitalInput.unit });
                                 setVitalInput({ type: 'blood-pressure', value: '', value2: '', unit: 'mmHg' });
                                 setActiveModal(null);
                               }}
                               disabled={!vitalInput.value || (vitalInput.type === 'blood-pressure' && !vitalInput.value2)}
                               className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95"
                             >
                               Save & Update Chart
                             </button>
                           </div>
                         ) : activeModal === 'symptom-logger' ? (
                          <div className="space-y-6 text-left">
                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Severity Level / Mood</label>
                              <div className="flex gap-2">
                                {[
                                  { val: 1, label: 'Healthy', emoji: '😊' },
                                  { val: 2, label: 'Mild', emoji: '🙂' },
                                  { val: 3, label: 'Moderate', emoji: '😐' },
                                  { val: 4, label: 'Bad', emoji: '😷' },
                                  { val: 5, label: 'Sick', emoji: '🤒' }
                                ].map((item) => (
                                  <button
                                    key={item.val}
                                    onClick={() => setSymptomInput(prev => ({ ...prev, severity: item.val }))}
                                    className={cn(
                                      "flex-1 p-3 rounded-2xl border transition-all flex flex-col items-center gap-1",
                                      symptomInput.severity === item.val
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
                                    )}
                                  >
                                    <span className="text-xl">{item.emoji}</span>
                                    <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">What are your complaints?</label>
                              <div className="relative">
                                <textarea 
                                  placeholder="Describe your symptoms or feelings in detail..."
                                  value={symptomInput.description}
                                  onChange={e => setSymptomInput(prev => ({ ...prev, description: e.target.value }))}
                                  className="w-full h-32 bg-slate-50 p-4 rounded-2xl ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none pr-12"
                                />
                                <div className="absolute right-2 bottom-2">
                                  <VoiceInputButton 
                                    onResult={(text) => setSymptomInput(prev => ({ ...prev, description: prev.description ? prev.description + ' ' + text : text }))} 
                                    className="p-2 h-10 w-10 shadow-lg"
                                  />
                                </div>
                              </div>
                              <HistorySuggestions 
                                category="symptom_descriptions" 
                                onSelect={(val) => setSymptomInput(prev => ({ ...prev, description: val }))} 
                              />
                            </div>

                            <button 
                              onClick={() => handleLog('symptom-logger', symptomInput)}
                              disabled={!symptomInput.description || isAnalyzingSymptoms}
                              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              {isAnalyzingSymptoms ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Zap className="w-5 h-5" />
                                  Save & Analyze Symptoms
                                </>
                              )}
                            </button>

                            {symptomAiFeedback && (
                             <motion.div 
                               initial={{ opacity: 0, y: 20 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="mt-6 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-3"
                             >
                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                    <Zap className="w-4 h-4" /> PalBuddy Analysis & Solutions
                                </div>
                                <div className="relative group/feedback pr-10">
                                   <div className="text-[13px] text-emerald-900 leading-relaxed space-y-3 whitespace-pre-line text-left">
                                      {(() => {
                                        let cleanText = symptomAiFeedback || '';
                                        if (cleanText.includes("* *")) {
                                          cleanText = cleanText.split("* *")[0];
                                        }
                                        cleanText = cleanText.trim().replace(/[\s\*]+$/, '');
                                        return cleanText;
                                      })()}
                                   </div>
                                   <button 
                                     onClick={() => speakText(symptomAiFeedback)}
                                     className="absolute right-0 top-0 p-2 text-emerald-500 hover:scale-110 transition-transform"
                                   >
                                      <Volume2 className="w-5 h-5" />
                                   </button>
                                </div>
                                <button 
                                  onClick={() => { setActiveModal(null); setSymptomAiFeedback(null); setModalInput(''); }}
                                  className="w-full py-3 bg-white text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                >
                                  Close & Continue
                                </button>
                             </motion.div>
                            )}
                          </div>
                        ) : (
                          <>
                            <input 
                              autoFocus
                              placeholder={getPlaceholder(activeModal)}
                              value={modalInput}
                              onChange={e => setModalInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleLog(activeModal, modalInput)}
                              className="w-full p-6 rounded-[2rem] bg-slate-50 border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm mb-6"
                            />
                            <div className="flex gap-3">
                               <button 
                                 onClick={() => setActiveModal(null)}
                                 className="flex-1 py-4 bg-slate-50 text-slate-500 font-bold rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all"
                               >
                                 Cancel
                               </button>
                               <button 
                                 onClick={() => handleLog(activeModal, modalInput)}
                                 className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 transition-all active:scale-95"
                               >
                                 Save & Analyze
                               </button>
                            </div>
                          </>
                        ) }
                    </div>
                  </>
               )
             }
           </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

       <input 
         type="file" 
         id="vault-file-input" 
         className="hidden" 
         onChange={handleFileChange}
         accept="image/*,application/pdf"
       />

    </motion.div>
  );
};

// Helper Functions
const getPlaceholder = (id: string) => {
  switch (id) {
    case 'bmi-calc': return "Enter weight (kg)...";
    case 'activity-tracker': return "Food & water intake details...";
    case 'symptom-logger': return "What are you feeling? (Headache, cough, etc)...";
    case 'medication-tracker': return "Name of the medication recently taken...";
    case 'health-finance': return "Expense amount (USD)...";
    default: return "Additional notes...";
  }
};

const WidgetCard = ({ title, desc, icon, onClick, referenceUrl }: any) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="glass-card dark:glass-dark p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700" />
    
    <div className="flex items-start justify-between mb-6 relative z-10">
      <div className="p-4 bg-emerald-50 dark:bg-slate-800 text-emerald-500 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
        {icon}
      </div>
      {referenceUrl && (
        <a 
          href={referenceUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-white transition-all border border-transparent hover:border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
    <div className="relative z-10 flex-1">
      <h4 className="text-lg font-black text-slate-800 dark:text-white tracking-tight mb-2 group-hover:text-emerald-600 transition-colors">{title}</h4>
      <p className="text-xs text-slate-400 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
    <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
      Buka Modul <ChevronRight className="w-3 h-3" />
    </div>
  </motion.div>
);

const CommunityStat = ({ label, value, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider">
      <span>{label}</span>
      <span className="text-slate-900 dark:text-white">{value}</span>
    </div>
    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-[2px]">
      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: value }}
        className={cn("h-full rounded-full shadow-sm", color)} 
      />
    </div>
  </div>
);

const getIcon = (id: string) => {
  switch (id) {
    case 'medication-tracker': return <Calendar className="w-5 h-5" />;
    case 'health-finance': return <Wallet className="w-5 h-5" />;
    case 'symptom-logger': return <Clock className="w-5 h-5" />;
    case 'bmi-calc': return <Calculator className="w-5 h-5" />;
    case 'activity-tracker': return <Droplets className="w-5 h-5" />;
    case 'step-tracker': return <TrendingUp className="w-5 h-5" />;
    case 'mental-health': return <Smile className="w-5 h-5" />;
    case 'sleep-tracker': return <Moon className="w-5 h-5" />;
    default: return <ChevronRight className="w-5 h-5" />;
  }
};

const formatWidgetTitle = (id: string) => {
  if (id === 'activity-tracker') return "Hydration & Diet Tracking";
  if (id === 'mental-health') return "Mental Health";
  if (id === 'sleep-tracker') return "Sleep Quality";
  if (id === 'step-tracker') return "Daily Step Tracker";
  if (id === 'bmi-calc') return "BMI & Antropometry";
  return id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
};
