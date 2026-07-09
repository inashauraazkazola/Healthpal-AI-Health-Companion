import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Removed all Firebase imports

const hashPassword = async (password: string) => {
  if (!password) return '';
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const sanitizeUser = async (userData: any) => {
  const sanitizedUser = { ...userData };
  if (sanitizedUser.password) {
    sanitizedUser.passwordHash = await hashPassword(sanitizedUser.password);
    delete sanitizedUser.password;
  }
  return sanitizedUser;
};

/**
 * usePersistence now keeps local state but syncs to localStorage only.
 */
export function usePersistence<T>(key: string, initialValue: T, userId?: string) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  const persistenceKey = userId ? `${userId}_${key}` : key;

  // Initial load
  useEffect(() => {
    const saved = localStorage.getItem(persistenceKey);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        setData(initialValue);
      }
    }
    setIsLoaded(true);
  }, [persistenceKey]);

  // Sync to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(persistenceKey, JSON.stringify(data));
  }, [persistenceKey, data, isLoaded]);

  return [data, setData] as const;
}

interface AuthContextType {
  user: any | null;
  users: any[];
  signup: (userData: any) => Promise<any>;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: any) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<string>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('local_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);

  // Sync users to localStorage
  useEffect(() => {
    localStorage.setItem('local_users', JSON.stringify(users));
  }, [users]);

  // Load current session
  useEffect(() => {
    const session = localStorage.getItem('current_session_user_id');
    if (session) {
      const currentUser = users.find(u => u.id === session);
      if (currentUser) {
        setUser(currentUser);
      }
    }
    setLoading(false);
  }, [users]);

  const signup = async (userData: any) => {
    const { email, password } = userData;
    const username = (userData.username || '').trim().toLowerCase();
    
    if (!username) throw new Error('Username wajib diisi');
    if (username.length < 3) throw new Error('Username minimal 3 karakter');
    
    // Check if user exists
    if (users.find(u => u.username === username || u.email === email)) {
      throw new Error('Nama pengguna atau email sudah digunakan.');
    }

    const newUser: any = await sanitizeUser({ 
      ...userData, 
      id: crypto.randomUUID(),
      username: username,
      selectedDiseases: [], 
      biometrics: {},
      activityLevel: 'moderate',
      healthGoal: 'general',
      reminders: { medication: false, hydration: false, dailyTarget: false },
      privacy: { shareWithDoctor: false, shareWithFamily: false },
      medicalHistory: { allergies: '', chronicConditions: '' },
      settings: { language: 'en', theme: 'mint' },
      createdAt: new Date().toISOString()
    });

    if (!newUser.passwordHash && password) {
      newUser.passwordHash = await hashPassword(password);
    }

    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const login = async (identifier: string, password: string) => {
    const candidateHash = password ? await hashPassword(password) : '';
    let match: any = null;

    for (const userEntry of users) {
      const identifierMatches = (
        userEntry.username?.toLowerCase() === identifier.toLowerCase() ||
        userEntry.email?.toLowerCase() === identifier.toLowerCase()
      );

      if (!identifierMatches) continue;

      const storedPasswordHash = userEntry.passwordHash;
      const storedPlainPassword = userEntry.password;
      const matches = (!!storedPasswordHash && storedPasswordHash === candidateHash) || (!!storedPlainPassword && storedPlainPassword === password);

      if (matches) {
        match = userEntry;
        break;
      }
    }

    if (match) {
      let nextUser = match;
      if (password && !match.passwordHash && match.password) {
        nextUser = { ...match, passwordHash: candidateHash };
        delete nextUser.password;
        setUsers(prev => prev.map(u => u.id === match.id ? nextUser : u));
      }

      setUser(nextUser);
      localStorage.setItem('current_session_user_id', nextUser.id);
      return true;
    }
    
    throw new Error('Email/Username atau Password salah');
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('current_session_user_id');
  };

  const updateUser = async (updatedUser: any) => {
    const normalizedUser = await sanitizeUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === normalizedUser.id ? normalizedUser : u));
    setUser(normalizedUser);
  };

  const sendVerificationCode = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Verification code for ${email}: ${code}`);
    return code;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users, 
      signup, 
      login, 
      logout, 
      updateUser, 
      sendVerificationCode,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function safeParse(data: string | null) {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

