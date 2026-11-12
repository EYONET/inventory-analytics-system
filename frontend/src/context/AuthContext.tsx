import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Store } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  store: Store | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  registerStore: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data);
      if (data.store) {
        setStore(data.store);
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
      removeAuthToken();
      setUser(null);
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { token, user: userData } = await api.login(credentials);
      setAuthToken(token);
      setUser(userData);
      if (userData.store) {
        setStore(userData.store);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerStore = async (data: any) => {
    setIsLoading(true);
    try {
      const { token, user: userData, store: storeData } = await api.registerStore(data);
      setAuthToken(token);
      setUser(userData);
      setStore(storeData);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setStore(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerStore,
        logout,
        refreshUser,
      }}
    >
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

