import { motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, BarChart2, MapPin, Plus, X, BookOpen, MessageSquare, FolderOpen, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export type TabType = 'home' | 'missions' | 'documents' | 'charts' | 'locations';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onPlusAction: (action: 'reference' | 'feedback' | 'documents' | 'about') => void;
  language?: 'id' | 'en';
}

export const BottomNav = ({ activeTab, onTabChange, onPlusAction }: BottomNavProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'missions', label: 'Missions', icon: Trophy },
    { id: 'charts', label: 'Charts', icon: BarChart2 },
    { id: 'locations', label: 'Location', icon: MapPin },
  ];

  const plusItems = [
    { id: 'reference', label: 'References', icon: BookOpen, color: 'text-blue-500' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-amber-500' },
    { id: 'documents', label: 'Documents', icon: FolderOpen, color: 'text-emerald-500' },
    { id: 'about', label: 'About App', icon: Info, color: 'text-purple-500' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
      {/* Plus Menu Popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-2 mb-2"
          >
            {plusItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onPlusAction(item.id as any);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all group"
              >
                <div className={cn("p-2 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform", item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Nav Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[2.5rem] p-2 flex items-center justify-between">
        {tabs.slice(0, 2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id as TabType);
              setIsMenuOpen(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 rounded-3xl transition-all",
              activeTab === tab.id ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-current/10")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="nav-pill" className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5" />
            )}
          </button>
        ))}

        {/* Plus Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 -mt-8 border-4 border-slate-50 dark:border-[#020617]",
            isMenuOpen && "rotate-45 bg-rose-500 shadow-rose-500/30"
          )}
        >
          <Plus className="w-8 h-8" />
        </button>

        {tabs.slice(2).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              onTabChange(tab.id as TabType);
              setIsMenuOpen(false);
            }}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 rounded-3xl transition-all",
              activeTab === tab.id ? "text-emerald-600" : "text-slate-400"
            )}
          >
            <tab.icon className={cn("w-6 h-6", activeTab === tab.id && "fill-current/10")} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="nav-pill" className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
