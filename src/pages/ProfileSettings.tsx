import React, { useState } from 'react';
import { useAuth } from '../hooks/usePersistence';
import { User } from '../types';
import { 
  ArrowLeft, Save, User as UserIcon, Bell, Shield, 
  History, Info, ChevronRight, CheckCircle2, AlertCircle,
  Stethoscope, Droplets, Pill, Target, Activity,
  Settings as SettingsIcon, Key, Mail, Lock, LogOut, Loader2, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const ProfileSettings = ({ onBack }: { onBack: () => void }) => {
  const { user, updateUser, logout, sendVerificationCode } = useAuth();
  const [activeTab, setActiveTab] = useState<'physical' | 'notifications' | 'privacy' | 'medical' | 'account' | 'preferences'>('physical');
  const [formData, setFormData] = useState<User>(() => ({
    ...user,
    biometrics: user.biometrics || {},
    activityLevel: user.activityLevel || 'moderate',
    healthGoal: user.healthGoal || 'general',
    reminders: user.reminders || { medication: false, hydration: false, dailyTarget: false },
    privacy: user.privacy || { shareWithDoctor: false, shareWithFamily: false },
    medicalHistory: user.medicalHistory || { allergies: '', chronicConditions: '' },
    settings: user.settings || { language: 'en', theme: 'light', voiceEnabled: false },
  }));
  
  const [accountInputs, setAccountInputs] = useState({
    username: user.username,
    email: user.email,
    password: '',
    confirmPassword: ''
  });

  const [verification, setVerification] = useState<{
    isOpen: boolean;
    step: 'request' | 'verify';
    targetField: 'username' | 'email' | 'password' | null;
    generatedCode: string | null;
    inputCode: string;
    isSending: boolean;
    error: string | null;
  }>({
    isOpen: false,
    step: 'request',
    targetField: null,
    generatedCode: null,
    inputCode: '',
    isSending: false,
    error: null
  });

  const [showSaved, setShowSaved] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    try {
      await updateUser(formData);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (e) {
      alert("Failed to save profile.");
    }
  };

  const updateNested = (category: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...((prev[category as keyof User] || {}) as any),
        [key]: value
      }
    }));
  };

  const tabs = [
    { id: 'physical', label: 'Physical Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'medical', label: 'Medical History', icon: <History className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'account', label: 'Account & Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications & Voice', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield className="w-4 h-4" /> },
  ];

  const handleRequestVerification = async (field: 'username' | 'email' | 'password') => {
    if (field === 'password' && accountInputs.password !== accountInputs.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    setVerification(prev => ({ ...prev, isOpen: true, isSending: true, targetField: field, error: null }));
    try {
      const code = await sendVerificationCode(user.email);
      setVerification(prev => ({ ...prev, generatedCode: code, step: 'verify', isSending: false }));
    } catch (e) {
      setVerification(prev => ({ ...prev, isSending: false, error: 'Failed to send verification code.' }));
    }
  };

  const handleVerifyAndSave = async () => {
    if (verification.inputCode !== verification.generatedCode) {
      setVerification(prev => ({ ...prev, error: 'Invalid verification code!' }));
      return;
    }

    const updatedUser: any = { ...formData };
    if (verification.targetField === 'username') updatedUser.username = accountInputs.username;
    if (verification.targetField === 'email') updatedUser.email = accountInputs.email;
    if (verification.targetField === 'password') updatedUser.password = accountInputs.password;

    try {
      await updateUser(updatedUser);
      setFormData(updatedUser);
      setVerification({ isOpen: false, step: 'request', targetField: null, generatedCode: null, inputCode: '', isSending: false, error: null });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (e) {
      setVerification(prev => ({ ...prev, error: 'Failed to update account.' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-32 px-6 transition-all relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] -z-10" />

      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <button 
              onClick={onBack}
              className="group flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-black text-[10px] uppercase tracking-widest transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
            </button>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">Profile <span className="text-emerald-600">Settings</span></h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Customize your digital health experience.</p>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            className="interactive-hover bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Sidebar Tabs */}
          <aside className="lg:w-72 w-full space-y-3 sticky top-24">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 p-5 rounded-[2rem] text-sm font-black uppercase tracking-wider transition-all border",
                  activeTab === tab.id 
                    ? "bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30 border-emerald-500 translate-x-2" 
                    : "bg-white dark:bg-slate-900 shadow-sm text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  activeTab === tab.id ? "bg-white/20" : "bg-slate-50 dark:bg-slate-800"
                )}>
                  {tab.icon}
                </div>
                {tab.label}
              </button>
            ))}

            <div className="pt-6">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-4 p-5 rounded-[2rem] text-sm font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
              >
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                  <LogOut className="w-4 h-4" />
                </div>
                Logout Session
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 glass-card dark:glass-dark rounded-[3rem] p-8 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden transition-all min-h-[600px]">
             <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                <SettingsIcon className="w-64 h-64 rotate-12" />
             </div>
             
             <AnimatePresence mode="wait">
              {activeTab === 'physical' && (
                <Section key="physical" title="Physical & Biometrics Profile">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Field label="Weight (kg)">
                      <input 
                        type="number"
                        value={formData.biometrics.weight || ''}
                        onChange={e => updateNested('biometrics', 'weight', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </Field>
                    <Field label="Height (cm)">
                      <input 
                        type="number"
                        value={formData.biometrics.height || ''}
                        onChange={e => updateNested('biometrics', 'height', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </Field>
                    <Field label="Date of Birth">
                      <input 
                        type="date"
                        value={formData.biometrics.dob || ''}
                        onChange={e => updateNested('biometrics', 'dob', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </Field>
                    <Field label="Gender">
                      <select 
                        value={formData.biometrics.gender || ''}
                        onChange={e => updateNested('biometrics', 'gender', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                  </div>

                  <div className="space-y-6">
                    <Field label="Activity Level">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {['low', 'moderate', 'high'].map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => setFormData(prev => ({ ...prev, activityLevel: lvl as any }))}
                            className={cn(
                              "p-4 rounded-xl border text-sm font-bold capitalize transition-all",
                              formData.activityLevel === lvl 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                            )}
                          >
                            <Activity className="w-4 h-4 mb-2 mx-auto" />
                            {lvl === 'low' ? 'Inactive' : lvl === 'moderate' ? 'Moderately Active' : 'Very Active'}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Health Goal">
                      <div className="grid grid-cols-2 gap-3">
                        {['weight-loss', 'fitness', 'muscle', 'general'].map(goal => (
                          <button
                            key={goal}
                            onClick={() => setFormData(prev => ({ ...prev, healthGoal: goal as any }))}
                            className={cn(
                              "p-4 rounded-xl border text-sm font-bold flex items-center gap-3 transition-all",
                              formData.healthGoal === goal
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                            )}
                          >
                            <Target className="w-4 h-4" />
                            {goal === 'weight-loss' ? 'Weight Loss' : goal === 'fitness' ? 'Fitness' : goal === 'muscle' ? 'Muscle Build' : 'General Wellness'}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </Section>
              )}

               {activeTab === 'medical' && (
                <Section key="medical" title="Medical History & Allergies">
                  <div className="space-y-6">
                    <Field label="Allergies (Medication/Food)">
                      <textarea 
                        rows={3}
                        value={formData.medicalHistory.allergies}
                        onChange={e => updateNested('medicalHistory', 'allergies', e.target.value)}
                        placeholder="Example: Penicillin, Peanuts..."
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </Field>
                    <Field label="Other Chronic Conditions">
                      <textarea 
                        rows={3}
                        value={formData.medicalHistory.chronicConditions}
                        onChange={e => updateNested('medicalHistory', 'chronicConditions', e.target.value)}
                        placeholder="Record any other health conditions you manage..."
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </Field>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900 flex gap-4">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                      <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                        This data helps PalBuddy provide safer advice. Your data is encrypted and saved locally.
                      </p>
                    </div>
                  </div>
                </Section>
              )}

               {activeTab === 'notifications' && (
                <Section key="notifications" title="Notifications & Voice">
                  <div className="space-y-4">
                    <ToggleField 
                      icon={<Volume2 className="text-emerald-500" />}
                      title="AI Voice Feedback"
                      desc="Allow PalBuddy to automatically respond to your messages with voice."
                      enabled={formData.settings.voiceEnabled}
                      onChange={(val: boolean) => updateNested('settings', 'voiceEnabled', val)}
                    />
                    <ToggleField 
                      icon={<Pill className="text-emerald-500" />}
                      title="Medication/Supplement Reminder"
                      desc="Daily notifications for your medication schedule."
                      enabled={formData.reminders.medication}
                      onChange={val => updateNested('reminders', 'medication', val)}
                    />
                    <ToggleField 
                      icon={<Droplets className="text-blue-500" />}
                      title="Hydration Reminder"
                      desc="Periodic notifications to drink water."
                      enabled={formData.reminders.hydration}
                      onChange={val => updateNested('reminders', 'hydration', val)}
                    />
                    <ToggleField 
                      icon={<Target className="text-rose-500" />}
                      title="Daily Target"
                      desc="Notifications for step or calorie achievements."
                      enabled={formData.reminders.dailyTarget}
                      onChange={val => updateNested('reminders', 'dailyTarget', val)}
                    />
                  </div>
                </Section>
              )}

              {activeTab === 'privacy' && (
                <Section key="privacy" title="Privacy & Security">
                   <div className="space-y-6">
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-6 h-6 text-emerald-400" />
                        <h4 className="font-bold">High Data Security</h4>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed mb-4">
                        All your health data is encrypted using AES standards before being saved on this device. We cannot read your biometric data without explicit consent.
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                        <CheckCircle2 className="w-3 h-3" /> User-Owned Encryption Active
                      </div>
                    </div>

                    <div className="space-y-4">
                      <ToggleField 
                         icon={<Stethoscope className="text-slate-400" />}
                         title="Share with Doctor"
                         desc="Allow limited access for healthcare professionals."
                         enabled={formData.privacy.shareWithDoctor}
                         onChange={val => updateNested('privacy', 'shareWithDoctor', val)}
                      />
                      <ToggleField 
                         icon={<UserIcon className="text-slate-400" />}
                         title="Share with Family"
                         desc="Option to share emergency vitals with family members."
                         enabled={formData.privacy.shareWithFamily}
                         onChange={val => updateNested('privacy', 'shareWithFamily', val)}
                      />
                    </div>
                   </div>
                </Section>
              )}

              {activeTab === 'preferences' && (
                <Section key="preferences" title="App Preferences">
                  <div className="space-y-8">
                    <Field label="App Theme">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { id: 'light', label: 'Light Mode', icon: '☀️' },
                          { id: 'dark', label: 'Dark Mode', icon: '🌙' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => updateNested('settings', 'theme', t.id)}
                            className={cn(
                              "p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all",
                              formData.settings.theme === t.id
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-50 dark:shadow-none"
                                : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-slate-200 dark:hover:border-slate-600"
                            )}
                          >
                            <span className="text-3xl">{t.icon}</span>
                            <span className="text-xs font-black uppercase tracking-widest">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Language">
                       <select 
                        value={formData.settings.language || 'en'}
                        onChange={e => updateNested('settings', 'language', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="en">English</option>
                      </select>
                    </Field>
                  </div>
                </Section>
              )}

              {activeTab === 'account' && (
                <Section key="account" title="Account Settings & Security">
                   <div className="space-y-8">
                     <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                            <div>
                               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Username</p>
                               <input 
                                 type="text"
                                 value={accountInputs.username}
                                 onChange={e => setAccountInputs(prev => ({ ...prev, username: e.target.value }))}
                                 className="bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                               />
                            </div>
                          </div>
                          {accountInputs.username !== user.username && (
                            <button 
                              onClick={() => handleRequestVerification('username')}
                              className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1.5 rounded-lg"
                            >
                              Change Username
                            </button>
                          )}
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-slate-400" />
                            <div>
                               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Email Address</p>
                               <input 
                                 type="email"
                                 value={accountInputs.email}
                                 onChange={e => setAccountInputs(prev => ({ ...prev, email: e.target.value }))}
                                 className="bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                               />
                            </div>
                          </div>
                          {accountInputs.email !== user.email && (
                            <button 
                              onClick={() => handleRequestVerification('email')}
                              className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1.5 rounded-lg"
                            >
                              Change Email
                            </button>
                          )}
                        </div>
                     </div>

                     <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                        <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Lock className="w-4 h-4" /> Change Password
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <input 
                             type="password"
                             placeholder="New Password"
                             value={accountInputs.password}
                             onChange={e => setAccountInputs(prev => ({ ...prev, password: e.target.value }))}
                             className="w-full bg-white dark:bg-slate-900 dark:text-white p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                           />
                           <input 
                             type="password"
                             placeholder="Confirm Password"
                             value={accountInputs.confirmPassword}
                             onChange={e => setAccountInputs(prev => ({ ...prev, confirmPassword: e.target.value }))}
                             className="w-full bg-white dark:bg-slate-900 dark:text-white p-4 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                           />
                        </div>
                        <button 
                          disabled={!accountInputs.password || accountInputs.password !== accountInputs.confirmPassword}
                          onClick={() => handleRequestVerification('password')}
                          className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition-all disabled:opacity-30"
                        >
                          Update Password
                        </button>
                     </div>

                     <div className="pt-8 border-t border-slate-100">
                        <button 
                          onClick={logout}
                          className="w-full py-4 border-2 border-rose-100 text-rose-500 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-all"
                        >
                          <LogOut className="w-5 h-5" /> Logout Account
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-3 font-medium">Your session will end immediately after you click logout.</p>
                     </div>
                   </div>
                </Section>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {verification.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerification(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              {verification.isSending ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-100 dark:border-emerald-950 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Sending Verification Code...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verify Changes</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      Enter the 6-digit code we sent to <span className="text-slate-900 dark:text-white font-bold">{user.email}</span>
                    </p>
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black">Email Simulator (Dev Mode)</p>
                      <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-widest">{verification.generatedCode}</p>
                    </div>
                  </div>

                  <input 
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={verification.inputCode}
                    onChange={e => setVerification(prev => ({ ...prev, inputCode: e.target.value, error: null }))}
                    className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl border-none ring-1 ring-slate-100 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />

                  {verification.error && (
                    <p className="text-xs font-bold text-rose-500 bg-rose-50 py-2 rounded-lg">{verification.error}</p>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setVerification(prev => ({ ...prev, isOpen: false }))}
                      className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleVerifyAndSave}
                      className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Success Toast */}
      <AnimatePresence>
        {showSaved && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Profile Updated Successfully
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Section = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-10 relative z-10"
  >
    <div className="space-y-2 mb-8">
      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
      <div className="h-1 w-20 bg-emerald-500 rounded-full" />
    </div>
    {children}
  </motion.div>
);

const Field = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

const ToggleField = ({ icon, title, desc, enabled, onChange }: any) => (
  <motion.div 
    whileHover={{ scale: 1.01 }}
    className="flex items-center justify-between p-6 glass-card dark:glass-dark rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all shadow-sm"
  >
    <div className="flex items-center gap-5">
      <div className="p-4 bg-emerald-50 dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600 dark:text-emerald-400">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight max-w-[240px]">{desc}</p>
      </div>
    </div>
    <button 
      onClick={() => onChange(!enabled)}
      className={cn(
        "w-14 h-7 rounded-full transition-all relative p-1",
        enabled ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <motion.div 
        animate={{ x: enabled ? 28 : 0 }}
        className="w-5 h-5 bg-white rounded-full shadow-md" 
      />
    </button>
  </motion.div>
);
