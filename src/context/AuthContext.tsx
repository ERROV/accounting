import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = api.getSavedUser();
    if (saved && saved.username !== 'mothana') {
      api.logout();
      return null;
    }
    return saved;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const savedToken = api.getSavedToken();
        const savedUser = api.getSavedUser();
        if (savedToken && savedUser?.username === 'mothana') {
          const me = await api.getMe();
          if (isMounted) {
            setUser(me);
          }
        } else {
          api.logout();
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error checking auth session:', err);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.user);
  };

  const register = async (username: string, email: string, password: string, fullName: string) => {
    const res = await api.register(username, email, password, fullName);
    setUser(res.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
