
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => void;
  loginAsTeacher: (name: string, code: string) => void; // Novo método
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
  refreshUser: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const refreshUser = () => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  };

  const login = (email: string, password: string) => {
    const user = authService.login(email, password);
    setUser(user);
  };
  
  const loginAsTeacher = (name: string, code: string) => {
    const user = authService.loginAsTeacher(name, code);
    setUser(user);
  }

  const register = (name: string, email: string, password: string) => {
    const user = authService.register(name, email, password);
    setUser(user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsTeacher, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
