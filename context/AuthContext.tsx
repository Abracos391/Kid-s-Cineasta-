import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginAsTeacher: (name: string, code: string) => Promise<void>; 
  registerSchool: (schoolName: string, teacherName: string, code: string, whatsapp: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    initAuth();
  }, []);

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
        const user = await authService.login(email, password);
        setUser(user);
    } finally {
        setLoading(false);
    }
  };
  
  const loginAsTeacher = async (name: string, code: string) => {
    setLoading(true);
    try {
        const user = await authService.loginAsTeacher(name, code);
        setUser(user);
    } finally {
        setLoading(false);
    }
  }

  const registerSchool = async (schoolName: string, teacherName: string, code: string, whatsapp: string) => {
    setLoading(true);
    try {
        const user = await authService.registerSchool(schoolName, teacherName, code, whatsapp);
        setUser(user);
    } finally {
        setLoading(false);
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
        const user = await authService.register(name, email, password);
        setUser(user);
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAsTeacher, registerSchool, register, logout, refreshUser, loading }}>
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