import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  isLiveFirebaseConfigured, 
  getUserProfile, 
  signInWithGoogle, 
  signInAnonymouslyUser,
  switchDemoUser, 
  logOut as fbLogOut 
} from '../services/firebase';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAnonymously: () => Promise<void>;
  switchPersona: (role: UserRole) => void;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = !isLiveFirebaseConfigured;

  const reloadProfile = async () => {
    if (user?.uid) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    if (isLiveFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        setUser(fbUser);
        if (fbUser) {
          const p = await getUserProfile(fbUser.uid);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Demo authentication mode handler
      const syncDemoAuth = async () => {
        try {
          const rawAuth = localStorage.getItem('kisaansaathi_demo_auth');
          if (rawAuth) {
            const u = JSON.parse(rawAuth);
            setUser(u);
            const p = await getUserProfile(u.uid);
            setProfile(p);
          } else {
            // Default to demo farmer on first arrival for immediate UX
            const defaultProfile = switchDemoUser('farmer');
            setUser({
              uid: defaultProfile.uid,
              displayName: defaultProfile.name,
              email: defaultProfile.email,
            });
            setProfile(defaultProfile);
          }
        } finally {
          setLoading(false);
        }
      };

      syncDemoAuth();
      window.addEventListener('kisaansaathi_auth_change', syncDemoAuth);
      return () => window.removeEventListener('kisaansaathi_auth_change', syncDemoAuth);
    }
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      if (loggedUser?.uid) {
        const p = await getUserProfile(loggedUser.uid);
        setProfile(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymously = async () => {
    setLoading(true);
    try {
      const loggedUser = await signInAnonymouslyUser();
      setUser(loggedUser);
      if (loggedUser?.uid) {
        const p = await getUserProfile(loggedUser.uid);
        setProfile(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchPersona = (role: UserRole) => {
    const p = switchDemoUser(role);
    setUser({
      uid: p.uid,
      displayName: p.name,
      email: p.email,
    });
    setProfile(p);
  };

  const logout = async () => {
    await fbLogOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        loginWithGoogle,
        loginAnonymously,
        switchPersona,
        logout,
        reloadProfile,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
