export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  selectedDiseases: string[];
  screeningResult?: any;
  biometrics: {
    weight?: number;
    height?: number;
    dob?: string;
    gender?: 'male' | 'female' | 'other';
  };
  activityLevel: 'low' | 'moderate' | 'high';
  healthGoal: 'weight-loss' | 'fitness' | 'muscle' | 'general';
  reminders: {
    medication: boolean;
    hydration: boolean;
    dailyTarget: boolean;
  };
  privacy: {
    shareWithDoctor: boolean;
    shareWithFamily: boolean;
  };
  medicalHistory: {
    allergies: string;
    chronicConditions: string;
  };
  settings: {
    language: 'id' | 'en';
    theme: 'mint' | 'light' | 'dark';
    voiceEnabled?: boolean;
  };
}

export interface HealthData {
  userId: string;
  bmiData?: { date: string; value: number; weight: number; height: number; category?: string }[];
  medications?: { id: string; name: string; time: string; taken: boolean; date: string; analysis?: string }[];
  expenses?: { id: string; amount: number; description: string; date: string }[];
  symptoms?: { id: string; text: string; date: string; mood: string; severity: number; aiFeedback?: string }[];
  dailySteps?: { date: string; count: number; analysis?: string }[];
  badges?: { id: string; name: string; icon: string; description: string; date: string }[];
  activities?: { id: string; description: string; date: string }[];
  documents?: { 
    id: string; 
    name: string; 
    type: string; 
    date: string; 
    url?: string; 
    fileData?: string; 
    size?: string;
    isFolder?: boolean;
    parentId?: string | null;
    metadata?: {
      day: string;
      date: string;
      month: string;
      year: string;
    };
  }[];
  streak: number;
  lastUpdate: string;
  aiInsights: string;
  mealLogs?: { date: string; meals: Record<string, { content: string; feedback: string | null; analysis?: string }> }[];
  hydrationLogs?: { date: string; amount: number; analysis?: string }[];
  mentalHealth?: { id: string; date: string; mood: string; stressLevel: number; note: string; analysis?: string }[];
  sleepLogs?: { id: string; date: string; duration: number; quality: 'poor' | 'fair' | 'good' | 'excellent'; analysis?: string }[];
  vitalLogs?: { 
    id: string; 
    date: string; 
    type: 'blood-pressure' | 'glucose' | 'heart-rate' | 'oxygen' | 'temperature'; 
    value: string; 
    unit: string; 
    analysis?: string;
  }[];
}
