import { useState } from 'react';
import { useAuth } from '../hooks/usePersistence';
import { PalBuddy } from '../components/PalBuddy';
import { motion } from 'motion/react';
import { ArrowLeft, LogOut } from 'lucide-react';

const QUESTIONS = [
  { 
    id: 'family_history', 
    text: 'Is there a family history of serious illnesses (Cancer, Diabetes, Heart Disease)?'
  },
  { 
    id: 'lifestyle', 
    text: 'Do you smoke or consume alcohol frequently?'
  },
  { 
    id: 'mental_health', 
    text: 'Have you frequently felt stressed, anxious, or sleep-deprived in the past month?'
  },
  { 
    id: 'physical_activity', 
    text: 'Do you exercise less than 150 minutes per week?'
  }
];

export const Screening = ({ onComplete }: { onComplete: () => void }) => {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);
  const { user, updateUser, logout } = useAuth();

  if (!user) return null;

  const handleAnswer = async (val: boolean) => {
    const newAnswers = { ...answers, [QUESTIONS[step].id]: val };
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      try {
        await updateUser({ ...user, screeningResult: newAnswers });
        onComplete();
      } catch (e) {
        alert("Failed to save screening results.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-6 transition-colors">
      <div className="max-w-xl w-full">
        <PalBuddy message="Hello! I am PalBuddy. Let's do a quick health screening." />
        
        <div className="mt-8 bg-emerald-50/50 dark:bg-slate-900 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-950/30 shadow-sm relative pt-12">
          {step > 0 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="absolute left-6 top-6 p-2 hover:bg-emerald-100 dark:hover:bg-slate-800 rounded-full transition-all text-emerald-600"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={logout}
              className="absolute left-6 top-6 p-2 hover:bg-rose-100 dark:hover:bg-rose-950/20 rounded-full transition-all text-rose-400 group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}
          
          <div className="flex justify-between items-center mb-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Clinical Screening</span>
              <span className="text-[9px] text-emerald-400 dark:text-emerald-500/60 font-bold uppercase tracking-widest mt-0.5">Health Risk Analysis</span>
            </div>
            <div className="px-3 py-1 bg-emerald-100/50 dark:bg-emerald-950/50 rounded-full text-[10px] font-black text-emerald-700 dark:text-emerald-400">
               {step + 1} / {QUESTIONS.length}
            </div>
          </div>
 
          <motion.div 
            key={step}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-gray-800 dark:text-white leading-[1.2] italic">
              {QUESTIONS[step].text}
            </h2>
          </motion.div>
 
          <div className="grid grid-cols-2 gap-5">
            <button 
              onClick={() => handleAnswer(true)}
              className="py-6 bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] hover:bg-emerald-700 transition-all transform active:scale-95 shadow-xl shadow-emerald-100 dark:shadow-none"
            >
              Yes, Correct
            </button>
            <button 
              onClick={() => handleAnswer(false)}
              className="py-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[11px] rounded-[1.5rem] hover:border-slate-200 dark:hover:border-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-all transform active:scale-95 shadow-sm"
            >
              No
            </button>
          </div>
        </div>
 
        <p className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-widest font-black opacity-40 leading-relaxed">
          Healthcare Security Protocol Active • Device-Based Encryption
        </p>
      </div>
    </div>
  );
};
