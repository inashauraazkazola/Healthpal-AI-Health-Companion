import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/usePersistence';
import { DISEASE_REGISTRY, CATEGORIES } from '../lib/registry';
import { PalBuddy } from '../components/PalBuddy';
import { Search, Check, ArrowLeft, LogOut, Info, Activity, Filter, ShieldCheck, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Personalization = ({ onComplete, onBack }: { onComplete: () => void, onBack?: () => void }) => {
  const { user, updateUser, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<string[]>(user?.selectedDiseases || []);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSummary, setShowSummary] = useState(false);

  if (!user) return null;

  const filtered = useMemo(() => {
    return DISEASE_REGISTRY.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    try {
      await updateUser({ ...user, selectedDiseases: selected });
      onComplete();
    } catch (e) {
      alert("Failed to save personalization.");
    }
  };

  const selectedObjects = DISEASE_REGISTRY.filter(d => selected.includes(d.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative pb-32 transition-colors">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {onBack ? (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-500 font-bold transition-all"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
          ) : (
            <button 
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 font-bold transition-all"
            >
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          )}
          
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold ring-1 ring-emerald-100 dark:ring-emerald-900">
            <ShieldCheck className="w-4 h-4" /> Your Data is Encrypted & Private
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
           {/* Left Column: Instructions & Info */}
          <div className="lg:col-span-4 space-y-8 text-left">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-500/10 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative z-10">
                <PalBuddy message="Hello! Personalization helps PalBuddy provide specific recommendations tailored to your conditions." />
                <div className="mt-8 space-y-6">
                  <div>
                    <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight mb-3 italic leading-tight">Wellness Configuration</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Set up your health profile to trigger the correct AI Healthpal algorithms for your body's needs.</p>
                  </div>

                  <div className="space-y-5 pt-4">
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all shadow-sm">01</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Search for a medical condition or select <span className="text-emerald-600 dark:text-emerald-400 font-bold">'General Lifestyle'</span> for basic monitoring.</p>
                    </div>
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all shadow-sm">02</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Activate <span className="text-emerald-600 dark:text-emerald-400 font-bold">Module Intelligence</span> for each selected condition.</p>
                    </div>
                    <div className="flex gap-4 group/item">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-black text-xs group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all shadow-sm">03</div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Get <span className="text-emerald-600 dark:text-emerald-400 font-bold">Precision Insights</span> customized by Gemma AI.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Secure Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-slate-200">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-400" /> Why is this Important?
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Each medical condition has a unique management protocol. By knowing your profile, our AI can detect warning signs early and offer precise medication scheduling.
              </p>
            </div>
          </div>

           {/* Right Column: Search & Selection */}
          <div className="lg:col-span-8 space-y-6 text-left">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
              {/* Header / Search */}
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 space-y-6">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search 200+ medical conditions (TBC, Cancer, HIV, Diabetes)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-lg font-medium dark:text-white"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                        activeCategory === cat.id 
                          ? "bg-slate-900 dark:bg-emerald-600 border-slate-900 dark:border-emerald-600 text-white shadow-lg" 
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300 dark:hover:border-emerald-700"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Content */}
              <div className="p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <AnimatePresence mode="popLayout">
                    {filtered.map(disease => (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={disease.id}
                        onClick={() => toggle(disease.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                          selected.includes(disease.id) 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 shadow-md shadow-emerald-100/30 dark:shadow-none" 
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                            selected.includes(disease.id) ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950/40 group-hover:text-emerald-500"
                          )}>
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold block dark:text-white">{disease.name}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-400 font-black">{disease.category}</span>
                          </div>
                        </div>
                        {selected.includes(disease.id) && <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 font-bold">Condition not found. Try another keyword.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Summary Bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-6 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] z-50 transition-colors"
          >
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex flex-col items-center sm:items-start gap-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full block" />
                    <span className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{selected.length} Conditions Selected</span>
                </div>
                <div className="flex gap-1 overflow-x-auto max-w-[300px] sm:max-w-md no-scrollbar mt-1">
                  {selectedObjects.map(s => (
                    <span key={s.id} className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 whitespace-nowrap border border-slate-200/50 dark:border-slate-700">{s.name}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto">
                <button 
                  onClick={() => setShowSummary(!showSummary)}
                  className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  Active Modules <Info className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 sm:flex-none bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-emerald-200/50 flex items-center justify-center gap-3 transition-all active:scale-95 group"
                >
                  Setup Wellness Dashboard <Check className="w-4 h-4 group-hover:scale-125 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Modal (Desktop Only) */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSummary(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Heart className="w-6 h-6 text-emerald-500" /> Module Summary
                </h3>
                <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <Check className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedObjects.map(disease => (
                    <div key={disease.id} className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-lg text-emerald-700 dark:text-emerald-400">{disease.name}</h4>
                        <span className="text-[10px] bg-white dark:bg-slate-900 dark:text-white px-3 py-1 rounded-full font-bold shadow-sm">{disease.category}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 italic opacity-80">"{disease.details?.definition}"</p>
                      <div className="pt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block mb-2">Active Modules:</span>
                        <div className="flex flex-wrap gap-2">
                          {disease.widgets.map(w => (
                            <span key={w} className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-lg font-bold">{w}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800 flex items-center gap-4 text-xs italic text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                <Info className="w-4 h-4 shrink-0" /> These modules will dynamically appear on your main dashboard after clicking save.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
