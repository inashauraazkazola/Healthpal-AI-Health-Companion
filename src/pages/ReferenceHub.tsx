import { useState } from 'react';
import { ArrowLeft, Book, FlaskConical, Search, ChevronRight, Bookmark, Volume2 } from 'lucide-react';
import { PHARMACOLOGY_DATA, CLINICAL_JOURNALS } from '../lib/registry';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { speakText } from '../components/VoiceTools';
import { useAuth } from '../hooks/usePersistence';

export const ReferenceHub = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'pharma' | 'journals'>('pharma');
  const [search, setSearch] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { user } = useAuth();
  const lang = 'en-US';

  const filteredPharma = PHARMACOLOGY_DATA.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.indication.toLowerCase().includes(search.toLowerCase())
  );

  const filteredJournals = CLINICAL_JOURNALS.filter(j => 
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12 transition-colors">
      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white leading-none">Medical Reference Hub</h2>
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Medical Reference Hub</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
           <button 
             onClick={() => setActiveTab('pharma')}
             className={cn(
               "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
               activeTab === 'pharma' 
                 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none" 
                 : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
             )}
           >
             <FlaskConical className="w-4 h-4" /> Pharmacology
           </button>
           <button 
             onClick={() => setActiveTab('journals')}
             className={cn(
               "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
               activeTab === 'journals' 
                 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100 dark:shadow-none" 
                 : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
             )}
           >
             <Book className="w-4 h-4" /> Clinical Journals
           </button>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={activeTab === 'pharma' ? "Search drug name or indication..." : "Search journal title..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
             {activeTab === 'pharma' ? (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-6"
               >
                 {filteredPharma.map(drug => (
                   <div key={drug.id} className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <h3 className="text-lg font-bold text-slate-800 dark:text-white">{drug.name}</h3>
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{drug.source || 'Medical Database'}</span>
                       </div>
                       <Bookmark className="w-4 h-4 text-emerald-200" />
                     </div>
                     <div className="space-y-3">
                        <section>
                          <label className="text-[10px] font-black text-emerald-500 uppercase">Indication</label>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{drug.indication}</p>
                        </section>
                        <section>
                          <label className="text-[10px] font-black text-rose-500 uppercase">Standard Dosage</label>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{drug.dosage}</p>
                        </section>
                        
                        <div className="grid grid-cols-1 gap-2 pt-2">
                           <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase mb-1">Pharmacokinetics & Dynamics</p>
                              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">{drug.pharmacokinetics} {drug.pharmacodynamics}</p>
                           </div>
                           <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30">
                              <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase mb-1">Side Effects & Interactions</p>
                              <p className="text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
                                <strong>Effects:</strong> {drug.sideEffects || 'Data not available'}<br/>
                                <strong>Interactions:</strong> {drug.interactions || 'Consult with a pharmacist'}
                              </p>
                           </div>
                        </div>
                     </div>
                   </div>
                 ))}
               </motion.div>
             ) : (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="space-y-4"
               >
                 {filteredJournals.map((journal, i) => (
                   <div key={i} className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-md p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-start gap-6 group">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                         <Book className="w-8 h-8" />
                      </div>
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-blue-500 uppercase">{journal.author}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{journal.source || 'Verified Source'}</span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded-md">{journal.date}</span>
                         </div>
                         <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">{journal.title}</h3>
                         <div className="bg-slate-50 p-3 rounded-xl">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Study Summary</p>
                            <p className="text-xs text-slate-600 leading-relaxed italic">"{journal.summary}"</p>
                         </div>
                         {journal.keyFindings && (
                           <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full">
                              <FlaskConical className="w-3 h-3" />
                              <span className="text-[10px] font-bold">Key Findings: {journal.keyFindings}</span>
                           </div>
                         )}
                         <a 
                           href={journal.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase hover:underline mt-2 pt-2 border-t border-slate-100"
                         >
                           Open Journal Source <ChevronRight className="w-3 h-3" />
                         </a>
                      </div>
                   </div>
                 ))}
               </motion.div>
             )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
