import { useState } from 'react';
import { useAuth } from '../hooks/usePersistence';
import { PalBuddy } from './PalBuddy';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const AuthLayout = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const identifier = isLogin ? (username || email) : email;
    if (!identifier || !password) {
      return setError('Please complete all fields');
    }

    if (!isLogin) {
      if (!username) return setError('Username is required');
      if (!email.includes('@')) return setError('Invalid email format');
    }

    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const success = await login(identifier, password);
        setLoading(false);
        if (!success) {
          setError('Incorrect Username/Email or Password');
        }
      } else {
        await signup({ username, email, password });
        setIsLogin(true);
        setPassword('');
        setError('Account successfully created! Please enter your password to sign in.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const successMessage = error === 'Account successfully created! Please enter your password to sign in.';

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden transition-all duration-700">
      {/* Background Animated Blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 50, 0],
          y: [0, -50, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-emerald-500 rounded-full blur-[120px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.15, 0.1],
          x: [0, -60, 0],
          y: [0, 40, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[600px] h-[600px] bg-teal-500 rounded-full blur-[120px]" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md"
      >
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="relative group mb-6">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative transform hover:scale-110 transition-transform duration-500">
              <PalBuddy message={isLogin ? "Welcome back to Healthpal!" : "Let's create your Healthpal account!"} />
            </div>
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none"
          >
            Health<span className="italic font-serif opacity-90 text-emerald-600">pal</span>
          </motion.h1>
          <div className="h-1 w-12 bg-emerald-500 rounded-full my-4" />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em]">Personal Wellness Ecosystem</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onSubmit={handleSubmit} 
            className="glass-card dark:glass-dark p-10 sm:p-12 rounded-[3.5rem] shadow-2xl border border-white/20 dark:border-white/5 space-y-8"
          >
          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold"
                placeholder="pick a name"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{isLogin ? 'Username or Email' : 'Email Address'}</label>
            <input 
              type={isLogin ? 'text' : 'email'}
              value={isLogin ? (username || email) : email}
              onChange={e => isLogin ? setUsername(e.target.value) : setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold"
              placeholder={isLogin ? "enter username" : "your@email.com"}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-none bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 font-bold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={cn(
                "text-xs font-bold text-center",
                successMessage ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] py-5 rounded-[1.5rem] shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            ) : (
              isLogin ? 'Authorize Access' : 'Create Account'
            )}
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 font-medium">
            {isLogin ? "New to the platform? " : "Already have an account? "}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-tight hover:underline ml-1"
            >
              {isLogin ? 'Get Started' : 'Sign In'}
            </button>
          </p>
        </motion.form>
      </AnimatePresence>

        <div className="mt-12 text-center text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed font-medium">
          <p>© 2026 Healthpal</p>
          <p>Development by suki to sukses</p>
          <p className="mt-1 opacity-80">
            Inashaura Azkazola R., Najwa Zikrika F.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
