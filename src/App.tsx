/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from './hooks/usePersistence';
import { AuthLayout } from './components/AuthLayout';
import { Dashboard } from './pages/Dashboard';
import { Personalization } from './pages/Personalization';
import { Screening } from './pages/Screening';
import { AIChat } from './pages/AIChat';
import { HealthScan } from './pages/HealthScan';
import { ReferenceHub } from './pages/ReferenceHub';
import { ProfileSettings } from './pages/ProfileSettings';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SplashScreen } from './components/SplashScreen';
import { cn } from './lib/utils';

export default function App() {
  const { user, updateUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'personalize' | 'screening' | 'aichat' | 'scan' | 'reference' | 'profile'>('dashboard');
  const [isAppReady, setIsAppReady] = useState(false);

  // Sync theme with document class
  useEffect(() => {
    if (user?.settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.settings?.theme]);

  // Show splash only on first mount
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!user) {
    return <AuthLayout />;
  }

  const renderContent = () => {
    // Priority 1: User is not screened yet
    if (!user.screeningResult) {
      return (
        <Screening 
          onComplete={() => {
            // After screening, we implicitly move towards personalization
            // The user state update will trigger re-render
          }} 
        />
      );
    }
    
    // Priority 2: User is screened but hasn't picked diseases
    if (user.selectedDiseases.length === 0) {
       return (
         <Personalization 
            onComplete={() => {
              // After personalization, we are ready for dashboard
              setCurrentPage('dashboard');
            }} 
            onBack={() => {
              // Allow going back to screening if they want to change answers
              // We'll need to clear screening result if they want to RE-DO it, 
              // but for now just show the page
              setCurrentPage('screening');
            }}
         />
       );
    }

    // Standard routing
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'screening': return <Screening onComplete={() => setCurrentPage('personalize')} />;
      case 'personalize': return <Personalization 
        onComplete={() => setCurrentPage('dashboard')} 
        onBack={() => setCurrentPage('dashboard')} 
      />;
      case 'aichat': return <AIChat onBack={() => setCurrentPage('dashboard')} />;
      case 'scan': return <HealthScan onBack={() => setCurrentPage('dashboard')} />;
      case 'reference': return <ReferenceHub onBack={() => setCurrentPage('dashboard')} />;
      case 'profile': return <ProfileSettings onBack={() => setCurrentPage('dashboard')} />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-emerald-100 transition-colors duration-300",
      user.settings?.theme === 'dark' ? "dark bg-[#020617] text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            type: "spring",
            stiffness: 100,
            damping: 20
          }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
      
      {/* Footer Disclaimer */}
      <footer className="max-w-7xl mx-auto p-6 mt-12 border-t border-slate-200 dark:border-slate-800/60 transition-colors">
        <div className="flex flex-col items-center gap-4 text-left">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center max-w-2xl leading-relaxed">
            <span className="font-bold text-rose-500 uppercase">Disclaimer:</span> This application is a personal tracking tool and not a substitute for professional medical advice. AI analysis results are informational. If you have severe conditions, please contact a doctor immediately.
          </p>
          <div className="flex flex-col items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
            <div className="flex items-center gap-2">
              <span>© 2026 Healthpal</span>
              <span className="w-1 h-1 bg-emerald-300 dark:bg-emerald-800 rounded-full" />
              <span>Development by suki to sukses</span>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-center font-normal opacity-80">
              Inashaura Azkazola R., Najwa Zikrika F.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

