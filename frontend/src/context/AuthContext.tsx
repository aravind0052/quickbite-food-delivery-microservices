import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initial state from localStorage to eliminate flicker and false-unauthenticated redirects
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('quickbite_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('quickbite_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate token with backend on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('quickbite_token');
    const savedUser = localStorage.getItem('quickbite_user');

    if (savedToken && savedUser) {
      apiClient
        .get('/api/users/me')
        .then((res) => {
          if (res.data?.success && res.data.data) {
            setUser(res.data.data);
            localStorage.setItem('quickbite_user', JSON.stringify(res.data.data));
          }
        })
        .catch((err) => {
          // If token is invalid or expired, clear credentials
          if (err.response?.status === 401) {
            localStorage.removeItem('quickbite_token');
            localStorage.removeItem('quickbite_user');
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('quickbite_token');
      localStorage.removeItem('quickbite_user');
    };

    window.addEventListener('quickbite_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('quickbite_auth_expired', handleAuthExpired);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiClient.post('/api/auth/login', { email: normalizedEmail, password });
      if (response.data?.success && response.data.token) {
        const receivedToken = response.data.token;
        const receivedUser = response.data.user;

        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('quickbite_token', receivedToken);
        localStorage.setItem('quickbite_user', JSON.stringify(receivedUser));

        return { success: true };
      }
      return { success: false, message: response.data?.message || 'Login failed' };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Unable to connect to QuickBite API Gateway.';
      return { success: false, message };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
  }) => {
    try {
      const payload = {
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
      };
      const response = await apiClient.post('/api/auth/register', payload);
      if (response.data?.success && response.data.token) {
        const receivedToken = response.data.token;
        const receivedUser = response.data.user;

        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('quickbite_token', receivedToken);
        localStorage.setItem('quickbite_user', JSON.stringify(receivedUser));

        return { success: true };
      }
      return { success: false, message: response.data?.message || 'Registration failed' };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Check network or parameters.';
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('quickbite_token');
    localStorage.removeItem('quickbite_user');
    setUser(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get('/api/users/me');
      if (res.data?.success && res.data.data) {
        setUser(res.data.data);
        localStorage.setItem('quickbite_user', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
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

export default AuthContext;
